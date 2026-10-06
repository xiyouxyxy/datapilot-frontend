import type MockAdapter from 'axios-mock-adapter';
import { DEPTS, getEmployees } from './_shared';
import type { DashboardSummary } from '@/types';

export function dashboardMock(mock: MockAdapter) {
  mock.onGet('/dashboard/summary').reply((config) => {
    const dept = config.params?.dept as string | undefined;
    const employees = getEmployees().filter((e) => !dept || e.dept === dept);
    const kpis = [
      { title: '员工总数', value: employees.length, unit: '人', trend: 5.2 },
      { title: '本月入职', value: 128, unit: '人', trend: 12.4 },
      { title: '进行中流程', value: 36, unit: '单', trend: -3.1 },
      { title: '待办消息', value: 12, unit: '条', trend: 8.0 },
    ];
    const trend = Array.from({ length: 12 }, (_, i) => ({
      date: `${i + 1}月`,
      value: 600 + Math.round(Math.sin(i) * 120 + i * 30),
    }));
    const deptDist = DEPTS.map((d) => ({
      name: d,
      value: employees.filter((e) => e.dept === d).length,
    }));
    const allPositions = Array.from(
      new Set(employees.map((e: { position: string }) => e.position)),
    );
    const positionDist = allPositions.map((p) => ({
      name: p,
      value: employees.filter((e: { position: string }) => e.position === p).length,
    }));
    const radar = [
      { name: '效率', value: 80 },
      { name: '质量', value: 72 },
      { name: '成本', value: 65 },
      { name: '满意度', value: 88 },
      { name: '交付', value: 76 },
      { name: '创新', value: 70 },
    ];
    const rank = [
      { name: '研发', value: 3200 },
      { name: '市场', value: 2100 },
      { name: '运营', value: 1800 },
      { name: '产品', value: 1500 },
      { name: '设计', value: 900 },
      { name: '财务', value: 500 },
    ];
    const data: DashboardSummary = {
      kpis,
      trend,
      deptDist,
      positionDist,
      radar,
      rank,
      filterDept: dept,
    };
    return [200, { code: 0, data, message: 'ok' }];
  });
}
