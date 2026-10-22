<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="68px">
      <el-form-item label="用户名" prop="userName">
        <el-input v-model="queryParams.userName" placeholder="请输入用户名" clearable style="width: 200px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="手机号码" prop="phonenumber">
        <el-input v-model="queryParams.phonenumber" placeholder="请输入手机号码" clearable style="width: 200px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="用户状态" clearable style="width: 160px">
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
        <el-button type="primary" plain icon="Plus" @click="handleAdd" v-hasPermi="['system:user:add']">新增</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="success" plain icon="Edit" :disabled="single" @click="handleUpdate" v-hasPermi="['system:user:edit']">修改</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete" v-hasPermi="['system:user:remove']">删除</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="warning" plain icon="Download" @click="handleExport" v-hasPermi="['system:user:export']">导出</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="info" plain icon="Upload" @click="handleImport" v-hasPermi="['system:user:import']">批量导入</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="userList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="50" align="center" />
      <el-table-column label="头像" align="center" width="72">
        <template #default="scope">
          <div class="row-av">
            <img v-if="scope.row.avatar && !brokenAvatars.has(scope.row.userId)" :src="resolveAvatar(scope.row.avatar)"
                 alt="头像" @error="markBroken(scope.row.userId)" />
            <span v-else>{{ (scope.row.nickName || scope.row.userName || 'U').charAt(0).toUpperCase() }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="用户编号" align="center" key="userId" prop="userId" width="90" />
      <el-table-column label="用户名" align="center" key="userName" prop="userName" :show-overflow-tooltip="true" />
      <el-table-column label="用户昵称" align="center" key="nickName" prop="nickName" :show-overflow-tooltip="true" />
      <el-table-column label="部门" align="center" key="deptName" prop="dept.deptName" :show-overflow-tooltip="true" />
      <el-table-column label="手机号码" align="center" key="phonenumber" prop="phonenumber" width="130" />
      <el-table-column label="状态" align="center" key="status" width="90">
        <template #default="scope">
          <el-switch v-model="scope.row.status" active-value="0" inactive-value="1" @change="handleStatusChange(scope.row)" />
        </template>
      </el-table-column>
      <el-table-column label="创建时间" align="center" prop="createTime" width="170">
        <template #default="scope"><span>{{ parseTime(scope.row.createTime) }}</span></template>
      </el-table-column>
      <el-table-column label="操作" align="center" width="180" class-name="small-padding fixed-width">
        <template #default="scope">
          <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['system:user:edit']">修改</el-button>
          <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['system:user:remove']">删除</el-button>
          <el-button link type="primary" icon="Key" @click="handleResetPwd(scope.row)" v-hasPermi="['system:user:resetPwd']">重置</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />

    <el-dialog :title="title" v-model="open" width="640px" append-to-body>
      <el-form :model="form" :rules="rules" ref="userRef" label-width="80px">
        <el-row>
          <el-col :span="24">
            <el-form-item label="用户头像">
              <div class="av-edit">
                <el-upload
                  class="av-upload"
                  :show-file-list="false"
                  :action="avatarAction"
                  :headers="uploadHeaders"
                  :data="avatarData"
                  :name="avatarName"
                  accept="image/png,image/jpeg,image/jpg,image/gif,image/bmp"
                  :before-upload="beforeAvatarUpload"
                  :on-success="onAvatarSuccess"
                  :on-error="onAvatarError"
                >
                  <div class="av-box" :class="{ busy: avatarBusy }">
                    <img v-if="form.avatar && !avatarBroken" :src="resolveAvatar(form.avatar)" alt="头像" @error="avatarBroken = true" />
                    <span v-else class="av-text">{{ (form.nickName || form.userName || 'U').charAt(0).toUpperCase() }}</span>
                    <div class="av-mask">{{ avatarBusy ? '上传中…' : '更换头像' }}</div>
                  </div>
                </el-upload>
                <div class="av-tip">
                  <p>点击头像上传，支持 jpg / png / gif，不超过 5MB</p>
                  <p class="av-tip-sub">上传后立即同步到商城前台，用户无需重新登录</p>
                </div>
              </div>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="12">
            <el-form-item label="用户昵称" prop="nickName">
              <el-input v-model="form.nickName" placeholder="请输入用户昵称" maxlength="30" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="归属部门" prop="deptId">
              <el-tree-select v-model="form.deptId" :data="deptOptions" :props="{ value: 'id', label: 'label', children: 'children' }"
                value-key="id" placeholder="请选择归属部门" check-strictly style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="12">
            <el-form-item label="手机号码" prop="phonenumber">
              <el-input v-model="form.phonenumber" placeholder="请输入手机号码" maxlength="11" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="邮箱" prop="email">
              <el-input v-model="form.email" placeholder="请输入邮箱" maxlength="50" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="12">
            <el-form-item v-if="form.userId == undefined" label="用户名" prop="userName">
              <el-input v-model="form.userName" placeholder="请输入用户名" maxlength="30" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item v-if="form.userId == undefined" label="密码" prop="password">
              <el-input v-model="form.password" placeholder="请输入密码" type="password" maxlength="20" show-password />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="12">
            <el-form-item label="用户性别">
              <el-select v-model="form.sex" placeholder="请选择">
                <el-option v-for="dict in sys_user_sex" :key="dict.value" :label="dict.label" :value="dict.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态">
              <el-radio-group v-model="form.status">
                <el-radio v-for="dict in sys_normal_disable" :key="dict.value" :value="dict.value">{{ dict.label }}</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="12">
            <el-form-item label="岗位">
              <el-select v-model="form.postIds" multiple placeholder="请选择">
                <el-option v-for="item in postOptions" :key="item.postId" :label="item.postName" :value="item.postId" :disabled="item.status == 1" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="角色">
              <el-select v-model="form.roleIds" multiple placeholder="请选择">
                <el-option v-for="item in roleOptions" :key="item.roleId" :label="item.roleName" :value="item.roleId" :disabled="item.status == 1" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="24">
            <el-form-item label="备注">
              <el-input v-model="form.remark" type="textarea" placeholder="请输入内容"></el-input>
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

    <!-- 批量添加用户（Excel 导入） -->
    <el-dialog title="批量添加用户" v-model="importOpen" width="540px" append-to-body>
      <el-alert type="info" :closable="false" show-icon>
        <template #title>
          通过 Excel 一次性添加多个用户：下载模板 → 按列填写 → 上传即可。
        </template>
        <div class="imp-desc">登录账号、用户昵称、密码为必填项；部门/角色可留空，默认归入「若依科技 / 普通角色」。</div>
      </el-alert>

      <div class="imp-tools">
        <el-button type="primary" link icon="Download" @click="downloadTemplate">下载导入模板</el-button>
      </div>

      <el-upload
        drag
        :auto-upload="false"
        :limit="1"
        :file-list="importFileList"
        accept=".xlsx,.xls"
        :on-change="onImportFileChange"
        :on-remove="onImportFileRemove"
        :on-exceed="() => proxy.$modal.msgWarning('一次只能导入一个文件')"
      >
        <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
        <div class="el-upload__text">拖拽 Excel 文件到此处，或<em>点击选择文件</em></div>
        <template #tip>
          <div class="el-upload__tip">仅支持 .xlsx / .xls，单文件不超过 10MB</div>
        </template>
      </el-upload>

      <el-checkbox v-model="updateSupport" class="imp-update">更新已存在的同名用户数据</el-checkbox>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="importOpen = false">取 消</el-button>
          <el-button type="primary" :loading="importing" :disabled="!importFile" @click="submitImport">
            {{ importing ? '导入中…' : '开始导入' }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="SysUser">
import { ref, reactive, toRefs, getCurrentInstance, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'
import { listUser, getUser, delUser, addUser, updateUser, resetUserPwd, changeUserStatus, deptTreeSelect } from '@/api/system/user'
import { listRole } from '@/api/system/role'
import { listPost } from '@/api/system/post'
import { getToken } from '@/utils/auth'
import { useUserStore } from '@/store/modules/user'

const { proxy } = getCurrentInstance()
const { sys_normal_disable, sys_user_sex } = proxy.useDict('sys_normal_disable', 'sys_user_sex')
const userStore = useUserStore()

/* ===== 头像（管理员可给任意用户上传，同步到商城前台） ===== */
const apiBase = import.meta.env.VITE_APP_BASE_API || '/dev-api'
const uploadHeaders = { Authorization: 'Bearer ' + getToken() }
const avatarBusy = ref(false)
const avatarBroken = ref(false)
const brokenAvatars = reactive(new Set())
// 老用户走管理员头像接口（直接写库并刷新其在线会话）；新用户先传通用接口，保存时随表单入库
const avatarAction = computed(() => form.value.userId ? apiBase + '/system/user/avatar' : apiBase + '/common/upload')
const avatarName = computed(() => form.value.userId ? 'avatarfile' : 'file')
const avatarData = computed(() => form.value.userId ? { userId: form.value.userId } : {})

function resolveAvatar(p) {
  if (!p) return ''
  if (/^https?:\/\//.test(p)) return p
  return apiBase + (p.startsWith('/') ? p : '/' + p)
}
function markBroken(userId) { brokenAvatars.add(userId) }
function beforeAvatarUpload(file) {
  if (!/^image\//.test(file.type)) { ElMessage.warning('只能上传图片文件'); return false }
  if (file.size > 5 * 1024 * 1024) { ElMessage.warning('图片大小不能超过 5MB'); return false }
  avatarBusy.value = true
  return true
}
function onAvatarSuccess(res) {
  avatarBusy.value = false
  const url = (res && (res.imgUrl || res.url)) || ''
  if (res && res.code === 200 && url) {
    form.value.avatar = url
    avatarBroken.value = false
    if (form.value.userId) brokenAvatars.delete(form.value.userId)
    // 列表行同步刷新，管理员立刻能看到新头像
    const row = userList.value.find(u => String(u.userId) === String(form.value.userId))
    if (row) row.avatar = url
    // 改的是当前登录管理员自己：顶栏头像即时更新
    if (form.value.userId && String(form.value.userId) === String(userStore.userId)) {
      userStore.avatar = url
    }
    ElMessage.success(form.value.userId ? '头像已更新，前台将自动同步' : '头像已选择，保存后生效')
  } else {
    ElMessage.error((res && res.msg) || '头像上传失败')
  }
}
function onAvatarError() {
  avatarBusy.value = false
  ElMessage.error('头像上传失败，请稍后重试')
}

const userList = ref([])
const loading = ref(true)
const showSearch = ref(true)
const ids = ref([])
const single = ref(true)
const multiple = ref(true)
const total = ref(0)
const title = ref('')
const open = ref(false)
const deptOptions = ref([])
const postOptions = ref([])
const roleOptions = ref([])

const data = reactive({
  form: {},
  queryParams: { pageNum: 1, pageSize: 10, userName: undefined, phonenumber: undefined, status: undefined, deptId: undefined },
  rules: {
    userName: [{ required: true, message: '用户名不能为空', trigger: 'blur' }, { min: 2, max: 20, message: '长度 2 到 20 个字符', trigger: 'blur' }],
    nickName: [{ required: true, message: '用户昵称不能为空', trigger: 'blur' }],
    password: [{ required: true, message: '密码不能为空', trigger: 'blur' }, { min: 5, max: 20, message: '长度 5 到 20 个字符', trigger: 'blur' }],
    email: [{ type: 'email', message: '请输入正确的邮箱地址', trigger: ['blur', 'change'] }],
    phonenumber: [{ pattern: /^1[3|4|5|6|7|8|9][0-9]\d{8}$/, message: '请输入正确的手机号码', trigger: 'blur' }]
  }
})
const { queryParams, form, rules } = toRefs(data)

function getList() {
  loading.value = true
  listUser(queryParams.value).then(res => {
    userList.value = res.rows
    total.value = res.total
    loading.value = false
  }).catch(() => { loading.value = false })
}

function getDeptTree() {
  deptTreeSelect().then(res => { deptOptions.value = res.data })
}
function getRoles() {
  listRole({ pageNum: 1, pageSize: 100 }).then(res => { roleOptions.value = res.rows })
}
function getPosts() {
  listPost({ pageNum: 1, pageSize: 100 }).then(res => { postOptions.value = res.rows })
}

function handleQuery() { queryParams.value.pageNum = 1; getList() }
function resetQuery() { proxy.resetForm('queryRef'); handleQuery() }
function handleSelectionChange(selection) {
  ids.value = selection.map(item => item.userId)
  single.value = selection.length !== 1
  multiple.value = !selection.length
}
function handleStatusChange(row) {
  const text = row.status === '0' ? '启用' : '停用'
  proxy.$modal.confirm('确认要"' + text + '""' + row.userName + '"用户吗？').then(() => {
    return changeUserStatus(row.userId, row.status)
  }).then(() => {
    proxy.$modal.msgSuccess(text + '成功')
  }).catch(() => { row.status = row.status === '0' ? '1' : '0' })
}
function reset() {
  form.value = {
    userId: undefined, deptId: undefined, userName: undefined, nickName: undefined,
    password: undefined, phonenumber: undefined, email: undefined, sex: undefined,
    avatar: undefined, status: '0', remark: undefined, postIds: [], roleIds: []
  }
  avatarBroken.value = false
  proxy.resetForm('userRef')
}
function handleAdd() { reset(); getDeptTree(); open.value = true; title.value = '新增用户' }
function handleUpdate(row) {
  reset(); getDeptTree()
  const userId = row.userId || ids.value[0]
  getUser(userId).then(res => {
    form.value = res.data
    form.value.postIds = res.postIds
    form.value.roleIds = res.roleIds
    avatarBroken.value = false
    open.value = true
    title.value = '修改用户'
  })
}
function submitForm() {
  proxy.$refs.userRef.validate(valid => {
    if (valid) {
      if (form.value.userId) {
        updateUser(form.value).then(() => {
          proxy.$modal.msgSuccess('修改成功')
          // 改的是当前登录账号：顶栏昵称/头像同步刷新
          if (String(form.value.userId) === String(userStore.userId)) {
            userStore.nickName = form.value.nickName
            if (form.value.avatar) userStore.avatar = form.value.avatar
          }
          open.value = false; getList()
        })
      } else {
        addUser(form.value).then(() => { proxy.$modal.msgSuccess('新增成功'); open.value = false; getList() })
      }
    }
  })
}
function handleDelete(row) {
  const userIds = row.userId || ids.value
  proxy.$modal.confirm('是否确认删除用户编号为"' + userIds + '"的数据项？').then(() => {
    return delUser(userIds)
  }).then(() => { getList(); proxy.$modal.msgSuccess('删除成功') }).catch(() => {})
}
function handleResetPwd(row) {
  proxy.$modal.prompt('请输入"' + row.userName + '"的新密码').then(({ value }) => {
    if (!value) { proxy.$modal.msgError('密码不能为空'); return }
    resetUserPwd(row.userId, value).then(() => { proxy.$modal.msgSuccess('修改成功，新密码是：' + value) })
  }).catch(() => {})
}
function handleExport() {
  proxy.download('system/user/export', { ...queryParams.value }, `user_${new Date().getTime()}.xlsx`)
}

/* ===== 批量添加用户（Excel 导入） ===== */
const importOpen = ref(false)
const importing = ref(false)
const importFile = ref(null)
const importFileList = ref([])
const updateSupport = ref(false)

function handleImport() {
  importOpen.value = true
  importFile.value = null
  importFileList.value = []
  updateSupport.value = false
}

function downloadTemplate() {
  proxy.download('system/user/importTemplate', {}, '用户导入模板.xlsx')
}

function onImportFileChange(file) {
  const name = file.name || ''
  if (!/\.(xlsx|xls)$/i.test(name)) {
    ElMessage.warning('只能选择 .xlsx / .xls 文件')
    importFileList.value = []
    importFile.value = null
    return
  }
  if (file.size && file.size > 10 * 1024 * 1024) {
    ElMessage.warning('文件不能超过 10MB')
    importFileList.value = []
    importFile.value = null
    return
  }
  importFile.value = file.raw
  importFileList.value = [file]
}

function onImportFileRemove() {
  importFile.value = null
  importFileList.value = []
}

async function submitImport() {
  if (!importFile.value) {
    ElMessage.warning('请先选择要导入的 Excel 文件')
    return
  }
  importing.value = true
  const fd = new FormData()
  fd.append('file', importFile.value)
  fd.append('updateSupport', updateSupport.value)
  try {
    // 必须用原生 fetch：axios 全局 JSON Content-Type 会让 FormData 失去 multipart boundary
    const base = import.meta.env.VITE_APP_BASE_API || '/dev-api'
    const resp = await fetch(base + '/system/user/importData', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + getToken() },
      body: fd
    })
    const res = await resp.json()
    if (res.code === 200) {
      ElMessage.success({
        message: (res.msg || '导入成功').replace(/<br\s*\/?>/gi, '<br/>'),
        dangerouslyUseHTMLString: true,
        duration: 6000
      })
      importOpen.value = false
      importFile.value = null
      importFileList.value = []
      getList()
    } else {
      ElMessage.error(res.msg || '导入失败，请检查模板格式')
    }
  } catch (e) {
    ElMessage.error('导入失败，请检查网络连接或模板格式')
  } finally {
    importing.value = false
  }
}

function cancel() { open.value = false; reset() }

getList(); getRoles(); getPosts()
</script>

<style scoped>
.row-av {
  width: 34px; height: 34px; margin: 0 auto; border-radius: 50%; overflow: hidden;
  background: linear-gradient(135deg, var(--brand-500), var(--brand-300)); color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 600;
}
.row-av img { width: 100%; height: 100%; object-fit: cover; display: block; }

.av-edit { display: flex; align-items: center; gap: 16px; }
.av-box {
  position: relative; width: 76px; height: 76px; border-radius: 50%; overflow: hidden;
  background: linear-gradient(135deg, var(--brand-500), var(--brand-300)); color: #fff;
  display: flex; align-items: center; justify-content: center; cursor: pointer;
  border: 2px dashed var(--brand-300);
}
.av-box img { width: 100%; height: 100%; object-fit: cover; display: block; }
.av-text { font-size: 28px; font-weight: 700; }
.av-mask {
  position: absolute; inset: 0; background: rgba(0, 0, 0, .45); color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; opacity: 0; transition: opacity .2s;
}
.av-box:hover .av-mask, .av-box.busy .av-mask { opacity: 1; }
.av-tip p { margin: 0; font-size: 12px; color: var(--text-3); line-height: 1.7; }
.av-tip .av-tip-sub { color: #b0b3b8; }
@media (max-width: 768px) {
  .av-mask { opacity: 1; background: rgba(0,0,0,.35); }
}

.imp-desc {
  margin-top: 6px;
  font-size: 12px;
  color: var(--text-3);
  line-height: 1.6;
}
.imp-tools {
  margin: 14px 0 10px;
}
.imp-update {
  margin-top: 14px;
}
</style>
