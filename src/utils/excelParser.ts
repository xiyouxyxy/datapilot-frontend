import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { type ImportEmployeeRow, type ParseOutcome } from './excelValidate';

// 导出共用类型，保持对既有调用方（导入页）的导入路径稳定
export type { ImportEmployeeRow, ParseOutcome } from './excelValidate';
export { validateEmployeeSheet } from './excelValidate';

export interface WorkerProgress {
  percent: number;
}

interface WorkerDone {
  type: 'done';
  rows: ImportEmployeeRow[];
  errors: ParseOutcome['errors'];
}
interface WorkerProgressMsg {
  type: 'progress';
  percent: number;
}
interface WorkerErrorMsg {
  type: 'error';
  message: string;
}
interface WorkerRequest {
  type: 'parse';
  format: 'xlsx' | 'csv';
  sheet: ArrayBuffer;
}

/**
 * Worker 版导入解析：主线程只负责把 File 转成 ArrayBuffer 转移给 Worker，
 * 骨架读取（xlsx：read-excel-file/web-worker；csv：TextDecoder+单元格切分）与逐行校验
 * 都在 Worker 里跑，UI 不卡顿。
 * @param format 文件格式（.xlsx → 'xlsx'，.csv → 'csv'）
 * @param onProgress 解析进度回调（0-100，供页面渲染进度条）
 */
function runWorkerParse(
  file: File | Blob,
  format: 'xlsx' | 'csv',
  onProgress?: (percent: number) => void,
): Promise<ParseOutcome> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./excel.worker.ts', import.meta.url), { type: 'module' });
    const done = () => worker.terminate();

    worker.onmessage = (ev: MessageEvent<WorkerProgressMsg | WorkerDone | WorkerErrorMsg>) => {
      const d = ev.data;
      if (!d) return;
      if (d.type === 'progress') {
        onProgress?.(d.percent);
      } else if (d.type === 'done') {
        done();
        resolve({ rows: d.rows, errors: d.errors });
      } else if (d.type === 'error') {
        done();
        reject(new Error(d.message));
      }
    };
    worker.onerror = (err) => {
      done();
      reject(new Error(err.message || 'Worker 解析异常'));
    };

    file
      .arrayBuffer()
      .then((b) => {
        const msg: WorkerRequest = { type: 'parse', format, sheet: b };
        worker.postMessage(msg, [b]);
      })
      .catch((err) => {
        done();
        reject(err);
      });
  });
}

/** 解析 .xlsx / .xls 文件（Web Worker 内完成，不阻塞主线程） */
export function parseEmployeeExcel(
  file: File | Blob,
  onProgress?: (percent: number) => void,
): Promise<ParseOutcome> {
  return runWorkerParse(file, 'xlsx', onProgress);
}

/** 解析 .csv 文件（UTF-8 逗号分隔；Web Worker 内完成） */
export function parseEmployeeCsv(
  file: File | Blob,
  onProgress?: (percent: number) => void,
): Promise<ParseOutcome> {
  return runWorkerParse(file, 'csv', onProgress);
}

/** 生成 .xlsx 导入模板（xlsx.write 仅导出侧：写模板是安全的，解析漏洞只发生在读外部文件） */
export function downloadImportTemplate() {
  const headers = [
    '姓名',
    '性别',
    '部门',
    '岗位',
    '薪资',
    '电话',
    '邮箱',
    '入职日期',
    '状态',
    '身份证号',
  ];
  const example = [
    '张三',
    '男',
    '研发',
    '中级',
    12000,
    '13800138000',
    'zhang@example.com',
    '2026-09-01',
    '在职',
    '330102198001011234',
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, example]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '员工导入模板');
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(new Blob([out], { type: 'application/octet-stream' }), '员工导入模板.xlsx');
}

/** 生成 .csv 导入模板；UTF-8 BOM + 逗号分隔，双表头说明行仅供展示，导入时会作为首行按头映射跳过 */
function buildImportCsv(): string {
  const headers = [
    '姓名',
    '性别',
    '部门',
    '岗位',
    '薪资',
    '电话',
    '邮箱',
    '入职日期',
    '状态',
    '身份证号',
  ];
  return [
    headers.join(','),
    [
      '张三',
      '男',
      '研发',
      '中级',
      12000,
      '13800138000',
      'zhang@example.com',
      '2026-09-01',
      '在职',
      '330102198001011234',
    ].join(','),
  ].join('\n');
}

/** 生成 .csv 导入模板（Excel 打开中文靠 BOM 兜底；写文件仍是安全的，无解析行为） */
export function downloadImportCsvTemplate() {
  const content = buildImportCsv();
  const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8' });
  saveAs(blob, '员工导入模板.csv');
}
