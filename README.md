# 宠物之家 · 宠物商城管理系统

一套面向宠物买卖与养宠服务的全栈系统：客户端商城（选宠、AI 智能匹配、购物车下单、预约、问诊、社区互动）+ 自研管理后台（数据看板、宠物/订单/预约/用户/系统管理）。

> 在线演示：商城 <http://47.116.73.25/shop/home> ｜ 后台 <http://47.116.73.25:8083>（`admin / admin123`）

## 界面预览

| 商城首页 | 管理后台 · 数据看板 |
|---|---|
| ![商城首页](docs/screenshots/shop-home.png) | ![数据看板](docs/screenshots/admin-dashboard.png) |

## 功能概览

**客户端商城（pet-web）**
- 宠物浏览与筛选：分类、品种、价格、健康信息、图片画廊
- **AI 智能选宠**：10 道生活场景问卷（居住空间 / 作息 / 经验 / 预算等），基于 96 只宠物特征画像做加权匹配并给出推荐理由
- 购物车与下单：宠物粮、用品加购、数量修改、下单、订单取消（留痕至取消记录）
- 预约看宠：选择门店与时间，支持取消
- 宠物问诊：图文咨询、医生回复、健康档案
- 社区互动：收藏、点赞、评论（宠物 / 宠物粮分表隔离）
- 个人中心：头像上传、昵称修改、我的订单 / 预约 / 收藏

**管理后台（/admin）**
- 数据看板：近 N 天业务趋势、实时数据、环比（预约 / 订单 / 咨询 / 互动 / 取消记录），ECharts 可视化
- 业务管理：宠物资料 / 分类 / 健康档案、预约与工单、订单与退款、商品库存与采购、问诊、收藏点赞评论、智能匹配记录
- 系统管理：用户（含 Excel 批量导入）、角色、菜单、部门、日志、在线用户
- 系统监控：服务器状态、Redis 缓存监控

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Vue 3 + Vite 6 + Element Plus + Pinia + ECharts + SCSS（设计 token 见 `src/styles/`） |
| 后端 | Spring Boot 3.5（JDK 17）+ MyBatis + Spring Security + JWT + Druid |
| 数据 | MySQL 8（46 张表）+ Redis（登录态 / 验证码） |
| 部署 | Nginx 反向代理 + systemd + 阿里云轻量应用服务器（Ubuntu 22.04） |

## 目录结构

```
chongwupet/
├─ pet-web/                 # 前端（Vue3 + Vite）
│  ├─ src/views/shop/       # 商城页面
│  ├─ src/views/admin/      # 自研后台页面
│  ├─ src/views/system/     # 系统管理页面
│  ├─ src/layouts/          # shop / admin 两套布局（admin/menu.js 声明侧栏分组）
│  ├─ src/styles/           # tokens.scss（色彩/尺度）、element.scss（EP 主题）
│  ├─ src/views/error/      # 404
│  ├─ public/images/        # 宠物与商品图片
│  └─ vite.config.js
├─ ruoyi/                   # 后端（Spring Boot 多模块）
│  ├─ ruoyi-admin/          # 启动模块 + 控制器
│  ├─ ruoyi-framework/      # 安全、拦截器、配置
│  ├─ ruoyi-system/         # 业务 Service / Mapper
│  └─ sql/                  # 框架基础表结构
├─ sql/                     # 业务表结构与初始化数据脚本
├─ deploy/                  # 服务器部署脚本与 Nginx/systemd 配置
├─ docs/screenshots/        # 截图
├─ docs/showcase/           # 技术栈展示页存档（不计入构建）
├─ cdp_*.mjs                # 基于 CDP 的浏览器自动化验收脚本
├─ build_web.sh             # 前端生产构建（含 .gz 预压缩）
└─ start_all.sh             # 本地一键启动（后端 + 静态服务 + 隧道）
```

## 前端约定

- **颜色只引用变量**：主色 `var(--brand-500)`，行动色 `var(--brand-600)`，价格 `var(--price)`，语义色 `--success-500 / --warning-500 / --danger-500`（配 `-50 / -100` 浅底），中性色 `--text-1..4`。新增样式不要写十六进制色值；品牌渐变统一用 `--grad-brand`。
- **行动色与装饰色分开**：`--brand-600` 及以上深档才承载白字（7.4:1）；`--brand-300/400` 只用于描边、图形和图表，不做小字白底的背景。
- **主色只在 `styles/element.scss` 覆盖**：`--el-color-primary` 及其 light/dark 衍生值在此定义，页面里不要再写 `:deep(.el-button--primary)` 补丁。主按钮为绿底白字。
- **价格只用 `var(--price)`**：不要再用 `--danger-500` 当价格色，红色只保留给删除、失败、已售。
- **一级导航固定 5 项**（在售宠物 / AI 选宠 / 宠物粮 / 服务保障 / 问诊社区），个人事务（订单 / 预约 / 收藏 / 资料）一律进头像菜单，不再横向堆在导航里。
- **断点只有五档**：480 / 768 / 1000 / 1240 / 1400，媒体查询里不出现其他数值；JS 里的 `matchMedia` 必须与之对齐。
- **容器只有三档**：`--container-lg`（1200，列表网格）/ `--container-md`（1100，详情与表单）/ `--container-sm`（860，对话与窄栏）。
- **页面不写 `min-height: 100vh`**：商城壳的内容区已做成拉伸容器，页面撑满由布局负责。
- **后台加页面**：`router/index.js` 写一条带 `meta: { title, perm, icon }` 的路由 → 在 `layouts/admin/menu.js` 把路径放进对应分组。侧栏、顶栏标题、菜单权限都从这一处派生，不需要再改模板。
- **概览卡片**：用 `components/StatCards.vue`，`tone` 语义为 `brand`（推进中）/ `warn`（待处理）/ `success`（已完结）/ `danger`（异常）/ `money`（金额）。

## 本地运行

前置：JDK 17、Maven 3.9+、MySQL 8、Redis 5+、Node 18+。

```bash
# 1) 建库并导入（库名 ry-pet）
mysql -uroot -p --default-character-set=utf8mb4 -e "CREATE DATABASE \`ry-pet\` DEFAULT CHARSET utf8mb4;"
mysql -uroot -p --default-character-set=utf8mb4 ry-pet < ruoyi/sql/ry_20260417.sql
mysql -uroot -p --default-character-set=utf8mb4 ry-pet < sql/pet_business.sql

# 2) 后端（8081）
cd ruoyi && mvn clean package -DskipTests
java -jar ruoyi-admin/target/ruoyi-admin.jar --server.port=8081

# 3) 前端（生产包 + 静态服务，避免 vite dev 的首屏性能问题）
cd ..
npm --prefix pet-web install
bash build_web.sh
node static-server.mjs --port 82 --root ./pet-web/dist --api /dev-api=http://localhost:8081
```

访问 <http://localhost:82/shop/home>，后台 <http://localhost:82/admin>。

> 默认账号：`admin / admin123`（管理员）、`ry / admin123`（普通角色，用于权限验证）

## 服务器部署

`deploy/` 内含完整部署物料（后端 jar、前端产物、数据库导出、systemd 与 Nginx 配置、一键脚本），详见 [deploy/README.md](deploy/README.md)。

```bash
scp -r deploy/ root@<公网IP>:/root/pet-deploy
ssh root@<公网IP> 'cd /root/pet-deploy && bash deploy.sh'
```

部署后：商城 `http://<IP>/shop/home`，后台 `http://<IP>:8083`。后端仅监听 `127.0.0.1:8081`，由 Nginx 反代，MySQL / Redis 均不对外暴露。

## 自动化验收

项目内的 `cdp_*.mjs` 使用 Chrome DevTools Protocol 跑真实浏览器用例（登录、看板、匹配问卷、上传、窄屏适配、后台权限门禁）：

```bash
node cdp_remote_check.mjs          # 公网站点渲染 + 控制台错误检查
node cdp_admin_gate.mjs http://localhost:83   # 后台仅管理员可进入
node cdp_nav_shot.mjs              # 导航栏多宽度截图
```

## 说明

- 本项目基于 RuoYi-Vue3 脚手架二次开发，业务模块（宠物、订单、预约、问诊、匹配、看板）均为自研。
- 仓库不含依赖目录、构建产物、数据库导出与服务器凭据（见 `.gitignore`）。
