import { request } from '../utils/request';
import { LoginPayload, LoginResponse, User } from '../types';

export function login(payload: LoginPayload) {
  return request<LoginResponse>({
    url: '/auth/login',
    method: 'POST',
    data: payload,
  });
}

export function getCurrentUser() {
  return request<User>({
    url: '/auth/me',
  });
}

export function logout() {
  return request<null>({
    url: '/auth/logout',
    method: 'POST',
  });
}
