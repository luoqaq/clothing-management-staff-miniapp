import { useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { Image, Text, View } from '@tarojs/components';
import { getDashboardSummary } from '../../services/dashboard';
import { getProductByCode } from '../../services/products';
import { DashboardSummary, User } from '../../types';
import { getCurrentUser, hasManagerAccess, requireAuth } from '../../utils/auth';
import { formatCurrency, formatDateTime, formatOrderStatus } from '../../utils/format';
import { setScannedItems } from '../../utils/scan';

type TimeTab = 'today' | 'week' | 'month' | 'all';

const tabs: Array<{ key: TimeTab; label: string }> = [
  { key: 'today', label: '今日' },
  { key: 'week', label: '本周' },
  { key: 'month', label: '本月' },
  { key: 'all', label: '累计' },
];

const tabLabelMap: Record<TimeTab, string> = {
  today: '今日',
  week: '本周',
  month: '本月',
  all: '累计',
};

const emptySummary: DashboardSummary = {
  orderCount: 0,
  salesAmount: 0,
  cancelledCount: 0,
  pendingOrderCount: 0,
  lowStockCount: 0,
  totalProductCount: 0,
  latestOrders: [],
};

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDateRangeByTab(tab: TimeTab): { startDate?: string; endDate?: string } {
  const now = new Date();
  const todayStr = formatDate(now);
  switch (tab) {
    case 'today':
      return {
        startDate: todayStr,
        endDate: todayStr,
      };
    case 'week': {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now.getFullYear(), now.getMonth(), diff);
      return {
        startDate: formatDate(monday),
        endDate: todayStr,
      };
    }
    case 'month':
      return {
        startDate: formatDate(new Date(now.getFullYear(), now.getMonth(), 1)),
        endDate: todayStr,
      };
    case 'all':
      return {
        startDate: '2000-01-01',
        endDate: todayStr,
      };
    default:
      return {};
  }
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<TimeTab>('today');
  const [summary, setSummary] = useState<DashboardSummary>(emptySummary);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | undefined>(getCurrentUser() || undefined);
  const [scanLoading, setScanLoading] = useState(false);
  const [showStats, setShowStats] = useState(false);

  const load = async (tab = activeTab) => {
    if (!requireAuth()) {
      return;
    }

    setLoading(true);
    try {
      const params = getDateRangeByTab(tab);
      const result = await getDashboardSummary(params);
      setSummary(result);
      setUser(getCurrentUser() || undefined);
    } catch (error: any) {
      Taro.showToast({ title: error.message || '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  useDidShow(() => {
    void load();
  });

  const handleTabChange = (tab: TimeTab) => {
    setActiveTab(tab);
    void load(tab);
  };

  const handleScanOrder = async () => {
    if (!requireAuth() || scanLoading) {
      return;
    }

    try {
      setScanLoading(true);
      const result = await Taro.scanCode({ scanType: ['barCode', 'qrCode'] });
      const code = result.result || '';
      if (!code) {
        Taro.showToast({ title: '未识别到标签码', icon: 'none' });
        return;
      }

      const scannedProduct = await getProductByCode(code);
      setScannedItems([
        {
          ...scannedProduct,
          quantity: 1,
        },
      ]);
      Taro.navigateTo({ url: '/pages/order-create/index?mode=scan' });
    } catch (error: any) {
      if (error?.errMsg?.includes('cancel')) {
        return;
      }
      Taro.showToast({ title: error.message || '扫码失败', icon: 'none' });
    } finally {
      setScanLoading(false);
    }
  };

  const currentLabel = tabLabelMap[activeTab];
  const canViewProfit = hasManagerAccess(user);

  function getDaysMultiplier(tab: TimeTab): number {
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
      default:
        return 1;
    }
  }

  function getSalesStars(amount: number, tab: TimeTab): string {
    const multiplier = getDaysMultiplier(tab);
    if (amount === 0) return '';
    if (amount > 2000 * multiplier) return '⭐⭐⭐⭐';
    if (amount >= 1000 * multiplier) return '⭐⭐⭐';
    if (amount >= 500 * multiplier) return '⭐⭐';
    return '⭐';
  }

  return (
    <View className='page page--dashboard'>
      <View className='page__hero'>
        <View className='page__eyebrow'>Daily Brief</View>
        <View className='page__title page__title--light'>今日工作台</View>
        <View className='page__subtitle page__subtitle--light'>先看当日节奏，再进入商品、订单和补货动作。</View>
      </View>

      <View className='time-tabs'>
        {tabs.map((tab) => (
          <View
            key={tab.key}
            className={`time-tab ${activeTab === tab.key ? 'time-tab--active' : ''}`}
            onClick={() => handleTabChange(tab.key)}
          >
            <Text className='time-tab__text'>{tab.label}</Text>
          </View>
        ))}
      </View>

      <View className='summary-cards'>
        <View className='summary-card' onClick={() => setShowStats((v) => !v)}>
          <View className='summary-card__label'>{currentLabel}订单</View>
          <View className='summary-card__value'>{showStats ? summary.orderCount : '***'}</View>
          {showStats && summary.cancelledCount > 0 && (
            <View className='summary-card__subnote'>取消 {summary.cancelledCount} 单</View>
          )}
          {!showStats && (
            <View className='summary-card__subnote'>点击展开</View>
          )}
        </View>
        <View className='summary-card summary-card--accent' onClick={() => setShowStats((v) => !v)}>
          <View className='summary-card__label'>{currentLabel}销售</View>
          <View className='summary-card__value'>{showStats ? formatCurrency(summary.salesAmount) : '***'}</View>
          {showStats && summary.salesAmount > 0 && (
            <View className='summary-card__stars'>{getSalesStars(summary.salesAmount, activeTab)}</View>
          )}
          {showStats && canViewProfit && (
            <View className='summary-card__subnote'>毛利 {formatCurrency(summary.grossProfit || 0)}</View>
          )}
          {!showStats && (
            <View className='summary-card__subnote'>点击展开</View>
          )}
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
          {hasManagerAccess(user) ? (
            <View className='quick-link' onClick={() => Taro.navigateTo({ url: '/pages/product-create/index' })}>
              <View className='quick-link__icon'>新</View>
              <View className='quick-link__title'>轻量上新</View>
              <View className='quick-link__desc'>直接录入新款</View>
            </View>
          ) : null}
          <View className='quick-link' onClick={() => Taro.navigateTo({ url: '/pages/order-create/index?mode=manual' })}>
            <View className='quick-link__icon'>单</View>
            <View className='quick-link__title'>门店录单</View>
            <View className='quick-link__desc'>手动选择商品录单</View>
          </View>
          <View className='quick-link' onClick={() => void handleScanOrder()}>
            <View className='quick-link__icon'>扫</View>
            <View className='quick-link__title'>扫码录单</View>
            <View className='quick-link__desc'>{scanLoading ? '正在扫码识别商品' : '扫码后直接进入录单'}</View>
          </View>
        </View>
      </View>

    </View>
  );
}
