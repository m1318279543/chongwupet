import { computed, onBeforeUnmount, ref } from 'vue'
import { CHONGQING_SPOTS } from '@/utils/geo'

/**
 * 顾客定位（实时）
 *
 * 优先用浏览器 Geolocation 的 watchPosition：顾客走动时距离会跟着变。
 * 注意：浏览器只在 HTTPS / localhost 下允许定位；线上是 http 时直接进 insecure 状态，
 * 由调用方引导顾客手动选地标（CHONGQING_SPOTS），保证功能仍可用。
 */
const SPOT_KEY = 'pet-my-spot'

export function useGeolocation() {
  const supported = typeof navigator !== 'undefined' && !!navigator.geolocation
  const secure = typeof window === 'undefined' ? true : window.isSecureContext
  // idle | locating | granted | denied | insecure | unsupported | error | manual
  const status = ref('idle')
  const coords = ref(null)          // { lat, lng, accuracy, updatedAt }
  const errorText = ref('')
  const manualKey = ref(localStorage.getItem(SPOT_KEY) || '')

  let watchId = null

  const active = computed(() => !!coords.value)

  function applyManual(key) {
    manualKey.value = key || ''
    if (!key) {
      coords.value = null
      status.value = 'idle'
      return
    }
    const spot = CHONGQING_SPOTS.find((s) => s.key === key)
    if (!spot) return
    coords.value = { lat: spot.lat, lng: spot.lng, accuracy: null, updatedAt: Date.now(), label: spot.name }
    status.value = 'manual'
    try { localStorage.setItem(SPOT_KEY, key) } catch (e) { /* 隐私模式忽略 */ }
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
    // 手动定位成功后清掉地标标记，避免下次误用
    if (manualKey.value) {
      manualKey.value = ''
      try { localStorage.removeItem(SPOT_KEY) } catch (e) { /* 忽略 */ }
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
    status.value = manualKey.value ? 'manual' : 'idle'
    coords.value = manualKey.value ? coords.value : null
  }

  // 刷新过页面还记着手动选的地标
  if (manualKey.value) applyManual(manualKey.value)

  onBeforeUnmount(() => {
    if (watchId != null && supported) navigator.geolocation.clearWatch(watchId)
    watchId = null
  })

  return { supported, secure, status, coords, errorText, active, manualKey, start, stop, applyManual }
}
