<template>
  <div class="notify-bell" v-if="logged">
    <button class="bell-btn" :class="{ ringing }" :title="total > 0 ? `有 ${total} 条未读消息` : '消息通知'" @click="toggle">
      <el-icon><Bell /></el-icon>
      <span v-if="total > 0" class="badge">{{ total > 99 ? '99+' : total }}</span>
    </button>

    <transition name="np">
      <div v-if="open" class="np-panel">
        <div class="np-head">
          <strong>消息通知</strong>
          <div class="np-actions">
            <el-button v-if="total > 0" link type="primary" size="small" :loading="reading" @click="markAll">全部已读</el-button>
            <el-button link size="small" @click="close">关闭</el-button>
          </div>
        </div>
        <div class="np-list" v-loading="loading">
          <div v-for="n in list" :key="n.notifyId" class="np-item" :class="{ unread: n.isRead === '0' }" @click="openItem(n)">
            <span class="np-icon"><el-icon><component :is="typeIcon(n.type)" /></el-icon></span>
            <div class="np-body">
              <div class="np-title">
                <span>{{ n.title }}</span>
                <em v-if="n.isRead === '0'" class="dot"></em>
              </div>
              <div class="np-content">{{ n.content }}</div>
              <div class="np-time">{{ n.createTime }}</div>
            </div>
          </div>
          <div v-if="!loading && list.length === 0" class="np-empty">
            <el-icon><Bell /></el-icon>
            <p>暂时没有消息</p>
          </div>
        </div>
        <div class="np-foot" v-if="list.length">
          <el-button link type="primary" size="small" @click="goMore">查看全部消息</el-button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Bell } from '@element-plus/icons-vue'
import { listNotification, unreadNotification, readNotification, readAllNotification } from '@/api/pet/petNotification'
import { useUserStore } from '@/store/modules/user'

const props = defineProps({
  // 点击「查看全部消息」跳转的页面（后台没有消息中心页时传空则不显示）
  morePath: { type: String, default: '' }
})

const router = useRouter()
const userStore = useUserStore()
const logged = computed(() => !!userStore.token)
const open = ref(false)
const loading = ref(false)
const reading = ref(false)
const list = ref([])
const total = ref(0)
const ringing = ref(false)
let pollTimer = null

const ICONS = { order: 'Box', appointment: 'Calendar', consult: 'ChatDotRound', system: 'Bell' }
function typeIcon(t) {
  return ICONS[t] || 'Bell'
}

async function loadUnread() {
  if (!logged.value) return
  try {
    const res = await unreadNotification()
    const d = res.data || {}
    const next = d.total || 0
    // 未读数增加时摇一下铃铛，提示有新消息
    if (next > total.value && total.value >= 0) {
      ringing.value = true
      setTimeout(() => { ringing.value = false }, 900)
    }
    total.value = next
  } catch (e) {
    // 未登录/网络异常静默
  }
}

async function loadList() {
  loading.value = true
  try {
    const res = await listNotification({ pageNum: 1, pageSize: 10 })
    list.value = res.rows || []
    loading.value = false
  } catch (e) {
    loading.value = false
  }
}

function toggle() {
  open.value = !open.value
  if (open.value) {
    loadList()
    loadUnread()
  }
}
function close() {
  open.value = false
}

async function markAll() {
  reading.value = true
  try {
    await readAllNotification()
    total.value = 0
    list.value = list.value.map((n) => ({ ...n, isRead: '1' }))
    ElMessage.success('已全部标记为已读')
  } catch (e) {
    ElMessage.error('操作失败')
  } finally {
    reading.value = false
  }
}

async function openItem(n) {
  if (n.isRead === '0') {
    try {
      await readNotification(n.notifyId)
      n.isRead = '1'
      total.value = Math.max(0, total.value - 1)
    } catch (e) {}
  }
  // 订单类跳到购物车的下单记录，预约类跳到我的预约
  if (props.morePath === '') return
  if (n.type === 'order') {
    router.push('/shop/cart')
    close()
  } else if (n.type === 'appointment') {
    router.push('/shop/appointment')
    close()
  }
}

function goMore() {
  if (!props.morePath) return
  router.push(props.morePath)
  close()
}

// 简易点击外部关闭（不额外引入指令库）
function onDocClick(e) {
  const el = e.target
  if (!el || !el.closest) return
  if (!el.closest('.notify-bell')) close()
}

// 业务事件（支付成功/取消订单等）触发即时刷新，不必等 60 秒轮询
function onRefreshEvent() {
  loadUnread()
  if (open.value) loadList()
}

onMounted(() => {
  loadUnread()
  pollTimer = setInterval(loadUnread, 60000)
  document.addEventListener('click', onDocClick)
  window.addEventListener('pet-notify-refresh', onRefreshEvent)
})
onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer)
  document.removeEventListener('click', onDocClick)
  window.removeEventListener('pet-notify-refresh', onRefreshEvent)
})

defineExpose({ refresh: loadUnread })
</script>

<style scoped lang="scss">
.notify-bell {
  position: relative;
  display: inline-flex;
  align-items: center;
}
.bell-btn {
  position: relative;
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-2);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  transition: background 0.18s;
  &:hover { background: var(--bg-sunken); }
}
.bell-btn.ringing { animation: bell-shake 0.9s ease; }
@keyframes bell-shake {
  0%, 100% { transform: rotate(0); }
  15% { transform: rotate(14deg); }
  30% { transform: rotate(-12deg); }
  45% { transform: rotate(8deg); }
  60% { transform: rotate(-6deg); }
}
.badge {
  position: absolute;
  top: 1px;
  right: 0;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 8px;
  background: var(--danger-500);
  color: #fff;
  font-size: 11px;
  line-height: 16px;
  text-align: center;
  box-shadow: 0 0 0 2px #fff;
}

.np-panel {
  position: absolute;
  top: 44px;
  right: 0;
  width: 340px;
  max-width: calc(100vw - 24px);
  background: #fff;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-float);
  border: 1px solid var(--bg-sunken);
  z-index: 3000;
  overflow: hidden;
}
.np-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid var(--bg-sunken);
  strong { font-size: 14px; color: var(--text-1); }
  .np-actions { display: flex; align-items: center; gap: 4px; }
}
.np-list {
  max-height: 360px;
  overflow-y: auto;
}
.np-item {
  display: flex;
  gap: 10px;
  padding: 12px 14px;
  cursor: pointer;
  border-bottom: 1px solid var(--bg-page);
  transition: background 0.15s;
  &:hover { background: var(--brand-50); }
  &.unread { background: var(--brand-50); }
  .np-icon { font-size: 18px; line-height: 1.2; flex-shrink: 0; }
  .np-body { flex: 1; min-width: 0; }
  .np-title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-1);
    .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--danger-500); }
  }
  .np-content {
    margin-top: 3px;
    font-size: 12.5px;
    color: var(--text-2);
    line-height: 1.55;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .np-time { margin-top: 4px; font-size: 12px; color: var(--text-3); }
}
.np-empty {
  text-align: center;
  padding: 28px 0;
  color: var(--text-4);
  span { font-size: 30px; }
  p { margin: 6px 0 0; font-size: 13px; }
}
.np-foot {
  padding: 8px 14px;
  text-align: center;
  border-top: 1px solid var(--bg-sunken);
}
.np-enter-active,
.np-leave-active { transition: opacity 0.16s ease, transform 0.16s ease; transform-origin: top right; }
.np-enter-from,
.np-leave-to { opacity: 0; transform: translateY(-6px) scale(0.97); }

@media (max-width: 768px) {
  .np-panel { position: fixed; top: 62px; right: 10px; left: auto; width: calc(100vw - 20px); }
}
</style>
