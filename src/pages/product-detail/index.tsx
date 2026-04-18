import { useMemo, useState } from 'react';
import Taro, { useDidShow, useLoad } from '@tarojs/taro';
import { Button, Image, Input, Text, View } from '@tarojs/components';
import { getProduct, updateProductImages } from '../../services/products';

import { setDirectOrderItem } from '../../utils/storage';
import { getCurrentUser, hasManagerAccess, requireAuth } from '../../utils/auth';
import { formatCurrency, formatProductStatus } from '../../utils/format';
import { selectAndUploadImages } from '../../utils/upload';
import { Product, User } from '../../types';

export default function ProductDetailPage() {
  const [id, setId] = useState(0);
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedSkuId, setSelectedSkuId] = useState(0);
  const [quantity, setQuantity] = useState<number | string>(1);
  const [uploading, setUploading] = useState(false);
  const [user, setUser] = useState<User | undefined>(getCurrentUser() || undefined);

  const selectedSku = useMemo(
    () => product?.specifications.find((item) => item.id === selectedSkuId) || product?.specifications[0],
    [product, selectedSkuId]
  );

  const load = async (nextId = id, preferredSkuId = selectedSkuId) => {
    if (!requireAuth() || !nextId) {
      return;
    }

    try {
      const result = await getProduct(nextId);
      setProduct(result);
      const matchedSku = result.specifications.find((item) => item.id === preferredSkuId);
      setSelectedSkuId(matchedSku?.id || result.specifications[0]?.id || 0);
      setUser(getCurrentUser() || undefined);
    } catch (error: any) {
      Taro.showToast({ title: error.message || '加载失败', icon: 'none' });
    }
  };

  useLoad((params) => {
    const nextId = Number(params.id || 0);
    const nextSkuId = Number(params.skuId || 0);
    setId(nextId);
    setSelectedSkuId(nextSkuId);
    void load(nextId, nextSkuId);
  });

  useDidShow(() => {
    void load();
  });

  const handleDirectOrder = () => {
    if (!product || !selectedSku) {
      return;
    }

    setDirectOrderItem({
      productId: product.id,
      skuId: selectedSku.id,
      productName: product.name,
      skuCode: selectedSku.skuCode,
      image: selectedSku.image || product.mainImages[0] || null,
      price: selectedSku.salePrice,
      soldPrice: selectedSku.salePrice,
      color: selectedSku.color,
      size: selectedSku.size,
      quantity,
      stock: selectedSku.availableStock,
    });

    Taro.navigateTo({ url: '/pages/order-create/index?mode=direct' });
  };

  const handleUpload = async (scene: 'main' | 'detail') => {
    if (!product) {
      return;
    }

    try {
      setUploading(true);
      const uploaded = await selectAndUploadImages(scene, scene === 'main' ? 3 : 6);
      const payload =
        scene === 'main'
          ? { mainImages: [...product.mainImages, ...uploaded] }
          : { detailImages: [...product.detailImages, ...uploaded] };
      await updateProductImages(product.id, payload);
      Taro.showToast({ title: '图片已更新', icon: 'success' });
      await load(product.id);
    } catch (error: any) {
      Taro.showToast({ title: error.message || '上传失败', icon: 'none' });
    } finally {
      setUploading(false);
    }
  };

  if (!product) {
    return (
      <View className='page loading-state'>
        <View className='loading-state__panel'>商品信息加载中...</View>
      </View>
    );
  }

  return (
    <View className='page page--detail'>
      <View className='page__hero'>
        <View className='page__eyebrow'>Product Detail</View>
        <View className='page__title page__title--light'>{product.name}</View>
        <View className='page__subtitle page__subtitle--light'>
          {product.productCode} · {formatProductStatus(product.status)}
        </View>
        <View className='summary-strip'>
          <View className='summary-chip'>库存 {product.availableStock}</View>
          <View className='summary-chip'>规格 {product.specCount}</View>
          <View className='summary-chip'>起售价 {formatCurrency(product.minPrice)}</View>
        </View>
      </View>

      <View className='panel'>
        <View className='card__header'>
          <View>
            <View className='card__title'>主图</View>
            <View className='section-desc'>首图用于快速判断款式与色系。</View>
          </View>
        </View>
        {product.mainImages.length ? (
          <View className='thumbnail-list'>
            {product.mainImages.map((item) => (
              <Image key={item} className='thumbnail' src={item} mode='aspectFill' />
            ))}
          </View>
        ) : null}
        {hasManagerAccess(user) ? (
          <Button className='button button--ghost button--tiny section-gap' loading={uploading} onClick={() => void handleUpload('main')}>
            补传主图
          </Button>
        ) : null}
      </View>

      <View className='panel'>
        <View className='card__header'>
          <View>
            <View className='card__title'>规格与库存</View>
            <View className='section-desc'>选中后即可直接录单。</View>
          </View>
          {hasManagerAccess(user) ? (
            <Button
              className='button button--ghost button--tiny'
              onClick={() => Taro.navigateTo({ url: `/pages/product-label-print/index?id=${product.id}` })}
            >
              打印标签
            </Button>
          ) : null}
        </View>
        <View className='stack'>
          {product.specifications.map((spec) => (
            <View
              key={spec.id}
              className={`detail-option ${selectedSkuId === spec.id ? 'detail-option--selected' : ''}`}
              onClick={() => setSelectedSkuId(spec.id)}
            >
              <View className='row row--start'>
                {spec.image ? (
                  <Image className='thumbnail thumbnail--tiny' src={spec.image} mode='aspectFill' />
                ) : (
                  <View className='thumbnail thumbnail--tiny thumbnail--placeholder' />
                )}
                <View style={{ flex: 1 }}>
                  <View className='row row--start'>
                    <Text>
                      {spec.color} / {spec.size}
                    </Text>
                    <Text className={selectedSkuId === spec.id ? 'success' : 'muted'}>{formatCurrency(spec.salePrice)}</Text>
                  </View>
                  <View className='list-item__meta'>
                    <Text>可用库存 {spec.availableStock}</Text>
                    <Text>{spec.skuCode}</Text>
                    {hasManagerAccess(user) ? (
                      <Text
                        className='link'
                        onClick={(e) => {
                          e.stopPropagation();
                          Taro.navigateTo({ url: `/pages/product-label-print/index?id=${product.id}&skuId=${spec.id}` });
                        }}
                      >
                        打印标签
                      </Text>
                    ) : null}
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View className='panel'>
        <View className='card__header'>
          <View>
            <View className='card__title'>门店录单</View>
            <View className='section-desc'>选好规格和数量后，可直接录单。</View>
          </View>
        </View>
        <View className='field'>
          <Text className='field__label'>数量</Text>
          <Input
            className='input'
            type='number'
            value={String(quantity)}
            onInput={(e) => {
              const val = e.detail.value.replace(/[^\d]/g, '');
              setQuantity(val === '' ? '' : parseInt(val, 10));
            }}
            onBlur={() => {
              const num = typeof quantity === 'string' ? parseInt(quantity || '1', 10) : quantity;
              setQuantity(Math.max(1, num));
            }}
          />
        </View>
        <View className='btn-row'>
          <Button className='button button--primary button--block' onClick={handleDirectOrder}>
            直接录单
          </Button>
        </View>
      </View>

      <View className='panel'>
        <View className='card__header'>
          <View>
            <View className='card__title'>详情图</View>
            <View className='section-desc'>用于展示细节、面料和搭配说明。</View>
          </View>
        </View>
        {product.detailImages.length ? (
          <View className='thumbnail-list'>
            {product.detailImages.map((item) => (
              <Image key={item} className='thumbnail' src={item} mode='aspectFill' />
            ))}
          </View>
        ) : (
          <View className='empty-state'>
            <View className='empty-state__symbol'>图</View>
            <Text>暂无详情图</Text>
          </View>
        )}
        {hasManagerAccess(user) ? (
          <Button className='button button--ghost button--tiny section-gap' loading={uploading} onClick={() => void handleUpload('detail')}>
            补传详情图
          </Button>
        ) : null}
      </View>
    </View>
  );
}
