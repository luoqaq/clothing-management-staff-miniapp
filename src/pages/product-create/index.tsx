import { useRef, useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { Button, Image, Input, Picker, Text, Textarea, View } from '@tarojs/components';
import { checkProductCode, createProduct, getProductOptions } from '../../services/products';
import { CreateProductPayload, ProductOptions, ProductSpecificationPayload } from '../../types';
import { getCurrentUser, hasManagerAccess, requireAuth } from '../../utils/auth';
import { selectAndUploadImages } from '../../utils/upload';

const defaultSpecification = (): ProductSpecificationPayload => ({
  color: '',
  size: '',
  salePrice: 0,
  costPrice: 0,
  stock: 0,
  status: 'active',
});

type ProductCodeCheckStatus = 'idle' | 'checking' | 'available' | 'duplicate';

export default function ProductCreatePage() {
  const [options, setOptions] = useState<ProductOptions>({
    categories: [],
    suppliers: [],
    productStatuses: ['draft', 'active', 'inactive'],
    specificationStatuses: ['active', 'inactive'],
  });
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [productCodeCheckStatus, setProductCodeCheckStatus] = useState<ProductCodeCheckStatus>('idle');
  const [productCodeCheckMessage, setProductCodeCheckMessage] = useState('');
  const lastCheckedProductCodeRef = useRef('');
  const [form, setForm] = useState<CreateProductPayload>({
    productCode: '',
    name: '',
    description: '',
    categoryId: 0,
    supplierId: null,
    tags: [],
    status: 'draft',
    mainImages: [],
    detailImages: [],
    specifications: [defaultSpecification()],
  });

  const load = async () => {
    if (!requireAuth()) {
      return;
    }

    const user = getCurrentUser();
    if (!hasManagerAccess(user)) {
      Taro.showToast({ title: '当前角色不能新增商品', icon: 'none' });
      setTimeout(() => {
        Taro.switchTab({ url: '/pages/products/index' });
      }, 500);
      return;
    }

    try {
      const result = await getProductOptions();
      setOptions(result);
      if (!form.categoryId && result.categories[0]) {
        setForm((prev) => ({ ...prev, categoryId: result.categories[0].id }));
      }
    } catch (error: any) {
      Taro.showToast({ title: error.message || '加载选项失败', icon: 'none' });
    }
  };

  useDidShow(() => {
    void load();
  });

  const updateSpecification = (index: number, key: keyof ProductSpecificationPayload, value: string | number) => {
    setForm((prev) => ({
      ...prev,
      specifications: prev.specifications.map((item, currentIndex) =>
        currentIndex === index ? { ...item, [key]: value } : item
      ),
    }));
  };

  const handleProductCodeInput = (value: string) => {
    setForm((prev) => ({ ...prev, productCode: value }));
    setProductCodeCheckStatus('idle');
    setProductCodeCheckMessage('');
    lastCheckedProductCodeRef.current = '';
  };

  const validateProductCode = async (rawValue?: string) => {
    const normalizedProductCode = String(rawValue ?? form.productCode ?? '').trim();

    if (!normalizedProductCode) {
      setProductCodeCheckStatus('idle');
      setProductCodeCheckMessage('');
      lastCheckedProductCodeRef.current = '';
      return false;
    }

    if (lastCheckedProductCodeRef.current === normalizedProductCode && productCodeCheckStatus !== 'idle') {
      return productCodeCheckStatus === 'duplicate';
    }

    try {
      setProductCodeCheckStatus('checking');
      setProductCodeCheckMessage('正在校验款号...');
      const result = await checkProductCode(normalizedProductCode);
      lastCheckedProductCodeRef.current = normalizedProductCode;

      if (result.exists) {
        setProductCodeCheckStatus('duplicate');
        setProductCodeCheckMessage(`款号 ${normalizedProductCode} 已存在`);
        return true;
      }

      setProductCodeCheckStatus('available');
      setProductCodeCheckMessage('款号可用');
      return false;
    } catch (error: any) {
      setProductCodeCheckStatus('idle');
      setProductCodeCheckMessage('');
      throw error;
    }
  };

  const handleProductCodeBlur = async (value?: string) => {
    const normalizedProductCode = String(value ?? '').trim();
    if (!normalizedProductCode) {
      setProductCodeCheckStatus('idle');
      setProductCodeCheckMessage('');
      return;
    }

    try {
      const isDuplicate = await validateProductCode(normalizedProductCode);
      if (isDuplicate) {
        Taro.showToast({ title: `款号 ${normalizedProductCode} 已存在`, icon: 'none' });
      }
    } catch (error: any) {
      Taro.showToast({ title: error.message || '款号校验失败', icon: 'none' });
    }
  };

  const uploadImages = async (scene: 'main' | 'detail') => {
    try {
      setUploading(true);
      const result = await selectAndUploadImages(scene, scene === 'main' ? 3 : 6);
      setForm((prev) => ({
        ...prev,
        [scene === 'main' ? 'mainImages' : 'detailImages']: [
          ...(scene === 'main' ? prev.mainImages || [] : prev.detailImages || []),
          ...result,
        ],
      }));
    } catch (error: any) {
      Taro.showToast({ title: error.message || '上传失败', icon: 'none' });
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (uploading) {
      Taro.showToast({ title: '图片上传中，请稍后', icon: 'none' });
      return;
    }

    const normalizedProductCode = String(form.productCode ?? '').trim();
    if (!normalizedProductCode) {
      Taro.showToast({ title: '请输入款号', icon: 'none' });
      return;
    }

    try {
      setSubmitting(true);
      const isDuplicate = await validateProductCode(normalizedProductCode);
      if (isDuplicate) {
        Taro.showToast({ title: `款号 ${normalizedProductCode} 已存在`, icon: 'none' });
        return;
      }

      const payload = {
        ...form,
        productCode: normalizedProductCode,
        tags: form.tags || [],
        specifications: form.specifications.map((item) => ({
          ...item,
          salePrice: Number(item.salePrice),
          costPrice: Number(item.costPrice),
          stock: Number(item.stock),
        })),
      };
      await createProduct(payload);
      Taro.showToast({ title: '商品创建成功', icon: 'success' });
      Taro.switchTab({ url: '/pages/products/index' });
    } catch (error: any) {
      Taro.showToast({ title: error.message || '创建失败', icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className='page page--form'>
      <View className='page__header'>
        <View className='page__eyebrow'>Create Product</View>
        <View className='page__title'>轻量上新</View>
        <View className='page__subtitle'>把基础资料、图片和规格拆分成清晰三段，更适合门店现场录入。</View>
      </View>
      <View className='panel'>
        <View className='card__header'>
          <View>
            <View className='card__title'>基础信息</View>
            <View className='section-desc'>先确定款号、分类、供应商和商品描述。</View>
          </View>
        </View>
        <View className='field'>
          <Text className='field__label'>款号</Text>
          <Input
            className='input'
            value={form.productCode}
            onInput={(e) => handleProductCodeInput(e.detail.value)}
            onBlur={(e) => void handleProductCodeBlur(e.detail.value)}
          />
          {productCodeCheckMessage ? (
            <View className={`field__feedback ${productCodeCheckStatus === 'duplicate' ? 'field__feedback--error' : productCodeCheckStatus === 'available' ? 'field__feedback--success' : ''}`}>
              {productCodeCheckMessage}
            </View>
          ) : null}
        </View>
        <View className='field'>
          <Text className='field__label'>商品名称</Text>
          <Input className='input' value={form.name} onInput={(e) => setForm({ ...form, name: e.detail.value })} />
        </View>
        <View className='field'>
          <Text className='field__label'>商品描述</Text>
          <Textarea className='textarea' value={form.description} onInput={(e) => setForm({ ...form, description: e.detail.value })} />
        </View>
        <View className='field'>
          <Text className='field__label'>分类</Text>
          <Picker
            mode='selector'
            range={options.categories}
            rangeKey='name'
            onChange={(e) =>
              setForm({
                ...form,
                categoryId: options.categories[Number(e.detail.value)]?.id || form.categoryId,
              })
            }
          >
            <View className='picker'>{options.categories.find((item) => item.id === form.categoryId)?.name || '请选择分类'}</View>
          </Picker>
        </View>
        <View className='field'>
          <Text className='field__label'>供应商</Text>
          <Picker
            mode='selector'
            range={options.suppliers}
            rangeKey='name'
            onChange={(e) =>
              setForm({
                ...form,
                supplierId: options.suppliers[Number(e.detail.value)]?.id || null,
              })
            }
          >
            <View className='picker'>{options.suppliers.find((item) => item.id === form.supplierId)?.name || '可不选'}</View>
          </Picker>
        </View>
        <View className='field'>
          <Text className='field__label'>标签（逗号分隔）</Text>
          <Input
            className='input'
            value={(form.tags || []).join(',')}
            onInput={(e) =>
              setForm({
                ...form,
                tags: e.detail.value
                  .split(',')
                  .map((item) => item.trim())
                  .filter(Boolean),
              })
            }
          />
        </View>
      </View>

      <View className='panel'>
        <View className='card__header'>
          <View>
            <View className='card__title'>商品图片</View>
            <View className='section-desc'>主图与详情图都会先在手机端压缩，再直传 COS。</View>
          </View>
        </View>
        <View className='section-gap btn-row'>
          <Button className='button button--ghost button--tiny' loading={uploading} onClick={() => void uploadImages('main')}>
            上传主图
          </Button>
          <Button className='button button--ghost button--tiny' loading={uploading} onClick={() => void uploadImages('detail')}>
            上传详情图
          </Button>
        </View>

        {/* 主图缩略图列表 */}
        {form.mainImages && form.mainImages.length > 0 && (
          <View className='image-section'>
            <View className='image-section__title'>主图 ({form.mainImages.length} 张)</View>
            <View className='image-list'>
              {form.mainImages.map((url, index) => (
                <View key={`main-${index}`} className='image-item'>
                  <Image className='image-item__thumb' src={url} mode='aspectFill' />
                  <View
                    className='image-item__delete'
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        mainImages: prev.mainImages?.filter((_, i) => i !== index),
                      }))
                    }
                  >
                    <Text className='image-item__delete-icon'>×</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 详情图缩略图列表 */}
        {form.detailImages && form.detailImages.length > 0 && (
          <View className='image-section'>
            <View className='image-section__title'>详情图 ({form.detailImages.length} 张)</View>
            <View className='image-list'>
              {form.detailImages.map((url, index) => (
                <View key={`detail-${index}`} className='image-item'>
                  <Image className='image-item__thumb' src={url} mode='aspectFill' />
                  <View
                    className='image-item__delete'
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        detailImages: prev.detailImages?.filter((_, i) => i !== index),
                      }))
                    }
                  >
                    <Text className='image-item__delete-icon'>×</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {(!form.mainImages?.length && !form.detailImages?.length) && (
          <View className='summary-strip'>
            <View className='summary-chip'>主图 0 张</View>
            <View className='summary-chip'>详情图 0 张</View>
          </View>
        )}
      </View>

      <View className='panel'>
        <View className='card__header'>
          <View>
            <View className='card__title'>规格</View>
            <View className='section-desc'>颜色、尺码、售价和库存集中录入。</View>
          </View>
          <Button className='button button--dark button--tiny' onClick={() => setForm({ ...form, specifications: [...form.specifications, defaultSpecification()] })}>
            新增规格
          </Button>
        </View>
        <View className='stack'>
          {form.specifications.map((spec, index) => (
            <View key={index} className='panel panel--soft'>
              <View className='field'>
                <Text className='field__label'>颜色</Text>
                <Input className='input' value={spec.color} onInput={(e) => updateSpecification(index, 'color', e.detail.value)} />
              </View>
              <View className='field'>
                <Text className='field__label'>尺码</Text>
                <Input className='input' value={spec.size} onInput={(e) => updateSpecification(index, 'size', e.detail.value)} />
              </View>
              <View className='grid grid--2'>
                <View className='field'>
                  <Text className='field__label'>售价</Text>
                  <Input className='input' type='digit' value={String(spec.salePrice)} onInput={(e) => updateSpecification(index, 'salePrice', Number(e.detail.value || 0))} />
                </View>
                <View className='field'>
                  <Text className='field__label'>成本价</Text>
                  <Input className='input' type='digit' value={String(spec.costPrice)} onInput={(e) => updateSpecification(index, 'costPrice', Number(e.detail.value || 0))} />
                </View>
              </View>
              <View className='grid grid--2'>
                <View className='field'>
                  <Text className='field__label'>库存</Text>
                  <Input className='input' type='number' value={String(spec.stock)} onInput={(e) => updateSpecification(index, 'stock', Number(e.detail.value || 0))} />
                </View>
                <View className='field'>
                  <Text className='field__label'>标签码</Text>
                  <View className='picker'>保存后自动生成</View>
                </View>
              </View>
              <Button
                className='button button--ghost button--tiny'
                onClick={() =>
                  setForm({
                    ...form,
                    specifications: form.specifications.filter((_, currentIndex) => currentIndex !== index),
                  })
                }
              >
                删除规格
              </Button>
            </View>
          ))}
        </View>
      </View>

      <Button className='button button--primary button--block' loading={submitting} onClick={submit}>
        创建商品
      </Button>
    </View>
  );
}
