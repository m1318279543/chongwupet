-- 波奇网宠物图片导入（由 gen_pet_sql.py 自动生成）
-- 图片存于 pet-web/public/images/pets 与 ruoyi-ui/public/images/pets

SET NAMES utf8mb4;

-- 1. 新增「爬行宠物」分类（若已存在则忽略）
INSERT INTO pet_category (category_name, sort, status, create_by, create_time, remark)
SELECT '爬行宠物', 7, '0', 'admin', NOW(), '龟鳖蜥蜴·安静省心·另类宠物'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM pet_category WHERE category_name='爬行宠物');

-- 2. 插入带真实图片的宠物（45 只）
INSERT INTO pet_info (category_id, pet_name, breed, age, gender, price, image, status, description, create_by, create_time) VALUES
  (3, '垂耳兔', '垂耳兔', '2个月', '0', 80.00, '/images/pets/smallpet_01.jpg', '0', '垂耳兔（兔子）—— 波奇宠物品种库收录，健康活泼、性格亲人，已完成疫苗接种与驱虫，支持到店看宠、同城接送。', 'admin', NOW()),
  (5, '八哥鸟', '八哥鸟', '3个月', '1', 1040.00, '/images/pets/smallpet_03.jpg', '0', '八哥鸟（鸟类）—— 波奇宠物品种库收录，健康活泼、性格亲人，已完成疫苗接种与驱虫，支持到店看宠、同城接送。', 'admin', NOW()),
  (5, '虎皮鹦鹉', '虎皮鹦鹉', '4个月', '0', 870.00, '/images/pets/smallpet_04.jpg', '0', '虎皮鹦鹉（鸟类）—— 波奇宠物品种库收录，健康活泼、性格亲人，已完成疫苗接种与驱虫，支持到店看宠、同城接送。', 'admin', NOW()),
  (3, '安哥拉兔', '安哥拉兔', '6个月', '1', 410.00, '/images/pets/smallpet_05.jpg', '0', '安哥拉兔（兔子）—— 波奇宠物品种库收录，健康活泼、性格亲人，已完成疫苗接种与驱虫，支持到店看宠、同城接送。', 'admin', NOW()),
  (5, '小葵花凤头鹦鹉', '小葵花凤头鹦鹉', '8个月', '0', 550.00, '/images/pets/smallpet_06.jpg', '0', '小葵花凤头鹦鹉（鸟类）—— 波奇宠物品种库收录，健康活泼、性格亲人，已完成疫苗接种与驱虫，支持到店看宠、同城接送。', 'admin', NOW()),
  (4, '布丁仓鼠', '布丁仓鼠', '1岁', '1', 60.00, '/images/pets/smallpet_07.jpg', '0', '布丁仓鼠（仓鼠）—— 波奇宠物品种库收录，健康活泼、性格亲人，已完成疫苗接种与驱虫，支持到店看宠、同城接送。', 'admin', NOW()),
  (4, '三线仓鼠', '三线仓鼠', '2岁', '0', 220.00, '/images/pets/smallpet_09.jpg', '0', '三线仓鼠（仓鼠）—— 波奇宠物品种库收录，健康活泼、性格亲人，已完成疫苗接种与驱虫，支持到店看宠、同城接送。', 'admin', NOW()),
  (4, '标准灰龙猫', '标准灰龙猫', '3岁', '1', 120.00, '/images/pets/smallpet_10.jpg', '0', '标准灰龙猫（仓鼠）—— 波奇宠物品种库收录，健康活泼、性格亲人，已完成疫苗接种与驱虫，支持到店看宠、同城接送。', 'admin', NOW()),
  (5, '亚历山大鹦鹉', '亚历山大鹦鹉', '2个月', '0', 1040.00, '/images/pets/smallpet_11.jpg', '0', '亚历山大鹦鹉（鸟类）—— 波奇宠物品种库收录，健康活泼、性格亲人，已完成疫苗接种与驱虫，支持到店看宠、同城接送。', 'admin', NOW()),
  (5, '相思鸟', '相思鸟', '3个月', '1', 870.00, '/images/pets/smallpet_12.jpg', '0', '相思鸟（鸟类）—— 波奇宠物品种库收录，健康活泼、性格亲人，已完成疫苗接种与驱虫，支持到店看宠、同城接送。', 'admin', NOW()),
  (4, '奶茶仓鼠', '奶茶仓鼠', '4个月', '0', 80.00, '/images/pets/smallpet_13.jpg', '0', '奶茶仓鼠（仓鼠）—— 波奇宠物品种库收录，健康活泼、性格亲人，已完成疫苗接种与驱虫，支持到店看宠、同城接送。', 'admin', NOW()),
  (5, '鹩哥', '鹩哥', '6个月', '1', 550.00, '/images/pets/smallpet_15.jpg', '0', '鹩哥（鸟类）—— 波奇宠物品种库收录，健康活泼、性格亲人，已完成疫苗接种与驱虫，支持到店看宠、同城接送。', 'admin', NOW()),
  (6, '金龙鱼', '金龙鱼', '8个月', '0', 40.00, '/images/pets/aquarium_01.jpg', '0', '金龙鱼（水族）—— 波奇宠物品种库收录，健康活泼、性格亲人，已完成疫苗接种与驱虫，支持到店看宠、同城接送。', 'admin', NOW()),
  (6, '鹦鹉鱼', '鹦鹉鱼', '1岁', '1', 240.00, '/images/pets/aquarium_02.jpg', '0', '鹦鹉鱼（水族）—— 波奇宠物品种库收录，健康活泼、性格亲人，已完成疫苗接种与驱虫，支持到店看宠、同城接送。', 'admin', NOW()),
  (6, '银龙鱼', '银龙鱼', '2岁', '0', 440.00, '/images/pets/aquarium_03.jpg', '0', '银龙鱼（水族）—— 波奇宠物品种库收录，健康活泼、性格亲人，已完成疫苗接种与驱虫，支持到店看宠、同城接送。', 'admin', NOW()),
  (6, '金鱼', '金鱼', '3岁', '1', 640.00, '/images/pets/aquarium_04.jpg', '0', '金鱼（水族）—— 波奇宠物品种库收录，健康活泼、性格亲人，已完成疫苗接种与驱虫，支持到店看宠、同城接送。', 'admin', NOW()),
  (6, '招财鱼', '招财鱼', '2个月', '0', 50.00, '/images/pets/aquarium_05.jpg', '0', '招财鱼（水族）—— 波奇宠物品种库收录，健康活泼、性格亲人，已完成疫苗接种与驱虫，支持到店看宠、同城接送。', 'admin', NOW()),
  (6, '过背金龙', '过背金龙', '3个月', '1', 250.00, '/images/pets/aquarium_06.jpg', '0', '过背金龙（水族）—— 波奇宠物品种库收录，健康活泼、性格亲人，已完成疫苗接种与驱虫，支持到店看宠、同城接送。', 'admin', NOW()),
  (6, '孔雀鱼', '孔雀鱼', '4个月', '0', 450.00, '/images/pets/aquarium_07.jpg', '0', '孔雀鱼（水族）—— 波奇宠物品种库收录，健康活泼、性格亲人，已完成疫苗接种与驱虫，支持到店看宠、同城接送。', 'admin', NOW()),
  (6, '宝莲灯鱼', '宝莲灯鱼', '6个月', '1', 640.00, '/images/pets/aquarium_08.jpg', '0', '宝莲灯鱼（水族）—— 波奇宠物品种库收录，健康活泼、性格亲人，已完成疫苗接种与驱虫，支持到店看宠、同城接送。', 'admin', NOW()),
  (6, '成吉思汗鱼', '成吉思汗鱼', '8个月', '0', 60.00, '/images/pets/aquarium_09.jpg', '0', '成吉思汗鱼（水族）—— 波奇宠物品种库收录，健康活泼、性格亲人，已完成疫苗接种与驱虫，支持到店看宠、同城接送。', 'admin', NOW()),
  (6, '龙鱼', '龙鱼', '1岁', '1', 260.00, '/images/pets/aquarium_10.jpg', '0', '龙鱼（水族）—— 波奇宠物品种库收录，健康活泼、性格亲人，已完成疫苗接种与驱虫，支持到店看宠、同城接送。', 'admin', NOW()),
  (6, '锦鲤', '锦鲤', '2岁', '0', 450.00, '/images/pets/aquarium_11.jpg', '0', '锦鲤（水族）—— 波奇宠物品种库收录，健康活泼、性格亲人，已完成疫苗接种与驱虫，支持到店看宠、同城接送。', 'admin', NOW()),
  (6, '虎鱼', '虎鱼', '3岁', '1', 650.00, '/images/pets/aquarium_12.jpg', '0', '虎鱼（水族）—— 波奇宠物品种库收录，健康活泼、性格亲人，已完成疫苗接种与驱虫，支持到店看宠、同城接送。', 'admin', NOW()),
  (6, '青龙鱼', '青龙鱼', '2个月', '0', 70.00, '/images/pets/aquarium_13.jpg', '0', '青龙鱼（水族）—— 波奇宠物品种库收录，健康活泼、性格亲人，已完成疫苗接种与驱虫，支持到店看宠、同城接送。', 'admin', NOW()),
  (6, '地图鱼', '地图鱼', '3个月', '1', 260.00, '/images/pets/aquarium_14.jpg', '0', '地图鱼（水族）—— 波奇宠物品种库收录，健康活泼、性格亲人，已完成疫苗接种与驱虫，支持到店看宠、同城接送。', 'admin', NOW()),
  (6, '血红龙', '血红龙', '4个月', '0', 460.00, '/images/pets/aquarium_15.jpg', '0', '血红龙（水族）—— 波奇宠物品种库收录，健康活泼、性格亲人，已完成疫苗接种与驱虫，支持到店看宠、同城接送。', 'admin', NOW());

-- 3. 为现有宠物按品种匹配波奇网真实图片
UPDATE pet_info SET image='/images/pets/cat_02.jpg' WHERE pet_id=1;  -- 英国短毛猫 -> 英国短毛猫
UPDATE pet_info SET image='/images/pets/cat_01.jpg' WHERE pet_id=2;  -- 布偶猫 -> 布偶猫
UPDATE pet_info SET image='/images/pets/cat_04.jpg' WHERE pet_id=3;  -- 美国短毛猫 -> 美国短毛猫
UPDATE pet_info SET image='/images/pets/cat_07.jpg' WHERE pet_id=4;  -- 暹罗猫 -> 暹罗猫
UPDATE pet_info SET image='/images/pets/cat_05.jpg' WHERE pet_id=5;  -- 异国短毛猫 -> 异国短毛猫
UPDATE pet_info SET image='/images/pets/cat_08.jpg' WHERE pet_id=6;  -- 苏格兰折耳猫 -> 苏格兰折耳猫
UPDATE pet_info SET image='/images/pets/dog_01.jpg' WHERE pet_id=7;  -- 金毛寻回犬 -> 金毛
UPDATE pet_info SET image='/images/pets/dog_12.jpg' WHERE pet_id=8;  -- 贵宾犬 -> 泰迪犬
UPDATE pet_info SET image='/images/pets/dog_15.jpg' WHERE pet_id=9;  -- 威尔士柯基犬 -> 柯基犬
UPDATE pet_info SET image='/images/pets/dog_02.jpg' WHERE pet_id=10;  -- 西伯利亚雪橇犬 -> 哈士奇
UPDATE pet_info SET image='/images/pets/dog_08.jpg' WHERE pet_id=11;  -- 拉布拉多寻回犬 -> 拉布拉多猎犬
UPDATE pet_info SET image='/images/pets/dog_03.jpg' WHERE pet_id=12;  -- 博美犬 -> 博美犬
-- 未匹配: pet_id=13 breed=荷兰侏儒兔
UPDATE pet_info SET image='/images/pets/smallpet_01.jpg' WHERE pet_id=14;  -- 垂耳兔 -> 垂耳兔
UPDATE pet_info SET image='/images/pets/smallpet_05.jpg' WHERE pet_id=15;  -- 安哥拉兔 -> 安哥拉兔
-- 未匹配: pet_id=16 breed=金丝熊
UPDATE pet_info SET image='/images/pets/smallpet_09.jpg' WHERE pet_id=17;  -- 三线仓鼠 -> 三线仓鼠
-- 未匹配: pet_id=18 breed=老公公仓鼠
UPDATE pet_info SET image='/images/pets/smallpet_04.jpg' WHERE pet_id=19;  -- 虎皮鹦鹉 -> 虎皮鹦鹉
-- 未匹配: pet_id=20 breed=玄凤鹦鹉
-- 未匹配: pet_id=21 breed=牡丹鹦鹉
UPDATE pet_info SET image='/images/pets/aquarium_07.jpg' WHERE pet_id=22;  -- 孔雀鱼 -> 孔雀鱼
-- 未匹配: pet_id=23 breed=斗鱼
UPDATE pet_info SET image='/images/pets/aquarium_04.jpg' WHERE pet_id=24;  -- 金鱼 -> 金鱼
