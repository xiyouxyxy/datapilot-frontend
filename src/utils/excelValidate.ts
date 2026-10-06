import type { Gender, EmployeeStatus } from '@/types';

// 导入行模型 = Employee 去掉自增 id 后的可导入字段 + 附加行信息（行号用于错误高亮定位）
export interface ImportEmployeeRow {
  name: string;
  gender: Gender;
  dept: string;
  position: string;
  salary: number;
  phone: string;
  email: string;
  entryDate: string;
  status: EmployeeStatus;
  idCard: string;
  __row: number; // 源 Excel 行号（1-based，含表头行）
}

export interface ParseOutcome {
  rows: ImportEmployeeRow[];
  errors: { row: number; field: string; message: string }[];
}

// 本模块为「纯逻辑」，不依赖任何浏览器 API，主线程与 Web Worker 共用。
// 单元格只关心可 String()/Number() 转的类型，故用宽松的 unknown 数组表示一张表。

// 表头中文 → 字段 key（首行为表头）
const HEADER_MAP: Record<string, keyof Omit<ImportEmployeeRow, '__row'>> = {
  姓名: 'name',
  性别: 'gender',
  部门: 'dept',
  岗位: 'position',
  薪资: 'salary',
  电话: 'phone',
  邮箱: 'email',
  入职日期: 'entryDate',
  状态: 'status',
  身份证号: 'idCard',
};

const HEADER_KEY_LABEL: Record<keyof Omit<ImportEmployeeRow, '__row'>, string> = {
  name: '姓名',
  gender: '性别',
  dept: '部门',
  position: '岗位',
  salary: '薪资',
  phone: '电话',
  email: '邮箱',
  entryDate: '入职日期',
  status: '状态',
  idCard: '身份证号',
};

const GENDERS = ['男', '女'];
const STATUSES = ['在职', '试用期', '离职'];

// 兼容 Date / Excel 序列号 / 'YYYY-MM-DD' 字符串
function dayjsParse(v: unknown): Date {
  if (v instanceof Date) return v;
  if (typeof v === 'number') return new Date(Math.round((v - 25569) * 86400 * 1000));
  return new Date(String(v));
}

function formatDate(v: unknown): string {
  const d = dayjsParse(v);
  if (isNaN(d.getTime())) return String(v ?? '');
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/**
 * 对读到的整张表做「表头 → 字段」映射 + 逐行校验。
 * sheetData[0] 视为表头，其后每行按列下标对应列 key。
 * @param onChunk 每处理完 500 行回调一次 (已处理行数, 总数据行数)，供 Worker 回传进度。
 */
export function validateEmployeeSheet(
  sheetData: readonly unknown[][],
  onChunk?: (done: number, total: number) => void,
): ParseOutcome {
  const headerRow = sheetData[0] ?? [];
  const colKeys: (keyof Omit<ImportEmployeeRow, '__row'> | null)[] = headerRow.map((cell) => {
    const key = HEADER_MAP[String(cell ?? '').trim()];
    return key ?? null;
  });

  const rows: ImportEmployeeRow[] = [];
  const errors: ParseOutcome['errors'] = [];
  const total = sheetData.length - 1; // 排除表头

  const CHUNK = 500;
  for (let start = 1; start < sheetData.length; start += CHUNK) {
    const end = Math.min(start + CHUNK, sheetData.length);
    for (let r = start; r < end; r++) {
      const raw = sheetData[r] ?? [];
      const mapped: Record<string, unknown> = {};
      const rowErrors: ParseOutcome['errors'] = [];
      colKeys.forEach((key, c) => {
        if (!key) return; // 未知列跳过
        let v: unknown = raw[c];
        if (typeof v === 'string') v = v.trim();
        mapped[key] = v === '' ? undefined : v;
      });

      // 逐字段校验
      const check = (
        required: boolean,
        key: keyof Omit<ImportEmployeeRow, '__row'>,
        rule?: (val: unknown) => string | null,
      ) => {
        const v = mapped[key];
        if ((v === undefined || v === null) && required) {
          rowErrors.push({ row: r + 1, field: HEADER_KEY_LABEL[key], message: '为必填项' });
          return;
        }
        if (rule && v !== undefined && v !== null) {
          const msg = rule(v);
          if (msg) rowErrors.push({ row: r + 1, field: HEADER_KEY_LABEL[key], message: msg });
        }
      };

      check(true, 'name', (v) => (String(v).trim() ? null : '不能为空'));
      check(true, 'gender', (v) => (GENDERS.includes(String(v)) ? null : '仅支持 男/女'));
      check(true, 'dept');
      check(true, 'position');
      check(true, 'salary', (v) => (Number(v) > 0 ? null : '请输入大于 0 的薪资'));
      check(true, 'phone', (v) => (/^1\d{10}$/.test(String(v)) ? null : '手机号格式不正确'));
      check(true, 'email', (v) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v)) ? null : '邮箱格式不正确',
      );
      check(true, 'entryDate', (v) => (isNaN(dayjsParse(v).getTime()) ? '日期格式不正确' : null));
      check(true, 'status', (v) =>
        STATUSES.includes(String(v)) ? null : '仅支持 在职/试用期/离职',
      );
      check(true, 'idCard', (v) =>
        /^\d{17}[\dXx]$/.test(String(v)) ? null : '身份证号格式不正确',
      );

      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
        continue; // 该行有误，不进入 rows
      }

      rows.push({
        name: String(mapped.name ?? ''),
        gender: String(mapped.gender) as Gender,
        dept: String(mapped.dept ?? ''),
        position: String(mapped.position ?? ''),
        salary: Number(mapped.salary),
        phone: String(mapped.phone ?? ''),
        email: String(mapped.email ?? ''),
        entryDate: formatDate(mapped.entryDate),
        status: String(mapped.status) as EmployeeStatus,
        idCard: String(mapped.idCard ?? ''),
        __row: r + 1,
      });
    }
    onChunk?.(Math.min(end, sheetData.length) - 1, total);
  }

  return { rows, errors };
}
