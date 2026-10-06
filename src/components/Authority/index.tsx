import type { ReactNode } from 'react';
import { useUserStore } from '@/store/user';
import { hasButton } from '@/utils/permission';

interface AuthorityProps {
  /** 按钮级权限码，如 PERM.EMP_EXPORT */
  code: string;
  /** 无权限时替换显示的内容（默认不渲染） */
  fallback?: ReactNode;
  children?: ReactNode;
}

// 按钮级权限：无权限则不渲染 children
export default function Authority({ code, fallback = null, children }: AuthorityProps) {
  const buttons = useUserStore((s) => s.permissions.buttons); // ① 订阅当前权限的 buttons
  const can = hasButton(buttons, code); // ② 判断有无该按钮权限（纯函数）
  if (!can) return <>{fallback}</>; // ③ 无权限→显示 fallback（默认无）
  return <>{children}</>; // ④ 有权限→显示 children
}
