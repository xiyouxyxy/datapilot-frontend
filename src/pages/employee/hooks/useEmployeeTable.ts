import { useCallback, useEffect, useState } from 'react';
import * as employeeService from '@/services/employee';
import type { Employee, EmployeeQuery } from '@/types';
import type { TableFilterOpts } from '../columns';

// 数据层：全量拉取 + loading + 筛选选项一次性聚合（保证下拉选项稳定不抖动）。
// 唯一的数据入口，筛选/增删改后都通过 reload 刷新。
export function useEmployeeTable() {
  const [data, setData] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterOpts, setFilterOpts] = useState<TableFilterOpts>({
    dept: [],
    position: [],
    status: [],
  });

  const reload = useCallback(async (filters?: EmployeeQuery['filters']) => {
    setLoading(true);
    try {
      const res = await employeeService.all({ filters });
      setData(res);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await employeeService.all({});
        setData(res);
        const uniq = (arr: string[]) =>
          Array.from(new Set(arr)).map((text) => ({ text, value: text }));
        setFilterOpts({
          dept: uniq(res.map((e) => e.dept)),
          position: uniq(res.map((e) => e.position)),
          status: uniq(res.map((e) => e.status)),
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { data, loading, filterOpts, reload };
}
