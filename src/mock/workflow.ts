import type MockAdapter from 'axios-mock-adapter';
import type { WorkflowNode, WorkflowTask, WorkflowType } from '@/types';

const TYPES: WorkflowType[] = ['leave', 'reimburse', 'travel'];
const TITLES: Record<WorkflowType, string> = {
  leave: '请假申请',
  reimburse: '报销申请',
  travel: '出差申请',
};
const APPLICANTS = ['张伟', '王芳', '李娜', '赵敏', '陈静', '刘强'];

function buildNodes(status: WorkflowTask['status'], rejectAt?: number): WorkflowNode[] {
  const all = [
    { name: '发起申请', approver: '申请人' },
    { name: '部门主管审批', approver: '研发主管' },
    { name: 'HR 审批', approver: '人事' },
    { name: '财务审批', approver: '财务' },
  ];
  return all.map((n, idx) => {
    let s: 'done' | 'current' | 'wait' = 'wait';
    let time: string | undefined;
    let comment: string | undefined;
    if (status === 'withdrawn') {
      s = idx === 0 ? 'done' : 'wait';
    } else if (status === 'rejected') {
      const at = rejectAt ?? 1;
      if (idx < at) s = 'done';
      else if (idx === at) {
        s = 'current';
        comment = '不符合规定，予以驳回';
      }
    } else if (status === 'approved') {
      s = 'done';
      time = `2026-09-0${idx + 1} 10:00`;
    } else {
      if (idx === 0) {
        s = 'done';
        time = '2026-09-01 09:12';
      } else if (idx === 1) {
        s = 'current';
      }
    }
    return { ...n, status: s, time, comment };
  });
}

let _tasks: WorkflowTask[] | null = null;
function getTasks(): WorkflowTask[] {
  if (_tasks) return _tasks;
  const statuses: WorkflowTask['status'][] = [
    'pending',
    'approved',
    'rejected',
    'pending',
    'withdrawn',
    'pending',
  ];
  const list: WorkflowTask[] = [];
  for (let i = 0; i < 18; i++) {
    const type = TYPES[i % TYPES.length];
    const status = statuses[i % statuses.length];
    const rejectAt = status === 'rejected' ? 1 + (i % 2) : undefined;
    list.push({
      id: 'WF' + String(1000 + i),
      type,
      title: TITLES[type] + ' #' + (1000 + i),
      applicant: APPLICANTS[i % APPLICANTS.length],
      amount: type === 'reimburse' ? 500 + i * 37 : undefined,
      status,
      currentNode:
        status === 'pending'
          ? '部门主管审批'
          : status === 'rejected'
            ? 'HR 审批'
            : status === 'approved'
              ? '已完成'
              : '已撤回',
      createdAt: `2026-09-0${(i % 9) + 1} 0${(i % 9) + 1}:30`,
      nodes: buildNodes(status, rejectAt),
    });
  }
  _tasks = list;
  return list;
}

export function workflowMock(mock: MockAdapter) {
  mock.onPost('/workflow/list').reply((config) => {
    const { tab = 'todo' } = config.data ? JSON.parse(config.data) : {};
    const all = getTasks();
    let list = all;
    if (tab === 'todo') list = all.filter((t) => t.status === 'pending');
    else if (tab === 'done')
      list = all.filter((t) => t.status === 'approved' || t.status === 'rejected');
    else if (tab === 'mine') list = all.filter((_, i) => i % 3 === 0);
    return [200, { code: 0, data: list, message: 'ok' }];
  });

  mock.onGet('/workflow/detail').reply((config) => {
    const id = config.params?.id;
    const task = getTasks().find((t) => t.id === id) ?? null;
    return [200, { code: 0, data: task, message: 'ok' }];
  });

  mock.onPost('/workflow/approve').reply((config) => {
    const { id } = JSON.parse(config.data || '{}');
    const task = getTasks().find((t) => t.id === id);
    if (task) task.status = 'approved';
    return [200, { code: 0, data: true, message: 'ok' }];
  });

  mock.onPost('/workflow/reject').reply((config) => {
    const { id } = JSON.parse(config.data || '{}');
    const task = getTasks().find((t) => t.id === id);
    if (task) task.status = 'rejected';
    return [200, { code: 0, data: true, message: 'ok' }];
  });
}
