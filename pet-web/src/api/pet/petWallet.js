import request from '@/utils/request'

// 我的平台余额
export function getMyWallet() {
  return request({
    url: '/pet/wallet/mine',
    method: 'get'
  })
}

// 模拟充值（演示环境）
export function rechargeWallet(amount) {
  return request({
    url: '/pet/wallet/recharge',
    method: 'post',
    data: { amount }
  })
}
