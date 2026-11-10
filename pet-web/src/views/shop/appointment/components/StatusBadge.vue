<template>
  <span class="st-badge" :class="`st-badge--${meta.tone}`" :title="meta.label">
    <i class="st-badge__dot" aria-hidden="true"></i>{{ meta.label }}
  </span>
</template>

<script setup>
import { computed } from 'vue'
import { APPT_STATUS, STATUS_META } from '../appointmentStatus'

const props = defineProps({
  status: {
    type: String,
    default: APPT_STATUS.PENDING,
    validator: (v) => Object.values(APPT_STATUS).includes(v)
  }
})

// 未知状态兜底成「待处理」，避免脏状态让整张卡片渲染失败
const meta = computed(() => STATUS_META[props.status] || STATUS_META[APPT_STATUS.PENDING])
</script>

<style scoped lang="scss">
.st-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
  height: 22px;
  padding: 0 9px;
  border: 1px solid transparent;
  border-radius: var(--radius-pill);
  font-size: 11.5px;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
}

.st-badge__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
  opacity: .85;
}

/* 待处理：全站统一橙色 */
.st-badge--warn {
  color: var(--warning-500);
  background: var(--warning-50);
  border-color: var(--warning-100);
}

/* 服务中：品牌色 */
.st-badge--brand {
  color: var(--brand-700);
  background: var(--brand-50);
  border-color: var(--brand-200);
}

/* 已完成：绿色 */
.st-badge--ok {
  color: var(--success-500);
  background: var(--success-50);
  border-color: var(--success-100);
}

/* 已取消：灰色 */
.st-badge--muted {
  color: var(--text-3);
  background: var(--bg-sunken);
  border-color: var(--border-1);
}
</style>
