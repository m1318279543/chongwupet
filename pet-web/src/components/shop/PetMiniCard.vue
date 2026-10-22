<template>
  <component
    :is="to ? 'router-link' : 'div'"
    :to="to || undefined"
    class="mini-card"
    :class="{ clickable: !!to }"
  >
    <div class="mc-media">
      <img v-if="image && !imgFailed" :src="image" :alt="name" loading="lazy" @error="imgFailed = true" />
      <span v-else class="mc-holder">{{ placeholder || name }}</span>
      <span v-if="badge" class="mc-badge" :class="'tone-' + tone">{{ badge }}</span>
      <span v-if="corner" class="mc-corner">{{ corner }}</span>
    </div>

    <div class="mc-body">
      <div class="mc-head">
        <h3>{{ name }}</h3>
        <span v-if="sub" class="mc-sub">{{ sub }}</span>
      </div>
      <p v-if="meta" class="mc-meta">{{ meta }}</p>

      <slot />

      <div v-if="price || note || $slots.actions" class="mc-foot">
        <span v-if="price" class="mc-price"><em>¥</em>{{ price }}</span>
        <span v-if="note" class="mc-note">{{ note }}</span>
        <span v-if="$slots.actions" class="mc-spacer" />
        <slot name="actions" />
      </div>
    </div>
  </component>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  to: { type: [String, Object], default: '' },
  image: { type: String, default: '' },
  /** 无图时的占位文字（不再用 emoji） */
  placeholder: { type: String, default: '暂无图片' },
  name: { type: String, default: '' },
  /** 名称右侧的品种 / 分类 */
  sub: { type: String, default: '' },
  /** 一行元信息：品种 · 性别 · 月龄 */
  meta: { type: String, default: '' },
  price: { type: [String, Number], default: '' },
  note: { type: String, default: '' },
  /** 图片左上角角标（如「最佳匹配」「已认证」） */
  badge: { type: String, default: '' },
  /** 图片右上角数值角标（如匹配度 92%） */
  corner: { type: [String, Number], default: '' },
  tone: { type: String, default: 'brand' }
})

// 图片 404 时降级为占位文字，避免出现破图图标
const imgFailed = ref(false)
watch(() => props.image, () => { imgFailed.value = false })
</script>

<style scoped lang="scss">
.mini-card {
  display: flex;
  flex-direction: column;
  background: var(--bg-card);
  border: 1px solid var(--border-1);
  border-radius: var(--radius-lg);
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.18s, box-shadow 0.18s, transform 0.18s;

  &.clickable:hover {
    transform: translateY(-3px);
    border-color: var(--brand-200);
    box-shadow: var(--shadow-sm);
  }
}

.mc-media {
  position: relative;
  aspect-ratio: 4 / 3;
  background: var(--bg-sunken);
  overflow: hidden;
  border-bottom: 1px solid var(--border-1);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform 0.45s cubic-bezier(0.2, 0.7, 0.3, 1);
  }

  .mini-card:hover img { transform: scale(1.035); }

  .mc-holder {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12.5px;
    color: var(--text-3);
  }
}

.mc-badge,
.mc-corner {
  position: absolute;
  font-size: 11.5px;
  font-weight: 600;
  line-height: 1;
  padding: 5px 9px;
  border-radius: var(--radius-pill);
}

.mc-badge {
  left: 10px;
  top: 10px;

  &.tone-brand { background: var(--brand-600); color: #fff; }
  &.tone-success { background: var(--success-500); color: #fff; }
  &.tone-warning { background: var(--warning-500); color: #fff; }
  &.tone-plain {
    background: rgba(255, 255, 255, 0.92);
    color: var(--text-1);
    border: 1px solid var(--border-1);
  }
}

.mc-corner {
  right: 10px;
  top: 10px;
  background: rgba(255, 255, 255, 0.94);
  color: var(--brand-700);
  font-variant-numeric: tabular-nums;
}

.mc-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 13px 14px 14px;
  flex: 1;
  min-width: 0;
}

.mc-head {
  display: flex;
  align-items: baseline;
  gap: 7px;
  min-width: 0;

  h3 {
    margin: 0;
    font-size: 15.5px;
    font-weight: 700;
    line-height: 1.35;
    color: var(--text-1);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .mc-sub {
    font-size: 12px;
    color: var(--text-3);
    white-space: nowrap;
    flex-shrink: 0;
  }
}

.mc-meta {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--text-3);
}

.mc-foot {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-top: auto;
  padding-top: 2px;
}

.mc-price {
  font-size: 19px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--price);
  font-variant-numeric: tabular-nums;

  em {
    font-style: normal;
    font-size: 12.5px;
    margin-right: 1px;
  }
}

.mc-note {
  font-size: 12px;
  color: var(--text-3);
}

.mc-spacer { flex: 1; }
</style>
