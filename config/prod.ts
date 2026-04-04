export default {
  defineConstants: {
    'process.env.TARO_APP_API_BASE_URL': JSON.stringify(
      process.env.TARO_APP_API_BASE_URL || 'https://clothing.chuchu9.cn/api'
    ),
  },
};
