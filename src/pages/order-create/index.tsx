import { useRef, useState } from 'react';
import Taro, { useDidShow, useLoad } from '@tarojs/taro';
import { Button, Image, Input, Picker, ScrollView, Text, Textarea, View } from '@tarojs/components';
import { getAgeBuckets } from '../../services/customers';
import { createOrder } from '../../services/orders';
import { getProductByCode, getProducts } from '../../services/products';
import { CustomerAgeBucket, Product, ProductSpecification } from '../../types';
import { requireAuth } from '../../utils/auth';
import { formatCurrency } from '../../utils/format';
import { clearDirectOrderItem, getDirectOrderItem, setDirectOrderItem } from '../../utils/storage';
import { clearScannedItems, getScannedItems, setScannedItems } from '../../utils/scan';

const paymentMethods = ['现金', '微信', '支付宝'];

type OrderMode = 'direct' | 'scan' | 'manual';

interface OrderItem {
  skuId: number;
  productId: number;
  productName: string;
  skuCode: string;
  image?: string | null;
  price: number;
  soldPrice: number;
  color?: string | null;
  size?: string | null;
  quantity: number;
  stock?: number;
  quantityDraft?: string;
}

export default function OrderCreatePage() {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [ageBuckets, setAgeBuckets] = useState<CustomerAgeBucket[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<OrderMode>('manual');
  const modeRef = useRef<OrderMode>('manual');
  const [form, setForm] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    ageBucketId: null as number | null,
    note: '',
    paymentMethod: paymentMethods[0],
  });

  const [showProductSelector, setShowProductSelector] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSpec, setSelectedSpec] = useState<ProductSpecification | null>(null);
  const [selectQuantity, setSelectQuantity] = useState<number | string>(1);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [scanning, setScanning] = useState(false);

  const syncItemsToSource = (nextItems: OrderItem[]) => {
    switch (modeRef.current) {
      case 'direct':
        if (nextItems[0]) {
          setDirectOrderItem({
            skuId: nextItems[0].skuId,
            productId: nextItems[0].productId,
            productName: nextItems[0].productName,
            skuCode: nextItems[0].skuCode,
            image: nextItems[0].image ?? null,
            price: nextItems[0].price,
            soldPrice: nextItems[0].soldPrice,
            color: nextItems[0].color ?? null,
            size: nextItems[0].size ?? null,
            quantity: nextItems[0].quantity,
            stock: nextItems[0].stock ?? nextItems[0].quantity,
          });
        }
        break;
      case 'scan':
        setScannedItems(nextItems.map((item) => {
          const { quantityDraft: _, ...rest } = item;
          return {
            skuId: rest.skuId,
            productId: rest.productId,
            productName: rest.productName,
            skuCode: rest.skuCode,
            image: rest.image ?? null,
            salePrice: rest.price,
            color: rest.color ?? null,
            size: rest.size ?? null,
            quantity: rest.quantity,
            barcode: '',
            productCode: '',
            stock: rest.stock ?? rest.quantity,
            reservedStock: 0,
            availableStock: rest.stock ?? rest.quantity,
            status: 'active',
            productStatus: 'active',
          };
        }));
        break;
      default:
        break;
    }
  };

  const setItemsWithSourceSync = (updater: OrderItem[] | ((current: OrderItem[]) => OrderItem[])) => {
    setItems((current) => {
      const nextItems = typeof updater === 'function' ? updater(current) : updater;
      syncItemsToSource(nextItems);
      return nextItems;
    });
  };

  const upsertOrderItem = (newItem: OrderItem, existingIncrement = 1) => {
    setItemsWithSourceSync((current) => {
      const existing = current.find((item) => item.skuId === newItem.skuId);
      if (existing) {
        const nextQuantity = Math.min(
          existing.quantity + existingIncrement,
          newItem.stock ?? existing.stock ?? existing.quantity + newItem.quantity
        );
        return current.map((item) =>
          item.skuId === newItem.skuId
            ? {
                ...item,
                ...newItem,
                quantity: nextQuantity,
                soldPrice: item.soldPrice ?? newItem.soldPrice,
              }
            : item
        );
      }
      return [...current, newItem];
    });
  };

  const searchProducts = async () => {
    setLoadingProducts(true);
    try {
      const result = await getProducts({
        search: productSearch,
        page: 1,
        pageSize: 20,
      });
      setProducts(result.items);
    } catch (error: any) {
      Taro.showToast({ title: error.message || '加载商品失败', icon: 'none' });
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    if (product.specifications.length > 0) {
      setSelectedSpec(product.specifications[0]);
    }
  };

  const handleAddProduct = () => {
    if (!selectedProduct || !selectedSpec) {
      Taro.showToast({ title: '请选择商品规格', icon: 'none' });
      return;
    }

    const newItem: OrderItem = {
      skuId: selectedSpec.id,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      skuCode: selectedSpec.skuCode,
      image: selectedSpec.image || selectedProduct.mainImages[0] || null,
      price: selectedSpec.salePrice,
      soldPrice: selectedSpec.salePrice,
      color: selectedSpec.color,
      size: selectedSpec.size,
      quantity: selectQuantity,
      stock: selectedSpec.availableStock,
    };

    upsertOrderItem(newItem);

    setShowProductSelector(false);
    setSelectedProduct(null);
    setSelectedSpec(null);
    setSelectQuantity(1);
    setProductSearch('');
    setProducts([]);
    Taro.showToast({ title: '已添加商品', icon: 'success' });
  };

  const closeSelector = () => {
    setShowProductSelector(false);
    setSelectedProduct(null);
    setSelectedSpec(null);
    setSelectQuantity(1);
    setProductSearch('');
    setProducts([]);
  };

  const convertToOrderItems = (sourceItems: any[]): OrderItem[] => {
    return sourceItems.map((item) => ({
      skuId: item.skuId,
      productId: item.productId,
      productName: item.productName,
      skuCode: item.skuCode,
      image: item.image ?? null,
      price: item.price ?? item.salePrice ?? 0,
      soldPrice: item.soldPrice ?? item.price ?? item.salePrice ?? 0,
      color: item.color ?? null,
      size: item.size ?? null,
      quantity: item.quantity,
      stock: item.stock ?? item.availableStock,
    }));
  };

  const updateSoldPrice = (skuId: number, soldPrice: number) => {
    setItemsWithSourceSync((current) =>
      current.map((item) => (item.skuId === skuId ? { ...item, soldPrice } : item))
    );
  };

  const updateItemQuantity = (skuId: number, rawValue: string) => {
    const value = rawValue.replace(/[^\d]/g, '');
    const num = value === '' ? 0 : parseInt(value, 10);
    setItemsWithSourceSync((current) =>
      current.map((item) => {
        if (item.skuId !== skuId) {
          return item;
        }
        const limit = item.stock ?? Infinity;
        return {
          ...item,
          quantity: num === 0 ? item.quantity : Math.max(1, Math.min(num, limit)),
          quantityDraft: value,
        };
      })
    );
  };

  const finalizeItemQuantity = (skuId: number) => {
    setItemsWithSourceSync((current) =>
      current.map((item) => {
        if (item.skuId !== skuId || item.quantityDraft === undefined) {
          return item;
        }
        const limit = item.stock ?? Infinity;
        const num = parseInt(item.quantityDraft || '1', 10);
        return {
          ...item,
          quantity: Math.max(1, Math.min(num, limit)),
          quantityDraft: undefined,
        };
      })
    );
  };

  const handleScanAddProduct = async () => {
    if (scanning) {
      return;
    }

    try {
      setScanning(true);
      const result = await Taro.scanCode({ scanType: ['barCode', 'qrCode'] });
      const code = result.result || '';
      if (!code) {
        Taro.showToast({ title: '未识别到标签码', icon: 'none' });
        return;
      }

      const scannedProduct = await getProductByCode(code);
      upsertOrderItem({
        skuId: scannedProduct.skuId,
        productId: scannedProduct.productId,
        productName: scannedProduct.productName,
        skuCode: scannedProduct.skuCode,
        image: scannedProduct.image ?? null,
        price: scannedProduct.salePrice,
        soldPrice: scannedProduct.salePrice,
        color: scannedProduct.color,
        size: scannedProduct.size,
        quantity: 1,
        stock: scannedProduct.availableStock,
      });
      Taro.showToast({ title: '已扫码添加商品', icon: 'success' });
    } catch (error: any) {
      if (error?.errMsg?.includes('cancel')) {
        return;
      }
      Taro.showToast({ title: error.message || '扫码失败', icon: 'none' });
    } finally {
      setScanning(false);
    }
  };

  const loadItems = (currentMode: OrderMode) => {
    let sourceItems: any[] = [];
    
    switch (currentMode) {
      case 'direct':
        const directItem = getDirectOrderItem();
        sourceItems = directItem ? [directItem] : [];
        break;
      case 'scan':
        sourceItems = getScannedItems();
        break;
      default:
        sourceItems = [];
        break;
    }
    
    setItems(convertToOrderItems(sourceItems));
  };

  const getModeLabel = () => {
    switch (mode) {
      case 'direct':
        return '单品直购';
      case 'scan':
        return '扫码录单';
      case 'manual':
        return '手动录单';
      default:
        return '手动录单';
    }
  };

  const getSubtitle = () => {
    switch (mode) {
      case 'direct':
        return '已带入扫码识别到的单个规格，确认客户信息后可直接成单。';
      case 'scan':
        return '已带入扫码列表中的商品，确认客户信息后可统一提交。';
      case 'manual':
        return '手动选择商品添加到订单，确认客户信息后提交。';
      default:
        return '手动选择商品添加到订单，确认客户信息后提交。';
    }
  };

  useLoad((params) => {
    const currentMode = (params.mode as OrderMode) || 'manual';
    modeRef.current = currentMode;
    setMode(currentMode);
    if (requireAuth()) {
      if (currentMode !== 'manual') {
        loadItems(currentMode);
      }
    }
  });

  useDidShow(() => {
    if (!requireAuth()) {
      return;
    }
    loadItems(modeRef.current);
    void (async () => {
      try {
        const result = await getAgeBuckets();
        setAgeBuckets(result);
      } catch (error: any) {
        Taro.showToast({ title: error.message || '加载年龄段失败', icon: 'none' });
      }
    })();
  });

  const totalAmount = items.reduce((sum, item) => sum + item.soldPrice * item.quantity, 0);

  const clearSourceItems = () => {
    switch (mode) {
      case 'direct':
        clearDirectOrderItem();
        break;
      case 'scan':
        clearScannedItems();
        break;
      default:
        break;
    }
  };

  const removeItem = (skuId: number) => {
    setItemsWithSourceSync((current) => current.filter((item) => item.skuId !== skuId));
  };

  const submit = async () => {
    if (!items.length) {
      Taro.showToast({ title: '商品列表为空', icon: 'none' });
      return;
    }

    if (form.customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.customerEmail)) {
      Taro.showToast({ title: '邮箱格式不正确', icon: 'none' });
      return;
    }

    try {
      setSubmitting(true);
      const order = await createOrder({
        customerName: form.customerName,
        customerPhone: form.customerPhone,
        customerEmail: form.customerEmail || undefined,
        ageBucketId: form.ageBucketId,
        note: form.note,
        paymentMethod: form.paymentMethod,
        status: 'confirmed',
        items: items.map((item) => ({
          skuId: item.skuId,
          quantity: item.quantity,
          soldPrice: item.soldPrice,
        })),
      });
      
      clearSourceItems();
      
      Taro.showToast({ title: '订单已创建', icon: 'success' });
      Taro.switchTab({ url: '/pages/orders/index' });
    } catch (error: any) {
      Taro.showToast({ title: error.message || '录单失败', icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  };

  const navigateToProductDetail = (productId: number, skuId: number) => {
    Taro.navigateTo({ url: `/pages/product-detail/index?id=${productId}&skuId=${skuId}` });
  };

  return (
    <View className='page page--form page--with-fixed-footer'>
      <View className='page__header'>
        <View className='page__eyebrow'>Create Order · {getModeLabel()}</View>
        <View className='page__title'>门店录单</View>
        <View className='page__subtitle'>{getSubtitle()}</View>
      </View>
      
      <View className='panel'>
        <View className='card__header'>
          <View>
            <View className='card__title'>商品清单</View>
            <View className='section-desc'>共 {items.length} 款商品，{items.reduce((sum, item) => sum + item.quantity, 0)} 件。</View>
          </View>
          <View className='btn-row'>
            <Button className='button button--ghost button--tiny' loading={scanning} onClick={() => void handleScanAddProduct()}>
              扫码添加
            </Button>
            <Button className='button button--ghost button--tiny' onClick={() => setShowProductSelector(true)}>
              + 添加商品
            </Button>
          </View>
        </View>
        {items.length === 0 ? (
          <View className='empty-state'>
            <View className='empty-state__symbol'>单</View>
            <Text>暂无商品</Text>
            <View className='caption section-gap'>可通过上方“扫码添加”或“+ 添加商品”补充清单</View>
          </View>
        ) : (
          <View className='list'>
            {items.map((item) => (
              <View key={item.skuId} className='list-item list-item--compact'>
                <View className='order-item-card'>
                  <View className='order-item-card__main'>
                    <View className='order-item-card__media'>
                      {item.image ? (
                        <Image
                          className='thumbnail thumbnail--small'
                          src={item.image}
                          mode='aspectFill'
                          onClick={() => navigateToProductDetail(item.productId, item.skuId)}
                        />
                      ) : (
                        <View
                          className='thumbnail thumbnail--small thumbnail--placeholder'
                          onClick={() => navigateToProductDetail(item.productId, item.skuId)}
                        />
                      )}
                    </View>
                    <View className='order-item-card__content'>
                      <View
                        className='list-item__title order-item-card__title'
                        onClick={() => navigateToProductDetail(item.productId, item.skuId)}
                      >
                        {item.productName}
                      </View>
                      <View className='list-item__subtitle'>
                        {item.color} / {item.size}
                      </View>
                      <View className='list-item__subtitle' style={{ marginTop: '4rpx' }}>
                        <Text style={{ color: '#999' }}>原价 {formatCurrency(item.price)}</Text>
                      </View>
                    </View>
                  </View>
                  <View className='order-item-card__side'>
                    <View className='row' style={{ alignItems: 'center', justifyContent: 'flex-end' }}>
                      <Text style={{ fontSize: '24rpx', marginRight: '12rpx' }}>售出价</Text>
                      <Input
                        type='digit'
                        style={{ width: '120rpx', textAlign: 'right', borderBottom: '1rpx solid #ddd' }}
                        value={String(item.soldPrice)}
                        onClick={(e) => e.stopPropagation()}
                        onInput={(e) => {
                          const value = parseFloat(e.detail.value);
                          updateSoldPrice(item.skuId, isNaN(value) ? 0 : value);
                        }}
                      />
                    </View>
                    <View className='row' style={{ alignItems: 'center', justifyContent: 'flex-end', marginTop: '8rpx' }}>
                      <Text className='list-item__price' style={{ marginRight: '16rpx' }}>
                        {formatCurrency(item.soldPrice * item.quantity)}
                      </Text>
                      <Text
                        style={{ fontSize: '24rpx', color: '#ff4d4f' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          removeItem(item.skuId);
                        }}
                      >
                        删除
                      </Text>
                    </View>
                    <View className='quantity-control order-item-card__quantity'>
                      <Button
                        className='button button--tiny button--ghost'
                        onClick={(e) => {
                          e.stopPropagation();
                          updateItemQuantity(item.skuId, item.quantity - 1);
                        }}
                        disabled={item.quantity <= 1}
                      >
                        -
                      </Button>
                      <Input
                        className='input input--qty'
                        type='number'
                        value={item.quantityDraft !== undefined ? item.quantityDraft : String(item.quantity)}
                        onClick={(e) => e.stopPropagation()}
                        onInput={(e) => updateItemQuantity(item.skuId, e.detail.value)}
                        onBlur={() => finalizeItemQuantity(item.skuId)}
                      />
                      <Button
                        className='button button--tiny button--ghost'
                        onClick={(e) => {
                          e.stopPropagation();
                          updateItemQuantity(item.skuId, item.quantity + 1);
                        }}
                        disabled={item.stock !== undefined && item.quantity >= item.stock}
                      >
                        +
                      </Button>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
        <View className='divider' />
        <View className='row'>
          <Text style={{ fontSize: '28rpx', color: 'var(--text-secondary)' }}>合计</Text>
          <Text style={{ fontSize: '44rpx', fontWeight: '700', color: 'var(--text-primary)' }}>
            {formatCurrency(totalAmount)}
          </Text>
        </View>
      </View>

      <View className='panel'>
        <View className='card__header'>
          <View>
            <View className='card__title'>基础信息</View>
            <View className='section-desc'>录入客户与收款方式，便于后续状态流转。</View>
          </View>
        </View>
        <View className='field'>
          <Text className='field__label'>客户姓名</Text>
          <Input className='input' value={form.customerName} onInput={(e) => setForm({ ...form, customerName: e.detail.value })} />
        </View>
        <View className='field'>
          <Text className='field__label'>客户手机</Text>
          <Input className='input' value={form.customerPhone} type='number' onInput={(e) => setForm({ ...form, customerPhone: e.detail.value })} />
        </View>
        <View className='field'>
          <Text className='field__label'>客户邮箱</Text>
          <Input
            className='input'
            value={form.customerEmail}
            type='text'
            onInput={(e) => setForm({ ...form, customerEmail: e.detail.value.trim() })}
            placeholder='可选，已支付订单会同步到客户档案'
          />
        </View>
        <View className='field'>
          <Text className='field__label'>年龄段</Text>
          <Picker
            mode='selector'
            range={ageBuckets}
            rangeKey='name'
            onChange={(e) => {
              const selected = ageBuckets[Number(e.detail.value)] || null;
              setForm({ ...form, ageBucketId: selected?.id || null });
            }}
          >
            <View className='picker'>{ageBuckets.find((item) => item.id === form.ageBucketId)?.name || '可不选'}</View>
          </Picker>
        </View>
        <View className='field'>
          <Text className='field__label'>收款方式</Text>
          <Picker
            mode='selector'
            range={paymentMethods}
            onChange={(e) => setForm({ ...form, paymentMethod: paymentMethods[Number(e.detail.value)] })}
          >
            <View className='picker'>{form.paymentMethod}</View>
          </Picker>
        </View>
        <View className='field'>
          <Text className='field__label'>备注</Text>
          <Textarea className='textarea' value={form.note} onInput={(e) => setForm({ ...form, note: e.detail.value })} />
        </View>
      </View>

      <View className='fixed-action-bar'>
        <Button className='button button--primary button--block' loading={submitting} onClick={submit}>
          提交订单
        </Button>
      </View>

      {showProductSelector && (
        <View className='modal-overlay' onClick={closeSelector}>
          <View className='modal-panel' onClick={(e) => e.stopPropagation()}>
            <View className='modal-header'>
              <View>
                <View className='modal-title'>选择商品</View>
                <View className='modal-subtitle'>搜索并选择要添加的商品规格</View>
              </View>
              <Text className='modal-close' onClick={closeSelector}>✕</Text>
            </View>

            {!selectedProduct ? (
              <>
                <View className='field'>
                  <Input
                    className='input'
                    value={productSearch}
                    onInput={(e) => setProductSearch(e.detail.value)}
                    placeholder='搜索商品名称、款号或供应商'
                    onConfirm={() => searchProducts()}
                  />
                  <Button
                    className='button button--primary button--tiny section-gap'
                    loading={loadingProducts}
                    onClick={searchProducts}
                  >
                    搜索
                  </Button>
                </View>

                <ScrollView scrollY style={{ maxHeight: '600rpx' }}>
                  {products.length === 0 ? (
                    <View className='empty-state'>
                      <View className='empty-state__symbol'>搜</View>
                      <Text>{loadingProducts ? '搜索中...' : '请输入关键词搜索商品'}</Text>
                    </View>
                  ) : (
                    <View className='list'>
                      {products.map((product) => (
                        <View
                          key={product.id}
                          className='list-item'
                          onClick={() => handleSelectProduct(product)}
                        >
                          <View className='row row--start'>
                            {product.mainImages[0] ? (
                              <Image
                                className='thumbnail'
                                src={product.mainImages[0]}
                                mode='aspectFill'
                                style={{ width: '100rpx', height: '100rpx', marginRight: '16rpx' }}
                              />
                            ) : null}
                            <View>
                              <View className='list-item__title'>{product.name}</View>
                              <View className='list-item__subtitle'>
                                {product.productCode} · {product.specCount} 个规格
                              </View>
                              <Text className='list-item__price'>{formatCurrency(product.minPrice)} 起</Text>
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </ScrollView>
              </>
            ) : (
              <>
                <View className='panel panel--light section-gap'>
                  <View className='row row--start'>
                    {selectedProduct.mainImages[0] ? (
                      <Image
                        className='thumbnail'
                        src={selectedProduct.mainImages[0]}
                        mode='aspectFill'
                        style={{ width: '120rpx', height: '120rpx', marginRight: '16rpx' }}
                      />
                    ) : null}
                    <View>
                      <View className='list-item__title'>{selectedProduct.name}</View>
                      <View className='list-item__subtitle'>{selectedProduct.productCode}</View>
                      <Text
                        className='link'
                        onClick={() => {
                          setSelectedProduct(null);
                          setSelectedSpec(null);
                        }}
                      >
                        ← 重新选择
                      </Text>
                    </View>
                  </View>
                </View>

                <View className='section-gap'>
                  <View className='field__label'>选择规格</View>
                  <View className='stack' style={{ marginTop: '16rpx' }}>
                    {selectedProduct.specifications.map((spec) => (
                      <View
                        key={spec.id}
                        className={`detail-option ${selectedSpec?.id === spec.id ? 'detail-option--selected' : ''}`}
                        onClick={() => setSelectedSpec(spec)}
                      >
                        <View className='row row--start'>
                          {spec.image ? (
                            <Image
                              className='thumbnail thumbnail--tiny'
                              src={spec.image}
                              mode='aspectFill'
                              style={{ marginRight: '16rpx' }}
                            />
                          ) : (
                            <View
                              className='thumbnail thumbnail--tiny thumbnail--placeholder'
                              style={{ marginRight: '16rpx' }}
                            />
                          )}
                          <View style={{ flex: 1 }}>
                            <View className='row row--start'>
                              <Text>{spec.color} / {spec.size}</Text>
                              <Text className={selectedSpec?.id === spec.id ? 'success' : 'muted'}>
                                原价 {formatCurrency(spec.salePrice)}
                              </Text>
                            </View>
                            <View className='list-item__meta'>
                              <Text>可用库存 {spec.availableStock}</Text>
                              <Text>{spec.skuCode}</Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>

                <View className='field section-gap'>
                  <Text className='field__label'>数量</Text>
                  <Input
                    className='input'
                    type='number'
                    value={String(selectQuantity)}
                    onInput={(e) => {
                      const val = e.detail.value.replace(/[^\d]/g, '');
                      setSelectQuantity(val === '' ? '' : parseInt(val, 10));
                    }}
                    onBlur={() => {
                      const num = typeof selectQuantity === 'string' ? parseInt(selectQuantity || '1', 10) : selectQuantity;
                      setSelectQuantity(Math.max(1, num));
                    }}
                  />
                </View>

                <Button
                  className='button button--primary button--block section-gap'
                  onClick={handleAddProduct}
                  disabled={!selectedSpec}
                >
                  确认添加
                </Button>
              </>
            )}
          </View>
        </View>
      )}
    </View>
  );
}
