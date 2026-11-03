import { computed, onMounted, ref } from 'vue'
import { CHONGQING_SPOTS, CITY_CENTER } from '@/utils/geo'

/**
 * 顾客定位：零输入、自动定位、三级降级。
 *
 * 1) 页面加载即自动尝试浏览器 Geolocation（HTTPS / localhost），顾客走动距离实时更新
 * 2) 浏览器不给权限（http 站点、拒绝授权、不支持）→ 自动用城市中心做「估算定位」，
 *    页面依然直接显示「距您多远」并按距离排序，绝不出现空白或让顾客填坐标
 * 3) 顾客想更准 → 在「我的位置」里输入中文地名（或点一下附近商圈）即可，
 *    全程不需要输入经纬度，也不需要外部地图接口
 *
 * 状态放在模块作用域：首页 / 预约页 / 位置弹窗共用同一份 coords，
 * 任意一处定位成功，全站距离与导航起点立刻同步（旧实现每个组件各起一个 watcher，互不感知）。
 */
const SPOT_KEY = 'pet-my-spot'
const SPOT_EVENT = 'pet-spot-changed'

const supported = typeof navigator !== 'undefined' && !!navigator.geolocation
const secure = typeof window === 'undefined' ? true : window.isSecureContext

/** 读取上次保存的位置：兼容旧版（只存地标 key 字符串） */
function loadSpot() {
  try {
    const raw = localStorage.getItem(SPOT_KEY)
    if (!raw) return null
    if (raw.startsWith('{')) {
      const p = JSON.parse(raw)
      if (p && typeof p.lng === 'number' && typeof p.lat === 'number') return p
      return null
    }
    const spot = CHONGQING_SPOTS.find((s) => s.key === raw)
    return spot ? { name: spot.name, lng: spot.lng, lat: spot.lat, key: spot.key } : null
  } catch (e) {
    return null
  }
}

function persist(spot) {
  try {
    if (spot) localStorage.setItem(SPOT_KEY, JSON.stringify(spot))
    else localStorage.removeItem(SPOT_KEY)
  } catch (e) { /* 隐私模式忽略 */ }
  // 同一个页面 / 其他标签页的定位实例同步
  try { window.dispatchEvent(new CustomEvent(SPOT_EVENT, { detail: spot })) } catch (e) { /* 忽略 */ }
}

function fromSpot(spot, source) {
  return {
    lat: Number(spot.lat),
    lng: Number(spot.lng),
    accuracy: null,
    updatedAt: Date.now(),
    label: spot.name || '我的位置',
    source: source || spot.source || 'landmark'
  }
}

// ===== 全站唯一的一份定位状态 =====
const status = ref('idle')   // idle | locating | granted | denied | insecure | unsupported | error | manual | estimated
const coords = ref(null)     // { lat, lng, accuracy, updatedAt, label, source }
const errorText = ref('')
const savedSpot = ref(loadSpot())

let watchId = null
let autoStarted = false
let bound = false

// 首屏就有可用坐标：有保存的商圈就用商圈，否则立刻给城市级估算
coords.value = savedSpot.value ? fromSpot(savedSpot.value, 'landmark') : fromSpot(CITY_CENTER, 'city')
status.value = savedSpot.value ? 'manual' : 'estimated'

function stopWatcher() {
  if (watchId != null && supported) navigator.geolocation.clearWatch(watchId)
  watchId = null
}

/** 保证页面上永远有可用坐标，哪怕定位不可用 */
function ensureUsable() {
  if (!coords.value) coords.value = fromSpot(CITY_CENTER, 'city')
}

function onOk(pos) {
  coords.value = {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    accuracy: pos.coords.accuracy,
    updatedAt: Date.now(),
    label: '我的当前位置',
    source: 'gps'
  }
  status.value = 'granted'
  errorText.value = ''
  // 精确定位优先于手动商圈；精确坐标不落 localStorage（隐私）
  if (savedSpot.value) {
    savedSpot.value = null
    persist(null)
  }
}

function onErr(err) {
  errorText.value = err && err.message ? err.message : '定位失败'
  status.value = err && err.code === 1 ? 'denied' : 'error'
  ensureUsable()
  stopWatcher()
}

function start() {
  if (!supported) {
    status.value = 'unsupported'
    ensureUsable()
    return
  }
  if (!secure) {
    // http 站点浏览器直接拒绝定位，不弹权限框；保留城市级估算
    status.value = 'insecure'
    ensureUsable()
    return
  }
  ensureUsable()
  if (watchId != null) {
    status.value = 'locating'
    return
  }
  status.value = 'locating'
  watchId = navigator.geolocation.watchPosition(onOk, onErr, {
    enableHighAccuracy: true,
    maximumAge: 5000,
    timeout: 12000
  })
}

/** 页面加载时自动定位，整个 SPA 生命周期只启动一次 */
function autoLocate() {
  ensureBound()
  if (autoStarted) return
  autoStarted = true
  start()
}

function applySpot(spot) {
  savedSpot.value = spot || null
  stopWatcher()
  if (!spot) {
    coords.value = fromSpot(CITY_CENTER, 'city')
    status.value = 'estimated'
    persist(null)
    return
  }
  coords.value = fromSpot(spot, spot.source || 'landmark')
  status.value = 'manual'
  persist(spot)
}

/** 点选常用商圈：零输入，立即生效 */
function pickSpot(sp) {
  if (!sp) return
  applySpot({ name: sp.name, lng: sp.lng, lat: sp.lat, key: sp.key, source: 'landmark' })
}

/**
 * 顾客自己输入位置（中文地名）后选用联想结果。
 * 这是「地点中心级」定位：坐标来自离线地名库，界面必须如实标注，不伪装成 GPS。
 */
function pickPlace(place) {
  if (!place || place.lng == null || place.lat == null) return
  applySpot({
    name: place.name,
    lng: Number(place.lng),
    lat: Number(place.lat),
    key: place.key,
    source: 'place'
  })
}

function applyManual(key) {
  if (!key) return applySpot(null)
  pickSpot(CHONGQING_SPOTS.find((s) => s.key === key))
}

/** 兼容旧调用：手动名称 + 坐标，新界面已不再暴露坐标输入 */
function setCustom(name, lng, lat) {
  applySpot({ name: (name || '').trim() || '我的位置', lng: Number(lng), lat: Number(lat), source: 'custom' })
}

/** 重置为自动定位：清掉手动商圈，回到估算，再尝试一次精确定位 */
function relocate() {
  stopWatcher()
  if (savedSpot.value) {
    savedSpot.value = null
    persist(null)
  }
  start()
}

function clearSpot() {
  applySpot(null)
}

function sync(e) {
  const spot = e && e.detail ? e.detail : null
  savedSpot.value = spot
  if (spot) {
    stopWatcher()
    // 保留 spot.source：自定地点 / 商圈都要能正确显示来源并作为导航起点
    coords.value = fromSpot(spot, spot.source || 'landmark')
    status.value = 'manual'
  } else if (!watchId) {
    coords.value = fromSpot(CITY_CENTER, 'city')
    status.value = 'estimated'
  }
}

function ensureBound() {
  if (bound || typeof window === 'undefined') return
  bound = true
  window.addEventListener(SPOT_EVENT, sync)
}

export function useGeolocation() {
  onMounted(autoLocate)
  return {
    supported,
    secure,
    status,
    coords,
    errorText,
    active: computed(() => !!coords.value),
    isEstimated: computed(() => coords.value?.source === 'city'),
    sourceLabel: computed(() => ({
      gps: '精确定位', landmark: '常用商圈', place: '自定地点', custom: '手动位置', city: '城市级估算'
    }[coords.value?.source] || '自动定位')),
    hint: computed(() => {
      switch (status.value) {
        case 'locating': return '正在获取当前位置…'
        case 'granted': return '位置会随移动实时更新，门店距离自动刷新'
        case 'insecure': return '当前是 http 站点，浏览器不允许精确定位；输入你的位置或点选商圈即可'
        case 'denied': return '定位权限被拒绝，输入你的位置或点选商圈也能算距离'
        case 'unsupported': return '当前浏览器不支持定位，输入你的位置或点选商圈即可'
        case 'error': return '暂时定位失败，已按城市中心估算，可输入位置或点选商圈'
        case 'manual': return '已按所选地点计算距离，导航会以它为起点'
        default: return '已按重庆主城中心估算距离，输入你的位置可更准确'
      }
    }),
    savedSpot,
    savedSpotName: computed(() => coords.value?.label || savedSpot.value?.name || ''),
    start, stopWatcher, autoLocate, applyManual, pickSpot, pickPlace, setCustom, clearSpot, relocate
  }
}
