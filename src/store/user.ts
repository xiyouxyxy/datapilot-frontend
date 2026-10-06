import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserInfo, PermissionData } from '@/types';
import * as userService from '@/services/user';
import { storage } from '@/utils/storage';
import { hasButton as checkButton, hasField as checkField } from '@/utils/permission';
import { STORAGE_KEYS, TOKEN_KEY } from '@/constants';

interface UserState {
  token: string;
  userInfo: UserInfo | null;
  permissions: PermissionData;
  isLogin: boolean;
  setToken: (t: string) => void;
  setUserInfo: (u: UserInfo) => void;
  setPermissions: (p: PermissionData) => void;
  login: (username: string, password: string) => Promise<void>;
  fetchProfile: () => Promise<void>;
  ssoExchange: (code: string) => Promise<void>;
  hasButton: (code: string) => boolean;
  hasField: (code: string) => boolean;
  logout: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      token: '',
      userInfo: null,
      permissions: { menus: [], buttons: [], fields: [] },
      isLogin: false,
      setToken: (t) => {
        storage.set(TOKEN_KEY, t);
        set({ token: t, isLogin: !!t });
      },
      setUserInfo: (u) => set({ userInfo: u }),
      setPermissions: (p) => set({ permissions: p }),
      login: async (username, password) => {
        const res = await userService.login({ username, password });
        storage.set(TOKEN_KEY, res.token);
        set({ token: res.token, userInfo: res.userInfo, isLogin: true });
        const perms = await userService.getPermissions();
        // 存入权限
        set({ permissions: perms });
      },
      fetchProfile: async () => {
        const info = await userService.getInfo();
        set({ userInfo: info, isLogin: true });
        const perms = await userService.getPermissions();
        set({ permissions: perms });
      },
      // P2-1 SSO：用一次性 authorization code 换业务 token（code→token 由后端完成），
      // 复用同一套「存 token → 重拉权限」逻辑，与表单登录完全一致
      ssoExchange: async (code) => {
        const res = await userService.ssoToken(code);
        storage.set(TOKEN_KEY, res.token);
        set({ token: res.token, userInfo: res.userInfo, isLogin: true });
        const perms = await userService.getPermissions();
        set({ permissions: perms });
      },
      hasButton: (code) => {
        // 权限判断委托纯函数（见 src/utils/permission.ts，便于单测）
        return checkButton(get().permissions.buttons, code);
      },
      hasField: (code) => {
        return checkField(get().permissions.fields, code);
      },
      logout: () => {
        userService.logout().catch(() => undefined);
        storage.remove(TOKEN_KEY);
        set({
          token: '',
          userInfo: null,
          permissions: { menus: [], buttons: [], fields: [] },
          isLogin: false,
        });
      },
    }),
    {
      name: STORAGE_KEYS.USER,
      // 只持久化 token，userInfo/permissions 在刷新时由 fetchProfile 从服务器重拉
      partialize: (s) => ({ token: s.token }),
      version: 1,
      // 保证下次刷新一定走 fetchProfile 从服务器重拉，避免陈旧权限被恢复
      migrate: (persistedState, version) => {
        if (version < 1) {
          const t = (persistedState as { token?: string } | undefined)?.token ?? '';
          return { token: t };
        }
        return persistedState as { token: string };
      },
    },
  ),
);
