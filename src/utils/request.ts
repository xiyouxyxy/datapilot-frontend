// 请求层：axios 实例 + 拦截器 + 统一解包 + Mock 开关。
// 业务代码只依赖本文件导出的 `http`，不直接耦合 mock。

import type { ReactNode } from 'react';
import axios from 'axios';
import type { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { storage } from './storage';
import { TOKEN_KEY } from '@/constants';
import { setupMock } from '@/mock';

// antd 6.6 起静态 message 弃用（触达不了主题上下文），请求层为非组件模块没法用 App.useApp()，
// 故暴露一个可绑定的错误提示函数：由 <AntApp> 内的 MessageBridge 注入 App.useApp().message。
// 未注入前的兜底为空实现，避免误报 console 告警 / 空指针。
let showError: (content: ReactNode) => void = () => undefined;
export function bindMessageError(fn: (content: ReactNode) => void): void {
  showError = fn;
}

// 登录态失效事件名：请求层在 401 时派发，App 层监听后做 SPA 内跳转（见 App.tsx）。
export const AUTH_EXPIRED_EVENT = 'auth:expired';

const request: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
});

request.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = storage.get<string>(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

request.interceptors.response.use(
  (res: AxiosResponse) => {
    const body = res.data;
    // 统一响应结构 { code, data, message }
    if (body && typeof body.code === 'number') {
      if (body.code === 0) return body.data;
      if (body.code === 401 || body.code === 40100) {
        showError(body.message || '登录已失效，请重新登录');
        storage.remove(TOKEN_KEY);
        // 通过自定义事件通知路由层跳转，避免在请求层用 location.href 整页刷新：
        // 1) 整页刷新会丢 SPA 内存态；2) 部署在子路径（如 /datapilot/）时 location.href='/login' 会跳错。
        // 由 App 层监听 AUTH_EXPIRED 事件、用 router.navigate 做 SPA 内跳转。
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
        }
        return Promise.reject(new Error(body.message || '未登录'));
      }
      showError(body.message || '请求失败');
      return Promise.reject(new Error(body.message || 'business error'));
    }
    return body;
  },
  (err) => {
    showError(err?.message || '网络异常，请稍后重试');
    return Promise.reject(err);
  },
);

// 仅在 Mock 开关打开时注入本地 mock，业务代码零侵入
if (import.meta.env.VITE_USE_MOCK === 'true') {
  setupMock(request);
}

// 类型安全的请求封装：拦截器已解包为 data，故返回 Promise<T>
function http() {
  const get = <T>(url: string, cfg?: Record<string, unknown>) =>
    request.get(url, cfg) as unknown as Promise<T>;
  const post = <T>(url: string, data?: unknown, cfg?: Record<string, unknown>) =>
    request.post(url, data, cfg) as unknown as Promise<T>;
  const put = <T>(url: string, data?: unknown, cfg?: Record<string, unknown>) =>
    request.put(url, data, cfg) as unknown as Promise<T>;
  const del = <T>(url: string, cfg?: Record<string, unknown>) =>
    request.delete(url, cfg) as unknown as Promise<T>;
  return { get, post, put, del };
}

export const api = http();
export default request;
