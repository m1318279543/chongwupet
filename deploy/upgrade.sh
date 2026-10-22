#!/usr/bin/env bash
# 宠物商城 · 已有部署的升级脚本（老库 → 平台化版本）
# 前提：服务器上已用 deploy.sh 部署过旧版（/opt/pet 存在、ry-pet 库存在）
# 用法：把 deploy 目录整个传上去后执行  sudo bash upgrade.sh
set -euo pipefail

APP=/opt/pet
DB_NAME="ry-pet"
SRC="$(cd "$(dirname "$0")" && pwd)"

# ---- 前置检查 ----
if ! mysql -N -e "SHOW DATABASES LIKE '$DB_NAME'" | grep -q "$DB_NAME"; then
  echo "!! 数据库 $DB_NAME 不存在，请用 deploy.sh 全新部署"; exit 1
fi
if [ ! -d "$APP/app" ]; then
  echo "!! $APP/app 不存在，请先用 deploy.sh 完成首次部署"; exit 1
fi

echo "==> [1/5] 数据库迁移（12 个平台化补丁，可重复执行）"
mysql --default-character-set=utf8mb4 "$DB_NAME" < "$SRC/pet_upgrade.sql"
TABLES=$(mysql -N -e "SELECT COUNT(*) FROM information_schema.tables
  WHERE table_schema='$DB_NAME' AND table_name IN
  ('pet_store','pet_staff','pet_customer','pet_owner','pet_service_item','pet_service_order',
   'pet_service_log','pet_goods','pet_goods_sku','pet_stock_log','pet_order','pet_order_item',
   'pet_refund','pet_purchase','pet_purchase_item')")
echo "    平台化新表已就位：$TABLES / 15"
if [ "$TABLES" != "15" ]; then echo "    !! 新表数量不对，请检查上面的报错"; exit 1; fi

echo "==> [2/5] 更新后端 jar"
cp -f "$SRC/ruoyi-admin.jar" "$APP/app/ruoyi-admin.jar"

echo "==> [3/5] 更新前端"
rm -rf "$APP"/web/*
tar -xzf "$SRC/web.tar.gz" -C "$APP/web"
echo "    前端 $(find "$APP/web" -type f | wc -l) 个文件"

echo "==> [4/5] 重启后端"
systemctl restart pet
ok=0
for i in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 http://127.0.0.1:8081/pet/category/list || true)
  if [ "$code" = "200" ]; then echo "    后端已就绪（约 $((i*2))s）"; ok=1; break; fi
  sleep 2
done
if [ "$ok" = "0" ]; then
  echo "    !! 后端未就绪，日志尾部："
  tail -30 "$APP/logs/backend.log" || true
  exit 1
fi

echo "==> [5/5] 自检"
systemctl reload nginx 2>/dev/null || true
printf "    商城首页 : %s\n" "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1/shop/home)"
printf "    后台入口 : %s\n" "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8083/)"
printf "    门店接口 : %s\n" "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8081/pet/store/options)"
echo
echo "升级完成。新增后台菜单：订单管理 / 退款管理 / 采购管理（管理员自动可见，店长需重新登录刷新权限）"
