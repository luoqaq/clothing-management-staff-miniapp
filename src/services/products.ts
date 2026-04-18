import { request } from '../utils/request';
import {
  CreateProductPayload,
  PaginatedData,
  Product,
  ProductFilters,
  ProductOptions,
  ScannedSkuProduct,
} from '../types';

function toQuery(params: ProductFilters = {}) {
  const value = Object.entries(params)
    .filter(([, item]) => item !== undefined && item !== null && item !== '')
    .map(([key, item]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(item))}`)
    .join('&');
  return value ? `?${value}` : '';
}

export function getProducts(params: ProductFilters = {}) {
  return request<PaginatedData<Product>>({
    url: `/products${toQuery(params)}`,
  });
}

export function getProduct(id: number) {
  return request<Product>({
    url: `/products/${id}`,
  });
}

export function checkProductCode(code: string, excludeId?: number) {
  const query = new URLSearchParams({
    code,
    ...(excludeId ? { excludeId: String(excludeId) } : {}),
  });

  return request<{ exists: boolean }>({
    url: `/products/check-code?${query.toString()}`,
  });
}

export function getProductByCode(code: string) {
  return request<ScannedSkuProduct>({
    url: `/products/by-code?code=${encodeURIComponent(code)}`,
  });
}

export function getProductOptions() {
  return request<ProductOptions>({
    url: '/product-options',
  });
}

export function createProduct(payload: CreateProductPayload) {
  return request<Product>({
    url: '/products',
    method: 'POST',
    data: payload,
  });
}

export function updateProductImages(
  id: number,
  payload: {
    mainImages?: string[];
    detailImages?: string[];
  }
) {
  return request<Product>({
    url: `/products/${id}/images`,
    method: 'PATCH',
    data: payload,
  });
}
