import Taro from '@tarojs/taro';
import { getCart, setCart } from './storage';
import { CartItem } from '../types';

export function addToCart(item: CartItem) {
  const current = getCart();
  const existing = current.find((entry) => entry.skuId === item.skuId);

  const next = existing
    ? current.map((entry) =>
        entry.skuId === item.skuId
          ? {
              ...entry,
              quantity: Math.min(entry.quantity + item.quantity, item.stock),
            }
          : entry
      )
    : [...current, item];

  setCart(next);
  Taro.showToast({ title: '已加入购物车', icon: 'success' });
}

export function updateCartQuantity(skuId: number, quantity: number) {
  const current = getCart();
  const next = current
    .map((entry) => (entry.skuId === skuId ? { ...entry, quantity: Math.max(1, Math.min(quantity, entry.stock)) } : entry))
    .filter((entry) => entry.quantity > 0);

  setCart(next);
  return next;
}

export function removeCartItem(skuId: number) {
  const next = getCart().filter((entry) => entry.skuId !== skuId);
  setCart(next);
  return next;
}
