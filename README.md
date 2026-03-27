# clothing-management-staff-miniapp

店铺运营协同小程序，面向门店与店长侧的商品、图片、购物车和订单处理场景。

## 项目定位

- 技术栈：`Taro + React + TypeScript`
- 终端形态：微信小程序
- 业务角色：`admin`、`manager`、`staff`
- 业务定位：ToB 店铺运营协同端，不引入 ToC 用户模型

当前主要用于以下场景：

- 使用后台账号直接登录小程序
- 查看工作台摘要
- 查询商品、查看详情与库存
- 新增商品并上传主图/详情图
- 把商品加入购物车并提交门店订单
- 查看订单列表、订单详情与状态流转
- 查看当前登录账号信息

## 页面清单

- 登录：`pages/login`
- 工作台：`pages/dashboard`
- 商品列表：`pages/products`
- 商品详情：`pages/product-detail`
- 新增商品：`pages/product-create`
- 购物车：`pages/cart`
- 门店录单：`pages/order-create`
- 订单列表：`pages/orders`
- 订单详情：`pages/order-detail`
- 我的：`pages/profile`

## 运行环境

- Node.js：建议使用当前 LTS 版本
- 包管理器：`npm`
- 小程序构建：Taro `4.1.11`

## 安装与启动

安装依赖：

```bash
npm install
```

启动微信小程序开发构建：

```bash
npm run dev:weapp
```

生产构建：

```bash
npm run build:weapp
```

构建产物默认输出到：

```text
dist/
```

## 微信开发者工具导入

1. 先执行 `npm run dev:weapp` 或 `npm run build:weapp`
2. 打开微信开发者工具
3. 导入目录选择当前仓库下的 `dist`
4. AppID 使用仓库内已配置好的项目配置

常用路径：

- 仓库目录：`/Users/luo/Project/clothing-management-staff-miniapp`
- 构建目录：`/Users/luo/Project/clothing-management-staff-miniapp/dist`

## 接口与后端约定

- 默认接口基地址读取 `TARO_APP_API_BASE_URL`
- 缺省值：`http://127.0.0.1:3000/api`
- 小程序业务接口统一走：`/api/mobile`
- 当前认证接口：
  - `POST /auth/login`
  - `GET /auth/me`
  - `POST /auth/logout`

图片上传链路：

- 先在小程序端做压缩
- 再调用后端签发上传凭证
- 继续复用 `/api/assets/upload-policy`
- 最终通过 `cos-wx-sdk-v5` 直传 COS

## 目录结构

```text
.
├── config/                 # Taro 构建配置
├── src/
│   ├── assets/             # 静态资源（如 tabBar 图标）
│   ├── constants/          # 常量
│   ├── pages/              # 页面
│   ├── services/           # 接口请求封装
│   ├── types/              # 类型定义
│   ├── utils/              # 工具函数、存储、鉴权、上传等
│   ├── app.config.ts       # 小程序全局配置
│   ├── app.scss            # 全局样式
│   └── app.tsx             # 应用入口
├── PROJECT_MEMORY.md       # 项目记忆
└── AGENTS.md               # 仓库协作约束
```

## 当前 UI 状态

当前已完成一轮全站视觉升级，整体风格为轻奢服饰感：

- 米白底 + 炭黑字 + 金棕点缀
- 登录、工作台、商品、订单、购物车、详情页、创建页、个人中心已统一风格
- tabBar 图标已重做

核心样式入口：

- `src/app.scss`
- `src/app.config.ts`

## 常见开发说明

- 管理权限判断由前端 `hasManagerAccess` 控制，当前 `admin` 和 `manager` 可执行上新、图片补传等操作
- 当前登录页默认演示账号值为 `admin / admin123`，实际是否可登录取决于后端用户数据
- 购物车数据、token 和用户信息保存在本地存储中

## 已知事项

- 图片压缩当前主要依赖 `Taro.compressImage` 的质量压缩，尚未额外做尺寸重采样
- 如果后续需要严格限制最长边，建议补一层基于 canvas 的缩放逻辑
- 本仓库忽略了 `dist`、`node_modules`、`.swc` 等本地产物，提交代码时不要把构建输出带入版本库
