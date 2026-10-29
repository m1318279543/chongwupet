// 后台侧栏的「分组边界」声明。
// 只描述"谁和谁放一起、分组叫什么"，不重复写页面标题与权限：
//   标题 / 权限 / 图标 → 各自由 route.meta.title / .perm / .icon 提供（单一来源）
// 新增页面只需：router/index.js 加一条带 meta 的路由 → 在这里把它的 path 放进某个分组。
//
// 分组原则：按「运营时要一起看的事」划分，而不是按后端表名。
//   - 交易管理：订单 / 退款 / 商品 / 采购 / 取消记录（资金流）
//   - 服务履约：预约 / 工单 / 服务项目（服务流）
//   - 用户互动：收藏点赞 / 评论 / 客服 / 智能匹配（用户行为）
//   - AI 运营：知识库（AI 助手的数据来源）
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
    items: ['/admin/category', '/admin/info']
  },
  {
    key: 'trade',
    title: '交易管理',
    icon: 'Tickets',
    items: ['/admin/order', '/admin/goods', '/admin/purchase']
  },
  {
    key: 'svc',
    title: '服务履约',
    icon: 'Stopwatch',
    items: ['/admin/appointment', '/admin/service', '/admin/serviceItem']
  },
  {
    key: 'engage',
    title: '用户互动',
    icon: 'ChatDotRound',
    items: ['/admin/interaction', '/admin/comment', '/admin/consult', '/admin/match']
  },
  {
    key: 'ai',
    title: 'AI 运营',
    icon: 'Reading',
    items: ['/admin/knowledge']
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
