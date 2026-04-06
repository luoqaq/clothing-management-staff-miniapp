import { useRef, useState } from 'react';
import Taro, { useDidShow, useLoad } from '@tarojs/taro';
import { Button, Input, Picker, Text, Textarea, View } from '@tarojs/components';
import { getAgeBuckets } from '../../services/customers';
import { createOrder } from '../../services/orders';
import { CustomerAgeBucket } from '../../types';
import { requireAuth } from '../../utils/auth';
import { formatCurrency } from '../../utils/format';
import { clearCart, clearDirectOrderItem, getCart, getDirectOrderItem } from '../../utils/storage';
import { clearScannedItems, getScannedItems } from '../../utils/scan';

const paymentMethods = ['现金', '微信', '支付宝'];

type OrderMode = 'cart' | 'direct' | 'scan';

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
}

export default function OrderCreatePage() {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [ageBuckets, setAgeBuckets] = useState<CustomerAgeBucket[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<OrderMode>('cart');
  const modeRef = useRef<OrderMode>('cart');
  const [form, setForm] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    ageBucketId: null as number | null,
    note: '',
    paymentMethod: paymentMethods[0],
  });

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
    }));
  };

  const updateSoldPrice = (skuId: number, soldPrice: number) => {
    setItems((current) =>
      current.map((item) => (item.skuId === skuId ? { ...item, soldPrice } : item))
    );
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
      case 'cart':
      default:
        sourceItems = getCart();
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
      case 'cart':
      default:
        return '购物车';
    }
  };

  const getSubtitle = () => {
    switch (mode) {
      case 'direct':
        return '已带入扫码识别到的单个规格，确认客户信息后可直接成单。';
      case 'scan':
        return '已带入扫码列表中的商品，确认客户信息后可统一提交。';
      case 'cart':
      default:
        return '先确认客户与收款信息，再统一提交购物车中的商品。';
    }
  };

  useLoad((params) => {
    const currentMode = (params.mode as OrderMode) || 'cart';
    modeRef.current = currentMode;
    setMode(currentMode);
    if (requireAuth()) {
      loadItems(currentMode);
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
      case 'cart':
      default:
        clearCart();
        break;
    }
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
        items: items.map((item) => ({
          skuId: item.skuId,
          quantity: item.quantity,
          soldPrice: item.soldPrice,
        })),
      });
      
      clearSourceItems();
      
      Taro.showToast({ title: '订单已创建', icon: 'success' });
      Taro.redirectTo({ url: `/pages/order-detail/index?id=${order.id}` });
    } catch (error: any) {
      Taro.showToast({ title: error.message || '录单失败', icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className='page page--form'>
      <View className='page__header'>
        <View className='page__eyebrow'>Create Order · {getModeLabel()}</View>
        <View className='page__title'>门店录单</View>
        <View className='page__subtitle'>{getSubtitle()}</View>
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

      <View className='panel'>
        <View className='card__header'>
          <View>
            <View className='card__title'>商品清单</View>
            <View className='section-desc'>共 {items.length} 款商品，{items.reduce((sum, item) => sum + item.quantity, 0)} 件。</View>
          </View>
        </View>
        {items.length === 0 ? (
          <View className='empty-state'>
            <View className='empty-state__symbol'>单</View>
            <Text>暂无商品</Text>
          </View>
        ) : (
          <View className='list'>
            {items.map((item) => (
              <View key={item.skuId} className='list-item list-item--compact'>
                <View className='row row--start'>
                  <View>
                    <View className='list-item__title'>{item.productName}</View>
                    <View className='list-item__subtitle'>
                      {item.color} / {item.size} × {item.quantity}
                    </View>
                  </View>
                  <View className='row' style={{ flexDirection: 'column', alignItems: 'flex-end' }}>
                    <View className='row' style={{ alignItems: 'center', marginBottom: '8rpx' }}>
                      <Text style={{ fontSize: '24rpx', color: '#999', marginRight: '12rpx' }}>原价 ¥{item.price}</Text>
                    </View>
                    <View className='row' style={{ alignItems: 'center' }}>
                      <Text style={{ fontSize: '24rpx', marginRight: '12rpx' }}>售出价</Text>
                      <Input
                        type='digit'
                        style={{ width: '120rpx', textAlign: 'right', borderBottom: '1rpx solid #ddd' }}
                        value={String(item.soldPrice)}
                        onInput={(e) => {
                          const value = parseFloat(e.detail.value);
                          updateSoldPrice(item.skuId, isNaN(value) ? 0 : value);
                        }}
                      />
                    </View>
                    <Text className='list-item__price' style={{ marginTop: '8rpx' }}>
                      {formatCurrency(item.soldPrice * item.quantity)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
        <View className='divider' />
        <View className='row'>
          <Text>合计</Text>
          <Text>{formatCurrency(totalAmount)}</Text>
        </View>
      </View>

      <Button className='button button--primary button--block' loading={submitting} onClick={submit}>
        提交订单
      </Button>
    </View>
  );
}
