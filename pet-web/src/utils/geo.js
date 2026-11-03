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

/**
 * 驾车导航链接（高德 URI，移动端可直接唤起 App，桌面端打开网页版）
 * 只有「精确定位 / 顾客主动选的商圈」才把 from 传给地图；
 * 自动估算的市中心坐标不传，交给地图 App 用设备真实位置，避免把起点带偏。
 */
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
  if (from && from.lng != null && from.lat != null && from.source !== 'city') {
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

/**
 * 无法精确定位时的城市基准点（重庆主城中心 · 解放碑）。
 * http 站点浏览器禁用 GPS，页面仍要能「直接按距离排序」，就用它做城市级估算，
 * 并在界面上明确标注「估算」，不伪装成精确定位。
 */
export const CITY_CENTER = { key: 'city', name: '重庆主城中心（估算）', lng: 106.577315, lat: 29.557666 }

/** 常用商圈：零输入，点一下就能把位置切到附近，http 站点同样可用 */
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
