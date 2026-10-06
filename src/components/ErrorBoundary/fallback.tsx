import { Button, Result, Typography } from 'antd';

// P1-2 共享兜底 UI：ErrorBoundary（类组件）与 RouteErrorFallback（路由 errorElement）共用
export default function ErrorFallback({ message }: { message: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
      }}
    >
      <Result
        status="error"
        title="页面出错了"
        subTitle="渲染过程中发生异常，已自动记录。你可以重新加载，或联系我们排查。"
        extra={
          <Button type="primary" onClick={() => window.location.reload()}>
            重新加载
          </Button>
        }
      >
        <Typography.Paragraph type="secondary" style={{ maxWidth: 520, margin: '8px auto 0' }}>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0, fontSize: 12 }}>
            {message}
          </pre>
        </Typography.Paragraph>
      </Result>
    </div>
  );
}
