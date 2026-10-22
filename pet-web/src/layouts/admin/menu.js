// 后台侧栏的「分组边界」声明。
// 只描述"谁和谁放一起、分组叫什么"，不重复写页面标题与权限：
//   标题 / 权限 / 图标 → 各自由 route.meta.title / .perm / .icon 提供（单一来源）
// 新增页面只需：router/index.js 加一条带 meta 的路由 → 在这里把它的 path 放进某个分组。
export const MENU_GROUPS = [
  { key: 'dash', items: ['/admin/dashboard'] },
  {
    key: 'md',
    title: '门店与客户',
    icon: 'OfficeBuilding',
    items: ['/admin/store', '/admin/customer']
  },
  {
    key: 'petBase',
    title: '宠物资料',
    icon: 'Goods',
    items: ['/admin/category', '/admin/info', '/admin/health', '/admin/preference', '/admin/issue']
  },
  {
    key: 'petService',
    title: '服务履约',
    icon: 'Stopwatch',
    items: ['/admin/service', '/admin/serviceItem']
  },
  {
    key: 'petBiz',
    title: '业务数据',
    icon: 'Tickets',
    items: [
      '/admin/appointment',
      '/admin/order',
      '/admin/refund',
      '/admin/goods',
      '/admin/purchase',
      '/admin/favorite',
      '/admin/like',
      '/admin/comment',
      '/admin/consult',
      '/admin/doctor',
      '/admin/cancel',
      '/admin/match'
    ]
  },
  {
    key: 'sys',
    title: '系统管理',
    icon: 'Setting',
    items: [
      '/admin/system/user',
      '/admin/system/role',
      '/admin/system/menu',
      '/admin/system/dept',
      '/admin/system/log',
      '/admin/system/online'
    ]
  },
  {
    key: 'monitor',
    title: '系统监控',
    icon: 'Odometer',
    items: ['/admin/monitor/server', '/admin/monitor/cache']
  }
]
