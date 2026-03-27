import { useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { Button, Image, Input, Text, View } from '@tarojs/components';
import { getProducts } from '../../services/products';
import { Product, User } from '../../types';
import { getCurrentUser, hasManagerAccess, requireAuth } from '../../utils/auth';
import { formatCurrency, formatProductStatus } from '../../utils/format';

export default function ProductsPage() {
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [user, setUser] = useState<User | undefined>(getCurrentUser() || undefined);

  const load = async () => {
    if (!requireAuth()) {
      return;
    }

    try {
      const result = await getProducts({
        search,
        page: 1,
        pageSize: 20,
      });
      setProducts(result.items);
      setUser(getCurrentUser() || undefined);
    } catch (error: any) {
      Taro.showToast({ title: error.message || '加载失败', icon: 'none' });
    }
  };

  useDidShow(() => {
    void load();
  });

  return (
    <View className='page page--list'>
      <View className='page__header'>
        <View className='page__eyebrow'>Product Floor</View>
        <View className='page__title'>商品管理</View>
        <View className='page__subtitle'>按款号、库存和价格快速筛选，像在看门店陈列清单。</View>
      </View>

      <View className='toolbar'>
        <View className='field'>
          <Text className='field__label'>搜索商品</Text>
          <Input className='input' value={search} onInput={(e) => setSearch(e.detail.value)} placeholder='名称 / 款号' />
        </View>
        <View className='btn-row'>
          <Button className='button button--primary button--tiny' onClick={() => void load()}>
            查询
          </Button>
          {hasManagerAccess(user) ? (
            <Button className='button button--ghost button--tiny' onClick={() => Taro.navigateTo({ url: '/pages/product-create/index' })}>
              新增商品
            </Button>
          ) : null}
          <Button className='button button--ghost button--tiny' onClick={() => Taro.navigateTo({ url: '/pages/cart/index' })}>
            购物车
          </Button>
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
