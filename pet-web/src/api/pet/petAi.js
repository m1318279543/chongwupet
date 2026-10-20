import request from '@/utils/request'

// 智能助手对话（游客可用）：messages = [{role:'user'|'assistant', content}]
export function aiChat(data) {
  return request({
    url: '/pet/ai/chat',
    method: 'post',
    data,
    timeout: 70000
  })
}

// 自然语言选宠需求解析 -> 问卷答案
export function aiParse(text) {
  return request({
    url: '/pet/ai/parse',
    method: 'post',
    data: { text },
    timeout: 70000
  })
}

// 后台经营洞察
export function aiInsight(days = 7) {
  return request({
    url: '/pet/ai/insight',
    method: 'get',
    params: { days },
    timeout: 70000
  })
}
