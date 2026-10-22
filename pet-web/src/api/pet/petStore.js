import request from '@/utils/request'

// 门店列表
export function listStore(query) {
  return request({
    url: '/pet/store/list',
    method: 'get',
    params: query
  })
}

// 门店下拉选项
export function storeOptions() {
  return request({
    url: '/pet/store/options',
    method: 'get'
  })
}

// 门店详情
export function getStore(storeId) {
  return request({
    url: '/pet/store/' + storeId,
    method: 'get'
  })
}

// 门店在职员工
export function listStoreStaff(storeId) {
  return request({
    url: '/pet/store/' + storeId + '/staff',
    method: 'get'
  })
}

// 新增门店
export function addStore(data) {
  return request({
    url: '/pet/store',
    method: 'post',
    data
  })
}

// 修改门店
export function updateStore(data) {
  return request({
    url: '/pet/store',
    method: 'put',
    data
  })
}

// 删除门店
export function delStore(storeIds) {
  return request({
    url: '/pet/store/' + storeIds,
    method: 'delete'
  })
}
