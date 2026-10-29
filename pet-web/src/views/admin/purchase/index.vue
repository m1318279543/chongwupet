<template>
  <div class="app-container">
    <StatCards :items="[
      { label: '待入库', value: stats.pending || 0, tone: 'warn', onClick: () => filterStatus('0') },
      { label: '今日入库额', value: money(stats.inboundAmount, 2), prefix: '¥', tone: 'money' },
      { label: '已入库单数', value: stats.inboundCount || 0, tone: 'success', onClick: () => filterStatus('1') },
      { label: '低库存商品（≤10）', value: stats.lowStock || 0, tone: 'danger', onClick: () => handleCreate(true) }
    ]" />

    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="72px">
      <el-form-item label="关键词" prop="keyword">
        <el-input v-model="queryParams.keyword" placeholder="采购单号 / 供应商" clearable style="width: 210px"
                  @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="全部" clearable style="width: 120px">
          <el-option v-for="s in STATUS" :key="s.value" :label="s.label" :value="s.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="建单日期" prop="queryDate">
        <el-date-picker v-model="queryParams.queryDate" type="date" value-format="YYYY-MM-DD" placeholder="全部日期"
                        style="width: 150px" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" plain icon="Plus" @click="handleCreate(false)">新建采购单</el-button>
      </el-form-item>
    </el-form>

    <el-table v-loading="loading" :data="purchaseList">
      <el-table-column label="采购单号" prop="purchaseNo" width="190" />
      <el-table-column label="供应商" prop="supplier" width="140" :show-overflow-tooltip="true" />
      <el-table-column label="门店" prop="storeName" width="130" :show-overflow-tooltip="true" />
      <el-table-column label="商品" min-width="200">
        <template #default="scope">
          <div class="cell-main">{{ firstGoods(scope.row) }}</div>
          <div class="ui-cell-sub">{{ scope.row.itemCount }} 种 · {{ scope.row.totalQty }} 件</div>
        </template>
      </el-table-column>
      <el-table-column label="采购金额" width="110">
        <template #default="scope"><span class="ui-money">¥{{ money(scope.row.totalAmount, 2) }}</span></template>
      </el-table-column>
      <el-table-column label="状态" width="96">
        <template #default="scope">
          <el-tag size="small" :type="statusType(scope.row.status)">{{ enumText(STATUS, scope.row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="建单时间" width="120">
        <template #default="scope">{{ fmtShort(scope.row.createTime) }}</template>
      </el-table-column>
      <el-table-column label="入库时间" width="120">
        <template #default="scope">{{ fmtShort(scope.row.inboundTime) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="170" fixed="right" class-name="small-padding fixed-width">
        <template #default="scope">
          <el-button link type="primary" @click="openDetail(scope.row)">详情</el-button>
          <el-button v-if="scope.row.status === '0'" link type="success" @click="handleInbound(scope.row)"
                     v-hasPermi="['pet:purchase:inbound']">入库</el-button>
          <el-button v-if="scope.row.status === '0'" link type="danger" @click="handleCancel(scope.row)">取消</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum"
                v-model:limit="queryParams.pageSize" @pagination="getList" />

    <!-- 新建采购单 -->
    <el-dialog v-model="createOpen" title="新建采购单" width="760px" align-center :close-on-click-modal="false">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="88px">
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="供应商" prop="supplier">
              <el-input v-model="form.supplier" placeholder="如：宠乐供应链" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="预计到货">
              <el-date-picker v-model="form.expectTime" type="date" value-format="YYYY-MM-DD"
                              placeholder="选填" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="备注">
          <el-input v-model="form.remark" placeholder="选填" />
        </el-form-item>

        <div class="line-head">
          <span>采购明细</span>
          <div>
            <el-button size="small" plain type="warning" @click="fillFromLowStock" :loading="lowLoading">
              按低库存带出
            </el-button>
            <el-button size="small" plain type="primary" @click="addLine">添加一行</el-button>
          </div>
        </div>

        <el-table :data="form.items" size="small" border empty-text="点「按低库存带出」或「添加一行」">
          <el-table-column label="商品" min-width="230">
            <template #default="scope">
              <el-select v-model="scope.row.goodsId" filterable remote :remote-method="loadGoods"
                         placeholder="输入名称或编码搜索" style="width: 100%"
                         @change="(v) => onGoodsChange(scope.row, v)">
                <el-option v-for="g in goodsOptions" :key="g.goodsId"
                           :label="`${g.goodsName}${g.spec ? ' · ' + g.spec : ''}`" :value="g.goodsId" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="当前库存" width="88" align="center">
            <template #default="scope">{{ stockOf(scope.row.goodsId) }}</template>
          </el-table-column>
          <el-table-column label="进价" width="120">
            <template #default="scope">
              <el-input-number v-model="scope.row.costPrice" :min="0" :precision="2" :controls="false"
                               size="small" style="width: 100%" />
            </template>
          </el-table-column>
          <el-table-column label="数量" width="110">
            <template #default="scope">
              <el-input-number v-model="scope.row.qty" :min="1" :max="9999" size="small" style="width: 100%" />
            </template>
          </el-table-column>
          <el-table-column label="小计" width="96" align="right">
            <template #default="scope">¥{{ money(lineAmount(scope.row), 2) }}</template>
          </el-table-column>
          <el-table-column label="" width="52" align="center">
            <template #default="scope">
              <el-button link type="danger" @click="form.items.splice(scope.$index, 1)">删</el-button>
            </template>
          </el-table-column>
        </el-table>

        <p class="total-line">
          共 {{ form.items.length }} 种 · {{ totalQty }} 件，合计
          <b>¥{{ money(totalAmount, 2) }}</b>
        </p>
      </el-form>

      <template #footer>
        <el-button round @click="createOpen = false">取消</el-button>
        <el-button type="primary" round :loading="saving" @click="submitCreate">创建采购单</el-button>
      </template>
    </el-dialog>

    <!-- 详情 -->
    <el-drawer v-model="detailOpen" title="采购单详情" size="620px">
      <div v-loading="detailLoading" class="detail">
        <div class="detail-head">
          <div>
            <p class="no">{{ detail.purchaseNo }}</p>
            <p class="sub">{{ detail.supplier || '—' }} · {{ detail.storeName || '—' }}</p>
          </div>
          <el-tag :type="statusType(detail.status)">{{ enumText(STATUS, detail.status) }}</el-tag>
        </div>
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="商品种数">{{ detail.itemCount || 0 }}</el-descriptions-item>
          <el-descriptions-item label="采购件数">{{ detail.totalQty || 0 }}</el-descriptions-item>
          <el-descriptions-item label="采购金额">¥{{ money(detail.totalAmount, 2) }}</el-descriptions-item>
          <el-descriptions-item label="预计到货">{{ fmtDate(detail.expectTime) }}</el-descriptions-item>
          <el-descriptions-item label="建单人">{{ detail.createBy || '—' }}</el-descriptions-item>
          <el-descriptions-item label="建单时间">{{ fmtShort(detail.createTime) }}</el-descriptions-item>
          <el-descriptions-item label="入库人">{{ detail.inboundBy || '—' }}</el-descriptions-item>
          <el-descriptions-item label="入库时间">{{ fmtShort(detail.inboundTime) }}</el-descriptions-item>
          <el-descriptions-item v-if="detail.remark" label="备注" :span="2">{{ detail.remark }}</el-descriptions-item>
        </el-descriptions>

        <p class="section-title">采购明细</p>
        <el-table :data="detail.items || []" size="small" border>
          <el-table-column label="商品" min-width="170">
            <template #default="scope">
              <div class="cell-main">{{ scope.row.goodsName }}</div>
              <div class="ui-cell-sub">{{ scope.row.spec }}</div>
            </template>
          </el-table-column>
          <el-table-column label="进价" width="90" align="right">
            <template #default="scope">¥{{ money(scope.row.costPrice, 2) }}</template>
          </el-table-column>
          <el-table-column label="数量" prop="qty" width="66" align="center" />
          <el-table-column label="小计" width="96" align="right">
            <template #default="scope"><span class="ui-money">¥{{ money(scope.row.amount, 2) }}</span></template>
          </el-table-column>
          <el-table-column label="入库前库存" width="96" align="center">
            <template #default="scope">{{ scope.row.stockBefore != null ? scope.row.stockBefore : '—' }}</template>
          </el-table-column>
        </el-table>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import StatCards from '@/components/StatCards.vue'
import { ref, reactive, computed, toRefs, getCurrentInstance, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { listPurchases, getPurchase, purchaseStats, addPurchase, inboundPurchase, cancelPurchase } from '@/api/pet/petPurchase'
import { listGoods, getLowStock } from '@/api/pet/petGoods'
import { money, fmtShort, enumText } from '@/utils/format'

const { proxy } = getCurrentInstance()

const STATUS = [
  { value: '0', label: '待入库' },
  { value: '1', label: '已入库' },
  { value: '2', label: '已取消' }
]

const purchaseList = ref([])
const stats = ref({})
const loading = ref(true)
const showSearch = ref(true)
const total = ref(0)

const createOpen = ref(false)
const saving = ref(false)
const lowLoading = ref(false)
const formRef = ref()
const goodsOptions = ref([])
const form = reactive({ supplier: '', expectTime: null, remark: '', items: [] })
const rules = { supplier: [{ required: true, message: '请填写供应商', trigger: 'blur' }] }

const detailOpen = ref(false)
const detailLoading = ref(false)
const detail = ref({})

const data = reactive({
  queryParams: { pageNum: 1, pageSize: 10, keyword: undefined, status: undefined, queryDate: undefined }
})
const { queryParams } = toRefs(data)

const totalQty = computed(() => form.items.reduce((s, i) => s + (Number(i.qty) || 0), 0))
const totalAmount = computed(() => form.items.reduce((s, i) => s + lineAmount(i), 0))

function statusType(s) {
  return { 0: 'warning', 1: 'success', 2: 'info' }[s] || 'info'
}
function fmtDate(v) {
  return v ? String(v).slice(0, 10) : '—'
}
function firstGoods(row) {
  const items = row.items || []
  if (!items.length) return '—'
  return items.length > 1 ? `${items[0].goodsName} 等 ${items.length} 种` : items[0].goodsName
}
function lineAmount(row) {
  return (Number(row.costPrice) || 0) * (Number(row.qty) || 0)
}
function stockOf(goodsId) {
  const g = goodsOptions.value.find((x) => x.goodsId === goodsId)
  return g && g.stock != null ? g.stock : '—'
}

function getList() {
  loading.value = true
  listPurchases(queryParams.value).then((res) => {
    purchaseList.value = res.rows || []
    total.value = res.total || 0
    loading.value = false
  }).catch(() => { loading.value = false })
}

function getStats() {
  purchaseStats().then((res) => { stats.value = res.data || {} }).catch(() => {})
}

// 商品下拉：初始只取 20 条，输入关键词走后端模糊查询。
// 已选中的商品始终保留在选项里，否则搜索换词后已选行会显示成一个裸 id。
function mergeGoodsOptions(rows) {
  const selectedIds = new Set((form.items || []).map((i) => i.goodsId))
  const keep = goodsOptions.value.filter((g) => selectedIds.has(g.goodsId))
  const seen = new Set(keep.map((g) => g.goodsId))
  for (const g of rows || []) if (!seen.has(g.goodsId)) { keep.push(g); seen.add(g.goodsId) }
  goodsOptions.value = keep
}

function loadGoods(keyword = '') {
  listGoods({ pageNum: 1, pageSize: 20, keyword: keyword || undefined }).then((res) => {
    mergeGoodsOptions(res.rows || [])
  }).catch(() => {})
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

function handleCreate(fromLow) {
  form.supplier = ''
  form.expectTime = null
  form.remark = ''
  form.items = []
  createOpen.value = true
  if (fromLow) {
    fillFromLowStock()
  }
}

function addLine() {
  form.items.push({ goodsId: null, costPrice: null, qty: 20 })
}

function onGoodsChange(row, goodsId) {
  const g = goodsOptions.value.find((x) => x.goodsId === goodsId)
  if (g && !row.costPrice) {
    // 没有单独的成本价字段，用售价兜底，用户可改
    row.costPrice = Number(g.price) || 0
  }
}

function fillFromLowStock() {
  lowLoading.value = true
  getLowStock(10).then((res) => {
    const rows = (res.data || []).map((g) => ({
      goodsId: g.goodsId,
      costPrice: Number(g.price) || 0,
      // 补到 50 件，演示更好看
      qty: Math.max(20, 50 - (Number(g.stock) || 0))
    }))
    if (!rows.length) {
      ElMessage.info('当前没有低库存商品')
      return
    }
    form.items = rows
    // 带出的商品要进下拉选项，否则「商品」列只显示一个裸 id
    mergeGoodsOptions(res.data || [])
    if (!form.supplier) form.supplier = '宠乐供应链'
    ElMessage.success(`已带出 ${rows.length} 个低库存商品`)
  }).catch(() => {}).finally(() => { lowLoading.value = false })
}

function submitCreate() {
  formRef.value.validate((valid) => {
    if (!valid) return
    if (!form.items.length) {
      ElMessage.warning('请至少添加一个采购商品')
      return
    }
    const bad = form.items.find((i) => !i.goodsId || !i.qty)
    if (bad) {
      ElMessage.warning('请把每行的商品和数量填完整')
      return
    }
    saving.value = true
    addPurchase({ supplier: form.supplier, expectTime: form.expectTime, remark: form.remark, items: form.items })
      .then((res) => {
        ElMessage.success(res.msg || '采购单已创建')
        createOpen.value = false
        getList()
        getStats()
      })
      .catch(() => {})
      .finally(() => { saving.value = false })
  })
}

function openDetail(row) {
  detailOpen.value = true
  detailLoading.value = true
  getPurchase(row.purchaseNo).then((res) => {
    detail.value = res.data || {}
    detailLoading.value = false
  }).catch(() => { detailLoading.value = false })
}

function handleInbound(row) {
  ElMessageBox.confirm(
    `确认采购单 ${row.purchaseNo} 已到货？\n入库后 ${row.itemCount} 种商品库存将增加，并写入库存流水。`,
    '确认入库',
    { type: 'warning', confirmButtonText: '确认入库', cancelButtonText: '再等等' }
  ).then(() => inboundPurchase(row.purchaseNo))
    .then((res) => {
      ElMessage.success(res.msg || '入库完成')
      getList()
      getStats()
    })
    .catch(() => {})
}

function handleCancel(row) {
  ElMessageBox.confirm(`确认取消采购单 ${row.purchaseNo}？`, '取消采购单', { type: 'warning' })
    .then(() => cancelPurchase(row.purchaseNo))
    .then((res) => {
      ElMessage.success(res.msg || '已取消')
      getList()
      getStats()
    })
    .catch(() => {})
}

onMounted(() => {
  getList()
  getStats()
  loadGoods()
})
</script>

<style scoped lang="scss">
.cell-main { font-size: var(--fs-4); color: var(--text-1); }
.line-head {
  display: flex; justify-content: space-between; align-items: center;
  margin: 6px 0 10px; font-size: var(--fs-5); font-weight: 600; color: var(--text-1);
}
.total-line { text-align: right; margin: 10px 0 0; color: var(--text-2); b { color: var(--brand-700); font-size: var(--fs-7); } }
.detail-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px;
  .no { margin: 0; font-size: var(--fs-6); font-weight: 600; color: var(--text-1); }
  .sub { margin: 4px 0 0; font-size: var(--fs-2); color: var(--text-3); }
}
.section-title { margin: 20px 0 10px; font-size: var(--fs-5); font-weight: 600; color: var(--text-1); }
</style>
