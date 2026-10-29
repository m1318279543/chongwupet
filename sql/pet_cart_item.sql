-- 前台购物车（按账号持久化）：登录用户的待结算条目
-- 与 pet_cart（订单快照）分离：pet_cart_item 只存「还没下单」的购物车内容
CREATE TABLE IF NOT EXISTS `pet_cart_item` (
  `cart_item_id` BIGINT       NOT NULL AUTO_INCREMENT COMMENT '购物车条目ID',
  `user_id`      BIGINT       NOT NULL                COMMENT '用户ID',
  `item_type`    CHAR(1)      NOT NULL DEFAULT '1'    COMMENT '类型：1商品（宠物粮等） 2宠物',
  `pet_id`       BIGINT       DEFAULT NULL            COMMENT '宠物ID（itemType=2 时必填）',
  `goods_id`     BIGINT       DEFAULT NULL            COMMENT '商品ID（itemType=1）',
  `sku_id`       BIGINT       DEFAULT NULL            COMMENT 'SKU ID',
  `goods_name`   VARCHAR(200) NOT NULL                COMMENT '商品名称',
  `goods_image`  VARCHAR(500) DEFAULT ''              COMMENT '商品图片',
  `goods_spec`   VARCHAR(200) DEFAULT ''              COMMENT '商品规格',
  `price`        DECIMAL(10,2) NOT NULL DEFAULT 0.00  COMMENT '单价',
  `qty`          INT          NOT NULL DEFAULT 1      COMMENT '数量（宠物恒为1）',
  `checked`      CHAR(1)      NOT NULL DEFAULT '1'    COMMENT '是否选中：1是 0否',
  `create_time`  DATETIME     DEFAULT CURRENT_TIMESTAMP COMMENT '加入时间',
  `update_time`  DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`cart_item_id`),
  KEY `idx_user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COMMENT='前台购物车（按账号持久化）';
