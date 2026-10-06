import { useState } from 'react';
import { App, Button, Card, Divider, Form, Input, Typography } from 'antd';
import { UserOutlined, LockOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUserStore } from '@/store/user';
import { QUICK_ACCOUNTS } from '@/constants';

const { Title, Text } = Typography;

interface LoginForm {
  username: string;
  password: string;
}

export default function LoginPage() {
  const { message } = App.useApp();
  const { t } = useTranslation();
  const [form] = Form.useForm<LoginForm>();
  const [loading, setLoading] = useState(false);
  const login = useUserStore((s) => s.login);
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: { pathname?: string } } | null)?.from?.pathname;

  const doLogin = async (username: string, password: string) => {
    setLoading(true);
    try {
      await login(username, password);
      message.success(t('login.welcomeBack', { name: username }));
      navigate(from || '/', { replace: true });
    } catch {
      // 具体的错误提示已由请求层拦截器统一弹出，这里仅结束 loading
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = async (values: LoginForm) => {
    await doLogin(values.username, values.password);
  };

  const fillQuickAccount = (acc: (typeof QUICK_ACCOUNTS)[number]) => {
    form.setFieldsValue({ username: acc.username, password: acc.password });
    void doLogin(acc.username, acc.password);
  };

  // P2-1 SSO：跳转到模拟的第三方认证中心，登录后回跳把一次性 code 交给后端换 token
  const startSso = () => {
    const target = from || '/';
    navigate(`/sso?redirect=${encodeURIComponent(target)}`);
  };

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
      <Card
        style={{
          width: 420,
          background: '#ffffff',
          boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={3} style={{ marginBottom: 4 }}>
            DataPilot
          </Title>
          <Text type="secondary">{t('login.subtitle')}</Text>
        </div>

        <Form form={form} name="login" size="large" onFinish={handleFinish}>
          <Form.Item
            name="username"
            rules={[{ required: true, message: t('login.usernameRequired') }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder={t('login.username')}
              autoComplete="username"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: t('login.passwordRequired') }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder={t('login.password')}
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 8 }}>
            <Button type="primary" htmlType="submit" block loading={loading}>
              {t('login.login')}
            </Button>
          </Form.Item>

          {/* P2-1 SSO：统一认证入口 */}
          <Divider plain style={{ fontSize: 12, margin: '4px 0 12px' }}>
            {t('login.otherLogin')}
          </Divider>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button block icon={<SafetyCertificateOutlined />} onClick={startSso}>
              {t('login.sso')}
            </Button>
          </Form.Item>
        </Form>

        <div style={{ marginTop: 8 }}>
          <Text
            type="secondary"
            style={{ display: 'block', textAlign: 'center', fontSize: 12, marginBottom: 12 }}
          >
            {t('login.quickHint')}
          </Text>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {QUICK_ACCOUNTS.map((acc) => (
              <Button
                key={acc.username}
                size="small"
                style={{ whiteSpace: 'normal', height: 'auto', padding: '6px 8px' }}
                onClick={() => fillQuickAccount(acc)}
              >
                {acc.label}
                <br />
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {acc.username}
                </Text>
              </Button>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
