import { useEffect } from 'react';
import { App as AntApp, ConfigProvider } from 'antd';
import { RouterProvider } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import zhCN from 'antd/locale/zh_CN';
import enUS from 'antd/locale/en_US';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import enGB from 'dayjs/locale/en-gb';
import { router } from '@/router';
import ErrorBoundary from '@/components/ErrorBoundary';
import { bindMessageError, AUTH_EXPIRED_EVENT } from '@/utils/request';
import './i18n';

// antd 6.6 静态 message 弃用；请求层（非组件模块）通过 bindMessageError 注入 App.useApp().message，
// 让拦截器报错提示能吃到主题上下文且不触发废弃告警。
// 注意：绑定放在 render 期而非 useEffect——bindMessageError 只是幂等的模块变量赋值，
// 放 effect 会导致「首次 render 完成前就已发出的请求」错误提示被空实现静默吞掉。
function MessageBridge() {
  const { message } = AntApp.useApp();
  bindMessageError((content) => void message.error(content));
  return null;
}

function App() {
  // 订阅语言变化（useTranslation 触发重渲染），让 antd 组件（分页/日期等）随语言切换
  const { i18n } = useTranslation();
  const isEn = (i18n.resolvedLanguage || i18n.language || 'zh-CN').startsWith('en');

  useEffect(() => {
    dayjs.locale(isEn ? enGB : 'zh-cn');
  }, [isEn]);

  // 登录态失效：请求层派发 AUTH_EXPIRED_EVENT，这里用 router.navigate 做 SPA 内跳转，
  // 避免整页刷新丢状态；且在非登录页才跳，防止登录页自身 401 时死循环。
  useEffect(() => {
    const onExpired = () => {
      if (router.state.location.pathname !== '/login') {
        router.navigate('/login', { replace: true });
      }
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, []);

  return (
    <ConfigProvider locale={isEn ? enUS : zhCN} theme={{ token: { colorPrimary: '#1677ff' } }}>
      <AntApp>
        <MessageBridge />
        {/* ErrorBoundary 包住整个路由树：任一路由页渲染崩溃都不白屏 */}
        <ErrorBoundary>
          <RouterProvider router={router} />
        </ErrorBoundary>
      </AntApp>
    </ConfigProvider>
  );
}

export default App;
