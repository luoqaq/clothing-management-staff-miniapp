import { useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { Button, Input, Text, View } from '@tarojs/components';
import { CartItem } from '../../types';
import { requireAuth } from '../../utils/auth';
import { formatCurrency } from '../../utils/format';
import { removeCartItem, updateCartQuantity } from '../../utils/cart';
import { getCart } from '../../utils/storage';

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);

  useDidShow(() => {
    if (!requireAuth()) {
      return;
    }
    setItems(getCart());
  });

  const total = items.reduce((sum, item) => sum + (item.soldPrice || item.price) * item.quantity, 0);

  const handleScan = () => {
    Taro.navigateTo({ url: '/pages/scan-result/index' });
  };

  return (
    <View className='page page--cart'>
      <View className='page__header'>
        <View className='page__eyebrow'>Cart</View>
        <View className='page__title'>购物车</View>
        <View className='page__subtitle'>按门店录单节奏整理待提交商品，数量与金额一眼可见。</View>
      </View>
      <View className='btn-row section-gap'>
        <Button className='button button--ghost button--tiny' onClick={handleScan}>
          继续扫码
        </Button>
      </View>
      {items.length === 0 ? (
        <View className='empty-state'>
          <View className='empty-state__symbol'>袋</View>
          <Text>暂无待录入商品</Text>
        </View>
      ) : (
        <View className='list'>
          {items.map((item) => (
            <View key={item.skuId} className='list-item'>
              <View className='row row--start'>
                <View>
                  <View className='list-item__title'>{item.productName}</View>
                  <View className='list-item__subtitle'>
                    {item.color} / {item.size}
                  </View>
                </View>
                <Text className='list-item__price'>{formatCurrency(item.price)}</Text>
              </View>
              <View className='row section-gap'>
                <View className='caption'>数量</View>
                <Input
                  className='input input--qty'
                  type='number'
                  value={String(item.quantity)}
                  onInput={(e) => setItems(updateCartQuantity(item.skuId, Number(e.detail.value || 1)))}
                />
              </View>
              <Button className='button button--ghost button--tiny section-gap' onClick={() => setItems(removeCartItem(item.skuId))}>
                移除
              </Button>
            </View>
          ))}
        </View>
      )}
      <View className='panel panel--dark'>
        <View className='row'>
          <Text>合计</Text>
          <Text>{formatCurrency(total)}</Text>
        </View>
        <Button className='button button--primary button--block section-gap' onClick={() => Taro.navigateTo({ url: '/pages/order-create/index' })}>
          去录单
        </Button>
      </View>
    </View>
  );
}
