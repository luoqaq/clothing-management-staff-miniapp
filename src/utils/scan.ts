import Taro from '@tarojs/taro';
import { SCAN_ITEMS_KEY } from '../constants';
import { ScannedSkuProduct } from '../types';

export interface ScannedItem extends ScannedSkuProduct {
  quantity: number;
}

export function getScannedItems(): ScannedItem[] {
  return Taro.getStorageSync<ScannedItem[]>(SCAN_ITEMS_KEY) || [];
}

export function setScannedItems(items: ScannedItem[]) {
  Taro.setStorageSync(SCAN_ITEMS_KEY, items);
}

export function clearScannedItems() {
  Taro.removeStorageSync(SCAN_ITEMS_KEY);
}

export function addScannedItem(item: ScannedItem) {
  const current = getScannedItems();
  const existing = current.find(i => i.skuId === item.skuId);

  if (existing) {
    // 已存在，增加数量
    const updated = current.map(i =>
      i.skuId === item.skuId
        ? { ...i, quantity: Math.min(i.quantity + item.quantity, i.availableStock) }
        : i
    );
    setScannedItems(updated);
  } else {
    // 新商品
    setScannedItems([...current, item]);
  }
}

export function removeScannedItem(skuId: number) {
  const current = getScannedItems();
  setScannedItems(current.filter(i => i.skuId !== skuId));
}

export function updateScannedItemQuantity(skuId: number, quantity: number) {
  const current = getScannedItems();
  const item = current.find(i => i.skuId === skuId);
  if (!item) return;

  const newQuantity = Math.max(1, Math.min(quantity, item.availableStock));
  setScannedItems(
    current.map(i => (i.skuId === skuId ? { ...i, quantity: newQuantity } : i))
  );
}
