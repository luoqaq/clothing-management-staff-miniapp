export default defineAppConfig({
  pages: [
    'pages/login/index',
    'pages/dashboard/index',
    'pages/products/index',
    'pages/product-detail/index',
    'pages/product-create/index',
    'pages/cart/index',
    'pages/order-create/index',
    'pages/orders/index',
    'pages/order-detail/index',
    'pages/profile/index',
  ],
  window: {
    navigationBarBackgroundColor: '#f6f1ea',
    navigationBarTextStyle: 'black',
    backgroundTextStyle: 'light',
    backgroundColor: '#efe7de',
  },
  tabBar: {
    color: '#7b6b5d',
    selectedColor: '#8d6848',
    backgroundColor: '#fbf6f0',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/dashboard/index',
        text: '工作台',
        iconPath: 'assets/tabbar/dashboard.png',
        selectedIconPath: 'assets/tabbar/dashboard-active.png',
      },
      {
        pagePath: 'pages/products/index',
        text: '商品',
        iconPath: 'assets/tabbar/products.png',
        selectedIconPath: 'assets/tabbar/products-active.png',
      },
      {
        pagePath: 'pages/orders/index',
        text: '订单',
        iconPath: 'assets/tabbar/orders.png',
        selectedIconPath: 'assets/tabbar/orders-active.png',
      },
      {
        pagePath: 'pages/profile/index',
        text: '我的',
        iconPath: 'assets/tabbar/profile.png',
        selectedIconPath: 'assets/tabbar/profile-active.png',
      }
    ]
  }
});
