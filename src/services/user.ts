import { api } from '@/utils/request';
import type { LoginReq, LoginRes, UserInfo, PermissionData } from '@/types';
import { SSO_CLIENT_ID } from '@/constants';

export const login = (data: LoginReq) => api.post<LoginRes>('/user/login', data);
export const getInfo = () => api.get<UserInfo>('/user/info');
export const getPermissions = () => api.get<PermissionData>('/user/permissions');
export const logout = () => api.post('/user/logout');

// P2-1 SSO：① SSO 服务器签发授权码；② 本应用后端用 code + client_id 换业务 token
export const ssoLogin = (username: string) =>
  api.post<{ code: string }>('/sso/login', { username });
export const ssoToken = (code: string) =>
  api.post<LoginRes>('/sso/token', { code, client_id: SSO_CLIENT_ID });
