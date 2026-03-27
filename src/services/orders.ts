import { request } from '../utils/request';
import { CreateOrderPayload, Order, OrderStatus, PaginatedData } from '../types';

function toQuery(params: Record<string, string | number | undefined>) {
  const value = Object.entries(params)
    .filter(([, item]) => item !== undefined && item !== '')
    .map(([key, item]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(item))}`)
    .join('&');
  return value ? `?${value}` : '';
}

export function getOrders(params: Record<string, string | number | undefined> = {}) {
  return request<PaginatedData<Order>>({
    url: `/orders${toQuery(params)}`,
  });
}

export function getOrder(id: number) {
  return request<Order>({
    url: `/orders/${id}`,
  });
}

export function createOrder(payload: CreateOrderPayload) {
  return request<Order>({
    url: '/orders',
    method: 'POST',
    data: {
      ...payload,
      paymentStatus: payload.paymentStatus || 'paid',
    },
  });
}

export function updateOrderStatus(id: number, status: OrderStatus) {
  return request<Order>({
    url: `/orders/${id}/status`,
    method: 'PATCH',
    data: { status },
  });
}

export function shipOrder(id: number, trackingNumber: string, shippingCompany: string) {
  return request<Order>({
    url: `/orders/${id}/ship`,
    method: 'POST',
    data: {
      trackingNumber,
      shippingCompany,
    },
  });
}

export function cancelOrder(id: number, reason: string) {
  return request<Order>({
    url: `/orders/${id}/cancel`,
    method: 'POST',
    data: { reason },
  });
}
