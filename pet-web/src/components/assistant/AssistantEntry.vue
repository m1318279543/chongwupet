<template>
  <!-- AI 助手入口：固定在顶栏「消息通知」左侧，点击开/合助手面板。
       与铃铛同族（34px 图标钮、悬停浅底），登录与否都能用。 -->
  <button
    type="button"
    class="as-entry"
    :class="{ on: active }"
    :title="active ? '关闭 AI 助手' : '打开 AI 助手'"
    :aria-label="active ? '关闭 AI 助手' : '打开 AI 助手'"
    @click="toggle"
  >
    <span class="as-entry-ico" aria-hidden="true">
      <svg viewBox="0 0 24 24"><path d="M12 2l1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9zM18.5 15l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9z"/></svg>
    </span>
  </button>
</template>

<script setup>
import { computed } from 'vue'
import { useAssistant } from './useAssistant'

const props = defineProps({
  // 打开面板时使用的场景：前台 shop / 后台 admin
  scene: { type: String, default: 'shop' }
})

const { state, open, close } = useAssistant()

// 面板开着且正是本入口的场景时高亮，再点一次即收起
const active = computed(() => state.open && state.scene === props.scene)

function toggle() {
  if (active.value) {
    close()
    return
  }
  // 不传 fresh：从顶栏进来是「接着问」，不把进行中的对话清掉
  open({ scene: props.scene })
}
</script>

<style scoped lang="scss">
/* 与 NotificationBell 的 .bell-btn 同一规格：34px 图标钮 + 悬停浅底 */
.as-entry {
  position: relative;
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.18s;
  &:hover { background: var(--bg-sunken); }
  &.on { background: var(--brand-50); }
}
.as-entry-ico {
  width: 22px;
  height: 22px;
  border-radius: var(--radius-sm);
  display: grid;
  place-items: center;
  background: var(--grad-brand);
  svg { width: 13px; height: 13px; fill: #fff; }
}
</style>
