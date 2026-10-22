import request from '@/utils/request'

// 客户列表
export function listCustomer(query) {
  return request({
    url: '/pet/customer/list',
    method: 'get',
    params: query
  })
}

// 客户详情（含名下宠物）
export function getCustomer(customerId) {
  return request({
    url: '/pet/customer/' + customerId,
    method: 'get'
  })
}

// 客户名下宠物
export function listCustomerPets(customerId) {
  return request({
    url: '/pet/customer/' + customerId + '/pets',
    method: 'get'
  })
}

// 新增客户
export function addCustomer(data) {
  return request({
    url: '/pet/customer',
    method: 'post',
    data
  })
}

// 修改客户
export function updateCustomer(data) {
  return request({
    url: '/pet/customer',
    method: 'put',
    data
  })
}

// 删除客户
export function delCustomer(customerIds) {
  return request({
    url: '/pet/customer/' + customerIds,
    method: 'delete'
  })
}
