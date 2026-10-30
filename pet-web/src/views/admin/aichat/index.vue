<template>
  <div class="aichat-admin">
    <!-- KPI + 分类统计 -->
    <div class="kpi-grid">
      <el-card shadow="never" class="kpi">
        <em>{{ stats.overview?.total ?? 0 }}</em>
        <span>累计咨询会话</span>
      </el-card>
      <el-card shadow="never" class="kpi">
        <em>{{ stats.overview?.today ?? 0 }}</em>
        <span>今日咨询</span>
      </el-card>
      <el-card shadow="never" class="kpi">
        <em>{{ stats.overview?.handoff ?? 0 }}</em>
        <span>转人工会话</span>
      </el-card>
      <el-card shadow="never" class="kpi">
        <em>{{ goodRate }}</em>
        <span>回答有用率（{{ stats.feedback?.good ?? 0 }}赞 / {{ stats.feedback?.bad ?? 0 }}踩）</span>
      </el-card>
    </div>

    <el-card shadow="never" class="cat-card">
      <template #header>
        <div class="ui-card-head"><span>问题分类（点击筛选）</span></div>
      </template>
      <div class="cat-chips">
        <button type="button" class="cat-chip" :class="{ on: queryParams.intent === '' }" @click="pickIntent('')">
          全部 <i>{{ totalAll }}</i>
        </button>
        <button
          v-for="item in stats.intents || []"
          :key="item.intent"
          type="button"
          class="cat-chip"
          :class="{ on: queryParams.intent === item.intent }"
          @click="pickIntent(item.intent)"
        >
          {{ intentLabel(item.intent) }} <i>{{ item.total }}</i>
        </button>
      </div>
    </el-card>

    <el-card shadow="never" class="ui-toolbar-card">
      <el-form :model="queryParams" inline>
        <el-form-item label="用户">
          <el-input v-model="queryParams.userName" placeholder="用户名" clearable style="width: 140px" @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item label="场景">
          <el-select v-model="queryParams.scene" placeholder="全部" clearable style="width: 130px">
            <el-option v-for="(label, key) in SCENES" :key="key" :label="label" :value="key" />
          </el-select>
        </el-form-item>
        <el-form-item label="日期">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            value-format="YYYY-MM-DD"
            range-separator="至"
            start-placeholder="开始"
            end-placeholder="结束"
            style="width: 240px"
          />
        </el-form-item>
        <el-form-item label="关键词">
          <el-input v-model="queryParams['params[keyword]']" placeholder="首问 / 会话号" clearable style="width: 170px" @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleQuery">搜索</el-button>
          <el-button @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" class="table-card">
      <template #header>
        <div class="ui-card-head">
          <span>共 {{ total }} 条咨询记录</span>
          <el-button type="success" @click="handleQuery">刷新</el-button>
        </div>
      </template>

      <el-table v-loading="loading" :data="list" border stripe>
        <el-table-column label="提问时间" prop="createTime" width="160" />
        <el-table-column label="用户" prop="userName" width="110" show-overflow-tooltip />
        <el-table-column label="分类" width="110">
          <template #default="{ row }">
            <el-tag :type="tagType(row.intent)">{{ intentLabel(row.intent) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="入口场景" width="100">
          <template #default="{ row }">{{ SCENES[row.scene] || row.scene || '—' }}</template>
        </el-table-column>
        <el-table-column label="首问" prop="title" min-width="260" show-overflow-tooltip />
        <el-table-column label="轮数" prop="messageCount" width="70" align="center" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === '1' ? 'warning' : 'success'">{{ row.status === '1' ? '转人工' : 'AI 已答' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="110" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">查看对话</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="ui-pager">
        <el-pagination v-model:current-page="queryParams.pageNum" v-model:page-size="queryParams.pageSize"
          :page-sizes="[10, 20, 50]" :total="total" layout="total, sizes, prev, pager, next, jumper"
          @size-change="getList" @current-change="getList" />
      </div>
    </el-card>

    <el-dialog :title="'对话回放 · ' + (detailRow.userName || '游客')" v-model="detailOpen" width="640px" append-to-body>
      <el-descriptions :column="3" border size="small" style="margin-bottom: 14px">
        <el-descriptions-item label="分类">{{ intentLabel(detailRow.intent) }}</el-descriptions-item>
        <el-descriptions-item label="场景">{{ SCENES[detailRow.scene] || detailRow.scene || '—' }}</el-descriptions-item>
        <el-descriptions-item label="时间">{{ detailRow.createTime }}</el-descriptions-item>
      </el-descriptions>
      <div v-loading="detailLoading" class="msg-flow">
        <div v-for="m in detailMsgs" :key="m.msgId" class="msg-row" :class="'is-' + m.role">
          <div class="msg-role">{{ m.role === 'user' ? '用户' : 'AI' }}</div>
          <div class="msg-bubble">{{ m.content }}</div>
        </div>
        <el-empty v-if="!detailLoading && !detailMsgs.length" description="暂无消息" :image-size="60" />
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { listAiChats, aiChatStats, aiChatHistory } from '@/api/pet/petAssistant'

const INTENTS = {
  goods: '商品咨询',
  order_list: '订单查询',
  order_detail: '订单明细',
  appointment: '预约服务',
  slots: '时段查询',
  stores: '门店咨询',
  match: '选宠推荐',
  pet_detail: '宠物详情',
  pet_care: '养护档案',
  my_pets: '我的宠物',
  knowledge: '养宠知识',
  emergency: '紧急就医',
  metric: '经营数据',
  draft: '客服起草',
  unknown: '未分类'
}
const SCENES = {
  shop: '商城助手',
  detail: '选宠顾问',
  match: '选宠顾问',
  order: '订单助手',
  consult: '养宠咨询',
  mypet: '养护管家',
  admin: '经营助手',
  admin_consult: '客服起草'
}

const list = ref([])
const total = ref(0)
const loading = ref(false)
const stats = ref({})
const dateRange = ref([])
const detailOpen = ref(false)
const detailLoading = ref(false)
const detailRow = ref({})
const detailMsgs = ref([])

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  intent: '',
  userName: '',
  scene: '',
  'params[keyword]': ''
})

const totalAll = computed(() => (stats.value.intents || []).reduce((s, i) => s + Number(i.total || 0), 0))
const goodRate = computed(() => {
  const f = stats.value.feedback || {}
  const sum = Number(f.good || 0) + Number(f.bad || 0)
  return sum ? Math.round((Number(f.good || 0) / sum) * 100) + '%' : '—'
})

function intentLabel(key) {
  return INTENTS[key] || key || '未分类'
}
function tagType(key) {
  if (key === 'emergency') return 'danger'
  if (key === 'order_list' || key === 'order_detail') return 'warning'
  if (key === 'goods' || key === 'match') return 'success'
  return 'info'
}
function pickIntent(intent) {
  queryParams.intent = intent
  handleQuery()
}

async function getList() {
  loading.value = true
  try {
    const params = { ...queryParams }
    if (dateRange.value?.length === 2) {
      params['params[beginTime]'] = dateRange.value[0]
      params['params[endTime]'] = dateRange.value[1]
    }
    const res = await listAiChats(params)
    list.value = res.rows || []
    total.value = res.total || 0
  } catch (e) {
    ElMessage.error(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

async function getStats() {
  try {
    const res = await aiChatStats()
    stats.value = res.data || {}
  } catch (e) { /* 统计失败不打断列表 */ }
}

function handleQuery() {
  queryParams.pageNum = 1
  getList()
  getStats()
}
function resetQuery() {
  queryParams.intent = ''
  queryParams.userName = ''
  queryParams.scene = ''
  queryParams['params[keyword]'] = ''
  dateRange.value = []
  handleQuery()
}

async function openDetail(row) {
  detailRow.value = row
  detailMsgs.value = []
  detailOpen.value = true
  detailLoading.value = true
  try {
    const res = await aiChatHistory(row.convId)
    detailMsgs.value = res.data?.messages || []
  } catch (e) {
    ElMessage.error(e?.message || '对话加载失败')
  } finally {
    detailLoading.value = false
  }
}

onMounted(() => {
  getList()
  getStats()
})
</script>

<style scoped lang="scss">
.aichat-admin { padding: 4px; }
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 14px;
  @media (max-width: 900px) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
.kpi {
  :deep(.el-card__body) { padding: 14px 16px; }
  em {
    display: block;
    font-style: normal;
    font-size: 26px;
    font-weight: 700;
    line-height: 1.3;
  }
  span { font-size: 12px; color: var(--text-3, #8a8f8c); }
}
.cat-card { margin-bottom: 14px; }
.cat-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.cat-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border: 1px solid var(--border-1, #e4e7ed);
  border-radius: 999px;
  background: #fff;
  cursor: pointer;
  font-size: 13px;
  transition: all .15s;
  i {
    font-style: normal;
    font-size: 12px;
    color: var(--text-3, #8a8f8c);
  }
  &:hover { border-color: var(--el-color-primary, #409eff); }
  &.on {
    background: var(--el-color-primary, #409eff);
    border-color: var(--el-color-primary, #409eff);
    color: #fff;
    i { color: rgba(255, 255, 255, .8); }
  }
}
.msg-flow {
  max-height: 420px;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 4px;
}
.msg-row {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  .msg-role {
    flex-shrink: 0;
    font-size: 12px;
    padding: 2px 8px;
    border-radius: 4px;
    background: var(--bg-sunken, #f5f7f6);
    color: var(--text-2, #606266);
  }
  .msg-bubble {
    flex: 1;
    font-size: 13px;
    line-height: 1.7;
    white-space: pre-wrap;
    background: var(--bg-sunken, #f5f7f6);
    border-radius: 8px;
    padding: 8px 12px;
  }
  &.is-user .msg-role { background: var(--el-color-primary-light-9, #ecf5ff); color: var(--el-color-primary, #409eff); }
  &.is-user .msg-bubble { background: var(--el-color-primary-light-9, #ecf5ff); }
}
</style>
