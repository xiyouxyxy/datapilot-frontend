import type MockAdapter from 'axios-mock-adapter';
import type { PermissionData, UserInfo } from '@/types';

interface Account {
  username: string;
  password: string;
  role: string;
  name: string;
  id: string;
}

export const accounts: Account[] = [
  { username: 'admin', password: '123456', role: 'admin', name: '系统管理员', id: 'u1' },
  { username: 'manager', password: '123456', role: 'manager', name: '研发主管', id: 'u2' },
  { username: 'finance', password: '123456', role: 'finance', name: '财务李姐', id: 'u3' },
  { username: 'employee', password: '123456', role: 'user', name: '普通员工', id: 'u4' },
];

// 角色 → 菜单/按钮/字段 三级权限（* 表示全部）
const rolePermissions: Record<string, PermissionData> = {
  admin: { menus: ['*'], buttons: ['*'], fields: ['*'] },
  manager: {
    menus: ['dashboard', 'employee', 'import', 'workflow', 'form'],
    buttons: [
      'employee.export',
      'employee.import',
      'employee.add',
      'employee.edit',
      'employee.delete',
      'workflow.approve',
      'workflow.reject',
    ],
    fields: ['salary'],
  },
  finance: {
    menus: ['dashboard', 'employee', 'import', 'workflow'],
    buttons: ['employee.export', 'employee.import', 'workflow.approve'],
    fields: ['salary', 'idCard'],
  },
  user: {
    menus: ['dashboard', 'workflow', 'form'],
    buttons: ['workflow.submit'],
    fields: [],
  },
};

const tokens: Record<string, Account> = {};

function buildUserInfo(acc: Account): UserInfo {
  const perms = rolePermissions[acc.role];
  return {
    id: acc.id,
    name: acc.name,
    username: acc.username,
    roles: [acc.role],
    permissions: [...perms.buttons, ...perms.fields.map((f) => `field:${f}`)],
  };
}

// 供 SSO mock 复用：签发生效 token 并注册进 /user/info、/user/permissions 可识别的令牌表
export function createToken(acc: Account): string {
  const token = `tok_${acc.id}_${Date.now()}`;
  tokens[token] = acc;
  return token;
}

export function buildSsoUserInfo(acc: Account): UserInfo {
  return buildUserInfo(acc);
}

export function userMock(mock: MockAdapter) {
  mock.onPost('/user/login').reply((config) => {
    const { username, password } = config.data ? JSON.parse(config.data) : {};
    const acc = accounts.find((a) => a.username === username && a.password === password);
    if (!acc) return [200, { code: 401, data: null, message: '账号或密码错误' }];
    const token = createToken(acc);
    return [200, { code: 0, data: { token, userInfo: buildUserInfo(acc) }, message: 'ok' }];
  });

  mock.onGet('/user/info').reply((config) => {
    const auth = (config.headers?.Authorization as string) || '';
    const token = auth.replace('Bearer ', '');
    const acc = tokens[token];
    if (!acc) return [200, { code: 40100, data: null, message: '未登录' }];
    return [200, { code: 0, data: buildUserInfo(acc), message: 'ok' }];
  });

  mock.onGet('/user/permissions').reply((config) => {
    const auth = (config.headers?.Authorization as string) || '';
    const token = auth.replace('Bearer ', '');
    const acc = tokens[token];
    if (!acc) return [200, { code: 40100, data: null, message: '未登录' }];
    return [200, { code: 0, data: rolePermissions[acc.role], message: 'ok' }];
  });

  mock.onPost('/user/logout').reply(200, { code: 0, data: true, message: 'ok' });
}
