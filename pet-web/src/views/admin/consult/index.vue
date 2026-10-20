<template>
  <div class="consult-admin">
    <el-card shadow="never" class="search-card">
      <el-form :model="queryParams" inline>
        <el-form-item label="用户名">
          <el-input v-model="queryParams.userName" placeholder="请输入" clearable style="width: 160px" @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="queryParams.status" placeholder="全部" clearable style="width: 120px">
            <el-option label="待回复" value="0" /><el-option label="已回复" value="1" />
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
          <span>共 {{ total }} 条咨询</span>
          <el-button type="success" @click="handleQuery">刷新</el-button>
        </div>
      </template>

      <el-table v-loading="loading" :data="list" border stripe>
        <el-table-column label="用户" prop="userName" width="120" />
        <el-table-column label="联系方式" prop="contact" width="140" show-overflow-tooltip />
        <el-table-column label="咨询内容" prop="question" min-width="240" show-overflow-tooltip />
        <el-table-column label="状态" width="90">
          <template #default="{ row }"><el-tag :type="row.status === '1' ? 'success' : 'info'">{{ row.status === '1' ? '已回复' : '待回复' }}</el-tag></template>
        </el-table-column>
        <el-table-column label="客服回复" prop="reply" min-width="200" show-overflow-tooltip />
        <el-table-column label="提交时间" prop="createTime" width="160" />
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleReply(row)">回复</el-button>
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

    <el-dialog :title="'回复咨询 · ' + replyRow.userName" v-model="open" width="560px" append-to-body>
      <el-descriptions :column="1" border size="small" style="margin-bottom: 16px">
        <el-descriptions-item label="用户">{{ replyRow.userName }}</el-descriptions-item>
        <el-descriptions-item label="联系方式">{{ replyRow.contact || '—' }}</el-descriptions-item>
        <el-descriptions-item label="咨询内容">{{ replyRow.question }}</el-descriptions-item>
      </el-descriptions>
      <el-input v-model="replyText" type="textarea" :rows="4" maxlength="800" show-word-limit placeholder="请输入回复内容" />
      <template #footer>
        <el-button @click="open = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitReply">发送回复</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { listPetConsult, replyConsult, delPetConsult } from '@/api/pet/petConsult'

const list = ref([])
const total = ref(0)
const loading = ref(false)
const open = ref(false)
const submitting = ref(false)
const replyRow = ref({})
const replyText = ref('')

const queryParams = reactive({ pageNum: 1, pageSize: 10, userName: '', status: '' })

async function getList() {
  loading.value = true
  try {
    const res = await listPetConsult(queryParams)
    list.value = res.rows || []
    total.value = res.total || 0
  } catch (e) { ElMessage.error(e?.message || '加载失败') }
  finally { loading.value = false }
}
function handleQuery() { queryParams.pageNum = 1; getList() }
function resetQuery() { queryParams.userName = ''; queryParams.status = ''; handleQuery() }
function handleReply(row) { replyRow.value = row; replyText.value = row.reply || ''; open.value = true }
async function submitReply() {
  if (!replyText.value.trim()) { ElMessage.warning('请填写回复内容'); return }
  submitting.value = true
  try {
    await replyConsult({ consultId: replyRow.value.consultId, reply: replyText.value.trim() })
    ElMessage.success('已回复用户')
    open.value = false; getList()
  } catch (e) { ElMessage.error(e?.message || '回复失败') }
  finally { submitting.value = false }
}
async function handleDelete(row) {
  try { await ElMessageBox.confirm('确定删除该咨询记录吗？', '提示', { type: 'warning' }) }
  catch (e) { return }
  try { await delPetConsult(row.consultId); ElMessage.success('删除成功'); getList() }
  catch (e) { ElMessage.error(e?.message || '删除失败') }
}
onMounted(getList)
</script>

<style scoped lang="scss">
.consult-admin { padding: 4px; }
.search-card { margin-bottom: 14px; }
.table-card .card-head { display: flex; align-items: center; justify-content: space-between; font-size: 14px; color: #606266; }
.pager { display: flex; justify-content: flex-end; margin-top: 16px; }
</style>
