<template>
  <div class="ui-page ui-page--md">
    <!-- 页面头 -->
    <header class="ui-head">
      <div class="ui-head__main">
        <p class="ui-eyebrow">Orders</p>
        <h1 class="ui-title">我的订单</h1>
        <p class="ui-sub">一单一次记录，支付、退款与接宠进度都在这里。</p>
      </div>
      <div class="ui-head__aside">
        <span class="ui-count" v-if="isLogged"><b>{{ scope === 'goods' ? groups.length : shownSvc.length }}</b>{{ scope === 'goods' ? '笔订单' : '笔服务预约' }}</span>
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

    <!-- 单据类型：商品订单 / 服务预约（两类分开存储，但都算"我的订单"） -->
    <div class="scope-bar" v-if="isLogged">
      <button type="button" class="scope-btn" :class="{ on: scope === 'goods' }" @click="switchScope('goods')">
        商品订单<span class="scope-n">{{ groups.length }}</span>
      </button>
      <button type="button" class="scope-btn" :class="{ on: scope === 'service' }" @click="switchScope('service')">
        服务预约<span class="scope-n">{{ serviceRows.length }}</span>
      </button>
    </div>

    <template v-if="isLogged && scope === 'goods'">
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
          <button type="button" class="ui-btn ui-btn--line" @click="goShop">去挑选宠物粮</button>
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
              <span v-if="g.unpaid" class="order__expire" :class="{ 'is-expired': expireLeft(g) <= 0 }">{{ expireText(g) }}</span>
              <button v-if="g.unpaid" type="button" class="ui-btn ui-btn--solid ui-btn--sm" :disabled="expireLeft(g) <= 0" @click="openCashier(g)">去支付</button>
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
                  {{ o.goodsSpec }}<span class="item__unit"> · ¥{{ o.price }} ×{{ o.qty }}</span>
                </div>
              </div>
              <span class="item__sum ui-price">¥{{ Number(o.amount != null ? o.amount : o.price * o.qty).toFixed(2) }}</span>
            </li>
          </ul>

          <footer class="order__foot" v-if="g.items.length > 1">
            <span class="order__count">共 {{ g.items.length }} 件</span>
            <span class="order__total">合计 <b class="ui-price">¥{{ g.total.toFixed(2) }}</b></span>
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

    <!-- 服务预约单：洗护/美容/上门接送等，独立下单独立结算，列表与商品订单并列 -->
    <template v-else-if="scope === 'service'">
      <nav class="tabs" v-if="serviceRows.length" aria-label="服务预约状态筛选">
        <button
          v-for="t in svcTabs"
          :key="t.key"
          type="button"
          class="tab"
          :class="{ on: svcFilter === t.key }"
          @click="svcFilter = t.key"
        >
          {{ t.label }}<span class="tab__n">{{ t.count }}</span>
        </button>
      </nav>

      <div class="ui-empty" v-if="shownSvc.length === 0">
        <p class="ui-empty__title">还没有服务预约</p>
        <p class="ui-empty__desc">洗护、美容、上门接送都能直接下单，到店时带上宠物就行。</p>
        <div class="ui-empty__act">
          <button type="button" class="ui-btn ui-btn--line" @click="goBooking">去预约服务</button>
        </div>
      </div>

      <div class="ui-box order-box" v-else v-loading="svcLoading">
        <div class="ui-box__body">
          <article class="order" v-for="s in pagedSvc" :key="s.serviceNo" :class="{ 'is-muted': s.status === '4' }">
            <header class="order__head">
              <div class="order__id">
                <span class="order__no">{{ s.serviceNo }}</span>
                <span class="ui-chip" :class="svcChip(s)">{{ svcStatusText(s) }}</span>
                <span class="ui-chip ui-chip--brand">{{ s.serviceMode === '2' ? '上门' : '到店' }}</span>
              </div>
              <div class="order__act">
                <span class="order__time">{{ fmtDay(s.createTime) }}</span>
                <button v-if="canPaySvc(s)" type="button" class="ui-btn ui-btn--solid ui-btn--sm" @click="openSvcCashier(s)">去支付</button>
                <button
                  v-if="canCancelSvc(s)"
                  type="button"
                  class="ui-linkbtn ui-linkbtn--danger"
                  :disabled="cancelingSvc === s.serviceNo"
                  @click="cancelSvc(s)"
                >{{ cancelingSvc === s.serviceNo ? '取消中…' : '取消预约' }}</button>
              </div>
            </header>

            <ul class="items">
              <li class="item">
                <div class="item__main">
                  <div class="item__name">
                    {{ s.itemName }}
                    <span class="item__unit">×{{ s.qty || 1 }}</span>
                  </div>
                  <div class="item__spec">预约 {{ fmtDay(s.appointTime) }} · {{ s.contactName || '—' }} {{ s.contactPhone || '' }}</div>
                  <div class="item__spec" v-if="s.serviceMode === '2' && s.address">上门地址：{{ s.address }}</div>
                </div>
                <span class="item__sum ui-price">¥{{ money(s.totalAmount) }}</span>
              </li>
            </ul>
          </article>
        </div>

        <div class="ui-box__foot">
          <span class="ui-box__count">第 {{ svcRangeStart }}–{{ svcRangeEnd }} 单 / 共 {{ shownSvc.length }} 单</span>
          <Pagination
            v-if="shownSvc.length > PAGE_SIZE"
            :total="shownSvc.length"
            v-model:page="svcPage"
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
          <span class="num">¥{{ current ? current.total.toFixed(2) : '0.00' }}</span>
        </div>
        <div class="pay-methods">
          <div class="pay-item" v-for="m in methods" :key="m.key" :class="{ active: payMethod === m.key }"
               @click="payMethod = m.key">
            <span class="pm-icon" :style="{ background: m.bg }"><el-icon><component :is="m.icon" /></el-icon></span>
            <div class="pm-info">
              <b>{{ m.name }}</b>
              <em>{{ methodDesc(m) }}</em>
            </div>
            <span class="pm-check"><el-icon v-if="payMethod === m.key"><Check /></el-icon></span>
          </div>
        </div>
        <div class="balance-tip" v-if="payMethod === 'balance' && walletBalance != null">
          <template v-if="balanceShort">
            <span class="bt-text warn">余额不足：可用 ¥{{ money(walletBalance) }}，本单需 ¥{{ money(currentTotal) }}</span>
            <el-button link type="warning" size="small" :loading="recharging" @click="askRecharge">去充值</el-button>
          </template>
          <span class="bt-text" v-else>可用余额 ¥{{ money(walletBalance) }}，支付后剩余 ¥{{ money(walletBalance - currentTotal) }}</span>
        </div>
        <div class="cashier-tip">
          <el-icon><InfoFilled /></el-icon>
          演示环境模拟支付，点击「立即支付」即完成付款，不会产生真实扣款
        </div>
        <div class="cashier-actions">
          <button type="button" class="ui-btn ui-btn--line" @click="cashierOpen = false" :disabled="paying">暂不支付</button>
          <button type="button" class="ui-btn ui-btn--solid" :disabled="paying || countdown <= 0" @click="doPay">
            {{ countdown > 0 ? '立即支付 · 剩余 ' + mmss : '已超时' }}
          </button>
          <span v-if="countdown <= 0" class="cashier-expired">订单已超时（30 分钟未支付），请重新下单</span>
        </div>
      </div>

      <div class="cashier-success" v-else>
        <div class="s-icon"><el-icon><CircleCheckFilled /></el-icon></div>
        <h3>支付成功</h3>
        <p class="s-amount">¥{{ current ? current.total.toFixed(2) : '' }}</p>
        <p class="s-tip">{{ current && current.tip }}</p>
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
import { listMyServiceOrders, payServiceBooking, cancelServiceBooking } from '@/api/pet/petService'
import { getMyWallet, rechargeWallet } from '@/api/pet/petWallet'
import Pagination from '@/components/Pagination/index.vue'

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

// 单据类型：商品订单 / 服务预约（服务单在 pet_service_order，不与商品订单混表）
const scope = ref('goods')
const serviceRows = ref([])
const svcLoading = ref(false)
const svcFilter = ref('all')
const svcPage = ref(1)
const cancelingSvc = ref(null)

function loadServiceOrders() {
  if (!isLogged.value) return
  svcLoading.value = true
  listMyServiceOrders().then((res) => {
    const list = res.data || []
    // 下单时间倒序，最新一单排在最前面
    serviceRows.value = list.slice().sort((a, b) => timeMs(b.createTime) - timeMs(a.createTime))
    svcLoading.value = false
  }).catch(() => { svcLoading.value = false })
}
function timeMs(v) {
  return new Date(String(v || '').replace('T', ' ').replace(/-/g, '/')).getTime() || 0
}

function switchScope(v) {
  scope.value = v
  if (v === 'service') loadServiceOrders()
}
function goBooking() {
  router.push('/shop/appointment')
}
function fmtDay(v) {
  return v ? String(v).replace('T', ' ').slice(5, 16) : '—'
}

function canPaySvc(s) {
  return s.status !== '4' && s.payStatus === '0' && Number(s.totalAmount || 0) > 0
}
function canCancelSvc(s) {
  return !['2', '3', '4'].includes(String(s.status))
}
function svcStatusText(s) {
  if (s.status === '4') return '已取消'
  if (s.status === '3') return '已完成'
  if (s.status === '2') return '服务中'
  if (s.payStatus === '0' && Number(s.totalAmount || 0) > 0) return '待支付'
  if (s.payStatus === '1') return s.status === '1' ? '已接单' : '已支付 · 待接单'
  return '待接单'
}
function svcChip(s) {
  if (s.status === '4') return ''
  if (s.status === '2') return 'ui-chip--brand'
  if (s.status === '3') return 'ui-chip--ok'
  if (s.payStatus === '0' && Number(s.totalAmount || 0) > 0) return 'ui-chip--warn'
  if (s.payStatus === '1') return 'ui-chip--brand'
  return 'ui-chip--warn'
}

const shownSvc = computed(() => {
  const list = serviceRows.value
  if (svcFilter.value === 'unpaid') return list.filter(canPaySvc)
  if (svcFilter.value === 'paid') return list.filter((s) => s.payStatus === '1')
  if (svcFilter.value === 'canceled') return list.filter((s) => s.status === '4')
  return list
})
const svcTabs = computed(() => [
  { key: 'all', label: '全部', count: serviceRows.value.length },
  { key: 'unpaid', label: '待支付', count: serviceRows.value.filter(canPaySvc).length },
  { key: 'paid', label: '已支付', count: serviceRows.value.filter((s) => s.payStatus === '1').length },
  { key: 'canceled', label: '已取消', count: serviceRows.value.filter((s) => s.status === '4').length }
])
const svcRangeStart = computed(() => (shownSvc.value.length ? (svcPage.value - 1) * PAGE_SIZE + 1 : 0))
const svcRangeEnd = computed(() => Math.min(svcPage.value * PAGE_SIZE, shownSvc.value.length))
watch(svcFilter, () => { svcPage.value = 1 })
watch(() => shownSvc.value.length, (len) => {
  if ((svcPage.value - 1) * PAGE_SIZE >= len) svcPage.value = 1
})

function cancelSvc(s) {
  ElMessageBox.prompt(
    `确认取消这笔服务预约（${s.itemName}）吗？已支付金额会原路退回平台余额。`,
    '取消预约',
    {
      confirmButtonText: '确认取消',
      cancelButtonText: '再想想',
      inputPlaceholder: '如：时间冲突 / 临时有事（选填）',
      inputValue: '',
      type: 'warning'
    }
  ).then(async ({ value }) => {
    cancelingSvc.value = s.serviceNo
    try {
      await cancelServiceBooking(s.serviceId, value || '客户取消')
      ElMessage.success('预约已取消，退款已退回平台余额')
      loadServiceOrders()
      loadWallet()
      window.dispatchEvent(new CustomEvent('pet-notify-refresh'))
    } catch (e) {
      ElMessage.error(e?.msg || e?.message || '取消失败')
    } finally {
      cancelingSvc.value = null
    }
  }).catch(() => {})
}

// 收银台状态
const cashierOpen = ref(false)
const paySuccess = ref(false)
const paying = ref(false)
const payMethod = ref('alipay')
const current = ref(null)
const countdown = ref(0)
let countdownTimer = null

// 平台余额：真实钱包余额，余额支付会真实扣减
const walletBalance = ref(null)
const recharging = ref(false)
const currentTotal = computed(() => (current.value ? current.value.total : 0))
const mmss = computed(() => {
  const left = countdown.value
  return `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`
})
const balanceShort = computed(() => walletBalance.value != null && walletBalance.value + 1e-9 < currentTotal.value)

function money(v) {
  return Number(v || 0).toFixed(2)
}
function methodDesc(m) {
  if (m.key === 'balance' && walletBalance.value != null) return '可用 ¥' + money(walletBalance.value)
  return m.desc
}
async function loadWallet() {
  if (!isLogged.value) return
  try {
    const res = await getMyWallet()
    walletBalance.value = Number((res.data && res.data.balance) || 0)
  } catch (e) {
    walletBalance.value = null
  }
}

// 余额不足时引导充值（演示环境模拟充值，不产生真实扣款）
async function askRecharge() {
  const need = Math.max(0, currentTotal.value - (walletBalance.value || 0))
  const suggest = Math.max(50, Math.ceil((need + 20) / 50) * 50)
  let input
  try {
    const r = await ElMessageBox.prompt(
      `当前可用 ¥${money(walletBalance.value)}，本单需 ¥${money(currentTotal.value)}。\n演示环境可直接充值，不会真实扣款：`,
      '余额不足',
      { confirmButtonText: '确认充值', cancelButtonText: '换个通道支付', inputValue: String(suggest), inputPattern: /^\d+(\.\d{1,2})?$/, inputErrorMessage: '请输入正确金额' }
    )
    input = r.value
  } catch (e) {
    return
  }
  recharging.value = true
  try {
    const res = await rechargeWallet(Number(input))
    walletBalance.value = Number((res.data && res.data.balance) || 0)
    ElMessage.success('充值成功，当前余额 ¥' + money(walletBalance.value))
  } catch (e) {
    console.warn('[recharge] 充值失败:', e?.msg || e?.message || e)
  } finally {
    recharging.value = false
  }
}

const methods = [
  { key: 'alipay', icon: 'Money', name: '支付宝', desc: '推荐使用，秒到账', bg: 'linear-gradient(135deg,#1677ff,#69b1ff)' },
  { key: 'wechat', icon: 'ChatDotRound', name: '微信支付', desc: '微信快捷支付', bg: 'linear-gradient(135deg,#07c160,#5bd98a)' },
  { key: 'balance', icon: 'Wallet', name: '平台余额', desc: '演示专用通道', bg: 'var(--grad-brand)' }
]

// 订单头 + 明细直接来自 /pet/order/mine，不再前端拼单号
const groups = computed(() => rows.value.map((o) => ({
  orderNo: o.orderNo,
  createdAt: o.createTime,
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
const pagedSvc = computed(() => shownSvc.value.slice((svcPage.value - 1) * PAGE_SIZE, svcPage.value * PAGE_SIZE))
const rangeStart = computed(() => (shownGroups.value.length ? (page.value - 1) * PAGE_SIZE + 1 : 0))
const rangeEnd = computed(() => Math.min(page.value * PAGE_SIZE, shownGroups.value.length))
watch(filter, () => { page.value = 1 })
// 取消/退款后总数变少时，避免停在空页
watch(() => shownGroups.value.length, (len) => {
  if ((page.value - 1) * PAGE_SIZE >= len) page.value = 1
})

// 订单支付有效期 30 分钟（与后端 pet.order.expire-minutes 一致）
const EXPIRE_MS = 30 * 60 * 1000
const nowTick = ref(Date.now())
setInterval(() => { nowTick.value = Date.now() }, 30_000)

function createdMs(g) {
  if (!g.createdAt) return Date.now()
  return new Date(String(g.createdAt).replace('T', ' ').replace(/-/g, '/')).getTime()
}

// 距支付截止剩余秒数；非待支付状态不计时
function expireLeft(g) {
  if (!g.unpaid) return Infinity
  return Math.max(0, Math.round((createdMs(g) + EXPIRE_MS - nowTick.value) / 1000))
}

function expireText(g) {
  const left = expireLeft(g)
  if (left <= 0) return '已超时'
  const m = Math.floor(left / 60), sec = left % 60
  return `剩余 ${m}:${String(sec).padStart(2, '0')}`
}

function openCashier(g) {
  current.value = {
    ...g,
    tip: g.isPet
      ? '请带上身份证到门店接它回家，可在「我的订单」查看进度'
      : '我们会尽快为你安排发货，可在「我的订单」查看进度'
  }
  paySuccess.value = false
  payMethod.value = 'alipay'
  cashierOpen.value = true
  loadWallet()
  startCountdown(g)
}

/** 服务预约单走同一套收银台，只是支付接口不同 */
function openSvcCashier(s) {
  current.value = {
    orderNo: s.serviceNo,
    createdAt: s.createTime,
    total: Number(s.totalAmount || 0),
    isService: true,
    isPet: false,
    tip: '门店会按预约时间联系你，可在「我的订单 → 服务预约」查看进度'
  }
  paySuccess.value = false
  payMethod.value = 'alipay'
  cashierOpen.value = true
  loadWallet()
  startCountdown(current.value)
}

function startCountdown(g) {
  if (countdownTimer) clearInterval(countdownTimer)
  const created = createdMs(g)
  const tick = () => {
    countdown.value = Math.max(0, Math.round((created + EXPIRE_MS - Date.now()) / 1000))
    if (countdown.value <= 0 && countdownTimer) { clearInterval(countdownTimer); countdownTimer = null }
  }
  tick()
  countdownTimer = setInterval(tick, 1000)
}

function legacyTip() {
  ElMessageBox.alert(
    '这笔订单是系统早期数据，缺少支付单号，无法在线支付。请到「宠物粮」页重新下单，我们会立即为你安排发货。',
    '历史订单',
    { confirmButtonText: '去逛逛', type: 'info' }
  ).then(() => router.push('/shop/food')).catch(() => {})
}

async function doPay() {
  if (!current.value || paying.value) return
  if (countdown.value <= 0) {
    ElMessage.warning('订单已超时（30 分钟未支付），请重新下单')
    return
  }
  if (!current.value.orderNo) {
    paying.value = false
    legacyTip()
    return
  }
  paying.value = true
  try {
    if (current.value.isService) {
      await payServiceBooking(current.value.orderNo, payMethod.value)
    } else {
      await payOrder(current.value.orderNo, payMethod.value)
    }
    paySuccess.value = true
    if (countdownTimer) clearInterval(countdownTimer)
    getList()
    loadServiceOrders()
    // 支付成功会生成站内通知，通知铃铛立即刷新
    window.dispatchEvent(new CustomEvent('pet-notify-refresh'))
  } catch (e) {
    // 错误提示已由 request 拦截器统一弹出（含后端真实业务原因），此处不再重复弹
    const msg = e?.msg || e?.message || ''
    console.warn('[pay] 支付失败:', msg || e)
    // 余额不足：默认弹窗已提示原因，这里再给一个一键充值入口
    if (/余额不足/.test(msg)) {
      walletBalance.value = walletBalance.value == null ? 0 : walletBalance.value
      loadWallet()
    }
  } finally {
    paying.value = false
  }
}

function closeCashier() {
  cashierOpen.value = false
  paySuccess.value = false
}

function cancelOrder(g) {
  const first = g.items[0]
  ElMessageBox.prompt(
    `确认取消订单 ${g.orderNo}${g.items.length > 1 ? `（${g.items.length} 件商品）` : `（${first.goodsName}）`}吗？可填写取消原因：`,
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
    `订单 ${g.orderNo}，退款金额 ¥${g.total.toFixed(2)}。请填写退款原因：`,
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
onMounted(() => {
  getList()
  loadWallet()
  loadServiceOrders()
})
onBeforeUnmount(() => {
  if (countdownTimer) clearInterval(countdownTimer)
})
</script>

<style scoped lang="scss">
// 页头 / 空态 / 标签来自 .ui-* 基元；本页新增「状态标签页」「订单区块」「商品行」三段结构。

/* ---------- 单据类型切换：商品订单 / 服务预约 ---------- */
.scope-bar { display: flex; gap: 10px; margin-top: 18px; }
.scope-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  border: 1px solid var(--border-1);
  border-radius: 999px;
  background: var(--bg-card);
  font-size: 13.5px;
  color: var(--text-2);
  cursor: pointer;
  transition: color .15s ease, border-color .15s ease, background .15s ease;
}
.scope-btn.on {
  border-color: var(--brand-500, #6366f1);
  background: var(--brand-50);
  color: var(--brand-700);
  font-weight: 600;
}
.scope-n { font-size: 12px; color: var(--text-3); font-variant-numeric: tabular-nums; }
.scope-btn.on .scope-n { color: var(--brand-600); }

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
    font-weight: 600;
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
  font-weight: 650;
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
.order__expire {
  font-size: 12px; font-weight: 600; color: var(--warn-600, #b45309);
  font-variant-numeric: tabular-nums;
  &.is-expired { color: var(--danger-600, #dc2626); }
}
.cashier-expired { font-size: 12.5px; color: var(--danger-600, #dc2626); font-weight: 600; }
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
  font-size: 14.5px;
  font-weight: 600;
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
  b { font-size: 18px; }
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
      font-size: 32px;
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
      font-size: 17px;
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
  .balance-tip {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 12px;
    padding: 9px 12px;
    background: #fffaf5;
    border: 1px solid #ffe1c7;
    border-radius: 8px;
    .bt-text { font-size: 12.5px; color: #8a6a52; }
    .bt-text.warn { color: #e6541f; font-weight: 600; }
  }
}
.cashier-success {
  text-align: center;
  padding: 6px 0 4px;
  .s-icon { font-size: 46px; color: var(--success-500); }
  h3 { margin: 10px 0 4px; font-size: 17px; color: var(--text-1); }
  .s-amount {
    margin: 0;
    font-size: 26px;
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
  .item__sum { font-size: 15px; }

  .order__foot { gap: 12px; }
}
</style>
