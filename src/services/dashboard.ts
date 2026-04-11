import { request } from '../utils/request';
import { DashboardSummary } from '../types';
import { API_BASE_URL } from '../constants';

export function getDashboardSummary(params?: { startDate?: string; endDate?: string }) {
  const query = params
    ? '?' + new URLSearchParams(params as Record<string, string>).toString()
    : '';
  return request<DashboardSummary>({
    url: `/dashboard/summary${query}`,
    baseUrl: API_BASE_URL,
  });
}
