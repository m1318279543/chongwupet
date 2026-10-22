<template>
  <div class="app-container">
    <!-- 搜索栏 -->
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="68px">
      <el-form-item label="门店名称" prop="storeName">
        <el-input v-model="queryParams.storeName" placeholder="请输入门店名称" clearable style="width: 220px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="类型" prop="storeType">
        <el-select v-model="queryParams.storeType" placeholder="门店类型" clearable style="width: 150px">
          <el-option label="直营" value="0" />
          <el-option label="加盟" value="1" />
        </el-select>
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="营业状态" clearable style="width: 150px">
          <el-option label="营业" value="0" />
          <el-option label="停业" value="1" />
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
        <el-button type="primary" plain icon="Plus" @click="handleAdd" v-hasPermi="['pet:store:add']">新增门店</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="success" plain icon="Edit" :disabled="single" @click="handleUpdate" v-hasPermi="['pet:store:edit']">修改</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete" v-hasPermi="['pet:store:remove']">删除</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <!-- 表格 -->
    <el-table v-loading="loading" :data="storeList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column label="编码" align="center" prop="storeCode" width="90" />
      <el-table-column label="门店名称" align="center" prop="storeName" min-width="150" :show-overflow-tooltip="true" />
      <el-table-column label="类型" align="center" prop="storeType" width="80">
        <template #default="scope">
          <el-tag size="small" :type="scope.row.storeType === '1' ? 'warning' : 'success'">
            {{ scope.row.storeType === '1' ? '加盟' : '直营' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="店长" align="center" prop="managerName" width="90" />
      <el-table-column label="联系电话" align="center" prop="phone" width="130" />
      <el-table-column label="地址" align="center" prop="address" min-width="190" :show-overflow-tooltip="true" />
      <el-table-column label="在店 / 员工 / 客户" align="center" width="150">
        <template #default="scope">
          <span class="metric">{{ scope.row.petCount }} / {{ scope.row.staffCount }} / {{ scope.row.customerCount }}</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" align="center" prop="status" width="80">
        <template #default="scope">
          <el-tag size="small" :type="scope.row.status === '0' ? 'success' : 'info'">
            {{ scope.row.status === '0' ? '营业' : '停业' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" align="center" width="210" class-name="small-padding fixed-width">
        <template #default="scope">
          <el-button link type="primary" icon="User" @click="openStaff(scope.row)">员工</el-button>
          <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['pet:store:edit']">修改</el-button>
          <el-button link type="danger" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['pet:store:remove']">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />

    <!-- 新增/修改 -->
    <el-dialog :title="title" v-model="open" width="680px" append-to-body>
      <el-form ref="storeRef" :model="form" :rules="rules" label-width="90px">
        <el-row>
          <el-col :span="12">
            <el-form-item label="门店编码" prop="storeCode">
              <el-input v-model="form.storeCode" placeholder="如 S004" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="门店名称" prop="storeName">
              <el-input v-model="form.storeName" placeholder="如 宠物之家·渝北店" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="门店类型" prop="storeType">
              <el-radio-group v-model="form.storeType">
                <el-radio value="0">直营</el-radio>
                <el-radio value="1">加盟</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="店长" prop="managerName">
              <el-input v-model="form.managerName" placeholder="店长姓名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="联系电话" prop="phone">
              <el-input v-model="form.phone" placeholder="门店电话" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="营业时间" prop="businessHours">
              <el-input v-model="form.businessHours" placeholder="如 09:00-21:00" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="可容纳" prop="petCapacity">
              <el-input-number v-model="form.petCapacity" :min="0" controls-position="right" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="开业日期" prop="openDate">
              <el-date-picker v-model="form.openDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="地址" prop="address">
              <el-input v-model="form.address" placeholder="详细地址" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态" prop="status">
              <el-radio-group v-model="form.status">
                <el-radio value="0">营业</el-radio>
                <el-radio value="1">停业</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注" prop="remark">
              <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="备注" />
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

    <!-- 员工抽屉 -->
    <el-drawer v-model="staffOpen" :title="staffTitle" size="560px">
      <el-table :data="staffList" v-loading="staffLoading">
        <el-table-column label="姓名" prop="staffName" width="100" />
        <el-table-column label="岗位" prop="post" width="90">
          <template #default="scope">
            <el-tag size="small" :type="scope.row.post === '店长' ? 'danger' : scope.row.post === '兽医' ? 'success' : 'info'">
              {{ scope.row.post }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="手机号" prop="phone" width="130" />
        <el-table-column label="入职日期" prop="entryDate" width="120">
          <template #default="scope">{{ proxy.parseTime(scope.row.entryDate, '{y}-{m}-{d}') }}</template>
        </el-table-column>
        <el-table-column label="账号" prop="userId" width="80">
          <template #default="scope">{{ scope.row.userId ? '已绑定' : '—' }}</template>
        </el-table-column>
        <el-table-column label="状态" prop="status" width="80">
          <template #default="scope">{{ scope.row.status === '0' ? '在职' : '离职' }}</template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!staffLoading && staffList.length === 0" description="该门店暂无员工" />
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, reactive, toRefs, getCurrentInstance, onMounted } from 'vue'
import { listStore, getStore, addStore, updateStore, delStore, listStoreStaff } from '@/api/pet/petStore'

const { proxy } = getCurrentInstance()

const storeList = ref([])
const loading = ref(true)
const showSearch = ref(true)
const ids = ref([])
const single = ref(true)
const multiple = ref(true)
const total = ref(0)
const title = ref('')
const open = ref(false)
const staffOpen = ref(false)
const staffLoading = ref(false)
const staffList = ref([])
const staffTitle = ref('')

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    storeName: undefined,
    storeType: undefined,
    status: undefined
  },
  rules: {
    storeCode: [{ required: true, message: '门店编码不能为空', trigger: 'blur' }],
    storeName: [{ required: true, message: '门店名称不能为空', trigger: 'blur' }]
  }
})

const { queryParams, form, rules } = toRefs(data)

function getList() {
  loading.value = true
  listStore(queryParams.value).then((res) => {
    storeList.value = res.rows
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
  ids.value = selection.map((item) => item.storeId)
  single.value = selection.length !== 1
  multiple.value = !selection.length
}

function resetForm() {
  form.value = {
    storeId: undefined,
    storeCode: undefined,
    storeName: undefined,
    storeType: '0',
    managerName: undefined,
    phone: undefined,
    address: undefined,
    businessHours: '09:00-21:00',
    petCapacity: 20,
    openDate: undefined,
    status: '0',
    remark: undefined
  }
  proxy.resetForm('storeRef')
}

function handleAdd() {
  resetForm()
  title.value = '新增门店'
  open.value = true
}

function handleUpdate(row) {
  resetForm()
  const storeId = row.storeId || ids.value[0]
  getStore(storeId).then((res) => {
    form.value = res.data
    title.value = '修改门店'
    open.value = true
  })
}

function submitForm() {
  proxy.$refs['storeRef'].validate((valid) => {
    if (!valid) return
    const action = form.value.storeId ? updateStore(form.value) : addStore(form.value)
    action.then(() => {
      proxy.$modal.msgSuccess(form.value.storeId ? '修改成功' : '新增成功')
      open.value = false
      getList()
    })
  })
}

function handleDelete(row) {
  const storeIds = row.storeId ? [row.storeId] : ids.value
  proxy.$modal.confirm('确认删除选中的门店吗？门店内还有宠物或员工时将无法删除。').then(() => {
    return delStore(storeIds)
  }).then(() => {
    proxy.$modal.msgSuccess('删除成功')
    getList()
  }).catch(() => {})
}

function openStaff(row) {
  staffTitle.value = row.storeName + ' · 在职员工'
  staffOpen.value = true
  staffLoading.value = true
  staffList.value = []
  listStoreStaff(row.storeId).then((res) => {
    staffList.value = res.data || []
    staffLoading.value = false
  }).catch(() => { staffLoading.value = false })
}

onMounted(getList)
</script>

<style scoped>
.metric { font-variant-numeric: tabular-nums; color: var(--text-2); }
</style>
