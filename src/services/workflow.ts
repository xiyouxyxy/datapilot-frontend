import { api } from '@/utils/request';
import type { WorkflowTask } from '@/types';

export const list = (tab: 'todo' | 'done' | 'mine') =>
  api.post<WorkflowTask[]>('/workflow/list', { tab });
export const detail = (id: string) =>
  api.get<WorkflowTask | null>('/workflow/detail', { params: { id } });
export const approve = (id: string) => api.post('/workflow/approve', { id });
export const reject = (id: string) => api.post('/workflow/reject', { id });
