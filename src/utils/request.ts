import Taro from '@tarojs/taro';
import { MOBILE_BASE_URL } from '../constants';
import { clearToken, getToken } from './storage';
import { ApiResponse } from '../types';

type RequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  url: string;
  method?: RequestMethod;
  data?: Record<string, unknown> | unknown[] | string | number | null;
  baseUrl?: string;
}

export async function request<T>({
  url,
  method = 'GET',
  data,
  baseUrl = MOBILE_BASE_URL,
}: RequestOptions): Promise<T> {
  const token = getToken();
  const response = await Taro.request<ApiResponse<T>>({
    url: `${baseUrl}${url}`,
    method,
    data,
    header: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (response.statusCode === 401) {
    clearToken();
    throw new Error('登录已失效，请重新登录');
  }

  if (response.statusCode >= 400 || !response.data.success) {
    throw new Error(response.data.message || '请求失败');
  }

  return response.data.data as T;
}
