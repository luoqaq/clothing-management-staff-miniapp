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
    sales: '销售',
    manager: '销售',
    staff: '销售',
  }[role];
}

export function formatDateTime(dateString: string) {
  if (!dateString) {
    return '-';
  }
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return '-';
  }
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}-${day} ${hours}:${minutes}`;
}
