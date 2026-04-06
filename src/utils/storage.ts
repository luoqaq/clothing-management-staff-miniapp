import Taro from '@tarojs/taro';
import { CART_KEY, DIRECT_ORDER_KEY, TOKEN_KEY, USER_KEY } from '../constants';
import { CartItem, User } from '../types';

export function getToken() {
  return Taro.getStorageSync<string>(TOKEN_KEY) || '';
}

export function setToken(token: string) {
  Taro.setStorageSync(TOKEN_KEY, token);
}

export function clearToken() {
  Taro.removeStorageSync(TOKEN_KEY);
}

export function getUser() {
  return Taro.getStorageSync<User>(USER_KEY);
}

export function setUser(user: User) {
  Taro.setStorageSync(USER_KEY, user);
}

export function clearUser() {
  Taro.removeStorageSync(USER_KEY);
}

export function getCart() {
  return Taro.getStorageSync<CartItem[]>(CART_KEY) || [];
}

export function setCart(items: CartItem[]) {
  Taro.setStorageSync(CART_KEY, items);
}

export function clearCart() {
  Taro.removeStorageSync(CART_KEY);
}

export function getDirectOrderItem() {
  return Taro.getStorageSync<CartItem | null>(DIRECT_ORDER_KEY) || null;
}

export function setDirectOrderItem(item: CartItem) {
  Taro.setStorageSync(DIRECT_ORDER_KEY, item);
}

export function clearDirectOrderItem() {
  Taro.removeStorageSync(DIRECT_ORDER_KEY);
}
