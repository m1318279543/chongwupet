-- ============================================================
-- 平台化第三步：预约到「门店 + 时段」
-- 2026-10-21
--
-- 原来 appointment_date 是 DATE，前端选的时分秒会被截断，
-- 改成 DATETIME 才能按小时时段做容量控制。
-- ============================================================

SET NAMES utf8mb4;

ALTER TABLE pet_appointment
  MODIFY COLUMN appointment_date DATETIME NULL COMMENT '预约时间（门店时段）';

SET @sql := (SELECT IF(COUNT(*) = 0,
    'ALTER TABLE `pet_appointment` ADD KEY `idx_apt_slot` (`store_id`, `appointment_date`)',
    'SELECT 1')
    FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'pet_appointment' AND index_name = 'idx_apt_slot');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 存量预约：把日期补成上午 10 点，避免列表出现 00:00
UPDATE pet_appointment
SET appointment_date = DATE_ADD(appointment_date, INTERVAL 10 HOUR)
WHERE appointment_date IS NOT NULL AND HOUR(appointment_date) = 0;

SELECT store_id, DATE(appointment_date) AS d, COUNT(*) AS cnt
FROM pet_appointment GROUP BY store_id, DATE(appointment_date)
ORDER BY d DESC LIMIT 5;
