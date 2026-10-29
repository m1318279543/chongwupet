import { reactive } from 'vue'
import { streamAssistant, sendAssistantFeedback } from '@/api/pet/petAssistant'

const GREETING = {
  shop: '我是宠物之家助手，可以帮你选宠、查订单、解答养宠问题。',
  detail: '我是选宠顾问，可以帮你判断这只宠物适不适合你，也能算一下每月大概的养护开销。',
  match: '说说你的居住空间、养宠经验、每天能陪多久和预算，我来帮你筛。',
  order: '订单、支付、退款的问题都可以问我。登录后我能看到你账号下的真实状态。',
  consult: '先问我试试。常见养护和平台规则我能直接回答；答不了会帮你转人工。',
  mypet: '我是养护管家，能看到每只宠物的疫苗、驱虫和体检记录，也能按档案给喂养建议。',
  admin: '我是经营助手，按看板口径回答营业额、订单、预约和咨询情况，只对管理员和店长开放。'
}

const QUICK = {
  shop: ['我想养一只不掉毛的猫', '退款需要什么条件？', '你们门店在哪？'],
  detail: ['它适合新手吗？', '每月大概花多少钱？', '疫苗和驱虫记录怎么看？'],
  match: ['小户型、第一次养，预算 3000', '家里有小孩，想养温顺的', '每天只能陪 1 小时'],
  order: ['我的订单到哪一步了？', '购物车里的东西怎么结算？'],
  consult: ['猫拉软便怎么办？', '寄养需要准备什么？', '多久洗一次澡？'],
  mypet: ['疫苗和驱虫什么时候到期？', '平时怎么喂、喂多少？', '最近做过哪些服务？'],
  admin: ['这个月营业额怎么样？', '近 7 天有多少订单？', '今天还有多少待处理？']
}

const state = reactive({
  open: false,
  scene: 'shop',
  bizId: '',
  petId: null,
  convId: null,
  messages: [],
  loading: false,
  // 从智能选宠页带入的答卷：带上后每轮对话都按这份条件算，不再让后端用正则重猜
  answers: null,
  quick: QUICK.shop,
  greeting: GREETING.shop
})

let seq = 0
let abort = null

function nextId() {
  seq += 1
  return 'm' + seq
}

function greetingMessage(text) {
  return {
    id: nextId(),
    role: 'assistant',
    content: text,
    blocks: [],
    citations: [],
    actions: [],
    greeting: true
  }
}

export function useAssistant() {
  function open(options = {}) {
    state.open = true
    state.scene = options.scene || 'shop'
    state.bizId = options.bizId || ''
    state.petId = options.petId || null
    // 换入口时一并换掉答卷条件；不传就清空，避免上一页的条件串到这一页
    state.answers = options.answers || null
    state.quick = QUICK[state.scene] || QUICK.shop
    state.greeting = options.greeting || GREETING[state.scene] || GREETING.shop

    // 换场景或指定新会话时清空，避免把上一个页面的上下文带进来
    if (options.fresh) {
      state.convId = null
      state.messages = []
    }
    if (!state.messages.length) {
      state.messages.push(greetingMessage(state.greeting))
    }
    if (options.message) {
      const text = String(options.message)
      setTimeout(() => send(text), 260)
    }
  }

  function close() {
    state.open = false
  }

  function reset() {
    stop()
    state.convId = null
    state.answers = null
    state.messages = [greetingMessage(state.greeting)]
  }

  function stop() {
    if (abort) {
      abort()
      abort = null
    }
    state.loading = false
    const last = state.messages[state.messages.length - 1]
    if (last && last.loading) last.loading = false
  }

  function send(content) {
    const text = String(content || '').trim()
    if (!text || state.loading) return
    state.messages.push({ id: nextId(), role: 'user', content: text })

    const reply = reactive({
      id: nextId(),
      role: 'assistant',
      content: '',
      blocks: [],
      citations: [],
      actions: [],
      loading: true
    })
    state.messages.push(reply)
    state.loading = true

    abort = streamAssistant({
      convId: state.convId,
      scene: state.scene,
      bizId: state.bizId,
      petId: state.petId,
      answers: state.answers || undefined,
      message: text
    }, {
      onDelta: (delta) => {
        reply.content += delta
      },
      onDone: (payload) => {
        if (payload?.content) reply.content = payload.content
        reply.blocks = payload?.blocks || []
        reply.citations = payload?.citations || []
        reply.actions = payload?.actions || []
        reply.msgId = payload?.msgId
        reply.convId = payload?.convId
        reply.source = payload?.source
        reply.handoff = payload?.handoff
        reply.loading = false
        if (payload?.convId) state.convId = payload.convId
        state.loading = false
        abort = null
      },
      onError: (message) => {
        if (!reply.content) reply.content = message
        reply.error = true
        reply.loading = false
        state.loading = false
        abort = null
      }
    })
  }

  async function feedback(message, rating) {
    if (!message?.msgId || message.feedbackSent) return
    try {
      await sendAssistantFeedback({
        convId: message.convId || state.convId,
        msgId: message.msgId,
        rating
      })
      message.feedbackSent = rating
    } catch (e) {
      // 反馈失败不打扰用户
    }
  }

  return { state, open, close, reset, send, stop, feedback }
}
