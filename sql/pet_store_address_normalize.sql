-- 门店地址规范化
-- 统一格式：区（县）+ 路/街/大道 + 门牌号，地址内不留空格（如「渝中区解放碑步行街88号」）
-- 省市单独存在 province / city 列，地址列不再重复「重庆市」
USE `ry-pet`;

-- 1) 通用清理：去掉地址里的空白字符（含全角空格），并去掉首尾标点
UPDATE `pet_store`
SET `address` = TRIM(REPLACE(REPLACE(REPLACE(`address`, ' ', ''), CHAR(12288), ''), CHAR(9), ''))
WHERE `del_flag` = '0' AND `address` IS NOT NULL;

-- 2) 三家门店按标准写法对齐（历史数据里的简称/空格一次性纠正）
UPDATE `pet_store` SET `address` = '渝中区解放碑步行街88号'
WHERE `store_id` = 1 AND `store_name` = '宠物之家·总店';
UPDATE `pet_store` SET `address` = '九龙坡区科园四路12号'
WHERE `store_id` = 2 AND `store_name` = '宠物之家·高新店';
UPDATE `pet_store` SET `address` = '江北区观音桥北城天街5号'
WHERE `store_id` = 3 AND `store_name` = '宠物之家·江北店';

-- 2.1) 后加的门店：补齐行政区前缀、去掉口语简称
UPDATE `pet_store` SET `address` = '沙坪坝区大学城'
WHERE `store_name` = '宠物之家·大学城店';
UPDATE `pet_store` SET `address` = '南岸区南坪万达广场'
WHERE `store_name` = '宠物之家·南岸';
UPDATE `pet_store` SET `address` = '巴南区龙洲湾街道'
WHERE `store_name` = '宠物之家·巴南店';

-- 3) 省市列缺失时补全，避免前台拼出「区xx路」这种半截地址
UPDATE `pet_store` SET `province` = '重庆市' WHERE `del_flag` = '0' AND (`province` IS NULL OR `province` = '');
UPDATE `pet_store` SET `city` = '重庆市' WHERE `del_flag` = '0' AND (`city` IS NULL OR `city` = '');
-- 地址列已带「重庆市」时去掉前缀：前台按 city + address 拼接，否则会显示「重庆市重庆市…」
UPDATE `pet_store` SET `address` = SUBSTRING(`address`, 4)
WHERE `del_flag` = '0' AND `address` LIKE '重庆市%' AND `city` = '重庆市';

-- 3.1) 后加门店补近似坐标（按所在商圈取点，后台可再精调）
UPDATE `pet_store` SET `lng` = 106.540100, `lat` = 29.402600
WHERE `store_name` = '宠物之家·巴南店' AND `lng` IS NULL;
UPDATE `pet_store` SET `lng` = 106.308600, `lat` = 29.604600
WHERE `store_name` = '宠物之家·大学城店' AND `lng` IS NULL;
UPDATE `pet_store` SET `lng` = 106.567300, `lat` = 29.526600
WHERE `store_name` = '宠物之家·南岸' AND `lng` IS NULL;

-- 4) 知识库里门店地址文案同步（AI 助手回答时引用，避免新旧写法不一致）
UPDATE `pet_knowledge`
SET `content` = REPLACE(REPLACE(REPLACE(`content`,
      '步行街 88 号', '步行街88号'),
      '科园四路 12 号', '科园四路12号'),
      '北城天街 5 号', '北城天街5号')
WHERE `content` LIKE '%步行街 88 号%' OR `content` LIKE '%科园四路 12 号%' OR `content` LIKE '%北城天街 5 号%';
