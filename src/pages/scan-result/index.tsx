import { useState } from 'react';
import Taro, { useDidShow, useLoad } from '@tarojs/taro';
import { Button, Image, Input, Text, View } from '@tarojs/components';
import { getProductByCode } from '../../services/products';
import { ScannedSkuProduct } from '../../types';
import { requireAuth } from '../../utils/auth';
import { formatCurrency } from '../../utils/format';
import { setScannedItems, getScannedItems, clearScannedItems } from '../../utils/scan';

interface ScannedItem extends ScannedSkuProduct {
  quantity: number;
}

export default function ScanResultPage() {
  const [items, setItems] = useState<ScannedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);

  const loadFromStorage = () => {
    setItems(getScannedItems());
  };

  useLoad(() => {
    if (!requireAuth()) {
      return;
    }
    loadFromStorage();
  });

  useDidShow(() => {
    if (!requireAuth()) {
      return;
    }
    loadFromStorage();
  });

  const fetchProduct = async (code: string): Promise<ScannedItem | null> => {
    try {
      const result = await getProductByCode(code);
      return {
        ...result,
        quantity: 1,
      };
    } catch (error: any) {
      Taro.showToast({ title: error.message || '扫码识别失败', icon: 'none' });
      return null;
    }
  };

  const handleScan = async () => {
    if (scanning) return;
    
    try {
      setScanning(true);
      const result = await Taro.scanCode({ scanType: ['barCode', 'qrCode'] });
      const code = result.result || '';
      
      if (!code) {
        Taro.showToast({ title: '未识别到标签码', icon: 'none' });
        return;
      }

      // 检查是否已存在
      const currentItems = getScannedItems();
      const existingItem = currentItems.find(item => item.barcode === code);
      
      if (existingItem) {
        // 已存在，增加数量
        const updatedItems = currentItems.map(item =>
          item.barcode === code
            ? { ...item, quantity: Math.min(item.quantity + 1, item.availableStock) }
            : item
        );
        setScannedItems(updatedItems);
        setItems(updatedItems);
        Taro.showToast({ title: `${existingItem.productName} 数量 +1`, icon: 'none' });
      } else {
        // 新商品，查询并添加
        setLoading(true);
        const newItem = await fetchProduct(code);
        if (newItem) {
          const updatedItems = [...currentItems, newItem];
          setScannedItems(updatedItems);
          setItems(updatedItems);
          Taro.showToast({ title: '已添加商品', icon: 'success' });
        }
      }
    } catch (error: any) {
      if (error?.errMsg?.includes('cancel')) {
        return;
      }
      Taro.showToast({ title: error.message || '扫码失败', icon: 'none' });
    } finally {
      setLoading(false);
      setScanning(false);
    }
  };

  const handleQuantityChange = (skuId: number, quantity: number) => {
    const currentItems = getScannedItems();
    const item = currentItems.find(i => i.skuId === skuId);
    if (!item) return;

    const newQuantity = Math.max(1, Math.min(quantity, item.availableStock));
    const updatedItems = currentItems.map(item =>
      item.skuId === skuId ? { ...item, quantity: newQuantity } : item
    );
    setScannedItems(updatedItems);
    setItems(updatedItems);
  };

  const handleDelete = (skuId: number) => {
    Taro.showModal({
      title: '确认删除',
      content: '确定要删除该商品吗？',
      confirmColor: '#dc2626',
      success: (res) => {
        if (res.confirm) {
          const currentItems = getScannedItems();
          const updatedItems = currentItems.filter(item => item.skuId !== skuId);
          setScannedItems(updatedItems);
          setItems(updatedItems);
          Taro.showToast({ title: '已删除', icon: 'none' });
        }
      }
    });
  };

  const handleClearAll = () => {
    if (items.length === 0) return;
    
    Taro.showModal({
      title: '确认清空',
      content: '确定要清空所有扫码商品吗？',
      confirmColor: '#dc2626',
      success: (res) => {
        if (res.confirm) {
          clearScannedItems();
          setItems([]);
          Taro.showToast({ title: '已清空', icon: 'none' });
        }
      }
    });
  };

  const handleCreateOrder = () => {
    if (items.length === 0) {
      Taro.showToast({ title: '请先扫码添加商品', icon: 'none' });
      return;
    }
    Taro.navigateTo({ url: '/pages/order-create/index?mode=scan' });
  };

  const totalAmount = items.reduce((sum, item) => sum + item.salePrice * item.quantity, 0);
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <View className='page page--scan-result'>
      <View className='page__header'>
        <View className='page__eyebrow'>Scan Result</View>
        <View className='page__title'>扫码录单</View>
        <View className='page__subtitle'>连续扫码添加商品，确认后一次性提交订单。</View>
      </View>

      {/* 操作栏 */}
      <View className='panel panel--compact'>
        <View className='btn-row'>
          <Button 
            className='button button--primary' 
            onClick={() => void handleScan()}
            loading={scanning}
          >
            继续扫码
          </Button>
          <Button 
            className='button button--ghost' 
            onClick={handleClearAll}
            disabled={items.length === 0}
          >
            清空全部
          </Button>
        </View>
      </View>

      {/* 商品列表 */}
      <View className='panel'>
        <View className='card__header'>
          <View>
            <View className='card__title'>商品清单</View>
            <View className='section-desc'>
              共 {items.length} 款商品，{totalQuantity} 件
            </View>
          </View>
        </View>

        {items.length === 0 ? (
          <View className='empty-state'>
            <View className='empty-state__symbol'>扫</View>
            <Text>暂无扫码商品</Text>
            <View className='caption section-gap'>点击上方「继续扫码」添加商品</View>
          </View>
        ) : (
          <View className='list'>
            {items.map((item) => (
              <View key={item.skuId} className='list-item list-item--scan'>
                {/* 商品信息 */}
                <View className='row row--start'>
                  {item.image ? (
                    <Image className='thumbnail thumbnail--small' src={item.image} mode='aspectFill' />
                  ) : (
                    <View className='thumbnail thumbnail--small thumbnail--placeholder' />
                  )}
                  <View className='list-item__content'>
                    <View className='list-item__title'>{item.productName}</View>
                    <View className='list-item__subtitle'>
                      {item.color} / {item.size} · {item.skuCode}
                    </View>
                    <View className='list-item__price'>{formatCurrency(item.salePrice)}</View>
                  </View>
                </View>

                {/* 数量调整 */}
                <View className='row row--between section-gap'>
                  <View className='caption'>数量 (库存 {item.availableStock})</View>
                  <View className='quantity-control'>
                    <Button 
                      className='button button--tiny button--ghost'
                      onClick={() => handleQuantityChange(item.skuId, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                    >
                      -
                    </Button>
                    <Input
                      className='input input--qty'
                      type='number'
                      value={String(item.quantity)}
                      onInput={(e) => handleQuantityChange(item.skuId, Number(e.detail.value || 1))}
                    />
                    <Button 
                      className='button button--tiny button--ghost'
                      onClick={() => handleQuantityChange(item.skuId, item.quantity + 1)}
                      disabled={item.quantity >= item.availableStock}
                    >
                      +
                    </Button>
                  </View>
                </View>

                {/* 小计 & 删除 */}
                <View className='row row--between'>
                  <Text className='caption'>
                    小计: {formatCurrency(item.salePrice * item.quantity)}
                  </Text>
                  <Button 
                    className='button button--tiny button--danger-ghost'
                    onClick={() => handleDelete(item.skuId)}
                  >
                    删除
                  </Button>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* 底部结算栏 */}
      {items.length > 0 && (
        <View className='panel panel--dark panel--sticky-bottom'>
          <View className='row row--between'>
            <View>
              <Text className='caption'>合计: </Text>
              <Text className='price--large'>{formatCurrency(totalAmount)}</Text>
            </View>
            <Button 
              className='button button--primary'
              onClick={handleCreateOrder}
            >
              去下单 ({totalQuantity}件)
            </Button>
          </View>
        </View>
      )}
    </View>
  );
}
