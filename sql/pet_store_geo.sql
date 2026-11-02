-- 门店地图定位：给 pet_store 增加经纬度（GCJ-02 火星坐标，与腾讯地图/高德一致）
-- 可重复执行：列已存在时跳过
USE `ry-pet`;

SET @has_lng := (SELECT COUNT(*) FROM information_schema.columns
                 WHERE table_schema = DATABASE() AND table_name = 'pet_store' AND column_name = 'lng');
SET @sql := IF(@has_lng = 0,
  'ALTER TABLE `pet_store` ADD COLUMN `lng` decimal(10,6) DEFAULT NULL COMMENT ''经度（GCJ-02）'' AFTER `address`',
  'SELECT 1');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

SET @has_lat := (SELECT COUNT(*) FROM information_schema.columns
                 WHERE table_schema = DATABASE() AND table_name = 'pet_store' AND column_name = 'lat');
SET @sql := IF(@has_lat = 0,
  'ALTER TABLE `pet_store` ADD COLUMN `lat` decimal(10,6) DEFAULT NULL COMMENT ''纬度（GCJ-02）'' AFTER `lng`',
  'SELECT 1');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

-- 演示门店坐标（重庆，GCJ-02）；后台门店管理里可改
UPDATE `pet_store` SET `lng` = 106.577315, `lat` = 29.557666 WHERE `store_id` = 1 AND `lng` IS NULL; -- 渝中区解放碑步行街
UPDATE `pet_store` SET `lng` = 106.493932, `lat` = 29.532756 WHERE `store_id` = 2 AND `lng` IS NULL; -- 九龙坡区科园四路
UPDATE `pet_store` SET `lng` = 106.530573, `lat` = 29.573541 WHERE `store_id` = 3 AND `lng` IS NULL; -- 江北区观音桥北城天街
