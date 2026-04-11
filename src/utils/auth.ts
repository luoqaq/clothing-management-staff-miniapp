import Taro from '@tarojs/taro';
import { clearToken, clearUser, getToken, getUser } from './storage';
import { User } from '../types';

export function normalizeRole(role?: User['role'] | null) {
  return role === 'admin' ? 'admin' : 'sales';
}

export function isAuthenticated() {
  return Boolean(getToken());
}

export function getCurrentUser() {
  return getUser();
}

export function hasManagerAccess(user?: User | null) {
  return normalizeRole(user?.role) === 'admin';
}

export function requireAuth() {
  if (!isAuthenticated()) {
    Taro.reLaunch({ url: '/pages/login/index' });
    return false;
  }

  return true;
}

export function logoutLocally() {
  clearToken();
  clearUser();
}
