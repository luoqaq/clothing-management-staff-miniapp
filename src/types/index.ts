export type UserRole = 'admin' | 'sales' | 'manager' | 'staff';
export type ProductStatus = 'draft' | 'active' | 'inactive';
export type ProductSpecificationStatus = 'active' | 'inactive';
export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
export type OrderSource = 'admin_web' | 'staff_miniapp';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  avatar?: string;
  role: UserRole;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export interface ProductCategory {
  id: number;
  name: string;
  code: string;
  parentId?: number | null;
}

export interface Supplier {
  id: number;
  name: string;
}

export interface ProductSpecification {
  id: number;
  productId: number;
  skuCode: string;
  barcode?: string | null;
  color: string;
  size: string;
  salePrice: number;
  costPrice?: number;
  stock: number;
  reservedStock: number;
  availableStock: number;
  status: ProductSpecificationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: number;
  productCode: string;
  name: string;
  description?: string | null;
  categoryId: number;
  supplierId?: number | null;
  category?: ProductCategory;
  supplier?: Supplier | null;
  mainImages: string[];
  detailImages: string[];
  tags: string[];
  status: ProductStatus;
  specifications: ProductSpecification[];
  specCount: number;
  totalStock: number;
  reservedStock: number;
  availableStock: number;
  minPrice: number;
  maxPrice: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductSpecificationPayload {
  skuCode?: string;
  barcode?: string | null;
  color: string;
  size: string;
  salePrice: number;
  costPrice: number;
  stock: number;
  reservedStock?: number;
  status?: ProductSpecificationStatus;
}

export interface CreateProductPayload {
  productCode: string;
  name: string;
  description?: string;
  categoryId: number;
  supplierId?: number | null;
  mainImages?: string[];
  detailImages?: string[];
  tags?: string[];
  status?: ProductStatus;
  specifications: ProductSpecificationPayload[];
}

export interface ProductFilters {
  search?: string;
  categoryId?: number;
  supplierId?: number;
  status?: ProductStatus;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  pageSize?: number;
}

export interface ProductOptions {
  categories: ProductCategory[];
  suppliers: Supplier[];
  productStatuses: ProductStatus[];
  specificationStatuses: ProductSpecificationStatus[];
}

export interface OrderItem {
  id: number;
  productId: number;
  skuId: number;
  productName: string;
  skuCode: string;
  image?: string | null;
  price: number;
  quantity: number;
  color?: string | null;
  size?: string | null;
}

export interface Order {
  id: number;
  orderNo: string;
  source: OrderSource;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  items: OrderItem[];
  totalAmount: number;
  discountAmount?: number;
  finalAmount: number;
  status: OrderStatus;
  address?: Record<string, unknown> | null;
  note?: string;
  paymentMethod?: string;
  paymentStatus: 'unpaid' | 'paid' | 'refunded';
  shippingCompany?: string | null;
  trackingNumber?: string | null;
  cancelReason?: string | null;
  refundReason?: string | null;
  shippedAt?: string;
  deliveredAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderPayload {
  customerName: string;
  customerPhone: string;
  note?: string;
  paymentMethod?: string;
  paymentStatus?: 'unpaid' | 'paid' | 'refunded';
  items: Array<{
    skuId: number;
    quantity: number;
  }>;
}

export interface DashboardSummary {
  todayOrderCount: number;
  pendingOrderCount: number;
  lowStockCount: number;
  totalProductCount: number;
  latestOrders: Order[];
}

export interface UploadPolicy {
  credentials: {
    tmpSecretId: string;
    tmpSecretKey: string;
    sessionToken: string;
  };
  startTime: number;
  expiredTime: number;
  bucket: string;
  region: string;
  key: string;
  url: string;
}

export interface CartItem {
  productId: number;
  skuId: number;
  productName: string;
  skuCode: string;
  image?: string | null;
  price: number;
  color?: string | null;
  size?: string | null;
  quantity: number;
  stock: number;
}
