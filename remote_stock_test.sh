#!/usr/bin/env bash
# 线上验证：顾客登录可见全部宠物 + 库存随支付扣减/取消回补（在服务器本机执行）
set -u
B=http://127.0.0.1:8081
q() { mysql -uroot -pPetShop2026 --default-character-set=utf8mb4 -N ry-pet -e "$1" 2>/dev/null; }

q "INSERT INTO sys_user (user_name, nick_name, password, status, del_flag, create_by, create_time)
   SELECT 'custest','顾客测试','cust123456','0','0','test',NOW() FROM DUAL
   WHERE NOT EXISTS (SELECT 1 FROM sys_user WHERE user_name='custest');
   DELETE FROM pet_staff WHERE user_id=(SELECT user_id FROM sys_user WHERE user_name='custest');"

login() {
  cap=$(curl -s $B/captchaImage)
  uuid=$(echo "$cap" | grep -o '"uuid":"[^"]*"' | cut -d'"' -f4)
  code=$(redis-cli GET captcha_codes:$uuid | tr -d '"' | tail -1)
  curl -s -H 'Content-Type: application/json' \
    -d "{\"username\":\"$1\",\"password\":\"$2\",\"code\":\"$code\",\"uuid\":\"$uuid\"}" \
    $B/login | grep -o '"token":"[^"]*"' | cut -d'"' -f4
}

CT=$(login custest cust123456)
echo "custest token: ${CT:0:16}..."
total=$(curl -s -H "Authorization: Bearer $CT" "$B/pet/info/list?pageNum=1&pageSize=5" | grep -o '"total":[0-9]*' | cut -d: -f2)
echo "[检查1] 顾客登录看到宠物总数 = $total （期望 96）"

before=$(q "SELECT stock FROM pet_goods_sku WHERE sku_id=2")
echo "支付前 sku2 库存 = $before"
ono=$(curl -s -H "Authorization: Bearer $CT" -H 'Content-Type: application/json' \
  -d '[{"goodsId":2,"skuId":2,"qty":1,"goodsName":"测试-全价成猫鲜肉猫粮"}]' \
  $B/pet/cart/submit | grep -o '"orderNo":"[^"]*"' | cut -d'"' -f4)
echo "submit: $ono"
mid=$(q "SELECT stock FROM pet_goods_sku WHERE sku_id=2")
echo "[检查2] 下单后库存 = $mid （期望仍 $before）"
pay=$(curl -s -H "Authorization: Bearer $CT" -H 'Content-Type: application/json' -d '{"payMethod":"alipay"}' $B/pet/cart/pay/$ono)
echo "pay: $pay"
after=$(q "SELECT stock FROM pet_goods_sku WHERE sku_id=2")
log=$(q "SELECT change_type,qty,before_qty,after_qty FROM pet_stock_log WHERE biz_no='$ono' AND change_type='2'")
echo "[检查3] 支付后库存 = $after （期望 $((before-1))），流水: $log"

AT=$(login admin admin123)
can=$(curl -s -H "Authorization: Bearer $AT" -H 'Content-Type: application/json' -d '{"reason":"测试回补"}' -X POST $B/pet/order/cancel/$ono)
echo "cancel: $can"
restored=$(q "SELECT stock FROM pet_goods_sku WHERE sku_id=2")
echo "[检查4] 取消已付订单后库存 = $restored （期望 $before）"

q "DELETE FROM sys_user WHERE user_name='custest';
   DELETE FROM pet_payment_log WHERE order_no='$ono';
   DELETE FROM pet_stock_log WHERE biz_no='$ono';
   DELETE i FROM pet_order_item i JOIN pet_order o ON o.order_id=i.order_id WHERE o.order_no='$ono';
   DELETE FROM pet_cancel_record WHERE ref_id=(SELECT order_id FROM pet_order WHERE order_no='$ono');
   DELETE FROM pet_notification WHERE order_id=(SELECT order_id FROM pet_order WHERE order_no='$ono');
   DELETE FROM pet_order WHERE order_no='$ono';"
echo "cleanup done"
