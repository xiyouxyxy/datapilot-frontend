import { api } from '@/utils/request';
import type { Employee, EmployeeQuery, PageResult } from '@/types';

export const list = (query: EmployeeQuery) =>
  api.post<PageResult<Employee>>('/employee/list', query);
export const all = (query: EmployeeQuery) => api.post<Employee[]>('/employee/all', query);
export const add = (data: Partial<Employee>) => api.post<{ id: number }>('/employee/add', data);
export const importMany = (rows: Partial<Employee>[]) =>
  api.post<{ imported: number }>('/employee/import', { rows });
export const update = (data: Partial<Employee>) => api.post<boolean>('/employee/update', data);
// P0-8 批量删除 / 批量更新
export const batchDelete = (ids: number[]) =>
  api.post<{ deleted: number }>('/employee/delete', { ids });
export const batchUpdate = (ids: number[], patch: Partial<Employee>) =>
  api.post<{ updated: number }>('/employee/batchUpdate', { ids, patch });

export interface EmployeeOptions {
  depts: string[];
  positions: string[];
  positionsByDept?: Record<string, string[]>;
}
export const getOptions = () => api.get<EmployeeOptions>('/employee/options');
