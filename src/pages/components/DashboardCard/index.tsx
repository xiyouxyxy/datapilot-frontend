import type { ReactNode } from 'react';
import { Card } from 'antd';

interface DashboardCardProps {
  title: ReactNode;
  extra?: ReactNode;
  children?: ReactNode;
  height?: number | string;
}

// 看板卡片容器：统一标题与内容区高度，供各图表卡片复用。
export default function DashboardCard({
  title,
  extra,
  children,
  height = 360,
}: DashboardCardProps) {
  return (
    <Card title={title} extra={extra} variant="outlined" styles={{ body: { height, padding: 16 } }}>
      {children}
    </Card>
  );
}
