<template>
  <article class="ap-card">
    <!-- 头部：宠物 + 服务项目 / 状态 Badge -->
    <header class="ap-card__head">
      <div class="ap-card__title">
        <span class="ap-card__pet">{{ appointment.petName }}</span>
        <span class="ap-card__svc">{{ appointment.serviceName }}</span>
      </div>
      <StatusBadge :status="appointment.status" />
    </header>

    <!-- 身体：预约时间 | 门店 | 手机号（脱敏） -->
    <div class="ap-card__body">
      <span class="ap-meta">
        <el-icon><Timer /></el-icon>{{ appointment.timeText }}
      </span>
      <span class="ap-meta" :class="{ 'is-muted': !appointment.storeName }">
        <el-icon><Shop /></el-icon>{{ appointment.storeName || '门店待确认' }}
      </span>
      <span
        class="ap-meta ap-meta--phone"
        :class="{ 'is-invalid': !appointment.phone.valid }"
        :title="appointment.phone.valid ? '为保护隐私已脱敏' : '后端返回的手机号格式不正确'"
      >
        <el-icon><Phone /></el-icon>{{ appointment.phone.text }}
      </span>
    </div>

    <!-- 底部：订单号 / 操作区 -->
    <footer class="ap-card__foot">
      <span class="ap-card__no">订单号 {{ appointment.orderNo }}</span>
      <div class="ap-card__acts">
        <button
          v-if="appointment.canPay"
          type="button"
          class="ui-btn ui-btn--solid ap-btn"
          @click="emit('pay', appointment)"
        >去支付</button>
        <button
          v-if="appointment.canEvaluate"
          type="button"
          class="ui-linkbtn"
          @click="emit('evaluate', appointment)"
        >评价服务</button>
        <button
          v-if="appointment.canCancel"
          type="button"
          class="ui-linkbtn ui-linkbtn--danger ap-btn-cancel"
          :disabled="busy"
          @click="emit('cancel', appointment)"
        >{{ busy ? '取消中…' : '取消预约' }}</button>
      </div>
    </footer>
  </article>
</template>

<script setup>
import { Timer, Shop, Phone } from '@element-plus/icons-vue'
import StatusBadge from './StatusBadge.vue'

defineProps({
  appointment: {
    type: Object,
    required: true
  },
  /** 取消请求进行中：按钮置灰，避免重复提交 */
  busy: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['cancel', 'pay', 'evaluate'])
</script>

<style scoped lang="scss">
/* 一行预约：外层的“面”由父容器 .ap-list 提供，这里只负责行内排版与分隔线 */
.ap-card {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  padding: var(--sp-3) var(--sp-4);
  background: transparent;
  transition: background .15s ease;
}

/* 行与行之间用 1px 细线分隔（列表行级用 rule-soft） */
.ap-card + .ap-card {
  border-top: var(--rule-soft);
}

.ap-card:hover {
  background: var(--bg-row-hover);
}

/* ---- 头部 ---- */
.ap-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
  min-width: 0;
}

.ap-card__title {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  min-width: 0;
}

.ap-card__pet {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ap-card__svc {
  position: relative;
  padding-left: var(--sp-2);
  font-size: 13px;
  color: var(--text-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    width: 1px;
    height: 11px;
    transform: translateY(-50%);
    background: var(--border-1);
  }
}

/* ---- 身体 ---- */
.ap-card__body {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--sp-1) var(--sp-4);
  font-size: 12.5px;
  color: var(--text-3);
}

.ap-meta {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  font-variant-numeric: tabular-nums;

  .el-icon {
    flex-shrink: 0;
    font-size: 13px;
    color: var(--text-4);
  }

  & + & {
    position: relative;
    padding-left: var(--sp-4);

    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      width: 1px;
      height: 10px;
      transform: translateY(-50%);
      background: var(--border-1);
    }
  }
}

.ap-meta.is-muted {
  color: var(--text-4);
}

/* 脏数据：明确标成无效号码，别让用户以为号码被隐藏了 */
.ap-meta.is-invalid {
  color: var(--danger-600);

  .el-icon { color: var(--danger-600); }
}

/* ---- 底部 ---- */
.ap-card__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
  flex-wrap: wrap;
  padding-top: var(--sp-2);
  border-top: 1px dashed var(--border-1);
}

.ap-card__no {
  font-family: var(--font-num);
  font-size: 11.5px;
  color: var(--text-3);
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}

.ap-card__acts {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  margin-left: auto;
}

.ap-btn {
  padding: 5px 14px;
  font-size: 12.5px;
}

@media (max-width: 768px) {
  .ap-card {
    padding: var(--sp-3);
  }

  .ap-card__body {
    gap: var(--sp-1) var(--sp-3);
  }

  /* 换行后竖直分隔线会落到行首，移动端直接去掉 */
  .ap-meta + .ap-meta {
    padding-left: 0;

    &::before { display: none; }
  }

  .ap-card__foot {
    align-items: flex-start;
    flex-direction: column;
  }

  .ap-card__acts {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
