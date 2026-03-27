import Taro from '@tarojs/taro';
import { clearCart, clearToken, clearUser, getToken, getUser } from './storage';
import { User } from '../types';

export function isAuthenticated() {
  return Boolean(getToken());
}

export function getCurrentUser() {
  return getUser();
}

export function hasManagerAccess(user?: User | null) {
  return user?.role === 'admin' || user?.role === 'manager';
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
  clearCart();
}
