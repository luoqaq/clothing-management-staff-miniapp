import { useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { Button, Input, Text, View } from '@tarojs/components';
import { login } from '../../services/auth';
import { isAuthenticated } from '../../utils/auth';
import { setToken, setUser } from '../../utils/storage';

export default function LoginPage() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useDidShow(() => {
    if (isAuthenticated()) {
      Taro.switchTab({ url: '/pages/dashboard/index' });
    }
  });

  const handleSubmit = async () => {
    if (!username || !password) {
      Taro.showToast({ title: '请填写账号密码', icon: 'none' });
      return;
    }

    try {
      setLoading(true);
      const result = await login({ username, password });
      setToken(result.token);
      setUser(result.user);
      Taro.showToast({ title: '登录成功', icon: 'success' });
      Taro.switchTab({ url: '/pages/dashboard/index' });
    } catch (error: any) {
      Taro.showToast({ title: error.message || '登录失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className='page page--auth'>
      <View className='page__hero'>
        <View className='auth-brand'>
          <View className='auth-brand__badge'>CM</View>
          <View>
            <View className='page__eyebrow'>Store Operations</View>
            <View className='page__title page__title--light'>店铺运营协同端</View>
            <View className='page__subtitle page__subtitle--light'>使用后台账号登录，统一处理商品建档、图片补传与门店订单。</View>
          </View>
        </View>
        <View className='page__summary'>
          <View className='page__summary-item'>
            <View className='page__summary-label'>今日任务</View>
            <View className='page__summary-value'>上新 / 录单</View>
          </View>
          <View className='page__summary-item'>
            <View className='page__summary-label'>终端定位</View>
            <View className='page__summary-value'>门店工作台</View>
          </View>
        </View>
      </View>

      <View className='card auth-form'>
        <View className='section-title'>账号登录</View>
        <View className='section-desc'>延续后台权限体系，门店同事可直接用现有账号进入工作区。</View>
        <View className='field'>
          <Text className='field__label'>账号</Text>
          <Input className='input' value={username} onInput={(e) => setUsername(e.detail.value)} placeholder='请输入账号' />
        </View>
        <View className='field'>
          <Text className='field__label'>密码</Text>
          <View className='password-field'>
            <Input
              className='input password-field__input'
              value={password}
              password={!showPassword}
              onInput={(e) => setPassword(e.detail.value)}
              placeholder='请输入密码'
            />
            <Text className='password-field__toggle' onClick={() => setShowPassword((value) => !value)}>
              {showPassword ? '隐藏' : '显示'}
            </Text>
          </View>
        </View>
        <Button className='button button--primary button--block' loading={loading} onClick={handleSubmit}>
          登录
        </Button>
      </View>
    </View>
  );
}
