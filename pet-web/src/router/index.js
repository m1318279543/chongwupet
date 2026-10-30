import { createRouter, createWebHistory } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/store/modules/user'

const routes = [
  // 后台独立登录入口：任何前台账号都能打开，但只有 admin 能真正登录
  { path: '/admin/login', component: () => import('@/views/admin/login/index.vue'), meta: { title: '后台登录' } },
  {
    path: '/admin',
    component: () => import('@/layouts/admin/index.vue'),
    redirect: '/admin/dashboard',
    children: [
      { path: 'dashboard', component: () => import('@/views/dashboard/index.vue'), meta: { title: '数据看板', perm: 'pet:dashboard:view', icon: 'DataLine' } },
      { path: 'category', component: () => import('@/views/admin/category/index.vue'), meta: { title: '宠物分类', perm: 'pet:category:list', icon: 'Files' } },
      { path: 'store', component: () => import('@/views/admin/store/index.vue'), meta: { title: '门店管理', perm: 'pet:store:list', icon: 'OfficeBuilding' } },
      { path: 'customer', component: () => import('@/views/admin/customer/index.vue'), meta: { title: '客户档案', perm: 'pet:customer:list', icon: 'User' } },
      { path: 'info', component: () => import('@/views/admin/info/index.vue'), meta: { title: '宠物信息', perm: 'pet:info:list', icon: 'Goods' } },
      { path: 'appointment', component: () => import('@/views/admin/appointment/index.vue'), meta: { title: '预约管理', perm: 'pet:appointment:list', icon: 'Calendar' } },
      { path: 'service', component: () => import('@/views/admin/service/index.vue'), meta: { title: '服务工单', perm: 'pet:service:list', icon: 'Stopwatch' } },
      { path: 'serviceItem', component: () => import('@/views/admin/service/item.vue'), meta: { title: '服务项目', perm: 'pet:serviceitem:list', icon: 'List' } },
      { path: 'favorite', component: () => import('@/views/admin/favorite/index.vue'), meta: { title: '收藏管理', perm: 'pet:favorite:list', icon: 'Star' } },
      { path: 'goods', component: () => import('@/views/admin/goods/index.vue'), meta: { title: '商品与库存', perm: 'pet:goods:list', icon: 'ShoppingCart' } },
      { path: 'order', component: () => import('@/views/admin/order/index.vue'), meta: { title: '订单管理', perm: 'pet:order:list', icon: 'Tickets' } },
      { path: 'payment', component: () => import('@/views/admin/payment/index.vue'), meta: { title: '支付流水', perm: 'pet:payment:list', icon: 'Wallet' } },
      { path: 'refund', component: () => import('@/views/admin/refund/index.vue'), meta: { title: '退款管理', perm: 'pet:refund:list', icon: 'Money' } },
      { path: 'purchase', component: () => import('@/views/admin/purchase/index.vue'), meta: { title: '采购管理', perm: 'pet:purchase:list', icon: 'Van' } },
      { path: 'like', component: () => import('@/views/admin/like/index.vue'), meta: { title: '点赞管理', perm: 'pet:like:list', icon: 'Pointer' } },
      { path: 'comment', component: () => import('@/views/admin/comment/index.vue'), meta: { title: '评论管理', perm: 'pet:comment:manage', icon: 'ChatLineRound' } },
      { path: 'preference', component: () => import('@/views/admin/preference/index.vue'), meta: { title: '宠物喜好', perm: 'pet:preference:list', icon: 'IceCream' } },
      { path: 'consult', component: () => import('@/views/admin/consult/index.vue'), meta: { title: '客服管理', perm: 'pet:consult:list', icon: 'ChatDotRound' } },
      { path: 'cancel', component: () => import('@/views/admin/cancel/index.vue'), meta: { title: '取消记录', perm: 'pet:cancel:list', icon: 'CircleClose' } },
      { path: 'match', component: () => import('@/views/admin/match/index.vue'), meta: { title: '智能匹配记录', perm: 'pet:match:list', icon: 'MagicStick' } },
      { path: 'health', component: () => import('@/views/admin/health/index.vue'), meta: { title: '健康档案', perm: 'pet:health:list', icon: 'Histogram' } },
      // RuoYi 系统管理（共用同一套后端接口与 Token）
      { path: 'system/user', component: () => import('@/views/system/user/index.vue'), meta: { title: '用户管理', perm: 'system:user:list', icon: 'UserFilled' } },
      { path: 'system/role', component: () => import('@/views/system/role/index.vue'), meta: { title: '角色管理', perm: 'system:role:list', icon: 'Avatar' } },
      { path: 'system/menu', component: () => import('@/views/system/menu/index.vue'), meta: { title: '菜单管理', perm: 'system:menu:list', icon: 'Menu' } },
      { path: 'system/dept', component: () => import('@/views/system/dept/index.vue'), meta: { title: '部门管理', perm: 'system:dept:list', icon: 'OfficeBuilding' } },
      { path: 'system/log', component: () => import('@/views/system/log/index.vue'), meta: { title: '系统日志', perm: ['monitor:operlog:list', 'monitor:logininfor:list'], icon: 'Document' } },
      { path: 'system/online', component: () => import('@/views/system/online/index.vue'), meta: { title: '在线用户', perm: 'monitor:online:list', icon: 'Connection' } },
      { path: 'monitor/server', component: () => import('@/views/monitor/server/index.vue'), meta: { title: '服务监控', perm: 'monitor:server:list', icon: 'Odometer' } },
      { path: 'monitor/cache', component: () => import('@/views/monitor/cache/index.vue'), meta: { title: '缓存监控', perm: 'monitor:cache:list', icon: 'Coin' } }
    ]
  },
  {
    path: '/shop',
    component: () => import('@/layouts/shop/index.vue'),
    redirect: '/shop/home',
    children: [
      { path: 'home', component: () => import('@/views/shop/home/index.vue'), meta: { title: '首页' } },
      // 宠物售卖页：完整在售列表 + 品类快筛（首页只放精选，这里放全部）
      { path: 'pets', component: () => import('@/views/shop/pets/index.vue'), meta: { title: '在售宠物' } },
      { path: 'match', component: () => import('@/views/shop/match/index.vue'), meta: { title: '智能选宠', perm: 'pet:match:list', icon: 'MagicStick' } },
      { path: 'pet/:id', component: () => import('@/views/shop/pet/detail.vue'), meta: { title: '宠物详情' } },
      { path: 'favorite', component: () => import('@/views/shop/favorite/index.vue'), meta: { title: '我的收藏', perm: 'pet:favorite:list', icon: 'Star' } },
      { path: 'appointment', component: () => import('@/views/shop/appointment/index.vue'), meta: { title: '服务预约', perm: 'pet:appointment:list', icon: 'Calendar' } },
      { path: 'mypet', component: () => import('@/views/shop/mypet/index.vue'), meta: { title: '我的宠物' } },
      // 联系客服 / 我的咨询
      { path: 'consult', component: () => import('@/views/shop/consult/index.vue'), meta: { title: '联系客服', perm: 'pet:consult:list', icon: 'ChatDotRound' } },
      // 宠物粮专区（覆盖全部 7 类宠物）
      { path: 'food', component: () => import('@/views/shop/food/index.vue'), meta: { title: '宠物粮' } },
      // 购物车 / 结算（游客可浏览，结算时要求登录）
      { path: 'cart', component: () => import('@/views/shop/cart/index.vue'), meta: { title: '购物车' } },
      // 我的订单（结算后查看下单记录与创建时间，游客可进页面内提示登录）
      { path: 'order', component: () => import('@/views/shop/order/index.vue'), meta: { title: '我的订单', perm: 'pet:order:list', icon: 'Tickets' } },
      // 个人资料（头像 / 昵称自定义，需登录）
      { path: 'profile', component: () => import('@/views/shop/profile/index.vue'), meta: { title: '个人资料' } }
    ]
  },
  { path: '/', redirect: '/shop/home' },
  // 未匹配的地址给出明确的 404（以前一律静默重定向到商城首页）
  { path: '/:pathMatch(.*)*', name: 'NotFound', component: () => import('@/views/error/404.vue'), meta: { title: '页面不存在' } }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  // 带锚点的跳转（服务保障板块）定位到元素并给 sticky 头留出偏移
  scrollBehavior: (to) => {
    if (to.hash) return { el: to.hash, top: 130, behavior: 'smooth' }
    return { top: 0 }
  }
})

// 路由守卫：登录态 + 用户信息加载
// 游客可访问：首页、宠物详情、服务保障四页、我的收藏/预约（页面内提示登录）
const guestList = ['/shop/home', '/shop/pets', '/shop/match', '/shop/favorite', '/shop/appointment', '/shop/order', '/shop/consult']
function isGuestAllowed(path) {
  if (guestList.includes(path)) return true
  if (path.startsWith('/shop/pet/')) return true  // 宠物详情页游客可看
  if (path === '/shop/food' || path.startsWith('/shop/food/')) return true  // 宠物粮页游客可看
  if (path === '/shop/cart' || path.startsWith('/shop/cart/')) return true  // 购物车页游客可看
  return false
}
router.beforeEach(async (to, from, next) => {
  document.title = to.meta.title ? `${to.meta.title} - 宠物之家` : '宠物之家'
  const userStore = useUserStore()
  const needAdmin = to.path === '/admin' || to.path.startsWith('/admin')
  // 404 页不需要登录，直接放行（否则未登录用户会被送去首页，永远看不到 404）
  if (to.name === 'NotFound') return next()
  const isAdminLogin = to.path === '/admin/login'

  // 前后台各自一套登录态：进入后台区就切到 Admin-Token，回到前台切回 Shop-Token
  userStore.ensureScope(needAdmin ? 'admin' : 'shop')

  // 后台准入角色：超级管理员 + 店长（店长只能看本店数据，由后端数据范围控制）
  const BACKEND_ROLES = ['admin', 'store_manager']
  const canEnterBackend = () => Array.isArray(userStore.roles) && userStore.roles.some(r => BACKEND_ROLES.includes(r))

  // 店长没有数据看板权限，登录后落到门店页
  const roleHome = (store) => (Array.isArray(store.roles) && store.roles.includes('admin')) ? '/admin/dashboard' : '/admin/store'

  // 后台登录页：不受当前登录身份限制（前台已登录普通账号也能来切管理员账号）
  // 若当前后台已经登录管理员，直接进控制台
  if (isAdminLogin) {
    if (userStore.token && canEnterBackend()) return next(roleHome(userStore))
    return next()
  }

  // 未登录（只看当前区域的 token，前台登录不会影响后台，反之亦然）
  if (!userStore.token) {
    if (isGuestAllowed(to.path)) return next()
    if (!needAdmin) ElMessage.warning('请先登录后再访问该页面')
    return next(needAdmin ? '/admin/login' : '/shop/home')
  }

  // 有 token 但还没加载过用户信息（首次进页面/刷新）
  if (!userStore.userId) {
    try {
      await userStore.getInfo()
    } catch {
      // token 失效：只清当前区域的登录态，另一端账号不受影响
      userStore.clearSession()
      if (isGuestAllowed(to.path)) return next()
      if (!needAdmin) ElMessage.warning('登录已过期，请重新登录')
      return next(needAdmin ? '/admin/login' : '/shop/home')
    }
  }

  // 后台仅管理员：当前后台 token 不是管理员就清掉，送到后台登录页换账号
  if (needAdmin && !canEnterBackend()) {
    userStore.clearSession()
    ElMessage.warning('后台仅限管理员与店长账号，请使用对应账号登录')
    return next('/admin/login')
  }
  return next()
})

export default router
