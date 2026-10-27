<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="80px">
      <el-form-item label="用户" prop="userName">
        <el-input v-model="queryParams.userName" placeholder="用户名 / 游客" clearable style="width: 150px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="匹配结果" prop="matchStatus">
        <el-select v-model="queryParams.matchStatus" placeholder="全部" clearable style="width: 120px" @change="handleQuery">
          <el-option label="已匹配" value="0" />
          <el-option label="无匹配" value="1" />
        </el-select>
      </el-form-item>
      <el-form-item label="时间范围">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          value-format="YYYY-MM-DD"
          range-separator="-"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          style="width: 240px"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5"><el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete">删除</el-button></el-col>
      <el-col :span="1.5"><el-button type="danger" plain icon="Delete" @click="handleClean">清空</el-button></el-col>
      <el-col :span="10" style="line-height: 32px; color: #909399; font-size: 13px">
        累计智能匹配 <b style="color: var(--brand-600)">{{ stat.total }}</b> 次 ·
        其中无匹配 <b class="stat-empty">{{ stat.empty }}</b> 次（{{ stat.emptyRate }}%）·
        今日 <b>{{ stat.today }}</b> 次
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="recordList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column label="ID" align="center" prop="recordId" width="70" />
      <el-table-column label="用户" align="center" width="120">
        <template #default="scope">
          <div>{{ scope.row.userName || '游客' }}</div>
          <div class="sub-id">{{ scope.row.userId ? 'ID: ' + scope.row.userId : '未登录' }}</div>
        </template>
      </el-table-column>
      <el-table-column label="问卷画像" min-width="300">
        <template #default="scope">
          <div class="portrait">
            <span v-for="(v, k) in portraitTags(scope.row.answers)" :key="k" class="p-tag">{{ v }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="首推宠物" min-width="180">
        <template #default="scope">
          <template v-if="scope.row.matchStatus === '1'">
            <el-tag type="danger" effect="plain" size="small">未匹配到宠物</el-tag>
          </template>
          <template v-else>
            <div class="top-name">{{ scope.row.topPetName || '—' }}</div>
            <div class="sub-id">匹配度 {{ scope.row.topScore }}%</div>
          </template>
        </template>
      </el-table-column>
      <el-table-column label="推荐组合 / 未匹配原因" min-width="260" show-overflow-tooltip>
        <template #default="scope">
          <span v-if="scope.row.matchStatus === '1'" class="empty-reason">{{ emptyReason(scope.row.diagnosis) }}</span>
          <span v-else class="result-text">{{ scope.row.resultPets || '—' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="时间" align="center" width="170">
        <template #default="scope"><span>{{ parseTime(scope.row.createTime) }}</span></template>
      </el-table-column>
      <el-table-column label="操作" align="center" width="140" fixed="right">
        <template #default="scope">
          <el-button link type="primary" icon="View" @click="handleView(scope.row)">详情</el-button>
          <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />

    <!-- 详情 -->
    <el-dialog v-model="viewVisible" title="智能匹配详情" width="720px" append-to-body>
      <div v-if="current" class="detail-box">
        <div class="d-head">
          <div>
            <div class="d-user">{{ current.userName || '游客' }}<span v-if="current.userId">（ID: {{ current.userId }}）</span></div>
            <div class="d-time">{{ parseTime(current.createTime) }} · {{ current.algorithm }}</div>
          </div>
          <el-tag v-if="current.matchStatus === '1'" type="danger" effect="dark">未匹配到宠物</el-tag>
          <el-tag v-else type="warning" effect="dark">首推 {{ current.topPetName }} · {{ current.topScore }}%</el-tag>
        </div>

        <div class="d-block">
          <div class="d-title">问卷画像</div>
          <div class="d-answers">
            <div v-for="item in answerPairs(current.answers)" :key="item.key" class="d-answer">
              <span class="a-key">{{ item.label }}</span>
              <span class="a-val">{{ item.value }}</span>
            </div>
          </div>
        </div>

        <!-- 无匹配：展示归因诊断，便于选品/定价 -->
        <div v-if="current.matchStatus === '1'" class="d-block">
          <div class="d-title">未匹配诊断</div>
          <div class="diag-grid">
            <div class="diag-cell"><span>在售候选</span><b>{{ diagOf(current.diagnosis).total || 0 }}</b></div>
            <div class="diag-cell"><span>类型不符</span><b>{{ diagOf(current.diagnosis).byPrefer || 0 }}</b></div>
            <div class="diag-cell"><span>不适合有小孩</span><b>{{ diagOf(current.diagnosis).byKids || 0 }}</b></div>
            <div class="diag-cell"><span>超出预算</span><b>{{ diagOf(current.diagnosis).byBudget || 0 }}</b></div>
            <div class="diag-cell" v-if="diagOf(current.diagnosis).lowestPrice">
              <span>在售最低价</span><b>¥{{ Number(diagOf(current.diagnosis).lowestPrice).toLocaleString('zh-CN') }}</b>
            </div>
            <div class="diag-cell"><span>用户购宠预算</span><b>¥{{ Number(diagOf(current.diagnosis).budget || 0).toLocaleString('zh-CN') }}</b></div>
          </div>
          <div v-for="(t, i) in diagOf(current.diagnosis).tips || []" :key="i" class="diag-tip">· {{ t }}</div>
        </div>

        <div v-else class="d-block">
          <div class="d-title">推荐结果（Top 5）</div>
          <div v-for="(p, i) in topList(current.resultDetail)" :key="i" class="top-item">
            <span class="rank" :class="{ first: i === 0 }">{{ i + 1 }}</span>
            <span class="t-name">{{ p.petName }}</span>
            <span class="t-score">{{ p.score }}%</span>
            <span class="t-price">¥{{ Number(p.price || 0).toLocaleString('zh-CN') }}</span>
            <span class="t-reason">{{ (p.reasons && p.reasons[0]) || '综合维度匹配' }}</span>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup name="MatchRecord">
import { ref, reactive, getCurrentInstance } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { listMatchRecord, delMatchRecord, cleanMatchRecord, getMatchStat } from "@/api/pet/petMatch";

const { proxy } = getCurrentInstance();

const loading = ref(false);
const showSearch = ref(true);
const recordList = ref([]);
const total = ref(0);
const ids = ref([]);
const multiple = ref(true);
const viewVisible = ref(false);
const current = ref(null);
const dateRange = ref([]);

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  userName: "",
  matchStatus: ""
});

const stat = ref({ total: 0, matched: 0, empty: 0, today: 0, emptyRate: 0 });

const LABELS = {
  home: { small: "小户型/合租", apartment: "普通住宅", house: "大房子/带院子" },
  kids: { yes: "有小孩", no: "无小孩" },
  noise: { low: "怕吵", mid: "可接受叫声", high: "不介意吵" },
  activity: { low: "宅家为主", medium: "偶尔运动", high: "每天运动" },
  time: { lt1: "陪伴<1h", "1to3": "陪伴1-3h", gt3: "陪伴>3h" },
  companion: { clingy: "要粘人", independent: "独立省心", any: "都可以" },
  experience: { none: "新手", some: "养过", pro: "老手" },
  budget: { 1000: "预算≤1000", 3000: "预算1-3千", 6000: "预算3-6千", 99999: "预算6千+" },
  monthly: { 200: "月耗≤200", 500: "月耗200-500", 1000: "月耗500-1千", 99999: "月耗1千+" },
  prefer: { any: "类型不限", 1: "偏好猫", 2: "偏好狗", 3: "偏好兔", 4: "偏好仓鼠", 5: "偏好鸟", 6: "偏好水族", 7: "偏好爬行" }
};

const KEYS = [
  ["home", "居住"],
  ["kids", "小孩"],
  ["noise", "噪音"],
  ["activity", "活动"],
  ["time", "陪伴"],
  ["companion", "相处"],
  ["experience", "经验"],
  ["budget", "购宠预算"],
  ["monthly", "养护预算"],
  ["prefer", "偏好类型"]
];

function parseJson(s) {
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch (e) {
    return null;
  }
}

function portraitTags(answers) {
  const a = parseJson(answers) || {};
  const tags = [];
  KEYS.forEach(([k]) => {
    const map = LABELS[k];
    const v = a[k];
    if (v !== undefined && v !== null && map && map[v]) tags.push(map[v]);
  });
  return tags;
}

function answerPairs(answers) {
  const a = parseJson(answers) || {};
  return KEYS.map(([k, label]) => ({
    key: k,
    label,
    value: (LABELS[k] && LABELS[k][a[k]]) || a[k] || "—"
  }));
}

function topList(detail) {
  const arr = parseJson(detail);
  return Array.isArray(arr) ? arr : [];
}

// 无匹配诊断
function diagOf(s) {
  return parseJson(s) || {};
}

// 列表里的一行原因摘要
function emptyReason(diag) {
  const d = diagOf(diag);
  if (!d.total) return "宠物库无在售个体";
  if (d.byBudget && d.lowestPrice) {
    return `预算不足：在售最低 ¥${Number(d.lowestPrice).toLocaleString("zh-CN")}，用户预算 ¥${Number(d.budget || 0).toLocaleString("zh-CN")}`;
  }
  if (d.byPrefer) return `偏好类型下无符合其余条件的在售宠物（类型不符 ${d.byPrefer} 只）`;
  if (d.byKids) return `有小孩家庭条件下无合适个体（${d.byKids} 只不适合儿童）`;
  return "当前条件组合过严，无匹配结果";
}

function loadStat() {
  getMatchStat()
    .then((res) => {
      stat.value = res.data || stat.value;
    })
    .catch(() => {});
}

function getList() {
  loading.value = true;
  const params = { ...queryParams };
  if (!params.matchStatus) delete params.matchStatus;
  if (dateRange.value && dateRange.value.length === 2) {
    params.params = { beginTime: dateRange.value[0], endTime: dateRange.value[1] };
  }
  listMatchRecord(params)
    .then((res) => {
      recordList.value = res.rows || [];
      total.value = res.total || 0;
      loading.value = false;
    })
    .catch(() => {
      loading.value = false;
    });
}

function handleQuery() {
  queryParams.pageNum = 1;
  getList();
}

function resetQuery() {
  queryParams.userName = "";
  queryParams.matchStatus = "";
  dateRange.value = [];
  proxy.resetForm("queryRef");
  handleQuery();
}

function handleSelectionChange(selection) {
  ids.value = selection.map((i) => i.recordId);
  multiple.value = !selection.length;
}

function handleView(row) {
  current.value = row;
  viewVisible.value = true;
}

function handleDelete(row) {
  const delIds = row ? [row.recordId] : ids.value;
  if (!delIds.length) return;
  ElMessageBox.confirm('确认删除选中的 ' + delIds.length + ' 条匹配记录？', "提示", { type: "warning" })
    .then(() => delMatchRecord(delIds.join(",")))
    .then(() => {
      ElMessage.success("删除成功");
      getList();
      loadStat();
    })
    .catch(() => {});
}

function handleClean() {
  ElMessageBox.confirm("确认清空全部匹配记录？此操作不影响宠物数据。", "警告", { type: "warning" })
    .then(() => cleanMatchRecord())
    .then(() => {
      ElMessage.success("已清空");
      getList();
      loadStat();
    })
    .catch(() => {});
}

getList();
loadStat();
</script>

<style scoped>
.sub-id {
  font-size: 12px;
  color: var(--text-4);
}
.portrait {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.p-tag {
  font-size: 12px;
  color: var(--text-2);
  background: var(--bg-page);
  border-radius: 10px;
  padding: 2px 8px;
  line-height: 18px;
}
.top-name {
  font-weight: 600;
  color: var(--text-1);
}
.result-text {
  font-size: 12px;
  color: var(--text-3);
}
.detail-box {
  padding: 0 4px;
}
.d-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #f0f2f5;
  padding-bottom: 12px;
  margin-bottom: 16px;
}
.d-user {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-1);
}
.d-time {
  font-size: 12px;
  color: var(--text-4);
  margin-top: 4px;
}
.d-block {
  margin-bottom: 18px;
}
.d-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-1);
  margin-bottom: 10px;
}
.d-answers {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px 18px;
}
.d-answer {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  background: var(--bg-page);
  border-radius: 8px;
  padding: 8px 12px;
}
.a-key {
  color: var(--text-3);
}
.a-val {
  color: var(--text-1);
  font-weight: 600;
}
.top-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 12px;
  border-radius: 8px;
  font-size: 13px;
  background: var(--bg-page);
  margin-bottom: 6px;
}
.top-item:nth-child(2) {
  background: var(--brand-50);
}
.rank {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #eef0f3;
  color: var(--text-3);
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.rank.first {
  background: var(--brand-600);
  color: #fff;
}
.t-name {
  font-weight: 600;
  color: var(--text-1);
  width: 120px;
}
.t-score {
  color: var(--brand-600);
  font-weight: 700;
  width: 56px;
}
.t-price {
  color: var(--text-3);
  width: 80px;
}
.t-reason {
  color: var(--success-500);
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.stat-empty {
  color: var(--danger-500);
}
.empty-reason {
  color: var(--danger-500);
  font-size: 12px;
}
.diag-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(150px, 100%), 1fr));
  gap: 10px;
  margin-bottom: 12px;
}
.diag-cell {
  background: #fef4f4;
  border: 1px solid #fde2e2;
  border-radius: 8px;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.diag-cell span {
  font-size: 12px;
  color: var(--text-3);
}
.diag-cell b {
  font-size: 17px;
  color: var(--danger-500);
}
.diag-tip {
  font-size: 13px;
  color: var(--text-2);
  line-height: 1.9;
}
</style>
