-- 评论区改版（B站样式）配套：
-- 1) pet_comment 增加冗余点赞数
-- 2) 评论点赞记录表（一人一评一赞，重复点击幂等）
-- 用法：mysql --default-character-set=utf8mb4 < sql/comment_like.sql（需先 use 库或自行加库名前缀）
ALTER TABLE pet_comment
    ADD COLUMN like_count INT NOT NULL DEFAULT 0 COMMENT '点赞数（冗余计数，pet_comment_like 同步增减）' AFTER score;

CREATE TABLE IF NOT EXISTS pet_comment_like (
    like_id     BIGINT       NOT NULL AUTO_INCREMENT COMMENT '点赞ID',
    comment_id  BIGINT       NOT NULL                COMMENT '评论ID（pet_comment.comment_id）',
    user_id     BIGINT       NOT NULL                COMMENT '点赞用户ID（sys_user.user_id）',
    create_time DATETIME     DEFAULT CURRENT_TIMESTAMP COMMENT '点赞时间',
    PRIMARY KEY (like_id),
    UNIQUE KEY uk_comment_user (comment_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='评论点赞记录表';
