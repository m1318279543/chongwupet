# 宠物商城 · 阿里云轻量服务器部署包

## 包里有什么

| 文件 | 说明 |
|---|---|
| `ruoyi-admin.jar` | 后端（Spring Boot 3 + JDK17），8081 仅本机监听 |
| `web.tar.gz` | 前端生产包（pet-web dist-new，含商城与自研后台） |
| `ry-pet.sql` | 数据库全量导出（46 张表，含宠物/订单/用户/看板数据） |
| `uploads.tar.gz` | 上传文件（头像等），解压为 `/opt/pet/uploadPath` |
| `pet.service` | 后端 systemd 服务 |
| `pet-shop.conf` | Nginx 80 端口（商城前台） |
| `pet-admin.conf` | Nginx 8083 端口（后台独立入口，`/` → `/admin`） |
| `deploy.sh` | 一键部署脚本（Ubuntu 22.04/24.04） |

## 部署前必须做

1. **放行端口**：轻量应用服务器控制台 → 防火墙，放行
   - `22`（SSH）
   - `80`（商城）
   - `8083`（后台入口）
   - **不要**放行 3306 / 6379 / 8081
2. 确认内存 ≥ 2G（1G 需把 `-Xmx512m` 调成 `-Xmx320m`，并确保 swap 生效）

## 部署步骤

```bash
# 本机上传（把 deploy 整个目录传上去）
scp -r deploy/ root@<公网IP>:/root/pet-deploy

# 服务器上执行
cd /root/pet-deploy
sudo bash deploy.sh
```

## 老版本升级（服务器已有旧版部署时用这个）

平台化改造（门店/客户/服务工单/商品库存/订单主表/宠物下单/退款/采购）之后，**不能只换 jar 和前端**——
服务器库还是旧结构，新接口会全部报错。正确流程：

```bash
# 本机上传（deploy 目录需先在本机组好包：ruoyi-admin.jar / web.tar.gz / pet_upgrade.sql / uploads.tar.gz）
scp -r deploy/ root@<公网IP>:/root/pet-deploy

# 服务器上执行（迁移数据库 → 换 jar → 换前端 → 重启 → 自检）
cd /root/pet-deploy
sudo bash upgrade.sh
```

- `pet_upgrade.sql` 合并了全部 12 个平台化补丁，**可重复执行**（跑几次都一样），首跑前无需备份也不会丢数据
- 升级后新增后台菜单：订单管理、退款管理、采购管理；店长账号需**退出重登**刷新权限
- 演示前重置某只被锁定的宠物：`UPDATE pet_info SET status='0' WHERE pet_id=?;`

## 部署后

- 商城：`http://<公网IP>/shop/home`
- 后台：`http://<公网IP>:8083` （自动跳 `/admin`，admin / admin123）
- 后端日志：`tail -f /opt/pet/logs/backend.log`
- 服务管理：`systemctl {status|restart|stop} pet`

## 后续换域名（备案通过后）

1. 域名解析 A 记录到公网 IP
2. 把 `pet-shop.conf` 的 `server_name _;` 改成域名，`listen 80;` 保持
3. 用 certbot 申请证书：`apt install certbot python3-certbot-nginx && certbot --nginx -d yourdomain.com`
4. 后台入口可改成 `admin.yourdomain.com`（复制一份 server 块，listen 443 + 证书）

## 已知注意点

- 数据库账号：`pet`（密码在 `deploy.sh` 顶部 `DB_PASS` 处设置，或通过环境变量 `PET_DB_PASS` 传入），只授权 `ry-pet` 库
- 后端绑定 `127.0.0.1:8081`，公网访问不到，只能通过 Nginx 反代，安全
- 前端生产包 API 前缀是 `/dev-api`，Nginx 用 `proxy_pass http://127.0.0.1:8081/`（带尾斜杠）自动剥掉前缀
- 上传路径通过 `--ruoyi.profile=/opt/pet/uploadPath` 覆盖，jar 内配置仍是 Windows 路径，不用改包
- 若系统时间/时区不对，会导致看板与订单时间差 8 小时：`timedatectl set-timezone Asia/Shanghai`
