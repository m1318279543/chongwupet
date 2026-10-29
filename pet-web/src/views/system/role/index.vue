<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="68px">
      <el-form-item label="角色名称" prop="roleName">
        <el-input v-model="queryParams.roleName" placeholder="请输入角色名称" clearable style="width: 220px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="权限字符" prop="roleKey">
        <el-input v-model="queryParams.roleKey" placeholder="请输入权限字符" clearable style="width: 220px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="角色状态" clearable style="width: 160px">
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
        <el-button type="primary" plain icon="Plus" @click="handleAdd" v-hasPermi="['system:role:add']">新增</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="success" plain icon="Edit" :disabled="single" @click="handleUpdate" v-hasPermi="['system:role:edit']">修改</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete" v-hasPermi="['system:role:remove']">删除</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="warning" plain icon="Download" @click="handleExport" v-hasPermi="['system:role:export']">导出</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="roleList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column label="角色编号" prop="roleId" width="100" />
      <el-table-column label="角色名称" prop="roleName" :show-overflow-tooltip="true" />
      <el-table-column label="权限字符" prop="roleKey" :show-overflow-tooltip="true" />
      <el-table-column label="显示顺序" prop="roleSort" width="100" />
      <el-table-column label="状态" width="90">
        <template #default="scope">
          <el-switch v-model="scope.row.status" active-value="0" inactive-value="1" @change="handleStatusChange(scope.row)" />
        </template>
      </el-table-column>
      <el-table-column label="创建时间" prop="createTime" width="170">
        <template #default="scope"><span>{{ parseTime(scope.row.createTime) }}</span></template>
      </el-table-column>
      <el-table-column label="操作" align="center" width="160" class-name="small-padding fixed-width">
        <template #default="scope">
          <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['system:role:edit']">修改</el-button>
          <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['system:role:remove']">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />

    <el-dialog :title="title" v-model="open" width="560px" append-to-body>
      <el-form ref="roleRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="角色名称" prop="roleName">
          <el-input v-model="form.roleName" placeholder="请输入角色名称" />
        </el-form-item>
        <el-form-item prop="roleKey">
          <template #label>
            <span>
              <el-tooltip content="控制器中定义的权限字符，如：@PreAuthorize(`@ss.hasRole('admin')`)" placement="top">
                <el-icon><question-filled /></el-icon>
              </el-tooltip>
              权限字符
            </span>
          </template>
          <el-input v-model="form.roleKey" placeholder="请输入权限字符" />
        </el-form-item>
        <el-form-item label="显示顺序" prop="roleSort">
          <el-input-number v-model="form.roleSort" controls-position="right" :min="0" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio v-for="dict in sys_normal_disable" :key="dict.value" :value="dict.value">{{ dict.label }}</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="菜单权限">
          <el-checkbox v-model="menuExpand" @change="handleCheckedTreeExpand">展开/折叠</el-checkbox>
          <el-checkbox v-model="menuNodeAll" @change="handleCheckedTreeNodeAll">全选/全不选</el-checkbox>
          <el-tree ref="menuRef" class="tree-border" :data="menuOptions" show-checkbox node-key="id"
            :props="{ label: 'label', children: 'children' }" empty-text="加载中，请稍候" />
        </el-form-item>
        <el-form-item label="备注">
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
  </div>
</template>

<script setup name="SysRole">
import { ref, reactive, toRefs, getCurrentInstance, nextTick } from 'vue'
import { listRole, getRole, addRole, updateRole, delRole, changeRoleStatus, dataScope } from '@/api/system/role'
import { treeselect as menuTreeselect, roleMenuTreeselect } from '@/api/system/menu'

const { proxy } = getCurrentInstance()
const { sys_normal_disable } = proxy.useDict('sys_normal_disable')

const roleList = ref([])
const loading = ref(true)
const showSearch = ref(true)
const ids = ref([])
const single = ref(true)
const multiple = ref(true)
const total = ref(0)
const title = ref('')
const open = ref(false)
const menuOptions = ref([])
const menuExpand = ref(false)
const menuNodeAll = ref(false)
const menuRef = ref(null)

const data = reactive({
  form: {},
  queryParams: { pageNum: 1, pageSize: 10, roleName: undefined, roleKey: undefined, status: undefined },
  rules: {
    roleName: [{ required: true, message: '角色名称不能为空', trigger: 'blur' }],
    roleKey: [{ required: true, message: '权限字符不能为空', trigger: 'blur' }],
    roleSort: [{ required: true, message: '显示顺序不能为空', trigger: 'blur' }]
  }
})
const { queryParams, form, rules } = toRefs(data)

function getList() {
  loading.value = true
  listRole(queryParams.value).then(res => {
    roleList.value = res.rows
    total.value = res.total
    loading.value = false
  }).catch(() => { loading.value = false })
}

function getMenuTreeselect() {
  menuTreeselect().then(res => { menuOptions.value = res.data })
}
function handleCheckedTreeExpand(value) {
  const nodes = menuRef.value.store.nodesMap
  for (const i in nodes) { nodes[i].expanded = value }
}
function handleCheckedTreeNodeAll(value) {
  menuRef.value.setCheckedNodes(value ? menuOptions.value : [])
}
function getAllCheckedKeys() {
  const checked = menuRef.value.getCheckedKeys()
  const halfChecked = menuRef.value.getHalfCheckedKeys()
  return checked.concat(halfChecked)
}
function reset() {
  if (menuRef.value) { menuRef.value.setCheckedKeys([]) }
  menuExpand.value = false
  menuNodeAll.value = false
  form.value = { roleId: undefined, roleName: undefined, roleKey: undefined, roleSort: 0, status: '0', menuIds: [], remark: undefined }
  proxy.resetForm('roleRef')
}
function handleAdd() { reset(); getMenuTreeselect(); open.value = true; title.value = '新增角色' }
function handleUpdate(row) {
  reset()
  const roleId = row.roleId || ids.value[0]
  getRole(roleId).then(res => {
    form.value = res.data
    open.value = true
    title.value = '修改角色'
    nextTick(() => {
      roleMenuTreeselect(roleId).then(r => {
        menuOptions.value = r.menus
        nextTick(() => {
          r.checkedKeys.forEach(k => { menuRef.value.setChecked(k, true, false) })
        })
      })
    })
  })
}
function submitForm() {
  proxy.$refs.roleRef.validate(valid => {
    if (valid) {
      form.value.menuIds = getAllCheckedKeys()
      if (form.value.roleId) {
        updateRole(form.value).then(() => { proxy.$modal.msgSuccess('修改成功'); open.value = false; getList() })
      } else {
        addRole(form.value).then(() => { proxy.$modal.msgSuccess('新增成功'); open.value = false; getList() })
      }
    }
  })
}
function handleStatusChange(row) {
  const text = row.status === '0' ? '启用' : '停用'
  proxy.$modal.confirm('确认要"' + text + '""' + row.roleName + '"角色吗？').then(() => {
    return changeRoleStatus(row.roleId, row.status)
  }).then(() => { proxy.$modal.msgSuccess(text + '成功') }).catch(() => {
    row.status = row.status === '0' ? '1' : '0'
  })
}
function handleDelete(row) {
  const roleIds = row.roleId || ids.value
  proxy.$modal.confirm('是否确认删除角色编号为"' + roleIds + '"的数据项？').then(() => {
    return delRole(roleIds)
  }).then(() => { getList(); proxy.$modal.msgSuccess('删除成功') }).catch(() => {})
}
function handleExport() {
  proxy.download('system/role/export', { ...queryParams.value }, `role_${new Date().getTime()}.xlsx`)
}
function cancel() { open.value = false; reset() }
function handleQuery() { queryParams.value.pageNum = 1; getList() }
function resetQuery() { proxy.resetForm('queryRef'); handleQuery() }
function handleSelectionChange(selection) {
  ids.value = selection.map(item => item.roleId)
  single.value = selection.length !== 1
  multiple.value = !selection.length
}

getList()
</script>

<style scoped>
.tree-border { margin-top: 5px; border: 1px solid var(--border-1); background: var(--bg-card) none; border-radius: var(--radius-xs); max-height: 220px; overflow-y: auto; }
</style>
