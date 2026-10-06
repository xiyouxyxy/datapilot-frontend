import { Suspense, lazy } from 'react';
import type { ReactNode } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import { Authorized } from './guards';
import Home from '@/pages/home';
import RouteErrorFallback from '@/components/RouteErrorFallback';

// P2-3 打包优化：页面路由全部懒加载，让 webpack/rolldown 按页分包，
// 首屏只加载进入页所需代码；仪表盘里的 echarts、导入页的 excel 解析等重依赖
// 随之落入各自 page chunk，仅访问对应页面时才下载。
const LoginPage = lazy(() => import('@/pages/login'));
const DashboardPage = lazy(() => import('@/pages/dashboard'));
const EmployeePage = lazy(() => import('@/pages/employee'));
const WorkflowPage = lazy(() => import('@/pages/workflow'));
const FormPage = lazy(() => import('@/pages/form'));
const ImportPage = lazy(() => import('@/pages/import'));
const Forbidden = lazy(() => import('@/pages/403'));
const NotFound = lazy(() => import('@/pages/404'));
const SsoPage = lazy(() => import('@/pages/sso')); // P2-1 SSO「认证中心」模拟页
const LoginCallbackPage = lazy(() => import('@/pages/loginCallback')); // P2-1 SSO 回调换 token

/** 懒加载页面的统一 Suspense 兜底 */
function Page({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<Spin style={{ display: 'block', margin: '48px auto' }} />}>
      {children}
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <Page>
        <LoginPage />
      </Page>
    ),
  },
  {
    path: '/sso',
    element: (
      <Page>
        <SsoPage />
      </Page>
    ),
  }, // SSO 认证中心（模拟第三方登录域）
  {
    path: '/login/callback',
    element: (
      <Page>
        <LoginCallbackPage />
      </Page>
    ),
  },
  {
    path: '/',
    element: <Home />,
    // 路由元素渲染异常走 errorElement 兜底，避免被 React Router 默认页取代或白屏
    errorElement: <RouteErrorFallback />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      {
        path: 'dashboard',
        element: (
          <Page>
            <Authorized menuKey="dashboard">
              <DashboardPage />
            </Authorized>
          </Page>
        ),
      },
      {
        path: 'employee',
        element: (
          <Page>
            <Authorized menuKey="employee">
              <EmployeePage />
            </Authorized>
          </Page>
        ),
      },
      {
        path: 'import',
        element: (
          <Page>
            <Authorized menuKey="import">
              <ImportPage />
            </Authorized>
          </Page>
        ),
      },
      {
        path: 'workflow',
        element: (
          <Page>
            <Authorized menuKey="workflow">
              <WorkflowPage />
            </Authorized>
          </Page>
        ),
      },
      {
        path: 'form',
        element: (
          <Page>
            <Authorized menuKey="form">
              <FormPage />
            </Authorized>
          </Page>
        ),
      },
      {
        path: '403',
        element: (
          <Page>
            <Forbidden />
          </Page>
        ),
      },
    ],
  },
  {
    path: '*',
    element: (
      <Page>
        <NotFound />
      </Page>
    ),
  },
]);
