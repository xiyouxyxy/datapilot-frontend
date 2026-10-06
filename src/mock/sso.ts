import type MockAdapter from 'axios-mock-adapter';
import { accounts, createToken, buildSsoUserInfo } from './users';
import { SSO_CLIENT_ID } from '@/constants';

// P2-1 SSO 模拟：完整复刻 OAuth2 授权码模式（Authorization Code Flow）里
// 「SSO 认证服务器」+「本应用后端换 token」两步，但全部落在本地 mock。

// 一次性授权码池：签发后仅允许使用一次（模拟真实 OAuth 的 one-time code 语义）
const codes = new Map<string, { username: string }>();

export function ssoMock(mock: MockAdapter) {
  // ① SSO 服务器签发授权码：模拟「用户在 SSO 页已认证」，签发一次性 authorization code
  mock.onPost('/sso/login').reply((config) => {
    const { username } = config.data ? JSON.parse(config.data) : {};
    const acc = accounts.find((a) => a.username === username);
    if (!acc) return [200, { code: 400, data: null, message: 'SSO 未识别该账号' }];
    const code = `sso_code_${acc.id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    codes.set(code, { username: acc.username });
    // 真实 OAuth 会 302 回跳到客户端回调；这里把 code 交给前端拼回跳 URL
    return [200, { code: 0, data: { code }, message: 'ok' }];
  });

  // ② 本应用「后端」用 code + client_id 换业务 token（code 一次性，必须验证 client 身份）
  mock.onPost('/sso/token').reply((config) => {
    const { code, client_id } = config.data ? JSON.parse(config.data) : {};
    if (client_id !== SSO_CLIENT_ID) {
      return [200, { code: 400, data: null, message: 'client_id 非法' }];
    }
    const item = codes.get(code);
    if (!item)
      return [200, { code: 40100, data: null, message: 'authorization code 无效或已过期' }];
    codes.delete(code); // one-time code：用完即销毁
    const acc = accounts.find((a) => a.username === item.username);
    if (!acc) return [200, { code: 40100, data: null, message: 'SSO 账号不存在' }];
    // 复用同一 token 表，使 /user/info、/user/permissions 也能识别 SSO 签发的 token
    const token = createToken(acc);
    return [200, { code: 0, data: { token, userInfo: buildSsoUserInfo(acc) }, message: 'ok' }];
  });
}
