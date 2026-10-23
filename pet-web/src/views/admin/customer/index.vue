<template>
  <div class="app-container">
    <!-- 搜索栏 -->
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="68px">
      <el-form-item label="客户" prop="customerName">
        <el-input v-model="queryParams.customerName" placeholder="姓名 / 手机号" clearable style="width: 200px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="门店" prop="storeId">
        <el-select v-model="queryParams.storeId" placeholder="全部门店" clearable style="width: 180px">
          <el-option v-for="s in stores" :key="s.storeId" :label="s.storeName" :value="s.storeId" />
        </el-select>
      </el-form-item>
      <el-form-item label="等级" prop="level">
        <el-select v-model="queryParams.level" placeholder="全部等级" clearable style="width: 130px">
          <el-option v-for="l in LEVELS" :key="l" :label="l" :value="l" />
        </el-select>
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="全部状态" clearable style="width: 130px">
          <el-option label="正常" value="0" />
          <el-option label="流失" value="1" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <!-- 操作栏 -->
    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button type="primary" plain icon="Plus" @click="handleAdd" v-hasPermi="['pet:customer:add']">新增客户</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="success" plain icon="Edit" :disabled="single" @click="handleUpdate" v-hasPermi="['pet:customer:edit']">修改</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete" v-hasPermi="['pet:customer:remove']">删除</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <!-- 表格 -->
    <el-table v-loading="loading" :data="customerList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column label="编号" align="center" prop="customerCode" width="110" />
      <el-table-column label="客户" align="center" prop="customerName" width="90" />
      <el-table-column label="手机号" align="center" prop="phone" width="118" />
      <el-table-column label="归属门店" align="center" prop="storeName" min-width="130" :show-overflow-tooltip="true" />
      <el-table-column label="等级" align="center" prop="level" width="76">
        <template #default="scope">
          <el-tag size="small" :type="levelType(scope.row.level)">{{ scope.row.level }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="来源" align="center" prop="source" width="86" />
      <el-table-column label="名下宠物" align="center" width="86">
        <template #default="scope">
          <el-button link type="primary" @click="openPets(scope.row)">{{ scope.row.petCount || 0 }} 只</el-button>
        </template>
      </el-table-column>
      <el-table-column label="订单" align="center" prop="orderCount" width="60" />
      <el-table-column label="累计消费" align="center" width="100">
        <template #default="scope">
          <span class="money">¥{{ formatAmount(scope.row.totalAmount) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="最近成交" align="center" width="104">
        <template #default="scope">{{ scope.row.lastDealTime ? proxy.parseTime(scope.row.lastDealTime, '{y}-{m}-{d}') : '—' }}</template>
      </el-table-column>
      <el-table-column label="状态" align="center" prop="status" width="72">
        <template #default="scope">
          <el-tag size="small" :type="scope.row.status === '0' ? 'success' : 'info'">{{ scope.row.status === '0' ? '正常' : '流失' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" align="center" width="170" class-name="small-padding fixed-width">
        <template #default="scope">
          <el-button link type="primary" @click="openPets(scope.row)">档案</el-button>
          <el-button link type="primary" @click="handleUpdate(scope.row)" v-hasPermi="['pet:customer:edit']">修改</el-button>
          <el-button link type="danger" @click="handleDelete(scope.row)" v-hasPermi="['pet:customer:remove']">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />

    <!-- 新增/修改 -->
    <el-dialog :title="title" v-model="open" width="640px" append-to-body>
      <el-form ref="customerRef" :model="form" :rules="rules" label-width="90px">
        <el-row>
          <el-col :span="12">
            <el-form-item label="客户姓名" prop="customerName">
              <el-input v-model="form.customerName" placeholder="姓名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="手机号" prop="phone">
              <el-input v-model="form.phone" placeholder="11 位手机号" maxlength="11" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="性别" prop="gender">
              <el-radio-group v-model="form.gender">
                <el-radio value="0">男</el-radio>
                <el-radio value="1">女</el-radio>
                <el-radio value="2">未知</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="生日" prop="birthday">
              <el-date-picker v-model="form.birthday" type="date" value-format="YYYY-MM-DD" placeholder="选择生日" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="归属门店" prop="storeId">
              <el-select v-model="form.storeId" placeholder="选择门店" style="width: 100%">
                <el-option v-for="s in stores" :key="s.storeId" :label="s.storeName" :value="s.storeId" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="会员等级" prop="level">
              <el-select v-model="form.level" style="width: 100%">
                <el-option v-for="l in LEVELS" :key="l" :label="l" :value="l" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="来源渠道" prop="source">
              <el-select v-model="form.source" style="width: 100%">
                <el-option v-for="s in SOURCES" :key="s" :label="s" :value="s" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态" prop="status">
              <el-radio-group v-model="form.status">
                <el-radio value="0">正常</el-radio>
                <el-radio value="1">流失</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="标签" prop="tags">
              <el-input v-model="form.tags" placeholder="逗号分隔，如：养猫,高复购,价格不敏感" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注" prop="remark">
              <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="跟进备注" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="submitForm">确 定</el-button>
          <el-button @click="open = false">取 消</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 客户档案抽屉 -->
    <el-drawer v-model="detailOpen" :title="detailTitle" size="620px">
      <div v-loading="detailLoading">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="客户编号">{{ detail.customerCode || '—' }}</el-descriptions-item>
          <el-descriptions-item label="手机号">{{ detail.phone || '—' }}</el-descriptions-item>
          <el-descriptions-item label="归属门店">{{ detail.storeName || '—' }}</el-descriptions-item>
          <el-descriptions-item label="会员等级">{{ detail.level || '—' }}</el-descriptions-item>
          <el-descriptions-item label="来源">{{ detail.source || '—' }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ detail.status === '0' ? '正常' : '流失' }}</el-descriptions-item>
          <el-descriptions-item label="累计订单">{{ detail.orderCount || 0 }}</el-descriptions-item>
          <el-descriptions-item label="累计消费">¥{{ formatAmount(detail.totalAmount) }}</el-descriptions-item>
          <el-descriptions-item label="首次成交">{{ detail.firstDealTime ? proxy.parseTime(detail.firstDealTime, '{y}-{m}-{d}') : '—' }}</el-descriptions-item>
          <el-descriptions-item label="最近成交">{{ detail.lastDealTime ? proxy.parseTime(detail.lastDealTime, '{y}-{m}-{d}') : '—' }}</el-descriptions-item>
          <el-descriptions-item label="标签" :span="2">{{ detail.tags || '—' }}</el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{ detail.remark || '—' }}</el-descriptions-item>
        </el-descriptions>

        <h4 class="pets-title">名下宠物（{{ pets.length }}）</h4>
        <el-table :data="pets" size="small">
          <el-table-column label="宠物" min-width="120">
            <template #default="scope">
              <div class="pet-cell">
                <span class="pet-avatar">{{ isImage(scope.row.image) ? '' : (scope.row.image || '—') }}</span>
                <span>{{ scope.row.petName }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="品种" prop="breed" width="110" />
          <el-table-column label="分类" prop="categoryName" width="80" />
          <el-table-column label="关系" width="90">
            <template #default="scope">
              <el-tag size="small" :type="scope.row.endTime ? 'info' : 'success'">
                {{ scope.row.endTime ? '历史' : scope.row.relation }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="售价" width="90">
            <template #default="scope">¥{{ formatAmount(scope.row.price) }}</template>
          </el-table-column>
        </el-table>
        <el-empty v-if="!detailLoading && pets.length === 0" description="该客户暂未关联宠物" />
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, reactive, toRefs, getCurrentInstance, onMounted } from 'vue'
import { listCustomer, getCustomer, addCustomer, updateCustomer, delCustomer } from '@/api/pet/petCustomer'
import { storeOptions } from '@/api/pet/petStore'

const { proxy } = getCurrentInstance()

const LEVELS = ['普通', '银卡', '金卡', '黑卡']
const SOURCES = ['线上商城', '到店', '转介绍', '抖音', '美团']

const customerList = ref([])
const stores = ref([])
const loading = ref(true)
const showSearch = ref(true)
const ids = ref([])
const single = ref(true)
const multiple = ref(true)
const total = ref(0)
const title = ref('')
const open = ref(false)
const detailOpen = ref(false)
const detailLoading = ref(false)
const detail = ref({})
const detailTitle = ref('')
const pets = ref([])

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    customerName: undefined,
    storeId: undefined,
    level: undefined,
    status: undefined
  },
  rules: {
    customerName: [{ required: true, message: '客户姓名不能为空', trigger: 'blur' }],
    phone: [{ pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }]
  }
})

const { queryParams, form, rules } = toRefs(data)

function levelType(level) {
  return { 黑卡: 'danger', 金卡: 'warning', 银卡: 'info' }[level] || ''
}

function formatAmount(v) {
  const n = Number(v || 0)
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

function isImage(s) {
  return !!s && (s.indexOf('/') === 0 || s.indexOf('http') === 0)
}

function getList() {
  loading.value = true
  listCustomer(queryParams.value).then((res) => {
    customerList.value = res.rows
    total.value = res.total
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
  ids.value = selection.map((item) => item.customerId)
  single.value = selection.length !== 1
  multiple.value = !selection.length
}

function resetForm() {
  form.value = {
    customerId: undefined,
    customerName: undefined,
    phone: undefined,
    gender: '2',
    birthday: undefined,
    storeId: stores.value.length ? stores.value[0].storeId : undefined,
    level: '普通',
    source: '到店',
    tags: undefined,
    status: '0',
    remark: undefined
  }
  proxy.resetForm('customerRef')
}

function handleAdd() {
  resetForm()
  title.value = '新增客户'
  open.value = true
}

function handleUpdate(row) {
  resetForm()
  const customerId = row.customerId || ids.value[0]
  getCustomer(customerId).then((res) => {
    form.value = res.data
    title.value = '修改客户'
    open.value = true
  })
}

function submitForm() {
  proxy.$refs['customerRef'].validate((valid) => {
    if (!valid) return
    const action = form.value.customerId ? updateCustomer(form.value) : addCustomer(form.value)
    action.then(() => {
      proxy.$modal.msgSuccess(form.value.customerId ? '修改成功' : '新增成功')
      open.value = false
      getList()
    })
  })
}

function handleDelete(row) {
  const customerIds = row.customerId ? [row.customerId] : ids.value
  proxy.$modal.confirm('确认删除选中的客户吗？名下有宠物的客户需先解除归属。').then(() => {
    return delCustomer(customerIds)
  }).then(() => {
    proxy.$modal.msgSuccess('删除成功')
    getList()
  }).catch(() => {})
}

function openPets(row) {
  detailTitle.value = row.customerName + ' · 客户档案'
  detailOpen.value = true
  detailLoading.value = true
  detail.value = {}
  pets.value = []
  getCustomer(row.customerId).then((res) => {
    detail.value = res.data || {}
    pets.value = res.data?.pets || []
    detailLoading.value = false
  }).catch(() => { detailLoading.value = false })
}

onMounted(() => {
  getList()
  storeOptions().then((res) => { stores.value = res.data || [] })
})
</script>

<style scoped>
.money { font-variant-numeric: tabular-nums; color: var(--text-1); }
.pets-title { margin: 18px 0 10px; font-size: 14px; font-weight: 600; color: var(--text-1); }
.pet-cell { display: flex; align-items: center; gap: 8px; }
.pet-avatar {
  width: 26px; height: 26px; display: inline-flex; align-items: center; justify-content: center;
  background: var(--brand-50); border-radius: 8px; font-size: 14px;
}
</style>
