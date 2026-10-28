<template>
  <div class="assistant-dock" :class="{ 'is-admin': defaultScene === 'admin' }">
    <transition name="as-panel">
      <section v-if="state.open" class="as-panel" role="dialog" aria-label="AI 助手">
        <header class="as-head">
          <div class="as-brand">
            <span class="as-logo" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M12 2l1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9z"/></svg>
            </span>
            <div class="as-name">
              <strong>宠物之家助手</strong>
              <em>{{ sceneLabel }}</em>
            </div>
          </div>
          <div class="as-head-act">
            <button type="button" @click="reset">新对话</button>
            <button type="button" class="as-close" aria-label="关闭" @click="close">×</button>
          </div>
        </header>

        <div ref="bodyRef" class="as-body">
          <div v-for="m in state.messages" :key="m.id" class="as-row" :class="'is-' + m.role">
            <div v-if="m.role === 'assistant'" class="as-avatar">AI</div>
            <div class="as-stack">
              <div v-if="m.content" class="as-bubble">{{ m.content }}</div>
              <div v-if="m.loading && !m.content" class="as-typing"><i></i><i></i><i></i></div>

              <div v-if="m.blocks && m.blocks.length" class="as-blocks">
                <AssistantBlock v-for="(block, index) in m.blocks" :key="index" :block="block" />
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
                <span v-if="m.source === 'local'" class="as-src">本地知识与业务数据</span>
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

    <button
      v-if="!state.open" type="button" class="as-launcher"
      :style="launcherStyle" aria-label="打开 AI 助手"
      @pointerdown="onPointerDown" @click="onClickLauncher"
    >
      <span class="as-launcher-ico" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M12 2l1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9zM18.5 15l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9z"/></svg>
      </span>
      <span class="as-txt">{{ defaultScene === 'admin' ? '问数据' : '问助手' }}</span>
    </button>
  </div>
</template>

<script setup>
import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import AssistantBlock from './AssistantBlock.vue'
import { useAssistant } from './useAssistant'
import { useUserStore } from '@/store/modules/user'
import { useCartStore } from '@/store/modules/cart'
import { submitConsult } from '@/api/pet/petConsult'
import { addPetAppointment } from '@/api/pet/petAppointment'

const router = useRouter()
const userStore = useUserStore()
const cartStore = useCartStore()
const openAuth = inject('openAuth', null)
const props = defineProps({
  defaultScene: { type: String, default: 'shop' }
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
  if (opened) scrollBottom()
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
  ElMessage.success('已加入购物车，可在购物车里修改数量')
}

/** 代预约：确认卡里的要素由后端整理，这里只做二次确认和提交 */
async function createAppointment(data) {
  if (!data || !data.petId) return
  if (!userStore.token) {
    if (openAuth) openAuth('login')
    return
  }
  let phone = data.contactPhone || ''
  if (!phone) {
    try {
      const { value } = await ElMessageBox.prompt('留个联系电话，门店确认时用', '预约看宠', {
        confirmButtonText: '下一步',
        cancelButtonText: '取消',
        inputPattern: /^1\d{10}$/,
        inputErrorMessage: '请输入 11 位手机号'
      })
      phone = value
    } catch (e) {
      return
    }
  }
  try {
    await ElMessageBox.confirm(
      `宠物 ${data.petName} · ${data.storeName || '默认门店'} · ${data.date} ${data.time} · ${phone}`,
      '确认预约',
      { confirmButtonText: '确认提交', cancelButtonText: '再改改' }
    )
  } catch (e) {
    return
  }
  try {
    await addPetAppointment({
      petId: data.petId,
      userId: userStore.userId,
      storeId: data.storeId,
      appointmentDate: `${data.date} ${data.time}:00`,
      contactPhone: phone,
      status: '0',
      remark: '由 AI 助手代预约'
    })
    ElMessage.success('预约已提交，门店会尽快联系你')
    close()
    router.push('/shop/appointment')
  } catch (e) {
    ElMessage.error(e?.msg || e?.message || '预约提交失败')
  }
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
    router.push('/shop/consult')
  } catch (e) {
    ElMessage.error(e?.message || '转人工失败，请稍后再试')
  }
}

/* ---------- 挂球位置：默认右上角，桌面端可拖动并记住位置 ---------- */
const POS_KEY = 'as-launcher-pos'
const launcherStyle = ref({})
const suppressClick = ref(false)
let dragState = null

try {
  const saved = JSON.parse(localStorage.getItem(POS_KEY) || 'null')
  if (saved && saved.left) launcherStyle.value = saved
} catch (e) { /* 忽略坏数据，用默认位置 */ }

function onPointerDown(event) {
  if (window.innerWidth <= 768) return  // 移动端固定在标签栏上方，不拖
  const rect = event.currentTarget.getBoundingClientRect()
  dragState = { sx: event.clientX, sy: event.clientY, ox: rect.left, oy: rect.top, moved: false }
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
}
function onPointerMove(event) {
  if (!dragState) return
  const dx = event.clientX - dragState.sx
  const dy = event.clientY - dragState.sy
  if (!dragState.moved && Math.hypot(dx, dy) < 5) return  // 小于 5px 视为点击
  dragState.moved = true
  const top = Math.min(Math.max(dragState.oy + dy, 8), window.innerHeight - 52)
  const left = Math.min(Math.max(dragState.ox + dx, 8), window.innerWidth - 52)
  launcherStyle.value = { top: top + 'px', left: left + 'px', right: 'auto', bottom: 'auto' }
}
function onPointerUp() {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  if (dragState && dragState.moved) {
    suppressClick.value = true  // 拖动结束的这一次 pointerup 不当作点击
    setTimeout(() => { suppressClick.value = false }, 60)
    try { localStorage.setItem(POS_KEY, JSON.stringify(launcherStyle.value)) } catch (e) { /* 存不了就算了 */ }
  }
  dragState = null
}
function onClickLauncher() {
  if (!suppressClick.value) openDefault()
}

function onKeydown(event) {
  if (event.key === 'Escape' && state.open) close()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<style scoped lang="scss">
.assistant-dock { position: static; }

/* 桌面入口：图标圆钮，默认悬在右上角（顶栏下方），可拖动，悬停显示文字气泡 */
.as-launcher {
  position: fixed; top: 84px; right: 22px; z-index: 160;
  // 后台场景：右上角会压住统计卡，改默认右下角并收小，减少对管理页面的干扰
  .is-admin & {
    top: auto; bottom: 28px; width: 40px; height: 40px;
  }
  display: inline-flex; align-items: center; justify-content: center;
  width: 44px; height: 44px; padding: 0;
  // 浮标是唯一保留 pill 圆角与投影的元素：它必须始终浮在内容之上
  border: 1px solid var(--brand-200); border-radius: var(--radius-pill);
  background: #fff; color: var(--brand-700);
  font-family: inherit; font-size: 14px; font-weight: 700; cursor: pointer;
  box-shadow: 0 2px 8px rgba(22, 25, 23, .10);
  transition: box-shadow .16s;
  touch-action: none;  // 拖拽期间不让浏览器接管手势
  &:hover { box-shadow: 0 4px 14px rgba(22, 25, 23, .16); }
}
.as-launcher-ico {
  width: 26px; height: 26px; border-radius: var(--radius-md); display: grid; place-items: center;
  background: var(--grad-brand);
  svg { width: 15px; height: 15px; fill: #fff; }
}
/* 文字改悬停气泡：默认隐藏，移入浮标时从右侧弹出 */
.as-txt {
  position: absolute; right: calc(100% + 10px); top: 50%; transform: translateY(-50%);
  padding: 6px 11px; border-radius: var(--radius-sm);
  background: var(--text-1); color: #fff;
  font-size: 12.5px; font-weight: 600; white-space: nowrap;
  opacity: 0; pointer-events: none;
  transition: opacity .15s;
}
.as-launcher:hover .as-txt { opacity: 1; }

/* 面板：右侧全高抽屉 —— 聊天时左侧内容保持可见，边看边问 */
.as-panel {
  position: fixed; top: 0; right: 0; bottom: 0; z-index: 1900;
  width: 424px; max-width: calc(100vw - 32px);
  display: flex; flex-direction: column;
  background: var(--bg-page);
  border: 0; border-left: 1px solid var(--border-1); border-radius: 0;
  box-shadow: -26px 0 60px -32px rgba(22, 33, 29, .42);
  overflow: hidden;
}
.as-head {
  flex-shrink: 0; height: 60px; padding: 0 14px 0 16px;
  display: flex; align-items: center; justify-content: space-between;
  background: #fff; border-bottom: 1px solid var(--border-1);
}
.as-brand { display: flex; align-items: center; gap: 10px; }
.as-logo {
  width: 32px; height: 32px; border-radius: var(--radius-md); display: grid; place-items: center;
  background: var(--grad-brand);
  svg { width: 17px; height: 17px; fill: #fff; }
}
.as-name {
  display: flex; flex-direction: column; line-height: 1.25;
  strong { font-size: 14px; font-weight: 700; color: var(--text-1); }
  em { font-style: normal; font-size: 11px; color: var(--text-3); }
}
.as-head-act {
  display: flex; align-items: center; gap: 4px;
  button {
    border: 0; background: none; cursor: pointer; font-family: inherit;
    font-size: 12px; color: var(--text-3); padding: 6px 8px; border-radius: var(--radius-md);
    &:hover { background: var(--bg-sunken); color: var(--text-1); }
  }
  .as-close { font-size: 20px; line-height: 1; padding: 2px 8px 6px; }
}

.as-body {
  flex: 1; overflow-y: auto; padding: 16px 14px 8px;
  display: flex; flex-direction: column; gap: 14px;
  scrollbar-width: thin;
}
.as-row { display: flex; gap: 8px; align-items: flex-start; }
.as-row.is-user { justify-content: flex-end; }
.as-avatar {
  flex-shrink: 0; width: 26px; height: 26px; border-radius: var(--radius-sm); margin-top: 2px;
  display: grid; place-items: center; background: var(--brand-50); color: var(--brand-700);
  font-size: 11px; font-weight: 700;
}
.as-stack { max-width: 84%; display: flex; flex-direction: column; gap: 8px; }
.is-user .as-stack { align-items: flex-end; max-width: 78%; }

.as-bubble {
  padding: 10px 12px; border-radius: var(--radius-md);
  background: #fff; border: 1px solid var(--border-1);
  font-size: 13px; line-height: 1.72; color: var(--text-1);
  white-space: pre-wrap; overflow-wrap: anywhere;
}
.is-user .as-bubble {
  background: var(--brand-600); border-color: var(--brand-600); color: #fff;
  border-bottom-right-radius: 6px;
}
.is-assistant .as-bubble { border-bottom-left-radius: 6px; }

.as-typing {
  display: inline-flex; gap: 4px; padding: 12px 14px; width: fit-content;
  background: #fff; border: 1px solid var(--border-1); border-radius: var(--radius-md);
  i { width: 5px; height: 5px; border-radius: 50%; background: var(--brand-400); animation: as-blink 1s infinite; }
  i:nth-child(2) { animation-delay: .15s; }
  i:nth-child(3) { animation-delay: .3s; }
}
@keyframes as-blink { 0%, 100% { opacity: .35; } 50% { opacity: 1; } }

.as-blocks { display: flex; flex-direction: column; gap: 8px; }
.as-cites {
  display: flex; flex-wrap: wrap; align-items: center; gap: 6px;
  font-size: 12px; color: var(--text-3);
}
.as-cites-label { color: var(--text-4); }
.as-cite {
  padding: 2px 7px; border-radius: var(--radius-md);
  background: var(--brand-50); color: var(--brand-700);
}
.as-actions { display: flex; flex-wrap: wrap; gap: 6px; }
.as-actions button {
  border: 1px solid var(--brand-200); background: #fff; color: var(--brand-700);
  font-family: inherit; font-size: 12.5px; padding: 5px 11px; border-radius: var(--radius-md); cursor: pointer;
  &:hover { background: var(--brand-50); }
}
.as-feedback {
  display: flex; align-items: center; gap: 4px;
  button {
    border: 0; background: none; font-family: inherit; font-size: 12px;
    color: var(--text-4); cursor: pointer; padding: 2px 6px; border-radius: var(--radius-sm);
    &:hover { background: var(--bg-sunken); color: var(--text-2); }
    &.on { color: var(--brand-700); background: var(--brand-50); }
  }
}
.as-src { margin-left: auto; font-size: 11px; color: var(--text-4); }

.as-quick {
  flex-shrink: 0; padding: 0 14px 10px; display: flex; flex-wrap: wrap; gap: 6px;
  button {
    border: 1px solid var(--border-1); background: #fff; color: var(--text-2);
    font-family: inherit; font-size: 12px; padding: 6px 10px; border-radius: var(--radius-md); cursor: pointer;
    &:hover { border-color: var(--brand-200); color: var(--brand-700); }
  }
}

.as-foot {
  flex-shrink: 0; display: flex; align-items: flex-end; gap: 8px;
  padding: 10px 12px; background: #fff; border-top: 1px solid var(--border-1);
  textarea {
    flex: 1; min-height: 38px; max-height: 96px; resize: none;
    border: 1px solid var(--border-1); border-radius: var(--radius-md);
    padding: 9px 11px; font-family: inherit; font-size: 13px; line-height: 1.5;
    color: var(--text-1); background: var(--bg-page);
    &:focus { outline: none; border-color: var(--brand-400); background: #fff; }
  }
}
.as-send {
  flex-shrink: 0; height: 38px; padding: 0 15px; border-radius: var(--radius-md);
  border: 1px solid var(--brand-600); background: var(--brand-600); color: #fff;
  font-family: inherit; font-size: 13px; font-weight: 700; cursor: pointer;
  &:disabled { opacity: .45; cursor: not-allowed; }
  &.is-stop { background: #fff; color: var(--text-2); border-color: var(--border-1); }
}
.as-tip {
  flex-shrink: 0; margin: 0; padding: 0 12px 9px; background: #fff;
  font-size: 11px; color: var(--text-4); text-align: center;
}

.as-panel-enter-active, .as-panel-leave-active { transition: opacity .18s, transform .24s; }
.as-panel-enter-from, .as-panel-leave-to { opacity: 0; transform: translateX(28px); }

@media (max-width: 768px) {
  /* 移动端此前没有入口（launcher 被 display:none），手机上根本打不开 AI。
     现在改为图标圆钮，悬在底部标签栏上方（管理端无标签栏，位置略高无碍）。
     移动端不拖拽，忽略桌面端保存的位置。 */
  .as-launcher {
    display: inline-flex;
    top: auto !important; left: auto !important; right: 14px !important;
    /* bottom 可被页面注入 --as-dock-bottom 调整（如详情页吸底购买栏时抬升） */
    bottom: calc(var(--as-dock-bottom, 74px) + env(safe-area-inset-bottom)) !important;
    width: 46px; height: 46px; padding: 0; justify-content: center;
    .as-txt { display: none; }
    .as-launcher-ico { width: 26px; height: 26px; }
  }
  .as-panel {
    inset: 0; right: 0; bottom: 0; width: 100%; max-width: none;
    height: 100%; border: 0; border-radius: 0;
    padding-bottom: env(safe-area-inset-bottom);
  }
  .as-head { height: 56px; }
  .as-body { padding: 14px 12px 6px; }
  .as-stack { max-width: 88%; }
  .as-bubble { font-size: 14px; }
}
</style>
