<template>
  <div class="app-container">
    <StatCards :items="[
      { label: '商品总数', value: stats.total || 0 },
      { label: '在售', value: stats.onSale || 0, tone: 'success' },
      { label: '低库存（≤10）', value: stats.low || 0, tone: 'warn', onClick: filterLow },
      { label: '库存件数合计', value: stats.stock || 0 }
    ]" />

    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="68px">
      <el-form-item label="关键词" prop="keyword">
        <el-input v-model="queryParams.keyword" placeholder="商品名 / 编码" clearable style="width: 200px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="分类" prop="cat">
        <el-select v-model="queryParams.cat" placeholder="全部分类" clearable style="width: 130px">
          <el-option v-for="c in CATS" :key="c.value" :label="c.label" :value="c.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="全部状态" clearable style="width: 120px">
          <el-option label="上架" value="0" />
          <el-option label="下架" value="1" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button type="primary" plain icon="Plus" @click="handleAdd" v-hasPermi="['pet:goods:edit']">新增商品</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="goodsList">
      <el-table-column label="商品" min-width="240">
        <template #default="scope">
          <div class="goods-cell">
            <img :src="scope.row.image" class="thumb" v-if="scope.row.image" alt="商品图片" />
            <div>
              <div class="name">{{ scope.row.goodsName }}</div>
              <div class="code">{{ scope.row.goodsCode }} · {{ scope.row.spec }}</div>
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="分类" width="90">
        <template #default="scope">{{ catText(scope.row.cat) }}</template>
      </el-table-column>
      <el-table-column label="售价" width="96">
        <template #default="scope"><span class="money">¥{{ scope.row.price }}</span></template>
      </el-table-column>
      <el-table-column label="库存" width="110">
        <template #default="scope">
          <el-tag size="small" :type="stockType(scope.row.stock)">{{ scope.row.stock }} {{ scope.row.unit }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="86">
        <template #default="scope">
          <el-tag size="small" :type="scope.row.status === '0' ? 'success' : 'info'">{{ scope.row.status === '0' ? '上架' : '下架' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="排序" prop="sort" width="70" align="center" />
      <el-table-column label="操作" width="250" fixed="right" class-name="small-padding fixed-width">
        <template #default="scope">
          <el-button link type="primary" @click="openStock(scope.row)" v-hasPermi="['pet:stock:edit']">出入库</el-button>
          <el-button link type="primary" @click="openLogs(scope.row)">流水</el-button>
          <el-button link type="primary" @click="handleUpdate(scope.row)" v-hasPermi="['pet:goods:edit']">编辑</el-button>
          <el-button link :type="scope.row.status === '0' ? 'warning' : 'success'" @click="toggleStatus(scope.row)" v-hasPermi="['pet:goods:edit']">
            {{ scope.row.status === '0' ? '下架' : '上架' }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />

    <!-- 编辑 -->
    <el-dialog :title="title" v-model="open" width="720px" append-to-body>
      <el-form ref="goodsRef" :model="form" :rules="rules" label-width="90px">
        <el-row>
          <el-col :span="12">
            <el-form-item label="商品名称" prop="goodsName">
              <el-input v-model="form.goodsName" maxlength="120" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="商品编码" prop="goodsCode">
              <el-input v-model="form.goodsCode" placeholder="留空自动生成" maxlength="32" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="8">
            <el-form-item label="适用分类" prop="cat">
              <el-select v-model="form.cat" style="width: 100%">
                <el-option v-for="c in CATS" :key="c.value" :label="c.label" :value="c.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="售价" prop="price">
              <el-input-number v-model="form.price" :min="0" :precision="2" :step="10" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="划线价" prop="originPrice">
              <el-input-number v-model="form.originPrice" :min="0" :precision="2" :step="10" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="8">
            <el-form-item label="规格" prop="spec">
              <el-input v-model="form.spec" placeholder="如 1.5kg / 袋" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="单位" prop="unit">
              <el-input v-model="form.unit" placeholder="袋 / 件" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item :label="form.goodsId ? '库存(只读)' : '期初库存'" prop="stock">
              <el-input-number v-model="form.stock" :min="0" :step="10" :disabled="!!form.goodsId" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="12">
            <el-form-item label="适用阶段" prop="stage">
              <el-input v-model="form.stage" placeholder="如 成年猫" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="排序" prop="sort">
              <el-input-number v-model="form.sort" :min="1" :step="1" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="主图" prop="image">
          <el-input v-model="form.image" placeholder="/images/food/xxx.webp" />
        </el-form-item>
        <el-form-item label="简介" prop="description">
          <el-input v-model="form.description" type="textarea" :rows="2" maxlength="200" show-word-limit />
        </el-form-item>
        <el-form-item label="卖点" prop="tags">
          <el-input v-model="form.tags" placeholder="多个用英文逗号分隔，如：无谷低敏,高肉含量" />
        </el-form-item>
        <el-form-item label="营养指标" prop="nutrition">
          <el-input v-model="form.nutrition" />
        </el-form-item>
        <el-form-item label="喂食建议" prop="feeding">
          <el-input v-model="form.feeding" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="储存方式" prop="storage">
          <el-input v-model="form.storage" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio value="0">上架</el-radio>
            <el-radio value="1">下架</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="open = false">取消</el-button>
        <el-button type="primary" @click="submitForm">确定</el-button>
      </template>
    </el-dialog>

    <!-- 出入库 -->
    <el-dialog title="库存调整" v-model="stockOpen" width="480px" append-to-body>
      <el-form label-width="86px">
        <el-form-item label="商品">
          <span>{{ stockRow.goodsName }}（当前 {{ stockRow.stock }} {{ stockRow.unit }}）</span>
        </el-form-item>
        <el-form-item label="类型">
          <el-radio-group v-model="stockForm.changeType">
            <el-radio value="1">入库</el-radio>
            <el-radio value="2">销售出库</el-radio>
            <el-radio value="3">退货入库</el-radio>
            <el-radio value="4">盘亏</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="数量">
          <el-input-number v-model="stockForm.qty" :min="1" :step="1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="stockForm.remark" placeholder="如：供应商补货 / 盘点差异" maxlength="100" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="stockOpen = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitStock">确认</el-button>
      </template>
    </el-dialog>

    <!-- 库存流水 -->
    <el-drawer v-model="logsOpen" :title="'库存流水 · ' + logsRow.goodsName" size="560px">
      <el-table :data="logs" v-loading="logsLoading" size="small">
        <el-table-column label="时间" width="150">
          <template #default="scope">{{ fmt(scope.row.createTime) }}</template>
        </el-table-column>
        <el-table-column label="类型" width="90">
          <template #default="scope">
            <el-tag size="small" :type="typeTag(scope.row.changeType)">{{ typeText(scope.row.changeType) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="数量" width="80" align="center">
          <template #default="scope">
            <span :class="inType(scope.row.changeType) ? 'up' : 'down'">
              {{ inType(scope.row.changeType) ? '+' : '-' }}{{ scope.row.qty }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="前后库存" width="110" align="center">
          <template #default="scope">{{ scope.row.beforeQty }} → {{ scope.row.afterQty }}</template>
        </el-table-column>
        <el-table-column label="说明" min-width="140" :show-overflow-tooltip="true">
          <template #default="scope">{{ scope.row.remark || scope.row.bizNo || '—' }}</template>
        </el-table-column>
      </el-table>
    </el-drawer>
  </div>
</template>

<script setup>
import StatCards from '@/components/StatCards.vue'
import { ref, reactive, toRefs, getCurrentInstance, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { listGoods, getGoodsStats, getGoods, addGoods, updateGoods, listStockLogs, changeStock } from '@/api/pet/petGoods'

const { proxy } = getCurrentInstance()

const CATS = [
  { value: 'cat', label: '猫咪' },
  { value: 'dog', label: '狗狗' },
  { value: 'rabbit', label: '兔子' },
  { value: 'hamster', label: '仓鼠' },
  { value: 'bird', label: '鸟类' },
  { value: 'fish', label: '水族' },
  { value: 'reptile', label: '爬行宠物' }
]

const goodsList = ref([])
const stats = ref({})
const loading = ref(true)
const showSearch = ref(true)
const total = ref(0)
const open = ref(false)
const title = ref('')

const stockOpen = ref(false)
const stockRow = ref({})
const submitting = ref(false)
const stockForm = reactive({ goodsId: null, skuId: null, changeType: '1', qty: 10, remark: '' })

const logsOpen = ref(false)
const logsRow = ref({})
const logs = ref([])
const logsLoading = ref(false)

const data = reactive({
  form: {},
  queryParams: { pageNum: 1, pageSize: 10, keyword: undefined, cat: undefined, status: undefined },
  rules: {
    goodsName: [{ required: true, message: '商品名称不能为空', trigger: 'blur' }],
    price: [{ required: true, message: '请填写售价', trigger: 'blur' }]
  }
})
const { queryParams, form, rules } = toRefs(data)

function catText(v) {
  return (CATS.find((c) => c.value === v) || {}).label || '—'
}
function stockType(v) {
  const n = Number(v || 0)
  if (n <= 0) return 'danger'
  if (n <= 10) return 'warning'
  return 'success'
}
function typeText(t) {
  return { 1: '采购入库', 2: '销售出库', 3: '取消回补', 4: '盘亏', 5: '退款入库' }[t] || '其他'
}
function typeTag(t) {
  return { 1: 'success', 2: 'warning', 3: 'success', 4: 'danger', 5: 'info' }[t] || 'info'
}
function inType(t) {
  return t === '1' || t === '3' || t === '5'
}
function fmt(v) {
  return v ? String(v).replace('T', ' ').slice(5, 16) : '—'
}

function getList() {
  loading.value = true
  listGoods(queryParams.value).then((res) => {
    goodsList.value = res.rows || []
    total.value = res.total || 0
    loading.value = false
    loadStats()
  }).catch(() => { loading.value = false })
}

// 概览由后端一条 SQL 汇总（不是当前页，也不是前端拉 500 条自己数）
function loadStats() {
  getGoodsStats().then((res) => {
    const d = res.data || {}
    stats.value = {
      total: Number(d.total || 0),
      onSale: Number(d.onSale || 0),
      low: Number(d.low || 0),
      stock: Number(d.stock || 0)
    }
  }).catch(() => {})
}

function handleQuery() {
  queryParams.value.pageNum = 1
  getList()
}

function resetQuery() {
  proxy.resetForm('queryRef')
  queryParams.value.lowStock = undefined
  handleQuery()
}

function filterLow() {
  queryParams.value.pageNum = 1
  listGoods({ lowStock: 10, pageNum: 1, pageSize: 200 }).then((res) => {
    goodsList.value = res.rows || []
    total.value = res.total || 0
    loadStats()
  })
}

function resetForm() {
  form.value = {
    goodsId: undefined,
    goodsCode: undefined,
    goodsName: undefined,
    cat: 'cat',
    goodsType: '1',
    spec: '1.5kg / 袋',
    price: 99,
    originPrice: 129,
    stock: 50,
    unit: '袋',
    image: '/images/food/Professional_e_commerce_produc_2026-10-12T12-00-51.webp',
    stage: undefined,
    description: undefined,
    tags: undefined,
    nutrition: undefined,
    feeding: undefined,
    storage: undefined,
    status: '0',
    sort: 99
  }
}

function handleAdd() {
  resetForm()
  title.value = '新增商品'
  open.value = true
}

function handleUpdate(row) {
  getGoods(row.goodsId).then((res) => {
    form.value = res.data
    title.value = '编辑商品'
    open.value = true
  })
}

function submitForm() {
  proxy.$refs['goodsRef'].validate((valid) => {
    if (!valid) return
    const action = form.value.goodsId ? updateGoods : addGoods
    action(form.value).then((res) => {
      proxy.$modal.msgSuccess(res.msg || '保存成功')
      open.value = false
      getList()
    })
  })
}

function toggleStatus(row) {
  const next = row.status === '0' ? '1' : '0'
  const word = next === '1' ? '下架' : '上架'
  ElMessageBox.confirm(`确认${word}「${row.goodsName}」？`, '提示', { type: 'warning' })
    .then(() => updateGoods({ goodsId: row.goodsId, status: next }))
    .then(() => {
      proxy.$modal.msgSuccess(word + '成功')
      getList()
    })
    .catch(() => {})
}

function openStock(row) {
  stockRow.value = row
  stockForm.goodsId = row.goodsId
  stockForm.skuId = row.skus && row.skus.length ? row.skus[0].skuId : null
  stockForm.changeType = '1'
  stockForm.qty = 10
  stockForm.remark = ''
  stockOpen.value = true
  // 列表接口不带 SKU，这里补一次详情拿到默认 SKU
  getGoods(row.goodsId).then((res) => {
    const skus = res.data?.skus || []
    if (skus.length) stockForm.skuId = skus[0].skuId
  })
}

function submitStock() {
  submitting.value = true
  changeStock(stockForm).then((res) => {
    proxy.$modal.msgSuccess(res.msg || '库存已更新')
    stockOpen.value = false
    getList()
  }).catch(() => {}).finally(() => { submitting.value = false })
}

function openLogs(row) {
  logsRow.value = row
  logsOpen.value = true
  logsLoading.value = true
  listStockLogs({ goodsId: row.goodsId, pageNum: 1, pageSize: 100 }).then((res) => {
    logs.value = res.rows || []
    logsLoading.value = false
  }).catch(() => { logsLoading.value = false })
}

onMounted(getList)
</script>

<style scoped lang="scss">
.goods-cell { display: flex; align-items: center; gap: 10px;
  .thumb { width: 42px; height: 42px; border-radius: 6px; object-fit: cover; background: var(--bg-page); }
  .name { font-size: 13px; color: var(--text-1); }
  .code { font-size: 12px; color: var(--text-3); margin-top: 2px; }
}
.money { color: var(--brand-700); font-weight: 600; }
.up { color: var(--success-500); font-weight: 600; }
.down { color: var(--danger-500); font-weight: 600; }
</style>
