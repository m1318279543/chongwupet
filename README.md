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
- 业务管理：宠物资料、分类、预约、购物车、取消记录、问诊、评论点赞
- 系统管理：用户（含 Excel 批量导入）、角色、菜单、部门、日志、在线用户
- 系统监控：服务器状态、Redis 缓存监控

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Vue 3 + Vite 6 + Element Plus + Pinia + ECharts + SCSS |
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
│  ├─ src/layouts/          # shop / admin 两套布局
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
├─ cdp_*.mjs                # 基于 CDP 的浏览器自动化验收脚本
├─ build_web.sh             # 前端生产构建（含 .gz 预压缩）
└─ start_all.sh             # 本地一键启动（后端 + 静态服务 + 隧道）
```

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
node static-server.mjs --port 82 --root ./pet-web/dist-new --api /dev-api=http://localhost:8081
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
