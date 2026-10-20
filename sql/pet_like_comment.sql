-- ============================================================
-- 宠物点赞与评论表（2026-09-30）
-- pet_like：一人一宠只能点赞一次（user_id+pet_id 唯一索引）
-- pet_comment：评论支持回复（parent_id 关联父评论）
-- ============================================================

-- 点赞表
CREATE TABLE IF NOT EXISTS pet_like (
  like_id     BIGINT       NOT NULL AUTO_INCREMENT COMMENT '点赞ID',
  pet_id      BIGINT       NOT NULL                COMMENT '宠物ID',
  user_id     BIGINT       NOT NULL                COMMENT '点赞用户ID',
  create_time DATETIME     DEFAULT NULL            COMMENT '点赞时间',
  PRIMARY KEY (like_id),
  UNIQUE KEY uk_user_pet (user_id, pet_id),
  KEY idx_pet (pet_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='宠物点赞表';

-- 评论表
CREATE TABLE IF NOT EXISTS pet_comment (
  comment_id  BIGINT       NOT NULL AUTO_INCREMENT COMMENT '评论ID',
  pet_id      BIGINT       NOT NULL                COMMENT '宠物ID',
  user_id     BIGINT       NOT NULL                COMMENT '评论用户ID',
  parent_id   BIGINT       DEFAULT 0               COMMENT '父评论ID（0=顶级评论）',
  reply_user  VARCHAR(64)  DEFAULT NULL            COMMENT '被回复人昵称（冗余展示）',
  content     VARCHAR(500) NOT NULL                COMMENT '评论内容',
  status      CHAR(1)      DEFAULT '0'             COMMENT '状态（0正常 1隐藏）',
  del_flag    CHAR(1)      DEFAULT '0'             COMMENT '删除标志（0存在 2删除）',
  create_by   VARCHAR(64)  DEFAULT ''              COMMENT '创建者',
  create_time DATETIME     DEFAULT NULL            COMMENT '创建时间',
  update_by   VARCHAR(64)  DEFAULT ''              COMMENT '更新者',
  update_time DATETIME     DEFAULT NULL            COMMENT '更新时间',
  remark      VARCHAR(500) DEFAULT NULL            COMMENT '备注',
  PRIMARY KEY (comment_id),
  KEY idx_pet (pet_id),
  KEY idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='宠物评论表';

-- 每只宠物冗余点赞数（避免列表页 count join），初始 0
ALTER TABLE pet_info ADD COLUMN like_count INT DEFAULT 0 COMMENT '点赞数';
