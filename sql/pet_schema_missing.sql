-- ============================================================
-- 补齐缺失的建表语句（2026-10-21）
-- 背景：这三张表在线上库里存在，但仓库的 sql/ 目录从未提交过
--       它们的 CREATE TABLE，只有后续的 ALTER / INSERT 引用。
--       本脚本按实体字段与 Mapper XML 反推还原，保证从 0 建库可复现。
-- 执行顺序：pet_like_comment.sql 之后、shop_enhance.sql 之前。
-- ============================================================

SET NAMES utf8mb4;

-- ① 购物车 / 订单明细（pay_* 字段由 shop_enhance.sql 追加，此处只建基础列）
CREATE TABLE IF NOT EXISTS pet_cart (
  cart_id      BIGINT       NOT NULL AUTO_INCREMENT COMMENT '购物车项ID',
  user_id      BIGINT       NOT NULL                COMMENT '用户ID（关联 sys_user）',
  user_name    VARCHAR(64)  DEFAULT ''              COMMENT '用户账号（冗余）',
  goods_name   VARCHAR(120) NOT NULL                COMMENT '商品名称',
  goods_image  VARCHAR(500) DEFAULT ''              COMMENT '商品图片',
  goods_spec   VARCHAR(120) DEFAULT ''              COMMENT '规格',
  price        DECIMAL(10,2) DEFAULT 0              COMMENT '单价（元）',
  qty          INT          DEFAULT 1               COMMENT '数量',
  amount       DECIMAL(10,2) DEFAULT 0              COMMENT '小计（元）',
  status       CHAR(1)      DEFAULT '0'             COMMENT '状态（0正常 3已取消）',
  create_by    VARCHAR(64)  DEFAULT ''              COMMENT '创建者',
  create_time  DATETIME     DEFAULT NULL            COMMENT '创建时间',
  update_by    VARCHAR(64)  DEFAULT ''              COMMENT '更新者',
  update_time  DATETIME     DEFAULT NULL            COMMENT '更新时间',
  remark       VARCHAR(500) DEFAULT NULL            COMMENT '备注',
  PRIMARY KEY (cart_id),
  KEY idx_cart_user (user_id),
  KEY idx_cart_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='购物车/订单明细';

-- ② 宠物医生咨询记录
CREATE TABLE IF NOT EXISTS pet_doctor_consult (
  consult_id   BIGINT       NOT NULL AUTO_INCREMENT COMMENT '咨询ID',
  user_id      BIGINT       DEFAULT NULL            COMMENT '用户ID（游客为空）',
  user_name    VARCHAR(64)  DEFAULT ''              COMMENT '用户账号',
  question     VARCHAR(800) NOT NULL                COMMENT '提问内容',
  answer       TEXT                                 COMMENT '模型回答',
  source       VARCHAR(20)  DEFAULT 'online'        COMMENT '来源（online/error）',
  model        VARCHAR(64)  DEFAULT ''              COMMENT '模型名',
  match_count  INT          DEFAULT 0               COMMENT '命中知识库条目数',
  ip           VARCHAR(64)  DEFAULT ''              COMMENT '来源IP',
  del_flag     CHAR(1)      DEFAULT '0'             COMMENT '删除标志（0存在 2删除）',
  create_time  DATETIME     DEFAULT NULL            COMMENT '咨询时间',
  remark       VARCHAR(500) DEFAULT NULL            COMMENT '备注',
  PRIMARY KEY (consult_id),
  KEY idx_doc_user (user_id),
  KEY idx_doc_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='宠物医生智能问答记录';

-- ③ 取消记录（订单 / 预约共用）
CREATE TABLE IF NOT EXISTS pet_cancel_record (
  record_id    BIGINT       NOT NULL AUTO_INCREMENT COMMENT '记录ID',
  target_type  VARCHAR(20)  DEFAULT 'order'         COMMENT '类型（order/appointment）',
  ref_id       BIGINT       DEFAULT NULL            COMMENT '关联业务ID',
  user_id      BIGINT       DEFAULT NULL            COMMENT '用户ID',
  user_name    VARCHAR(64)  DEFAULT ''              COMMENT '用户账号',
  target_name  VARCHAR(120) DEFAULT ''              COMMENT '对象名称（宠物名/商品名）',
  detail       VARCHAR(500) DEFAULT ''              COMMENT '业务明细',
  reason       VARCHAR(500) DEFAULT ''              COMMENT '取消原因',
  del_flag     CHAR(1)      DEFAULT '0'             COMMENT '删除标志（0存在 2删除）',
  create_by    VARCHAR(64)  DEFAULT ''              COMMENT '创建者',
  create_time  DATETIME     DEFAULT NULL            COMMENT '取消时间',
  remark       VARCHAR(500) DEFAULT NULL            COMMENT '备注',
  PRIMARY KEY (record_id),
  KEY idx_cancel_type (target_type, ref_id),
  KEY idx_cancel_user (user_id),
  KEY idx_cancel_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='取消记录';

-- ④ 社区互动：点赞/评论共用一个目标列，必须带 target_type 区分宠物与宠物粮
-- （全部幂等：列已存在 / 唯一键已转换 则跳过，可重复执行）
SET @sql := (SELECT IF(COUNT(*) = 0,
    'ALTER TABLE `pet_like` ADD COLUMN `target_type` varchar(16) DEFAULT ''pet'' COMMENT ''目标类型（pet/food）'' AFTER `pet_id`',
    'SELECT 1')
    FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'pet_like' AND column_name = 'target_type');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 点赞唯一键：从 uk_user_pet(user_id,pet_id) 换成 uk_user_target(user_id,target_type,pet_id)
SET @sql := (SELECT IF(COUNT(*) > 0,
    'ALTER TABLE `pet_like` DROP INDEX `uk_user_pet`, ADD UNIQUE KEY `uk_user_target` (`user_id`, `target_type`, `pet_id`)',
    'SELECT 1')
    FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'pet_like' AND index_name = 'uk_user_pet');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(COUNT(*) = 0,
    'ALTER TABLE `pet_comment` ADD COLUMN `target_type` varchar(16) DEFAULT ''pet'' COMMENT ''目标类型（pet/food）'' AFTER `pet_id`',
    'SELECT 1')
    FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'pet_comment' AND column_name = 'target_type');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
