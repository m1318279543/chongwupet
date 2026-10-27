-- =============================================
-- 宠物之家 业务数据初始化（波奇网风格·带图片emoji+描述）
-- 数据库：ry-pet
-- =============================================
-- 图片字段存 emoji（前端渲染大字号+渐变背景，离线可用）

-- ============ 1. 宠物分类（6个）============
INSERT INTO pet_category (category_name, sort, status, create_by, create_time, remark) VALUES
('猫咪', 1, '0', 'admin', NOW(), '喵星人·温顺粘人·适合公寓'),
('狗狗', 2, '0', 'admin', NOW(), '汪星人·忠诚活泼·家庭伴侣'),
('兔子', 3, '0', 'admin', NOW(), '蹦蹦跳跳·安静可爱·易饲养'),
('仓鼠', 4, '0', 'admin', NOW(), '小巧玲珑·呆萌·口袋宠物'),
('鸟类', 5, '0', 'admin', NOW(), '羽衣斑斓·会说话·灵动'),
('水族', 6, '0', 'admin', NOW(), '游弋生姿·赏心悦目·静心');

-- ============ 2. 宠物信息（30只）============
-- 猫咪 (category_id=1)
INSERT INTO pet_info (category_id, pet_name, breed, age, gender, price, image, status, description, create_by, create_time) VALUES
(1, '银渐层短毛猫', '英国短毛猫', '3个月', '0', 2500.00, '/images/pets/cat_01.jpg', '0', '银渐层毛色，圆圆大脸盘，性格温顺粘人。已打第一针疫苗，已完成体内外驱虫，会用猫砂盆。适合首次养猫家庭。', 'admin', NOW()),
(1, '海双布偶猫', '布偶猫', '6个月', '1', 5000.00, '/images/pets/cat_02.jpg', '0', '海豹双色布偶，一双宝石蓝眼睛，毛发丝滑如绸缎。性格极其亲人，已绝育，疫苗齐全。喜欢被抱抱。', 'admin', NOW()),
(1, '虎斑美短', '美国短毛猫', '4个月', '0', 2000.00, '/images/pets/cat_03.jpg', '0', '经典银色虎斑纹，肌肉结实，活泼好动爱玩耍。已完成驱虫，打过两针疫苗。聪明易训练。', 'admin', NOW()),
(1, '重点色暹罗', '暹罗猫', '8个月', '1', 1800.00, '/images/pets/cat_04.jpg', '0', '重点色暹罗，深色面庞配奶白身体，蓝眼如湖水。话痨性格，喜欢与人交流，疫苗齐全。', 'admin', NOW()),
(1, '红虎斑加菲', '异国短毛猫', '5个月', '0', 3000.00, '/images/pets/cat_05.jpg', '0', '扁平圆脸，红虎斑毛色，像毛绒玩具。性格安静温顺，已驱虫，适合公寓饲养。', 'admin', NOW()),
(1, '苏格兰折耳', '苏格兰折耳猫', '3个月', '1', 2800.00, '/images/pets/cat_06.jpg', '0', '立耳小折耳，圆脸大眼超萌。性格温和，喜欢趴着发呆。已打第一针疫苗，会用猫砂。', 'admin', NOW());

-- 狗狗 (category_id=2)
INSERT INTO pet_info (category_id, pet_name, breed, age, gender, price, image, status, description, create_by, create_time) VALUES
(2, '金毛寻回幼犬', '金毛寻回犬', '3个月', '0', 3500.00, '/images/pets/dog_01.jpg', '0', '阳光大暖男，3针疫苗齐全，已驱虫。性格温顺聪明，与人亲近，适合家庭饲养。带血统证书。', 'admin', NOW()),
(2, '红棕色泰迪', '贵宾犬', '2个月', '1', 2000.00, '/images/pets/dog_02.jpg', '0', '红棕色玩具泰迪，不掉毛无体味，卷毛蓬松。已驱虫，性格粘人爱撒娇。适合公寓。', 'admin', NOW()),
(2, '三色柯基', '威尔士柯基犬', '3个月', '0', 4000.00, '/images/pets/dog_03.jpg', '0', '三色短腿柯基，圆臀大耳，蹦跳超萌。性格活泼聪明，疫苗齐全。柯基屁股治愈一切。', 'admin', NOW()),
(2, '蓝眼哈士奇', '西伯利亚雪橇犬', '4个月', '1', 3000.00, '/images/pets/dog_04.jpg', '0', '蓝眼黑白色，颜值担当。精力旺盛爱拆家，需要每天运动。已驱虫，适合有院子家庭。', 'admin', NOW()),
(2, '米色拉布拉多', '拉布拉多寻回犬', '3个月', '0', 3200.00, '/images/pets/dog_05.jpg', '0', '米色幼犬，性格温顺，服从性高，可作为导盲犬家庭犬。3针疫苗齐全，已驱虫。', 'admin', NOW()),
(2, '纯白博美', '博美犬', '2个月', '1', 2500.00, '/images/pets/dog_06.jpg', '0', '纯白色蓬松毛球，小巧灵动爱叫。已驱虫，适合女性和老人饲养。颜值担当。', 'admin', NOW());

-- 兔子 (category_id=3)
INSERT INTO pet_info (category_id, pet_name, breed, age, gender, price, image, status, description, create_by, create_time) VALUES
(3, '荷兰侏儒兔', '荷兰侏儒兔', '2个月', '0', 500.00, '/images/pets/smallpet_01.jpg', '0', '体型小巧，纯白短耳，性格温顺不咬人。吃兔粮和干草，饲养简单。适合儿童初次养宠。', 'admin', NOW()),
(3, '黑白垂耳兔', '垂耳兔', '3个月', '1', 600.00, '/images/pets/smallpet_05.jpg', '0', '黑白花色，耳朵下垂超萌，圆滚滚身材。性格亲人，已完成驱虫。喜欢被摸头。', 'admin', NOW()),
(3, '长毛安哥拉兔', '安哥拉兔', '4个月', '0', 800.00, '/images/pets/pet_13.jpg', '0', '长毛蓬松如棉花糖，需每周梳毛。性格温和，适合有耐心的饲主。视觉治愈满分。', 'admin', NOW());

-- 仓鼠 (category_id=4)
INSERT INTO pet_info (category_id, pet_name, breed, age, gender, price, image, status, description, create_by, create_time) VALUES
(4, '金黄熊仓鼠', '金丝熊', '2个月', '0', 50.00, '/images/pets/pet_16.jpg', '0', '金黄色金丝熊，胖嘟嘟圆滚滚，性格温顺亲人。配笼饲养，喂专用仓鼠粮。超治愈。', 'admin', NOW()),
(4, '银狐三线仓鼠', '三线仓鼠', '1.5个月', '1', 30.00, '/images/pets/smallpet_09.jpg', '0', '银狐背线，活泼好动爱跑轮。小体型，适合学生党。独立饲养，怕热需避暑。', 'admin', NOW()),
(4, '白腹老公公仓鼠', '老公公仓鼠', '2个月', '0', 40.00, '/images/pets/pet_18.jpg', '0', '最小型的仓鼠品种，白腹圆脸，像白胡子老爷爷。胆小但呆萌，需耐心驯化。', 'admin', NOW());

-- 鸟类 (category_id=5)
INSERT INTO pet_info (category_id, pet_name, breed, age, gender, price, image, status, description, create_by, create_time) VALUES
(5, '黄绿虎皮鹦鹉', '虎皮鹦鹉', '3个月', '0', 80.00, '/images/pets/smallpet_04.jpg', '0', '黄绿经典色，可训练说话，亲人度高。吃谷子小米。笼养，需常互动。入门级鹦鹉。', 'admin', NOW()),
(5, '白脸玄凤鹦鹉', '玄凤鹦鹉', '4个月', '1', 250.00, '/images/pets/pet_20.jpg', '0', '白脸颊，头顶冠羽竖起超萌。聪明可学简单动作，性格温和。喜欢吹口哨。', 'admin', NOW()),
(5, '彩色牡丹鹦鹉', '牡丹鹦鹉', '3个月', '0', 150.00, '/images/pets/pet_21.jpg', '0', '情侣鸟，色彩鲜艳，建议成对饲养。活泼爱叫，互动性强。需大笼活动空间。', 'admin', NOW());

-- 水族 (category_id=6)
INSERT INTO pet_info (category_id, pet_name, breed, age, gender, price, image, status, description, create_by, create_time) VALUES
(6, '彩色孔雀鱼', '孔雀鱼', '3个月', '0', 15.00, '/images/pets/aquarium_07.jpg', '0', '尾巴如孔雀开屏，色彩绚丽，繁殖力强易饲养。适合新手水族。群养效果最佳。', 'admin', NOW()),
(6, '将军斗鱼', '斗鱼', '4个月', '1', 25.00, '/images/pets/pet_23.jpg', '0', '雄性将军斗鱼，尾鳍飘逸如舞裙，色彩艳丽。需单独饲养，配小缸即可。桌面赏心。', 'admin', NOW()),
(6, '红白琉金金鱼', '金鱼', '5个月', '0', 20.00, '/images/pets/aquarium_04.jpg', '0', '传统琉金品种，红白花色，圆胖体型。寓意吉祥，适合中式鱼缸。耐养皮实。', 'admin', NOW());

-- ============ 3. 验证 ============
SELECT '分类数' AS item, COUNT(*) AS cnt FROM pet_category
UNION ALL
SELECT '宠物数', COUNT(*) FROM pet_info;
