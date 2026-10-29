-- ============================================================
-- 服务预约独立下单：pet_service_order 扩展（幂等，可重复执行）
-- 背景：预约不再绑定具体宠物，改成"服务项目独立下单 + 单独结算"
--   到店服务只需门店；上门服务需要地址；统一记录联系人/电话/时间
-- ============================================================

-- 服务方式：1 到店，2 上门
SET @sql = (SELECT IF(EXISTS(SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'pet_service_order' AND column_name = 'service_mode'),
  'SELECT 1',
  'ALTER TABLE pet_service_order ADD COLUMN service_mode CHAR(1) NOT NULL DEFAULT ''1'' COMMENT ''服务方式：1到店 2上门'' AFTER item_type'));
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

-- 联系人姓名（下单人可能不是账号本人）
SET @sql = (SELECT IF(EXISTS(SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'pet_service_order' AND column_name = 'contact_name'),
  'SELECT 1',
  'ALTER TABLE pet_service_order ADD COLUMN contact_name VARCHAR(32) DEFAULT '''' COMMENT ''联系人'' AFTER customer_name'));
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

-- 联系电话
SET @sql = (SELECT IF(EXISTS(SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'pet_service_order' AND column_name = 'contact_phone'),
  'SELECT 1',
  'ALTER TABLE pet_service_order ADD COLUMN contact_phone VARCHAR(20) DEFAULT '''' COMMENT ''联系电话'' AFTER contact_name'));
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

-- 上门地址（到店为空）
SET @sql = (SELECT IF(EXISTS(SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'pet_service_order' AND column_name = 'address'),
  'SELECT 1',
  'ALTER TABLE pet_service_order ADD COLUMN address VARCHAR(255) DEFAULT '''' COMMENT ''上门地址（上门服务必填）'' AFTER contact_phone'));
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

-- 数量（同一项目可约多次/多只，默认 1）
SET @sql = (SELECT IF(EXISTS(SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'pet_service_order' AND column_name = 'qty'),
  'SELECT 1',
  'ALTER TABLE pet_service_order ADD COLUMN qty INT NOT NULL DEFAULT 1 COMMENT ''数量'' AFTER price'));
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

-- 应付总额（单价 × 数量，冗余存一份便于对账）
SET @sql = (SELECT IF(EXISTS(SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'pet_service_order' AND column_name = 'total_amount'),
  'SELECT 1',
  'ALTER TABLE pet_service_order ADD COLUMN total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT ''应付总额'' AFTER qty'));
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

-- 支付方式与支付时间
SET @sql = (SELECT IF(EXISTS(SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'pet_service_order' AND column_name = 'pay_method'),
  'SELECT 1',
  'ALTER TABLE pet_service_order ADD COLUMN pay_method VARCHAR(20) DEFAULT '''' COMMENT ''支付方式：alipay/wechat/balance'' AFTER pay_status'));
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

SET @sql = (SELECT IF(EXISTS(SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'pet_service_order' AND column_name = 'pay_time'),
  'SELECT 1',
  'ALTER TABLE pet_service_order ADD COLUMN pay_time DATETIME DEFAULT NULL COMMENT ''支付时间'' AFTER pay_method'));
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

-- 取消原因
SET @sql = (SELECT IF(EXISTS(SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'pet_service_order' AND column_name = 'cancel_reason'),
  'SELECT 1',
  'ALTER TABLE pet_service_order ADD COLUMN cancel_reason VARCHAR(200) DEFAULT '''' COMMENT ''取消原因'' AFTER status'));
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

-- 线上自约单号检索
SET @sql = (SELECT IF(EXISTS(SELECT 1 FROM information_schema.statistics
    WHERE table_schema = DATABASE() AND table_name = 'pet_service_order' AND index_name = 'idx_service_no'),
  'SELECT 1',
  'ALTER TABLE pet_service_order ADD KEY idx_service_no (service_no)'));
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

SET @sql = (SELECT IF(EXISTS(SELECT 1 FROM information_schema.statistics
    WHERE table_schema = DATABASE() AND table_name = 'pet_service_order' AND index_name = 'idx_svc_user'),
  'SELECT 1',
  'ALTER TABLE pet_service_order ADD KEY idx_svc_user (user_id, status)'));
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

-- 存量工单补齐：默认到店、数量 1、总额=单价
UPDATE pet_service_order
SET service_mode = IFNULL(NULLIF(service_mode, ''), '1'),
    qty = IFNULL(NULLIF(qty, 0), 1),
    total_amount = IF(total_amount IS NULL OR total_amount = 0, IFNULL(price, 0) * IFNULL(NULLIF(qty, 0), 1), total_amount),
    contact_name = IFNULL(NULLIF(contact_name, ''), IFNULL(customer_name, '')),
    contact_phone = IFNULL(contact_phone, '')
WHERE del_flag = '0';
