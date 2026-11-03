<template>
  <el-dialog
    v-model="visible"
    title="我的位置"
    width="min(460px, 94vw)"
    append-to-body
  >
    <div class="lp">
      <p class="lp-tip">
        不用填经纬度。进页面就已自动定位并按距离排好门店；想更准，可以输入你所在的区县 / 商圈 / 地标，
        或（在 HTTPS 下）一键精确定位。
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
          <template v-else>按所选地点中心估算直线距离 · 实际路程以导航为准</template>
        </div>
      </div>
      <p class="lp-hint">{{ hint }}</p>

      <!-- 输入中文地名定位：离线地名库，运行时不请求任何外部地图服务 -->
      <p class="lp-title">输入我的位置</p>
      <div class="lp-search">
        <div class="lp-search__box">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>
          <input
            ref="inputRef"
            v-model="query"
            class="lp-search__input"
            type="text"
            placeholder="如：渝北区 / 观音桥 / 重庆北站"
            autocomplete="off"
            @keyup.enter="confirmFirst"
          />
          <button v-if="query" type="button" class="lp-search__clear" aria-label="清空" @click="query = ''">×</button>
        </div>
        <div v-if="suggestions.length" class="lp-sugg">
          <button
            v-for="p in suggestions"
            :key="p.key"
            type="button"
            class="lp-sugg__item"
            :class="{ 'is-on': locName === p.name }"
            @click="choosePlace(p)"
          >
            <span class="lp-sugg__name">{{ p.name }}</span>
            <span class="lp-sugg__kind">{{ p.kind }}</span>
          </button>
        </div>
        <p v-else class="lp-search__empty">未收录「{{ query }}」，试试区县名（如 渝北区）或下方常用商圈</p>
        <p class="lp-search__note">按地点中心估算，不是门牌级定位；选定后门店距离与导航起点立即更新</p>
      </div>

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
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { CHONGQING_SPOTS, searchPlaces } from '@/utils/geo'
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
  sourceLabel, isEstimated, hint, relocate, pickSpot, pickPlace, clearSpot
} = geo

const query = ref('')
const inputRef = ref(null)
const suggestions = computed(() => searchPlaces(query.value, 8))

function locate() {
  // http 站点浏览器根本不提供 Geolocation，直接说明并引导输入地点，别让按钮点了没反应
  if (!geo.secure) {
    ElMessage.warning('当前是 http 站点，浏览器不提供精确定位；输入你的位置或点一下商圈即可')
    return
  }
  relocate()
}

/** 回车取最佳匹配；输入完整地址时也能命中其中的区县/商圈 */
function confirmFirst() {
  const best = suggestions.value[0]
  if (!best) {
    ElMessage.warning('没找到这个地点，试试区县名或下方商圈')
    return
  }
  choosePlace(best)
}

function choosePlace(p) {
  pickPlace(p)
  ElMessage.success(`已按「${p.name}」重算距离，门店已按远近重排`)
  query.value = ''
  visible.value = false
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

// 每次打开都清空上次输入的残留
watch(visible, (v) => { if (v) query.value = '' })

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
.lp-title { margin: 16px 0 8px; font-size: 12.5px; font-weight: 700; color: var(--text-1); }

/* 地点输入 + 联想 */
.lp-search { position: relative; }
.lp-search__box {
  display: flex; align-items: center; gap: 8px; height: 40px; padding: 0 10px;
  border: 1px solid var(--border-1); border-radius: 10px; background: var(--bg-card);
  &:focus-within { border-color: var(--brand-300); }
  svg { width: 16px; height: 16px; flex: none; fill: none; stroke: var(--text-3); stroke-width: 1.9; }
}
.lp-search__input {
  flex: 1; min-width: 0; height: 100%; border: 0; outline: 0; background: none;
  font-family: inherit; font-size: 13.5px; color: var(--text-1);
  &::placeholder { color: var(--text-3); }
}
.lp-search__clear {
  border: 0; background: none; padding: 0 3px; font-size: 18px; line-height: 1;
  color: var(--text-3); cursor: pointer;
}
.lp-sugg {
  margin-top: 6px; max-height: 192px; overflow-y: auto;
  border: 1px solid var(--border-1); border-radius: 10px; background: var(--bg-card);
}
.lp-sugg__item {
  width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 10px;
  padding: 9px 12px; border: 0; border-bottom: 1px solid var(--border-1);
  background: none; font-family: inherit; font-size: 13px; color: var(--text-2); cursor: pointer;
  text-align: left;
  &:last-child { border-bottom: 0; }
  &:hover { background: var(--brand-50); color: var(--brand-700); }
  &.is-on { background: var(--brand-50); color: var(--brand-700); font-weight: 700; }
}
.lp-sugg__kind {
  flex: none; font-size: 11px; color: var(--text-3);
  padding: 2px 8px; border-radius: var(--radius-pill); background: var(--bg-card);
}
.lp-search__empty {
  margin: 8px 2px 0; font-size: 11.5px; color: var(--danger-600, #c65);
}
.lp-search__note { margin: 8px 2px 0; font-size: 11px; color: var(--text-3); line-height: 1.6; }

.lp-locate {
  width: 100%; height: 40px; margin-top: 14px;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  border: 0; border-radius: 10px; background: var(--brand-600, #2f7d6b); color: #fff;
  font-family: inherit; font-size: 13.5px; font-weight: 700; cursor: pointer;
  svg { width: 17px; height: 17px; fill: none; stroke: currentColor; stroke-width: 1.8; }
  &:hover { filter: brightness(1.08); }
  &.is-busy { opacity: .72; }
}
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
