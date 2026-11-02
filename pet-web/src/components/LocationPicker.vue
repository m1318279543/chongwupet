<template>
  <el-dialog
    v-model="visible"
    title="设置我的位置"
    width="min(460px, 94vw)"
    append-to-body
    @open="syncFromSaved"
  >
    <div class="lp">
      <p class="lp-tip">设置后每家门店都会显示「距您多远」，并按距离从近到远排列。</p>

      <div class="lp-row">
        <el-button size="small" :loading="geoStatus === 'locating'" @click="locate">使用浏览器定位</el-button>
        <span class="lp-state" :class="{ 'is-ok': geoStatus === 'granted' }">{{ stateText }}</span>
      </div>

      <p class="lp-title">常用地标</p>
      <div class="lp-spots">
        <button
          v-for="sp in CHONGQING_SPOTS"
          :key="sp.key"
          type="button"
          class="lp-spot"
          :class="{ 'is-on': form.name === sp.name && !form.coords }"
          @click="pickSpot(sp)"
        >{{ sp.name }}</button>
      </div>

      <p class="lp-title">自定义位置</p>
      <el-input v-model="form.name" size="default" maxlength="20" show-word-limit
        placeholder="地点名称，如「公司」「重庆北站」" class="lp-input" />
      <el-input v-model="form.coords" size="default"
        placeholder="经纬度，如 106.577315,29.557666" class="lp-input" />
      <p class="lp-help">
        在高德 / 腾讯地图里长按（电脑上右键）地点复制坐标，粘贴到上面即可；
        支持「经度,纬度」或「纬度,经度」两种顺序。
      </p>
      <p v-if="error" class="lp-err">{{ error }}</p>
    </div>

    <template #footer>
      <div class="lp-foot">
        <button v-if="hasSaved" type="button" class="lp-clear" @click="clear">清除位置</button>
        <div class="lp-foot__right">
          <el-button @click="visible = false">取消</el-button>
          <el-button type="primary" @click="save">保存并使用</el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { CHONGQING_SPOTS, parseCoords } from '@/utils/geo'
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
const { status: geoStatus, coords: geoCoords, savedSpot, start: startLocate, setCustom, clearSpot } = geo

const form = reactive({ name: '', coords: '' })
const error = ref('')
const hasSaved = computed(() => !!savedSpot.value)

const stateText = computed(() => {
  switch (geoStatus.value) {
    case 'locating':
      return '定位中…'
    case 'granted':
      return `已定位${geoCoords.value && geoCoords.value.accuracy ? `（±${Math.round(geoCoords.value.accuracy)} m）` : ''}`
    case 'insecure':
      return '当前是 http 站点，浏览器不允许定位，请选地标或填坐标'
    case 'denied':
      return '定位权限被拒绝，可手动设置'
    case 'unsupported':
      return '当前浏览器不支持定位，可手动设置'
    case 'error':
      return '定位失败，可手动设置'
    case 'manual':
      return savedSpot.value ? `当前：${savedSpot.value.name}` : '尚未设置'
    default:
      return hasSaved.value ? '已保存位置' : '尚未设置'
  }
})

function syncFromSaved() {
  error.value = ''
  const spot = savedSpot.value
  if (spot) {
    form.name = spot.name || ''
    form.coords = `${spot.lng},${spot.lat}`
  } else {
    form.name = ''
    form.coords = ''
  }
}

function pickSpot(sp) {
  form.name = sp.name
  form.coords = `${sp.lng},${sp.lat}`
  error.value = ''
}

function locate() {
  error.value = ''
  startLocate()
}

// 浏览器定位成功后直接采用，省去再点保存
watch(geoStatus, (v) => {
  if (v === 'granted' && visible.value) {
    ElMessage.success('已使用当前位置')
    visible.value = false
  }
})

function save() {
  const parsed = parseCoords(form.coords)
  if (!parsed) {
    error.value = '请填写正确的经纬度，例如 106.577315,29.557666'
    return
  }
  setCustom(form.name, parsed.lng, parsed.lat)
  ElMessage.success('位置已保存，门店已按距离排序')
  visible.value = false
}

function clear() {
  clearSpot()
  form.name = ''
  form.coords = ''
  ElMessage.success('已清除位置')
  visible.value = false
}
</script>

<style scoped lang="scss">
.lp { font-size: 13px; color: var(--text-2); }
.lp-tip { margin: 0 0 12px; font-size: 12.5px; color: var(--text-3); line-height: 1.6; }
.lp-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.lp-state { font-size: 12px; color: var(--text-3); &.is-ok { color: var(--brand-700); font-weight: 600; } }
.lp-title {
  margin: 16px 0 8px; font-size: 12.5px; font-weight: 700; color: var(--text-1);
}
.lp-spots { display: flex; flex-wrap: wrap; gap: 8px; }
.lp-spot {
  height: 28px; padding: 0 12px; border-radius: var(--radius-pill);
  border: 1px solid var(--border-1); background: var(--bg-card); color: var(--text-2);
  font-family: inherit; font-size: 12.5px; cursor: pointer;
  &:hover { border-color: var(--brand-300); color: var(--brand-700); }
  &.is-on { background: var(--brand-50); border-color: var(--brand-300); color: var(--brand-700); font-weight: 700; }
}
.lp-input { margin-bottom: 8px; }
.lp-help { margin: 2px 0 0; font-size: 11.5px; color: var(--text-3); line-height: 1.6; }
.lp-err { margin: 8px 0 0; font-size: 12px; color: #d92d20; }
.lp-foot { display: flex; align-items: center; justify-content: space-between; }
.lp-foot__right { display: flex; gap: 8px; margin-left: auto; }
.lp-clear {
  border: 0; background: none; padding: 0; font-family: inherit;
  font-size: 12.5px; color: var(--text-3); cursor: pointer;
  &:hover { color: var(--danger-600); }
}
</style>
