<template>
  <div class="stat-row" :style="{ '--cols': cols }">
    <component
      :is="it.onClick ? 'button' : 'div'"
      v-for="it in items"
      :key="it.label"
      class="stat-card"
      :class="[`tone-${it.tone || 'default'}`, { clickable: !!it.onClick }]"
      :type="it.onClick ? 'button' : undefined"
      @click="it.onClick && it.onClick()"
    >
      <span class="label">{{ it.label }}</span>
      <span class="value">
        <em v-if="it.prefix" class="affix">{{ it.prefix }}</em>{{ it.value
        }}<em v-if="it.suffix" class="affix">{{ it.suffix }}</em>
      </span>
    </component>
  </div>
</template>

<script setup>
// 后台概览统计卡：以前 5 个页面各自复制一份 .stat-card，
// 且 &.primary 在订单/工单是橙色、在采购/退款是绿色（同名反义）。
// 这里收敛成一套 tone 语义：
//   brand   橙 —— 需要推进的主指标（待发货 / 服务中）
//   warn    黄 —— 待处理提醒（待付款 / 待审核 / 待入库）
//   success 绿 —— 已完结（已退款 / 已入库 / 已完成）
//   danger  红 —— 异常（低库存）
//   money   深橙 —— 金额
//   default 灰 —— 中性计数
defineProps({
  // [{ label, value, tone, prefix, suffix, onClick }]
  items: { type: Array, required: true },
  cols: { type: [Number, String], default: 4 }
})
</script>

<style scoped lang="scss">
.stat-row {
  display: grid;
  grid-template-columns: repeat(var(--cols, 4), minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 12px;
}
.stat-card {
  display: block;
  text-align: left;
  padding: 14px 16px;
  background: var(--bg-card);
  border: 0;
  border-left: 3px solid var(--border-1);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-card);
  font-family: inherit;
  min-height: 44px;

  .label { display: block; margin: 0; font-size: var(--fs-2); color: var(--text-3); }
  .value {
    display: block; margin-top: 6px; font-size: 22px; font-weight: 500;
    color: var(--text-1); font-variant-numeric: tabular-nums;
    .affix { font-style: normal; font-size: var(--fs-6); margin-right: 1px; }
  }

  &.clickable { cursor: pointer; transition: box-shadow .2s, transform .2s;
    &:hover { box-shadow: var(--shadow-float); transform: translateY(-1px); }
    &:active { transform: none; }
  }
  &.tone-brand { border-left-color: var(--brand-500); }
  &.tone-warn { border-left-color: var(--warning-500); }
  &.tone-success { border-left-color: var(--success-500); }
  &.tone-danger { border-left-color: var(--danger-500); }
  &.tone-money { border-left-color: var(--brand-700);
    .value { color: var(--brand-700); font-size: var(--fs-8); }
  }
}

// 平板三列、手机两列（以前固定 span=6，窄屏被压成四张极窄卡片）
@media (max-width: 1000px) {
  .stat-row { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
@media (max-width: 768px) {
  .stat-row { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .stat-card { padding: 12px 14px;
    .value { font-size: var(--fs-8); }
  }
}
</style>
