import { request } from '../utils/request';
import { CustomerAgeBucket } from '../types';

export function getAgeBuckets() {
  return request<CustomerAgeBucket[]>({
    url: '/customers/age-buckets',
  });
}
