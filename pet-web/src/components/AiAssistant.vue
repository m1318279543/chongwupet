<template>
  <div class="ai-assistant">
    <transition name="ai-panel">
      <section v-if="open" class="ai-panel" role="dialog" aria-label="AI 智能助手">
        <header class="ai-head">
          <div class="ai-avatar">🐾</div>
          <div class="ai-title">
            <strong>小爪 · AI 助手</strong>
            <span class="ai-status" :class="online ? 'on' : 'off'">{{ online ? '智能在线' : '基础模式' }}</span>
          </div>
          <button class="ai-icon-btn" title="清空对话" @click="clear">
            <el-icon><Delete /></el-icon>
          </button>
          <button class="ai-icon-btn" title="收起" @click="open = false">
            <el-icon><Close /></el-icon>
          </button>
        </header>

        <div ref="bodyRef" class="ai-body">
          <div v-for="(m, i) in messages" :key="i" class="msg" :class="m.role">
            <div class="bubble" :class="{ error: m.error }">{{ m.content }}<i v-if="m.streaming" class="cursor"></i></div>
          </div>
          <div v-if="sending && !streaming" class="msg assistant">
            <div class="bubble thinking"><i></i><i></i><i></i></div>
          </div>
        </div>

        <div v-if="messages.length <= 1" class="ai-quick">
          <button v-for="q in quickAsks" :key="q" @click="ask(q)">{{ q }}</button>
        </div>

        <div class="ai-input">
          <textarea
            v-model="draft"
            rows="1"
            placeholder="说说你的需求，例如：我住小户型，上班忙，想养只猫"
            @keydown.enter.exact.prevent="send"
          ></textarea>
          <button class="ai-send" :disabled="sending || !draft.trim()" @click="send">发送</button>
        </div>
        <p class="ai-tip">AI 建议仅供参考 · 健康问题请咨询执业兽医</p>
      </section>
    </transition>

    <button class="ai-fab" :class="{ active: open }" title="AI 智能助手" @click="toggle">
      <span v-if="!open" class="fab-emoji">🐾</span>
      <el-icon v-else><Close /></el-icon>
      <span v-if="!open" class="fab-label">AI</span>
    </button>
  </div>
</template>

<script setup>
import { ref, reactive, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { Close, Delete } from '@element-plus/icons-vue'
import { aiChat } from '@/api/pet/petAi'

const open = ref(false)
const sending = ref(false)
const streaming = ref(false)
const online = ref(true)
const draft = ref('')
const bodyRef = ref()
const messages = reactive([
  {
    role: 'assistant',
    content: '你好，我是小爪 🐾 可以帮你选宠物、查订单预约、解答养护问题。想先了解什么？'
  }
])

const quickAsks = [
  '我住小户型，上班忙，想养只猫',
  '新手养狗要注意什么',
  '怎么预约看宠',
  '宠物粮怎么选'
]

let timer = null

function scrollBottom() {
  nextTick(() => {
    const el = bodyRef.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

function toggle() {
  open.value = !open.value
  if (open.value) scrollBottom()
}

function clear() {
  if (timer) clearInterval(timer)
  messages.splice(0, messages.length, {
    role: 'assistant',
    content: '对话已清空，我们重新开始吧 🐾'
  })
  streaming.value = false
  sending.value = false
}

function ask(q) {
  draft.value = q
  send()
}

/** 逐字显示，避免一次性糊一大段；超过 240 字直接整段出现（保证速度） */
function typeWrite(msg, text) {
  if (timer) clearInterval(timer)
  const full = text || ''
  if (full.length > 240) {
    msg.content = full
    msg.streaming = false
    streaming.value = false
    scrollBottom()
    return
  }
  let i = 0
  msg.content = ''
  msg.streaming = true
  streaming.value = true
  timer = setInterval(() => {
    i += 2
    msg.content = full.slice(0, i)
    scrollBottom()
    if (i >= full.length) {
      clearInterval(timer)
      timer = null
      msg.streaming = false
      streaming.value = false
    }
  }, 26)
}

async function send() {
  const text = draft.value.trim()
  if (!text || sending.value) return
  messages.push({ role: 'user', content: text })
  draft.value = ''
  sending.value = true
  scrollBottom()

  try {
    const history = messages
      .filter((m) => !m.error)
      .slice(-8)
      .map((m) => ({ role: m.role, content: m.content }))
    const res = await aiChat({ messages: history, scene: 'shop' })
    const data = (res && res.data) || {}
    const reply = data.reply || '抱歉，我暂时没能理解，换个说法再试试？'
    online.value = data.source === 'ai'
    const msg = reactive({ role: 'assistant', content: '' })
    messages.push(msg)
    sending.value = false
    typeWrite(msg, reply)
  } catch (e) {
    messages.push({
      role: 'assistant',
      content: '网络有点不稳定，AI 助手暂时没响应。你可以先到「AI 选宠」用一句话匹配，或联系在线客服。',
      error: true
    })
    sending.value = false
  }
  scrollBottom()
}

// 供其他页面调用：window.dispatchEvent(new CustomEvent('pet-ai-open', { detail: { q } }))
function onExternalOpen(e) {
  open.value = true
  const q = e && e.detail && e.detail.q
  if (q) {
    draft.value = q
    setTimeout(send, 260)
  } else {
    scrollBottom()
  }
}

onMounted(() => {
  window.addEventListener('pet-ai-open', onExternalOpen)
})
onBeforeUnmount(() => {
  window.removeEventListener('pet-ai-open', onExternalOpen)
  if (timer) clearInterval(timer)
})

defineExpose({ open: () => { open.value = true }, ask })
</script>

<style scoped>
.ai-assistant {
  position: relative;
  z-index: 1200;
}

/* 悬浮按钮 */
.ai-fab {
  position: fixed;
  right: 22px;
  bottom: 24px;
  width: 56px;
  height: 56px;
  border: 0;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff6b35, #ff9f5e);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 22px rgba(255, 107, 53, 0.38);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}
.ai-fab:hover {
  transform: translateY(-2px) scale(1.04);
  box-shadow: 0 12px 26px rgba(255, 107, 53, 0.45);
}
.ai-fab .fab-emoji {
  font-size: 24px;
  line-height: 1;
}
.ai-fab .fab-label {
  position: absolute;
  bottom: -1px;
  right: 5px;
  font-size: 9px;
  font-weight: 700;
  background: #fff;
  color: #ff6b35;
  border-radius: 6px;
  padding: 0 3px;
  line-height: 12px;
}
.ai-fab.active {
  background: #303133;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.24);
  width: 44px;
  height: 44px;
}

/* 面板 */
.ai-panel {
  position: fixed;
  right: 22px;
  bottom: 92px;
  width: 380px;
  max-width: calc(100vw - 32px);
  height: 560px;
  max-height: calc(100vh - 130px);
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.18);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #f2f2f2;
}

.ai-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: linear-gradient(135deg, #fff7f1, #fff);
  border-bottom: 1px solid #f5f5f5;
  flex-shrink: 0;
}
.ai-avatar {
  width: 34px;
  height: 34px;
  border-radius: 12px;
  background: linear-gradient(135deg, #ff6b35, #ffb27a);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}
.ai-title {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}
.ai-title strong {
  font-size: 14px;
  color: #303133;
}
.ai-status {
  font-size: 11px;
  color: #67c23a;
  display: flex;
  align-items: center;
  gap: 4px;
}
.ai-status::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}
.ai-status.off {
  color: #e6a23c;
}
.ai-icon-btn {
  width: 28px;
  height: 28px;
  border: 0;
  background: transparent;
  color: #909399;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ai-icon-btn:hover {
  background: #f5f5f5;
  color: #606266;
}

/* 消息区 */
.ai-body {
  flex: 1;
  overflow-y: auto;
  padding: 14px;
  background: #fafafa;
  display: flex;
  flex-direction: column;
  gap: 10px;
  -webkit-overflow-scrolling: touch;
}
.msg {
  display: flex;
}
.msg.user {
  justify-content: flex-end;
}
.bubble {
  max-width: 84%;
  padding: 9px 12px;
  border-radius: 14px;
  font-size: 13.5px;
  line-height: 1.65;
  white-space: pre-wrap;
  word-break: break-word;
  background: #fff;
  color: #303133;
  border: 1px solid #f0f0f0;
}
.msg.user .bubble {
  background: linear-gradient(135deg, #ff6b35, #ff9f5e);
  color: #fff;
  border-color: transparent;
  border-bottom-right-radius: 4px;
}
.msg.assistant .bubble {
  border-bottom-left-radius: 4px;
}
.bubble.error {
  background: #fff8f0;
  border-color: #ffe0c2;
  color: #b25a1e;
}
.cursor {
  display: inline-block;
  width: 2px;
  height: 13px;
  background: #ff8c42;
  margin-left: 1px;
  vertical-align: -2px;
  animation: blink 0.9s steps(1) infinite;
}
@keyframes blink {
  50% {
    opacity: 0;
  }
}
.bubble.thinking {
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 12px 14px;
}
.bubble.thinking i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ffb27a;
  animation: bounce 1.1s infinite;
}
.bubble.thinking i:nth-child(2) {
  animation-delay: 0.15s;
}
.bubble.thinking i:nth-child(3) {
  animation-delay: 0.3s;
}
@keyframes bounce {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.55;
  }
  30% {
    transform: translateY(-4px);
    opacity: 1;
  }
}

/* 快捷问题 */
.ai-quick {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 0 14px 8px;
  background: #fafafa;
  flex-shrink: 0;
}
.ai-quick button {
  border: 1px solid #ffe0cc;
  background: #fff;
  color: #d2691e;
  font-size: 12px;
  padding: 5px 10px;
  border-radius: 14px;
  cursor: pointer;
  max-width: 100%;
  text-align: left;
}
.ai-quick button:hover {
  background: #fff7f1;
  border-color: #ffb27a;
}

/* 输入区 */
.ai-input {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 10px 12px;
  background: #fff;
  border-top: 1px solid #f2f2f2;
  flex-shrink: 0;
}
.ai-input textarea {
  flex: 1;
  resize: none;
  border: 1px solid #ebeef5;
  border-radius: 12px;
  padding: 8px 10px;
  font-size: 13.5px;
  line-height: 1.5;
  max-height: 84px;
  font-family: inherit;
  color: #303133;
  outline: none;
  background: #fafafa;
}
.ai-input textarea:focus {
  border-color: #ffb27a;
  background: #fff;
}
.ai-send {
  border: 0;
  background: linear-gradient(135deg, #ff6b35, #ff9f5e);
  color: #fff;
  font-size: 13px;
  padding: 0 16px;
  height: 36px;
  border-radius: 18px;
  cursor: pointer;
  font-weight: 600;
  flex-shrink: 0;
}
.ai-send:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.ai-tip {
  margin: 0;
  padding: 0 12px 8px;
  font-size: 10.5px;
  color: #b0b3b8;
  text-align: center;
  background: #fff;
}

/* 展开动画 */
.ai-panel-enter-active,
.ai-panel-leave-active {
  transition: opacity 0.2s ease, transform 0.24s cubic-bezier(0.22, 1, 0.36, 1);
  transform-origin: bottom right;
}
.ai-panel-enter-from,
.ai-panel-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.96);
}

/* 手机端：占满底部，方便输入 */
@media (max-width: 640px) {
  .ai-fab {
    right: 14px;
    bottom: 18px;
    width: 52px;
    height: 52px;
  }
  .ai-panel {
    right: 0;
    left: 0;
    bottom: 0;
    width: 100%;
    max-width: 100%;
    height: 78vh;
    max-height: 78vh;
    border-radius: 18px 18px 0 0;
    border-left: 0;
    border-right: 0;
    border-bottom: 0;
  }
  .ai-fab.active {
    bottom: auto;
    top: 14px;
    right: 14px;
    z-index: 1250;
  }
}
</style>
