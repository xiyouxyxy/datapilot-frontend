import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Key } from 'react';
import type { TableRowSelection } from 'antd/es/table/interface';
import type { Employee } from '@/types';
import { SELECTION_COL_WIDTH } from '../columns';

// 选中态：管理 selectedRowKeys，并在 data 变化（筛选/刷新/删除）后自动清理失效 key，
// 保证勾选计数与导出内容一致。selectedRows 作为导出/批量操作的单一事实来源。
export function useBatchSelection({ data }: { data: Employee[] }) {
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);

  const selectedRows = useMemo(
    () => data.filter((e) => selectedRowKeys.includes(e.id)),
    [data, selectedRowKeys],
  );

  useEffect(() => {
    const valid = new Set(data.map((e) => e.id));
    setSelectedRowKeys((prev) => {
      const next = prev.filter((k) => valid.has(k as number));
      return next.length === prev.length ? prev : next;
    });
  }, [data]);

  const clearSelection = useCallback(() => setSelectedRowKeys([]), []);

  const rowSelection: TableRowSelection<Employee> = {
    columnWidth: SELECTION_COL_WIDTH,
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys),
  };

  return { selectedRowKeys, selectedRows, rowSelection, clearSelection, setSelectedRowKeys };
}
