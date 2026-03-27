import { useState } from 'react';
import Taro, { useDidShow, useLoad } from '@tarojs/taro';
import { Button, Input, Text, Textarea, View } from '@tarojs/components';
import { cancelOrder, getOrder, shipOrder, updateOrderStatus } from '../../services/orders';
import { Order } from '../../types';
import { requireAuth } from '../../utils/auth';
import { formatCurrency, formatOrderStatus } from '../../utils/format';

export default function OrderDetailPage() {
  const [id, setId] = useState(0);
  const [order, setOrder] = useState<Order | null>(null);
  const [shippingCompany, setShippingCompany] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [cancelReason, setCancelReason] = useState('');

  const load = async (nextId = id) => {
    if (!requireAuth() || !nextId) {
      return;
    }

    try {
      const result = await getOrder(nextId);
      setOrder(result);
    } catch (error: any) {
      Taro.showToast({ title: error.message || '加载失败', icon: 'none' });
    }
  };

  useLoad((params) => {
    const nextId = Number(params.id || 0);
    setId(nextId);
    void load(nextId);
  });

  useDidShow(() => {
    void load();
  });

  const act = async (runner: () => Promise<unknown>) => {
    try {
      await runner();
      Taro.showToast({ title: '操作成功', icon: 'success' });
      await load();
    } catch (error: any) {
      Taro.showToast({ title: error.message || '操作失败', icon: 'none' });
    }
  };

  if (!order) {
    return (
      <View className='page loading-state'>
        <View className='loading-state__panel'>订单信息加载中...</View>
      </View>
    );
  }

  return (
    <View className='page page--detail'>
      <View className='page__hero'>
        <View className='page__eyebrow'>Order Detail</View>
        <View className='page__title page__title--light'>订单详情</View>
        <View className='page__subtitle page__subtitle--light'>{order.orderNo}</View>
        <View className='page__meta'>
          <Text className='pill pill--dark'>{formatOrderStatus(order.status)}</Text>
          <View className='page__meta-item'>订单来源：{order.source === 'staff_miniapp' ? '员工小程序' : '后台'}</View>
        </View>
        <View className='summary-strip'>
          <View className='summary-chip'>{order.customerName}</View>
          <View className='summary-chip'>{order.customerPhone}</View>
          <View className='summary-chip'>{order.items.length} 件商品</View>
        </View>
      </View>

      <View className='panel'>
        <View className='card__header'>
          <View>
            <View className='card__title'>商品明细</View>
            <View className='section-desc'>逐项查看颜色、尺码和成交金额。</View>
          </View>
        </View>
        <View className='list'>
          {order.items.map((item) => (
            <View key={item.id} className='list-item list-item--compact'>
              <View className='row row--start'>
                <View>
                  <View className='list-item__title'>{item.productName}</View>
                  <View className='list-item__subtitle'>
                    {item.color} / {item.size} × {item.quantity}
                  </View>
                </View>
                <Text className='list-item__price'>{formatCurrency(item.price * item.quantity)}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View className='panel'>
        <View className='card__header'>
          <View>
            <View className='card__title'>订单操作</View>
            <View className='section-desc'>按当前状态推进确认、发货、完成或取消。</View>
          </View>
        </View>
        <View className='btn-row'>
          {order.status === 'pending' ? (
            <Button className='button button--dark button--tiny' onClick={() => void act(() => updateOrderStatus(order.id, 'confirmed'))}>
              确认订单
            </Button>
          ) : null}
          {order.status === 'shipped' ? (
            <Button className='button button--primary button--tiny' onClick={() => void act(() => updateOrderStatus(order.id, 'delivered'))}>
              标记完成
            </Button>
          ) : null}
        </View>

        {order.status === 'confirmed' ? (
          <View className='section-gap order-actions'>
            <View className='field'>
              <Text className='field__label'>物流公司</Text>
              <Input className='input' value={shippingCompany} onInput={(e) => setShippingCompany(e.detail.value)} />
            </View>
            <View className='field'>
              <Text className='field__label'>运单号</Text>
              <Input className='input' value={trackingNumber} onInput={(e) => setTrackingNumber(e.detail.value)} />
            </View>
            <Button className='button button--primary button--block' onClick={() => void act(() => shipOrder(order.id, trackingNumber, shippingCompany))}>
              发货
            </Button>
          </View>
        ) : null}

        {['pending', 'confirmed'].includes(order.status) ? (
          <View className='section-gap order-actions'>
            <Textarea className='textarea' value={cancelReason} onInput={(e) => setCancelReason(e.detail.value)} placeholder='取消原因' />
            <Button className='button button--danger button--block' onClick={() => void act(() => cancelOrder(order.id, cancelReason || '门店取消'))}>
              取消订单
            </Button>
          </View>
        ) : null}
      </View>
    </View>
  );
}
