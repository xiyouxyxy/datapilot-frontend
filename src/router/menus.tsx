import {
  DashboardOutlined,
  TeamOutlined,
  AuditOutlined,
  FormOutlined,
  ImportOutlined,
} from '@ant-design/icons';
import type { ReactNode } from 'react';

// 菜单 key 字面量类型：渲染处用 `t(\`menu.${m.label}\`)` 取当前语言文案
export type MenuLabelKey = 'dashboard' | 'employee' | 'import' | 'workflow' | 'form';

export interface MenuItem {
  key: string;
  label: MenuLabelKey;
  icon: ReactNode;
  path: string;
}

// 后台菜单配置：key 对应 mock 里 permissions.menus 的权限码；label 为 i18n key（P1-1）
export const MENU_CONFIG: MenuItem[] = [
  { key: 'dashboard', label: 'dashboard', icon: <DashboardOutlined />, path: '/dashboard' },
  { key: 'employee', label: 'employee', icon: <TeamOutlined />, path: '/employee' },
  { key: 'import', label: 'import', icon: <ImportOutlined />, path: '/import' },
  { key: 'workflow', label: 'workflow', icon: <AuditOutlined />, path: '/workflow' },
  { key: 'form', label: 'form', icon: <FormOutlined />, path: '/form' },
];

export function pathToMenuKey(path: string): string | undefined {
  return MENU_CONFIG.find((m) => m.path === path)?.key;
}

// 菜单过滤纯函数：permissionKeys 含 '*'（admin 全开）时返回全部；否则按 key 过滤。
export function filterMenusByPermission(
  menus: MenuItem[],
  permissionKeys: readonly string[],
): MenuItem[] {
  if (permissionKeys.includes('*')) return menus;
  return menus.filter((m) => permissionKeys.includes(m.key));
}
