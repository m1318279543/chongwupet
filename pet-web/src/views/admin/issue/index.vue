<template>
  <div class="issue-admin">
    <el-card shadow="never" class="search-card">
      <el-form :model="queryParams" inline>
        <el-form-item label="问题名称">
          <el-input v-model="queryParams.issueName" placeholder="请输入" clearable style="width: 180px" @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item label="科系">
          <el-select v-model="queryParams.family" placeholder="全部" clearable style="width: 140px">
            <el-option v-for="f in familyOptions" :key="f" :label="f" :value="f" />
          </el-select>
        </el-form-item>
        <el-form-item label="严重程度">
          <el-select v-model="queryParams.severity" placeholder="全部" clearable style="width: 120px">
            <el-option label="轻" value="轻" /><el-option label="中" value="中" /><el-option label="重" value="重" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleQuery">搜索</el-button>
          <el-button @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" class="table-card">
      <template #header>
        <div class="card-head">
          <span>共 {{ total }} 条知识库条目</span>
          <el-button type="primary" @click="handleAdd">新增问题</el-button>
        </div>
      </template>

      <el-table v-loading="loading" :data="list" border stripe>
        <el-table-column label="问题" prop="issueName" min-width="160" />
        <el-table-column label="科系" width="100">
          <template #default="{ row }"><el-tag size="small" type="info">{{ row.family || '—' }}</el-tag></template>
        </el-table-column>
        <el-table-column label="严重程度" width="100">
          <template #default="{ row }"><el-tag size="small" :type="row.severity === '重' ? 'danger' : row.severity === '中' ? 'warning' : 'success'">{{ row.severity || '轻' }}</el-tag></template>
        </el-table-column>
        <el-table-column label="症状" prop="symptoms" min-width="200" show-overflow-tooltip />
        <el-table-column label="解决措施" prop="solution" min-width="220" show-overflow-tooltip />
        <el-table-column label="状态" width="80">
          <template #default="{ row }"><el-tag :type="row.status === '0' ? 'success' : 'info'">{{ row.status === '0' ? '正常' : '停用' }}</el-tag></template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleUpdate(row)">修改</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pager">
        <el-pagination v-model:current-page="queryParams.pageNum" v-model:page-size="queryParams.pageSize"
          :page-sizes="[10, 20, 50]" :total="total" layout="total, sizes, prev, pager, next, jumper"
          @size-change="getList" @current-change="getList" />
      </div>
    </el-card>

    <el-dialog :title="title" v-model="open" width="760px" append-to-body>
      <el-form :model="form" label-width="100px">
        <el-form-item label="问题名称"><el-input v-model="form.issueName" placeholder="如 猫软便/腹泻" /></el-form-item>
        <el-form-item label="科系">
          <el-select v-model="form.family" filterable allow-create default-first-option placeholder="选择或输入科系" style="width: 220px">
            <el-option v-for="f in familyOptions" :key="f" :label="f" :value="f" />
          </el-select>
        </el-form-item>
        <el-form-item label="关联分类">
          <el-select v-model="form.categoryId" clearable placeholder="可选（留空=通用）" style="width: 220px">
            <el-option v-for="c in categories" :key="c.categoryId" :label="c.categoryName" :value="c.categoryId" />
          </el-select>
        </el-form-item>
        <el-form-item label="严重程度">
          <el-select v-model="form.severity" style="width: 160px">
            <el-option label="轻" value="轻" /><el-option label="中" value="中" /><el-option label="重" value="重" />
          </el-select>
        </el-form-item>
        <el-form-item label="症状表现"><el-input v-model="form.symptoms" type="textarea" :rows="2" /></el-form-item>
        <el-form-item label="诱因原因"><el-input v-model="form.cause" type="textarea" :rows="2" /></el-form-item>
        <el-form-item label="解决措施"><el-input v-model="form.solution" type="textarea" :rows="3" /></el-form-item>
        <el-form-item label="预防要点"><el-input v-model="form.prevention" type="textarea" :rows="2" /></el-form-item>
        <el-form-item label="显示顺序"><el-input-number v-model="form.sort" :min="0" :max="999" /></el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status"><el-radio value="0">正常</el-radio><el-radio value="1">停用</el-radio></el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="open = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitForm">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { listPetIssue, addPetIssue, updatePetIssue, delPetIssue } from '@/api/pet/petHealthIssue'
import { listCategory } from '@/api/pet/category'

const list = ref([])
const total = ref(0)
const loading = ref(false)
const open = ref(false)
const title = ref('')
const submitting = ref(false)
const categories = ref([])
const familyOptions = ['猫科', '犬科', '兔科', '鼠科', '鹦鹉科', '观赏鱼科', '爬行科']

const queryParams = reactive({ pageNum: 1, pageSize: 10, issueName: '', family: '', severity: '' })
const form = reactive(emptyForm())
function emptyForm() {
  return { issueId: null, categoryId: null, family: '猫科', issueName: '', symptoms: '', cause: '',
    solution: '', prevention: '', severity: '轻', sort: 0, status: '0' }
}

async function getList() {
  loading.value = true
  try {
    const res = await listPetIssue(queryParams)
    list.value = res.rows || []
    total.value = res.total || 0
  } catch (e) { ElMessage.error(e?.message || '加载失败') }
  finally { loading.value = false }
}
function handleQuery() { queryParams.pageNum = 1; getList() }
function resetQuery() { queryParams.issueName = ''; queryParams.family = ''; queryParams.severity = ''; handleQuery() }
function handleAdd() { Object.assign(form, emptyForm()); title.value = '新增健康问题'; open.value = true }
function handleUpdate(row) { Object.assign(form, emptyForm(), JSON.parse(JSON.stringify(row))); title.value = '修改健康问题'; open.value = true }
async function submitForm() {
  if (!form.issueName) { ElMessage.warning('请填写问题名称'); return }
  submitting.value = true
  try {
    if (form.issueId) { await updatePetIssue(form); ElMessage.success('修改成功') }
    else { await addPetIssue(form); ElMessage.success('新增成功') }
    open.value = false; getList()
  } catch (e) { ElMessage.error(e?.message || '操作失败') }
  finally { submitting.value = false }
}
async function handleDelete(row) {
  try { await ElMessageBox.confirm(`确定删除「${row.issueName}」吗？`, '提示', { type: 'warning' }) }
  catch (e) { return }
  try { await delPetIssue(row.issueId); ElMessage.success('删除成功'); getList() }
  catch (e) { ElMessage.error(e?.message || '删除失败') }
}
onMounted(() => { getList(); listCategory({ pageSize: 100 }).then(r => categories.value = r.rows || []) })
</script>

<style scoped lang="scss">
.issue-admin { padding: 4px; }
.search-card { margin-bottom: 14px; }
.table-card .card-head { display: flex; align-items: center; justify-content: space-between; font-size: 14px; color: #606266; }
.pager { display: flex; justify-content: flex-end; margin-top: 16px; }
</style>
