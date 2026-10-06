import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Spin } from 'antd';
import { useUserStore } from '@/store/user';
import { hasMenu } from '@/utils/permission';

// 登录态守卫：
// 未登录跳 /login；
// 已登录但 token-only 持久化导致内存无 profile 时，先 fetchProfile 重拉
export function RequireAuth({ children }: { children: ReactNode }) {
  const token = useUserStore((s) => s.token);
  const isLogin = useUserStore((s) => s.isLogin);
  const fetchProfile = useUserStore((s) => s.fetchProfile);
  const location = useLocation();
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    if (token && !isLogin) {
      // 有token且未登录，走重拉
      let alive = true;
      fetchProfile()
        .catch(() => undefined)
        .finally(() => alive && setBooting(false));
      return () => {
        alive = false;
      };
    }
    // 无token（首次访问/已退出）直接to login，无需重拉
    setBooting(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (booting) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f5f5f5',
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  if (!isLogin) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

// 页面级权限守卫：
// 菜单 key 不在该角色 permissions.menus（且非 '*' 通配）时跳 403
export function Authorized({ menuKey, children }: { menuKey: string; children: ReactNode }) {
  const menus = useUserStore((s) => s.permissions.menus);
  const can = hasMenu(menus, menuKey);
  if (!can) return <Navigate to="/403" replace />;
  return children;
}
