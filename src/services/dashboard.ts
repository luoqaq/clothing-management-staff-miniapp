import { request } from '../utils/request';
import { DashboardSummary } from '../types';

export function getDashboardSummary() {
  return request<DashboardSummary>({
    url: '/dashboard/summary',
  });
}
