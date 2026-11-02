/**
 * 地理位置工具：球面距离、距离格式化、导航链接
 *
 * 坐标系约定：GCJ-02（火星坐标，腾讯地图/高德统一）
 * 顾客定位来自浏览器 Geolocation（WGS-84），在国内与 GCJ-02 的偏移约几百米，
 * 用于"哪家门店更近"的判断足够，不用于精确导航定位。
 */

const EARTH_RADIUS = 6371008.8

/** 两点球面距离（米），Haversine */
export function distanceMeters(lat1, lng1, lat2, lng2) {
  if ([lat1, lng1, lat2, lng2].some((v) => v == null || Number.isNaN(Number(v)))) return null
  const rad = (d) => (Number(d) * Math.PI) / 180
  const dLat = rad(lat2) - rad(lat1)
  const dLng = rad(lng2) - rad(lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS * Math.asin(Math.min(1, Math.sqrt(a)))
}

/** 距离展示：680 m / 3.4 km / 12 km */
export function formatDistance(meters) {
  if (meters == null || Number.isNaN(Number(meters))) return ''
  const m = Number(meters)
  if (m < 1000) return `${Math.max(10, Math.round(m / 10) * 10)} m`
  const km = m / 1000
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`
}

/** 驾车导航链接（高德 URI，移动端可直接唤起 App，桌面端打开网页版） */
export function amapNavUrl(store, from) {
  if (!store || store.lng == null || store.lat == null) return ''
  const name = encodeURIComponent(store.storeName || '门店')
  const params = [
    `to=${store.lng},${store.lat},${name}`,
    'mode=car',
    'policy=1',
    'src=chongwupet',
    'coordinate=gaode',
    'callnative=1',
  ]
  if (from && from.lng != null && from.lat != null) {
    params.splice(1, 0, `from=${from.lng},${from.lat},我的位置`)
  }
  return `https://uri.amap.com/navigation?${params.join('&')}`
}

/** 门店在地图上的位置（无路线，用于"查看地图"） */
export function amapMarkerUrl(store) {
  if (!store || store.lng == null || store.lat == null) return ''
  const name = encodeURIComponent(store.storeName || '门店')
  const addr = encodeURIComponent([store.city, store.address].filter(Boolean).join(''))
  return `https://uri.amap.com/marker?position=${store.lng},${store.lat}&name=${name}&src=chongwupet&coordinate=gaode&callnative=0&address=${addr}`
}

/** 解析顾客粘贴的坐标：支持「经度,纬度」「纬度,经度」，用逗号/空格/分号分隔 */
export function parseCoords(text) {
  const nums = String(text || '').match(/-?\d+(?:\.\d+)?/g)
  if (!nums || nums.length < 2) return null
  const a = Number(nums[0])
  const b = Number(nums[1])
  if (Number.isNaN(a) || Number.isNaN(b)) return null
  let lng
  let lat
  if (Math.abs(a) > 90) { lng = a; lat = b }
  else if (Math.abs(b) > 90) { lng = b; lat = a }
  // 国内经纬度：经度 73~135，纬度 3~54，用这个范围判断前后顺序
  else if (a > 54 && b <= 54) { lng = a; lat = b }
  else if (b > 54 && a <= 54) { lng = b; lat = a }
  else { lng = a; lat = b }
  if (lng < -180 || lng > 180 || lat < -90 || lat > 90) return null
  return { lng, lat }
}

/** 重庆常用地标：http 站点拿不到浏览器定位时，给顾客一个手动选择兜底 */
export const CHONGQING_SPOTS = [
  { key: 'jfb', name: '解放碑', lng: 106.577315, lat: 29.557666 },
  { key: 'gyq', name: '观音桥', lng: 106.530573, lat: 29.573541 },
  { key: 'spb', name: '沙坪坝三峡广场', lng: 106.457372, lat: 29.556579 },
  { key: 'np', name: '南坪万达', lng: 106.567328, lat: 29.526628 },
  { key: 'yjp', name: '杨家坪步行街', lng: 106.510625, lat: 29.502686 },
  { key: 'dp', name: '大坪时代天街', lng: 106.520267, lat: 29.543579 },
  { key: 'yubei', name: '渝北冉家坝', lng: 106.508897, lat: 29.590628 },
  { key: 'dxc', name: '大学城熙街', lng: 106.308579, lat: 29.604612 }
]
