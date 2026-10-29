import request from '@/utils/request'

// 商品列表（游客可看，前台固定 status=0）
export function listGoods(query) {
  return request({ url: '/pet/goods/list', method: 'get', params: query })
}

// 首页宠物粮精选：每个品类一款（免登录）
export function listFeaturedGoods(limit = 4) {
  return request({ url: '/pet/goods/featured', method: 'get', params: { limit } })
}

// 后台商品概览：总数 / 在售 / 低库存 / 库存合计
export function getGoodsStats() {
  return request({ url: '/pet/goods/stats', method: 'get' })
}

// 后台商品详情
export function getGoods(goodsId) {
  return request({ url: '/pet/goods/' + goodsId, method: 'get' })
}

// 新增商品
export function addGoods(data) {
  return request({ url: '/pet/goods', method: 'post', data })
}

// 修改商品
export function updateGoods(data) {
  return request({ url: '/pet/goods', method: 'put', data })
}

// 删除商品
export function delGoods(goodsIds) {
  return request({ url: '/pet/goods/' + goodsIds, method: 'delete' })
}

// 库存流水
export function listStockLogs(query) {
  return request({ url: '/pet/goods/stock/logs', method: 'get', params: query })
}

// 低库存预警
export function getLowStock(threshold) {
  return request({ url: '/pet/goods/stock/low', method: 'get', params: { threshold } })
}

// 入库 / 出库 / 盘亏
export function changeStock(data) {
  return request({ url: '/pet/goods/stock/change', method: 'post', data })
}
