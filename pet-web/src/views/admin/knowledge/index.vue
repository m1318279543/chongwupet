<template>
  <div class="knowledge-admin">
    <!-- 概览 -->
    <div class="k-stats">
      <div class="k-stat">
        <em>{{ stat.total }}</em>
        <span>知识条目</span>
      </div>
      <div class="k-stat">
        <em>{{ stat.enabled }}</em>
        <span>已启用</span>
      </div>
      <div class="k-stat">
        <em>{{ stat.hits }}</em>
        <span>累计命中</span>
      </div>
      <div class="k-stat">
        <em>{{ rateText }}</em>
        <span>回答好评率</span>
      </div>
    </div>

    <!-- 缺口 / 命中 -->
    <el-row :gutter="12" class="k-panels">
      <el-col :xs="24" :md="12">
        <el-card shadow="never" class="k-card">
          <template #header>
            <div class="k-card-head">
              <span>知识缺口</span>
              <em>AI 明确说“没查到”的问题，补一条就能立刻生效</em>
            </div>
          </template>
          <ul class="k-list">
            <li v-for="(gap, index) in stat.gaps" :key="index">
              <span class="k-gap-q">{{ gap.question || '（未取到原始问题）' }}</span>
              <el-button link type="primary" @click="quickAdd(gap.question)">补一条</el-button>
            </li>
            <li v-if="!stat.gaps.length" class="k-empty">暂时没有缺口记录</li>
          </ul>
        </el-card>
      </el-col>
      <el-col :xs="24" :md="12">
        <el-card shadow="never" class="k-card">
          <template #header>
            <div class="k-card-head">
              <span>命中排行</span>
              <em>被引用次数最多的条目</em>
            </div>
          </template>
          <ul class="k-list">
            <li v-for="item in stat.top" :key="item.knowledgeId">
              <span class="k-top-title">{{ item.title }}</span>
              <span class="k-top-count">{{ item.hitCount }} 次</span>
            </li>
            <li v-if="!stat.top.length" class="k-empty">还没有命中记录</li>
          </ul>
        </el-card>
      </el-col>
    </el-row>

    <!-- 搜索 -->
    <el-card shadow="never" class="search-card">
      <el-form :model="queryParams" inline>
        <el-form-item label="标题/关键词">
          <el-input v-model="queryParams.keywords" placeholder="如 软便、退款" clearable style="width: 180px" @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="queryParams.category" placeholder="全部" clearable style="width: 130px">
            <el-option v-for="item in CATEGORIES" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="物种">
          <el-select v-model="queryParams.species" placeholder="全部" clearable style="width: 120px">
            <el-option v-for="item in SPECIES" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="queryParams.status" placeholder="全部" clearable style="width: 110px">
            <el-option label="启用" value="0" />
            <el-option label="停用" value="1" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleQuery">搜索</el-button>
          <el-button @click="resetQuery">重置</el-button>
          <el-button type="success" @click="handleAdd">新增知识</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 列表 -->
    <el-card shadow="never" class="table-card">
      <template #header>
        <div class="card-head">
          <span>共 {{ total }} 条</span>
          <el-button type="success" @click="reload">刷新</el-button>
        </div>
      </template>

      <el-table v-loading="loading" :data="list" border stripe>
        <el-table-column label="标题" prop="title" min-width="200" show-overflow-tooltip />
        <el-table-column label="分类" width="100">
          <template #default="{ row }">{{ categoryLabel(row.category) }}</template>
        </el-table-column>
        <el-table-column label="物种" prop="species" width="90" />
        <el-table-column label="急症" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.emergency === '1'" type="danger" size="small">是</el-tag>
            <span v-else>—</span>
          </template>
        </el-table-column>
        <el-table-column label="命中" prop="hitCount" width="80" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === '0' ? 'success' : 'info'" size="small">
              {{ row.status === '0' ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="更新时间" prop="updateTime" width="160" />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
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

    <!-- 编辑弹窗 -->
    <el-dialog :title="form.knowledgeId ? '编辑知识' : '新增知识'" v-model="open" width="680px" append-to-body>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="88px">
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" maxlength="120" placeholder="如：猫软便/腹泻" />
        </el-form-item>
        <el-form-item label="分类" prop="category">
          <el-select v-model="form.category" style="width: 100%">
            <el-option v-for="item in CATEGORIES" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="物种">
          <el-select v-model="form.species" clearable style="width: 100%">
            <el-option v-for="item in SPECIES" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input v-model="form.keywords" maxlength="200" placeholder="逗号分隔，补充同义词，如：软便,腹泻,拉稀" />
        </el-form-item>
        <el-form-item label="标准问法">
          <el-input v-model="form.question" maxlength="200" placeholder="用户可能怎么问，便于检索命中" />
        </el-form-item>
        <el-form-item label="内容" prop="content">
          <el-input v-model="form.content" type="textarea" :rows="8" maxlength="4000" show-word-limit
            placeholder="助手只会依据这里的内容回答，请写清结论与处理步骤" />
        </el-form-item>
        <el-form-item label="严重度">
          <el-radio-group v-model="form.severity">
            <el-radio value="low">一般</el-radio>
            <el-radio value="medium">需关注</el-radio>
            <el-radio value="high">紧急</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="急症">
          <el-switch v-model="form.emergency" active-value="1" inactive-value="0" />
          <span class="k-hint">开启后助手会优先建议就医，不给家庭处理方案</span>
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort" :min="1" :max="999" />
          <span class="k-hint">数字越小越靠前</span>
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio value="0">启用</el-radio>
            <el-radio value="1">停用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="open = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  addKnowledge,
  delKnowledge,
  getKnowledge,
  knowledgeStat,
  listKnowledge,
  updateKnowledge
} from '@/api/pet/petKnowledge'

const CATEGORIES = [
  { value: 'health', label: '健康' },
  { value: 'care', label: '养护' },
  { value: 'policy', label: '平台政策' }
]
const SPECIES = ['通用', '猫科', '犬科', '兔科', '鼠科', '鹦鹉科', '观赏鱼科', '爬行科']

const loading = ref(false)
const list = ref([])
const total = ref(0)
const open = ref(false)
const submitting = ref(false)
const formRef = ref(null)

const stat = reactive({ total: 0, enabled: 0, hits: 0, categories: [], top: [], gaps: [], feedback: {} })

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  keywords: '',
  category: '',
  species: '',
  status: ''
})

const form = reactive({
  knowledgeId: null,
  title: '',
  category: 'health',
  species: '通用',
  keywords: '',
  question: '',
  content: '',
  severity: 'low',
  emergency: '0',
  sort: 90,
  status: '0'
})

const rules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  category: [{ required: true, message: '请选择分类', trigger: 'change' }],
  content: [{ required: true, message: '请输入内容', trigger: 'blur' }]
}

// 样本少于 3 条时不报百分比，避免一条差评就显示 0%
const rateText = computed(() => {
  const totalFeedback = Number(stat.feedback?.total || 0)
  if (totalFeedback < 3) return '—'
  return Math.round((Number(stat.feedback?.good || 0) / totalFeedback) * 100) + '%'
})

function categoryLabel(value) {
  const hit = CATEGORIES.find((item) => item.value === value)
  return hit ? hit.label : value || '未分类'
}

async function getList() {
  loading.value = true
  try {
    const res = await listKnowledge(queryParams)
    list.value = res.rows || []
    total.value = res.total || 0
  } catch (e) {
    ElMessage.error(e?.msg || '知识列表加载失败')
  } finally {
    loading.value = false
  }
}

async function loadStat() {
  try {
    const res = await knowledgeStat()
    Object.assign(stat, res.data || {})
  } catch (e) {
    // 概览失败不影响主列表
  }
}

function reload() {
  getList()
  loadStat()
}

function handleQuery() {
  queryParams.pageNum = 1
  getList()
}

function resetQuery() {
  queryParams.keywords = ''
  queryParams.category = ''
  queryParams.species = ''
  queryParams.status = ''
  handleQuery()
}

function fillForm(row) {
  form.knowledgeId = row?.knowledgeId || null
  form.title = row?.title || ''
  form.category = row?.category || 'health'
  form.species = row?.species || '通用'
  form.keywords = row?.keywords || ''
  form.question = row?.question || ''
  form.content = row?.content || ''
  form.severity = row?.severity || 'low'
  form.emergency = row?.emergency || '0'
  form.sort = row?.sort || 90
  form.status = row?.status || '0'
}

function handleAdd() {
  fillForm(null)
  open.value = true
}

function quickAdd(question) {
  fillForm(null)
  form.question = question || ''
  form.title = question ? question.slice(0, 40) : ''
  open.value = true
}

async function handleEdit(row) {
  try {
    const res = await getKnowledge(row.knowledgeId)
    fillForm(res.data || row)
    open.value = true
  } catch (e) {
    fillForm(row)
    open.value = true
  }
}

function submitForm() {
  formRef.value?.validate(async (valid) => {
    if (!valid) return
    submitting.value = true
    try {
      const res = form.knowledgeId ? await updateKnowledge({ ...form }) : await addKnowledge({ ...form })
      ElMessage.success(res.msg || '已保存')
      open.value = false
      reload()
    } catch (e) {
      ElMessage.error(e?.msg || '保存失败')
    } finally {
      submitting.value = false
    }
  })
}

function handleDelete(row) {
  ElMessageBox.confirm(`确认删除「${row.title}」吗？删除后助手将不再引用这条内容。`, '删除知识', {
    confirmButtonText: '确认删除',
    cancelButtonText: '取消',
    type: 'warning'
  })
    .then(() => delKnowledge(row.knowledgeId))
    .then((res) => {
      ElMessage.success(res.msg || '已删除')
      reload()
    })
    .catch(() => {})
}

onMounted(reload)
</script>

<style scoped lang="scss">
.knowledge-admin {
  padding: 4px;
}
.k-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 12px;
}
.k-stat {
  padding: 14px 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-bg-color);
  em {
    display: block;
    font-style: normal;
    font-size: 24px;
    font-weight: 600;
    color: var(--el-color-primary);
    line-height: 1.2;
  }
  span {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}
.k-panels {
  margin-bottom: 4px;
}
.k-card {
  margin-bottom: 12px;
}
.k-card-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
  em {
    font-style: normal;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}
.k-list {
  margin: 0;
  padding: 0;
  list-style: none;
  max-height: 208px;
  overflow-y: auto;
  li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 7px 0;
    border-bottom: 1px dashed var(--el-border-color-lighter);
    font-size: 13px;
    &:last-child {
      border-bottom: 0;
    }
  }
}
.k-gap-q {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--el-text-color-regular);
}
.k-top-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.k-top-count {
  font-size: 12px;
  color: var(--el-color-primary);
}
.k-empty {
  justify-content: center !important;
  color: var(--el-text-color-placeholder);
  font-size: 12px;
}
.k-hint {
  margin-left: 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.search-card {
  margin-bottom: 12px;
}
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
@media (max-width: 900px) {
  .k-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
