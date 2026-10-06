import { Component, Fragment, type ReactNode } from 'react';
import { reportError } from '@/utils/errorMonitor';
import ErrorFallback from './fallback';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

/**
 * P1-2 渲染异常边界：捕获子树渲染期错误，渲染兜底 UI 阻止白屏扩散，
 * 并把错误交给 reportError 上报。必须用类组件（FC 无法实现 getDerivedStateFromError/componentDidCatch）。
 * 说明：React Router 6.4+ 的 createBrowserRouter 内部自带错误边界，路由元素抛错会先走路由
 * 的 errorElement；本组件兜住路由之外的渲染错误（如 App/布局自身的渲染异常）。
 */
class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown): Partial<State> {
    return { hasError: true, message: (error as Error | undefined)?.message ?? String(error) };
  }

  componentDidCatch(error: unknown, info: { componentStack?: string }): void {
    reportError(error, info);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return <ErrorFallback message={this.state.message} />;
    }
    return <Fragment>{this.props.children}</Fragment>;
  }
}

export default ErrorBoundary;
