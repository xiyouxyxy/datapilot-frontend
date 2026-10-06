import { api } from '@/utils/request';
import type { AppMessage } from '@/types';

export const list = () => api.get<AppMessage[]>('/message/list');
export const read = (id: string) => api.post('/message/read', { id });
export const readAll = () => api.post('/message/readAll');
