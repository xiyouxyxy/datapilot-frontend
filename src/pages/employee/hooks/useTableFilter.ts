import { useCallback, useState } from 'react';
import type { FilterValue } from 'antd/es/table/interface';
import type { EmployeeQuery } from '@/types';
import type { ColumnFilters } from '../columns';

interface UseTableFilterOptions {
  reload: (filters?: EmployeeQuery['filters']) => void;
  clearSelection: () => void;
}

// 筛选层：把 antd Table.onChange 的 filters 映射为服务端参数；筛选变化时联动
// 1) key 自增触发 Table 重挂载 → 虚拟列表滚动归零；2) 清理失效选中；3) 重新拉取。
export function useTableFilter({ reload, clearSelection }: UseTableFilterOptions) {
  const [filters, setFilters] = useState<ColumnFilters>({});
  const [filterKey, setFilterKey] = useState(0);

  const handleTableChange = useCallback(
    (changed: Record<string, FilterValue | null>) => {
      const next: ColumnFilters = {};
      if (changed.dept?.length) next.dept = String(changed.dept[0]);
      if (changed.position?.length) next.position = String(changed.position[0]);
      if (changed.status?.length) next.status = String(changed.status[0]);
      setFilters(next);
      setFilterKey((k) => k + 1);
      clearSelection();
      reload(next);
    },
    [reload, clearSelection],
  );

  return { filters, filterKey, handleTableChange };
}
