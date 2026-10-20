<template>
  <div class="app-container">
    <el-tabs v-model="activeTab" class="log-tabs">
      <!-- 操作日志 -->
      <el-tab-pane label="操作日志" name="operlog">
        <el-form :model="operQuery" ref="operQueryRef" :inline="true" v-show="operShowSearch" label-width="68px">
          <el-form-item label="系统模块" prop="title">
            <el-input v-model="operQuery.title" placeholder="请输入系统模块" clearable style="width: 200px" @keyup.enter="getOperList" />
          </el-form-item>
          <el-form-item label="操作人员" prop="operName">
            <el-input v-model="operQuery.operName" placeholder="请输入操作人员" clearable style="width: 200px" @keyup.enter="getOperList" />
          </el-form-item>
          <el-form-item label="状态" prop="status">
            <el-select v-model="operQuery.status" placeholder="操作状态" clearable style="width: 160px">
              <el-option v-for="dict in sys_common_status" :key="dict.value" :label="dict.label" :value="dict.value" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" icon="Search" @click="getOperList">搜索</el-button>
            <el-button icon="Refresh" @click="resetOperQuery">重置</el-button>
          </el-form-item>
        </el-form>

        <el-row :gutter="10" class="mb8">
          <el-col :span="1.5">
            <el-button type="danger" plain icon="Delete" :disabled="operIds.length === 0" @click="handleOperDelete" v-hasPermi="['monitor:operlog:remove']">删除</el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button type="danger" plain icon="Delete" @click="handleOperClean" v-hasPermi="['monitor:operlog:remove']">清空</el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button type="warning" plain icon="Download" @click="handleOperExport" v-hasPermi="['monitor:operlog:export']">导出</el-button>
          </el-col>
          <right-toolbar v-model:showSearch="operShowSearch" @queryTable="getOperList"></right-toolbar>
        </el-row>

        <el-table v-loading="operLoading" :data="operList" @selection-change="s => operIds = s.map(i => i.operId)">
          <el-table-column type="selection" width="55" align="center" />
          <el-table-column label="日志编号" align="center" prop="operId" width="90" />
          <el-table-column label="系统模块" align="center" prop="title" width="140" />
          <el-table-column label="操作类型" align="center" width="100">
            <template #default="scope"><dict-tag :options="sys_oper_type" :value="scope.row.businessType" /></template>
          </el-table-column>
          <el-table-column label="请求方式" align="center" prop="requestMethod" width="90" />
          <el-table-column label="操作人员" align="center" prop="operName" width="110" />
          <el-table-column label="操作地址" align="center" prop="operIp" width="130" :show-overflow-tooltip="true" />
          <el-table-column label="操作状态" align="center" width="90">
            <template #default="scope"><dict-tag :options="sys_common_status" :value="scope.row.status" /></template>
          </el-table-column>
          <el-table-column label="操作时间" align="center" prop="operTime" width="170">
            <template #default="scope"><span>{{ parseTime(scope.row.operTime) }}</span></template>
          </el-table-column>
          <el-table-column label="操作" align="center" width="90">
            <template #default="scope">
              <el-button link type="primary" icon="View" @click="openOperDetail(scope.row)" v-hasPermi="['monitor:operlog:query']">详细</el-button>
            </template>
          </el-table-column>
        </el-table>
        <pagination v-show="operTotal > 0" :total="operTotal" v-model:page="operQuery.pageNum" v-model:limit="operQuery.pageSize" @pagination="getOperList" />
      </el-tab-pane>

      <!-- 登录日志 -->
      <el-tab-pane label="登录日志" name="logininfor">
        <el-form :model="loginQuery" ref="loginQueryRef" :inline="true" v-show="loginShowSearch" label-width="68px">
          <el-form-item label="登录地址" prop="ipaddr">
            <el-input v-model="loginQuery.ipaddr" placeholder="请输入登录地址" clearable style="width: 200px" @keyup.enter="getLoginList" />
          </el-form-item>
          <el-form-item label="用户名称" prop="userName">
            <el-input v-model="loginQuery.userName" placeholder="请输入用户名称" clearable style="width: 200px" @keyup.enter="getLoginList" />
          </el-form-item>
          <el-form-item label="登录状态" prop="status">
            <el-select v-model="loginQuery.status" placeholder="登录状态" clearable style="width: 160px">
              <el-option v-for="dict in sys_common_status" :key="dict.value" :label="dict.label" :value="dict.value" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" icon="Search" @click="getLoginList">搜索</el-button>
            <el-button icon="Refresh" @click="resetLoginQuery">重置</el-button>
          </el-form-item>
        </el-form>

        <el-row :gutter="10" class="mb8">
          <el-col :span="1.5">
            <el-button type="danger" plain icon="Delete" :disabled="loginIds.length === 0" @click="handleLoginDelete" v-hasPermi="['monitor:logininfor:remove']">删除</el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button type="danger" plain icon="Delete" @click="handleLoginClean" v-hasPermi="['monitor:logininfor:remove']">清空</el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button type="primary" plain icon="Unlock" @click="handleUnlock" v-hasPermi="['monitor:logininfor:unlock']">解锁</el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button type="warning" plain icon="Download" @click="handleLoginExport" v-hasPermi="['monitor:logininfor:export']">导出</el-button>
          </el-col>
          <right-toolbar v-model:showSearch="loginShowSearch" @queryTable="getLoginList"></right-toolbar>
        </el-row>

        <el-table v-loading="loginLoading" :data="loginList" @selection-change="s => loginIds = s.map(i => i.infoId)">
          <el-table-column type="selection" width="55" align="center" />
          <el-table-column label="访问编号" align="center" prop="infoId" width="90" />
          <el-table-column label="用户名称" align="center" prop="userName" width="120" />
          <el-table-column label="登录地址" align="center" prop="ipaddr" width="130" :show-overflow-tooltip="true" />
          <el-table-column label="登录地点" align="center" prop="loginLocation" :show-overflow-tooltip="true" />
          <el-table-column label="浏览器" align="center" prop="browser" width="110" />
          <el-table-column label="操作系统" align="center" prop="os" width="110" />
          <el-table-column label="登录状态" align="center" width="90">
            <template #default="scope"><dict-tag :options="sys_common_status" :value="scope.row.status" /></template>
          </el-table-column>
          <el-table-column label="操作信息" align="center" prop="msg" :show-overflow-tooltip="true" />
          <el-table-column label="登录时间" align="center" prop="loginTime" width="170">
            <template #default="scope"><span>{{ parseTime(scope.row.loginTime) }}</span></template>
          </el-table-column>
        </el-table>
        <pagination v-show="loginTotal > 0" :total="loginTotal" v-model:page="loginQuery.pageNum" v-model:limit="loginQuery.pageSize" @pagination="getLoginList" />
      </el-tab-pane>
    </el-tabs>

    <!-- 操作日志详情 -->
    <el-dialog title="操作详细" v-model="operDetail" width="700px" append-to-body>
      <el-form :model="operForm" label-width="100px">
        <el-row>
          <el-col :span="12"><el-form-item label="操作模块：">{{ operForm.title }} / {{ operForm.businessTypeName }}</el-form-item></el-col>
          <el-col :span="12"><el-form-item label="操作状态：">
            <span v-if="operForm.status === 0">正常</span><span v-else style="color:#f56c6c">失败</span>
          </el-form-item></el-col>
          <el-col :span="12"><el-form-item label="操作人员：">{{ operForm.operName }}</el-form-item></el-col>
          <el-col :span="12"><el-form-item label="操作地址：">{{ operForm.operIp }}</el-form-item></el-col>
          <el-col :span="12"><el-form-item label="操作地点：">{{ operForm.operLocation }}</el-form-item></el-col>
          <el-col :span="12"><el-form-item label="请求地址：">{{ operForm.operUrl }}</el-form-item></el-col>
          <el-col :span="24"><el-form-item label="操作方法：">{{ operForm.method }}</el-form-item></el-col>
          <el-col :span="24"><el-form-item label="请求参数：">{{ operForm.operParam }}</el-form-item></el-col>
          <el-col :span="24"><el-form-item label="返回结果：">{{ operForm.jsonResult }}</el-form-item></el-col>
          <el-col :span="24"><el-form-item label="错误消息：" v-if="operForm.status === 1">{{ operForm.errorMsg }}</el-form-item></el-col>
        </el-row>
      </el-form>
      <template #footer><el-button @click="operDetail = false">关 闭</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup name="SysLog">
import { ref, getCurrentInstance } from 'vue'
import { list as listOperlog, delOperlog, cleanOperlog } from '@/api/monitor/operlog'
import { list as listLogininfor, delLogininfor, cleanLogininfor, unlockLogininfor } from '@/api/monitor/logininfor'

const { proxy } = getCurrentInstance()
const { sys_oper_type, sys_common_status } = proxy.useDict('sys_oper_type', 'sys_common_status')

const activeTab = ref('operlog')

// 操作日志
const operList = ref([])
const operLoading = ref(false)
const operShowSearch = ref(true)
const operIds = ref([])
const operTotal = ref(0)
const operDetail = ref(false)
const operForm = ref({})
const operQuery = ref({ pageNum: 1, pageSize: 10, title: undefined, operName: undefined, status: undefined })

// 登录日志
const loginList = ref([])
const loginLoading = ref(false)
const loginShowSearch = ref(true)
const loginIds = ref([])
const loginTotal = ref(0)
const loginQuery = ref({ pageNum: 1, pageSize: 10, ipaddr: undefined, userName: undefined, status: undefined })

function getOperList() {
  operLoading.value = true
  listOperlog(operQuery.value).then(res => {
    operList.value = res.rows
    operTotal.value = res.total
    operLoading.value = false
  }).catch(() => { operLoading.value = false })
}
function resetOperQuery() { proxy.resetForm('operQueryRef'); getOperList() }
function handleOperDelete() {
  proxy.$modal.confirm('是否确认删除选中的操作日志？').then(() => delOperlog(operIds.value))
    .then(() => { getOperList(); proxy.$modal.msgSuccess('删除成功') }).catch(() => {})
}
function handleOperClean() {
  proxy.$modal.confirm('是否确认清空所有操作日志数据项？').then(() => cleanOperlog())
    .then(() => { getOperList(); proxy.$modal.msgSuccess('清空成功') }).catch(() => {})
}
function handleOperExport() {
  proxy.download('monitor/operlog/export', { ...operQuery.value }, `operlog_${new Date().getTime()}.xlsx`)
}
function openOperDetail(row) {
  operForm.value = { ...row, businessTypeName: proxy.selectDictLabel(sys_oper_type.value, row.businessType) }
  operDetail.value = true
}

function getLoginList() {
  loginLoading.value = true
  listLogininfor(loginQuery.value).then(res => {
    loginList.value = res.rows
    loginTotal.value = res.total
    loginLoading.value = false
  }).catch(() => { loginLoading.value = false })
}
function resetLoginQuery() { proxy.resetForm('loginQueryRef'); getLoginList() }
function handleLoginDelete() {
  proxy.$modal.confirm('是否确认删除选中的登录日志？').then(() => delLogininfor(loginIds.value))
    .then(() => { getLoginList(); proxy.$modal.msgSuccess('删除成功') }).catch(() => {})
}
function handleLoginClean() {
  proxy.$modal.confirm('是否确认清空所有登录日志数据项？').then(() => cleanLogininfor())
    .then(() => { getLoginList(); proxy.$modal.msgSuccess('清空成功') }).catch(() => {})
}
function handleUnlock() {
  proxy.$modal.prompt('请输入要解锁的登录账号').then(({ value }) => {
    unlockLogininfor(value).then(() => { proxy.$modal.msgSuccess('解锁成功：' + value); getLoginList() })
  }).catch(() => {})
}
function handleLoginExport() {
  proxy.download('monitor/logininfor/export', { ...loginQuery.value }, `logininfor_${new Date().getTime()}.xlsx`)
}

getOperList(); getLoginList()
</script>
