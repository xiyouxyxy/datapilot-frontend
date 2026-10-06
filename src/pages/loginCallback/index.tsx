import { useEffect, useRef, useState } from 'react';
import { Button, Card, Result, Spin } from 'antd';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useUserStore } from '@/store/user';

// P2-1 SSO 回调页：从 URL 取一次性 code，调后端换 token，成功后写入登录态并跳回原想去页面。
export default function LoginCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const ssoExchange = useUserStore((s) => s.ssoExchange);
  const [error, setError] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    const code = searchParams.get('code');
    const redirect = searchParams.get('redirect') || '/';
    if (!code) {
      setError(true);
      return;
    }
    if (started.current) return;
    started.current = true;
    ssoExchange(code)
      .then(() => navigate(redirect, { replace: true }))
      .catch(() => setError(true));
  }, [navigate, searchParams, ssoExchange]);

  if (error) {
    return (
      <Result
        status="error"
        title="统一认证失败"
        subTitle="authorization code 无效或已过期（真实场景 code 为一次性，重复使用会失效）。"
        extra={
          <Link to="/login">
            <Button type="primary">返回登录</Button>
          </Link>
        }
      />
    );
  }

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
      <Card style={{ width: 380, textAlign: 'center' }}>
        <Spin size="large" />
        <p style={{ marginTop: 16 }}>正在通过统一身份认证为您免登录跳转…</p>
      </Card>
    </div>
  );
}
