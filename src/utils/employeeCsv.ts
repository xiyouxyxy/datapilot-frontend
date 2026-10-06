import { saveAs } from 'file-saver';
import type { Employee } from '@/types';
import { SENSITIVE_FIELDS, resolveSensitiveValue } from './desensitize';

const HEADERS = [
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

// 纯函数：组装员工 CSV 文本（不含 BOM）。字段级脱敏统一走 resolveSensitiveValue，与表格渲染共用同一套权限判定。
export function buildEmployeeCsv(rows: Employee[], fields: readonly string[]): string {
  const table = rows.map((e) => [
    e.name,
    e.gender,
    e.dept,
    e.position,
    resolveSensitiveValue(e.salary, SENSITIVE_FIELDS.salary, fields),
    e.phone,
    e.email,
    e.entryDate,
    e.status,
    resolveSensitiveValue(e.idCard, SENSITIVE_FIELDS.idCard, fields),
  ]);
  return [HEADERS, ...table].map((r) => r.map(escapeCsv).join(',')).join('\n');
}

// CSV 字段转义：含 逗号/引号/换行 时用双引号包裹，内部引号以 "" 转义（避免注入/错列）
export function escapeCsv(v: unknown): string {
  const s = String(v ?? '');
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function dateStamp(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// 触发浏览器下载（加 UTF-8 BOM 让 Excel 正确识别中文）
export function downloadEmployeeCsv(rows: Employee[], fields: readonly string[]): void {
  const csv = '\ufeff' + buildEmployeeCsv(rows, fields);
  saveAs(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `员工导出_${dateStamp()}.csv`);
}
