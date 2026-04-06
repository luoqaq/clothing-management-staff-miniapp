import { defineConfig } from '@tarojs/cli';
import devConfig from './dev';
import prodConfig from './prod';

export default defineConfig<'webpack5'>(async (merge, { command, mode }) => {
  const defaultApiBaseUrl = 'https://clothing.chuchu9.cn/api';
  const baseConfig = {
    projectName: 'clothing-management-staff-miniapp',
    date: '2026-03-23',
    designWidth: 750,
    deviceRatio: {
      640: 2.34 / 2,
      750: 1,
      828: 1.81 / 2,
    },
    sourceRoot: 'src',
    outputRoot: 'dist',
    framework: 'react',
    compiler: 'webpack5',
    plugins: ['@tarojs/plugin-framework-react', '@tarojs/plugin-platform-weapp'],
    defineConstants: {
      'process.env.TARO_APP_API_BASE_URL': JSON.stringify(
        process.env.TARO_APP_API_BASE_URL || defaultApiBaseUrl
      ),
    },
    mini: {
      postcss: {
        pxtransform: {
          enable: true,
          config: {},
        },
        url: {
          enable: true,
          config: {
            limit: 1024,
          },
        },
        cssModules: {
          enable: false,
        },
      },
    },
  };

  if (command === 'build') {
    return merge({}, baseConfig, mode === 'production' ? prodConfig : devConfig);
  }

  return merge({}, baseConfig, devConfig);
});
