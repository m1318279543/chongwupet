<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="68px">
      <el-form-item label="登录地址" prop="ipaddr">
        <el-input v-model="queryParams.ipaddr" placeholder="请输入登录地址" clearable style="width: 200px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="用户名称" prop="userName">
        <el-input v-model="queryParams.userName" placeholder="请输入用户名称" clearable style="width: 200px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button type="danger" plain icon="Delete" :disabled="ids.length === 0" @click="handleForceLogout" v-hasPermi="['monitor:online:forceLogout']">强退</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="onlineList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column label="会话编号" align="center" prop="tokenId" :show-overflow-tooltip="true" />
      <el-table-column label="登录名称" align="center" prop="userName" width="120" />
      <el-table-column label="部门名称" align="center" prop="deptName" width="130" />
      <el-table-column label="主机" align="center" prop="ipaddr" width="130" :show-overflow-tooltip="true" />
      <el-table-column label="登录地点" align="center" prop="loginLocation" :show-overflow-tooltip="true" />
      <el-table-column label="浏览器" align="center" prop="browser" width="110" />
      <el-table-column label="操作系统" align="center" prop="os" width="110" />
      <el-table-column label="登录时间" align="center" prop="loginTime" width="170">
        <template #default="scope"><span>{{ parseTime(scope.row.loginTime) }}</span></template>
      </el-table-column>
      <el-table-column label="操作" align="center" width="90" class-name="small-padding fixed-width">
        <template #default="scope">
          <el-button link type="primary" icon="Delete" @click="handleForceLogout(scope.row)" v-hasPermi="['monitor:online:forceLogout']">强退</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />
  </div>
</template>

<script setup name="SysOnline">
import { ref, reactive, toRefs, getCurrentInstance } from 'vue'
import { list as listOnline, forceLogout } from '@/api/monitor/online'

const { proxy } = getCurrentInstance()

const onlineList = ref([])
const loading = ref(true)
const showSearch = ref(true)
const ids = ref([])
const total = ref(0)

const data = reactive({
  queryParams: { pageNum: 1, pageSize: 10, ipaddr: undefined, userName: undefined }
})
const { queryParams } = toRefs(data)

function getList() {
  loading.value = true
  listOnline(queryParams.value).then(res => {
    onlineList.value = res.rows
    total.value = res.total
    loading.value = false
  }).catch(() => { loading.value = false })
}
function handleQuery() { queryParams.value.pageNum = 1; getList() }
function resetQuery() { proxy.resetForm('queryRef'); handleQuery() }
function handleSelectionChange(selection) { ids.value = selection.map(item => item.tokenId) }
function handleForceLogout(row) {
  const tokenIds = row.tokenId || ids.value
  proxy.$modal.confirm('是否确认强退选中的在线用户？').then(() => forceLogout(tokenIds))
    .then(() => { getList(); proxy.$modal.msgSuccess('强退成功') }).catch(() => {})
}

getList()
</script>
