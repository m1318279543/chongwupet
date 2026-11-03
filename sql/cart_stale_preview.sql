-- 结算后购物车残留清理：删除与本人「已支付订单」同款、且创建时间早于该单支付时间的购物车条目
SELECT ci.cart_item_id, ci.user_id, ci.goods_name, ci.qty, ci.create_time
FROM pet_cart_item ci
JOIN pet_order o ON o.user_id = ci.user_id AND o.pay_status='1' AND o.del_flag='0'
JOIN pet_order_item oi ON oi.order_no = o.order_no
WHERE ci.create_time <= o.pay_time
  AND ((oi.item_type='2' AND oi.pet_id=ci.pet_id)
    OR (oi.item_type='1' AND oi.goods_id=ci.goods_id
        AND ((oi.sku_id IS NULL AND ci.sku_id IS NULL) OR oi.sku_id=ci.sku_id)))
GROUP BY ci.cart_item_id, ci.user_id, ci.goods_name, ci.qty, ci.create_time;
