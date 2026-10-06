// 全局常量：角色、快速登录账号、权限码、存储键。

export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  FINANCE: 'finance',
  USER: 'user',
} as const;

export type RoleKey = (typeof ROLES)[keyof typeof ROLES];

// 登录页「快速登录」四套角色账号（演示权限差异用）
export const QUICK_ACCOUNTS = [
  { label: '系统管理员', username: 'admin', password: '123456', desc: '菜单/按钮/字段全开' },
  {
    label: '研发主管',
    username: 'manager',
    password: '123456',
    desc: '部门管理 + 审批 + 工资字段',
  },
  { label: '财务', username: 'finance', password: '123456', desc: '金额/身份证字段可见 + 审批' },
  { label: '普通员工', username: 'employee', password: '123456', desc: '仅看板/流程，无金额字段' },
];

// 权限码（按钮级）
export const PERM = {
  EMP_EXPORT: 'employee.export',
  EMP_IMPORT: 'employee.import',
  EMP_ADD: 'employee.add',
  EMP_EDIT: 'employee.edit',
  EMP_DELETE: 'employee.delete',
  WF_APPROVE: 'workflow.approve',
  WF_REJECT: 'workflow.reject',
  WF_SUBMIT: 'workflow.submit',
} as const;

// 权限码（字段级）
export const FIELD = {
  SALARY: 'salary',
  IDCARD: 'idCard',
} as const;

// localStorage 存储键
export const STORAGE_KEYS = {
  USER: 'bi-user',
  APP: 'bi-app',
  DRAFT: 'bi-employee-draft',
  TABLE_SETTINGS: 'bi-table-settings',
  DASHBOARD: 'bi-dashboard-layout',
} as const;

export const TOKEN_KEY = 'bi-user-token';
export const LANG_KEY = 'bi-lang'; // P1-1 i18n：语言偏好持久化键

// P2-1 SSO：演示用的第三方 OAuth 客户端标识（真实 OAuth 由后端保管 secret，前端只暴露 client_id）
export const SSO_CLIENT_ID = 'data-pilot-web';
export const SSO_PROVIDER = '统一身份认证中心';
export const SSO_ROUTE = '/sso';
