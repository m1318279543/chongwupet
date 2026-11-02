<template>
  <div class="assistant-dock" :class="{ 'is-admin': defaultScene === 'admin' }">
    <transition name="as-panel">
      <section v-if="state.open" class="as-panel" :style="panelStyle" role="dialog" aria-label="AI 助手">
        <header class="as-head" @pointerdown="startPanelDrag">
          <div class="as-brand">
            <span class="as-logo as-bot-logo" aria-hidden="true">
              <AssistantBot :talking="state.loading" />
            </span>
            <div class="as-name">
              <strong>宠物之家助手</strong>
              <em>{{ sceneLabel }}</em>
            </div>
          </div>
          <div class="as-head-act">
            <button type="button" @click="reset">新对话</button>
            <button type="button" class="as-close" aria-label="收起" @click="close">×</button>
          </div>
        </header>

        <div ref="bodyRef" class="as-body">
          <div v-for="m in state.messages" :key="m.id" class="as-row" :class="'is-' + m.role">
            <div v-if="m.role === 'assistant'" class="as-avatar"><AssistantBot mini /></div>
            <div class="as-stack">
              <div v-if="m.content" class="as-bubble">{{ m.content }}</div>
              <div v-if="m.loading && !m.content" class="as-typing">
                <i></i><i></i><i></i>
                <span v-if="waitSec >= 3" class="as-wait">思考中 {{ waitSec }}s</span>
              </div>

              <div v-if="m.blocks && m.blocks.length" class="as-blocks">
                <AssistantBlock v-for="(block, index) in m.blocks" :key="index" :block="block" @consult="consultOrder" />
              </div>

              <div v-if="m.citations && m.citations.length" class="as-cites">
                <span class="as-cites-label">依据</span>
                <span v-for="cite in m.citations" :key="cite.knowledgeId" class="as-cite">{{ cite.title }}</span>
              </div>

              <div v-if="m.actions && m.actions.length" class="as-actions">
                <button v-for="(action, index) in m.actions" :key="index" type="button" @click="handleAction(action)">
                  {{ action.label }}
                </button>
              </div>

              <div v-if="m.role === 'assistant' && m.msgId" class="as-feedback">
                <button type="button" :class="{ on: m.feedbackSent === '1' }" @click="feedback(m, '1')">有用</button>
                <button type="button" :class="{ on: m.feedbackSent === '0' }" @click="feedback(m, '0')">没用</button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="showQuick" class="as-quick">
          <button v-for="q in state.quick" :key="q" type="button" @click="submit(q)">{{ q }}</button>
        </div>

        <footer class="as-foot">
          <textarea
            v-model="input"
            rows="1"
            maxlength="500"
            placeholder="描述你的问题，Enter 发送"
            @keydown.enter.exact.prevent="onEnter"
            @input="autoGrow"
          ></textarea>
          <button v-if="state.loading" type="button" class="as-send is-stop" @click="stop">停止</button>
          <button v-else type="button" class="as-send" :disabled="!input.trim()" @click="submit()">发送</button>
        </footer>
        <p class="as-tip">AI 回答仅供参考，健康问题请以兽医诊断为准</p>
      </section>
    </transition>

    <!-- 数字人悬浮球：可拖拽、位置记忆；点击展开悬浮聊天窗 -->
    <button
      v-if="showLauncher && !state.open" type="button" class="as-orb"
      :class="{ 'is-dragging': dragging }"
      :style="orbStyle"
      aria-label="打开 AI 助手"
      @pointerdown="startOrbDrag"
      @pointermove="onOrbMove"
      @pointerup="onOrbUp"
      @pointercancel="onOrbUp"
    >
      <span class="as-orb-bot"><AssistantBot :talking="state.loading" /></span>
      <span class="as-orb-txt">问我</span>
      <i class="as-orb-dot" aria-hidden="true"></i>
      <transition name="as-tip">
        <span v-if="tipShow" class="as-orb-tip" :class="{ 'is-flip': tipFlip }" aria-hidden="true">有事问我～</span>
      </transition>
    </button>
  </div>
</template>

<script setup>
import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import AssistantBlock from './AssistantBlock.vue'
import AssistantBot from './AssistantBot.vue'
import { useAssistant } from './useAssistant'
import { useUserStore } from '@/store/modules/user'
import { useCartStore } from '@/store/modules/cart'
import { submitConsult } from '@/api/pet/petConsult'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const cartStore = useCartStore()
const openAuth = inject('openAuth', null)
const props = defineProps({
  defaultScene: { type: String, default: 'shop' },
  // 是否渲染右下/右上悬浮入口：布局里已有顶栏入口时传 false
  showLauncher: { type: Boolean, default: true }
})
const { state, open, close, reset, send, stop, feedback } = useAssistant()

const input = ref('')
const bodyRef = ref(null)

const sceneLabel = computed(() => ({
  shop: '商城助手',
  detail: '选宠顾问',
  match: '选宠顾问',
  order: '订单助手',
  consult: '养宠咨询',
  mypet: '养护管家',
  admin: '经营助手'
}[state.scene] || '商城助手'))

const showQuick = computed(() => !state.loading && state.messages.length <= 1)

function scrollBottom() {
  nextTick(() => {
    const el = bodyRef.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

watch(() => [
  state.messages.length,
  state.messages[state.messages.length - 1]?.content,
  state.messages[state.messages.length - 1]?.loading
], scrollBottom, { deep: false })

watch(() => state.open, (opened) => {
  if (!opened) return
  hideTip()
  // 首次打开时贴着悬浮球定位；之后沿用上次拖到的位置
  if (!panelPos.value) panelPos.value = defaultPanelPos()
  scrollBottom()
})

/* 等待计时：推理型模型首字前有思考阶段，给个秒数比干转三个点更让人安心 */
const waitSec = ref(0)
let waitTimer = null
watch(() => state.loading, (loading) => {
  clearInterval(waitTimer)
  waitSec.value = 0
  if (!loading) return
  waitTimer = setInterval(() => { waitSec.value += 1 }, 1000)
})

function openDefault() {
  open({ scene: props.defaultScene })
}

function submit(text) {
  const value = typeof text === 'string' ? text : input.value
  if (!value.trim() || state.loading) return
  send(value)
  input.value = ''
  nextTick(() => autoGrow())
}

/** 点订单卡片：直接就该订单发起咨询 */
function consultOrder(orderNo) {
  if (!orderNo || state.loading) return
  submit(`我想咨询订单 ${orderNo} 的售后问题，帮我看看这笔订单的明细和当前状态。`)
}

function onEnter(event) {
  if (event.isComposing) return
  submit()
}

function autoGrow() {
  const el = document.querySelector('.as-foot textarea')
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 96) + 'px'
}

async function handleAction(action) {
  if (!action) return
  if (action.type === 'link' && action.path) {
    close()
    router.push(action.path)
    return
  }
  if (action.type === 'login') {
    if (openAuth) openAuth('login')
    return
  }
  if (action.type === 'handoff') {
    await handoff()
    return
  }
  if (action.type === 'cart_add') {
    await addCart(action.data)
    return
  }
  if (action.type === 'appointment_create') {
    await createAppointment(action.data)
    return
  }
  // 「这只适不适合我」：留在详情页把当前宠物丢进对话继续问。
  // 原来跳到 /shop/match 会让人从头再做 10 题，刚看的那只反而丢了。
  if (action.type === 'ask' && action.data) {
    state.scene = 'detail'
    if (action.data.petId) state.petId = action.data.petId
    if (action.data.message) send(action.data.message)
  }
}

/** 加购：先确认，再写入本地购物车（和宠物粮专区同一份 store） */
async function addCart(goods) {
  if (!goods || !goods.goodsId) return
  if (Number(goods.stock) <= 0) {
    ElMessage.warning('该商品暂时缺货')
    return
  }
  try {
    await ElMessageBox.confirm(
      `${goods.goodsName}（${goods.spec || '规格待补'}） ¥${goods.price}`,
      '加入购物车',
      { confirmButtonText: '加入', cancelButtonText: '再想想' }
    )
  } catch (e) {
    return
  }
  cartStore.addItem({
    id: goods.goodsId,
    goodsId: goods.goodsId,
    cat: goods.cat,
    name: goods.goodsName,
    image: goods.image,
    spec: goods.spec,
    price: goods.price
  })
  ElMessage.success({ message: '已加入购物车，可在购物车里修改数量', duration: 1500 })
}

/**
 * 代预约：不再由助手直接提交。
 * 带上要素跳宠物详情页的预约弹窗（预填），让用户在正式表单里核对时段后再提交——
 * 与手动预约同一入口、同一校验，也避免「聊完天就莫名多了一条预约」。
 */
function createAppointment(data) {
  if (!data || !data.petId) return
  if (!userStore.token) {
    if (openAuth) openAuth('login')
    return
  }
  const query = { appoint: '1' }
  if (data.storeId) query.storeId = data.storeId
  if (data.date) query.date = data.date
  if (data.time) query.slot = data.time
  if (data.contactPhone) query.phone = data.contactPhone
  query.remark = '由 AI 助手代预约'
  close()
  router.push({ path: `/shop/pet/${data.petId}`, query })
}

async function handoff() {
  if (!userStore.token) {
    if (openAuth) openAuth('login')
    return
  }
  const reversed = [...state.messages].reverse()
  const lastUser = reversed.find((m) => m.role === 'user')
  const lastAi = reversed.find((m) => m.role === 'assistant' && m.content)
  const question = (lastUser?.content || lastAi?.content || '需要人工协助').slice(0, 500)
  try {
    await submitConsult({
      question,
      contact: '',
      source: 'ai',
      aiSummary: (lastAi?.content || '').slice(0, 900)
    })
    ElMessage.success('已转给人工客服，回复会出现在「我的咨询」')
    close()
    // 咨询页本身就有「先问 AI」入口，若在这里转人工再跳回同一页，
    // 会形成 consult → AI → 转人工 → consult 的循环。留在原地刷新列表即可。
    if (route.path === '/shop/consult') {
      window.dispatchEvent(new CustomEvent('pet-consult-refresh'))
    } else {
      router.push('/shop/consult')
    }
  } catch (e) {
    ElMessage.error(e?.message || '转人工失败，请稍后再试')
  }
}

/* ---------- 数字人悬浮球：可拖拽 + 位置记忆 ---------- */
const ORB_KEY = 'pet-assistant-orb-pos'
const ORB_SIZE = 68        // 与 .as-orb 保持一致
const ORB_SIZE_SM = 58     // 手机端尺寸
const isNarrow = () => window.innerWidth <= 768
const orbSize = () => (isNarrow() ? ORB_SIZE_SM : ORB_SIZE)
const dragging = ref(false)
const orbPos = ref(loadOrbPos())
const orbStyle = computed(() => ({ left: orbPos.value.x + 'px', top: orbPos.value.y + 'px' }))
let orbDrag = null

function defaultOrb() {
  const s = orbSize()
  // 手机端底部压着 5 栏标签栏（约 58px），球要落在它上方
  const bottom = isNarrow() ? 74 : 32
  const right = isNarrow() ? 14 : 26
  return { x: window.innerWidth - s - right, y: window.innerHeight - s - bottom }
}
function clampOrb(p) {
  const s = orbSize()
  const w = window.innerWidth, h = window.innerHeight
  return {
    x: Math.min(Math.max(8, p.x), Math.max(8, w - s - 8)),
    y: Math.min(Math.max(8, p.y), Math.max(8, h - s - 8))
  }
}
function loadOrbPos() {
  try {
    const raw = localStorage.getItem(ORB_KEY)
    if (raw) {
      const p = JSON.parse(raw)
      if (typeof p.x === 'number' && typeof p.y === 'number') return clampOrb(p)
    }
  } catch (e) { /* 隐私模式读不到就算了 */ }
  return defaultOrb()
}
function startOrbDrag(e) {
  if (e.button != null && e.button !== 0) return
  const rect = e.currentTarget.getBoundingClientRect()
  orbDrag = { px: e.clientX, py: e.clientY, x: rect.left, y: rect.top, moved: false }
  dragging.value = false
  e.currentTarget.setPointerCapture?.(e.pointerId)
}
function onOrbMove(e) {
  if (!orbDrag) return
  const dx = e.clientX - orbDrag.px, dy = e.clientY - orbDrag.py
  if (!orbDrag.moved && Math.hypot(dx, dy) < 4) return
  orbDrag.moved = true
  dragging.value = true
  orbPos.value = clampOrb({ x: orbDrag.x + dx, y: orbDrag.y + dy })
}
function onOrbUp() {
  if (!orbDrag) return
  const moved = orbDrag.moved
  orbDrag = null
  dragging.value = false
  hideTip()
  if (moved) {
    try { localStorage.setItem(ORB_KEY, JSON.stringify(orbPos.value)) } catch (e) { /* 忽略 */ }
  } else {
    openDefault()
  }
}

/* 首次进站的招呼气泡：只在一次会话里露一次，避免反复打扰 */
const TIP_KEY = 'pet-assistant-tip-shown'
const tipShow = ref(false)
// 球在右半屏 → 气泡放左边（is-flip）；在左半屏 → 放右边，避免贴边被裁掉
const tipFlip = computed(() => orbPos.value.x + orbSize() / 2 >= window.innerWidth / 2)
let tipTimer = null

function hideTip() {
  tipShow.value = false
  clearTimeout(tipTimer)
}
function scheduleTip() {
  try {
    if (sessionStorage.getItem(TIP_KEY)) return
  } catch (e) { /* 隐私模式 */ }
  tipTimer = setTimeout(() => {
    if (state.open) return
    tipShow.value = true
    try { sessionStorage.setItem(TIP_KEY, '1') } catch (e) { /* 忽略 */ }
    tipTimer = setTimeout(() => { tipShow.value = false }, 6000)
  }, 2200)
}

/* ---------- 悬浮窗：贴着球展开，头部可拖动 ---------- */
const panelPos = ref(null)
const panelStyle = computed(() => panelPos.value
  ? { left: panelPos.value.x + 'px', top: panelPos.value.y + 'px', right: 'auto', bottom: 'auto' }
  : {})
let panelDrag = null

function clampPanel(p) {
  const el = document.querySelector('.as-panel')
  const w = el?.offsetWidth || 400
  const h = el?.offsetHeight || Math.min(620, window.innerHeight - 132)
  return {
    x: Math.min(Math.max(0, p.x), Math.max(0, window.innerWidth - w)),
    y: Math.min(Math.max(0, p.y), Math.max(0, window.innerHeight - h))
  }
}
/** 默认位置：优先让窗口右缘与球右缘对齐、浮在球的上方；放不下就贴在球这一侧 */
function defaultPanelPos() {
  if (isNarrow()) return null   // 手机端全屏面板，不需要定位
  const w = 400
  const h = Math.min(620, window.innerHeight - 132)
  const maxX = Math.max(16, window.innerWidth - w - 16)
  const alignRight = orbPos.value.x + orbSize() - w
  // 右对齐放不进屏幕时，退回「以球为参考向左展开」，避免窗口被甩到屏幕另一头
  const x = alignRight >= 16
    ? Math.min(alignRight, maxX)
    : Math.min(Math.max(16, orbPos.value.x - 40), maxX)
  const y = Math.min(Math.max(76, orbPos.value.y - h - 12), window.innerHeight - h - 16)
  return { x, y }
}
function onResize() {
  orbPos.value = clampOrb(orbPos.value)
  if (panelPos.value && !isNarrow()) panelPos.value = clampPanel(panelPos.value)
}

function startPanelDrag(e) {
  if (isNarrow()) return
  if (e.target.closest('button')) return
  const el = e.currentTarget.closest('.as-panel')
  if (!el) return
  const r = el.getBoundingClientRect()
  panelDrag = { px: e.clientX, py: e.clientY, x: r.left, y: r.top }
  window.addEventListener('pointermove', onPanelMove)
  window.addEventListener('pointerup', onPanelUp, { once: true })
}
function onPanelMove(e) {
  if (!panelDrag) return
  panelPos.value = clampPanel({
    x: panelDrag.x + e.clientX - panelDrag.px,
    y: panelDrag.y + e.clientY - panelDrag.py
  })
}
function onPanelUp() {
  panelDrag = null
  window.removeEventListener('pointermove', onPanelMove)
}

function onKeydown(event) {
  if (event.key === 'Escape' && state.open) close()
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('resize', onResize)
  if (props.showLauncher) scheduleTip()
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('resize', onResize)
  window.removeEventListener('pointermove', onPanelMove)
  clearTimeout(tipTimer)
  clearInterval(waitTimer)
})
</script>

<style scoped lang="scss">
.assistant-dock { position: static; }

/* 数字人悬浮球：可拖拽、位置记忆，点击展开悬浮聊天窗 */
.as-orb {
  position: fixed; z-index: var(--z-float);
  width: 68px; height: 68px; padding: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  border: 1px solid var(--brand-200); border-radius: 50%;
  background: var(--bg-card);
  box-shadow: 0 10px 26px -12px rgba(22, 33, 29, .45), 0 2px 6px rgba(22, 33, 29, .06);
  cursor: grab; touch-action: none; user-select: none;
  font-family: inherit;
  transition: box-shadow .18s, transform .18s;
  &:hover { box-shadow: 0 14px 34px -12px rgba(22, 33, 29, .5); transform: translateY(-2px); }
  // 拖拽中不要 hover 位移，否则手感和落点都会飘
  &.is-dragging { cursor: grabbing; transform: none; transition: none; }
}
.as-orb-bot { width: 34px; height: 34px; display: block; }
.as-orb-txt {
  margin-top: 1px; font-size: 10px; font-weight: 700; line-height: 1;
  color: var(--brand-700); letter-spacing: .04em;
}
.as-orb-dot {
  position: absolute; top: 7px; right: 9px;
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--danger-500); box-shadow: 0 0 0 2px var(--bg-card);
  animation: as-orb-pulse 2.4s ease-in-out infinite;
}
@keyframes as-orb-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(.68); opacity: .55; }
}
/* 首次进站的招呼气泡：从球侧面弹出，带一个小尖角指回数字人 */
.as-orb-tip {
  position: absolute; left: calc(100% + 12px); top: 50%; transform: translateY(-50%);
  padding: 7px 11px; border-radius: var(--radius-md);
  background: var(--bg-card); border: 1px solid var(--brand-200);
  box-shadow: 0 8px 20px -10px rgba(22, 33, 29, .4);
  font-size: var(--fs-2); font-weight: 600; color: var(--brand-700); white-space: nowrap;
  pointer-events: none;
  &::after {
    content: ''; position: absolute; left: -5px; top: 50%;
    width: 8px; height: 8px; transform: translateY(-50%) rotate(45deg);
    background: var(--bg-card);
    border-left: 1px solid var(--brand-200); border-bottom: 1px solid var(--brand-200);
  }
  &.is-flip {
    left: auto; right: calc(100% + 12px);
    &::after {
      left: auto; right: -5px;
      transform: translateY(-50%) rotate(225deg);
    }
  }
}
.as-tip-enter-active, .as-tip-leave-active { transition: opacity .2s, transform .2s; }
.as-tip-enter-from, .as-tip-leave-to { opacity: 0; transform: translateY(-50%) translateX(-6px); }
.as-orb-tip.is-flip.as-tip-enter-from, .as-orb-tip.is-flip.as-tip-leave-to { transform: translateY(-50%) translateX(6px); }

/* 悬浮聊天窗：浮在页面右下角，头部可拖动；小屏降级为全屏 */
.as-panel {
  position: fixed; right: 24px; bottom: 96px; z-index: var(--z-drawer);
  width: 400px; max-width: calc(100vw - 32px);
  height: min(620px, calc(100vh - 132px));
  display: flex; flex-direction: column;
  background: var(--bg-page);
  border: 1px solid var(--border-1); border-radius: var(--radius-md);
  box-shadow: 0 24px 60px -24px rgba(22, 33, 29, .45), 0 4px 14px rgba(22, 33, 29, .06);
  overflow: hidden;
}
.as-head {
  flex-shrink: 0; height: 60px; padding: 0 14px 0 16px;
  display: flex; align-items: center; justify-content: space-between;
  background: var(--bg-card); border-bottom: 1px solid var(--border-1);
  cursor: move; user-select: none;
  button { cursor: pointer; }
}
.as-brand { display: flex; align-items: center; gap: 10px; }
.as-logo {
  width: 32px; height: 32px; border-radius: var(--radius-md); display: grid; place-items: center;
  background: var(--grad-brand);
  svg { width: 17px; height: 17px; fill: var(--on-accent); }
}
/* 数字人头部：底色改成浅色，让数字人的绿/靛配色自己跳出来 */
.as-bot-logo { width: 34px; height: 34px; background: var(--brand-50); border-radius: 50%; }
.as-name {
  display: flex; flex-direction: column; line-height: 1.25;
  strong { font-size: var(--fs-5); font-weight: 700; color: var(--text-1); }
  em { font-style: normal; font-size: var(--fs-1); color: var(--text-3); }
}
.as-head-act {
  display: flex; align-items: center; gap: 4px;
  button {
    border: 0; background: none; cursor: pointer; font-family: inherit;
    font-size: var(--fs-2); color: var(--text-3); padding: 6px 8px; border-radius: var(--radius-md);
    &:hover { background: var(--bg-sunken); color: var(--text-1); }
  }
  .as-close { font-size: var(--fs-8); line-height: 1; padding: 2px 8px 6px; }
}

.as-body {
  flex: 1; overflow-y: auto; padding: 16px 14px 8px;
  display: flex; flex-direction: column; gap: 14px;
  scrollbar-width: thin;
}
.as-row { display: flex; gap: 8px; align-items: flex-start; }
.as-row.is-user { justify-content: flex-end; }
.as-avatar {
  flex-shrink: 0; width: 28px; height: 28px; margin-top: 2px;
  display: grid; place-items: center;
}
.as-stack { max-width: 84%; display: flex; flex-direction: column; gap: 8px; }
.is-user .as-stack { align-items: flex-end; max-width: 78%; }

.as-bubble {
  padding: 10px 12px; border-radius: var(--radius-md);
  background: var(--bg-card); border: 1px solid var(--border-1);
  font-size: var(--fs-4); line-height: 1.72; color: var(--text-1);
  white-space: pre-wrap; overflow-wrap: anywhere;
}
.is-user .as-bubble {
  background: var(--brand-600); border-color: var(--brand-600); color: var(--on-accent);
  border-bottom-right-radius: 6px;
}
.is-assistant .as-bubble { border-bottom-left-radius: 6px; }

.as-typing {
  display: inline-flex; gap: 4px; padding: 12px 14px; width: fit-content;
  align-items: center;
  background: var(--bg-card); border: 1px solid var(--border-1); border-radius: var(--radius-md);
  i { width: 5px; height: 5px; border-radius: 50%; background: var(--brand-400); animation: as-blink 1s infinite; }
  i:nth-child(2) { animation-delay: .15s; }
  i:nth-child(3) { animation-delay: .3s; }
}
.as-wait {
  margin-left: 4px; padding-left: 8px; border-left: 1px solid var(--border-1);
  font-size: var(--fs-1); color: var(--text-3); white-space: nowrap;
}
@keyframes as-blink { 0%, 100% { opacity: .35; } 50% { opacity: 1; } }

.as-blocks { display: flex; flex-direction: column; gap: 8px; }
.as-cites {
  display: flex; flex-wrap: wrap; align-items: center; gap: 6px;
  font-size: var(--fs-2); color: var(--text-3);
}
.as-cites-label { color: var(--text-4); }
.as-cite {
  padding: 2px 7px; border-radius: var(--radius-md);
  background: var(--brand-50); color: var(--brand-700);
}
.as-actions { display: flex; flex-wrap: wrap; gap: 6px; }
.as-actions button {
  border: 1px solid var(--brand-200); background: var(--bg-card); color: var(--brand-700);
  font-family: inherit; font-size: var(--fs-3); padding: 5px 11px; border-radius: var(--radius-md); cursor: pointer;
  &:hover { background: var(--brand-50); }
}
.as-feedback {
  display: flex; align-items: center; gap: 4px;
  button {
    border: 0; background: none; font-family: inherit; font-size: var(--fs-2);
    color: var(--text-4); cursor: pointer; padding: 2px 6px; border-radius: var(--radius-sm);
    &:hover { background: var(--bg-sunken); color: var(--text-2); }
    &.on { color: var(--brand-700); background: var(--brand-50); }
  }
}

.as-quick {
  flex-shrink: 0; padding: 0 14px 10px; display: flex; flex-wrap: wrap; gap: 6px;
  button {
    border: 1px solid var(--border-1); background: var(--bg-card); color: var(--text-2);
    font-family: inherit; font-size: var(--fs-2); padding: 6px 10px; border-radius: var(--radius-md); cursor: pointer;
    &:hover { border-color: var(--brand-200); color: var(--brand-700); }
  }
}

.as-foot {
  flex-shrink: 0; display: flex; align-items: flex-end; gap: 8px;
  padding: 10px 12px; background: var(--bg-card); border-top: 1px solid var(--border-1);
  textarea {
    flex: 1; min-height: 38px; max-height: 96px; resize: none;
    border: 1px solid var(--border-1); border-radius: var(--radius-md);
    padding: 9px 11px; font-family: inherit; font-size: var(--fs-4); line-height: 1.5;
    color: var(--text-1); background: var(--bg-page);
    &:focus { outline: none; border-color: var(--brand-400); background: var(--bg-card); }
  }
}
.as-send {
  flex-shrink: 0; height: 38px; padding: 0 15px; border-radius: var(--radius-md);
  border: 1px solid var(--brand-600); background: var(--brand-600); color: var(--on-accent);
  font-family: inherit; font-size: var(--fs-4); font-weight: 700; cursor: pointer;
  &:disabled { opacity: .45; cursor: not-allowed; }
  &.is-stop { background: var(--bg-card); color: var(--text-2); border-color: var(--border-1); }
}
.as-tip {
  flex-shrink: 0; margin: 0; padding: 0 12px 9px; background: var(--bg-card);
  font-size: var(--fs-1); color: var(--text-4); text-align: center;
}

.as-panel-enter-active, .as-panel-leave-active { transition: opacity .18s, transform .22s cubic-bezier(.22, .61, .36, 1); }
.as-panel-enter-from, .as-panel-leave-to { opacity: 0; transform: translateY(14px) scale(.97); }

@media (max-width: 768px) {
  /* 手机上悬浮球同样可拖，但尺寸收小，默认落在底部标签栏上方 */
  .as-orb { width: 58px; height: 58px; }
  .as-orb-bot { width: 30px; height: 30px; }
  .as-orb-txt { font-size: 9px; }
  .as-orb-dot { top: 6px; right: 8px; }

  /* 小屏没有空间做浮窗，改为全屏面板：位置/尺寸全部覆盖，忽略拖拽产生的内联样式 */
  .as-panel {
    inset: 0 !important; width: 100% !important; height: 100% !important;
    max-width: none; border: 0; border-radius: 0;
    padding-bottom: env(safe-area-inset-bottom);
  }
  .as-head { height: 56px; cursor: default; }
  .as-body { padding: 14px 12px 6px; }
  .as-stack { max-width: 88%; }
  .as-bubble { font-size: var(--fs-5); }
}
</style>
