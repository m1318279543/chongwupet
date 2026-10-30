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

    <!-- 悬浮入口：仅在没有顶栏入口的场景（如独立页面）才渲染；
         前后台布局已把入口收进顶栏铃铛左侧，传 :show-launcher="false" 即可 -->
    <button
      v-if="showLauncher && !state.open" type="button" class="as-launcher"
      aria-label="打开 AI 助手"
      @click="openDefault"
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
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import AssistantBlock from './AssistantBlock.vue'
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

/* ---------- 挂球位置 ----------
   早期入口是右上角可拖动浮标（位置存 localStorage）；入口收进顶栏铃铛左侧后，
   浮标与拖拽一并退休，仅保留 openDefault（见上）供 showLauncher 场景使用。 */

function onKeydown(event) {
  if (event.key === 'Escape' && state.open) close()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<style scoped lang="scss">
.assistant-dock { position: static; }

/* 悬浮入口（仅无顶栏入口的场景渲染）：图标圆钮，默认悬在右上角（顶栏下方），悬停显示文字气泡 */
.as-launcher {
  position: fixed; top: calc(var(--topbar-h) + 12px); right: 22px; z-index: var(--z-float);
  // 后台场景：右上角会压住统计卡，改默认右下角并收小，减少对管理页面的干扰
  .is-admin & {
    top: auto; bottom: 28px; width: 40px; height: 40px;
  }
  display: inline-flex; align-items: center; justify-content: center;
  width: 44px; height: 44px; padding: 0;
  // 浮标是唯一保留 pill 圆角与投影的元素：它必须始终浮在内容之上
  border: 1px solid var(--brand-200); border-radius: var(--radius-pill);
  background: var(--bg-card); color: var(--brand-700);
  font-family: inherit; font-size: var(--fs-5); font-weight: 700; cursor: pointer;
  box-shadow: 0 2px 8px rgba(22, 25, 23, .10);
  transition: box-shadow .16s;
  touch-action: manipulation;  // 去掉双击缩放等待，点击更跟手
  &:hover { box-shadow: 0 4px 14px rgba(22, 25, 23, .16); }
}
.as-launcher-ico {
  width: 26px; height: 26px; border-radius: var(--radius-md); display: grid; place-items: center;
  background: var(--grad-brand);
  svg { width: 15px; height: 15px; fill: var(--on-accent); }
}
/* 文字改悬停气泡：默认隐藏，移入浮标时从右侧弹出 */
.as-txt {
  position: absolute; right: calc(100% + 10px); top: 50%; transform: translateY(-50%);
  padding: 6px 11px; border-radius: var(--radius-sm);
  background: var(--text-1); color: var(--on-accent);
  font-size: var(--fs-3); font-weight: 600; white-space: nowrap;
  opacity: 0; pointer-events: none;
  transition: opacity .15s;
}
.as-launcher:hover .as-txt { opacity: 1; }

/* 面板：右侧全高抽屉 —— 聊天时左侧内容保持可见，边看边问 */
.as-panel {
  position: fixed; top: 0; right: 0; bottom: 0; z-index: var(--z-drawer);
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
  background: var(--bg-card); border-bottom: 1px solid var(--border-1);
}
.as-brand { display: flex; align-items: center; gap: 10px; }
.as-logo {
  width: 32px; height: 32px; border-radius: var(--radius-md); display: grid; place-items: center;
  background: var(--grad-brand);
  svg { width: 17px; height: 17px; fill: var(--on-accent); }
}
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
  flex-shrink: 0; width: 26px; height: 26px; border-radius: var(--radius-sm); margin-top: 2px;
  display: grid; place-items: center; background: var(--brand-50); color: var(--brand-700);
  font-size: var(--fs-1); font-weight: 700;
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
  background: var(--bg-card); border: 1px solid var(--border-1); border-radius: var(--radius-md);
  i { width: 5px; height: 5px; border-radius: 50%; background: var(--brand-400); animation: as-blink 1s infinite; }
  i:nth-child(2) { animation-delay: .15s; }
  i:nth-child(3) { animation-delay: .3s; }
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
  .as-bubble { font-size: var(--fs-5); }
}
</style>
