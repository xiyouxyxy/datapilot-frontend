// 通用格式化工具。

export function formatNumber(n: number): string {
  return n.toLocaleString('zh-CN');
}

export function formatMoney(n: number): string {
  return '¥' + n.toLocaleString('zh-CN');
}

export function formatDate(input?: Date | string): string {
  if (!input) return '-';
  const date = typeof input === 'string' ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return '-';
  const p = (x: number) => String(x).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

export function formatDateTime(input?: Date | string): string {
  if (!input) return '-';
  const date = typeof input === 'string' ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return '-';
  const p = (x: number) => String(x).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())} ${p(date.getHours())}:${p(date.getMinutes())}`;
}

export function trendText(trend: number): string {
  const v = Math.abs(trend).toFixed(1);
  return trend >= 0 ? `↑ ${v}%` : `↓ ${v}%`;
}
