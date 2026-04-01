import { useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { Button, Input, Text, View } from '@tarojs/components';
import { login } from '../../services/auth';
import { isAuthenticated } from '../../utils/auth';
import { setToken, setUser } from '../../utils/storage';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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
            <View className='page__eyebrow'>Welcome Back</View>
            <View className='page__title page__title--light'>登录你的店铺工作台</View>
            <View className='page__subtitle page__subtitle--light'>登录后你可以继续查商品、录订单和处理门店日常工作。</View>
          </View>
        </View>
        <View className='page__summary'>
          <View className='page__summary-item'>
            <View className='page__summary-label'>登录后可用</View>
            <View className='page__summary-value'>查货 / 录单</View>
          </View>
          <View className='page__summary-item'>
            <View className='page__summary-label'>当前入口</View>
            <View className='page__summary-value'>门店工作台</View>
          </View>
        </View>
      </View>

      <View className='card auth-form'>
        <View className='section-title'>账号登录</View>
        <View className='section-desc'>请输入你的账号和密码，进入今天的工作区。</View>
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
