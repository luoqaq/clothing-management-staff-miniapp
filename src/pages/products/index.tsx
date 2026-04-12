import { useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { Button, Image, Input, Picker, Text, View } from '@tarojs/components';
import { getProductByCode, getProductOptions, getProducts } from '../../services/products';
import { getDashboardSummary } from '../../services/dashboard';
import { DashboardSummary, Product, Supplier, User } from '../../types';
import { getCurrentUser, hasManagerAccess, requireAuth } from '../../utils/auth';
import { formatCurrency, formatProductStatus } from '../../utils/format';

export default function ProductsPage() {
  const [search, setSearch] = useState('');
  const [supplierId, setSupplierId] = useState<number | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productTotal, setProductTotal] = useState(0);
  const [user, setUser] = useState<User | undefined>(getCurrentUser() || undefined);
  const [summary, setSummary] = useState<DashboardSummary>({
    orderCount: 0,
    salesAmount: 0,
    cancelledCount: 0,
    pendingOrderCount: 0,
    lowStockCount: 0,
    totalProductCount: 0,
    latestOrders: [],
  });

  const doSearch = async (params?: { search?: string; supplierId?: number | null }) => {
    if (!requireAuth()) {
      return;
    }

    const currentSearch = params?.search !== undefined ? params.search : search;
    const currentSupplierId = params?.supplierId !== undefined ? params.supplierId : supplierId;

    try {
      const [productResult, summaryResult] = await Promise.all([
        getProducts({
          search: currentSearch,
          supplierId: currentSupplierId ?? undefined,
          page: 1,
          pageSize: 20,
        }),
        getDashboardSummary(),
      ]);
      setProducts(productResult.items);
      setProductTotal(productResult.total);
      setSummary(summaryResult);
      setUser(getCurrentUser() || undefined);
    } catch (error: any) {
      Taro.showToast({ title: error.message || '加载失败', icon: 'none' });
    }
  };

  const load = () => doSearch();

  useDidShow(() => {
    void load();
    if (hasManagerAccess(getCurrentUser())) {
      void (async () => {
        try {
          const options = await getProductOptions();
          setSuppliers(options.suppliers);
        } catch (error: any) {
          // 静默失败，不阻断主流程
        }
      })();
    }
  });

  const handleScan = async () => {
    if (!requireAuth()) {
      return;
    }

    try {
      const result = await Taro.scanCode({ scanType: ['barCode', 'qrCode'] });
      const code = result.result || '';
      if (!code) {
        Taro.showToast({ title: '未识别到标签码', icon: 'none' });
        return;
      }

      const scannedProduct = await getProductByCode(code);
      Taro.navigateTo({
        url: `/pages/product-detail/index?id=${scannedProduct.productId}&skuId=${scannedProduct.skuId}`,
      });
    } catch (error: any) {
      if (error?.errMsg?.includes('cancel')) {
        return;
      }
      Taro.showToast({ title: error.message || '扫码失败', icon: 'none' });
    }
  };

  return (
    <View className='page page--list'>
      <View className='page__header'>
        <View className='page__eyebrow'>Product Floor</View>
        <View className='page__title'>商品管理</View>
        <View className='page__subtitle'>按款号、库存和价格快速筛选，像在看门店陈列清单。</View>
      </View>

      <View style={{ padding: '0 22px 12px' }}>
        <Text style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          商品总数 <Text style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{productTotal}</Text>
        </Text>
      </View>

      <View className='toolbar'>
        <View className='field'>
          <Text className='field__label'>搜索商品</Text>
          <Input
            className='input'
            value={search}
            onInput={(e) => setSearch(e.detail.value)}
            onConfirm={() => void doSearch()}
            placeholder='名称 / 款号 / 供应商'
          />
        </View>
        {hasManagerAccess(user) ? (
          <View className='field'>
            <Text className='field__label'>供应商</Text>
            <Picker
              mode='selector'
              range={[{ name: '全部供应商' } as Supplier, ...suppliers]}
              rangeKey='name'
              onChange={(e) => {
                const index = Number(e.detail.value);
                const nextId = index === 0 ? null : (suppliers[index - 1]?.id ?? null);
                setSupplierId(nextId);
                void doSearch({ supplierId: nextId });
              }}
            >
              <View className='picker'>{suppliers.find((item) => item.id === supplierId)?.name || '全部供应商'}</View>
            </Picker>
          </View>
        ) : null}
        <View className='btn-row'>
          <Button className='button button--primary button--tiny' onClick={() => void doSearch()}>
            查询
          </Button>
          <Button className='button button--ghost button--tiny' onClick={() => void handleScan()}>
            扫码识别
          </Button>
          {hasManagerAccess(user) ? (
            <Button className='button button--ghost button--tiny' onClick={() => Taro.navigateTo({ url: '/pages/product-create/index' })}>
              新增商品
            </Button>
          ) : null}
        </View>
      </View>

      {products.length === 0 ? (
        <View className='empty-state'>
          <View className='empty-state__symbol'>货</View>
          <Text>暂无匹配商品</Text>
        </View>
      ) : (
        <View className='list'>
          {products.map((product) => (
            <View
              key={product.id}
              className='list-item'
              onClick={() => Taro.navigateTo({ url: `/pages/product-detail/index?id=${product.id}` })}
            >
              <View className='row row--start'>
                <View>
                  <View className='list-item__title'>{product.name}</View>
                  <View className='list-item__subtitle'>
                    {product.productCode} · {formatProductStatus(product.status)}
                  </View>
                </View>
                <Text className='list-item__price'>{formatCurrency(product.minPrice)} 起</Text>
              </View>
              {product.mainImages[0] ? <Image className='thumbnail section-gap' src={product.mainImages[0]} mode='aspectFill' /> : null}
              <View className='list-item__meta'>
                <Text>库存 {product.availableStock}</Text>
                <Text>{product.specCount} 个规格</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
