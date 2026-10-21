<template>
  <div class="order-page">
    <div class="page-head">
      <h1>📦 我的订单</h1>
      <span class="sub" v-if="isLogged">共 {{ groups.length }} 笔订单</span>
      <el-radio-group v-if="groups.length" v-model="filter" size="small" class="head-filter">
        <el-radio-button value="all">全部</el-radio-button>
        <el-radio-button value="unpaid">待支付</el-radio-button>
        <el-radio-button value="paid">已支付</el-radio-button>
        <el-radio-button value="canceled">已取消</el-radio-button>
      </el-radio-group>
    </div>

    <!-- 未登录 -->
    <div class="empty" v-if="!isLogged">
      <div class="empty-icon">🔒</div>
      <p class="empty-text">请先登录后查看你的下单记录</p>
      <el-button type="warning" round @click="openAuth('login')">去登录</el-button>
    </div>

    <!-- 空订单 -->
    <div class="empty" v-else-if="shownGroups.length === 0">
      <div class="empty-icon">📦</div>
      <p class="empty-text">还没有下单记录，挑点好粮给毛孩子吧～</p>
      <el-button type="warning" round @click="goShop">去挑选宠物粮</el-button>
    </div>

    <!-- 订单列表（按订单号分组，一单多品） -->
    <div class="order-list" v-else v-loading="loading">
      <div class="order-card" v-for="g in shownGroups" :key="g.groupKey"
           :class="{ canceled: g.canceled, unpaid: g.unpaid }">
        <div class="order-head">
          <div class="head-left">
            <span class="order-no">{{ g.legacy ? '历史订单（未生成单号）' : '订单 ' + g.orderNo }}</span>
            <el-tag v-if="g.canceled" type="info" size="small">已取消</el-tag>
            <el-tag v-else-if="g.unpaid" type="warning" size="small">待支付</el-tag>
            <el-tag v-else type="success" size="small">已支付 · {{ methodText(g.payMethod) }}</el-tag>
          </div>
          <div class="head-right">
            <span class="order-time">
              <el-icon><Clock /></el-icon>{{ g.createTime }}
            </span>
            <el-button
              v-if="g.unpaid && !g.legacy"
              type="warning" size="small" round
              @click="openCashier(g)"
            >去支付</el-button>
            <el-button
              v-else-if="g.unpaid && g.legacy"
              type="info" size="small" round plain
              @click="legacyTip"
            >历史订单</el-button>
            <el-button
              v-else-if="!g.canceled"
              type="danger" link size="small"
              :loading="cancelingId === g.groupKey"
              @click="cancelOrder(g)"
            >取消订单</el-button>
          </div>
        </div>
        <div class="order-body" v-for="o in g.items" :key="o.cartId">
          <img :src="o.goodsImage" class="thumb" v-if="o.goodsImage" @error="onImgErr" />
          <div class="goods-info">
            <div class="name">{{ o.goodsName }}</div>
            <div class="spec">{{ o.goodsSpec }}</div>
          </div>
          <div class="col-price">¥{{ o.price }}</div>
          <div class="col-qty">×{{ o.qty }}</div>
          <div class="col-sub">¥{{ (o.amount != null ? o.amount : o.price * o.qty).toFixed(2) }}</div>
        </div>
        <div class="order-total" v-if="g.items.length > 1">
          <span>共 {{ g.items.length }} 件，合计：</span>
          <b>¥{{ g.total.toFixed(2) }}</b>
        </div>
      </div>
    </div>

    <!-- 模拟收银台 -->
    <el-dialog v-model="cashierOpen" width="420px" align-center :show-close="!paySuccess" class="cashier-dialog"
               :close-on-click-modal="false">
      <template #header>
        <div class="cashier-head">
          <span>收银台</span>
          <span class="cashier-no" v-if="current">{{ current.orderNo }}</span>
        </div>
      </template>

      <!-- 支付中 -->
      <div class="cashier-body" v-if="!paySuccess">
        <div class="cashier-amount">
          <span class="label">支付金额</span>
          <span class="num">¥{{ current ? current.total.toFixed(2) : '0.00' }}</span>
        </div>
        <div class="pay-methods">
          <div class="pay-item" v-for="m in methods" :key="m.key" :class="{ active: payMethod === m.key }"
               @click="payMethod = m.key">
            <span class="pm-icon" :style="{ background: m.bg }">{{ m.icon }}</span>
            <div class="pm-info">
              <b>{{ m.name }}</b>
              <em>{{ m.desc }}</em>
            </div>
            <span class="pm-check">{{ payMethod === m.key ? '✓' : '' }}</span>
          </div>
        </div>
        <div class="cashier-tip">
          <el-icon><InfoFilled /></el-icon>
          演示环境模拟支付，点击「立即支付」即完成付款，不会产生真实扣款
        </div>
        <div class="cashier-actions">
          <el-button round @click="cashierOpen = false" :disabled="paying">暂不支付</el-button>
          <el-button type="warning" round :loading="paying" @click="doPay">
            立即支付<span v-if="countdown > 0">（{{ countdown }}s）</span>
          </el-button>
        </div>
      </div>

      <!-- 支付成功 -->
      <div class="cashier-success" v-else>
        <div class="s-icon">✅</div>
        <h3>支付成功！</h3>
        <p class="s-amount">¥{{ current ? current.total.toFixed(2) : '' }}</p>
        <p class="s-tip">我们会尽快为你安排发货，可在「我的订单」查看进度</p>
        <el-button type="warning" round @click="closeCashier">完成</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, inject, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Clock, InfoFilled } from '@element-plus/icons-vue'
import { useUserStore } from '@/store/modules/user'
import { listPetCart, cancelPetCart, payPetCart } from '@/api/pet/petCart'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const openAuth = inject('openAuth', () => {})
const isLogged = computed(() => !!userStore.token)

const rows = ref([])
const loading = ref(false)
const filter = ref('all')
const cancelingId = ref(null)
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
  { key: 'alipay', icon: '💰', name: '支付宝', desc: '推荐使用，秒到账', bg: 'linear-gradient(135deg,#1677ff,#69b1ff)' },
  { key: 'wechat', icon: '💬', name: '微信支付', desc: '微信快捷支付', bg: 'linear-gradient(135deg,#07c160,#5bd98a)' },
  { key: 'balance', icon: '🐾', name: '平台余额', desc: '演示专用通道', bg: 'linear-gradient(135deg,#ff8c42,#ffb27a)' }
]
function methodText(m) {
  return m === 'wechat' ? '微信' : m === 'balance' ? '余额' : m === 'alipay' ? '支付宝' : '线上'
}

// 按订单号分组（老数据没有单号时按 cartId 兜底）
const groups = computed(() => {
  const map = new Map()
  for (const o of rows.value) {
    const key = o.orderNo || 'C' + o.cartId
    if (!map.has(key)) {
      map.set(key, {
        orderNo: o.orderNo || '',
        groupKey: key,
        legacy: !o.orderNo,
        items: [],
        canceled: false,
        unpaid: false,
        paid: false,
        payMethod: o.payMethod,
        createTime: o.createTime,
        total: 0
      })
    }
    const g = map.get(key)
    g.items.push(o)
    g.total += (o.amount != null ? o.amount : (o.price || 0) * (o.qty || 1))
    if (o.status === '3') g.canceled = true
    else if (o.payStatus === '1') g.paid = true
    else g.unpaid = true
  }
  return [...map.values()].sort((a, b) => (b.createTime || '').localeCompare(a.createTime || ''))
})

const shownGroups = computed(() => {
  if (filter.value === 'all') return groups.value
  if (filter.value === 'unpaid') return groups.value.filter((g) => g.unpaid)
  if (filter.value === 'paid') return groups.value.filter((g) => g.paid)
  return groups.value.filter((g) => g.canceled)
})

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

function legacyTip() {
  ElMessageBox.alert(
    '这笔订单是系统早期数据，缺少支付单号，无法在线支付。请到「宠物粮」页重新下单，我们会立即为你安排发货。',
    '历史订单',
    { confirmButtonText: '去逛逛', type: 'info' }
  ).then(() => router.push('/shop/food')).catch(() => {})
}

async function doPay() {
  if (!current.value || paying.value) return
  if (!current.value.orderNo) {
    paying.value = false
    legacyTip()
    return
  }
  paying.value = true
  try {
    await payPetCart(current.value.orderNo, payMethod.value)
    paySuccess.value = true
    if (countdownTimer) clearInterval(countdownTimer)
    getList()
    // 支付成功会生成站内通知，通知铃铛立即刷新
    window.dispatchEvent(new CustomEvent('pet-notify-refresh'))
  } catch (e) {
    // 错误提示已由 request 拦截器统一弹出（含后端真实业务原因），此处不再重复弹
    console.warn('[pay] 支付失败:', e?.msg || e?.message || e)
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
    cancelingId.value = g.groupKey
    try {
      for (const o of g.items.filter((x) => x.status !== '3')) {
        await cancelPetCart(o.cartId, value || '')
      }
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

function goShop() {
  router.push('/shop/food')
}
function onImgErr(e) {
  e.target.style.display = 'none'
}
function getList() {
  if (!isLogged.value) return
  loading.value = true
  listPetCart({ pageNum: 1, pageSize: 200 })
    .then((res) => {
      rows.value = res.rows || []
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
.order-page { max-width: 1100px; margin: 0 auto; padding: 24px; }
.page-head { display: flex; align-items: baseline; gap: 12px; margin-bottom: 20px; flex-wrap: wrap;
  h1 { font-size: 24px; color: #303133; margin: 0; }
  .sub { color: #909399; font-size: 14px; }
  .head-filter { margin-left: auto; }
}
.empty { text-align: center; padding: 80px 0; background: #fff; border-radius: 14px;
  .empty-icon { font-size: 64px; opacity: .5; }
  .empty-text { color: #909399; font-size: 16px; margin: 16px 0 24px; }
}
.order-list { display: flex; flex-direction: column; gap: 14px; }
.order-card { background: #fff; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,.05); }
.order-card.unpaid { border: 1px solid #ffe0c2; }
.order-head { display: flex; align-items: center; justify-content: space-between;
  padding: 12px 20px; background: #fafafa; border-bottom: 1px solid #f0f0f0;
  .head-left { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .head-right { display: flex; align-items: center; gap: 12px; }
  .order-no { font-size: 14px; font-weight: 600; color: #303133; }
  .order-time { display: inline-flex; align-items: center; gap: 4px; font-size: 13px; color: #909399; }
}
.order-card.canceled {
  opacity: .72;
  .order-body { filter: grayscale(.35); }
}
.order-body { display: flex; align-items: center; gap: 16px; padding: 16px 20px;
  & + .order-body { padding-top: 0; border-top: 1px dashed #f5f5f5; }
  .thumb { width: 64px; height: 64px; border-radius: 8px; object-fit: cover; background: #f7f7f7; flex-shrink: 0; }
  .goods-info { flex: 1; min-width: 0;
    .name { font-size: 15px; color: #303133; font-weight: 600; }
    .spec { font-size: 13px; color: #909399; margin-top: 4px; }
  }
  .col-price { width: 100px; color: #606266; font-size: 14px; text-align: center; }
  .col-qty { width: 80px; color: #606266; font-size: 14px; text-align: center; }
  .col-sub { width: 120px; color: #ff8c42; font-weight: 700; font-size: 16px; text-align: right; }
}
.order-total { display: flex; justify-content: flex-end; align-items: baseline; gap: 8px;
  padding: 10px 20px 16px; color: #606266; font-size: 13px;
  b { color: #ff8c42; font-size: 18px; }
}

/* 收银台 */
.cashier-head { display: flex; align-items: baseline; gap: 10px;
  .cashier-no { font-size: 12px; color: #909399; }
}
.cashier-body {
  .cashier-amount { text-align: center; padding: 6px 0 18px;
    .label { display: block; font-size: 13px; color: #909399; }
    .num { font-size: 34px; font-weight: 700; color: #ff8c42; }
  }
  .pay-methods { display: flex; flex-direction: column; gap: 10px; }
  .pay-item { display: flex; align-items: center; gap: 12px; padding: 12px 14px;
    border: 1.5px solid #f0f0f0; border-radius: 12px; cursor: pointer; transition: all .15s;
    &:hover { border-color: #ffd6b0; }
    &.active { border-color: #ff8c42; background: #fffaf5; }
    .pm-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center;
      justify-content: center; font-size: 18px; color: #fff; flex-shrink: 0; }
    .pm-info { flex: 1; b { display: block; font-size: 14px; color: #303133; }
      em { font-size: 12px; color: #909399; font-style: normal; } }
    .pm-check { color: #ff8c42; font-weight: 700; width: 18px; text-align: center; }
  }
  .cashier-tip { display: flex; align-items: center; gap: 6px; margin-top: 14px;
    padding: 9px 12px; background: #f5f7fa; border-radius: 8px; font-size: 12.5px; color: #909399; }
  .cashier-actions { display: flex; justify-content: center; gap: 12px; margin-top: 20px; }
}
.cashier-success { text-align: center; padding: 10px 0 6px;
  .s-icon { font-size: 56px; }
  h3 { margin: 12px 0 4px; color: #303133; }
  .s-amount { font-size: 26px; font-weight: 700; color: #ff8c42; margin: 0; }
  .s-tip { font-size: 13px; color: #909399; margin: 8px 0 18px; }
}

@media (max-width: 720px) {
  .order-body { flex-wrap: wrap; gap: 8px;
    .goods-info { width: 100%; }
    .col-price, .col-qty { width: auto; flex: 1; text-align: left; }
    .col-sub { width: 100%; text-align: right; }
  }
  .page-head .head-filter { margin-left: 0; width: 100%; }
}
</style>
