<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="68px">
      <el-form-item label="字典名称" prop="dictName">
        <el-input v-model="queryParams.dictName" placeholder="请输入字典名称" clearable style="width: 200px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="字典类型" prop="dictType">
        <el-input v-model="queryParams.dictType" placeholder="请输入字典类型" clearable style="width: 200px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="字典状态" clearable style="width: 160px">
          <el-option v-for="dict in sys_normal_disable" :key="dict.value" :label="dict.label" :value="dict.value" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button type="primary" plain icon="Plus" @click="handleAdd" v-hasPermi="['system:dict:add']">新增</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="success" plain icon="Edit" :disabled="single" @click="handleUpdate" v-hasPermi="['system:dict:edit']">修改</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete" v-hasPermi="['system:dict:remove']">删除</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="warning" plain icon="Download" @click="handleExport" v-hasPermi="['system:dict:export']">导出</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="danger" plain icon="Refresh" @click="handleRefreshCache" v-hasPermi="['system:dict:remove']">刷新缓存</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="typeList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column label="字典编号" align="center" prop="dictId" width="90" />
      <el-table-column label="字典名称" align="center" prop="dictName" :show-overflow-tooltip="true" />
      <el-table-column label="字典类型" align="center" :show-overflow-tooltip="true">
        <template #default="scope">
          <el-link type="primary" @click="openDataDrawer(scope.row)">{{ scope.row.dictType }}</el-link>
        </template>
      </el-table-column>
      <el-table-column label="状态" align="center" prop="status" width="90">
        <template #default="scope"><dict-tag :options="sys_normal_disable" :value="scope.row.status" /></template>
      </el-table-column>
      <el-table-column label="备注" align="center" prop="remark" :show-overflow-tooltip="true" />
      <el-table-column label="创建时间" align="center" prop="createTime" width="170">
        <template #default="scope"><span>{{ parseTime(scope.row.createTime) }}</span></template>
      </el-table-column>
      <el-table-column label="操作" align="center" width="180" class-name="small-padding fixed-width">
        <template #default="scope">
          <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['system:dict:edit']">修改</el-button>
          <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['system:dict:remove']">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />

    <!-- 字典类型表单 -->
    <el-dialog :title="title" v-model="open" width="500px" append-to-body>
      <el-form ref="dictRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="字典名称" prop="dictName">
          <el-input v-model="form.dictName" placeholder="请输入字典名称" />
        </el-form-item>
        <el-form-item label="字典类型" prop="dictType">
          <el-input v-model="form.dictType" placeholder="请输入字典类型" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio v-for="dict in sys_normal_disable" :key="dict.value" :value="dict.value">{{ dict.label }}</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" type="textarea" placeholder="请输入内容"></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="submitForm">确 定</el-button>
          <el-button @click="cancel">取 消</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 字典数据抽屉 -->
    <el-drawer v-model="dataDrawer" :title="'字典数据 - ' + currentTypeName" size="55%">
      <div class="drawer-body">
        <el-row :gutter="10" class="mb8">
          <el-col :span="1.5">
            <el-button type="primary" plain icon="Plus" @click="handleDataAdd">新增数据</el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button type="danger" plain icon="Delete" :disabled="dataIds.length === 0" @click="handleDataDelete">删除</el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button icon="Refresh" @click="getDataList">刷新</el-button>
          </el-col>
        </el-row>
        <el-table v-loading="dataLoading" :data="dataList" @selection-change="d => dataIds = d.map(i => i.dictCode)">
          <el-table-column type="selection" width="50" align="center" />
          <el-table-column label="字典编码" align="center" prop="dictCode" width="90" />
          <el-table-column label="字典标签" align="center" prop="dictLabel">
            <template #default="scope">
              <span v-if="scope.row.listClass == '' || scope.row.listClass == 'default'">{{ scope.row.dictLabel }}</span>
              <el-tag v-else :type="scope.row.listClass == 'primary' ? 'primary' : scope.row.listClass">{{ scope.row.dictLabel }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="字典键值" align="center" prop="dictValue" />
          <el-table-column label="排序" align="center" prop="dictSort" width="70" />
          <el-table-column label="回显样式" align="center" prop="cssClass" :show-overflow-tooltip="true" />
          <el-table-column label="操作" align="center" width="140">
            <template #default="scope">
              <el-button link type="primary" icon="Edit" @click="handleDataUpdate(scope.row)">修改</el-button>
              <el-button link type="primary" icon="Delete" @click="handleDataDelete(scope.row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-drawer>

    <!-- 字典数据表单 -->
    <el-dialog :title="dataTitle" v-model="dataOpen" width="500px" append-to-body>
      <el-form ref="dataRef" :model="dataForm" :rules="dataRules" label-width="80px">
        <el-form-item label="字典标签" prop="dictLabel">
          <el-input v-model="dataForm.dictLabel" placeholder="请输入字典标签" />
        </el-form-item>
        <el-form-item label="字典键值" prop="dictValue">
          <el-input v-model="dataForm.dictValue" placeholder="请输入字典键值" />
        </el-form-item>
        <el-form-item label="样式属性" prop="cssClass">
          <el-input v-model="dataForm.cssClass" placeholder="请输入样式属性" />
        </el-form-item>
        <el-form-item label="显示排序" prop="dictSort">
          <el-input-number v-model="dataForm.dictSort" controls-position="right" :min="0" />
        </el-form-item>
        <el-form-item label="回显样式" prop="listClass">
          <el-select v-model="dataForm.listClass">
            <el-option v-for="item in listClassOptions" :key="item.value" :label="item.label + '(' + item.value + ')'" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="dataForm.remark" type="textarea" placeholder="请输入内容"></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="submitDataForm">确 定</el-button>
          <el-button @click="dataOpen = false">取 消</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="SysDict">
import { ref, reactive, toRefs, getCurrentInstance } from 'vue'
import { listType, getType, delType, addType, updateType, refreshCache } from '@/api/system/dict/type'
import { listData, getData, delData, addData, updateData } from '@/api/system/dict/data'

const { proxy } = getCurrentInstance()
const { sys_normal_disable } = proxy.useDict('sys_normal_disable')

const typeList = ref([])
const loading = ref(true)
const showSearch = ref(true)
const ids = ref([])
const single = ref(true)
const multiple = ref(true)
const total = ref(0)
const title = ref('')
const open = ref(false)

const dataDrawer = ref(false)
const currentType = ref('')
const currentTypeName = ref('')
const dataList = ref([])
const dataLoading = ref(false)
const dataIds = ref([])
const dataOpen = ref(false)
const dataTitle = ref('')

const listClassOptions = ref([
  { value: 'default', label: '默认' }, { value: 'primary', label: '主要' },
  { value: 'success', label: '成功' }, { value: 'info', label: '信息' },
  { value: 'warning', label: '警告' }, { value: 'danger', label: '危险' }
])

const data = reactive({
  form: {},
  dataForm: {},
  queryParams: { pageNum: 1, pageSize: 10, dictName: undefined, dictType: undefined, status: undefined },
  rules: {
    dictName: [{ required: true, message: '字典名称不能为空', trigger: 'blur' }],
    dictType: [{ required: true, message: '字典类型不能为空', trigger: 'blur' }]
  },
  dataRules: {
    dictLabel: [{ required: true, message: '字典标签不能为空', trigger: 'blur' }],
    dictValue: [{ required: true, message: '字典键值不能为空', trigger: 'blur' }],
    dictSort: [{ required: true, message: '显示排序不能为空', trigger: 'blur' }]
  }
})
const { queryParams, form, rules, dataForm, dataRules } = toRefs(data)

function getList() {
  loading.value = true
  listType(queryParams.value).then(res => {
    typeList.value = res.rows
    total.value = res.total
    loading.value = false
  }).catch(() => { loading.value = false })
}
function handleQuery() { queryParams.value.pageNum = 1; getList() }
function resetQuery() { proxy.resetForm('queryRef'); handleQuery() }
function handleSelectionChange(selection) {
  ids.value = selection.map(item => item.dictId)
  single.value = selection.length !== 1
  multiple.value = !selection.length
}
function reset() {
  form.value = { dictId: undefined, dictName: undefined, dictType: undefined, status: '0', remark: undefined }
  proxy.resetForm('dictRef')
}
function handleAdd() { reset(); open.value = true; title.value = '新增字典类型' }
function handleUpdate(row) {
  reset()
  getType(row.dictId || ids.value[0]).then(res => {
    form.value = res.data
    open.value = true
    title.value = '修改字典类型'
  })
}
function submitForm() {
  proxy.$refs.dictRef.validate(valid => {
    if (valid) {
      if (form.value.dictId) {
        updateType(form.value).then(() => { proxy.$modal.msgSuccess('修改成功'); open.value = false; getList() })
      } else {
        addType(form.value).then(() => { proxy.$modal.msgSuccess('新增成功'); open.value = false; getList() })
      }
    }
  })
}
function handleDelete(row) {
  const dictIds = row.dictId || ids.value
  proxy.$modal.confirm('是否确认删除字典编号为"' + dictIds + '"的数据项？').then(() => {
    return delType(dictIds)
  }).then(() => { getList(); proxy.$modal.msgSuccess('删除成功') }).catch(() => {})
}
function handleExport() {
  proxy.download('system/dict/type/export', { ...queryParams.value }, `dict_${new Date().getTime()}.xlsx`)
}
function handleRefreshCache() {
  refreshCache().then(() => { proxy.$modal.msgSuccess('刷新成功') })
}
function cancel() { open.value = false; reset() }

// ---- 字典数据 ----
function openDataDrawer(row) {
  currentType.value = row.dictType
  currentTypeName.value = row.dictName
  dataDrawer.value = true
  getDataList()
}
function getDataList() {
  dataLoading.value = true
  listData({ dictType: currentType.value, pageNum: 1, pageSize: 100 }).then(res => {
    dataList.value = res.rows
    dataLoading.value = false
  }).catch(() => { dataLoading.value = false })
}
function resetDataForm() {
  dataForm.value = { dictCode: undefined, dictLabel: undefined, dictValue: undefined, cssClass: undefined, listClass: 'default', dictSort: 0, remark: undefined, dictType: currentType.value }
  proxy.resetForm('dataRef')
}
function handleDataAdd() { resetDataForm(); dataOpen.value = true; dataTitle.value = '新增字典数据' }
function handleDataUpdate(row) {
  resetDataForm()
  getData(row.dictCode).then(res => { dataForm.value = res.data; dataOpen.value = true; dataTitle.value = '修改字典数据' })
}
function submitDataForm() {
  proxy.$refs.dataRef.validate(valid => {
    if (!valid) return
    dataForm.value.dictType = currentType.value
    if (dataForm.value.dictCode) {
      updateData(dataForm.value).then(() => { proxy.$modal.msgSuccess('修改成功'); dataOpen.value = false; getDataList() })
    } else {
      addData(dataForm.value).then(() => { proxy.$modal.msgSuccess('新增成功'); dataOpen.value = false; getDataList() })
    }
  })
}
function handleDataDelete(row) {
  const codes = row.dictCode || dataIds.value
  proxy.$modal.confirm('是否确认删除该字典数据？').then(() => delData(codes))
    .then(() => { getDataList(); proxy.$modal.msgSuccess('删除成功') }).catch(() => {})
}

getList()
</script>

<style scoped>
.drawer-body { padding: 0 10px; }
</style>
