// P1-2 全局异常采集与上报钩子。
// 开发环境打 console 便于调式；生产环境仅留上报接口占位（对接 Sentry / 自建 monitor）。

function createDedupe(gap = 3000): (key: string) => boolean {
  let key = '';
  let at = 0;
  return (k: string) => {
    const now = Date.now();
    if (k !== '' && k === key && now - at < gap) return true; // 命中 -> 过滤
    key = k;
    at = now;
    return false;
  };
}

const dedupeRender = createDedupe();
const dedupeGlobal = createDedupe();

function keyOf(error: unknown, prefix: string): string {
  const e = error as { message?: string; stack?: string } | undefined;
  const sig = `${e?.message ?? ''}|${e?.stack?.split('\n').slice(0, 3).join('\n') ?? ''}`;
  return `${prefix}|${sig}`;
}

/**
 * 渲染阶段异常上报（由 ErrorBoundary.componentDidCatch 调用）。
 * 兜底"上报"语义：生产接入监控平台后，一句 reportError 即完成采集。
 */
export function reportError(error: unknown, info?: { componentStack?: string }): void {
  if (dedupeRender(keyOf(error, 'render'))) return;
  const payload = {
    type: 'render',
    message: (error as Error | undefined)?.message ?? String(error),
    stack: (error as Error | undefined)?.stack,
    componentStack: info?.componentStack,
    time: new Date().toISOString(),
  };
  if (import.meta.env.DEV) {
    console.error('[ErrorBoundary] 捕获渲染异常（已上报）:', payload);
  } else {
    // 生产：对接监控平台
    // void sendToMonitor('/monitor/report', payload);
  }
}

/**
 * 全局监听 window.onerror / unhandledrejection，兜住 ErrorBoundary 覆盖不到的场景
 * （事件处理、异步抛错、Promise 未处理 rejection 等）。返回取消监听函数。
 */
export function initGlobalErrorCapture(): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const onError = (event: ErrorEvent) => {
    const err = event.error;
    const key = keyOf(err ?? new Error(event.message), 'global');
    if (dedupeGlobal(key)) return;
    if (import.meta.env.DEV) {
      console.error('[GlobalError] 捕获 window.onerror:', err ?? event.message, {
        source: event.filename,
        line: event.lineno,
        col: event.colno,
      });
    } else {
      // 生产上报
    }
  };

  const onRejection = (event: PromiseRejectionEvent) => {
    const key = keyOf(event.reason, 'promise');
    if (dedupeGlobal(key)) return;
    const reason = event.reason as Error | undefined;
    if (import.meta.env.DEV) {
      console.error('[GlobalError] 捕获未处理 Promise rejection:', {
        message: reason?.message ?? String(event.reason),
        stack: reason?.stack,
      });
    } else {
      // 生产上报
    }
  };

  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);
  return () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onRejection);
  };
}
