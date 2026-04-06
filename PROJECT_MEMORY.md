# 店铺运营小程序 - 项目记忆

最近更新：2026-04-05

## 会话更新（2026-04-05）
- 已修复小程序新建商品时图片上传失败问题：
  - 原因：上传工具此前会把 `chooseMedia` 返回的临时路径强制改写为 `wxfile://tmp/...` 后再读文件
  - 现状：微信开发者工具当前返回的临时文件路径不一定能直接映射到该格式，导致 `readFile:fail no such file or directory`
  - 修复：`src/utils/upload.ts` 改为“原始路径优先、转换路径兜底”的文件读取与 `getFileInfo` 策略，不再依赖单一路径格式
  - 补充：上传凭证申请时的文件名改为从原始临时路径提取，避免路径转换影响文件名识别
- 本次验证已执行：
  - `npm run build:weapp` 通过

## 会话更新（2026-04-05）
- 已在商品详情页「门店录单」区域新增"直接录单"功能：
  - 位置：商品详情页底部「门店录单」面板
  - 交互：选中规格、设置数量后，点击"直接录单"按钮
  - 逻辑：通过 `setDirectOrderItem` 将单品暂存，跳转 `order-create?mode=direct`
  - 复用：复用现有单品直购链路（与扫码结果页的"直接下单"共用同一套存储和页面逻辑）
  - UI 调整：「加入购物车」和「直接录单」并排显示，「查看购物车」改为通栏次要按钮置于下方
  - 文案：区域描述从"选好规格和数量后放入购物车"改为"选好规格和数量后，可加入购物车或直接录单"
- 本次验证已执行：
  - `npm run build:weapp` 通过

## 会话更新（2026-04-04）

## 会话更新（2026-04-04）
- 已在工作台快捷入口添加"扫码录单"入口：
  - 位置：工作台页面「快捷入口」区域
  - 图标：扫
  - 功能：调用微信扫码（支持二维码/一维条码），识别后跳转到扫码结果页
  - 交互：扫码失败或用户取消时给出适当提示
- 本次验证已执行：
  - `npm run build:weapp` 通过

## 会话更新（2026-04-04）

## 会话更新（2026-04-04）
- 已调整小程序 API 基地址切换策略：
  - `npm run dev:weapp` 默认连接线上 `https://clothing.chuchu9.cn/api`
  - `npm run build:weapp` 默认连接线上 `https://clothing.chuchu9.cn/api`
  - 新增 `npm run dev:weapp-test`，默认连接本地 `http://127.0.0.1:3000/api`
- 已同步更新 `config/index.ts` 与 `README.md`，避免继续误以为开发态默认走本地
- 本次验证已执行：
  - `npm run build:weapp` 通过
  - `TARO_APP_API_BASE_URL=http://127.0.0.1:3000/api npx taro build --type weapp` 通过

## 会话更新（2026-04-04）
- 已完成小程序扫码销售闭环第一期：
  - 新增页面 `pages/scan-result`
  - 商品页与购物车页新增“扫码识别 / 继续扫码”入口
  - 通过微信扫码能力识别二维码或一维条码
- 扫码结果页当前支持：
  - 展示脱敏 SKU 销售信息：商品名、款号、颜色尺码、售价、库存、规格编码、标签码、主图
  - 支持“加入购物车”
  - 支持“直接下单”
  - 支持识别失败后继续扫码
- “直接下单”当前实现方式：
  - 通过本地 `DIRECT_ORDER_KEY` 暂存单个扫码商品
  - 复用现有录单页 `/pages/order-create/index?mode=direct`
  - 直接下单不污染原购物车
- 小程序商品创建页已移除手填条码主流程，改为“保存后自动生成”
- 本次验证已执行：
  - `npm run build:weapp` 通过

## 会话更新（2026-04-04）
- 已切换小程序生产构建默认 API 基地址到线上 HTTPS：
  - `config/prod.ts` 现默认指向 `https://clothing.chuchu9.cn/api`
  - 仍可通过 `TARO_APP_API_BASE_URL` 覆盖，开发态默认值保持本地 `http://127.0.0.1:3000/api`
- 已同步后台最近的客户档案录单逻辑到小程序：
  - 门店录单页新增“客户邮箱”“年龄段”字段
  - 提交订单时会把 `customerEmail` 与 `ageBucketId` 一并传给后端
  - 已增加小程序侧邮箱格式校验
- 本次为小程序补充了移动端年龄段读取链路：
  - 新增 `GET /api/mobile/customers/age-buckets` 只读接口供小程序使用
- 本次验证已执行：
  - `npm run build:weapp` 通过

## 会话更新（2026-04-01）
- 已移除小程序登录页默认预填账号密码：
  - 登录表单初始值改为空，不再默认带出管理员账号密码
  - 避免在门店终端直接暴露测试或默认凭据
- 本次验证已执行：
  - `npm run build:weapp` 通过

## 会话更新（2026-04-01）
- 已完成管理员/销售角色 v1 小程序适配：
  - 角色类型已补充 `sales`，并将历史 `manager/staff` 统一按销售能力和文案处理
  - 非管理员已不再显示工作台中的“轻量上新”快捷入口
  - 商品创建页对非管理员会直接拦截并返回商品列表
- 已确认销售视角不再暴露供应商与成本价：
  - 商品列表、详情、录单相关页面继续仅展示销售价、库存等可见信息
  - 小程序 `/api/mobile/product-options` 现已配合后端对销售隐藏供应商列表
- 本次验证已执行：
  - `npm run build:weapp` 通过

## 会话更新（2026-03-27）
- 已新增仓库 `README.md`，补充项目定位、页面清单、启动方式、微信开发者工具导入、接口约定、目录结构与当前 UI 状态说明
- 本次验证已执行：
  - 已检查 `README.md` 文件生成并完成内容回读

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
