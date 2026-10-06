import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'antd/dist/reset.css';
import './index.css';
import App from './App';
import { initGlobalErrorCapture } from '@/utils/errorMonitor';
import { track } from '@/utils/track';

// P1-2 全局监听 onerror / unhandledrejection，兜住 ErrorBoundary 覆盖不到的场景
initGlobalErrorCapture();
// P1-3 埋点 SDK：点击委托采集 + FCP/LCP/TTI 性能观察
track.init();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
