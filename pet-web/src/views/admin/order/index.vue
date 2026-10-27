<template>
  <div class="app-container">
    <StatCards :items="[
      { label: '今日订单', value: stats.total || 0 },
      { label: '今日实收', value: formatMoney(stats.paid), prefix: '¥', tone: 'money' },
      { label: '待付款', value: stats.unpaid || 0, tone: 'warn', onClick: () => filterStatus('0') },
      { label: '待发货', value: stats.toShip || 0, tone: 'brand', onClick: () => filterStatus('1') }
    ]" />

    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="72px">
      <el-form-item label="关键词" prop="keyword">
        <el-input v-model="queryParams.keyword" placeholder="订单号 / 账号 / 收货人" clearable style="width: 220px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="类型" prop="orderType">
        <el-select v-model="queryParams.orderType" placeholder="全部" clearable style="width: 110px">
          <el-option label="商品单" value="1" />
          <el-option label="宠物单" value="2" />
        </el-select>
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="全部状态" clearable style="width: 130px">
          <el-option v-for="s in STATUS" :key="s.value" :label="s.label" :value="s.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="支付" prop="payStatus">
        <el-select v-model="queryParams.payStatus" placeholder="全部" clearable style="width: 110px">
          <el-option label="未付" value="0" />
          <el-option label="已付" value="1" />
        </el-select>
      </el-form-item>
      <el-form-item label="下单日期" prop="queryDate">
        <el-date-picker v-model="queryParams.queryDate" type="date" value-format="YYYY-MM-DD" placeholder="全部日期" style="width: 150px" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-table v-loading="loading" :data="orderList">
      <el-table-column label="订单号" prop="orderNo" width="190" />
      <el-table-column label="类型" width="86" align="center">
        <template #default="scope">
          <el-tag size="small" :type="scope.row.orderType === '2' ? 'danger' : 'info'" effect="plain">
            {{ scope.row.orderType === '2' ? '宠物单' : '商品单' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="商品" min-width="230">
        <template #default="scope">
          <div class="cell-main">{{ firstGoods(scope.row) }}</div>
          <div class="cell-sub">共 {{ scope.row.itemCount }} 件</div>
        </template>
      </el-table-column>
      <el-table-column label="下单账号" prop="userName" width="110" />
      <el-table-column label="门店" prop="storeName" width="130" :show-overflow-tooltip="true" />
      <el-table-column label="金额" width="100">
        <template #default="scope"><span class="money">¥{{ formatMoney(scope.row.payAmount) }}</span></template>
      </el-table-column>
      <el-table-column label="支付" width="110">
        <template #default="scope">
          <el-tag size="small" :type="scope.row.payStatus === '1' ? 'success' : 'info'">
            {{ scope.row.payStatus === '1' ? methodText(scope.row.payMethod) : '未支付' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="94">
        <template #default="scope">
          <el-tag size="small" :type="statusType(scope.row.status)">{{ statusText(scope.row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="下单时间" width="130">
        <template #default="scope">{{ fmt(scope.row.createTime) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="180" fixed="right" class-name="small-padding fixed-width">
        <template #default="scope">
          <el-button link type="primary" @click="openDetail(scope.row)">详情</el-button>
          <el-button v-if="scope.row.status === '1'" link type="success" @click="handleShip(scope.row)" v-hasPermi="['pet:order:ship']">
            {{ scope.row.orderType === '2' ? '确认交付' : '发货' }}
          </el-button>
          <el-button v-if="['0','1'].includes(scope.row.status)" link type="danger" @click="handleCancel(scope.row)" v-hasPermi="['pet:order:cancel']">取消</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />

    <el-drawer v-model="detailOpen" title="订单详情" size="560px">
      <div v-loading="detailLoading" class="detail">
        <div class="detail-head">
          <div>
            <p class="no">{{ detail.orderNo }}</p>
            <p class="sub">{{ detail.storeName || '—' }} · {{ detail.userName || '—' }}</p>
          </div>
          <div>
            <el-tag v-if="detail.orderType === '2'" type="danger" effect="plain" style="margin-right:6px">宠物单</el-tag>
            <el-tag :type="statusType(detail.status)">{{ statusText(detail.status) }}</el-tag>
          </div>
        </div>

        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="商品件数">{{ detail.itemCount || 0 }}</el-descriptions-item>
          <el-descriptions-item label="实付金额">¥{{ formatMoney(detail.payAmount) }}</el-descriptions-item>
          <el-descriptions-item label="支付状态">{{ detail.payStatus === '1' ? '已支付' : '未支付' }}</el-descriptions-item>
          <el-descriptions-item label="支付方式">{{ methodText(detail.payMethod) }}</el-descriptions-item>
          <el-descriptions-item label="支付时间">{{ fmt(detail.payTime) }}</el-descriptions-item>
          <el-descriptions-item label="下单时间">{{ fmt(detail.createTime) }}</el-descriptions-item>
          <el-descriptions-item label="履约方式">{{ detail.deliveryType === '2' ? '配送' : '到店自提' }}</el-descriptions-item>
          <el-descriptions-item label="收货人">{{ detail.receiver || '—' }}</el-descriptions-item>
          <el-descriptions-item label="联系电话" :span="2">{{ detail.receiverPhone || '—' }}</el-descriptions-item>
          <el-descriptions-item label="收货地址" :span="2">{{ detail.receiverAddress || '—' }}</el-descriptions-item>
          <el-descriptions-item v-if="detail.cancelReason" label="取消原因" :span="2">{{ detail.cancelReason }}</el-descriptions-item>
        </el-descriptions>

        <p class="section-title">商品明细</p>
        <el-table :data="detail.items || []" size="small" border>
          <el-table-column label="商品" min-width="180">
            <template #default="scope">
              <div class="cell-main">{{ scope.row.goodsName }}</div>
              <div class="cell-sub">{{ scope.row.goodsSpec }}</div>
            </template>
          </el-table-column>
          <el-table-column label="类型" width="70" align="center">
            <template #default="scope">
              <el-tag size="small" :type="scope.row.itemType === '2' ? 'danger' : 'info'" effect="plain">
                {{ scope.row.itemType === '2' ? '宠物' : '商品' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="单价" width="90" align="center">
            <template #default="scope">¥{{ formatMoney(scope.row.price) }}</template>
          </el-table-column>
          <el-table-column label="数量" prop="qty" width="70" align="center" />
          <el-table-column label="小计" width="96" align="right">
            <template #default="scope"><span class="money">¥{{ formatMoney(scope.row.amount) }}</span></template>
          </el-table-column>
        </el-table>
        <p class="total-line">合计：<b>¥{{ formatMoney(detail.payAmount) }}</b></p>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import StatCards from '@/components/StatCards.vue'
import { ref, reactive, toRefs, getCurrentInstance, onMounted, onBeforeUnmount } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { listOrders, getOrder, orderStats, shipOrder, cancelOrder } from '@/api/pet/petOrder'

const { proxy } = getCurrentInstance()

const STATUS = [
  { value: '0', label: '待付款' },
  { value: '1', label: '待发货' },
  { value: '2', label: '已完成' },
  { value: '3', label: '已取消' }
]

const orderList = ref([])
const stats = ref({})
const loading = ref(true)
const showSearch = ref(true)
const total = ref(0)

const detailOpen = ref(false)
const detailLoading = ref(false)
const detail = ref({})

const data = reactive({
  queryParams: { pageNum: 1, pageSize: 10, keyword: undefined, orderType: undefined, status: undefined, payStatus: undefined, queryDate: undefined }
})
const { queryParams } = toRefs(data)

function statusText(s) {
  return (STATUS.find((x) => x.value === s) || {}).label || '未知'
}
function statusType(s) {
  return { 0: 'warning', 1: 'primary', 2: 'success', 3: 'info' }[s] || 'info'
}
function methodText(m) {
  return { alipay: '支付宝', wechat: '微信', balance: '余额' }[m] || (m ? '线上' : '—')
}
function formatMoney(v) {
  return Number(v || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmt(v) {
  return v ? String(v).replace('T', ' ').slice(5, 16) : '—'
}
function firstGoods(row) {
  const items = row.items || []
  if (!items.length) return '—'
  return items.length > 1 ? `${items[0].goodsName} 等 ${items.length} 种` : items[0].goodsName
}

function getList() {
  loading.value = true
  listOrders(queryParams.value).then((res) => {
    orderList.value = res.rows || []
    total.value = res.total || 0
    loading.value = false
  }).catch(() => { loading.value = false })
}

function getStats() {
  orderStats().then((res) => { stats.value = res.data || {} }).catch(() => {})
}

function handleQuery() {
  queryParams.value.pageNum = 1
  getList()
}

function resetQuery() {
  proxy.resetForm('queryRef')
  handleQuery()
}

function filterStatus(status) {
  queryParams.value.status = status
  queryParams.value.queryDate = undefined
  handleQuery()
}

function openDetail(row) {
  detailOpen.value = true
  detailLoading.value = true
  getOrder(row.orderNo).then((res) => {
    detail.value = res.data || {}
    detailLoading.value = false
  }).catch(() => { detailLoading.value = false })
}

function handleShip(row) {
  const isPet = row.orderType === '2'
  const tip = isPet
    ? `确认客户已到店接走宠物？订单 ${row.orderNo} 将标记为已完成。`
    : `确认订单 ${row.orderNo} 已发出？`
  ElMessageBox.confirm(tip, isPet ? '确认交付' : '发货', { type: 'info' })
    .then(() => shipOrder(row.orderNo))
    .then((res) => {
      ElMessage.success(res.msg || '已发货')
      getList()
      getStats()
    })
    .catch(() => {})
}

function handleCancel(row) {
  ElMessageBox.prompt('取消订单，请填写原因（库存会自动回补）：', '取消订单', {
    confirmButtonText: '确认取消',
    cancelButtonText: '再想想',
    inputPlaceholder: '如：客户改期 / 缺货'
  }).then(({ value }) => cancelOrder(row.orderNo, value || ''))
    .then((res) => {
      ElMessage.success(res.msg || '订单已取消')
      getList()
      getStats()
    })
    .catch(() => {})
}

// 实时刷新：30s 轮询 + 支付/取消等业务事件即时刷新（通知铃铛会广播 pet-notify-refresh）
let statsTimer = null
function refreshAll() {
  getList()
  getStats()
}
onMounted(() => {
  refreshAll()
  statsTimer = setInterval(refreshAll, 30_000)
  window.addEventListener('pet-notify-refresh', refreshAll)
})
onBeforeUnmount(() => {
  if (statsTimer) clearInterval(statsTimer)
  window.removeEventListener('pet-notify-refresh', refreshAll)
})
</script>

<style scoped lang="scss">
.cell-main { font-size: 13px; color: var(--text-1); }
.cell-sub { font-size: 12px; color: var(--text-3); margin-top: 2px; }
.money { color: var(--brand-700); font-weight: 600; }
.detail-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px;
  .no { margin: 0; font-size: 16px; font-weight: 600; color: var(--text-1); }
  .sub { margin: 4px 0 0; font-size: 12px; color: var(--text-3); }
}
.section-title { margin: 20px 0 10px; font-size: 14px; font-weight: 600; color: var(--text-1); }
.total-line { text-align: right; margin: 10px 0 0; color: var(--text-2); b { color: var(--brand-700); font-size: 18px; } }
</style>
