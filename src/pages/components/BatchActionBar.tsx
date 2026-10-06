import { Button, Dropdown, Space } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import Authority from '@/components/Authority';
import { PERM } from '@/constants';
import type { EmployeeStatus } from '@/types';

const STATUSES: EmployeeStatus[] = ['在职', '试用期', '离职'];

interface BatchActionBarProps {
  selectedCount: number;
  onBatchDelete: () => void;
  onChangeStatus: (status: EmployeeStatus) => void;
}

// 批量操作按钮组：删除/改状态的权限包裹与禁用态在此收敛，业务逻辑由父级组装层提供
// 必须自带 Space：父级 Space 无法看穿自定义组件，整个按钮组只会被当成一个 item，内部两键会贴在一起
export default function BatchActionBar({
  selectedCount,
  onBatchDelete,
  onChangeStatus,
}: BatchActionBarProps) {
  const count = selectedCount ? `（${selectedCount}）` : '';
  return (
    <Space wrap>
      <Authority code={PERM.EMP_DELETE}>
        <Button danger disabled={!selectedCount} onClick={onBatchDelete}>
          批量删除{count}
        </Button>
      </Authority>
      <Authority code={PERM.EMP_EDIT}>
        <Dropdown
          menu={{
            items: STATUSES.map((s) => ({ key: s, label: s })),
            onClick: ({ key }) => onChangeStatus(key as EmployeeStatus),
          }}
          disabled={!selectedCount}
        >
          <Button disabled={!selectedCount}>
            批量改状态{count} <DownOutlined />
          </Button>
        </Dropdown>
      </Authority>
    </Space>
  );
}
