import { readSheet } from 'read-excel-file/web-worker';
import { validateEmployeeSheet } from './excelValidate';

// 专用 module Worker：在主线程 offload 骨架读取与字段校验，
// 逐块（500 行）回传进度，避免大文件（数万行）阻塞 UI。
//
// 支持两种格式：
//  - xlsx/xls：read-excel-file/web-worker 读骨架
//  - csv：TextDecoder 解出 UTF-8 文本 → 正则单元格切分（含引号包裹、转义双引号、行内逗号）
// 两者最终都归一成 unknown[][] 塞给同一份 validateEmployeeSheet 校验逻辑。
//
// 因项目 tsconfig 只有 DOM lib（无 webworker），这里不借用 DedicatedWorkerGlobalScope 类型，
// 直接对运行时 self 断言最小 Worker 接口，规避 lib 冲突。

interface ParseRequest {
  type: 'parse';
  format: 'xlsx' | 'csv';
  sheet: ArrayBuffer;
}

type WorkerScope = {
  postMessage: (message: unknown) => void;
  onmessage: ((ev: MessageEvent) => void) | null;
};
const ctx = self as unknown as WorkerScope;

/**
 * 把一段 UTF-8 CSV 文本解析成单元格矩阵（unknown[][]）。
 * 覆盖：引号包裹含逗号/换行的字段、转义双引号（""），并识别 \r\n 换行。
 * 极少数「字段内含换行」会使该行逻辑行拼接后的行数出现偏移——企业模板场景几可忽略。
 */
function parseCsvText(text: string): unknown[][] {
  // UTF-8 BOM
  const body = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  const chars = Array.from(body);
  const escaped: string[] = [];
  const inQuotes: boolean[] = [];
  let quote = false;
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (quote && ch === '"' && chars[i + 1] === '"') {
      escaped.push('"');
      inQuotes.push(true);
      i++; // 跳过配对双引号
      continue;
    }
    if (ch === '"') quote = !quote;
    escaped.push(ch);
    inQuotes.push(quote);
  }

  const rows: string[][] = [];
  let cur: string[] = [];
  let cell = '';
  let prevQuoted = false;
  for (let i = 0; i < escaped.length; i++) {
    const ch = escaped[i];
    const q = inQuotes[i];
    if (ch === ',' && !q) {
      cur.push(cell);
      cell = '';
      prevQuoted = false;
    } else if ((ch === '\n' || ch === '\r') && !q) {
      if (ch === '\r' && escaped[i + 1] === '\n') i++;
      cur.push(cell);
      rows.push(cur);
      cur = [];
      cell = '';
      prevQuoted = false;
    } else {
      cell += ch;
      prevQuoted = q;
    }
  }
  if (cell !== '' || cur.length > 0 || prevQuoted) {
    cur.push(cell);
    rows.push(cur);
  }

  // 去掉末尾可能残留的空行（文件以换行结尾）
  return rows.map((r) => (r.length === 1 && r[0] === '' ? [] : r));
}

function parseCsv(sheet: ArrayBuffer, onChunk: (done: number, total: number) => void): unknown[][] {
  const text = new TextDecoder('utf-8').decode(sheet);
  const rows = parseCsvText(text);
  if (rows.length === 0 || rows.every((r) => r.length === 0)) return [];

  // 表头 trim 空白，避免列名带空格对不上
  const header = rows[0].map((c) => String(c).trim());
  const data: unknown[][] = [header];

  const total = rows.length - 1;
  const CHUNK = 500;
  for (let start = 1; start < rows.length; start += CHUNK) {
    const end = Math.min(start + CHUNK, rows.length);
    for (let r = start; r < end; r++) data.push(rows[r]);
    onChunk?.(Math.min(end, rows.length) - 1, total);
  }
  return data;
}

ctx.onmessage = async (ev: MessageEvent) => {
  const req: ParseRequest = ev.data;
  if (req?.type !== 'parse') return;

  try {
    ctx.postMessage({ type: 'progress', percent: 5 }); // 开始读骨架/解析文本

    let sheetData: unknown[][];
    if (req.format === 'csv') {
      sheetData = parseCsv(req.sheet, () => {}); // CSV 文本解码 + 分块基本是线性的，统一交给下方校验回调
    } else {
      sheetData = (await readSheet(req.sheet, 1)) as unknown[][];
    }
    ctx.postMessage({ type: 'progress', percent: 15 });

    const outcome = validateEmployeeSheet(sheetData, (done, total) => {
      // 校验阶段 15% → 95%
      const ratio = total <= 0 ? 1 : Math.min(1, done / total);
      ctx.postMessage({ type: 'progress', percent: Math.round(15 + ratio * 80) });
    });

    ctx.postMessage({ type: 'progress', percent: 100 });
    ctx.postMessage({ type: 'done', rows: outcome.rows, errors: outcome.errors });
  } catch (err) {
    ctx.postMessage({ type: 'error', message: err instanceof Error ? err.message : '解析失败' });
  }
};
