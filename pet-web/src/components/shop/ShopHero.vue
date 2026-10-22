<template>
  <section class="shop-hero">
    <div class="sh-inner" :class="{ 'has-aside': hasAside, 'is-narrow': narrow }">
      <div class="sh-copy">
        <span v-if="eyebrow" class="sh-eyebrow"><i class="sh-dot" />{{ eyebrow }}</span>

        <h1 v-if="title">
          <template v-if="hlStart >= 0">
            {{ title.slice(0, hlStart) }}<em>{{ highlight }}</em>{{ title.slice(hlStart + highlight.length) }}
          </template>
          <template v-else>{{ title }}</template>
        </h1>

        <p v-if="desc" class="sh-desc">{{ desc }}</p>

        <div v-if="$slots.chips" class="sh-chips"><slot name="chips" /></div>
        <div v-if="$slots.actions" class="sh-actions"><slot name="actions" /></div>

        <dl v-if="stats && stats.length" class="sh-stats">
          <div v-for="s in stats" :key="s.label" class="sh-stat">
            <dt>{{ s.value }}<span v-if="s.unit">{{ s.unit }}</span></dt>
            <dd>{{ s.label }}</dd>
          </div>
        </dl>
      </div>

      <div v-if="hasAside" class="sh-aside"><slot name="aside" /></div>
    </div>
  </section>
</template>

<script setup>
import { computed, useSlots } from 'vue'

const props = defineProps({
  eyebrow: { type: String, default: '' },
  title: { type: String, default: '' },
  /** 标题里要高亮的一段文字（品牌色 + 手写下划线） */
  highlight: { type: String, default: '' },
  desc: { type: String, default: '' },
  /** [{ value: '28', unit: '项', label: '健康筛查项目' }] */
  stats: { type: Array, default: () => [] },
  /** 窄版：用于表单类页面，容器收到 1100 */
  narrow: { type: Boolean, default: false }
})

const slots = useSlots()
const hasAside = computed(() => !!slots.aside)
const hlStart = computed(() => {
  if (!props.highlight || !props.title) return -1
  return props.title.indexOf(props.highlight)
})
</script>

<style scoped lang="scss">
.shop-hero {
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(720px 340px at 84% 0%, var(--brand-100) 0%, rgba(255, 255, 255, 0) 70%),
    linear-gradient(180deg, var(--brand-50) 0%, var(--bg-page) 100%);
  border-bottom: 1px solid var(--border-1);
}

.sh-inner {
  max-width: var(--container-lg);
  margin: 0 auto;
  padding: 44px 24px 48px;
  display: grid;
  gap: 48px;
  align-items: center;

  &.has-aside {
    grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
  }
  &.is-narrow {
    max-width: var(--container-md);
  }
}

.sh-copy { min-width: 0; }

.sh-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 12px 5px 10px;
  background: var(--bg-card);
  border: 1px solid var(--border-1);
  border-radius: var(--radius-pill);
  font-size: 12.5px;
  font-weight: 500;
  color: var(--text-2);
  box-shadow: var(--shadow-card);

  .sh-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--brand-500);
    flex-shrink: 0;
  }
}

h1 {
  margin: 18px 0 0;
  font-size: clamp(28px, 3vw, 40px);
  line-height: 1.2;
  font-weight: 700;
  letter-spacing: -0.012em;
  color: var(--text-1);

  em {
    position: relative;
    font-style: normal;
    color: var(--brand-800);
    white-space: nowrap;
    // 高亮笔触：只压住文字下半段，不额外加下划线元素
    background: linear-gradient(to top, var(--brand-100) 0 34%, transparent 34%);
    padding: 0 2px;
  }
}

.sh-desc {
  margin: 14px 0 0;
  max-width: 34em;
  font-size: 15px;
  line-height: 1.8;
  color: var(--text-2);
}

.sh-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 22px;
}

.sh-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 26px;
}

.sh-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0;
  margin: 32px 0 0;

  .sh-stat {
    padding: 0 28px;
    border-left: 1px solid var(--border-1);

    &:first-child {
      padding-left: 0;
      border-left: 0;
    }

    dt {
      font-size: 24px;
      font-weight: 700;
      line-height: 1.2;
      letter-spacing: -0.02em;
      color: var(--text-1);
      font-variant-numeric: tabular-nums;

      span {
        font-size: 12.5px;
        font-weight: 600;
        margin-left: 2px;
        color: var(--text-2);
      }
    }

    dd {
      margin: 3px 0 0;
      font-size: 12.5px;
      color: var(--text-3);
    }
  }
}

.sh-aside { min-width: 0; }

@media (max-width: 1000px) {
  .sh-inner {
    padding: 36px 24px 40px;
    gap: 32px;

    &.has-aside {
      grid-template-columns: minmax(0, 1fr);
    }
  }
}

@media (max-width: 768px) {
  .sh-inner {
    padding: 28px 16px 32px;
    gap: 24px;
  }
  h1 { font-size: 25px; }
  .sh-desc { font-size: 14px; }

  .sh-stats {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px 20px;
    margin-top: 26px;

    .sh-stat {
      padding: 0;
      border-left: 0;

      dt { font-size: 20px; }
      dd { font-size: 11.5px; }
    }
  }
}
</style>
