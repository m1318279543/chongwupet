-- =====================================================
-- 智能匹配：无匹配结果也落库
--   1) 记录表新增 match_status（0 有结果 / 1 无匹配）与 diagnosis（无匹配诊断 JSON）
--   2) 历史数据默认按"有结果"处理
-- 用法: mysql -uroot -p123456 --default-character-set=utf8mb4 ry-pet < sql/pet_match_empty_record.sql
-- =====================================================

alter table pet_match_record
  add column match_status char(1) default '0' comment '匹配状态(0有结果/1无匹配)' after result_detail,
  add column diagnosis varchar(1000) default '' comment '无匹配诊断JSON' after match_status;

-- 已有记录都产生过推荐结果
update pet_match_record set match_status = '0' where match_status is null or match_status = '';

alter table pet_match_record add index idx_match_status (match_status);
