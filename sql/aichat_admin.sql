-- AI 咨询记录后台：会话加意图分类列（2026-10-30）
-- 幂等：列已存在时报 Duplicate column 可忽略
USE `ry-pet`;

ALTER TABLE pet_ai_conversation
    ADD COLUMN intent varchar(32) DEFAULT NULL COMMENT '首问意图分类（goods/order_list/knowledge...）' AFTER scene;

CREATE INDEX idx_ai_conv_intent ON pet_ai_conversation (intent);

-- 存量会话按首条助手消息无法可靠回溯意图，保持 NULL，后台显示「未分类」
