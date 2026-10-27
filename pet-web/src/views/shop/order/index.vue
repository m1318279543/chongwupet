<template>
  <div class="ui-page">
    <!-- 页面头 -->
    <header class="ui-head">
      <div class="ui-head__main">
        <p class="ui-eyebrow">Orders</p>
        <h1 class="ui-title">我的订单</h1>
        <p class="ui-sub">一单一次记录，支付、退款与接宠进度都在这里。</p>
      </div>
      <div class="ui-head__aside">
        <span class="ui-count" v-if="isLogged"><b>{{ groups.length }}</b>笔订单</span>
      </div>
    </header>

    <!-- 未登录 -->
    <div class="ui-empty" v-if="!isLogged">
      <p class="ui-empty__title">登录后查看下单记录</p>
      <p class="ui-empty__desc">订单、支付与退款进度都绑定在账号上。</p>
      <div class="ui-empty__act">
        <button type="button" class="ui-btn ui-btn--solid" @click="openAuth('login')">去登录</button>
      </div>
    </div>

    <template v-else>
      <!-- 状态筛选：文本标签页 + 计数，选中态用 2px 下划线（比按钮组安静） -->
      <nav class="tabs" v-if="groups.length" aria-label="订单状态筛选">
        <button
          v-for="t in tabs"
          :key="t.key"
          type="button"
          class="tab"
          :class="{ on: filter === t.key }"
          @click="filter = t.key"
        >
          {{ t.label }}<span class="tab__n">{{ t.count }}</span>
        </button>
      </nav>

      <!-- 空态 -->
      <div class="ui-empty" v-if="shownGroups.length === 0">
        <p class="ui-empty__title">还没有下单记录</p>
        <p class="ui-empty__desc">挑点好粮给毛孩子吧，结算后会在这里生成订单。</p>
        <div class="ui-empty__act">
          <button type="button" class="ui-btn ui-btn--solid" @click="goShop">去挑选宠物粮</button>
        </div>
      </div>

      <!-- 订单列表：定高区（每页 3 单），超出靠底部翻页 -->
      <div class="ui-box order-box" v-else v-loading="loading">
        <div class="ui-box__body">
          <article class="order" v-for="g in pagedGroups" :key="g.orderNo" :class="{ 'is-muted': g.canceled }">
          <!-- 订单头：单号 + 状态在左，时间与操作在右 -->
          <header class="order__head">
            <div class="order__id">
              <span class="order__no">{{ g.orderNo }}</span>
              <span class="ui-chip" :class="chipClass(g)">{{ statusText(g) }}</span>
            </div>
            <div class="order__act">
              <span class="order__time">{{ g.createTime }}</span>
              <button v-if="g.unpaid" type="button" class="ui-btn ui-btn--solid ui-btn--sm" @click="openCashier(g)">去支付</button>
              <button type="button" class="ui-linkbtn" @click="askAssistant(g)">遇到问题</button>
              <button
                v-if="canRefund(g)"
                type="button"
                class="ui-linkbtn"
                :disabled="refundingNo === g.orderNo"
                @click="askRefund(g)"
              >{{ refundingNo === g.orderNo ? '提交中…' : '申请退款' }}</button>
              <button
                v-if="g.unpaid"
                type="button"
                class="ui-linkbtn ui-linkbtn--danger"
                :disabled="cancelingId === g.orderNo"
                @click="cancelOrder(g)"
              >{{ cancelingId === g.orderNo ? '取消中…' : '取消订单' }}</button>
            </div>
          </header>

          <!-- 商品明细：缩进在订单之下，逐行 1px 分割 -->
          <ul class="items">
            <li class="item" v-for="o in g.items" :key="o.itemId">
              <img v-if="o.goodsImage" :src="o.goodsImage" class="item__thumb" alt="" loading="lazy" @error="onImgErr" />
              <div class="item__main">
                <div class="item__name">
                  {{ o.goodsName }}
                  <span v-if="o.itemType === '2'" class="ui-chip ui-chip--brand">宠物</span>
                </div>
                <div class="item__spec">
                  {{ o.goodsSpec }}<span class="item__unit"> · ¥{{ money(o.price) }} ×{{ o.qty }}</span>
                </div>
              </div>
              <span class="item__sum ui-price ui-price--sm">¥{{ money(o.amount != null ? o.amount : o.price * o.qty) }}</span>
            </li>
          </ul>

          <footer class="order__foot" v-if="g.items.length > 1">
            <span class="order__count">共 {{ g.items.length }} 件</span>
            <span class="order__total">合计 <b class="ui-price">¥{{ money(g.total) }}</b></span>
          </footer>
          </article>
        </div>

        <!-- 翻页条：位置固定，翻页时页脚不动 -->
        <div class="ui-box__foot">
          <span class="ui-box__count">第 {{ rangeStart }}–{{ rangeEnd }} 单 / 共 {{ shownGroups.length }} 单</span>
          <Pagination
            v-if="shownGroups.length > PAGE_SIZE"
            :total="shownGroups.length"
            v-model:page="page"
            :limit="PAGE_SIZE"
            :page-sizes="[PAGE_SIZE]"
            :background="false"
            layout="prev, pager, next"
            :auto-scroll="false"
          />
        </div>
      </div>
    </template>

    <!-- 模拟收银台（弹窗内部属于允许成「面」的例外） -->
    <el-dialog v-model="cashierOpen" width="420px" align-center :show-close="!paySuccess" class="cashier-dialog"
               :close-on-click-modal="false">
      <template #header>
        <div class="cashier-head">
          <span>收银台</span>
          <span class="cashier-no" v-if="current">{{ current.orderNo }}</span>
        </div>
      </template>

      <div class="cashier-body" v-if="!paySuccess">
        <div class="cashier-amount">
          <span class="label">支付金额</span>
          <span class="num">¥{{ current ? money(current.total) : '0' }}</span>
        </div>
        <div class="pay-methods">
          <div class="pay-item" v-for="m in methods" :key="m.key" :class="{ active: payMethod === m.key }"
               @click="payMethod = m.key">
            <span class="pm-icon" :style="{ background: m.bg }"><el-icon><component :is="m.icon" /></el-icon></span>
            <div class="pm-info">
              <b>{{ m.name }}</b>
              <em>{{ m.desc }}</em>
            </div>
            <span class="pm-check"><el-icon v-if="payMethod === m.key"><Check /></el-icon></span>
          </div>
        </div>
        <div class="cashier-tip">
          <el-icon><InfoFilled /></el-icon>
          演示环境模拟支付，点击「立即支付」即完成付款，不会产生真实扣款
        </div>
        <div class="cashier-actions">
          <button type="button" class="ui-btn ui-btn--line" @click="cashierOpen = false" :disabled="paying">暂不支付</button>
          <button type="button" class="ui-btn ui-btn--solid" :disabled="paying" @click="doPay">
            立即支付<span v-if="countdown > 0">（{{ countdown }}s）</span>
          </button>
        </div>
      </div>

      <div class="cashier-success" v-else>
        <div class="s-icon"><el-icon><CircleCheckFilled /></el-icon></div>
        <h3>支付成功</h3>
        <p class="s-amount">¥{{ current ? money(current.total) : '' }}</p>
        <p class="s-tip">{{ current && current.isPet ? '请带上身份证到门店接它回家，可在「我的订单」查看进度' : '我们会尽快为你安排发货，可在「我的订单」查看进度' }}</p>
        <button type="button" class="ui-btn ui-btn--solid" @click="closeCashier">完成</button>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, inject, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { InfoFilled } from '@element-plus/icons-vue'
import { useUserStore } from '@/store/modules/user'
import { listMyOrders, payOrder, cancelOrder as cancelOrderApi } from '@/api/pet/petOrder'
import { listMyRefunds, applyRefund } from '@/api/pet/petRefund'
import Pagination from '@/components/Pagination/index.vue'
import { money } from '@/utils/money'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const openAuth = inject('openAuth', () => {})
const isLogged = computed(() => !!userStore.token)

const rows = ref([])
const loading = ref(false)
const filter = ref('all')
const cancelingId = ref(null)
const refundingNo = ref(null)
const refundMap = ref({})
const payingNo = ref(null)

// 收银台状态
const cashierOpen = ref(false)
const paySuccess = ref(false)
const paying = ref(false)
const payMethod = ref('alipay')
const current = ref(null)
const countdown = ref(0)
let countdownTimer = null

const methods = [
  { key: 'alipay', icon: 'Money', name: '支付宝', desc: '推荐使用，秒到账', bg: 'linear-gradient(135deg,#1677ff,#69b1ff)' },
  { key: 'wechat', icon: 'ChatDotRound', name: '微信支付', desc: '微信快捷支付', bg: 'linear-gradient(135deg,#07c160,#5bd98a)' },
  { key: 'balance', icon: 'Wallet', name: '平台余额', desc: '演示专用通道', bg: 'var(--grad-brand)' }
]

// 订单头 + 明细直接来自 /pet/order/mine，不再前端拼单号
const groups = computed(() => rows.value.map((o) => ({
  orderNo: o.orderNo,
  items: o.items || [],
  canceled: o.status === '3',
  unpaid: o.payStatus === '0' && o.status === '0',
  paid: o.payStatus === '1',
  shipped: o.status === '1',
  isPet: o.orderType === '2' || (o.items || []).some((it) => it.itemType === '2'),
  payMethod: o.payMethod,
  createTime: String(o.createTime || '').replace('T', ' ').slice(5, 16),
  total: Number(o.payAmount || 0),
  refund: refundMap.value[o.orderNo] || null
})))

const shownGroups = computed(() => {
  if (filter.value === 'all') return groups.value
  if (filter.value === 'unpaid') return groups.value.filter((g) => g.unpaid)
  if (filter.value === 'paid') return groups.value.filter((g) => g.paid)
  return groups.value.filter((g) => g.canceled)
})

// 状态标签页：计数直接从 groups 派生，避免再请求一次
const tabs = computed(() => [
  { key: 'all', label: '全部', count: groups.value.length },
  { key: 'unpaid', label: '待支付', count: groups.value.filter((g) => g.unpaid).length },
  { key: 'paid', label: '已支付', count: groups.value.filter((g) => g.paid).length },
  { key: 'canceled', label: '已取消', count: groups.value.filter((g) => g.canceled).length }
])

// 状态文案 / 样式：优先级与原来一致，用 1px 描边标签代替实心 el-tag
function statusText(g) {
  if (g.refund && g.refund.status === '1') return '已退款'
  if (g.refund && g.refund.status === '0') return '退款审核中'
  if (g.canceled) return '已取消'
  if (g.unpaid) return '待支付'
  if (g.shipped) return g.isPet ? '已支付 · 待接宠' : '已支付 · 待发货'
  return '已完成'
}
function chipClass(g) {
  if (g.refund && g.refund.status === '0') return 'ui-chip--warn'
  if (g.canceled || (g.refund && g.refund.status === '1')) return ''
  if (g.unpaid) return 'ui-chip--warn'
  if (g.shipped) return 'ui-chip--brand'
  return 'ui-chip--ok'
}

// 定高列表分页：每页 3 单（单区块 161–173px，3 个铺满约 540px 的列表区）
const PAGE_SIZE = 3
const page = ref(1)
const pagedGroups = computed(() => shownGroups.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE))
const rangeStart = computed(() => (shownGroups.value.length ? (page.value - 1) * PAGE_SIZE + 1 : 0))
const rangeEnd = computed(() => Math.min(page.value * PAGE_SIZE, shownGroups.value.length))
watch(filter, () => { page.value = 1 })
// 取消/退款后总数变少时，避免停在空页
watch(() => shownGroups.value.length, (len) => {
  if ((page.value - 1) * PAGE_SIZE >= len) page.value = 1
})

/** 带着订单号唤起助手，直接问当前状态 */
function askAssistant(g) {
  window.dispatchEvent(new CustomEvent('pet-assistant-open', {
    detail: {
      scene: 'order',
      bizId: g.orderNo,
      message: `订单 ${g.orderNo} 现在是什么状态？`
    }
  }))
}

function openCashier(g) {
  current.value = g
  paySuccess.value = false
  payMethod.value = 'alipay'
  cashierOpen.value = true
  countdown.value = 15 * 60
  if (countdownTimer) clearInterval(countdownTimer)
  countdownTimer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(countdownTimer)
      cashierOpen.value = false
      ElMessage.info('支付超时，订单已回到待支付状态')
    }
  }, 1000)
}

async function doPay() {
  if (!current.value || paying.value) return
  paying.value = true
  try {
    await payOrder(current.value.orderNo, payMethod.value)
    paySuccess.value = true
    if (countdownTimer) clearInterval(countdownTimer)
    getList()
    // 支付成功会生成站内通知，通知铃铛立即刷新
    window.dispatchEvent(new CustomEvent('pet-notify-refresh'))
  } catch (e) {
    ElMessage.error(e?.msg || e?.message || '支付失败，请稍后再试')
  } finally {
    paying.value = false
  }
}

function closeCashier() {
  cashierOpen.value = false
  paySuccess.value = false
}

function cancelOrder(g) {
  const first = g.items?.[0]
  ElMessageBox.prompt(
    `确认取消订单 ${g.orderNo}${g.items.length > 1 ? `（${g.items.length} 件商品）` : `（${first?.goodsName || '商品'}）`}吗？可填写取消原因：`,
    '取消订单',
    {
      confirmButtonText: '确认取消',
      cancelButtonText: '再想想',
      inputPlaceholder: '如：拍错了 / 不想要了（选填）',
      inputValue: '',
      type: 'warning'
    }
  ).then(async ({ value }) => {
    cancelingId.value = g.orderNo
    try {
      await cancelOrderApi(g.orderNo, value || '')
      ElMessage.success('订单已取消')
      getList()
      window.dispatchEvent(new CustomEvent('pet-notify-refresh'))
    } catch (e) {
      ElMessage.error(e?.msg || e?.message || '取消失败')
    } finally {
      cancelingId.value = null
    }
  }).catch(() => {})
}

/** 已支付、未取消，且没有进行中/已完成的退款，才允许申请 */
function canRefund(g) {
  if (!g.paid || g.canceled) return false
  if (g.refund && ['0', '1'].includes(g.refund.status)) return false
  return true
}

function askRefund(g) {
  ElMessageBox.prompt(
    `订单 ${g.orderNo}，退款金额 ¥${money(g.total)}。请填写退款原因：`,
    '申请退款',
    {
      confirmButtonText: '提交申请',
      cancelButtonText: '再想想',
      inputPlaceholder: '如：接宠时间冲突 / 临时有事（选填）',
      inputValue: '',
      type: 'warning'
    }
  ).then(async ({ value }) => {
    refundingNo.value = g.orderNo
    try {
      await applyRefund({ orderNo: g.orderNo, reason: value || '用户申请退款' })
      ElMessage.success('退款申请已提交，等待门店审核')
      getList()
    } catch (e) {
      ElMessage.error(e?.msg || e?.message || '申请失败')
    } finally {
      refundingNo.value = null
    }
  }).catch(() => {})
}

function goShop() {
  router.push('/shop/food')
}
function onImgErr(e) {
  e.target.style.display = 'none'
}
function getList() {
  if (!isLogged.value) return
  loading.value = true
  Promise.all([listMyOrders(), listMyRefunds()])
    .then(([res, rf]) => {
      rows.value = res.data || []
      const map = {}
      // 同一订单可能有多条（被拒后可再申请），接口按 id 倒序，取第一条即最新
      for (const r of (rf.data || [])) {
        if (!map[r.orderNo]) map[r.orderNo] = r
      }
      refundMap.value = map
      loading.value = false
      // 从结算页跳转过来 ?pay=订单号：自动打开收银台
      const wantPay = route.query.pay
      if (wantPay) {
        const g = groups.value.find((x) => x.orderNo === wantPay && x.unpaid)
        if (g) openCashier(g)
        router.replace({ query: {} })
      }
    })
    .catch(() => {
      loading.value = false
    })
}
onMounted(getList)
onBeforeUnmount(() => {
  if (countdownTimer) clearInterval(countdownTimer)
})
</script>

<style scoped lang="scss">
// 页头 / 空态 / 标签来自 .ui-* 基元；本页新增「状态标签页」「订单区块」「商品行」三段结构。

/* ---------- 状态筛选：文本标签页 ---------- */
.tabs {
  display: flex;
  gap: 26px;
  margin-top: 18px;
  border-bottom: 1px solid var(--border-1);
  overflow-x: auto;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
}
.tab {
  position: relative;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 0 12px;
  border: 0;
  background: none;
  font: inherit;
  font-size: 14px;
  color: var(--text-3);
  cursor: pointer;
  transition: color .16s ease;
  &:hover { color: var(--text-1); }
  &.on {
    color: var(--text-1);
    font-weight: 700;
    // 选中态：底部 2px 线，压在标签栏的 1px 线上
    &::after {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      bottom: -1px;
      height: 2px;
      background: var(--text-1);
    }
  }
}
.tab__n {
  font-size: 12px;
  color: var(--text-4);
  font-variant-numeric: tabular-nums;
}
.tab.on .tab__n { color: var(--brand-600); }

/* ---------- 订单区块 ---------- */
.orders { margin-top: 4px; }
.order {
  padding: 22px 0;
  border-bottom: 1px solid var(--border-2);
}
// 已取消：整体降权，但不改变布局
.order.is-muted {
  .order__no { color: var(--text-3); }
  .item__thumb { filter: grayscale(1); opacity: .8; }
}

.order__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px 20px;
  flex-wrap: wrap;
}
.order__id {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.order__no {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: .01em;
  color: var(--text-1);
  font-variant-numeric: tabular-nums;
}
.order__act {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.order__time {
  font-size: 12.5px;
  color: var(--text-3);
  font-variant-numeric: tabular-nums;
}

/* ---------- 商品明细：挂在订单下的子行 ---------- */
.items {
  list-style: none;
  margin: 14px 0 0;
  padding: 0;
}
.item {
  display: grid;
  // 缩略图 | 名称与规格（占满剩余） | 小计
  // 单价与数量属于次要信息，并进规格行，不再各占一列 —— 避免 1100px 里出现三段空洞
  grid-template-columns: 56px minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  padding: 12px 0;
  & + .item { border-top: 1px solid var(--border-2); }
}
.item__thumb {
  width: 56px;
  height: 56px;
  object-fit: cover;
  border: var(--rule);
  border-radius: var(--r-2);
  background: var(--bg-sunken);
}
.item__main { min-width: 0; }
.item__name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-1);
  line-height: 1.45;
}
.item__spec {
  margin-top: 4px;
  font-size: 12.5px;
  color: var(--text-3);
}
// 单价 × 数量并进规格行，用「·」与规格分隔
.item__unit { color: var(--text-3); font-variant-numeric: tabular-nums; }
.item__sum { text-align: right; }

/* ---------- 订单合计 ---------- */
.order__foot {
  display: flex;
  align-items: baseline;
  justify-content: flex-end;
  gap: 18px;
  margin-top: 8px;
  padding-top: 12px;
  border-top: 1px solid var(--border-2);
  font-size: 13px;
  color: var(--text-3);
}
.order__total {
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  b { font-size: 20px; }
}

/* ---------- 定高列表 ---------- */
// 3 个订单区块 × 约 173px ≈ 540px；区块之间本身有 1px 分割线

/* ---------- 收银台（弹窗内部） ---------- */
.cashier-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  .cashier-no { font-size: 12px; color: var(--text-3); }
}
.cashier-body {
  .cashier-amount {
    text-align: center;
    padding: 6px 0 18px;
    .label { display: block; font-size: 13px; color: var(--text-3); }
    .num {
      font-family: var(--font-num);
      font-size: 28px;
      font-weight: 700;
      color: var(--price);
      font-variant-numeric: tabular-nums;
    }
  }
  .pay-methods { display: flex; flex-direction: column; gap: 10px; }
  // 支付方式列表：1px 描边 + 8px 圆角，选中态只换边框色与极浅底
  .pay-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    border: 1px solid var(--border-1);
    border-radius: var(--r-3);
    cursor: pointer;
    transition: border-color .15s ease, background-color .15s ease;
    &:hover { border-color: var(--brand-300); }
    &.active { border-color: var(--brand-500); background: var(--brand-50); }
    .pm-icon {
      width: 34px;
      height: 34px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--r-2);
      font-size: 16px;
      color: #fff;
    }
    .pm-info {
      flex: 1;
      b { display: block; font-size: 14px; color: var(--text-1); }
      em { font-size: 12px; color: var(--text-3); font-style: normal; }
    }
    .pm-check { width: 18px; text-align: center; color: var(--brand-500); font-weight: 700; }
  }
  .cashier-tip {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 14px;
    padding-left: 10px;
    border-left: 2px solid var(--border-1);
    font-size: 12.5px;
    line-height: 1.6;
    color: var(--text-3);
  }
  .cashier-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 22px;
  }
}
.cashier-success {
  text-align: center;
  padding: 6px 0 4px;
  .s-icon { font-size: 46px; color: var(--success-500); }
  h3 { margin: 10px 0 4px; font-size: 16px; color: var(--text-1); }
  .s-amount {
    margin: 0;
    font-family: var(--font-num);
    font-size: 24px;
    font-weight: 700;
    color: var(--price);
    font-variant-numeric: tabular-nums;
  }
  .s-tip { margin: 8px 0 20px; font-size: 13px; line-height: 1.7; color: var(--text-3); }
}

/* ---------- 手机端 ---------- */
@media (max-width: 768px) {
  .tabs { gap: 18px; }
  .order { padding: 18px 0; }
  .order__act {
    width: 100%;
    gap: 14px;
    .order__time { margin-right: auto; }
  }

  // 商品行折成两列：缩略图 + 文本，小计贴右
  .item {
    grid-template-columns: 48px minmax(0, 1fr) auto;
    gap: 12px;
    padding: 10px 0;
  }
  .item__thumb { width: 48px; height: 48px; }
  .item__sum { font-size: 16px; }

  .order__foot { gap: 12px; }
}
</style>
