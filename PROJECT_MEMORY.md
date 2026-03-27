# 店铺运营小程序 - 项目记忆

最近更新：2026-03-27

## 会话更新（2026-03-27）
- 已完成员工小程序全站视觉重设计，统一为轻奢服饰感风格：
  - 重写 `src/app.scss`，建立米白/炭黑/金棕的全局设计 token、按钮、表单、列表、详情与空状态样式
  - 登录、工作台、商品、订单、购物车、详情页、创建页、个人中心均已切换为新的页面头部区、分组区和操作区结构
  - 已重做 `src/assets/tabbar/*` 图标资源，并同步调整 `src/app.config.ts` 的导航栏与 tabBar 配色
- 本次验证已执行：
  - `npm run build:weapp` 通过

## 会话更新（2026-03-27）
- 小程序商品建档已从“品牌”切换为“供应商”：
  - `Product`、`CreateProductPayload`、`ProductFilters`、`ProductOptions` 已改为 `supplierId` / `supplier` / `suppliers`
  - 新增商品页的选项选择器与展示文案已同步改为供应商
  - 继续兼容后端 `/api/mobile/product-options` 返回的 `suppliers`
- 本次验证已执行：
  - `npm run build:weapp` 通过

## 会话更新（2026-03-24）
- 登录页密码输入框已支持手动切换明文/密文显示
- 本次验证已执行：
  - `npm run build:weapp` 通过
## 会话更新（2026-03-23）
- 已新建仓库级骨架：`/Users/luo/Project/clothing-management-staff-miniapp`
- 技术栈确定为 `Taro + React + TypeScript`
- 当前已落地页面与模块：
  - 登录
  - 工作台
  - 商品列表
  - 商品详情
  - 新增商品
  - 购物车
  - 录单
  - 订单列表
  - 订单详情
  - 个人中心
- 当前接入约定：
  - 小程序请求基地址默认读 `TARO_APP_API_BASE_URL`，缺省值为 `http://127.0.0.1:3000/api`
  - 移动端业务接口走 `/api/mobile`
  - 图片上传凭证继续复用 `/api/assets/upload-policy`
- 已补充 Taro 构建所需工程依赖：
  - `babel-preset-taro`
  - `@babel/preset-react`
  - `@babel/preset-typescript`
  - 根目录 `babel.config.js`
- 当前图片上传链路：
  - 小程序端先做压缩，再通过 `cos-wx-sdk-v5` 直传 COS
  - 上传场景沿用 `biz=product` 与 `scene=main|detail`
- 当前验证结果：
  - `npm install` 已完成
  - `npm run build:weapp` 已通过
  - 已更新真实 AppID，可直接导入微信开发者工具联调

## 启动手册
- 安装依赖：`npm install`
- 微信小程序开发构建：`npm run dev:weapp`
- 生产构建：`npm run build:weapp`

## 已知风险
- 小程序端图片压缩当前优先依赖 `Taro.compressImage` 的质量压缩，未额外做尺寸重采样。
- 如果后续需要严格满足“最长边 1600/2000px”，建议补一层基于 canvas 的尺寸缩放实现。
- 当前微信小程序 AppID 已更新为已提供的真实值，微信开发者工具可直接按该项目导入联调。
