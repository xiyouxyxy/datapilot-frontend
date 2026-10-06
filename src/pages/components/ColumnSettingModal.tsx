import { Button, Checkbox, Modal, Space } from 'antd';
import { ALL_COLUMN_KEYS, keyToTitle, type ColKey } from '@/pages/employee/columns';

interface ColumnSettingModalProps {
  open: boolean;
  draftColKeys: ColKey[];
  onChange: (keys: ColKey[]) => void;
  onReset: () => void;
  onCancel: () => void;
  onOk: () => void;
}

// 列设置弹窗：纯展示，草稿状态与持久化逻辑由 useColumnSettings 管理
export default function ColumnSettingModal({
  open,
  draftColKeys,
  onChange,
  onReset,
  onCancel,
  onOk,
}: ColumnSettingModalProps) {
  return (
    <Modal
      title="列设置"
      open={open}
      onOk={onOk}
      onCancel={onCancel}
      okText="保存"
      cancelText="取消"
      width={360}
    >
      <Space orientation="vertical" style={{ width: '100%' }}>
        <Checkbox.Group
          options={ALL_COLUMN_KEYS.map((k) => ({ label: keyToTitle(k), value: k }))}
          value={draftColKeys}
          onChange={(vals) => onChange(vals as ColKey[])}
          style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
        />
        <Button
          type="link"
          size="small"
          onClick={onReset}
          style={{ alignSelf: 'flex-start', paddingLeft: 0 }}
        >
          恢复默认
        </Button>
      </Space>
    </Modal>
  );
}
