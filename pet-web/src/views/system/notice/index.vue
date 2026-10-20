<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch">
      <el-form-item label="公告标题" prop="noticeTitle">
        <el-input v-model="queryParams.noticeTitle" placeholder="请输入公告标题" clearable style="width: 200px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="操作人员" prop="createBy">
        <el-input v-model="queryParams.createBy" placeholder="请输入操作人员" clearable style="width: 200px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="类型" prop="noticeType">
        <el-select v-model="queryParams.noticeType" placeholder="公告类型" clearable style="width: 160px">
          <el-option v-for="dict in sys_notice_type" :key="dict.value" :label="dict.label" :value="dict.value" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button type="primary" plain icon="Plus" @click="handleAdd" v-hasPermi="['system:notice:add']">新增</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="success" plain icon="Edit" :disabled="single" @click="handleUpdate" v-hasPermi="['system:notice:edit']">修改</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete" v-hasPermi="['system:notice:remove']">删除</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="noticeList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column label="序号" align="center" prop="noticeId" width="90" />
      <el-table-column label="公告标题" align="center" :show-overflow-tooltip="true">
        <template #default="scope">
          <a class="link-type" style="cursor: pointer" @click="handleViewData(scope.row)">{{ scope.row.noticeTitle }}</a>
        </template>
      </el-table-column>
      <el-table-column label="公告类型" align="center" prop="noticeType" width="100">
        <template #default="scope"><dict-tag :options="sys_notice_type" :value="scope.row.noticeType" /></template>
      </el-table-column>
      <el-table-column label="状态" align="center" prop="status" width="90">
        <template #default="scope"><dict-tag :options="sys_notice_status" :value="scope.row.status" /></template>
      </el-table-column>
      <el-table-column label="创建者" align="center" prop="createBy" width="110" />
      <el-table-column label="创建时间" align="center" prop="createTime" width="120">
        <template #default="scope"><span>{{ parseTime(scope.row.createTime, '{y}-{m}-{d}') }}</span></template>
      </el-table-column>
      <el-table-column label="操作" align="center" width="260" class-name="small-padding fixed-width">
        <template #default="scope">
          <el-button link type="primary" icon="User" @click="handleReadUsers(scope.row)" v-hasPermi="['system:notice:list']">阅读用户</el-button>
          <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['system:notice:edit']">修改</el-button>
          <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['system:notice:remove']">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />

    <!-- 添加或修改公告对话框 -->
    <el-dialog :title="title" v-model="open" width="780px" append-to-body>
      <el-form ref="noticeRef" :model="form" :rules="rules" label-width="80px">
        <el-row>
          <el-col :span="12">
            <el-form-item label="公告标题" prop="noticeTitle">
              <el-input v-model="form.noticeTitle" placeholder="请输入公告标题" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="公告类型" prop="noticeType">
              <el-select v-model="form.noticeType" placeholder="请选择">
                <el-option v-for="dict in sys_notice_type" :key="dict.value" :label="dict.label" :value="dict.value"></el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="状态">
              <el-radio-group v-model="form.status">
                <el-radio v-for="dict in sys_notice_status" :key="dict.value" :value="dict.value">{{ dict.label }}</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="内容">
              <editor v-model="form.noticeContent" :min-height="192" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="submitForm">确 定</el-button>
          <el-button @click="cancel">取 消</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 公告详情 -->
    <el-drawer v-model="detailVisible" title="公告详情" direction="rtl" size="46%" append-to-body>
      <div v-loading="detailLoading" class="notice-detail">
        <template v-if="detail">
          <h1 class="nd-title">{{ detail.noticeTitle }}</h1>
          <div class="nd-meta">
            <dict-tag :options="sys_notice_type" :value="detail.noticeType" />
            <span>{{ detail.createBy || '—' }}</span>
            <span>{{ parseTime(detail.createTime) }}</span>
          </div>
          <div v-if="detail.noticeContent" class="nd-body" v-html="detail.noticeContent"></div>
          <el-empty v-else description="暂无内容" :image-size="80" />
        </template>
      </div>
    </el-drawer>

    <!-- 已读用户 -->
    <el-dialog v-model="readVisible" :title="`「${readTitle}」已读用户`" width="760px" top="6vh" append-to-body>
      <el-table v-loading="readLoading" :data="readUsers" size="small" stripe max-height="360">
        <el-table-column type="index" label="序号" width="55" align="center" />
        <el-table-column label="登录名称" prop="userName" align="center" :show-overflow-tooltip="true" />
        <el-table-column label="用户名称" prop="nickName" align="center" :show-overflow-tooltip="true" />
        <el-table-column label="所属部门" prop="deptName" align="center" :show-overflow-tooltip="true" />
        <el-table-column label="手机号码" prop="phonenumber" align="center" width="120" />
        <el-table-column label="阅读时间" prop="readTime" align="center" width="165">
          <template #default="scope"><span>{{ parseTime(scope.row.readTime) }}</span></template>
        </el-table-column>
      </el-table>
      <pagination v-show="readTotal > 0" :total="readTotal" v-model:page="readQuery.pageNum"
        v-model:limit="readQuery.pageSize" @pagination="getReadUsers" />
      <div class="read-stat">共 <strong>{{ readTotal }}</strong> 人已读</div>
    </el-dialog>
  </div>
</template>

<script setup name="SysNotice">
import { ref, reactive, toRefs, getCurrentInstance, defineAsyncComponent } from 'vue'
import { listNotice, getNotice, delNotice, addNotice, updateNotice, listNoticeReadUsers } from '@/api/system/notice'

// 富文本编辑器按需加载，避免 quill 进入主包
const Editor = defineAsyncComponent(() => import('@/components/Editor/index.vue'))

const { proxy } = getCurrentInstance()
const { sys_notice_status, sys_notice_type } = proxy.useDict('sys_notice_status', 'sys_notice_type')

const noticeList = ref([])
const open = ref(false)
const loading = ref(true)
const showSearch = ref(true)
const ids = ref([])
const single = ref(true)
const multiple = ref(true)
const total = ref(0)
const title = ref('')

const detailVisible = ref(false)
const detailLoading = ref(false)
const detail = ref(null)

const readVisible = ref(false)
const readLoading = ref(false)
const readUsers = ref([])
const readTotal = ref(0)
const readTitle = ref('')
const readQuery = reactive({ pageNum: 1, pageSize: 10, noticeId: undefined })

const data = reactive({
  form: {},
  queryParams: { pageNum: 1, pageSize: 10, noticeTitle: undefined, createBy: undefined, noticeType: undefined },
  rules: {
    noticeTitle: [{ required: true, message: '公告标题不能为空', trigger: 'blur' }],
    noticeType: [{ required: true, message: '公告类型不能为空', trigger: 'change' }]
  }
})
const { queryParams, form, rules } = toRefs(data)

function getList() {
  loading.value = true
  listNotice(queryParams.value).then((response) => {
    noticeList.value = response.rows
    total.value = response.total
    loading.value = false
  }).catch(() => { loading.value = false })
}
function cancel() { open.value = false; reset() }
function reset() {
  form.value = { noticeId: undefined, noticeTitle: undefined, noticeType: undefined, noticeContent: undefined, status: '0' }
  proxy.resetForm('noticeRef')
}
function handleQuery() { queryParams.value.pageNum = 1; getList() }
function resetQuery() { proxy.resetForm('queryRef'); handleQuery() }
function handleSelectionChange(selection) {
  ids.value = selection.map((item) => item.noticeId)
  single.value = selection.length !== 1
  multiple.value = !selection.length
}
function handleAdd() { reset(); open.value = true; title.value = '添加公告' }
function handleUpdate(row) {
  reset()
  const noticeId = row.noticeId || ids.value
  getNotice(noticeId).then((response) => {
    form.value = response.data
    open.value = true
    title.value = '修改公告'
  })
}
function submitForm() {
  proxy.$refs.noticeRef.validate((valid) => {
    if (!valid) return
    if (form.value.noticeId !== undefined) {
      updateNotice(form.value).then(() => { proxy.$modal.msgSuccess('修改成功'); open.value = false; getList() })
    } else {
      addNotice(form.value).then(() => { proxy.$modal.msgSuccess('新增成功'); open.value = false; getList() })
    }
  })
}
function handleDelete(row) {
  const noticeIds = row.noticeId || ids.value
  proxy.$modal.confirm('是否确认删除公告编号为"' + noticeIds + '"的数据项？').then(() => {
    return delNotice(noticeIds)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess('删除成功')
  }).catch(() => {})
}
function handleViewData(row) {
  detailVisible.value = true
  detailLoading.value = true
  detail.value = null
  getNotice(row.noticeId).then((res) => {
    detail.value = res.data
  }).catch(() => {}).finally(() => { detailLoading.value = false })
}
function getReadUsers() {
  readLoading.value = true
  listNoticeReadUsers(readQuery).then((res) => {
    readUsers.value = res.rows || []
    readTotal.value = res.total || 0
  }).catch(() => {}).finally(() => { readLoading.value = false })
}
function handleReadUsers(row) {
  readQuery.noticeId = row.noticeId
  readQuery.pageNum = 1
  readTitle.value = row.noticeTitle
  readVisible.value = true
  getReadUsers()
}

getList()
</script>

<style scoped>
.notice-detail {
  padding: 8px 20px 24px;
}
.nd-title {
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
  line-height: 1.5;
  margin: 4px 0 14px;
}
.nd-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
  padding: 10px 0;
  margin-bottom: 20px;
  border-top: 1px solid #ebeef5;
  border-bottom: 1px solid #ebeef5;
  font-size: 12px;
  color: #909399;
}
.nd-body {
  font-size: 14px;
  line-height: 1.85;
  color: #303133;
  word-break: break-word;
}
.nd-body :deep(img) {
  max-width: 100%;
}
.read-stat {
  margin-top: 10px;
  font-size: 13px;
  color: #606266;
}
.read-stat strong {
  color: #409eff;
  margin: 0 3px;
}
</style>
