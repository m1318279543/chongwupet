import Cookies from 'js-cookie'

/**
 * 前台（商城）与后台（管理端）各自持有独立 token。
 * 两套页面同源部署，如果共用同一个 Cookie，会出现：
 *   前台登录普通用户 → 后台拿到普通用户 token，没权限；
 *   后台登录 admin   → 前台自动变成 admin。
 */
const SHOP_TOKEN_KEY = 'Shop-Token'
const ADMIN_TOKEN_KEY = 'Admin-Token'

/** 当前是否处于后台区域（/admin 与 /admin/xxx） */
export function isAdminPath(path) {
  const p = path || (typeof window !== 'undefined' ? window.location.pathname : '')
  return p === '/admin' || p.startsWith('/admin/')
}

export function getShopToken() {
  return Cookies.get(SHOP_TOKEN_KEY)
}

export function setShopToken(token) {
  return Cookies.set(SHOP_TOKEN_KEY, token)
}

export function removeShopToken() {
  return Cookies.remove(SHOP_TOKEN_KEY)
}

export function getAdminToken() {
  return Cookies.get(ADMIN_TOKEN_KEY)
}

export function setAdminToken(token) {
  return Cookies.set(ADMIN_TOKEN_KEY, token)
}

export function removeAdminToken() {
  return Cookies.remove(ADMIN_TOKEN_KEY)
}

/** 按区域取 token：scope 缺省时根据当前地址判断 */
export function getToken(scope) {
  const s = scope || (isAdminPath() ? 'admin' : 'shop')
  return s === 'admin' ? getAdminToken() : getShopToken()
}

export function setToken(token, scope) {
  const s = scope || (isAdminPath() ? 'admin' : 'shop')
  return s === 'admin' ? setAdminToken(token) : setShopToken(token)
}

export function removeToken(scope) {
  const s = scope || (isAdminPath() ? 'admin' : 'shop')
  return s === 'admin' ? removeAdminToken() : removeShopToken()
}
