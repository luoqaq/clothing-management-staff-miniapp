import { useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { Button, Image, Picker, Text, View } from '@tarojs/components';
import { getOrders } from '../../services/orders';
import { getDashboardSummary } from '../../services/dashboard';
import { DashboardSummary, Order, OrderStatus } from '../../types';
import { requireAuth } from '../../utils/auth';
import { formatCurrency, formatDateTime, formatOrderStatus } from '../../utils/format';

const orderStatuses: Array<{ label: string; value: '' | OrderStatus }> = [
  { label: '全部', value: '' },
  { label: '已确认', value: 'confirmed' },
  { label: '已取消', value: 'cancelled' },
];

type TimeTab = 'today' | 'week' | 'month' | 'all' | 'custom';

const timeTabs: Array<{ key: TimeTab; label: string }> = [
  { key: 'today', label: '今日' },
  { key: 'week', label: '本周' },
  { key: 'month', label: '本月' },
  { key: 'all', label: '全部' },
  { key: 'custom', label: '自定义' },
];

const PAGE_SIZE = 20;

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDateRangeByTab(tab: TimeTab, customStartDate?: string, customEndDate?: string): { startDate?: string; endDate?: string } {
  const now = new Date();
  const todayStr = formatDate(now);
  switch (tab) {
    case 'today':
      return { startDate: todayStr, endDate: todayStr };
    case 'week': {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now.getFullYear(), now.getMonth(), diff);
      return { startDate: formatDate(monday), endDate: todayStr };
    }
    case 'month':
      return { startDate: formatDate(new Date(now.getFullYear(), now.getMonth(), 1)), endDate: todayStr };
    case 'all':
      return { startDate: '2000-01-01', endDate: todayStr };
    case 'custom':
      return {
        startDate: customStartDate,
        endDate: customEndDate,
      };
    default:
      return {};
  }
}

function getDaysMultiplier(tab: TimeTab, customStart?: string, customEnd?: string): number {
  const now = new Date();
  switch (tab) {
    case 'today':
      return 1;
    case 'week': {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now.getFullYear(), now.getMonth(), diff);
      return Math.max(1, Math.floor((now.getTime() - monday.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    }
    case 'month':
      return Math.max(1, now.getDate());
    case 'all':
      return 365;
    case 'custom': {
      if (!customStart || !customEnd) return 1;
      const start = new Date(customStart);
      const end = new Date(customEnd);
      const days = Math.max(1, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      return days;
    }
    default:
      return 1;
  }
}

function getSalesStars(amount: number, tab: TimeTab, customStart?: string, customEnd?: string): string {
  const multiplier = getDaysMultiplier(tab, customStart, customEnd);
  if (amount === 0) return '';
  if (amount > 2000 * multiplier) return '⭐⭐⭐⭐';
  if (amount >= 1000 * multiplier) return '⭐⭐⭐';
  if (amount >= 500 * multiplier) return '⭐⭐';
  return '⭐';
}

export default function OrdersPage() {
  const [timeTab, setTimeTab] = useState<TimeTab>('all');
  const [customStart, setCustomStart] = useState<string>(formatDate(new Date()));
  const [customEnd, setCustomEnd] = useState<string>(formatDate(new Date()));
  const [status, setStatus] = useState<'' | OrderStatus>('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<DashboardSummary>({
    orderCount: 0,
    salesAmount: 0,
    cancelledCount: 0,
    pendingOrderCount: 0,
    lowStockCount: 0,
    totalProductCount: 0,
    latestOrders: [],
  });

  const hasMore = orders.length < total;

  const buildParams = (nextStatus = status, nextTimeTab = timeTab): Record<string, string | number | undefined> => {
    const params: Record<string, string | number | undefined> = {
      page: 1,
      pageSize: PAGE_SIZE,
      status: nextStatus,
    };

    if (nextTimeTab === 'custom') {
      if (customStart) params.startDate = customStart;
      if (customEnd) params.endDate = customEnd;
    } else {
      const range = getDateRangeByTab(nextTimeTab);
      if (range.startDate) params.startDate = range.startDate;
      if (range.endDate) params.endDate = range.endDate;
    }

    return params;
  };

  const buildDateRange = (nextTimeTab = timeTab): { startDate?: string; endDate?: string } => {
    if (nextTimeTab === 'custom') {
      return {
        startDate: customStart,
        endDate: customEnd,
      };
    }
    return getDateRangeByTab(nextTimeTab);
  };

  const load = async (nextStatus = status, nextTimeTab = timeTab, nextPage = 1, append = false) => {
    if (!requireAuth()) {
      return;
    }

    setLoading(true);
    try {
      const params = buildParams(nextStatus, nextTimeTab);
      params.page = nextPage;
      const [orderResult, summaryResult] = await Promise.all([
        getOrders(params),
        getDashboardSummary(buildDateRange(nextTimeTab)),
      ]);
      setOrders((prev) => (append ? [...prev, ...orderResult.items] : orderResult.items));
      setTotal(orderResult.total);
      setPage(nextPage);
      setSummary(summaryResult);
    } catch (error: any) {
      Taro.showToast({ title: error.message || '加载订单失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  const reload = (nextStatus = status, nextTimeTab = timeTab) => {
    setPage(1);
    setTotal(0);
    void load(nextStatus, nextTimeTab, 1, false);
  };

  const loadMore = () => {
    if (loading || !hasMore) return;
    void load(status, timeTab, page + 1, true);
  };

  const handleTimeTabChange = (tab: TimeTab) => {
    setTimeTab(tab);
    reload(status, tab);
  };

  const handleCustomDateChange = (type: 'start' | 'end', value: string) => {
    if (type === 'start') {
      setCustomStart(value);
      if (value > customEnd) {
        setCustomEnd(value);
      }
    } else {
      setCustomEnd(value);
      if (value < customStart) {
        setCustomStart(value);
      }
    }
    // 只有在自定义 tab 下才自动刷新
    if (timeTab === 'custom') {
      reload(status, 'custom');
    }
  };

  useDidShow(() => {
    reload(status, timeTab);
  });

  return (
    <View className='page page--list'>
      <View className='page__header'>
        <View className='page__eyebrow'>Order Flow</View>
        <View className='page__title'>门店订单</View>
        <View className='page__subtitle'>聚焦状态流转与金额，优先处理待确认和待发货订单。</View>
      </View>

      <View className='time-tabs' style={{ paddingBottom: '12px' }}>
        {timeTabs.map((tab) => (
          <View
            key={tab.key}
            className={`time-tab ${timeTab === tab.key ? 'time-tab--active' : ''}`}
            onClick={() => handleTimeTabChange(tab.key)}
          >
            <Text className='time-tab__text'>{tab.label}</Text>
          </View>
        ))}
      </View>

      {timeTab === 'custom' && (
        <View style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '0 22px 12px' }}>
          <Picker mode='date' value={customStart} onChange={(e) => handleCustomDateChange('start', e.detail.value)}>
            <View style={{ padding: '8px 16px', backgroundColor: '#f5f5f5', borderRadius: '8px', fontSize: '14px' }}>{customStart}</View>
          </Picker>
          <Text style={{ fontSize: '14px', color: '#999' }}>至</Text>
          <Picker mode='date' value={customEnd} onChange={(e) => handleCustomDateChange('end', e.detail.value)}>
            <View style={{ padding: '8px 16px', backgroundColor: '#f5f5f5', borderRadius: '8px', fontSize: '14px' }}>{customEnd}</View>
          </Picker>
        </View>
      )}

      <View style={{ padding: '0 22px 12px' }}>
        <Text style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          共 {summary.orderCount} 单，销售额 {formatCurrency(summary.salesAmount)}
        </Text>
      </View>

      {summary.pendingOrderCount > 0 && (
        <View style={{ padding: '0 22px 16px' }}>
          <View
            style={{
              backgroundColor: 'rgba(255, 247, 230, 0.9)',
              borderRadius: '12px',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              border: '1px solid rgba(212, 107, 8, 0.15)',
            }}
            onClick={() => {
              setStatus('pending');
              reload('pending', timeTab);
            }}
          >
            <Text style={{ fontSize: '26px', color: '#d46b08', fontWeight: 500 }}>
              ⚠️ 有 {summary.pendingOrderCount} 单待确认
            </Text>
            <Text style={{ fontSize: '24px', color: '#d46b08' }}>去处理 ›</Text>
          </View>
        </View>
      )}

      <View className='toolbar'>
        <Picker
          mode='selector'
          range={orderStatuses}
          rangeKey='label'
          onChange={(e) => {
            const nextStatus = orderStatuses[Number(e.detail.value)]?.value || '';
            setStatus(nextStatus);
            reload(nextStatus, timeTab);
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
        <>
          <View className='list'>
            {orders.map((order) => (
              <View key={order.id} className='list-item' style={order.status === 'cancelled' ? { backgroundColor: 'rgba(0,0,0,0.04)' } : undefined} onClick={() => Taro.navigateTo({ url: `/pages/order-detail/index?id=${order.id}` })}>
                <View className='row row--start'>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View className='list-item__title'>{order.orderNo}</View>
                    {(order.customerName || order.customerPhone) && (
                      <View className='list-item__subtitle'>
                        {order.customerName}
                        {order.customerName && order.customerPhone && ' · '}
                        {order.customerPhone}
                      </View>
                    )}
                    <View style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {order.items.map((item) => (
                        <View key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {item.image ? (
                            <Image src={item.image} mode='aspectFill' style={{ width: '72px', height: '72px', borderRadius: '8px', backgroundColor: '#f5f5f5' }} />
                          ) : (
                            <View style={{ width: '72px', height: '72px', borderRadius: '8px', backgroundColor: '#f5f5f5' }} />
                          )}
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <View className='list-item__subtitle' style={{ marginTop: 0 }}>
                              {item.productName}{item.color || item.size ? ` (${item.color || '-'} / ${item.size || '-'})` : ''} x{item.quantity}
                            </View>
                            <View className='list-item__subtitle' style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                              {item.soldPrice !== undefined && item.soldPrice !== null && item.soldPrice !== item.price ? (
                                <>
                                  <Text style={{ color: '#999', textDecoration: 'line-through' }}>{formatCurrency(item.price)}</Text>
                                  <Text>{formatCurrency(item.soldPrice)}</Text>
                                </>
                              ) : (
                                <Text style={{ color: '#333' }}>{formatCurrency(item.price)}</Text>
                              )}
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                  <Text className='pill' style={order.status === 'cancelled' ? { backgroundColor: 'rgba(0,0,0,0.08)', color: '#666' } : undefined}>{formatOrderStatus(order.status)}</Text>
                </View>
                <View className='list-item__meta'>
                  <Text>{order.items.length} 件商品</Text>
                  <Text>{formatCurrency(order.finalAmount)}</Text>
                  <Text>{formatDateTime(order.createdAt)}</Text>
                </View>
              </View>
            ))}
          </View>
          <View style={{ padding: '24px 0', textAlign: 'center' }}>
            {loading && (
              <View style={{ display: 'flex', justifyContent: 'center' }}>
                <Text style={{ color: '#999', fontSize: '14px' }}>加载中…</Text>
              </View>
            )}
            {!loading && (
              <View style={{ display: 'flex', justifyContent: 'center' }}>
                <View onClick={hasMore ? loadMore : undefined}>
                  <Text style={{ color: hasMore ? '#666' : '#bbb', fontSize: '14px', textDecoration: hasMore ? 'underline' : 'none' }}>
                    {hasMore ? '点击加载更多' : '— 暂无更多 —'}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </>
      )}
    </View>
  );
}
