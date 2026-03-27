import { useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { Button, Picker, Text, View } from '@tarojs/components';
import { getOrders } from '../../services/orders';
import { Order, OrderStatus } from '../../types';
import { requireAuth } from '../../utils/auth';
import { formatCurrency, formatOrderStatus } from '../../utils/format';

const orderStatuses: Array<{ label: string; value: '' | OrderStatus }> = [
  { label: '全部', value: '' },
  { label: '待确认', value: 'pending' },
  { label: '已确认', value: 'confirmed' },
  { label: '已发货', value: 'shipped' },
  { label: '已完成', value: 'delivered' },
  { label: '已取消', value: 'cancelled' },
];

export default function OrdersPage() {
  const [status, setStatus] = useState<'' | OrderStatus>('');
  const [orders, setOrders] = useState<Order[]>([]);

  const load = async (nextStatus = status) => {
    if (!requireAuth()) {
      return;
    }

    try {
      const result = await getOrders({
        page: 1,
        pageSize: 20,
        source: 'staff_miniapp',
        status: nextStatus,
      });
      setOrders(result.items);
    } catch (error: any) {
      Taro.showToast({ title: error.message || '加载订单失败', icon: 'none' });
    }
  };

  useDidShow(() => {
    void load();
  });

  return (
    <View className='page page--list'>
      <View className='page__header'>
        <View className='page__eyebrow'>Order Flow</View>
        <View className='page__title'>门店订单</View>
        <View className='page__subtitle'>聚焦状态流转与金额，优先处理待确认和待发货订单。</View>
      </View>

      <View className='toolbar'>
        <Picker
          mode='selector'
          range={orderStatuses}
          rangeKey='label'
          onChange={(e) => {
            const nextStatus = orderStatuses[Number(e.detail.value)]?.value || '';
            setStatus(nextStatus);
            void load(nextStatus);
          }}
        >
          <View className='picker'>状态筛选：{orderStatuses.find((item) => item.value === status)?.label || '全部'}</View>
        </Picker>
        <Button className='button button--dark button--tiny section-gap' onClick={() => Taro.navigateTo({ url: '/pages/order-create/index' })}>
          新建订单
        </Button>
      </View>

      {orders.length === 0 ? (
        <View className='empty-state'>
          <View className='empty-state__symbol'>单</View>
          <Text>当前筛选下暂无订单</Text>
        </View>
      ) : (
        <View className='list'>
          {orders.map((order) => (
            <View key={order.id} className='list-item' onClick={() => Taro.navigateTo({ url: `/pages/order-detail/index?id=${order.id}` })}>
              <View className='row row--start'>
                <View>
                  <View className='list-item__title'>{order.orderNo}</View>
                  <View className='list-item__subtitle'>
                    {order.customerName} · {order.customerPhone}
                  </View>
                </View>
                <Text className='pill'>{formatOrderStatus(order.status)}</Text>
              </View>
              <View className='list-item__meta'>
                <Text>{order.items.length} 件商品</Text>
                <Text>{formatCurrency(order.finalAmount)}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
