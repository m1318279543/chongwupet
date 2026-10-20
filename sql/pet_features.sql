-- ============================================================
-- 宠物管理系统 · 新功能表结构（喜好 / 疑难杂症知识库 / 客服咨询）
-- 字符集务必 utf8mb4，执行时加 --default-character-set=utf8mb4
-- ============================================================

-- ① 宠物喜好 pet_preference
CREATE TABLE IF NOT EXISTS pet_preference (
  preference_id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '喜好ID',
  pet_id        BIGINT       NOT NULL COMMENT '宠物ID',
  food_like     VARCHAR(200) DEFAULT '' COMMENT '喜欢的食物',
  toy_like      VARCHAR(200) DEFAULT '' COMMENT '喜欢的玩具',
  personality   VARCHAR(200) DEFAULT '' COMMENT '性格特点',
  activity_level VARCHAR(20) DEFAULT '' COMMENT '活跃度（高/中/低）',
  env_like      VARCHAR(200) DEFAULT '' COMMENT '喜欢的环境',
  taboo         VARCHAR(300) DEFAULT '' COMMENT '禁忌/注意事项',
  note          VARCHAR(300) DEFAULT '' COMMENT '备注',
  status        CHAR(1)      DEFAULT '0' COMMENT '状态（0正常 1停用）',
  del_flag      CHAR(1)      DEFAULT '0' COMMENT '删除标志（0存在 2删除）',
  create_by     VARCHAR(64)  DEFAULT '' ,
  create_time   DATETIME     DEFAULT NULL,
  update_by     VARCHAR(64)  DEFAULT '' ,
  update_time   DATETIME     DEFAULT NULL,
  KEY idx_pet (pet_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='宠物喜好';

-- ② 宠物常见健康问题（疑难杂症）知识库 pet_health_issue
CREATE TABLE IF NOT EXISTS pet_health_issue (
  issue_id    BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '问题ID',
  category_id BIGINT       DEFAULT NULL COMMENT '分类ID（可为空=通用）',
  family      VARCHAR(50)  DEFAULT '' COMMENT '科系（猫科/犬科/兔科…）',
  issue_name  VARCHAR(120) NOT NULL COMMENT '问题名称',
  symptoms    VARCHAR(500) DEFAULT '' COMMENT '症状表现',
  cause       VARCHAR(500) DEFAULT '' COMMENT '诱因/原因',
  solution    VARCHAR(800) DEFAULT '' COMMENT '解决措施',
  prevention  VARCHAR(500) DEFAULT '' COMMENT '预防要点',
  severity    VARCHAR(20)  DEFAULT '轻' COMMENT '严重程度（轻/中/重）',
  sort        INT          DEFAULT 0 COMMENT '显示顺序',
  status      CHAR(1)      DEFAULT '0' COMMENT '状态（0正常 1停用）',
  del_flag    CHAR(1)      DEFAULT '0' COMMENT '删除标志',
  create_by   VARCHAR(64)  DEFAULT '',
  create_time DATETIME     DEFAULT NULL,
  update_by   VARCHAR(64)  DEFAULT '',
  update_time DATETIME     DEFAULT NULL,
  KEY idx_family (family),
  KEY idx_category (category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='宠物常见健康问题知识库';

-- ③ 客服咨询 pet_consult
CREATE TABLE IF NOT EXISTS pet_consult (
  consult_id  BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '咨询ID',
  user_id     BIGINT       DEFAULT NULL COMMENT '用户ID',
  user_name   VARCHAR(64)  DEFAULT '' COMMENT '用户名',
  contact     VARCHAR(64)  DEFAULT '' COMMENT '联系方式',
  question    VARCHAR(800) NOT NULL COMMENT '咨询问题',
  reply       VARCHAR(800) DEFAULT '' COMMENT '客服回复',
  reply_by    VARCHAR(64)  DEFAULT '' COMMENT '回复人',
  reply_time  DATETIME     DEFAULT NULL COMMENT '回复时间',
  status      CHAR(1)      DEFAULT '0' COMMENT '状态（0待回复 1已回复）',
  del_flag    CHAR(1)      DEFAULT '0' COMMENT '删除标志',
  create_by   VARCHAR(64)  DEFAULT '',
  create_time DATETIME     DEFAULT NULL,
  update_by   VARCHAR(64)  DEFAULT '',
  update_time DATETIME     DEFAULT NULL,
  KEY idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='客服咨询';

-- ④ 宠物分类补充：科系(family) 与 统称类(group_name)
-- 若列不存在则新增（幂等，避免重复执行报错）
SET @exist = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='ry-pet' AND table_name='pet_category' AND column_name='family');
SET @sql = IF(@exist=0,
  'ALTER TABLE pet_category ADD COLUMN family VARCHAR(50) DEFAULT '''' COMMENT ''科系（猫科/犬科/兔科…）'', ADD COLUMN group_name VARCHAR(50) DEFAULT '''' COMMENT ''统称类（猫狗/小宠/水族/爬行）''',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE pet_category SET family='猫科',   group_name='猫狗' WHERE category_name IN ('猫咪','猫');
UPDATE pet_category SET family='犬科',   group_name='猫狗' WHERE category_name IN ('狗狗','狗');
UPDATE pet_category SET family='兔科',   group_name='小宠' WHERE category_name IN ('兔子','兔');
UPDATE pet_category SET family='鼠科',   group_name='小宠' WHERE category_name IN ('仓鼠','鼠');
UPDATE pet_category SET family='鹦鹉科', group_name='小宠' WHERE category_name IN ('鸟类','鸟');
UPDATE pet_category SET family='观赏鱼科', group_name='水族' WHERE category_name IN ('水族','鱼');
UPDATE pet_category SET family='爬行科', group_name='爬行' WHERE category_name IN ('爬行宠物','爬行','龟','蜥蜴');

-- ⑤ 健康知识库种子数据（先清空再插入，保证幂等）
DELETE FROM pet_health_issue WHERE issue_id > 0;

INSERT INTO pet_health_issue (category_id, family, issue_name, symptoms, cause, solution, prevention, severity, sort, status, create_by, create_time) VALUES
-- ===== 猫科 =====
(NULL,'猫科','猫软便/腹泻','大便变软、次数增多、偶有水样便，精神食欲尚可','换粮过快、受凉、轻度肠胃炎或寄生虫','暂停新粮，喂温水与原粮；可加宠物益生菌；若带血或呕吐立即就医','定时定量、换粮7天过渡、定期驱虫','轻',1,'0','admin',NOW()),
(NULL,'猫科','猫呕吐（毛球症）','频繁干呕、吐出带毛团食物，偶见食欲下降','梳理毛发吞入过多毛发形成毛球','化毛膏/猫草帮助排出；增加梳毛频率；严重阻塞需就医','日常勤梳毛、定期喂化毛膏','轻',2,'0','admin',NOW()),
(NULL,'猫科','猫 sneezing 打喷嚏','连续打喷嚏、流清涕、眼分泌物增多','受凉、猫鼻支（疱疹病毒）或粉尘刺激','保暖、清洁眼鼻；持续或发烧排查猫鼻支','通风保暖、减少应激、接种疫苗','中',3,'0','admin',NOW()),
(NULL,'猫科','猫尿闭（排尿困难）','频繁蹲砂盆、尿少/无尿、嚎叫、腹部胀','尿道结石/结晶、应激、饮水少','急症！立即就医导尿，不可拖延','多喂水、泌尿道处方粮、减少应激','重',4,'0','admin',NOW()),
-- ===== 犬科 =====
(NULL,'犬科','狗软便/肠胃炎','腹泻、食欲差、可能呕吐','吃错东西、受凉、寄生虫','禁食半天观察，喂益生菌；严重脱水就医','定时喂食、忌人食、定期驱虫','轻',5,'0','admin',NOW()),
(NULL,'犬科','狗皮肤病（瘙痒掉毛）','频繁抓挠、皮肤红疹、局部脱毛、皮屑','真菌/螨虫感染、过敏、潮湿','外用抗真菌药浴；严重时就医刮片确诊','保持干燥、定期驱虫、避免接触病犬','中',6,'0','admin',NOW()),
(NULL,'犬科','狗打喷嚏/咳嗽','咳嗽、运动后喘、偶打喷嚏','犬窝咳、受凉或气管问题','保暖休息；持续咳嗽排查犬窝咳疫苗','接种窝咳疫苗、避免密集犬群','中',7,'0','admin',NOW()),
(NULL,'犬科','狗关节问题（大型犬）','起立困难、跛行、运动后不适','品种遗传、肥胖、运动损伤','控制体重、氨糖软骨素、适度游泳','幼年期科学喂养、避免爬楼','中',8,'0','admin',NOW()),
-- ===== 兔科 =====
(NULL,'兔科','兔软便/肠炎','粪便变小变软、粘毛、精神差','饮食结构不当、受凉、球虫','调整牧草为主、停零食；严重就医','以提摩西草为主、充足饮水','中',9,'0','admin',NOW()),
(NULL,'兔科','兔牙齿过长','流涎、采食少、嘴角湿','门齿/臼齿过度生长','就医磨牙；提供磨牙木/干草','常备干草磨牙、定期检查','中',10,'0','admin',NOW()),
(NULL,'兔科','兔应激/拒食','躲藏不动、不吃不喝','环境突变、噪音、同伴离去','安静环境、熟悉食物诱导；超24h就医','减少惊扰、稳定环境','中',11,'0','admin',NOW()),
-- ===== 鼠科 =====
(NULL,'鼠科','仓鼠湿尾/腹泻','尾部潮湿、精神萎靡、腹泻','细菌感染、应激、饮食不洁','隔离保暖、电解质水；严重就医','笼具清洁、忌喂生水','重',12,'0','admin',NOW()),
(NULL,'鼠科','仓鼠颊囊发炎','一侧脸肿、流口水、拒食','颊囊塞食腐败、外伤','清理颊囊、就医消炎','不喂粘性食物、定期观察','中',13,'0','admin',NOW()),
(NULL,'鼠科','仓鼠咬笼/应激','夜间狂躁咬笼、绕圈','环境小、无聊、缺乏磨牙','加大空间、跑轮、躲藏屋','充足运动空间与丰容','轻',14,'0','admin',NOW()),
-- ===== 鹦鹉科 =====
(NULL,'鹦鹉科','鹦鹉拉稀/肠炎','粪便稀水、肛门污、精神差','不洁饮水、生冷、细菌','干净温水、停果蔬；严重就医','每日换水、忌生冷','中',15,'0','admin',NOW()),
(NULL,'鹦鹉科','鹦鹉掉羽/啄羽','异常掉羽、自啄羽毛','换羽期正常/或寄生虫、无聊、缺营养','补充营养、丰容玩具；病理就医','均衡饮食、UVB光照','轻',16,'0','admin',NOW()),
(NULL,'鹦鹉科','鹦鹉呼吸异响','张口呼吸、尾随呼吸、咔咔声','呼吸道感染、温差大','保温、就医拍片','恒温环境、避免穿堂风','重',17,'0','admin',NOW()),
-- ===== 观赏鱼科 =====
(NULL,'观赏鱼科','观赏鱼白点病','体表白点、蹭缸、鳍收','小瓜虫、水温骤变','升温至30℃并加盐；专用药浴','稳定水温、新鱼检疫','中',18,'0','admin',NOW()),
(NULL,'观赏鱼科','观赏鱼烂鳍/烂尾','鳍边缘发白腐烂、游动迟缓','水质差、细菌感染','改善水质、黄粉药浴','规律换水、不过量投喂','中',19,'0','admin',NOW()),
(NULL,'观赏鱼科','观赏鱼肠炎','腹胀、拖白便、拒食','饲料变质、喂多','停食、大蒜素药饵','少食多餐、饲料新鲜','中',20,'0','admin',NOW()),
-- ===== 爬行科 =====
(NULL,'爬行科','龟腐皮/腐甲','皮肤/甲壳发白溃烂、拒食','水质差、外伤感染','干养+聚维酮碘消毒；严重就医','清洁水体、晒背','中',21,'0','admin',NOW()),
(NULL,'爬行科','龟白眼病','眼睑肿、难睁眼、拒食','水质差、维生素A缺','红霉素眼膏、改善水质','清洁水、补充维A','中',22,'0','admin',NOW()),
(NULL,'爬行科','蜥蜴蜕皮困难','旧皮残留、缠趾','湿度不足、缺钙','提高湿度、浅水浴；补钙','合理温湿度梯度','轻',23,'0','admin',NOW()),
(NULL,'爬行科','爬行类拒食','长时间不进食','温度低、应激、冬眠误判','测温达标、诱食；持续就医','适宜温区、减少打扰','中',24,'0','admin',NOW());
