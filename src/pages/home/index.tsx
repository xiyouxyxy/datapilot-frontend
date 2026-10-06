import { RequireAuth } from '@/router/guards';
import { BasicLayout } from '@/layouts/BasicLayout';

// 受保护的后台主页面：未登录被 RequireAuth 拦到 /login；已登录渲染后台布局（含动态菜单与 Outlet）
export default function Home() {
  return (
    <RequireAuth>
      <BasicLayout />
    </RequireAuth>
  );
}
