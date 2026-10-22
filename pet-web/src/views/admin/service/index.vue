<template>
  <div class="app-container">
    <!-- 今日概览 -->
    <StatCards :cols="6" :items="[
      { label: '今日工单', value: stats.total || 0 },
      { label: '待接单', value: stats.pending || 0, tone: 'warn', onClick: () => filterStatus('0') },
      { label: '服务中', value: stats.serving || 0, tone: 'brand', onClick: () => filterStatus('2') },
      { label: '已完成', value: stats.finished || 0, tone: 'success', onClick: () => filterStatus('3') },
      { label: '取消 / 爽约', value: (stats.canceled || 0) + (stats.missed || 0) },
      { label: '今日服务营收', value: formatMoney(stats.revenue), prefix: '¥', tone: 'money' }
    ]" />

    <!-- 搜索 -->
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="80px">
      <el-form-item label="关键词" prop="petName">
        <el-input v-model="queryParams.petName" placeholder="工单号 / 客户 / 宠物" clearable style="width: 210px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="门店" prop="storeId" v-if="stores.length > 1">
        <el-select v-model="queryParams.storeId" placeholder="全部门店" clearable style="width: 160px">
          <el-option v-for="s in stores" :key="s.storeId" :label="s.storeName" :value="s.storeId" />
        </el-select>
      </el-form-item>
      <el-form-item label="到店日期" prop="queryDate">
        <el-date-picker v-model="queryParams.queryDate" type="date" value-format="YYYY-MM-DD" placeholder="全部日期" style="width: 150px" />
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="全部状态" clearable style="width: 130px">
          <el-option v-for="s in STATUS" :key="s.value" :label="s.label" :value="s.value" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-table v-loading="loading" :data="orderList">
      <el-table-column label="工单号" prop="serviceNo" width="180" />
      <el-table-column label="客户 / 宠物" min-width="150">
        <template #default="scope">
          <div class="cell-main">{{ scope.row.customerName || '—' }}</div>
          <div class="cell-sub">{{ scope.row.petName || '—' }}</div>
        </template>
      </el-table-column>
      <el-table-column label="服务项目" prop="itemName" min-width="130" :show-overflow-tooltip="true" />
      <el-table-column label="门店" prop="storeName" width="120" :show-overflow-tooltip="true" />
      <el-table-column label="到店时间" width="140">
        <template #default="scope">{{ fmt(scope.row.appointTime) }}</template>
      </el-table-column>
      <el-table-column label="执行人" width="92">
        <template #default="scope">
          <span :class="{ muted: !scope.row.staffName }">{{ scope.row.staffName || '未指派' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="金额" width="88">
        <template #default="scope">
          <span class="money">¥{{ formatMoney(scope.row.price) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="96">
        <template #default="scope">
          <el-tag size="small" :type="statusType(scope.row.status)">{{ statusText(scope.row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="230" fixed="right" class-name="small-padding fixed-width">
        <template #default="scope">
          <el-button link type="primary" @click="openDetail(scope.row)">详情</el-button>
          <el-button
            v-if="scope.row.status === '0' || (scope.row.status === '1' && !scope.row.staffId)"
            link type="primary" @click="openDispatch(scope.row)" v-hasPermi="['pet:service:dispatch']"
          >派工</el-button>
          <el-button
            v-if="scope.row.status === '1'" link type="primary" @click="handleStart(scope.row)" v-hasPermi="['pet:service:dispatch']"
          >开始</el-button>
          <el-button
            v-if="scope.row.status === '1' || scope.row.status === '2'" link type="success" @click="handleFinish(scope.row)" v-hasPermi="['pet:service:finish']"
          >完成</el-button>
          <el-button
            v-if="['0','1','2'].includes(scope.row.status)" link type="danger" @click="handleCancel(scope.row)" v-hasPermi="['pet:service:cancel']"
          >取消</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />

    <!-- 派工 -->
    <el-dialog title="派工 / 接单" v-model="dispatchOpen" width="440px" append-to-body>
      <el-form label-width="80px">
        <el-form-item label="工单">
          <span>{{ dispatchRow.serviceNo }} · {{ dispatchRow.petName || '宠物' }}</span>
        </el-form-item>
        <el-form-item label="执行员工">
          <el-select v-model="dispatchStaff" placeholder="选择员工" style="width: 100%">
            <el-option v-for="s in staffList" :key="s.staffId" :label="s.staffName + '（' + (s.post || '员工') + '）'" :value="s.staffId" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dispatchOpen = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitDispatch">确认派工</el-button>
      </template>
    </el-dialog>

    <!-- 详情 -->
    <el-drawer v-model="detailOpen" title="工单详情" size="480px">
      <div v-loading="detailLoading" class="detail">
        <div class="detail-head">
          <div>
            <p class="no">{{ detail.serviceNo }}</p>
            <p class="sub">{{ detail.storeName }} · {{ detail.itemName }}</p>
          </div>
          <el-tag :type="statusType(detail.status)">{{ statusText(detail.status) }}</el-tag>
        </div>
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="客户">{{ detail.customerName || '—' }}</el-descriptions-item>
          <el-descriptions-item label="宠物">{{ detail.petName || '—' }}</el-descriptions-item>
          <el-descriptions-item label="到店时间">{{ fmt(detail.appointTime) }}</el-descriptions-item>
          <el-descriptions-item label="执行人">{{ detail.staffName || '未指派' }}</el-descriptions-item>
          <el-descriptions-item label="金额">¥{{ formatMoney(detail.price) }}</el-descriptions-item>
          <el-descriptions-item label="收费">{{ detail.payStatus === '1' ? '已收' : '未收' }}</el-descriptions-item>
          <el-descriptions-item label="开始时间">{{ fmt(detail.startTime) }}</el-descriptions-item>
          <el-descriptions-item label="完成时间">{{ fmt(detail.finishTime) }}</el-descriptions-item>
          <el-descriptions-item label="客户评价" :span="2">
            <el-rate v-if="detail.score" :model-value="detail.score" disabled size="small" />
            <span class="muted" v-if="detail.comment">　{{ detail.comment }}</span>
            <span class="muted" v-if="!detail.score">暂无评价</span>
          </el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{ detail.remark || '—' }}</el-descriptions-item>
        </el-descriptions>

        <p class="section-title">流转记录</p>
        <el-timeline>
          <el-timeline-item
            v-for="log in logs" :key="log.logId"
            :timestamp="fmt(log.createTime)" placement="top"
            :type="log.toStatus === '3' ? 'success' : (log.toStatus === '4' ? 'danger' : 'primary')"
          >
            <span class="log-title">{{ statusText(log.toStatus) }}</span>
            <span class="muted">　{{ log.operator }}</span>
            <p class="log-remark" v-if="log.remark">{{ log.remark }}</p>
          </el-timeline-item>
          <el-timeline-item v-if="!logs.length" timestamp="—">暂无记录</el-timeline-item>
        </el-timeline>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import StatCards from '@/components/StatCards.vue'
import { ref, reactive, toRefs, getCurrentInstance, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  listServiceOrder, getServiceOrder, getServiceStats,
  dispatchServiceOrder, startServiceOrder, finishServiceOrder, cancelServiceOrder
} from '@/api/pet/petService'
import { storeOptions, listStoreStaff } from '@/api/pet/petStore'

const { proxy } = getCurrentInstance()

const STATUS = [
  { value: '0', label: '待接单' },
  { value: '1', label: '已接单' },
  { value: '2', label: '服务中' },
  { value: '3', label: '已完成' },
  { value: '4', label: '已取消' },
  { value: '5', label: '爽约' }
]

const orderList = ref([])
const stores = ref([])
const loading = ref(true)
const showSearch = ref(true)
const total = ref(0)
const stats = ref({})

const dispatchOpen = ref(false)
const dispatchRow = ref({})
const dispatchStaff = ref(null)
const staffList = ref([])
const submitting = ref(false)

const detailOpen = ref(false)
const detailLoading = ref(false)
const detail = ref({})
const logs = ref([])

const data = reactive({
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    petName: undefined,
    storeId: undefined,
    status: undefined,
    queryDate: undefined
  }
})
const { queryParams } = toRefs(data)

function statusText(s) {
  return (STATUS.find((x) => x.value === s) || {}).label || '未知'
}
function statusType(s) {
  return { 0: 'warning', 1: 'primary', 2: 'success', 3: 'success', 4: 'info', 5: 'danger' }[s] || 'info'
}
function fmt(v) {
  if (!v) return '—'
  return String(v).replace('T', ' ').slice(5, 16)
}
function formatMoney(v) {
  return Number(v || 0).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

function getList() {
  loading.value = true
  listServiceOrder(queryParams.value).then((res) => {
    orderList.value = res.rows || []
    total.value = res.total || 0
    loading.value = false
  }).catch(() => { loading.value = false })
}

function getStats() {
  getServiceStats().then((res) => { stats.value = res.data || {} }).catch(() => {})
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

async function openDispatch(row) {
  dispatchRow.value = row
  dispatchStaff.value = row.staffId || null
  dispatchOpen.value = true
  staffList.value = []
  if (row.storeId) {
    try {
      const res = await listStoreStaff(row.storeId)
      staffList.value = (res.data || []).filter((s) => s.status === '0')
    } catch (e) {
      staffList.value = []
    }
  }
}

function submitDispatch() {
  if (!dispatchStaff.value) {
    ElMessage.warning('请选择执行员工')
    return
  }
  const staff = staffList.value.find((s) => s.staffId === dispatchStaff.value)
  submitting.value = true
  dispatchServiceOrder(dispatchRow.value.serviceId, {
    staffId: dispatchStaff.value,
    staffName: staff ? staff.staffName : ''
  }).then((res) => {
    ElMessage.success(res.msg || '派工成功')
    dispatchOpen.value = false
    getList()
    getStats()
  }).catch((e) => {
    ElMessage.error(e?.msg || '派工失败')
  }).finally(() => { submitting.value = false })
}

function handleStart(row) {
  ElMessageBox.confirm(`确认开始「${row.itemName}」的服务？`, '开始服务', { type: 'info' })
    .then(() => startServiceOrder(row.serviceId))
    .then((res) => {
      ElMessage.success(res.msg || '已开始服务')
      getList()
      getStats()
    })
    .catch(() => {})
}

function handleFinish(row) {
  ElMessageBox.prompt('服务完成，填写本次服务备注（选填）：', '完成服务', {
    confirmButtonText: '确认完成',
    cancelButtonText: '取消',
    inputPlaceholder: '如：洗护完成，客户已接走'
  }).then(({ value }) => finishServiceOrder(row.serviceId, value || ''))
    .then((res) => {
      ElMessage.success(res.msg || '工单已完成')
      getList()
      getStats()
    })
    .catch(() => {})
}

function handleCancel(row) {
  ElMessageBox.prompt('取消工单，请填写原因：', '取消工单', {
    confirmButtonText: '确认取消',
    cancelButtonText: '再想想',
    inputPlaceholder: '如：客户改期 / 宠物状态不适合'
  }).then(({ value }) => cancelServiceOrder(row.serviceId, value || ''))
    .then((res) => {
      ElMessage.success(res.msg || '工单已取消')
      getList()
      getStats()
    })
    .catch(() => {})
}

function openDetail(row) {
  detailOpen.value = true
  detailLoading.value = true
  logs.value = []
  getServiceOrder(row.serviceId).then((res) => {
    detail.value = res.data || {}
    logs.value = res.logs || []
    detailLoading.value = false
  }).catch(() => { detailLoading.value = false })
}

onMounted(() => {
  getList()
  getStats()
  storeOptions().then((res) => { stores.value = res.data || [] }).catch(() => {})
})
</script>

<style scoped lang="scss">
.cell-main { font-size: 13px; color: var(--text-1); }
.cell-sub { font-size: 12px; color: var(--text-3); }
.muted { color: var(--text-3); }
.money { color: var(--brand-700); font-weight: 600; }
.detail-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px;
  .no { margin: 0; font-size: 16px; font-weight: 600; color: var(--text-1); }
  .sub { margin: 4px 0 0; font-size: 12px; color: var(--text-3); }
}
.section-title { margin: 22px 0 12px; font-size: 14px; font-weight: 600; color: var(--text-1); }
.log-title { font-size: 13px; color: var(--text-1); }
.log-remark { margin: 2px 0 0; font-size: 12px; color: var(--text-3); }
</style>
