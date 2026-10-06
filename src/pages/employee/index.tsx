import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { App, Button, Card, Space, Table } from 'antd';
import { PlusOutlined, SettingOutlined, UploadOutlined } from '@ant-design/icons';
import * as employeeService from '@/services/employee';
import type { Employee, EmployeeStatus } from '@/types';
import Authority from '@/components/Authority';
import EmployeeFormModal from '@/pages/components/EmployeeFormModal';
import { PERM } from '@/constants';
import { useUserStore } from '@/store/user';
import { useEmployeeTable } from './hooks/useEmployeeTable';
import { useTableFilter } from './hooks/useTableFilter';
import { useColumnSettings } from './hooks/useColumnSettings';
import { useBatchSelection } from './hooks/useBatchSelection';
import { useEmployeeExport } from './hooks/useEmployeeExport';
import { buildColumns, calcTableScrollX } from './columns';
import ColumnSettingModal from '@/pages/components/ColumnSettingModal';
import BatchActionBar from '@/pages/components/BatchActionBar';

const SCROLL_Y = 560;

// 员工管理页：仅组装各 Hook 与 UI，业务协调（弹窗确认、增删改提交）集中在此。
export default function EmployeePage() {
  const navigate = useNavigate();
  const { message, modal } = App.useApp();
  const hasButton = useUserStore((s) => s.hasButton);

  const { data, loading, filterOpts, reload } = useEmployeeTable();
  const { selectedRowKeys, selectedRows, rowSelection, clearSelection } = useBatchSelection({
    data,
  });
  const { filters, filterKey, handleTableChange } = useTableFilter({ reload, clearSelection });
  const { handleExport } = useEmployeeExport({ data, selectedRows });
  const {
    colKeys,
    draftColKeys,
    colSetOpen,
    setDraftColKeys,
    openSettings,
    applySettings,
    resetSettings,
    closeSettings,
  } = useColumnSettings();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingRecord, setEditingRecord] = useState<Employee | null>(null);

  const onAdd = () => {
    setModalMode('create');
    setEditingRecord(null);
    setModalOpen(true);
  };
  const onImport = () => navigate('/import');

  const onEdit = useCallback(
    (record: Employee) => {
      if (!hasButton(PERM.EMP_EDIT)) {
        message.warning('你没有编辑权限');
        return;
      }
      setModalMode('edit');
      setEditingRecord(record);
      setModalOpen(true);
    },
    [hasButton, message],
  );

  const onDelete = useCallback(
    (record: Employee) => {
      if (!hasButton(PERM.EMP_DELETE)) {
        message.warning('你没有删除权限');
        return;
      }
      modal.confirm({
        title: '确认删除',
        content: `将删除「${record.name}」（工号 ${record.id}），该操作不可撤销。是否继续？`,
        okText: '删除',
        okButtonProps: { danger: true },
        cancelText: '取消',
        onOk: async () => {
          const res = await employeeService.batchDelete([record.id]);
          message.success(`已删除 ${res.deleted ?? 1} 条`);
          reload();
        },
      });
    },
    [hasButton, message, modal, reload],
  );

  const onBatchDelete = () => {
    if (!hasButton(PERM.EMP_DELETE)) {
      message.warning('你没有删除权限');
      return;
    }
    if (!selectedRows.length) return;
    const names = selectedRows.map((e) => e.name).slice(0, 5);
    const more = selectedRows.length - names.length;
    modal.confirm({
      title: '批量删除',
      content: `将删除选中的 ${selectedRows.length} 条员工（${names.join('、')}${more > 0 ? ` 等 ${more} 人` : ''}），不可撤销。是否继续？`,
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        const res = await employeeService.batchDelete(selectedRows.map((e) => e.id));
        message.success(`已删除 ${res.deleted ?? selectedRows.length} 条`);
        clearSelection();
        reload();
      },
    });
  };

  const onChangeStatus = (status: EmployeeStatus) => {
    if (!hasButton(PERM.EMP_EDIT)) {
      message.warning('你没有编辑权限');
      return;
    }
    if (!selectedRows.length) return;
    modal.confirm({
      title: '批量修改状态',
      content: `将选中的 ${selectedRows.length} 条员工的「状态」统一改为「${status}」。是否继续？`,
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        const res = await employeeService.batchUpdate(
          selectedRows.map((e) => e.id),
          { status },
        );
        message.success(`已更新 ${res.updated ?? selectedRows.length} 条员工状态`);
        clearSelection();
        reload();
      },
    });
  };

  const onFormSuccess = () => {
    setModalOpen(false);
    reload();
  };

  const columns = useMemo(
    () => buildColumns({ colKeys, filterOpts, filters, onEdit, onDelete }),
    [colKeys, filterOpts, filters, onEdit, onDelete],
  );

  return (
    <Card title="员工管理">
      <Space style={{ marginBottom: 16 }} wrap>
        <Authority code={PERM.EMP_ADD}>
          <Button type="primary" icon={<PlusOutlined />} data-track="employee:add" onClick={onAdd}>
            新增
          </Button>
        </Authority>
        <Authority code={PERM.EMP_IMPORT}>
          <Button icon={<UploadOutlined />} onClick={onImport}>
            导入
          </Button>
        </Authority>
        <Authority code={PERM.EMP_EXPORT}>
          <Button onClick={handleExport}>导出</Button>
        </Authority>
        <BatchActionBar
          selectedCount={selectedRowKeys.length}
          onBatchDelete={onBatchDelete}
          onChangeStatus={onChangeStatus}
        />
        <Button icon={<SettingOutlined />} onClick={openSettings}>
          列设置
        </Button>
      </Space>

      <Table<Employee>
        key={filterKey}
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={data}
        rowSelection={rowSelection}
        onChange={(_, changedFilters) => handleTableChange(changedFilters)}
        virtual
        pagination={false}
        scroll={{ x: calcTableScrollX(colKeys), y: SCROLL_Y }}
      />

      <ColumnSettingModal
        open={colSetOpen}
        draftColKeys={draftColKeys}
        onChange={setDraftColKeys}
        onReset={resetSettings}
        onCancel={closeSettings}
        onOk={applySettings}
      />

      <EmployeeFormModal
        mode={modalMode}
        open={modalOpen}
        record={editingRecord}
        onCancel={() => setModalOpen(false)}
        onSuccess={onFormSuccess}
      />
    </Card>
  );
}
