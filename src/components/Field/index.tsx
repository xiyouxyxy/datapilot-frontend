import type { ReactNode } from 'react';
import { useUserStore } from '@/store/user';
import { hasField } from '@/utils/permission';

interface FieldProps {
  /** 字段级权限码，如 FIELD.SALARY */
  code: string;
  /** 无权限时替换显示的内容（默认脱敏为 ***） */
  fallback?: ReactNode;
  children?: ReactNode;
}

// 字段级权限：无权限则以 fallback（默认 ***）隐藏真实值
export default function Field({ code, fallback = '***', children }: FieldProps) {
  const fields = useUserStore((s) => s.permissions.fields);
  const can = hasField(fields, code);
  if (!can) return <>{fallback}</>;
  return <>{children}</>;
}
