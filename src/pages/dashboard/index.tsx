import { useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import { getDashboardSummary } from '../../services/dashboard';
import { DashboardSummary, User } from '../../types';
import { getCurrentUser, hasManagerAccess, requireAuth } from '../../utils/auth';
import { formatCurrency, formatOrderStatus } from '../../utils/format';

const emptySummary: DashboardSummary = {
  todayOrderCount: 0,
  pendingOrderCount: 0,
  lowStockCount: 0,
  totalProductCount: 0,
  latestOrders: [],
};

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary>(emptySummary);
  const [user, setUser] = useState<User | undefined>(getCurrentUser() || undefined);

  const load = async () => {
    if (!requireAuth()) {
      return;
    }

    try {
      const result = await getDashboardSummary();
      setSummary(result);
      setUser(getCurrentUser() || undefined);
    } catch (error: any) {
      Taro.showToast({ title: error.message || '加载失败', icon: 'none' });
    }
  };

  useDidShow(() => {
    void load();
  });

  return (
    <View className='page page--dashboard'>
      <View className='page__hero'>
        <View className='page__eyebrow'>Daily Brief</View>
        <View className='page__title page__title--light'>今日工作台</View>
        <View className='page__subtitle page__subtitle--light'>先看当日节奏，再进入商品、订单和补货动作。</View>
        <View className='page__meta'>
          <View className='page__meta-item'>待处理订单 {summary.pendingOrderCount}</View>
          <View className='page__meta-item'>低库存 SKU {summary.lowStockCount}</View>
        </View>
      </View>

      <View className='metric-grid'>
        <View className='metric-card metric-card--accent'>
          <View className='metric-card__label'>今日订单</View>
          <View className='metric-card__value'>{summary.todayOrderCount}</View>
          <View className='metric-card__note'>门店当日录入节奏</View>
        </View>
        <View className='metric-card'>
          <View className='metric-card__label'>待处理订单</View>
          <View className='metric-card__value'>{summary.pendingOrderCount}</View>
          <View className='metric-card__note'>优先确认与发货</View>
        </View>
        <View className='metric-card'>
          <View className='metric-card__label'>低库存 SKU</View>
          <View className='metric-card__value'>{summary.lowStockCount}</View>
          <View className='metric-card__note'>关注断码风险</View>
        </View>
        <View className='metric-card'>
          <View className='metric-card__label'>商品总数</View>
          <View className='metric-card__value'>{summary.totalProductCount}</View>
          <View className='metric-card__note'>在售与草稿统一管理</View>
        </View>
      </View>

      <View className='panel'>
        <View className='card__header'>
          <View>
            <View className='card__title'>快捷入口</View>
            <View className='section-desc'>把最常用的门店动作放在首屏。</View>
          </View>
        </View>
        <View className='quick-grid'>
          <View className='quick-link' onClick={() => Taro.switchTab({ url: '/pages/products/index' })}>
            <View className='quick-link__icon'>货</View>
            <View className='quick-link__title'>查商品</View>
            <View className='quick-link__desc'>查看库存与详情</View>
          </View>
          {hasManagerAccess(user) ? (
            <View className='quick-link' onClick={() => Taro.navigateTo({ url: '/pages/product-create/index' })}>
              <View className='quick-link__icon'>新</View>
              <View className='quick-link__title'>轻量上新</View>
              <View className='quick-link__desc'>直接录入新款</View>
            </View>
          ) : null}
          <View className='quick-link' onClick={() => Taro.navigateTo({ url: '/pages/order-create/index' })}>
            <View className='quick-link__icon'>单</View>
            <View className='quick-link__title'>门店录单</View>
            <View className='quick-link__desc'>购物车模式录单</View>
          </View>
          <View
            className='quick-link'
            onClick={() => Taro.navigateTo({ url: '/pages/order-create/index?mode=manual' })}
          >
            <View className='quick-link__icon'>选</View>
            <View className='quick-link__title'>选款录单</View>
            <View className='quick-link__desc'>浏览选择商品录单</View>
          </View>
          <View
            className='quick-link'
            onClick={() => Taro.navigateTo({ url: '/pages/scan-result/index' })}
          >
            <View className='quick-link__icon'>扫</View>
            <View className='quick-link__title'>扫码录单</View>
            <View className='quick-link__desc'>连续扫码快速成单</View>
          </View>
        </View>
      </View>

      <View className='panel'>
        <View className='card__header'>
          <View>
            <View className='card__title'>最近订单</View>
            <View className='section-desc'>最近流转中的订单会优先出现在这里。</View>
          </View>
        </View>
        {summary.latestOrders.length === 0 ? (
          <View className='empty-state'>
            <View className='empty-state__symbol'>单</View>
            <Text>暂无订单</Text>
          </View>
        ) : (
          <View className='list'>
            {summary.latestOrders.map((order) => (
              <View
                key={order.id}
                className='list-item'
                onClick={() => Taro.navigateTo({ url: `/pages/order-detail/index?id=${order.id}` })}
              >
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
    </View>
  );
}
