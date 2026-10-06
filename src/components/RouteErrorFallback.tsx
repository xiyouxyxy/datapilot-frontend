import { useEffect } from 'react';
import { useRouteError } from 'react-router-dom';
import { reportError } from '@/utils/errorMonitor';
import ErrorFallback from './ErrorBoundary/fallback';

/**
 * P1-2 路由级兜底：作为根路由的 errorElement。
 * React Router 6.4+ 路由元素抛错由 errorElement 接管（而不是白屏或被 RR 默认页取代），
 * 这里统一走 reportError 上报 + 共享兜底 UI。
 */
export default function RouteErrorFallback() {
  const error = useRouteError();
  useEffect(() => {
    reportError(error ?? new Error('route render error'));
  }, [error]);
  const message = (error as Error | undefined)?.message ?? String(error ?? '路由渲染出错');
  return <ErrorFallback message={message} />;
}
