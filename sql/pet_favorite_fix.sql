-- ============================================================
--  修复：pet_favorite 表缺列导致收藏列表查询报错
--  报错信息：Unknown column 'update_by' in 'field list'
--  （PetFavoriteMapper.xml 的 select 语句包含 update_by/update_time/remark，
--    但建表脚本里漏了这三列）
-- ============================================================
USE `ry-pet`;

ALTER TABLE pet_favorite
  ADD COLUMN update_by   varchar(64)  DEFAULT NULL COMMENT '更新者'   AFTER create_time,
  ADD COLUMN update_time datetime     DEFAULT NULL COMMENT '更新时间' AFTER update_by,
  ADD COLUMN remark      varchar(500) DEFAULT NULL COMMENT '备注'     AFTER update_time;

-- 查看结果
DESC pet_favorite;
