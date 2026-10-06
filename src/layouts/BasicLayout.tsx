import { useEffect, useState } from 'react';
import { Layout, Menu, Avatar, Dropdown, Typography, Button, Drawer, Grid } from 'antd';
import { UserOutlined, LogoutOutlined, GlobalOutlined, MenuOutlined } from '@ant-design/icons';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MENU_CONFIG, pathToMenuKey, filterMenusByPermission } from '@/router/menus';
import { useUserStore } from '@/store/user';
import MessageCenter from '@/components/MessageCenter';
import { track } from '@/utils/track';
import { changeLanguage } from '@/i18n';

const { Sider, Header, Content } = Layout;
const { useBreakpoint } = Grid;

export function BasicLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const userInfo = useUserStore((s) => s.userInfo);
  const permissions = useUserStore((s) => s.permissions);
  const logout = useUserStore((s) => s.logout);
  const isEn = (i18n.resolvedLanguage || i18n.language || 'zh-CN').startsWith('en');

  // P2-2 移动端：useBreakpoint 首次渲染返回 undefined，用 `screens.lg === false` 判定可避免
  // 首帧误判为移动端造成的布局闪烁（默认按桌面渲染，生命周期内断点变化后再切换）。
  const screens = useBreakpoint();
  const isMobile = screens.lg === false;
  const [menuOpen, setMenuOpen] = useState(false);

  // 动态菜单：按角色 permissions.menus 过滤（admin 的 '*' 视为全部可见）——纯函数，便于单测
  const visibleMenus = filterMenusByPermission(MENU_CONFIG, permissions.menus);

  const selectedKey = pathToMenuKey(location.pathname);

  const navTo = (path: string) => {
    navigate(path);
    if (isMobile) setMenuOpen(false); // 窄屏点完菜单即收起抽屉
  };

  const onLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  // P1-3 埋点：路由切换上报 PV，并扫描首屏内 [data-track-expose] 曝光元素
  useEffect(() => {
    track.pv(location.pathname);
    track.scanExposure();
  }, [location.pathname]);

  const brand = (
    <div
      style={{
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 600,
      }}
    >
      {t('brand')}
    </div>
  );

  // 桌面 Sider 与移动 Drawer 共用同一份菜单，避免重复渲染逻辑
  const menu = (
    <Menu
      mode="inline"
      selectedKeys={selectedKey ? [selectedKey] : []}
      items={visibleMenus.map((m) => ({
        key: m.key,
        icon: m.icon,
        label: t(`menu.${m.label}`), // P1-1：菜单 label 存 i18n key，渲染时取当前语言文案
        onClick: () => navTo(m.path),
      }))}
    />
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {!isMobile && (
        <Sider theme="light" width={220}>
          {brand}
          {menu}
        </Sider>
      )}
      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: isMobile ? '0 12px' : '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isMobile ? 'space-between' : 'flex-end',
            gap: isMobile ? 8 : 16,
            position: 'sticky',
            top: 0,
            zIndex: 1,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
            {isMobile && (
              <Button
                type="text"
                icon={<MenuOutlined style={{ fontSize: 18 }} />}
                aria-label="menu"
                onClick={() => setMenuOpen(true)}
              />
            )}
            {isMobile && (
              <Typography.Text strong style={{ whiteSpace: 'nowrap' }}>
                {t('brand')}
              </Typography.Text>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 16 }}>
            <MessageCenter />
            <Dropdown
              menu={{
                items: [
                  { key: 'zh', label: t('lang.zh'), onClick: () => changeLanguage('zh-CN') },
                  { key: 'en', label: t('lang.en'), onClick: () => changeLanguage('en-US') },
                ],
              }}
            >
              <Button size="small" icon={<GlobalOutlined />}>
                {isEn ? 'EN' : '中'}
              </Button>
            </Dropdown>
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'logout',
                    icon: <LogoutOutlined />,
                    label: t('header.logout'),
                    onClick: onLogout,
                  },
                ],
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  maxWidth: 140,
                }}
              >
                <Avatar size="small" icon={<UserOutlined />} />
                <Typography.Text
                  ellipsis
                  style={{
                    lineHeight: 1, // 覆盖 Header 继承的 64px 行高，避免文本块被撑高后下沉
                    maxWidth: isMobile ? 56 : 96,
                  }}
                >
                  {userInfo?.name ?? userInfo?.username}
                </Typography.Text>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content style={{ margin: isMobile ? 12 : 24 }}>
          <Outlet />
        </Content>
      </Layout>

      {/* P2-2 移动端抽屉菜单：窄屏替代左侧固定 Sider */}
      <Drawer
        title={t('brand')}
        placement="left"
        size={220}
        open={isMobile && menuOpen}
        onClose={() => setMenuOpen(false)}
        styles={{ body: { padding: 0 } }}
      >
        {menu}
      </Drawer>
    </Layout>
  );
}
