import { useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { Button, Input, Picker, Text, Textarea, View } from '@tarojs/components';
import { createOrder } from '../../services/orders';
import { CartItem } from '../../types';
import { requireAuth } from '../../utils/auth';
import { formatCurrency } from '../../utils/format';
import { clearCart, getCart } from '../../utils/storage';

const paymentMethods = ['现金', '微信', '支付宝'];

export default function OrderCreatePage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    customerName: '',
    customerPhone: '',
    note: '',
    paymentMethod: paymentMethods[0],
  });

  useDidShow(() => {
    if (!requireAuth()) {
      return;
    }
    setItems(getCart());
  });

  const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const submit = async () => {
    if (!items.length) {
      Taro.showToast({ title: '购物车为空', icon: 'none' });
      return;
    }

    try {
      setSubmitting(true);
      const order = await createOrder({
        customerName: form.customerName,
        customerPhone: form.customerPhone,
        note: form.note,
        paymentMethod: form.paymentMethod,
        items: items.map((item) => ({
          skuId: item.skuId,
          quantity: item.quantity,
        })),
      });
      clearCart();
      Taro.showToast({ title: '订单已创建', icon: 'success' });
      Taro.redirectTo({ url: `/pages/order-detail/index?id=${order.id}` });
    } catch (error: any) {
      Taro.showToast({ title: error.message || '录单失败', icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className='page page--form'>
      <View className='page__header'>
        <View className='page__eyebrow'>Create Order</View>
        <View className='page__title'>门店录单</View>
        <View className='page__subtitle'>先确认客户与收款信息，再统一提交购物车中的商品。</View>
      </View>
      <View className='panel'>
        <View className='card__header'>
          <View>
            <View className='card__title'>基础信息</View>
            <View className='section-desc'>录入客户与收款方式，便于后续状态流转。</View>
          </View>
        </View>
        <View className='field'>
          <Text className='field__label'>客户姓名</Text>
          <Input className='input' value={form.customerName} onInput={(e) => setForm({ ...form, customerName: e.detail.value })} />
        </View>
        <View className='field'>
          <Text className='field__label'>客户手机</Text>
          <Input className='input' value={form.customerPhone} type='number' onInput={(e) => setForm({ ...form, customerPhone: e.detail.value })} />
        </View>
        <View className='field'>
          <Text className='field__label'>收款方式</Text>
          <Picker
            mode='selector'
            range={paymentMethods}
            onChange={(e) => setForm({ ...form, paymentMethod: paymentMethods[Number(e.detail.value)] })}
          >
            <View className='picker'>{form.paymentMethod}</View>
          </Picker>
        </View>
        <View className='field'>
          <Text className='field__label'>备注</Text>
          <Textarea className='textarea' value={form.note} onInput={(e) => setForm({ ...form, note: e.detail.value })} />
        </View>
      </View>

      <View className='panel'>
        <View className='card__header'>
          <View>
            <View className='card__title'>商品清单</View>
            <View className='section-desc'>确认颜色、尺码和数量后再提交。</View>
          </View>
        </View>
        {items.length === 0 ? (
          <View className='empty-state'>
            <View className='empty-state__symbol'>单</View>
            <Text>购物车为空</Text>
          </View>
        ) : (
          <View className='list'>
            {items.map((item) => (
              <View key={item.skuId} className='list-item list-item--compact'>
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
        )}
        <View className='divider' />
        <View className='row'>
          <Text>合计</Text>
          <Text>{formatCurrency(totalAmount)}</Text>
        </View>
      </View>

      <Button className='button button--primary button--block' loading={submitting} onClick={submit}>
        提交订单
      </Button>
    </View>
  );
}
