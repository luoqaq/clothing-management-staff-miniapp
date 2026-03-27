import { ASSETS_BASE_URL } from '../constants';
import { request } from '../utils/request';
import { UploadPolicy } from '../types';

export function getUploadPolicy(payload: {
  biz: 'product';
  scene: 'main' | 'detail';
  fileName: string;
  contentType: string;
  size: number;
}) {
  return request<UploadPolicy>({
    url: '/upload-policy',
    method: 'POST',
    data: payload,
    baseUrl: ASSETS_BASE_URL,
  });
}
