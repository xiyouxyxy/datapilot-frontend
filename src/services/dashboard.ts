import { api } from '@/utils/request';
import type { DashboardSummary } from '@/types';

export const summary = (dept?: string) =>
  api.get<DashboardSummary>('/dashboard/summary', dept ? { params: { dept } } : undefined);
