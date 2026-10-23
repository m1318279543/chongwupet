<template>
  <div class="pref-admin">
    <el-card shadow="never" class="search-card">
      <el-form :model="queryParams" inline>
        <el-form-item label="宠物名称">
          <el-input v-model="queryParams.petName" placeholder="请输入" clearable style="width: 160px" @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item label="喜欢的食物">
          <el-input v-model="queryParams.foodLike" placeholder="请输入" clearable style="width: 160px" @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="queryParams.status" placeholder="全部" clearable style="width: 110px">
            <el-option label="正常" value="0" /><el-option label="停用" value="1" />
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
          <span>共 {{ total }} 条喜好记录</span>
          <el-button type="primary" @click="handleAdd">新增喜好</el-button>
        </div>
      </template>

      <el-table v-loading="loading" :data="list" border stripe>
        <el-table-column label="宠物" min-width="180">
          <template #default="{ row }">
            <div class="pet-cell">
              <img v-if="isImage(row.image)" :src="row.image" class="thumb" :alt="row.petName" />
              <span v-else class="thumb-emoji">—</span>
              <div class="pet-meta">
                <el-link type="primary" underline="never" @click="goFront(row)">{{ row.petName }}</el-link>
                <span class="sub">{{ row.breed || '—' }}</span>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="爱吃" prop="foodLike" min-width="140" show-overflow-tooltip />
        <el-table-column label="爱玩" prop="toyLike" min-width="140" show-overflow-tooltip />
        <el-table-column label="性格" prop="personality" min-width="140" show-overflow-tooltip />
        <el-table-column label="活跃度" width="90">
          <template #default="{ row }"><el-tag size="small">{{ row.activityLevel || '—' }}</el-tag></template>
        </el-table-column>
        <el-table-column label="禁忌" prop="taboo" min-width="160" show-overflow-tooltip />
        <el-table-column label="状态" width="80">
          <template #default="{ row }"><el-tag :type="row.status === '0' ? 'success' : 'info'">{{ row.status === '0' ? '正常' : '停用' }}</el-tag></template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleUpdate(row)">修改</el-button>
            <el-button link type="success" @click="goFront(row)">前台</el-button>
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

    <el-dialog :title="title" v-model="open" width="720px" append-to-body>
      <el-form :model="form" label-width="100px">
        <el-form-item label="宠物">
          <el-input v-model="form.petName" :disabled="form.preferenceId != null" placeholder="宠物名称" style="width: 200px" />
          <el-input v-model.number="form.petId" :disabled="form.preferenceId != null" type="number" placeholder="宠物ID" style="width: 140px; margin-left: 8px" />
        </el-form-item>
        <el-form-item label="爱吃"><el-input v-model="form.foodLike" placeholder="如 猫粮、冻干、猫条" /></el-form-item>
        <el-form-item label="爱玩"><el-input v-model="form.toyLike" placeholder="如 逗猫棒、猫爬架" /></el-form-item>
        <el-form-item label="性格"><el-input v-model="form.personality" placeholder="如 独立又粘人" /></el-form-item>
        <el-form-item label="活跃度">
          <el-select v-model="form.activityLevel" style="width: 160px">
            <el-option label="高" value="高" /><el-option label="中" value="中" /><el-option label="低" value="低" />
          </el-select>
        </el-form-item>
        <el-form-item label="喜欢的环境"><el-input v-model="form.envLike" type="textarea" :rows="2" /></el-form-item>
        <el-form-item label="禁忌注意"><el-input v-model="form.taboo" type="textarea" :rows="2" placeholder="如 严禁巧克力、洋葱" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="form.note" type="textarea" :rows="2" /></el-form-item>
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
import { listPetPreference, addPetPreference, updatePetPreference, delPetPreference } from '@/api/pet/petPreference'

const list = ref([])
const total = ref(0)
const loading = ref(false)
const open = ref(false)
const title = ref('')
const submitting = ref(false)

const queryParams = reactive({ pageNum: 1, pageSize: 10, petName: '', foodLike: '', status: '' })
const form = reactive(emptyForm())
function emptyForm() {
  return { preferenceId: null, petId: null, petName: '', foodLike: '', toyLike: '', personality: '',
    activityLevel: '中', envLike: '', taboo: '', note: '', status: '0' }
}
function isImage(s) { return !!s && (s.indexOf('/') === 0 || s.indexOf('http') === 0) }
function goFront(row) { window.open('/shop/pet/' + row.petId, '_blank') }

async function getList() {
  loading.value = true
  try {
    const res = await listPetPreference(queryParams)
    list.value = res.rows || []
    total.value = res.total || 0
  } catch (e) { ElMessage.error(e?.message || '加载失败') }
  finally { loading.value = false }
}
function handleQuery() { queryParams.pageNum = 1; getList() }
function resetQuery() { queryParams.petName = ''; queryParams.foodLike = ''; queryParams.status = ''; handleQuery() }
function handleAdd() { Object.assign(form, emptyForm()); title.value = '新增宠物喜好'; open.value = true }
function handleUpdate(row) { Object.assign(form, emptyForm(), JSON.parse(JSON.stringify(row))); title.value = '修改宠物喜好'; open.value = true }
async function submitForm() {
  if (!form.petId) { ElMessage.warning('请填写宠物ID'); return }
  submitting.value = true
  try {
    if (form.preferenceId) { await updatePetPreference(form); ElMessage.success('修改成功') }
    else { await addPetPreference(form); ElMessage.success('新增成功') }
    open.value = false; getList()
  } catch (e) { ElMessage.error(e?.message || '操作失败') }
  finally { submitting.value = false }
}
async function handleDelete(row) {
  try { await ElMessageBox.confirm(`确定删除「${row.petName || row.preferenceId}」的喜好记录吗？`, '提示', { type: 'warning' }) }
  catch (e) { return }
  try { await delPetPreference(row.preferenceId); ElMessage.success('删除成功'); getList() }
  catch (e) { ElMessage.error(e?.message || '删除失败') }
}
onMounted(getList)
</script>

<style scoped lang="scss">
.pref-admin { padding: 4px; }
.search-card { margin-bottom: 14px; }
.table-card .card-head { display: flex; align-items: center; justify-content: space-between; font-size: 14px; color: var(--text-2); }
.pet-cell { display: flex; align-items: center; gap: 10px;
  .thumb { width: 44px; height: 44px; border-radius: 8px; object-fit: cover; }
  .thumb-emoji { width: 44px; height: 44px; border-radius: 8px; background: var(--brand-50); display: flex; align-items: center; justify-content: center; font-size: 20px; }
  .pet-meta { display: flex; flex-direction: column; line-height: 1.4; .sub { color: var(--text-3); font-size: 12px; } }
}
.pager { display: flex; justify-content: flex-end; margin-top: 16px; }
</style>
