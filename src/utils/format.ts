import { OrderStatus, ProductStatus, UserRole } from '../types';

export function formatCurrency(value: number) {
  return `¥${Number(value || 0).toFixed(2)}`;
}

export function formatProductStatus(status: ProductStatus) {
  return {
    draft: '草稿',
    active: '上架中',
    inactive: '已停用',
  }[status];
}

export function formatOrderStatus(status: OrderStatus) {
  return {
    pending: '待确认',
    confirmed: '已确认',
    shipped: '已发货',
    delivered: '已完成',
    cancelled: '已取消',
    refunded: '已退款',
  }[status];
}

export function formatRole(role: UserRole) {
  return {
    admin: '管理员',
    manager: '店长',
    staff: '店员',
  }[role];
}
