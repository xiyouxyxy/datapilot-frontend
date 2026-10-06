import { useEffect, useState } from 'react';
import { Badge, Button, Drawer, Avatar, Tabs, Tag, App, Grid } from 'antd';
import { BellOutlined, ReadOutlined } from '@ant-design/icons';
import { useMessageStore } from '@/store/message';
import type { AppMessage, MessageType } from '@/types';

const { useBreakpoint } = Grid;

const TYPE_META: Record<MessageType, { color: string; label: string }> = {
  todo: { color: 'blue', label: '待办' },
  notice: { color: 'orange', label: '通知' },
  system: { color: 'purple', label: '系统' },
};

export default function MessageCenter() {
  const { message } = App.useApp();
  const [open, setOpen] = useState(false);

  // P2-2 移动端：窄屏抽屉接近全宽（400 会超出 390 的手机视口）
  const screens = useBreakpoint();
  const isMobile = screens.sm === false;

  const list = useMessageStore((s) => s.list);
  const unread = useMessageStore((s) => s.unread);
  const loaded = useMessageStore((s) => s.loaded);
  const load = useMessageStore((s) => s.load);
  const markRead = useMessageStore((s) => s.markRead);
  const markAllRead = useMessageStore((s) => s.markAllRead);
  const startSubscribe = useMessageStore((s) => s.startSubscribe);
  const stopSubscribe = useMessageStore((s) => s.stopSubscribe);

  // 挂载：拉历史 + 开启实时订阅；卸载：停定时器防泄漏
  useEffect(() => {
    if (!loaded) void load();
    startSubscribe();
    return () => stopSubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openMessage = (m: AppMessage) => {
    if (!m.read) markRead(m.id); // 点击即标记已读
  };

  const onAllRead = () => {
    markAllRead();
    message.success('已全部标记为已读');
  };

  // antd 6.6 起 List 组件弃用（警告指向 Listy，但 Listy 是另一套虚拟列表 API、无 Item.Meta），
  // 消息列表简单，直接以普通 div 渲染，视觉等价。
  const renderMessages = (items: AppMessage[]) => {
    if (!items.length) {
      return <div style={{ color: '#bfbfbf', textAlign: 'center', padding: 32 }}>暂无消息</div>;
    }
    return items.map((m) => {
      const meta = TYPE_META[m.type];
      return (
        <div
          key={m.id}
          className="ant-list-item"
          onClick={() => openMessage(m)}
          style={{
            cursor: 'pointer',
            opacity: m.read ? 0.55 : 1,
            display: 'flex',
            gap: 12,
            padding: '12px 8px',
            borderBottom: '1px solid rgba(5,5,5,0.06)',
          }}
        >
          <Avatar size="small" icon={<BellOutlined />} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="ant-list-item-meta-title">
              <Tag color={meta.color} style={{ marginRight: 8 }}>
                {meta.label}
              </Tag>
              {m.title}
              {!m.read && <span style={{ color: '#1677ff', fontWeight: 600 }}> · 未读</span>}
            </div>
            <div className="ant-list-item-meta-description" style={{ color: 'rgba(0,0,0,0.45)' }}>
              {m.content}
            </div>
          </div>
          {m.time && (
            <span style={{ color: '#8c8c8c', fontSize: 12, whiteSpace: 'nowrap' }}>{m.time}</span>
          )}
        </div>
      );
    });
  };

  return (
    <>
      <Badge count={unread} size="small" offset={[-2, 2]}>
        <Button
          type="text"
          icon={<BellOutlined style={{ fontSize: 18 }} />}
          onClick={() => setOpen(true)}
        />
      </Badge>

      <Drawer
        title={
          <span>
            消息中心
            <Badge count={unread} style={{ marginLeft: 8 }} />
          </span>
        }
        size={isMobile ? 300 : 400}
        placement="right"
        open={open}
        onClose={() => setOpen(false)}
        styles={{ body: { padding: '0 8px' } }}
        extra={
          <Button
            size="small"
            type="link"
            icon={<ReadOutlined />}
            onClick={onAllRead}
            disabled={!unread}
          >
            全部已读
          </Button>
        }
      >
        <Tabs
          defaultActiveKey="all"
          items={[
            { key: 'all', label: '全部', children: renderMessages(list) },
            {
              key: 'todo',
              label: '待办',
              children: renderMessages(list.filter((m) => m.type === 'todo')),
            },
            {
              key: 'notice',
              label: '通知',
              children: renderMessages(list.filter((m) => m.type === 'notice')),
            },
            {
              key: 'system',
              label: '系统',
              children: renderMessages(list.filter((m) => m.type === 'system')),
            },
          ]}
        />
      </Drawer>
    </>
  );
}
