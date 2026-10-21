import { createRouter, createWebHistory } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/store/modules/user'

const routes = [
  { path: '/login', component: () => import('@/views/login/index.vue'), meta: { title: '登录' } },
  // 后台独立登录入口：任何前台账号都能打开，但只有 admin 能真正登录
  { path: '/admin/login', component: () => import('@/views/admin/login/index.vue'), meta: { title: '后台登录' } },
  { path: '/backend', component: () => import('@/views/backend/index.vue'), meta: { title: '后端服务' } },
  {
    path: '/admin',
    component: () => import('@/layouts/admin/index.vue'),
    redirect: '/admin/dashboard',
    children: [
      { path: 'dashboard', component: () => import('@/views/dashboard/index.vue'), meta: { title: '数据看板' } },
      { path: 'category', component: () => import('@/views/admin/category/index.vue'), meta: { title: '宠物分类' } },
      { path: 'info', component: () => import('@/views/admin/info/index.vue'), meta: { title: '宠物信息' } },
      { path: 'appointment', component: () => import('@/views/admin/appointment/index.vue'), meta: { title: '预约管理' } },
      { path: 'favorite', component: () => import('@/views/admin/favorite/index.vue'), meta: { title: '收藏管理' } },
      { path: 'cart', component: () => import('@/views/admin/cart/index.vue'), meta: { title: '购物车管理' } },
      { path: 'like', component: () => import('@/views/admin/like/index.vue'), meta: { title: '点赞管理' } },
      { path: 'comment', component: () => import('@/views/admin/comment/index.vue'), meta: { title: '评论管理' } },
      { path: 'preference', component: () => import('@/views/admin/preference/index.vue'), meta: { title: '宠物喜好' } },
      { path: 'issue', component: () => import('@/views/admin/issue/index.vue'), meta: { title: '健康百科' } },
      { path: 'consult', component: () => import('@/views/admin/consult/index.vue'), meta: { title: '客服管理' } },
      { path: 'doctor', component: () => import('@/views/admin/doctor/index.vue'), meta: { title: '医生咨询记录' } },
      { path: 'cancel', component: () => import('@/views/admin/cancel/index.vue'), meta: { title: '取消记录' } },
      { path: 'match', component: () => import('@/views/admin/match/index.vue'), meta: { title: '智能匹配记录' } },
      { path: 'health', component: () => import('@/views/admin/health/index.vue'), meta: { title: '健康档案' } },
      // RuoYi 系统管理（共用同一套后端接口与 Token）
      { path: 'system/user', component: () => import('@/views/system/user/index.vue'), meta: { title: '用户管理' } },
      { path: 'system/role', component: () => import('@/views/system/role/index.vue'), meta: { title: '角色管理' } },
      { path: 'system/menu', component: () => import('@/views/system/menu/index.vue'), meta: { title: '菜单管理' } },
      { path: 'system/dept', component: () => import('@/views/system/dept/index.vue'), meta: { title: '部门管理' } },
      { path: 'system/log', component: () => import('@/views/system/log/index.vue'), meta: { title: '系统日志' } },
      { path: 'system/online', component: () => import('@/views/system/online/index.vue'), meta: { title: '在线用户' } },
      { path: 'monitor/server', component: () => import('@/views/monitor/server/index.vue'), meta: { title: '服务监控' } },
      { path: 'monitor/cache', component: () => import('@/views/monitor/cache/index.vue'), meta: { title: '缓存监控' } }
    ]
  },
  {
    path: '/shop',
    component: () => import('@/layouts/shop/index.vue'),
    redirect: '/shop/home',
    children: [
      { path: 'home', component: () => import('@/views/shop/home/index.vue'), meta: { title: '宠物首页' } },
      { path: 'match', component: () => import('@/views/shop/match/index.vue'), meta: { title: 'AI 智能选宠' } },
      { path: 'pet/:id', component: () => import('@/views/shop/pet/detail.vue'), meta: { title: '宠物详情' } },
      { path: 'favorite', component: () => import('@/views/shop/favorite/index.vue'), meta: { title: '我的收藏' } },
      { path: 'appointment', component: () => import('@/views/shop/appointment/index.vue'), meta: { title: '我的预约' } },
      // 服务保障四页：健康筛查 / 真实信息 / 专业养护 / 售后无忧（各自独立页面，均含宠物真实档案查询）
      { path: 'service', redirect: 'service/health' },
      { path: 'service/health', component: () => import('@/views/shop/service/health.vue'), meta: { title: '健康筛查' } },
      { path: 'service/origin', component: () => import('@/views/shop/service/origin.vue'), meta: { title: '真实信息' } },
      { path: 'service/care', component: () => import('@/views/shop/service/care.vue'), meta: { title: '专业养护' } },
      { path: 'service/after', component: () => import('@/views/shop/service/after.vue'), meta: { title: '售后无忧' } },
      // 宠物医生智能问答
      { path: 'doctor', component: () => import('@/views/shop/doctor/index.vue'), meta: { title: '宠物医生' } },
      // 联系客服 / 我的咨询
      { path: 'consult', component: () => import('@/views/shop/consult/index.vue'), meta: { title: '联系客服' } },
      // 宠物粮专区（覆盖全部 7 类宠物）
      { path: 'food', component: () => import('@/views/shop/food/index.vue'), meta: { title: '宠物粮' } },
      // 购物车 / 结算（游客可浏览，结算时要求登录）
      { path: 'cart', component: () => import('@/views/shop/cart/index.vue'), meta: { title: '购物车' } },
      // 我的订单（结算后查看下单记录与创建时间，游客可进页面内提示登录）
      { path: 'order', component: () => import('@/views/shop/order/index.vue'), meta: { title: '我的订单' } },
      // 个人资料（头像 / 昵称自定义，需登录）
      { path: 'profile', component: () => import('@/views/shop/profile/index.vue'), meta: { title: '个人资料' } }
    ]
  },
  { path: '/', redirect: '/shop/home' },
  { path: '/:pathMatch(.*)*', redirect: '/shop/home' }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 })
})

// 路由守卫：登录态 + 用户信息加载
// 游客可访问：首页、宠物详情、服务保障四页、我的收藏/预约（页面内提示登录）
const guestList = ['/login', '/shop/home', '/shop/match', '/backend', '/shop/favorite', '/shop/appointment', '/shop/doctor', '/shop/order']
function isGuestAllowed(path) {
  if (guestList.includes(path)) return true
  if (path.startsWith('/shop/pet/')) return true  // 宠物详情页游客可看
  if (path.startsWith('/shop/service/')) return true  // 服务保障页游客可看
  if (path === '/shop/food' || path.startsWith('/shop/food/')) return true  // 宠物粮页游客可看
  if (path === '/shop/cart' || path.startsWith('/shop/cart/')) return true  // 购物车页游客可看
  return false
}
router.beforeEach(async (to, from, next) => {
  document.title = to.meta.title ? `${to.meta.title} - 宠物之家` : '宠物之家'
  const userStore = useUserStore()
  const needAdmin = to.path === '/admin' || to.path.startsWith('/admin')
  const isAdminLogin = to.path === '/admin/login'

  // 前后台各自一套登录态：进入后台区就切到 Admin-Token，回到前台切回 Shop-Token
  userStore.ensureScope(needAdmin ? 'admin' : 'shop')

  const isAdminUser = () => Array.isArray(userStore.roles) && userStore.roles.includes('admin')

  // 后台登录页：不受当前登录身份限制（前台已登录普通账号也能来切管理员账号）
  // 若当前后台已经登录管理员，直接进控制台
  if (isAdminLogin) {
    if (userStore.token && isAdminUser()) return next('/admin/dashboard')
    return next()
  }

  // 未登录（只看当前区域的 token，前台登录不会影响后台，反之亦然）
  if (!userStore.token) {
    if (isGuestAllowed(to.path)) return next()
    return next(needAdmin ? '/admin/login' : '/shop/home')
  }

  if (to.path === '/login') return next('/')

  // 有 token 但还没加载过用户信息（首次进页面/刷新）
  if (!userStore.userId) {
    try {
      await userStore.getInfo()
    } catch {
      // token 失效：只清当前区域的登录态，另一端账号不受影响
      userStore.clearSession()
      if (isGuestAllowed(to.path)) return next()
      return next(needAdmin ? '/admin/login' : '/shop/home')
    }
  }

  // 后台仅管理员：当前后台 token 不是管理员就清掉，送到后台登录页换账号
  if (needAdmin && !isAdminUser()) {
    userStore.clearSession()
    ElMessage.warning('后台仅限管理员账号，请使用管理员账号登录')
    return next('/admin/login')
  }
  return next()
})

export default router
