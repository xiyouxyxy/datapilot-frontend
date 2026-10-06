import { Card, Typography } from 'antd';

const { Title, Text } = Typography;

export default function Placeholder({ title }: { title: string }) {
  return (
    <Card>
      <Title level={4}>{title}</Title>
      <Text type="secondary">占位页面，后续实现。</Text>
    </Card>
  );
}
