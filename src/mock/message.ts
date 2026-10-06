import type MockAdapter from 'axios-mock-adapter';
import type { AppMessage } from '@/types';

const seed: AppMessage[] = [
  {
    id: 'm1',
    type: 'todo',
    title: '待办：报销申请 #1002',
    content: '财务 李姐 提交了一笔报销，待你审批',
    time: '2026-09-08 09:20',
    read: false,
  },
  {
    id: 'm2',
    type: 'notice',
    title: '系统通知：版本发布',
    content: 'DataPilot v2.3 已发布，新增看板联动能力',
    time: '2026-09-07 18:00',
    read: false,
  },
  {
    id: 'm3',
    type: 'system',
    title: '账号安全提醒',
    content: '你的账号于新设备登录，如非本人操作请修改密码',
    time: '2026-09-07 12:30',
    read: true,
  },
  {
    id: 'm4',
    type: 'todo',
    title: '待办：请假申请 #1005',
    content: '张伟 提交了请假申请，待你审批',
    time: '2026-09-06 15:10',
    read: true,
  },
];

export function messageMock(mock: MockAdapter) {
  mock.onGet('/message/list').reply(() => [200, { code: 0, data: seed, message: 'ok' }]);
  mock.onPost('/message/read').reply((config) => {
    const { id } = JSON.parse(config.data || '{}');
    const m = seed.find((x) => x.id === id);
    if (m) m.read = true;
    return [200, { code: 0, data: true, message: 'ok' }];
  });
  mock.onPost('/message/readAll').reply(() => {
    seed.forEach((m) => (m.read = true));
    return [200, { code: 0, data: true, message: 'ok' }];
  });
}

// 实时推送模拟（纯前端 setInterval，无需后端 SSE）
let _seq = 100;
export function genRealtimeMessage(): AppMessage {
  _seq++;
  const types = ['todo', 'notice', 'system'] as const;
  const t = types[_seq % 3];
  const pool: Record<(typeof types)[number], string[]> = {
    todo: ['新待办：出差申请待审批', '新待办：入职流程待处理'],
    notice: ['公告：季度复盘会将于周五召开', '公告：系统维护预告'],
    system: ['提醒：密码即将过期', '提醒：存储空间已使用 80%'],
  };
  return {
    id: 'rt' + _seq,
    type: t,
    title: pool[t][_seq % pool[t].length],
    content: '实时推送消息 #' + _seq,
    time: new Date().toLocaleString('zh-CN'),
    read: false,
  };
}
