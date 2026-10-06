import type MockAdapter from 'axios-mock-adapter';
import { getEmployees, setEmployees, DEPT_POSITIONS } from './_shared';
import type { Employee, EmployeeQuery, PageResult } from '@/types';

function applyFilters(list: Employee[], f?: EmployeeQuery['filters']): Employee[] {
  if (!f) return list;
  return list.filter((e) => {
    if (f.name && !e.name.includes(f.name)) return false;
    if (f.dept && e.dept !== f.dept) return false;
    if (f.position && e.position !== f.position) return false;
    if (f.status && e.status !== f.status) return false;
    if (f.gender && e.gender !== f.gender) return false;
    return true;
  });
}

export function employeeMock(mock: MockAdapter) {
  mock.onPost('/employee/list').reply((config) => {
    const q: EmployeeQuery = config.data ? JSON.parse(config.data) : {};
    const filtered = applyFilters(getEmployees(), q.filters);
    const current = q.current || 1;
    const pageSize = q.pageSize || 20;
    const start = (current - 1) * pageSize;
    const data: PageResult<Employee> = {
      records: filtered.slice(start, start + pageSize),
      total: filtered.length,
      current,
      pageSize,
    };
    return [200, { code: 0, data, message: 'ok' }];
  });

  mock.onPost('/employee/all').reply((config) => {
    const q: EmployeeQuery = config.data ? JSON.parse(config.data) : {};
    return [200, { code: 0, data: applyFilters(getEmployees(), q.filters), message: 'ok' }];
  });

  mock.onPost('/employee/add').reply((config) => {
    const body = config.data ? JSON.parse(config.data) : {};
    const list = getEmployees();
    const id = list.length + 1;
    list.unshift({ id, ...body } as Employee);
    return [200, { code: 0, data: { id }, message: 'ok' }];
  });

  // 批量导入：避免逐条 add 多次往返，一次 POST 全量；返回实际写入条数
  mock.onPost('/employee/import').reply((config) => {
    const body = config.data ? JSON.parse(config.data) : {};
    const list = getEmployees();
    const rows: Partial<Employee>[] = Array.isArray(body.rows) ? body.rows : [];
    let count = 0;
    for (const r of rows) {
      const id = list.length + 1;
      list.unshift({ id, ...r } as Employee);
      count += 1;
    }
    return [200, { code: 0, data: { imported: count }, message: 'ok' }];
  });

  mock.onPost('/employee/update').reply((config) => {
    const body = config.data ? JSON.parse(config.data) : {};
    const list = getEmployees();
    const idx = list.findIndex((e) => e.id === body.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...body };
      return [200, { code: 0, data: true, message: 'ok' }];
    }
    return [200, { code: 400, data: null, message: '未找到该员工' }];
  });

  // P0-8 批量删除：按 id 数组一次清掉，返回实际删除条数
  mock.onPost('/employee/delete').reply((config) => {
    const body = config.data ? JSON.parse(config.data) : {};
    const ids: number[] = Array.isArray(body.ids) ? body.ids : [];
    const list = getEmployees();
    const before = list.length;
    if (ids.length) {
      const keep = new Set(ids);
      setEmployees(list.filter((e) => !keep.has(e.id)));
    }
    return [200, { code: 0, data: { deleted: before - getEmployees().length }, message: 'ok' }];
  });

  // P0-8 批量更新：同一条消息更新多个 id 的指定字段（如 status），返回受影响条数
  mock.onPost('/employee/batchUpdate').reply((config) => {
    const body = config.data ? JSON.parse(config.data) : {};
    const ids: number[] = Array.isArray(body.ids) ? body.ids : [];
    const patch: Record<string, unknown> = body.patch ?? {};
    const list = getEmployees();
    let count = 0;
    for (const e of list) {
      if (ids.includes(e.id)) {
        Object.assign(e, patch);
        count += 1;
      }
    }
    return [200, { code: 0, data: { updated: count }, message: 'ok' }];
  });

  mock.onGet('/employee/options').reply(() => {
    const list = getEmployees();
    const depts = Array.from(new Set(list.map((e) => e.dept)));
    const positions = Array.from(new Set(list.map((e) => e.position)));
    return [
      200,
      { code: 0, data: { depts, positions, positionsByDept: DEPT_POSITIONS }, message: 'ok' },
    ];
  });
}
