<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="68px">
      <el-form-item label="项目名" prop="itemName">
        <el-input v-model="queryParams.itemName" placeholder="项目名称" clearable style="width: 180px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="类型" prop="itemType">
        <el-select v-model="queryParams.itemType" placeholder="全部类型" clearable style="width: 130px">
          <el-option v-for="t in TYPES" :key="t.value" :label="t.label" :value="t.value" />
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
        <el-button type="primary" plain icon="Plus" @click="handleAdd" v-hasPermi="['pet:serviceitem:edit']">新增项目</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="danger" plain icon="Delete" :disabled="!ids.length" @click="handleDelete" v-hasPermi="['pet:serviceitem:edit']">删除</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="itemList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="50" align="center" />
      <el-table-column label="项目名称" prop="itemName" min-width="160" />
      <el-table-column label="类型" width="96">
        <template #default="scope">
          <el-tag size="small" :type="typeTag(scope.row.itemType)">{{ typeText(scope.row.itemType) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="适用门店" width="140">
        <template #default="scope">{{ scope.row.storeName || '全门店通用' }}</template>
      </el-table-column>
      <el-table-column label="标准价" width="100">
        <template #default="scope"><span class="money">¥{{ formatMoney(scope.row.price) }}</span></template>
      </el-table-column>
      <el-table-column label="时长" width="90">
        <template #default="scope">{{ scope.row.duration }} 分钟</template>
      </el-table-column>
      <el-table-column label="排序" prop="sort" width="70" align="center" />
      <el-table-column label="状态" width="80">
        <template #default="scope">
          <el-tag size="small" :type="scope.row.status === '0' ? 'success' : 'info'">{{ scope.row.status === '0' ? '上架' : '下架' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="备注" prop="remark" min-width="160" :show-overflow-tooltip="true" />
      <el-table-column label="操作" width="130" fixed="right">
        <template #default="scope">
          <el-button link type="primary" @click="handleUpdate(scope.row)" v-hasPermi="['pet:serviceitem:edit']">修改</el-button>
          <el-button link type="danger" @click="handleDelete(scope.row)" v-hasPermi="['pet:serviceitem:edit']">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />

    <el-dialog :title="title" v-model="open" width="560px" append-to-body>
      <el-form ref="itemRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="项目名称" prop="itemName">
          <el-input v-model="form.itemName" placeholder="如：基础洗护（犬）" maxlength="64" />
        </el-form-item>
        <el-row>
          <el-col :span="12">
            <el-form-item label="项目类型" prop="itemType">
              <el-select v-model="form.itemType" style="width: 100%">
                <el-option v-for="t in TYPES" :key="t.value" :label="t.label" :value="t.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="标准价" prop="price">
              <el-input-number v-model="form.price" :min="0" :precision="2" :step="10" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="12">
            <el-form-item label="时长(分)" prop="duration">
              <el-input-number v-model="form.duration" :min="10" :step="10" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="排序" prop="sort">
              <el-input-number v-model="form.sort" :min="1" :step="1" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="适用门店" prop="storeId">
          <el-select v-model="form.storeId" placeholder="全门店通用" clearable style="width: 100%">
            <el-option v-for="s in stores" :key="s.storeId" :label="s.storeName" :value="s.storeId" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio value="0">上架</el-radio>
            <el-radio value="1">下架</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" type="textarea" :rows="2" maxlength="255" placeholder="服务内容说明" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="open = false">取消</el-button>
        <el-button type="primary" @click="submitForm">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, toRefs, getCurrentInstance, onMounted } from 'vue'
import { ElMessageBox } from 'element-plus'
import { listServiceItem, getServiceItem, addServiceItem, updateServiceItem, delServiceItem } from '@/api/pet/petService'
import { storeOptions } from '@/api/pet/petStore'

const { proxy } = getCurrentInstance()

const TYPES = [
  { value: '1', label: '洗护' },
  { value: '2', label: '美容' },
  { value: '3', label: '寄养' },
  { value: '4', label: '医疗' },
  { value: '5', label: '训练' },
  { value: '6', label: '接待' }
]

const itemList = ref([])
const stores = ref([])
const loading = ref(true)
const showSearch = ref(true)
const ids = ref([])
const total = ref(0)
const open = ref(false)
const title = ref('')

const data = reactive({
  form: {},
  queryParams: { pageNum: 1, pageSize: 10, itemName: undefined, itemType: undefined, status: undefined },
  rules: {
    itemName: [{ required: true, message: '项目名称不能为空', trigger: 'blur' }],
    itemType: [{ required: true, message: '请选择项目类型', trigger: 'change' }],
    price: [{ required: true, message: '请填写标准价', trigger: 'blur' }]
  }
})
const { queryParams, form, rules } = toRefs(data)

function typeText(t) {
  return (TYPES.find((x) => x.value === t) || {}).label || '其他'
}
function typeTag(t) {
  return { 1: 'primary', 2: 'warning', 3: 'success', 4: 'danger', 5: 'info', 6: '' }[t] || ''
}
function formatMoney(v) {
  return Number(v || 0).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

function getList() {
  loading.value = true
  listServiceItem(queryParams.value).then((res) => {
    itemList.value = res.rows || []
    total.value = res.total || 0
    loading.value = false
  }).catch(() => { loading.value = false })
}

function handleQuery() {
  queryParams.value.pageNum = 1
  getList()
}

function resetQuery() {
  proxy.resetForm('queryRef')
  handleQuery()
}

function handleSelectionChange(selection) {
  ids.value = selection.map((i) => i.itemId)
}

function resetForm() {
  form.value = {
    itemId: undefined,
    itemName: undefined,
    itemType: '1',
    price: 88,
    duration: 60,
    storeId: stores.value.length === 1 ? stores.value[0].storeId : undefined,
    sort: 99,
    status: '0',
    remark: undefined
  }
}

function handleAdd() {
  resetForm()
  title.value = '新增服务项目'
  open.value = true
}

function handleUpdate(row) {
  resetForm()
  getServiceItem(row.itemId).then((res) => {
    form.value = res.data
    title.value = '修改服务项目'
    open.value = true
  })
}

function submitForm() {
  proxy.$refs['itemRef'].validate((valid) => {
    if (!valid) return
    const action = form.value.itemId ? updateServiceItem : addServiceItem
    action(form.value).then((res) => {
      proxy.$modal.msgSuccess(res.msg || '保存成功')
      open.value = false
      getList()
    })
  })
}

function handleDelete(row) {
  const deleteIds = row.itemId ? [row.itemId] : ids.value
  ElMessageBox.confirm('确认删除选中的 ' + deleteIds.length + ' 个服务项目？', '提示', { type: 'warning' })
    .then(() => delServiceItem(deleteIds.join(',')))
    .then(() => {
      proxy.$modal.msgSuccess('删除成功')
      getList()
    })
    .catch(() => {})
}

onMounted(() => {
  getList()
  storeOptions().then((res) => { stores.value = res.data || [] }).catch(() => {})
})
</script>

<style scoped>
.money { color: var(--brand-700); font-weight: 600; }
</style>
