// 共享 mock 数据：部门/职位常量 + 1 万条员工生成器（单例缓存，避免重复生成）。

import type { Employee, EmployeeStatus } from '@/types';

export const DEPTS = ['研发', '产品', '设计', '财务', '人事', '市场', '运营'];
export const STATUSES: EmployeeStatus[] = ['在职', '试用期', '离职'];

// 部门 → 岗位 联动字典。getEmployees 也用它生成职位，保证现有 1 万条员工与下拉联动一致。
export const DEPT_POSITIONS: Record<string, string[]> = {
  研发: ['初级', '中级', '高级', '专家', 'Leader'],
  产品: ['初级', '中级', '高级', '产品负责人'],
  设计: ['初级', '中级', '高级'],
  财务: ['初级', '中级', '高级', '财务主管'],
  人事: ['初级', '中级', '高级', '人事主管'],
  市场: ['初级', '中级', '高级'],
  运营: ['初级', '中级', '高级'],
};

const SURNAMES = ['张', '王', '李', '赵', '陈', '刘', '杨', '黄', '周', '吴'];
const GIVENS = [
  '伟',
  '芳',
  '娜',
  '敏',
  '静',
  '强',
  '磊',
  '军',
  '洋',
  '勇',
  '艳',
  '杰',
  '娟',
  '涛',
  '明',
  '霞',
  '平',
  '刚',
  '桂',
  '婷',
];

let _employees: Employee[] | null = null;

export function getEmployees(): Employee[] {
  if (_employees) return _employees;
  const list: Employee[] = [];
  for (let i = 1; i <= 10000; i++) {
    const dept = DEPTS[i % DEPTS.length];
    const name = SURNAMES[i % SURNAMES.length] + GIVENS[(i * 7) % GIVENS.length];
    const phone =
      '1' + (3 + (i % 6)) + String(100000000 + ((i * 7919) % 899999999)).padStart(9, '0');
    const idCard = '3301' + String(190000000000 + ((i * 123457) % 800000000000)).padStart(14, '0');
    const mm = 1 + (i % 12);
    const dd = 1 + (i % 28);
    const deptPositions = DEPT_POSITIONS[dept] ?? [];
    list.push({
      id: i,
      name,
      gender: i % 2 ? '男' : '女',
      dept,
      position: deptPositions[i % deptPositions.length],
      salary: 5000 + ((i * 37) % 25000),
      phone,
      email: `user${i}@fishbi.com`,
      entryDate: `20${20 + (i % 5)}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`,
      status: STATUSES[i % STATUSES.length],
      idCard,
    });
  }
  _employees = list;
  return list;
}

// P0-8 批量删除需要回写单例列表（增删改统一走这里，保持与 getEmployees 同源）
export function setEmployees(list: Employee[]): void {
  _employees = list;
}
