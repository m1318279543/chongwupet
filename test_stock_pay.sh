#!/usr/bin/env bash
# 本地验证：① 无员工归属的顾客登录能看到全部宠物 ② 库存随支付扣减、取消已付订单回补
set -u
B=http://127.0.0.1:8081
MYSQL="C:/Program Files/MySQL/MySQL Server 8.0/bin/mysql.exe"
q() { "$MYSQL" -uroot -p123456 --default-character-set=utf8mb4 -N ry-pet -e "$1" 2>/dev/null; }

# 等后端就绪
for i in $(seq 1 60); do
  c=$(curl -s -o /dev/null -w '%{http_code}' --noproxy '*' $B/pet/store/options 2>/dev/null)
  [ "$c" = "200" ] && break; sleep 2
done
echo "backend ready: $c"

# 1) 建无员工归属的顾客账号
q "INSERT INTO sys_user (user_name, nick_name, password, status, del_flag, create_by, create_time)
   SELECT 'custest','顾客测试','cust123456','0','0','test',NOW()
   FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM sys_user WHERE user_name='custest');
   DELETE FROM pet_staff WHERE user_id=(SELECT user_id FROM sys_user WHERE user_name='custest');"

login() { # $1 user $2 pass -> token
  cap=$(curl -s --noproxy '*' $B/captchaImage)
  uuid=$(echo "$cap" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).uuid))")
  code=$(D:/Redis/redis-cli.exe GET captcha_codes:$uuid | tr -d '"')
  curl -s --noproxy '*' -H 'Content-Type: application/json' \
    -d "{\"username\":\"$1\",\"password\":\"$2\",\"code\":\"$code\",\"uuid\":\"$uuid\"}" \
    $B/login | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);console.log(j.token||('FAIL '+JSON.stringify(j)))})"
}

CT=$(login custest cust123456)
echo "custest token: ${CT:0:20}..."
T="Authorization: Bearer $CT"

total=$(curl -s --noproxy '*' -H "$T" "$B/pet/info/list?pageNum=1&pageSize=5" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).total))")
echo "[检查1] 顾客登录看到宠物总数 = $total （期望 96）"

# 2) 库存流程：goods 2（sku 2）
before=$(q "SELECT stock FROM pet_goods_sku WHERE sku_id=2")
echo "支付前 sku2 库存 = $before"

ord=$(curl -s --noproxy '*' -H "$T" -H 'Content-Type: application/json' -d '[{"goodsId":2,"skuId":2,"qty":1,"goodsName":"测试-全价成猫鲜肉猫粮"}]' $B/pet/cart/submit)
echo "submit: $ord"
ono=$(echo "$ord" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).data.orderNo))")
mid=$(q "SELECT stock FROM pet_goods_sku WHERE sku_id=2")
echo "[检查2] 下单后库存 = $mid （期望仍为 $before，下单不扣）"

pay=$(curl -s --noproxy '*' -H "$T" -H 'Content-Type: application/json' -d '{"payMethod":"alipay"}' $B/pet/cart/pay/$ono)
echo "pay: $pay"
after=$(q "SELECT stock FROM pet_goods_sku WHERE sku_id=2")
log=$(q "SELECT change_type, qty, before_qty, after_qty, biz_no, remark FROM pet_stock_log WHERE biz_no='$ono' AND change_type='2'")
echo "[检查3] 支付后库存 = $after （期望 $((before-1))），流水: $log"

# 3) 管理员取消已支付订单 → 回补
AT=$(login admin admin123)
can=$(curl -s --noproxy '*' -H "Authorization: Bearer $AT" -H 'Content-Type: application/json' -d '{"reason":"测试回补"}' -X POST $B/pet/order/cancel/$ono)
echo "cancel: $can"
restored=$(q "SELECT stock FROM pet_goods_sku WHERE sku_id=2")
rlog=$(q "SELECT change_type, qty, after_qty FROM pet_stock_log WHERE biz_no='$ono' AND change_type='3'")
echo "[检查4] 取消已付订单后库存 = $restored （期望回补到 $before），流水: $rlog"

# 清理：测试用户与取消订单删除
q "DELETE FROM sys_user WHERE user_name='custest';
   DELETE FROM pet_payment_log WHERE order_no='$ono';
   DELETE FROM pet_stock_log WHERE biz_no='$ono';
   DELETE i FROM pet_order_item i JOIN pet_order o ON o.order_id=i.order_id WHERE o.order_no='$ono';
   DELETE FROM pet_cancel_record WHERE ref_id=(SELECT order_id FROM pet_order WHERE order_no='$ono');
   DELETE FROM pet_notification WHERE order_id=(SELECT order_id FROM pet_order WHERE order_no='$ono');
   DELETE FROM pet_order WHERE order_no='$ono';"
echo "cleanup done"
