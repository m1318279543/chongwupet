import request from '@/utils/request'

// 我的通知列表（分页）
export function listNotification(query) {
  return request({
    url: '/pet/notification/list',
    method: 'get',
    params: query
  })
}

// 未读数（含按类型分组）
export function unreadNotification() {
  return request({
    url: '/pet/notification/unread',
    method: 'get'
  })
}

// 单条已读
export function readNotification(notifyId) {
  return request({
    url: '/pet/notification/read/' + notifyId,
    method: 'post'
  })
}

// 全部已读
export function readAllNotification() {
  return request({
    url: '/pet/notification/readAll',
    method: 'post'
  })
}
