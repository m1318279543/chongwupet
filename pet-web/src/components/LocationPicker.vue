<template>
  <el-dialog
    v-model="visible"
    title="我的位置"
    width="min(440px, 94vw)"
    append-to-body
  >
    <div class="lp">
      <p class="lp-tip">
        不用填地址，也不用填经纬度。进入页面就已自动定位，门店会按距离从近到远排列；
        想更准可以一键精确定位，或点一下附近商圈。
      </p>

      <!-- 当前生效的位置：来源 + 名称 + 精度，一眼看清是精确还是估算 -->
      <div class="lp-card" :class="{ 'is-est': isEstimated }">
        <div class="lp-card__head">
          <span class="lp-src">{{ sourceLabel }}</span>
          <span v-if="geoStatus === 'locating'" class="lp-live">定位中…</span>
        </div>
        <div class="lp-card__name">{{ locName }}</div>
        <div class="lp-card__meta">
          <template v-if="geoCoords && geoCoords.accuracy">精度 ±{{ Math.round(geoCoords.accuracy) }} m</template>
          <template v-else>按直线距离估算 · 实际路程以导航为准</template>
        </div>
      </div>
      <p class="lp-hint">{{ hint }}</p>

      <button
        type="button"
        class="lp-locate"
        :class="{ 'is-busy': geoStatus === 'locating' }"
        @click="locate"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>
        {{ geoStatus === 'locating' ? '正在定位…' : '使用我的当前位置' }}
      </button>

      <p class="lp-title">或点选附近商圈（零输入）</p>
      <div class="lp-spots">
        <button
          v-for="sp in CHONGQING_SPOTS"
          :key="sp.key"
          type="button"
          class="lp-spot"
          :class="{ 'is-on': locName === sp.name }"
          @click="choose(sp)"
        >{{ sp.name }}</button>
      </div>
    </div>

    <template #footer>
      <div class="lp-foot">
        <button v-if="savedSpot" type="button" class="lp-clear" @click="reset">恢复自动定位</button>
        <div class="lp-foot__right">
          <el-button type="primary" @click="visible = false">完成</el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { CHONGQING_SPOTS } from '@/utils/geo'
import { useGeolocation } from '@/composables/useGeolocation'

const props = defineProps({
  modelValue: { type: Boolean, default: false }
})
const emit = defineEmits(['update:modelValue'])

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const geo = useGeolocation()
const {
  status: geoStatus, coords: geoCoords, savedSpot, savedSpotName: locName,
  sourceLabel, isEstimated, hint, relocate, pickSpot, clearSpot
} = geo

function locate() {
  // http 站点浏览器根本不提供 Geolocation，直接说明并引导点选商圈，别让按钮点了没反应
  if (!geo.secure) {
    ElMessage.warning('当前是 http 站点，浏览器不提供精确定位；点一下下方附近商圈即可')
    return
  }
  relocate()
}

function choose(sp) {
  pickSpot(sp)
  ElMessage.success(`已切换到${sp.name}，门店已按距离重排`)
  visible.value = false
}

function reset() {
  clearSpot()
  ElMessage.success('已恢复自动定位')
  visible.value = false
}

// 精确坐标一到手就收起弹窗，避免挡住门店列表
watch(geoStatus, (v, old) => {
  if (v === 'granted' && old === 'locating' && visible.value) {
    ElMessage.success('已使用当前位置')
    visible.value = false
  }
})
</script>

<style scoped lang="scss">
.lp { font-size: 13px; color: var(--text-2); }
.lp-tip { margin: 0 0 14px; font-size: 12.5px; color: var(--text-3); line-height: 1.7; }
.lp-card {
  padding: 12px 14px; border-radius: 12px;
  border: 1px solid var(--brand-300); background: var(--brand-50);
  &.is-est { border-color: var(--border-1); background: var(--bg-card); }
}
.lp-card__head { display: flex; align-items: center; justify-content: space-between; }
.lp-src {
  font-size: 11.5px; font-weight: 700; color: var(--brand-700);
  padding: 2px 9px; border-radius: var(--radius-pill); background: var(--bg-card);
  .is-est & { color: var(--text-3); }
}
.lp-live { font-size: 11.5px; color: var(--brand-700); }
.lp-card__name { margin: 9px 0 4px; font-size: 17px; font-weight: 800; color: var(--text-1); }
.lp-card__meta { font-size: 11.5px; color: var(--text-3); }
.lp-hint { margin: 9px 0 14px; font-size: 11.5px; color: var(--text-3); line-height: 1.6; }
.lp-locate {
  width: 100%; height: 40px; display: flex; align-items: center; justify-content: center; gap: 8px;
  border: 0; border-radius: 10px; background: var(--brand-600, #2f7d6b); color: #fff;
  font-family: inherit; font-size: 13.5px; font-weight: 700; cursor: pointer;
  svg { width: 17px; height: 17px; fill: none; stroke: currentColor; stroke-width: 1.8; }
  &:hover { filter: brightness(1.08); }
  &.is-busy { opacity: .72; }
}
.lp-title { margin: 18px 0 8px; font-size: 12.5px; font-weight: 700; color: var(--text-1); }
.lp-spots { display: flex; flex-wrap: wrap; gap: 8px; }
.lp-spot {
  height: 30px; padding: 0 12px; border-radius: var(--radius-pill);
  border: 1px solid var(--border-1); background: var(--bg-card); color: var(--text-2);
  font-family: inherit; font-size: 12.5px; cursor: pointer;
  &:hover { border-color: var(--brand-300); color: var(--brand-700); }
  &.is-on { background: var(--brand-50); border-color: var(--brand-300); color: var(--brand-700); font-weight: 700; }
}
.lp-foot { display: flex; align-items: center; justify-content: space-between; }
.lp-foot__right { display: flex; gap: 8px; margin-left: auto; }
.lp-clear {
  border: 0; background: none; padding: 0; font-family: inherit;
  font-size: 12.5px; color: var(--text-3); cursor: pointer;
  &:hover { color: var(--danger-600); }
}
</style>
