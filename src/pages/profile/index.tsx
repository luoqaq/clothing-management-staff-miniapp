import { useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { Button, Text, View } from '@tarojs/components';
import { getCurrentUser as getCurrentUserApi, logout } from '../../services/auth';
import { User } from '../../types';
import { formatRole } from '../../utils/format';
import { logoutLocally, requireAuth } from '../../utils/auth';
import { getCurrentUser } from '../../utils/auth';
import { setUser } from '../../utils/storage';

export default function ProfilePage() {
  const [user, setLocalUser] = useState<User | undefined>(getCurrentUser() || undefined);

  useDidShow(() => {
    if (!requireAuth()) {
      return;
    }

    void (async () => {
      try {
        const currentUser = await getCurrentUserApi();
        setUser(currentUser);
        setLocalUser(currentUser);
      } catch (error: any) {
        Taro.showToast({ title: error.message || '加载信息失败', icon: 'none' });
      }
    })();
  });

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // 忽略退出接口失败，优先清理本地态
    } finally {
      logoutLocally();
      Taro.reLaunch({ url: '/pages/login/index' });
    }
  };

  return (
    <View className='page page--profile'>
      <View className='page__hero'>
        <View className='page__eyebrow'>Account</View>
        <View className='page__title page__title--light'>我的</View>
        <View className='page__subtitle page__subtitle--light'>当前登录账号的角色信息与退出操作。</View>
      </View>
      <View className='panel profile-card'>
        <View className='profile-card__name'>{user?.name || user?.username || '未登录'}</View>
        <View className='caption'>门店协同账号摘要</View>
        <View className='profile-card__meta'>
          <View className='profile-card__line'>
            <Text>角色</Text>
            <Text>{user ? formatRole(user.role) : '-'}</Text>
          </View>
          <View className='profile-card__line'>
            <Text>邮箱</Text>
            <Text>{user?.email || '-'}</Text>
          </View>
          <View className='profile-card__line'>
            <Text>账号</Text>
            <Text>{user?.username || '-'}</Text>
          </View>
        </View>
      </View>
      <View className='panel panel--soft'>
        <Button className='button button--danger button--block' onClick={handleLogout}>
          退出登录
        </Button>
      </View>
    </View>
  );
}
