import { useCallback, useEffect, useState } from 'react';
import {
  Card,
  Tabs,
  Table,
  Tag,
  Button,
  Space,
  Drawer,
  Descriptions,
  Steps,
  Tooltip,
  App,
  Spin,
  Grid,
} from 'antd';
import { CheckOutlined, CloseOutlined, CloudSyncOutlined, DollarOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import Authority from '@/components/Authority';
import * as workflowService from '@/services/workflow';
import { PERM } from '@/constants';
import type { WorkflowTask, WorkflowType } from '@/types';

type TabKey = 'todo' | 'done' | 'mine';

const TYPE_TAG: Record<WorkflowType, { color: string; label: string }> = {
  leave: { color: 'blue', label: '请假' },
  reimburse: { color: 'orange', label: '报销' },
  travel: { color: 'purple', label: '出差' },
};

const STATUS_TAG: Record<WorkflowTask['status'], { color: string; label: string }> = {
  pending: { color: 'gold', label: '待审批' },
  approved: { color: 'green', label: '已通过' },
  rejected: { color: 'red', label: '已驳回' },
  withdrawn: { color: 'default', label: '已撤回' },
};

const TAB_META: { key: TabKey; label: string }[] = [
  { key: 'todo', label: '待我审批' },
  { key: 'done', label: '已办结' },
  { key: 'mine', label: '我发起的' },
];

const NODE_COLOR = { done: 'green', current: 'blue', wait: 'gray' } as const;

const { useBreakpoint } = Grid;

export default function WorkflowPage() {
  const { message } = App.useApp();
  const [tab, setTab] = useState<TabKey>('todo');
  const [data, setData] = useState<WorkflowTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<WorkflowTask | null>(null); // 详情抽屉
  const [detailLoading, setDetailLoading] = useState(false);

  // P2-2 移动端：窄屏审批详情抽屉接近全宽
  const screens = useBreakpoint();
  const isMobile = screens.sm === false;

  const load = useCallback(async (t: TabKey) => {
    setLoading(true);
    try {
      const list = await workflowService.list(t);
      setData(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(tab);
  }, [tab, load]);

  // 打开详情：先取已缓存行快速展示，再拉最新 detail
  const openDetail = async (record: WorkflowTask) => {
    setDetail(record);
    setDetailLoading(true);
    try {
      const d = await workflowService.detail(record.id);
      if (d) setDetail(d);
    } finally {
      setDetailLoading(false);
    }
  };

  // 审批/驳回：调接口成功后刷新当前 tab，并关抽屉
  const act = async (id: string, op: 'approve' | 'reject') => {
    try {
      if (op === 'approve') await workflowService.approve(id);
      else await workflowService.reject(id);
      message.success(op === 'approve' ? '已通过' : '已驳回');
      setDetail(null);
      void load(tab);
    } catch {
      message.error('操作失败，请重试');
    }
  };

  const columns: ColumnsType<WorkflowTask> = [
    {
      title: '类型',
      dataIndex: 'type',
      width: 80,
      render: (t: WorkflowType) => <Tag color={TYPE_TAG[t].color}>{TYPE_TAG[t].label}</Tag>,
    },
    { title: '标题', dataIndex: 'title', ellipsis: true },
    { title: '申请人', dataIndex: 'applicant', width: 90 },
    {
      title: '金额',
      dataIndex: 'amount',
      width: 100,
      render: (v?: number) =>
        v == null ? (
          <span style={{ color: '#bfbfbf' }}>-</span>
        ) : (
          <Space size={4}>
            <DollarOutlined />
            {v.toLocaleString()}
          </Space>
        ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (s: WorkflowTask['status']) => (
        <Tag color={STATUS_TAG[s].color}>{STATUS_TAG[s].label}</Tag>
      ),
    },
    { title: '当前节点', dataIndex: 'currentNode', width: 130, ellipsis: true },
    { title: '提交时间', dataIndex: 'createdAt', width: 140 },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space size={4}>
          <Button size="small" onClick={() => void openDetail(record)}>
            详情
          </Button>
          {record.status === 'pending' && tab === 'todo' && (
            <>
              <Authority code={PERM.WF_APPROVE}>
                <Tooltip title="审核通过">
                  <Button
                    size="small"
                    type="primary"
                    icon={<CheckOutlined />}
                    onClick={() => void act(record.id, 'approve')}
                  >
                    通过
                  </Button>
                </Tooltip>
              </Authority>
              <Authority code={PERM.WF_REJECT}>
                <Tooltip title="驳回申请">
                  <Button
                    size="small"
                    danger
                    icon={<CloseOutlined />}
                    onClick={() => void act(record.id, 'reject')}
                  >
                    驳回
                  </Button>
                </Tooltip>
              </Authority>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card title="流程中心">
      <Tabs activeKey={tab} onChange={(k) => setTab(k as TabKey)} items={TAB_META} />
      <Table<WorkflowTask>
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        size="middle"
        pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 条` }}
        onRow={(record) => ({
          onClick: () => void openDetail(record),
          style: { cursor: 'pointer' },
        })}
      />

      <Drawer
        title={detail?.title ?? '流程详情'}
        size={isMobile ? 300 : 560}
        open={!!detail}
        onClose={() => setDetail(null)}
        footer={
          detail && detail.status === 'pending' && tab === 'todo' ? (
            <Space style={{ float: 'right' }}>
              <Authority code={PERM.WF_REJECT}>
                <Button
                  danger
                  icon={<CloseOutlined />}
                  onClick={() => detail && void act(detail.id, 'reject')}
                >
                  驳回
                </Button>
              </Authority>
              <Authority code={PERM.WF_APPROVE}>
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  onClick={() => detail && void act(detail.id, 'approve')}
                >
                  通过
                </Button>
              </Authority>
            </Space>
          ) : null
        }
      >
        {detail && (
          <Space orientation="vertical" size={20} style={{ width: '100%' }}>
            <Spin spinning={detailLoading}>
              {/* Spin 加载中 */}
              <Descriptions
                column={1}
                size="middle"
                items={[
                  {
                    key: 'type',
                    label: '类型',
                    children: (
                      <Tag color={TYPE_TAG[detail.type].color}>{TYPE_TAG[detail.type].label}</Tag>
                    ),
                  },
                  { key: 'applicant', label: '申请人', children: detail.applicant },
                  ...(detail.amount != null
                    ? [
                        {
                          key: 'amount',
                          label: '金额',
                          children: `${detail.amount.toLocaleString()} 元`,
                        },
                      ]
                    : []),
                  {
                    key: 'status',
                    label: '状态',
                    children: (
                      <Tag color={STATUS_TAG[detail.status].color}>
                        {STATUS_TAG[detail.status].label}
                      </Tag>
                    ),
                  },
                  { key: 'createdAt', label: '提交时间', children: detail.createdAt },
                ]}
              />
            </Spin>
            <Steps
              size="middle"
              orientation="vertical"
              current={
                detail.status === 'approved'
                  ? detail.nodes.length
                  : detail.nodes.findIndex((n) => n.status === 'current')
              }
              status={
                detail.status === 'rejected'
                  ? 'error'
                  : detail.status === 'approved'
                    ? 'finish'
                    : 'process'
              }
              items={detail.nodes.map((n, i) => ({
                title: n.name,
                content: (
                  <Space orientation="vertical" size={2}>
                    <span style={{ color: NODE_COLOR[n.status], fontSize: 12 }}>
                      {i === 0 ? '发起' : n.approver}
                    </span>
                    {n.time && <span style={{ fontSize: 12 }}>{n.time}</span>}
                    {n.comment && (
                      <span style={{ fontSize: 12, color: '#cf1322' }}>{n.comment}</span>
                    )}
                  </Space>
                ),
              }))}
            />

            {detail.status === 'pending' && tab === 'todo' && (
              <Space>
                <CloudSyncOutlined />
                <span style={{ color: '#8c8c8c' }}>当前等待：{detail.currentNode}</span>
              </Space>
            )}
          </Space>
        )}
      </Drawer>
    </Card>
  );
}
