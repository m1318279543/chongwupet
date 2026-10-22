<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="80px">
      <el-form-item label="提问人" prop="userName">
        <el-input v-model="queryParams.userName" placeholder="提问人（含游客）" clearable style="width: 160px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="问题关键词" prop="question">
        <el-input v-model="queryParams.question" placeholder="提问内容关键词" clearable style="width: 200px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="回答来源" prop="source">
        <el-select v-model="queryParams.source" placeholder="全部" clearable style="width: 130px">
          <el-option label="在线模型" value="online" />
          <el-option label="模型不可用" value="error" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5"><el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete" v-hasPermi="['pet:doctor:remove']">删除</el-button></el-col>
      <el-col :span="1.5"><el-button type="danger" plain icon="Delete" @click="handleClean" v-hasPermi="['pet:doctor:remove']">清空</el-button></el-col>
      <el-col :span="1.5"><el-button type="warning" plain icon="Download" @click="handleExport" v-hasPermi="['pet:doctor:export']">导出</el-button></el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="consultList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column label="记录ID" align="center" prop="consultId" width="80" />
      <el-table-column label="提问人" align="center" width="140">
        <template #default="scope">
          <div>{{ scope.row.userName || '游客' }}</div>
          <div class="sub-id">{{ scope.row.userId ? 'ID: ' + scope.row.userId : '未登录' }}</div>
        </template>
      </el-table-column>
      <el-table-column label="提问内容" min-width="240" show-overflow-tooltip>
        <template #default="scope"><span class="q-text">{{ scope.row.question }}</span></template>
      </el-table-column>
      <el-table-column label="医生回答" min-width="240" show-overflow-tooltip>
        <template #default="scope"><span class="a-text">{{ scope.row.answer || '—' }}</span></template>
      </el-table-column>
      <el-table-column label="来源" align="center" width="110">
        <template #default="scope">
          <el-tag :type="scope.row.source === 'online' ? 'success' : 'danger'" size="small">
            {{ scope.row.source === 'online' ? '在线模型' : '不可用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="命中" align="center" prop="matchCount" width="70" />
      <el-table-column label="提问时间" align="center" prop="createTime" width="170">
        <template #default="scope"><span>{{ parseTime(scope.row.createTime) }}</span></template>
      </el-table-column>
      <el-table-column label="操作" align="center" width="130" fixed="right">
        <template #default="scope">
          <el-button link type="primary" icon="View" @click="handleView(scope.row)">详情</el-button>
          <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['pet:doctor:remove']">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />

    <!-- 详情弹窗 -->
    <el-dialog v-model="viewVisible" title="咨询详情" width="640px" append-to-body>
      <div class="detail-box" v-if="current">
        <div class="d-row"><span class="d-lbl">提问人</span><span>{{ current.userName || '游客' }}{{ current.userId ? '（ID: ' + current.userId + '）' : '' }}</span></div>
        <div class="d-row"><span class="d-lbl">提问时间</span><span>{{ parseTime(current.createTime) }}</span></div>
        <div class="d-row"><span class="d-lbl">来源</span><span>{{ current.source === 'online' ? '在线模型' : '模型不可用' }}{{ current.model ? '（' + current.model + '）' : '' }} · 命中知识库 {{ current.matchCount || 0 }} 条</span></div>
        <div class="d-row"><span class="d-lbl">来源IP</span><span>{{ current.ip || '—' }}</span></div>
        <div class="d-block">
          <div class="d-title">❓ 用户提问</div>
          <div class="d-content q">{{ current.question }}</div>
        </div>
        <div class="d-block">
          <div class="d-title">🩺 医生回答</div>
          <div class="d-content a">{{ current.answer || '（无）' }}</div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup name="DoctorConsult">
import { ref, reactive, toRefs, getCurrentInstance } from "vue";
import { listDoctorConsult, delDoctorConsult, cleanDoctorConsult } from "@/api/pet/petDoctorConsult";

const { proxy } = getCurrentInstance();
const consultList = ref([]);
const loading = ref(true);
const showSearch = ref(true);
const ids = ref([]);
const multiple = ref(true);
const total = ref(0);
const viewVisible = ref(false);
const current = ref(null);

const data = reactive({
  queryParams: { pageNum: 1, pageSize: 10, userName: undefined, question: undefined, source: undefined },
});
const { queryParams } = toRefs(data);

function getList() {
  loading.value = true;
  listDoctorConsult(queryParams.value).then((res) => {
    consultList.value = res.rows;
    total.value = res.total;
    loading.value = false;
  });
}
function handleQuery() { queryParams.value.pageNum = 1; getList(); }
function resetQuery() { proxy.resetForm("queryRef"); handleQuery(); }
function handleSelectionChange(selection) { ids.value = selection.map(i => i.consultId); multiple.value = !selection.length; }
function handleView(row) { current.value = row; viewVisible.value = true; }
function handleDelete(row) {
  const delIds = row.consultId || ids.value;
  proxy.$modal.confirm('是否确认删除咨询记录ID为"' + delIds + '"的数据项？').then(() => delDoctorConsult(delIds)).then(() => { getList(); proxy.$modal.msgSuccess("删除成功"); }).catch(() => {});
}
function handleClean() {
  proxy.$modal.confirm('是否确认清空全部咨询记录？此操作不可恢复！').then(() => cleanDoctorConsult()).then(() => { getList(); proxy.$modal.msgSuccess("已清空"); }).catch(() => {});
}
function handleExport() { proxy.download("pet/doctor/consult/export", { ...queryParams.value }, `doctor_consult_${new Date().getTime()}.xlsx`); }
getList();
</script>

<style scoped lang="scss">
.sub-id { font-size: 12px; color: var(--text-3); margin-top: 2px; }
.q-text { color: var(--text-1); }
.a-text { color: var(--text-2); }
.detail-box { font-size: 14px; color: var(--text-1);
  .d-row { display: flex; gap: 12px; padding: 6px 0; border-bottom: 1px dashed var(--border-2);
    .d-lbl { width: 72px; color: var(--text-3); flex-shrink: 0; }
  }
  .d-block { margin-top: 14px;
    .d-title { font-size: 14px; font-weight: 600; color: var(--text-1); margin-bottom: 6px; }
    .d-content { background: var(--bg-page); border-radius: 8px; padding: 12px 14px; line-height: 1.8; white-space: pre-wrap; word-break: break-word;
      &.a { background: var(--brand-50); border: 1px solid var(--brand-100); }
    }
  }
}
</style>
