<template>
  <div class="health-admin">
    <!-- 搜索区 -->
    <el-card shadow="never" class="search-card">
      <el-form :model="queryParams" inline>
        <el-form-item label="宠物名称">
          <el-input v-model="queryParams.petName" placeholder="请输入宠物名称" clearable style="width: 160px" @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item label="档案编号">
          <el-input v-model="queryParams.archiveNo" placeholder="请输入档案编号" clearable style="width: 160px" @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item label="健康等级">
          <el-select v-model="queryParams.healthLevel" placeholder="全部" clearable style="width: 120px">
            <el-option label="优秀" value="优秀" />
            <el-option label="良好" value="良好" />
            <el-option label="观察中" value="观察中" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="queryParams.status" placeholder="全部" clearable style="width: 110px">
            <el-option label="正常" value="0" />
            <el-option label="停用" value="1" />
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
          <span>共 {{ total }} 份档案</span>
          <div>
            <el-button type="primary" @click="handleAdd">新增档案</el-button>
          </div>
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
        <el-table-column label="档案编号" prop="archiveNo" width="130" />
        <el-table-column label="健康等级" width="100">
          <template #default="{ row }">
            <el-tag :type="row.healthLevel === '优秀' ? 'success' : row.healthLevel === '良好' ? 'primary' : 'warning'">
              {{ row.healthLevel || '—' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="疫苗" min-width="200">
          <template #default="{ row }">
            <div class="cell-sm">{{ row.vaccineName }}</div>
            <div class="cell-sub">进度 {{ row.vaccineProgress }} · {{ fmtDate(row.vaccineDate) }}</div>
          </template>
        </el-table-column>
        <el-table-column label="体检结论" min-width="200">
          <template #default="{ row }">
            <div class="cell-sm">{{ row.examResult }}</div>
            <div class="cell-sub">{{ fmtDate(row.examDate) }} · {{ row.examHospital }}</div>
          </template>
        </el-table-column>
        <el-table-column label="来源" min-width="150">
          <template #default="{ row }">
            <div class="cell-sm">{{ row.sourceChannel }}</div>
            <div class="cell-sub">{{ row.sourcePlace }}</div>
          </template>
        </el-table-column>
        <el-table-column label="保障" width="90">
          <template #default="{ row }">{{ row.guaranteeDays }} 天</template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === '0' ? 'success' : 'info'">{{ row.status === '0' ? '正常' : '停用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleUpdate(row)">修改</el-button>
            <el-button link type="success" @click="goFront(row)">前台查看</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pager">
        <el-pagination
          v-model:current-page="queryParams.pageNum"
          v-model:page-size="queryParams.pageSize"
          :page-sizes="[10, 20, 50]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="getList"
          @current-change="getList"
        />
      </div>
    </el-card>

    <!-- 新增/修改对话框 -->
    <el-dialog :title="title" v-model="open" width="760px" append-to-body>
      <el-tabs v-model="activeTab">
        <el-tab-pane label="健康筛查" name="health">
          <el-form :model="form" label-width="100px">
            <el-form-item label="宠物">
              <el-input v-model="form.petName" :disabled="form.healthId != null" placeholder="选择宠物" style="width: 240px" />
              <el-input v-model.number="form.petId" :disabled="form.healthId != null" type="number" placeholder="宠物ID" style="width: 140px; margin-left: 8px" />
            </el-form-item>
            <el-form-item label="档案编号">
              <el-input v-model="form.archiveNo" placeholder="留空自动生成" style="width: 280px" />
            </el-form-item>
            <el-form-item label="疫苗名称"><el-input v-model="form.vaccineName" placeholder="如 猫三联（妙三多）" /></el-form-item>
            <el-form-item label="疫苗进度"><el-input v-model="form.vaccineProgress" placeholder="如 3/3" style="width: 160px" /></el-form-item>
            <el-form-item label="接种日期">
              <el-date-picker v-model="form.vaccineDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" />
            </el-form-item>
            <el-form-item label="驱虫用药"><el-input v-model="form.dewormName" /></el-form-item>
            <el-form-item label="驱虫日期">
              <el-date-picker v-model="form.dewormDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" />
            </el-form-item>
            <el-form-item label="体检项目"><el-input v-model="form.examItems" type="textarea" :rows="2" /></el-form-item>
            <el-form-item label="体检结论"><el-input v-model="form.examResult" placeholder="如 全部合格" /></el-form-item>
            <el-form-item label="体检日期">
              <el-date-picker v-model="form.examDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" />
            </el-form-item>
            <el-form-item label="体检机构"><el-input v-model="form.examHospital" /></el-form-item>
            <el-form-item label="遗传病排查"><el-input v-model="form.geneticScreen" type="textarea" :rows="2" /></el-form-item>
            <el-form-item label="健康等级">
              <el-select v-model="form.healthLevel" style="width: 160px">
                <el-option label="优秀" value="优秀" /><el-option label="良好" value="良好" /><el-option label="观察中" value="观察中" />
              </el-select>
            </el-form-item>
            <el-form-item label="健康备注"><el-input v-model="form.healthNote" type="textarea" :rows="2" /></el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="真实信息" name="origin">
          <el-form :model="form" label-width="100px">
            <el-form-item label="来源渠道"><el-input v-model="form.sourceChannel" /></el-form-item>
            <el-form-item label="来源地"><el-input v-model="form.sourcePlace" /></el-form-item>
            <el-form-item label="父本"><el-input v-model="form.fatherInfo" /></el-form-item>
            <el-form-item label="母本"><el-input v-model="form.motherInfo" /></el-form-item>
            <el-form-item label="出生日期">
              <el-date-picker v-model="form.birthDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" />
            </el-form-item>
            <el-form-item label="是否实拍">
              <el-radio-group v-model="form.isPhotoReal">
                <el-radio value="0">实拍</el-radio><el-radio value="1">非实拍</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="专业养护" name="care">
          <el-form :model="form" label-width="100px">
            <el-form-item label="性格特点"><el-input v-model="form.temperament" /></el-form-item>
            <el-form-item label="饲养难度">
              <el-select v-model="form.skillLevel" style="width: 160px">
                <el-option label="入门" value="入门" /><el-option label="进阶" value="进阶" /><el-option label="挑战" value="挑战" />
              </el-select>
            </el-form-item>
            <el-form-item label="喂养方案"><el-input v-model="form.feedPlan" type="textarea" :rows="3" /></el-form-item>
            <el-form-item label="护理要点"><el-input v-model="form.carePoints" type="textarea" :rows="3" /></el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="售后无忧" name="after">
          <el-form :model="form" label-width="100px">
            <el-form-item label="保障天数"><el-input-number v-model="form.guaranteeDays" :min="1" :max="365" /></el-form-item>
            <el-form-item label="合同编号"><el-input v-model="form.contractNo" style="width: 240px" /></el-form-item>
            <el-form-item label="送达方式"><el-input v-model="form.deliverySupport" /></el-form-item>
            <el-form-item label="售后说明"><el-input v-model="form.aftersaleNote" type="textarea" :rows="3" /></el-form-item>
            <el-form-item label="状态">
              <el-radio-group v-model="form.status">
                <el-radio value="0">正常</el-radio><el-radio value="1">停用</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>

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
import { listPetHealth, addPetHealth, updatePetHealth, delPetHealth } from '@/api/pet/petHealth'

const list = ref([])
const total = ref(0)
const loading = ref(false)
const open = ref(false)
const title = ref('')
const submitting = ref(false)
const activeTab = ref('health')

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  petName: '',
  archiveNo: '',
  healthLevel: '',
  status: ''
})

const form = reactive(emptyForm())
function emptyForm() {
  return {
    healthId: null, petId: null, petName: '', archiveNo: '',
    vaccineName: '', vaccineProgress: '', vaccineDate: '', dewormName: '', dewormDate: '',
    examItems: '', examResult: '', examDate: '', examHospital: '', geneticScreen: '',
    healthLevel: '优秀', healthNote: '',
    sourceChannel: '', sourcePlace: '', fatherInfo: '', motherInfo: '', birthDate: '', isPhotoReal: '0',
    temperament: '', skillLevel: '入门', feedPlan: '', carePoints: '',
    guaranteeDays: 7, contractNo: '', deliverySupport: '', aftersaleNote: '',
    status: '0'
  }
}

function isImage(s) { return !!s && (s.indexOf('/') === 0 || s.indexOf('http') === 0) }
function fmtDate(d) { return d ? String(d).slice(0, 10) : '—' }
function goFront(row) { window.open('/shop/pet/' + row.petId, '_blank') }

async function getList() {
  loading.value = true
  try {
    const res = await listPetHealth(queryParams)
    list.value = res.rows || []
    total.value = res.total || 0
  } catch (e) {
    ElMessage.error(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function handleQuery() {
  queryParams.pageNum = 1
  getList()
}

function resetQuery() {
  queryParams.petName = ''
  queryParams.archiveNo = ''
  queryParams.healthLevel = ''
  queryParams.status = ''
  handleQuery()
}

function handleAdd() {
  Object.assign(form, emptyForm())
  title.value = '新增健康档案'
  activeTab.value = 'health'
  open.value = true
}

function handleUpdate(row) {
  Object.assign(form, emptyForm(), JSON.parse(JSON.stringify(row)))
  title.value = '修改健康档案 - ' + (row.petName || row.archiveNo)
  activeTab.value = 'health'
  open.value = true
}

async function submitForm() {
  if (!form.petId) {
    ElMessage.warning('请填写宠物ID')
    return
  }
  submitting.value = true
  try {
    if (form.healthId) {
      await updatePetHealth(form)
      ElMessage.success('修改成功，前台已同步更新')
    } else {
      await addPetHealth(form)
      ElMessage.success('新增成功，前台已同步展示')
    }
    open.value = false
    getList()
  } catch (e) {
    ElMessage.error(e?.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确定删除「${row.petName || row.archiveNo}」的健康档案吗？`, '提示', { type: 'warning' })
  } catch (e) { return }
  try {
    await delPetHealth(row.healthId)
    ElMessage.success('删除成功')
    getList()
  } catch (e) {
    ElMessage.error(e?.message || '删除失败')
  }
}

onMounted(getList)
</script>

<style scoped lang="scss">
.health-admin { padding: 4px; }
.search-card { margin-bottom: 14px; }
.table-card {
  .card-head { display: flex; align-items: center; justify-content: space-between; font-size: 14px; color: var(--text-2); }
}
.pet-cell { display: flex; align-items: center; gap: 10px;
  .thumb { width: 44px; height: 44px; border-radius: 8px; object-fit: cover; }
  .thumb-emoji { width: 44px; height: 44px; border-radius: 8px; background: var(--brand-50); display: flex; align-items: center; justify-content: center; font-size: 20px; }
  .pet-meta { display: flex; flex-direction: column; line-height: 1.4;
    .sub { color: var(--text-3); font-size: 12px; }
  }
}
.cell-sm { font-size: 13px; color: var(--text-1); }
.cell-sub { color: var(--text-3); font-size: 12px; margin-top: 2px; }
.pager { display: flex; justify-content: flex-end; margin-top: 16px; }
</style>
