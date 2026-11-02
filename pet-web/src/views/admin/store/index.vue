<template>
  <div class="app-container">
    <!-- 搜索栏 -->
    <el-card shadow="never" class="ui-toolbar-card">
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
    </el-card>

    <el-card shadow="never" class="table-card">
      <template #header>
        <div class="ui-card-head">
          <div class="head-actions">
            <el-button type="primary" plain icon="Plus" @click="handleAdd" v-hasPermi="['pet:store:add']">新增门店</el-button>
            <el-button type="success" plain icon="Edit" :disabled="single" @click="handleUpdate" v-hasPermi="['pet:store:edit']">修改</el-button>
            <el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete" v-hasPermi="['pet:store:remove']">删除</el-button>
          </div>
          <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
        </div>
      </template>

      <!-- 表格 -->
      <el-table v-loading="loading" :data="storeList" border stripe @selection-change="handleSelectionChange">
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

      <div class="ui-pager">
        <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />
      </div>
    </el-card>

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
            <el-form-item label="经度" prop="lng">
              <el-input v-model.number="form.lng" placeholder="如 106.577315" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="纬度" prop="lat">
              <el-input v-model.number="form.lat" placeholder="如 29.557666" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label=" ">
              <p class="geo-tip">
                坐标用 GCJ-02（火星坐标，与腾讯地图/高德一致），用于顾客端「距您多远」和到店导航。
                获取方法：在高德/腾讯地图网页上找到门店，右键「复制坐标」或在地点详情里查看经纬度。
                <a v-if="form.lng != null && form.lat != null" :href="mapPreviewUrl" target="_blank" rel="noopener">在地图上确认</a>
              </p>
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
    <el-drawer v-model="staffOpen" :title="staffTitle" size="640px">
      <div class="staff-toolbar">
        <el-button type="primary" size="small" icon="Plus" @click="handleStaffAdd" v-hasPermi="['pet:store:edit']">新增员工</el-button>
      </div>
      <el-table :data="staffList" v-loading="staffLoading" border stripe>
        <el-table-column label="姓名" prop="staffName" width="92" />
        <el-table-column label="岗位" prop="post" width="92">
          <template #default="scope">
            <el-tag size="small" :type="scope.row.post === '店长' ? 'danger' : scope.row.post === '兽医' ? 'success' : 'info'">
              {{ scope.row.post }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="手机号" prop="phone" width="122" />
        <el-table-column label="入职日期" prop="entryDate" width="102">
          <template #default="scope">{{ proxy.parseTime(scope.row.entryDate, '{y}-{m}-{d}') }}</template>
        </el-table-column>
        <el-table-column label="账号" prop="userId" width="66">
          <template #default="scope">{{ scope.row.userId ? '已绑定' : '—' }}</template>
        </el-table-column>
        <el-table-column label="状态" prop="status" width="70">
          <template #default="scope">
            <el-tag size="small" :type="scope.row.status === '0' ? 'success' : 'info'">
              {{ scope.row.status === '0' ? '在职' : '离职' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="158" class-name="small-padding fixed-width">
          <template #default="scope">
            <el-button link type="primary" icon="Edit" @click="handleStaffUpdate(scope.row)" v-hasPermi="['pet:store:edit']">修改</el-button>
            <el-button link :type="scope.row.status === '0' ? 'warning' : 'success'" @click="toggleStaffStatus(scope.row)" v-hasPermi="['pet:store:edit']">
              {{ scope.row.status === '0' ? '离职' : '复职' }}
            </el-button>
            <el-button link type="danger" icon="Delete" @click="handleStaffDelete(scope.row)" v-hasPermi="['pet:store:remove']">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!staffLoading && staffList.length === 0" description="该门店暂无员工" />
    </el-drawer>

    <!-- 员工新增/修改 -->
    <el-dialog :title="staffFormTitle" v-model="staffFormOpen" width="460px" append-to-body>
      <el-form ref="staffRef" :model="staffForm" :rules="staffRules" label-width="90px">
        <el-form-item label="姓名" prop="staffName">
          <el-input v-model="staffForm.staffName" placeholder="员工姓名" :disabled="!!staffForm.userId" />
          <div v-if="staffForm.userId" class="form-tip">已绑定系统账号，姓名不可修改</div>
        </el-form-item>
        <el-form-item label="岗位" prop="post">
          <el-select v-model="staffForm.post" style="width: 100%">
            <el-option v-for="p in postOptions" :key="p" :label="p" :value="p" />
          </el-select>
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="staffForm.phone" placeholder="员工手机号" maxlength="11" />
        </el-form-item>
        <el-form-item label="入职日期" prop="entryDate">
          <el-date-picker v-model="staffForm.entryDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" style="width: 100%" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="staffForm.status">
            <el-radio value="0">在职</el-radio>
            <el-radio value="1">离职</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="submitStaffForm">确 定</el-button>
          <el-button @click="staffFormOpen = false">取 消</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, toRefs, getCurrentInstance, onMounted } from 'vue'
import { listStore, getStore, addStore, updateStore, delStore, listStoreStaff, addStoreStaff, updateStoreStaff, delStoreStaff } from '@/api/pet/petStore'

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
const staffFormOpen = ref(false)
const staffFormTitle = ref('')
const currentStoreId = ref(null)
const postOptions = ['店长', '兽医', '美容师', '店员', '库管']

const staffForm = reactive({
  staffId: undefined,
  staffName: '',
  post: '店员',
  phone: '',
  entryDate: undefined,
  status: '0',
  userId: null
})

const staffRules = {
  staffName: [{ required: true, message: '员工姓名不能为空', trigger: 'blur' }],
  post: [{ required: true, message: '岗位不能为空', trigger: 'change' }]
}

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
    storeName: [{ required: true, message: '门店名称不能为空', trigger: 'blur' }],
    lng: [{ validator: geoRange(-180, 180, '经度'), trigger: 'blur' }],
    lat: [{ validator: geoRange(-90, 90, '纬度'), trigger: 'blur' }]
  }
})

const { queryParams, form, rules } = toRefs(data)

// 经纬度范围校验（留空则沿用旧坐标，不强制填）
function geoRange(min, max, label) {
  return (rule, value, cb) => {
    if (value === undefined || value === null || value === '') return cb()
    const n = Number(value)
    if (Number.isNaN(n) || n < min || n > max) return cb(new Error(`${label}需在 ${min} ~ ${max} 之间`))
    cb()
  }
}

// 表单里的坐标速览：改用高德地图网页版打开，不引第三方 SDK
const mapPreviewUrl = computed(() => {
  const { lng, lat, storeName } = form.value
  if (lng === undefined || lng === null || lng === '' || lat === undefined || lat === null || lat === '') return ''
  return `https://uri.amap.com/marker?position=${lng},${lat}&name=${encodeURIComponent(storeName || '门店')}&src=chongwupet&coordinate=gaode&callnative=0`
})

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
    lng: undefined,
    lat: undefined,
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
  currentStoreId.value = row.storeId
  staffTitle.value = row.storeName + ' · 员工管理'
  staffOpen.value = true
  getStaffList()
}

function getStaffList() {
  staffLoading.value = true
  staffList.value = []
  listStoreStaff(currentStoreId.value).then((res) => {
    staffList.value = res.data || []
    staffLoading.value = false
  }).catch(() => { staffLoading.value = false })
}

function resetStaffForm() {
  staffForm.staffId = undefined
  staffForm.staffName = ''
  staffForm.post = '店员'
  staffForm.phone = ''
  staffForm.entryDate = undefined
  staffForm.status = '0'
  staffForm.userId = null
  proxy.resetForm('staffRef')
}

function handleStaffAdd() {
  resetStaffForm()
  staffFormTitle.value = '新增员工'
  staffFormOpen.value = true
}

function handleStaffUpdate(row) {
  resetStaffForm()
  staffForm.staffId = row.staffId
  staffForm.staffName = row.staffName
  staffForm.post = row.post
  staffForm.phone = row.phone
  staffForm.entryDate = row.entryDate ? proxy.parseTime(row.entryDate, '{y}-{m}-{d}') : undefined
  staffForm.status = row.status
  staffForm.userId = row.userId
  staffFormTitle.value = '修改员工'
  staffFormOpen.value = true
}

function submitStaffForm() {
  proxy.$refs['staffRef'].validate((valid) => {
    if (!valid) return
    const payload = {
      staffId: staffForm.staffId,
      staffName: staffForm.staffName,
      post: staffForm.post,
      phone: staffForm.phone,
      entryDate: staffForm.entryDate,
      status: staffForm.status
    }
    const action = staffForm.staffId
      ? updateStoreStaff(currentStoreId.value, payload)
      : addStoreStaff(currentStoreId.value, payload)
    action.then(() => {
      proxy.$modal.msgSuccess(staffForm.staffId ? '修改成功' : '新增成功')
      staffFormOpen.value = false
      getStaffList()
      getList()
    })
  })
}

function toggleStaffStatus(row) {
  const next = row.status === '0' ? '1' : '0'
  const tip = next === '1' ? `确认将员工【${row.staffName}】设为离职吗？` : `确认将员工【${row.staffName}】恢复为在职吗？`
  proxy.$modal.confirm(tip).then(() => {
    return updateStoreStaff(currentStoreId.value, { staffId: row.staffId, status: next })
  }).then(() => {
    proxy.$modal.msgSuccess(next === '1' ? '已设为离职' : '已恢复在职')
    getStaffList()
    getList()
  }).catch(() => {})
}

function handleStaffDelete(row) {
  proxy.$modal.confirm(`确认删除员工【${row.staffName}】吗？删除后不可恢复。`).then(() => {
    return delStoreStaff(currentStoreId.value, row.staffId)
  }).then(() => {
    proxy.$modal.msgSuccess('删除成功')
    getStaffList()
    getList()
  }).catch(() => {})
}

onMounted(getList)
</script>

<style scoped>
.metric { font-variant-numeric: tabular-nums; color: var(--text-2); }
.head-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.staff-toolbar { margin-bottom: 10px; display: flex; justify-content: flex-end; }
.form-tip { font-size: 12px; color: var(--el-text-color-secondary); line-height: 1.4; margin-top: 2px; }
.geo-tip {
  margin: 0; font-size: 12px; line-height: 1.6; color: var(--el-text-color-secondary);
  a { margin-left: 4px; color: var(--brand-700); font-weight: 600; text-decoration: none; }
  a:hover { text-decoration: underline; }
}
</style>
