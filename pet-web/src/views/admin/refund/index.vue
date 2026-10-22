<template>
  <div class="app-container">
    <StatCards :items="[
      { label: '待审核', value: stats.pending || 0, tone: 'warn', onClick: () => filterStatus('0') },
      { label: '今日退款额', value: formatMoney(stats.refunded), prefix: '¥', tone: 'money' },
      { label: '已退款', value: stats.done || 0, tone: 'success', onClick: () => filterStatus('1') },
      { label: '已拒绝', value: stats.rejected || 0, onClick: () => filterStatus('2') }
    ]" />

    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="72px">
      <el-form-item label="关键词" prop="keyword">
        <el-input v-model="queryParams.keyword" placeholder="退款单号 / 订单号 / 账号" clearable style="width: 230px"
                  @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="全部状态" clearable style="width: 130px">
          <el-option v-for="s in STATUS" :key="s.value" :label="s.label" :value="s.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="申请日期" prop="queryDate">
        <el-date-picker v-model="queryParams.queryDate" type="date" value-format="YYYY-MM-DD" placeholder="全部日期"
                        style="width: 150px" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-table v-loading="loading" :data="refundList">
      <el-table-column label="退款单号" prop="refundNo" width="190" />
      <el-table-column label="订单号" prop="orderNo" width="190" />
      <el-table-column label="申请账号" prop="userName" width="110" />
      <el-table-column label="门店" prop="storeName" width="130" :show-overflow-tooltip="true" />
      <el-table-column label="退款金额" width="110">
        <template #default="scope"><span class="money">¥{{ formatMoney(scope.row.amount) }}</span></template>
      </el-table-column>
      <el-table-column label="退款原因" prop="reason" min-width="170" :show-overflow-tooltip="true" />
      <el-table-column label="状态" width="96">
        <template #default="scope">
          <el-tag size="small" :type="statusType(scope.row.status)">{{ statusText(scope.row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="申请时间" width="130">
        <template #default="scope">{{ fmt(scope.row.createTime) }}</template>
      </el-table-column>
      <el-table-column label="审核意见" prop="auditRemark" min-width="140" :show-overflow-tooltip="true" />
      <el-table-column label="操作" width="160" fixed="right" class-name="small-padding fixed-width">
        <template #default="scope">
          <template v-if="scope.row.status === '0'">
            <el-button link type="success" @click="handleAudit(scope.row, true)" v-hasPermi="['pet:refund:audit']">同意退款</el-button>
            <el-button link type="danger" @click="handleAudit(scope.row, false)" v-hasPermi="['pet:refund:audit']">拒绝</el-button>
          </template>
          <span v-else class="cell-sub">{{ scope.row.auditBy || '—' }} · {{ fmt(scope.row.auditTime) }}</span>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum"
                v-model:limit="queryParams.pageSize" @pagination="getList" />
  </div>
</template>

<script setup>
import StatCards from '@/components/StatCards.vue'
import { ref, reactive, toRefs, getCurrentInstance, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { listRefunds, refundStats, auditRefund } from '@/api/pet/petRefund'

const { proxy } = getCurrentInstance()

const STATUS = [
  { value: '0', label: '待审核' },
  { value: '1', label: '已退款' },
  { value: '2', label: '已拒绝' },
  { value: '3', label: '已撤销' }
]

const refundList = ref([])
const stats = ref({})
const loading = ref(true)
const showSearch = ref(true)
const total = ref(0)

const data = reactive({
  queryParams: { pageNum: 1, pageSize: 10, keyword: undefined, status: undefined, queryDate: undefined }
})
const { queryParams } = toRefs(data)

function statusText(s) {
  return (STATUS.find((x) => x.value === s) || {}).label || '未知'
}
function statusType(s) {
  return { 0: 'warning', 1: 'success', 2: 'danger', 3: 'info' }[s] || 'info'
}
function formatMoney(v) {
  return Number(v || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmt(v) {
  return v ? String(v).replace('T', ' ').slice(5, 16) : '—'
}

function getList() {
  loading.value = true
  listRefunds(queryParams.value).then((res) => {
    refundList.value = res.rows || []
    total.value = res.total || 0
    loading.value = false
  }).catch(() => { loading.value = false })
}

function getStats() {
  refundStats().then((res) => { stats.value = res.data || {} }).catch(() => {})
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
  handleQuery()
}

function handleAudit(row, pass) {
  const isPass = pass === true
  const title = isPass ? '同意退款' : '拒绝退款'
  const msg = isPass
    ? `确认给订单 ${row.orderNo} 退款 ¥${formatMoney(row.amount)}？\n同意后订单置为「已退款」，商品库存自动退回（宠物放回在售）。`
    : `确认拒绝退款单 ${row.refundNo}？请填写拒绝理由：`

  const action = isPass
    ? ElMessageBox.confirm(msg, title, { type: 'warning', confirmButtonText: '确认退款', cancelButtonText: '再想想' })
    : ElMessageBox.prompt(msg, title, { type: 'warning', confirmButtonText: '确认拒绝', cancelButtonText: '取消', inputPlaceholder: '如：已拆封使用，不符合退货条件' })

  action
    .then((res) => {
      const remark = isPass ? '门店同意退款' : (res.value || '不符合退款条件')
      return auditRefund(row.refundId, isPass, remark)
    })
    .then((res) => {
      ElMessage.success(res.msg || '已处理')
      getList()
      getStats()
    })
    .catch(() => {})
}

onMounted(() => {
  getList()
  getStats()
})
</script>

<style scoped lang="scss">
.cell-sub { font-size: 12px; color: var(--text-3); }
.money { color: var(--brand-700); font-weight: 600; }
</style>
