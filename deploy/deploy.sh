#!/usr/bin/env bash
# 宠物商城一键部署（Ubuntu 22.04 / 24.04，2C2G 及以上）
# 用法：把 deploy 目录整个传到服务器后，cd 进去执行  sudo bash deploy.sh
set -euo pipefail

APP=/opt/pet
DB_NAME="ry-pet"
DB_USER="pet"
DB_PASS="${PET_DB_PASS:-CHANGE_ME_DB_PASSWORD}"   # 部署前修改，或 export PET_DB_PASS=你的密码
SRC="$(cd "$(dirname "$0")" && pwd)"

echo "==> [0/8] 先补 1G swap（2G 内存必需，避免 OOM）"
if ! swapon --show | grep -q .; then
  if [ ! -f /swapfile ]; then
    fallocate -l 1G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=1024 status=none
    chmod 600 /swapfile
    mkswap /swapfile >/dev/null
  fi
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo "    已启用 1G swap"
else
  echo "    已有 swap，跳过"
fi
sysctl -qw vm.swappiness=10 || true

echo "==> [1/8] 安装依赖（JDK17 / MySQL / Redis / Nginx）"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq --no-install-recommends \
  openjdk-17-jre-headless mysql-server redis-server nginx curl tar ca-certificates tzdata

echo "==> [2/8] 准备目录"
mkdir -p "$APP"/{app,web,uploadPath,logs}
rm -rf "$APP"/web/*
tar -xzf "$SRC/web.tar.gz" -C "$APP/web"
tar -xzf "$SRC/uploads.tar.gz" -C "$APP"
cp -f "$SRC/ruoyi-admin.jar" "$APP/app/ruoyi-admin.jar"
echo "    前端 $(find "$APP/web" -type f | wc -l) 个文件，jar $(du -h "$APP/app/ruoyi-admin.jar" | cut -f1)"

echo "==> [3/8] MySQL 小内存调优并启动"
cat > /etc/mysql/mysql.conf.d/zz-pet.cnf <<'CNF'
[mysqld]
innodb_buffer_pool_size = 256M
performance_schema = OFF
max_connections = 200
character-set-server = utf8mb4
collation-server = utf8mb4_general_ci
CNF
systemctl enable --now mysql
for i in $(seq 1 30); do mysqladmin ping -s >/dev/null 2>&1 && break; sleep 1; done

if mysql -N -e "SHOW DATABASES LIKE '$DB_NAME'" | grep -q "$DB_NAME"; then
  echo "    数据库已存在，跳过导入（如需覆盖请手动处理）"
else
  mysql --default-character-set=utf8mb4 < "$SRC/ry-pet.sql"
  echo "    导入完成，表数：$(mysql -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$DB_NAME'")"
fi
mysql <<SQL
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS';
ALTER USER '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS';
GRANT ALL PRIVILEGES ON \`$DB_NAME\`.* TO '$DB_USER'@'localhost';
CREATE USER IF NOT EXISTS '$DB_USER'@'127.0.0.1' IDENTIFIED BY '$DB_PASS';
ALTER USER '$DB_USER'@'127.0.0.1' IDENTIFIED BY '$DB_PASS';
GRANT ALL PRIVILEGES ON \`$DB_NAME\`.* TO '$DB_USER'@'127.0.0.1';
FLUSH PRIVILEGES;
SQL
echo "    数据库用户 $DB_USER 就绪"

echo "==> [4/8] 启动 Redis"
systemctl enable --now redis-server >/dev/null 2>&1
sleep 1
echo "    redis: $(redis-cli ping 2>/dev/null || echo FAIL)"

echo "==> [5/8] 注册后端服务"
sed "s/__DB_PASS__/$DB_PASS/" "$SRC/pet.service" > /etc/systemd/system/pet.service
systemctl daemon-reload
systemctl enable pet >/dev/null 2>&1
systemctl restart pet
echo "    等待后端启动..."
ok=0
for i in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 http://127.0.0.1:8081/pet/category/list || true)
  if [ "$code" = "200" ]; then echo "    后端已就绪（约 $((i*2))s）"; ok=1; break; fi
  sleep 2
done
if [ "$ok" = "0" ]; then
  echo "    !! 后端未就绪，日志尾部："
  tail -30 "$APP/logs/backend.log" || true
fi

echo "==> [6/8] 配置 Nginx"
cp -f "$SRC/pet-shop.conf" /etc/nginx/sites-available/pet-shop.conf
cp -f "$SRC/pet-admin.conf" /etc/nginx/sites-available/pet-admin.conf
ln -sf /etc/nginx/sites-available/pet-shop.conf /etc/nginx/sites-enabled/pet-shop.conf
ln -sf /etc/nginx/sites-available/pet-admin.conf /etc/nginx/sites-enabled/pet-admin.conf
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable --now nginx >/dev/null 2>&1
systemctl reload nginx

echo "==> [7/8] 内存与端口自检"
free -h | head -2
echo "    监听端口："
ss -ltnp 2>/dev/null | grep -E ':80 |:8083 |:8081 |:3306 |:6379 ' | awk '{print "      " $4 " " $6}'

echo "==> [8/8] 访问自检"
printf "    后端 API : %s\n" "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8081/pet/category/list)"
printf "    商城首页 : %s\n" "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1/shop/home)"
printf "    后台入口 : %s -> %s\n" "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8083/)" "$(curl -s -o /dev/null -w '%{redirect_url}' http://127.0.0.1:8083/)"
printf "    验证码   : %s\n" "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1/dev-api/captchaImage)"
echo
echo "部署完成。"
echo "  商城：http://<服务器公网IP>/shop/home"
echo "  后台：http://<服务器公网IP>:8083   （打开即后台登录页，admin / admin123）"
echo "  日志：tail -f $APP/logs/backend.log"
