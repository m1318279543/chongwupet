-- MySQL dump 10.13  Distrib 8.0.39, for Win64 (x86_64)
--
-- Host: localhost    Database: ry-pet
-- ------------------------------------------------------
-- Server version	8.0.39

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `pet_info`
--

DROP TABLE IF EXISTS `pet_info`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pet_info` (
  `pet_id` bigint NOT NULL AUTO_INCREMENT COMMENT '宠物ID',
  `category_id` bigint NOT NULL COMMENT '分类ID（关联 pet_category）',
  `pet_name` varchar(50) NOT NULL COMMENT '宠物名称',
  `breed` varchar(50) DEFAULT NULL COMMENT '品种（如：金毛、英短）',
  `age` varchar(20) DEFAULT NULL COMMENT '年龄（如：2岁、3个月）',
  `gender` char(1) DEFAULT '0' COMMENT '性别（0公 1母 2未知）',
  `price` decimal(10,2) DEFAULT '0.00' COMMENT '价格（元）',
  `image` varchar(255) DEFAULT '' COMMENT '宠物图片URL',
  `status` char(1) DEFAULT '0' COMMENT '状态（0在售 1已售 2下架）',
  `description` text COMMENT '宠物描述',
  `create_by` varchar(64) DEFAULT '' COMMENT '创建者',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `update_by` varchar(64) DEFAULT '' COMMENT '更新者',
  `update_time` datetime DEFAULT NULL COMMENT '更新时间',
  `remark` varchar(500) DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (`pet_id`)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='宠物信息表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pet_info`
--

LOCK TABLES `pet_info` WRITE;
/*!40000 ALTER TABLE `pet_info` DISABLE KEYS */;
INSERT INTO `pet_info` VALUES (1,1,'银渐层短毛猫','英国短毛猫','3个月','0',2500.00,'🐱','0','银渐层毛色，圆圆大脸盘，性格温顺粘人。已打第一针疫苗，已完成体内外驱虫，会用猫砂盆。适合首次养猫家庭。','admin','2026-09-22 17:13:22','',NULL,NULL),(2,1,'海双布偶猫','布偶猫','6个月','1',5000.00,'🐱','0','海豹双色布偶，一双宝石蓝眼睛，毛发丝滑如绸缎。性格极其亲人，已绝育，疫苗齐全。喜欢被抱抱。','admin','2026-09-22 17:13:22','',NULL,NULL),(3,1,'虎斑美短','美国短毛猫','4个月','0',2000.00,'🐱','0','经典银色虎斑纹，肌肉结实，活泼好动爱玩耍。已完成驱虫，打过两针疫苗。聪明易训练。','admin','2026-09-22 17:13:22','',NULL,NULL),(4,1,'重点色暹罗','暹罗猫','8个月','1',1800.00,'🐱','0','重点色暹罗，深色面庞配奶白身体，蓝眼如湖水。话痨性格，喜欢与人交流，疫苗齐全。','admin','2026-09-22 17:13:22','',NULL,NULL),(5,1,'红虎斑加菲','异国短毛猫','5个月','0',3000.00,'🐱','0','扁平圆脸，红虎斑毛色，像毛绒玩具。性格安静温顺，已驱虫，适合公寓饲养。','admin','2026-09-22 17:13:22','',NULL,NULL),(6,1,'苏格兰折耳','苏格兰折耳猫','3个月','1',2800.00,'🐱','0','立耳小折耳，圆脸大眼超萌。性格温和，喜欢趴着发呆。已打第一针疫苗，会用猫砂。','admin','2026-09-22 17:13:22','',NULL,NULL),(7,2,'金毛寻回幼犬','金毛寻回犬','3个月','0',3500.00,'🐶','0','阳光大暖男，3针疫苗齐全，已驱虫。性格温顺聪明，与人亲近，适合家庭饲养。带血统证书。','admin','2026-09-22 17:13:22','',NULL,NULL),(8,2,'红棕色泰迪','贵宾犬','2个月','1',2000.00,'🐶','0','红棕色玩具泰迪，不掉毛无体味，卷毛蓬松。已驱虫，性格粘人爱撒娇。适合公寓。','admin','2026-09-22 17:13:22','',NULL,NULL),(9,2,'三色柯基','威尔士柯基犬','3个月','0',4000.00,'🐶','0','三色短腿柯基，圆臀大耳，蹦跳超萌。性格活泼聪明，疫苗齐全。柯基屁股治愈一切。','admin','2026-09-22 17:13:22','',NULL,NULL),(10,2,'蓝眼哈士奇','西伯利亚雪橇犬','4个月','1',3000.00,'🐶','0','蓝眼黑白色，颜值担当。精力旺盛爱拆家，需要每天运动。已驱虫，适合有院子家庭。','admin','2026-09-22 17:13:22','',NULL,NULL),(11,2,'米色拉布拉多','拉布拉多寻回犬','3个月','0',3200.00,'🐶','0','米色幼犬，性格温顺，服从性高，可作为导盲犬家庭犬。3针疫苗齐全，已驱虫。','admin','2026-09-22 17:13:22','',NULL,NULL),(12,2,'纯白博美','博美犬','2个月','1',2500.00,'🐶','0','纯白色蓬松毛球，小巧灵动爱叫。已驱虫，适合女性和老人饲养。颜值担当。','admin','2026-09-22 17:13:22','',NULL,NULL),(13,3,'荷兰侏儒兔','荷兰侏儒兔','2个月','0',500.00,'🐰','0','体型小巧，纯白短耳，性格温顺不咬人。吃兔粮和干草，饲养简单。适合儿童初次养宠。','admin','2026-09-22 17:13:22','',NULL,NULL),(14,3,'黑白垂耳兔','垂耳兔','3个月','1',600.00,'🐰','0','黑白花色，耳朵下垂超萌，圆滚滚身材。性格亲人，已完成驱虫。喜欢被摸头。','admin','2026-09-22 17:13:22','',NULL,NULL),(15,3,'长毛安哥拉兔','安哥拉兔','4个月','0',800.00,'🐰','0','长毛蓬松如棉花糖，需每周梳毛。性格温和，适合有耐心的饲主。视觉治愈满分。','admin','2026-09-22 17:13:22','',NULL,NULL),(16,4,'金黄熊仓鼠','金丝熊','2个月','0',50.00,'🐹','0','金黄色金丝熊，胖嘟嘟圆滚滚，性格温顺亲人。配笼饲养，喂专用仓鼠粮。超治愈。','admin','2026-09-22 17:13:22','',NULL,NULL),(17,4,'银狐三线仓鼠','三线仓鼠','1.5个月','1',30.00,'🐹','0','银狐背线，活泼好动爱跑轮。小体型，适合学生党。独立饲养，怕热需避暑。','admin','2026-09-22 17:13:22','',NULL,NULL),(18,4,'白腹老公公仓鼠','老公公仓鼠','2个月','0',40.00,'🐹','0','最小型的仓鼠品种，白腹圆脸，像白胡子老爷爷。胆小但呆萌，需耐心驯化。','admin','2026-09-22 17:13:22','',NULL,NULL),(19,5,'黄绿虎皮鹦鹉','虎皮鹦鹉','3个月','0',80.00,'🐦','0','黄绿经典色，可训练说话，亲人度高。吃谷子小米。笼养，需常互动。入门级鹦鹉。','admin','2026-09-22 17:13:22','',NULL,NULL),(20,5,'白脸玄凤鹦鹉','玄凤鹦鹉','4个月','1',250.00,'🐦','0','白脸颊，头顶冠羽竖起超萌。聪明可学简单动作，性格温和。喜欢吹口哨。','admin','2026-09-22 17:13:22','',NULL,NULL),(21,5,'彩色牡丹鹦鹉','牡丹鹦鹉','3个月','0',150.00,'🐦','0','情侣鸟，色彩鲜艳，建议成对饲养。活泼爱叫，互动性强。需大笼活动空间。','admin','2026-09-22 17:13:22','',NULL,NULL),(22,6,'彩色孔雀鱼','孔雀鱼','3个月','0',15.00,'🐠','0','尾巴如孔雀开屏，色彩绚丽，繁殖力强易饲养。适合新手水族。群养效果最佳。','admin','2026-09-22 17:13:22','',NULL,NULL),(23,6,'将军斗鱼','斗鱼','4个月','1',25.00,'🐠','0','雄性将军斗鱼，尾鳍飘逸如舞裙，色彩艳丽。需单独饲养，配小缸即可。桌面赏心。','admin','2026-09-22 17:13:22','',NULL,NULL),(24,6,'红白琉金金鱼','金鱼','5个月','0',20.00,'🐠','0','传统琉金品种，红白花色，圆胖体型。寓意吉祥，适合中式鱼缸。耐养皮实。','admin','2026-09-22 17:13:22','',NULL,NULL);
/*!40000 ALTER TABLE `pet_info` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pet_category`
--

DROP TABLE IF EXISTS `pet_category`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pet_category` (
  `category_id` bigint NOT NULL AUTO_INCREMENT COMMENT '分类ID',
  `category_name` varchar(50) NOT NULL COMMENT '分类名称（如：犬类、猫类、鸟类）',
  `sort` int DEFAULT '0' COMMENT '显示顺序',
  `status` char(1) DEFAULT '0' COMMENT '状态（0正常 1停用）',
  `create_by` varchar(64) DEFAULT '' COMMENT '创建者',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `update_by` varchar(64) DEFAULT '' COMMENT '更新者',
  `update_time` datetime DEFAULT NULL COMMENT '更新时间',
  `remark` varchar(500) DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (`category_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='宠物分类表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pet_category`
--

LOCK TABLES `pet_category` WRITE;
/*!40000 ALTER TABLE `pet_category` DISABLE KEYS */;
INSERT INTO `pet_category` VALUES (1,'猫咪',1,'0','admin','2026-09-22 17:13:22','',NULL,'喵星人·温顺粘人·适合公寓'),(2,'狗狗',2,'0','admin','2026-09-22 17:13:22','',NULL,'汪星人·忠诚活泼·家庭伴侣'),(3,'兔子',3,'0','admin','2026-09-22 17:13:22','',NULL,'蹦蹦跳跳·安静可爱·易饲养'),(4,'仓鼠',4,'0','admin','2026-09-22 17:13:22','',NULL,'小巧玲珑·呆萌·口袋宠物'),(5,'鸟类',5,'0','admin','2026-09-22 17:13:22','',NULL,'羽衣斑斓·会说话·灵动'),(6,'水族',6,'0','admin','2026-09-22 17:13:22','',NULL,'游弋生姿·赏心悦目·静心');
/*!40000 ALTER TABLE `pet_category` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-09-30 16:33:19
