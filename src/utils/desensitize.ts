import { FIELD } from '@/constants';
import { hasField } from './permission';

// 敏感字段 → 字段权限码 的单一映射。表格渲染（Field 组件）与 CSV 导出共用这一份事实来源，
// 避免"哪些字段需要脱敏"的知识散落在多处导致漂移。
export const SENSITIVE_FIELDS = {
  salary: FIELD.SALARY,
  idCard: FIELD.IDCARD,
} as const;

// 根据字段权限决定是否脱敏：有权限返回原值，否则返回 fallback（默认 ***）
export function resolveSensitiveValue(
  value: unknown,
  code: string,
  fields: readonly string[],
  fallback: unknown = '***',
): unknown {
  return hasField(fields, code) ? value : fallback;
}
