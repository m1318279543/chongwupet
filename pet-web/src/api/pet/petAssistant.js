import request from '@/utils/request'
import { getToken } from '@/utils/auth'
import { useUserStore } from '@/store/modules/user'

const BASE = '/dev-api'

function currentToken() {
  try {
    const store = useUserStore()
    return getToken(store.scope)
  } catch (e) {
    return getToken()
  }
}

// 后台：AI 起草客服回复
export function draftConsultReply(consultId) {
  return request({
    url: '/pet/assistant/consult/draft',
    method: 'post',
    data: { consultId }
  })
}

// 后台：AI 咨询记录列表（分类/用户/场景/日期/关键词筛选）
export function listAiChats(query) {
  return request({
    url: '/pet/assistant/admin/list',
    method: 'get',
    params: query
  })
}

// 后台：AI 咨询分类统计
export function aiChatStats() {
  return request({
    url: '/pet/assistant/admin/stats',
    method: 'get'
  })
}

// 会话回放（本人或有后台查看权限）
export function aiChatHistory(convId) {
  return request({
    url: '/pet/assistant/history/' + convId,
    method: 'get'
  })
}

// 回答反馈
export function sendAssistantFeedback(data) {
  return request({
    url: '/pet/assistant/feedback',
    method: 'post',
    data
  })
}

/**
 * 流式对话。
 * 返回 abort 函数，组件卸载或用户点"停止"时可中断。
 */
export function streamAssistant(data, handlers = {}) {
  const controller = new AbortController()
  const token = currentToken()

  fetch(BASE + '/pet/assistant/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {})
    },
    body: JSON.stringify(data),
    signal: controller.signal
  }).then(async (resp) => {
    if (!resp.ok || !resp.body) {
      throw new Error(resp.status === 401 ? '登录已过期，请重新登录' : '助手暂时不可用')
    }
    const reader = resp.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      let index
      while ((index = buffer.indexOf('\n\n')) >= 0) {
        const chunk = buffer.slice(0, index)
        buffer = buffer.slice(index + 2)
        handleChunk(chunk, handlers)
      }
    }
    if (buffer.trim()) handleChunk(buffer, handlers)
  }).catch((error) => {
    if (error?.name === 'AbortError') return
    handlers.onError?.(error?.message || '助手暂时不可用')
  })

  return () => controller.abort()
}

function handleChunk(chunk, handlers) {
  let event = 'message'
  const dataLines = []
  for (const line of String(chunk).split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim()
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim())
  }
  const raw = dataLines.join('\n')
  if (!raw) return
  let payload
  try {
    payload = JSON.parse(raw)
  } catch (e) {
    payload = { text: raw }
  }
  if (event === 'delta') handlers.onDelta?.(payload.text || '')
  else if (event === 'done') handlers.onDone?.(payload)
  else if (event === 'error') handlers.onError?.(payload.message || '助手暂时不可用')
}
