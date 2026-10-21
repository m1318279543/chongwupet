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

// 流式对话（SSE）：onDelta 收到增量文本；resolve({ source, final })
export function aiChatStream(data, onDelta, signal) {
  const base = import.meta.env.VITE_APP_BASE_API || '/dev-api'
  return fetch(base + '/pet/ai/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    signal
  }).then(async (resp) => {
    if (!resp.ok || !resp.body) throw new Error('HTTP ' + resp.status)
    const reader = resp.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buf = ''
    let result = { source: 'ai', final: '' }
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })
      // SSE 以空行分隔事件
      let idx
      while ((idx = buf.indexOf('\n\n')) >= 0) {
        const raw = buf.slice(0, idx)
        buf = buf.slice(idx + 2)
        for (const line of raw.split('\n')) {
          const t = line.trim()
          if (!t.startsWith('data:')) continue
          const payload = t.slice(5).trim()
          if (!payload) continue
          try {
            const evt = JSON.parse(payload)
            if (evt.delta && onDelta) onDelta(evt.delta)
            if (evt.done) result = { source: evt.source || 'ai', final: evt.final || '' }
          } catch (e) { /* 忽略不完整片段 */ }
        }
      }
    }
    return result
  })
}
