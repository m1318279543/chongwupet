-- 宠物健康与服务档案表（前台健康筛查/真实信息/专业养护/售后无忧四个页面的数据来源）
-- 后台可维护，前台实时展示
DROP TABLE IF EXISTS pet_health;
CREATE TABLE pet_health (
  health_id        BIGINT       NOT NULL AUTO_INCREMENT COMMENT '档案ID',
  pet_id           BIGINT       NOT NULL                COMMENT '宠物ID',
  archive_no       VARCHAR(32)  DEFAULT ''              COMMENT '档案编号（一宠一档）',
  -- 健康筛查
  vaccine_name     VARCHAR(64)  DEFAULT ''              COMMENT '疫苗名称（猫三联/犬四联等）',
  vaccine_progress VARCHAR(32)  DEFAULT ''              COMMENT '疫苗进度（如 3/3）',
  vaccine_date     DATE         NULL                    COMMENT '最近接种日期',
  deworm_name      VARCHAR(64)  DEFAULT ''              COMMENT '驱虫用药',
  deworm_date      DATE         NULL                    COMMENT '驱虫日期',
  exam_items       VARCHAR(128) DEFAULT ''              COMMENT '体检项目（如 血常规、粪检、皮肤镜检）',
  exam_result      VARCHAR(32)  DEFAULT ''              COMMENT '体检结论（全部合格/合格（备注）/复查中）',
  exam_date        DATE         NULL                    COMMENT '体检日期',
  exam_hospital    VARCHAR(64)  DEFAULT ''              COMMENT '体检机构',
  genetic_screen   VARCHAR(128) DEFAULT ''              COMMENT '遗传病排查项',
  health_level     VARCHAR(16)  DEFAULT ''              COMMENT '健康等级（优秀/良好/观察中）',
  health_note      VARCHAR(255) DEFAULT ''              COMMENT '健康备注',
  -- 真实信息
  source_channel   VARCHAR(64)  DEFAULT ''              COMMENT '来源渠道',
  source_place     VARCHAR(64)  DEFAULT ''              COMMENT '来源地',
  father_info      VARCHAR(64)  DEFAULT ''              COMMENT '父本',
  mother_info      VARCHAR(64)  DEFAULT ''              COMMENT '母本',
  birth_date       DATE         NULL                    COMMENT '出生日期',
  is_photo_real    CHAR(1)      DEFAULT '0'             COMMENT '是否实拍（0是 1否）',
  -- 专业养护
  temperament      VARCHAR(128) DEFAULT ''              COMMENT '性格特点',
  feed_plan        VARCHAR(255) DEFAULT ''              COMMENT '喂养方案',
  care_points      VARCHAR(255) DEFAULT ''              COMMENT '护理要点',
  skill_level      VARCHAR(16)  DEFAULT ''              COMMENT '饲养难度（入门/进阶/挑战）',
  -- 售后无忧
  guarantee_days   INT          DEFAULT 7               COMMENT '健康保障天数',
  contract_no      VARCHAR(32)  DEFAULT ''              COMMENT '购宠合同编号',
  delivery_support VARCHAR(64)  DEFAULT ''              COMMENT '送达方式',
  aftersale_note   VARCHAR(255) DEFAULT ''              COMMENT '售后说明',
  -- 通用
  status           CHAR(1)      DEFAULT '0'             COMMENT '状态（0正常 1停用）',
  del_flag         CHAR(1)      DEFAULT '0'             COMMENT '删除标志（0存在 2删除）',
  create_by        VARCHAR(64)  DEFAULT ''              COMMENT '创建者',
  create_time      DATETIME     NULL                    COMMENT '创建时间',
  update_by        VARCHAR(64)  DEFAULT ''              COMMENT '更新者',
  update_time      DATETIME     NULL                    COMMENT '更新时间',
  remark           VARCHAR(500) DEFAULT NULL            COMMENT '备注',
  PRIMARY KEY (health_id),
  UNIQUE KEY uk_pet_health_pet (pet_id),
  KEY idx_pet_health_level (health_level)
) ENGINE=InnoDB AUTO_INCREMENT=3000 DEFAULT CHARSET=utf8mb4 COMMENT='宠物健康与服务档案';
