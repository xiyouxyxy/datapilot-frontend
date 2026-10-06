import { useState } from 'react';
import { Button, Card, Select, Space, Typography } from 'antd';
import { SafetyCertificateOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ssoLogin } from '@/services/user';
import { QUICK_ACCOUNTS } from '@/constants';
import { SSO_PROVIDER } from '@/constants';

const { Title, Text } = Typography;

// P2-1 SSO：模拟「第三方统一身份认证页」。真实场景这是另一个域名（login.server.com），
// 用户在此已登录，确认授权后 302 带着一次性 code 回跳回本应用回调。
export default function SsoPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [username, setUsername] = useState('admin');
  const [loading, setLoading] = useState(false);
  const redirect = searchParams.get('redirect') || '/';

  const doAuthorize = async () => {
    setLoading(true);
    try {
      const { code } = await ssoLogin(username);
      // 模拟 OAuth 回跳：把一次性 code 拼到回调地址
      navigate(
        `/login/callback?code=${encodeURIComponent(code)}&redirect=${encodeURIComponent(redirect)}`,
        {
          replace: true,
        },
      );
    } catch {
      // 错误已由请求层统一弹出
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#eef2f7',
      }}
    >
      <Card style={{ width: 420, background: '#fff', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <SafetyCertificateOutlined style={{ fontSize: 40, color: '#2f54eb' }} />
          <Title level={4} style={{ marginTop: 8, marginBottom: 4 }}>
            {SSO_PROVIDER}
          </Title>
          <Text type="secondary">统一身份认证（Single Sign-On）</Text>
        </div>

        <Space orientation="vertical" size={16} style={{ width: '100%' }}>
          <div>
            <Text style={{ display: 'block', marginBottom: 8 }}>
              模拟当前在认证中心已登录的账号（演示不同角色权限差异）
            </Text>
            <Select
              style={{ width: '100%' }}
              value={username}
              onChange={setUsername}
              options={QUICK_ACCOUNTS.map((a) => ({
                value: a.username,
                label: `${a.label}（${a.username}）`,
              }))}
            />
          </div>

          <Button type="primary" block size="large" loading={loading} onClick={doAuthorize}>
            授权并一键登录
          </Button>

          <div style={{ textAlign: 'center' }}>
            <Link to="/login">← 返回密码登录</Link>
          </div>
        </Space>

        <Text type="secondary" style={{ display: 'block', marginTop: 20, fontSize: 12 }}>
          授权后仅签发一次性 authorization code，由应用后端换取访问令牌，前端不接触密钥。
        </Text>
      </Card>
    </div>
  );
}
