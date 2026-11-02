import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { CHONGQING_SPOTS } from '@/utils/geo'

/**
 * 顾客定位（实时 + 自定义）
 *
 * 1) 浏览器 Geolocation：watchPosition 持续更新，顾客走动距离实时变化
 * 2) HTTPS 限制：浏览器只在 HTTPS / localhost 下允许定位，http 站点直接进 insecure 状态
 * 3) 自定义位置：顾客可手动设名称 + 经纬度（或选常用地标），存 localStorage，全站共用
 */
const SPOT_KEY = 'pet-my-spot'
const SPOT_EVENT = 'pet-spot-changed'

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
    // 旧格式：地标 key
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
  // 同一个页面/其他标签页的定位实例同步
  try { window.dispatchEvent(new CustomEvent(SPOT_EVENT, { detail: spot })) } catch (e) { /* 忽略 */ }
}

export function useGeolocation() {
  const supported = typeof navigator !== 'undefined' && !!navigator.geolocation
  const secure = typeof window === 'undefined' ? true : window.isSecureContext
  // idle | locating | granted | denied | insecure | unsupported | error | manual
  const status = ref('idle')
  const coords = ref(null)          // { lat, lng, accuracy, updatedAt, label }
  const errorText = ref('')
  const savedSpot = ref(loadSpot())  // 自定义/地标位置 { name, lng, lat, key? }

  let watchId = null

  const active = computed(() => !!coords.value)

  function applySpot(spot) {
    savedSpot.value = spot || null
    if (!spot) {
      coords.value = null
      status.value = 'idle'
      persist(null)
      return
    }
    coords.value = {
      lat: Number(spot.lat),
      lng: Number(spot.lng),
      accuracy: null,
      updatedAt: Date.now(),
      label: spot.name
    }
    status.value = 'manual'
    persist(spot)
  }

  /** 常用地标 */
  function applyManual(key) {
    if (!key) return applySpot(null)
    const spot = CHONGQING_SPOTS.find((s) => s.key === key)
    if (!spot) return
    applySpot({ name: spot.name, lng: spot.lng, lat: spot.lat, key: spot.key })
  }

  /** 顾客自定义位置（名称 + 经纬度） */
  function setCustom(name, lng, lat) {
    applySpot({
      name: (name || '').trim() || '我的位置',
      lng: Number(lng),
      lat: Number(lat)
    })
  }

  function clearSpot() {
    applySpot(null)
  }

  function onOk(pos) {
    coords.value = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      updatedAt: Date.now()
    }
    status.value = 'granted'
    errorText.value = ''
    // 浏览器定位成功后清掉自定义位置，避免下次误用
    if (savedSpot.value) {
      savedSpot.value = null
      persist(null)
    }
  }

  function onErr(err) {
    errorText.value = err && err.message ? err.message : '定位失败'
    status.value = err && err.code === 1 ? 'denied' : 'error'
  }

  function start() {
    if (!supported) {
      status.value = 'unsupported'
      return
    }
    if (!secure) {
      // http 站点浏览器直接拒绝定位，不必再弹权限框
      status.value = 'insecure'
      return
    }
    if (watchId != null) return
    status.value = 'locating'
    watchId = navigator.geolocation.watchPosition(onOk, onErr, {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 12000
    })
  }

  function stop() {
    if (watchId != null && supported) {
      navigator.geolocation.clearWatch(watchId)
    }
    watchId = null
    if (savedSpot.value) {
      coords.value = {
        lat: Number(savedSpot.value.lat),
        lng: Number(savedSpot.value.lng),
        accuracy: null,
        updatedAt: Date.now(),
        label: savedSpot.value.name
      }
      status.value = 'manual'
    } else {
      coords.value = null
      status.value = 'idle'
    }
  }

  function sync(e) {
    const spot = e && e.detail ? e.detail : null
    savedSpot.value = spot
    if (!watchId && spot) {
      coords.value = { lat: Number(spot.lat), lng: Number(spot.lng), accuracy: null, updatedAt: Date.now(), label: spot.name }
      status.value = 'manual'
    } else if (!watchId && !spot) {
      coords.value = null
      status.value = 'idle'
    }
  }

  // 刷新后沿用上次保存的位置
  if (savedSpot.value) {
    coords.value = {
      lat: Number(savedSpot.value.lat),
      lng: Number(savedSpot.value.lng),
      accuracy: null,
      updatedAt: Date.now(),
      label: savedSpot.value.name
    }
    status.value = 'manual'
  }

  onMounted(() => window.addEventListener(SPOT_EVENT, sync))
  onBeforeUnmount(() => {
    window.removeEventListener(SPOT_EVENT, sync)
    if (watchId != null && supported) navigator.geolocation.clearWatch(watchId)
    watchId = null
  })

  return {
    supported, secure, status, coords, errorText, active,
    savedSpot, savedSpotName: computed(() => (savedSpot.value ? savedSpot.value.name : '')),
    start, stop, applyManual, setCustom, clearSpot
  }
}
