<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="80px">
      <el-form-item label="取消类型" prop="targetType">
        <el-select v-model="queryParams.targetType" placeholder="全部" clearable style="width: 140px">
          <el-option label="取消预约" value="appointment" />
          <el-option label="取消订单" value="order" />
        </el-select>
      </el-form-item>
      <el-form-item label="用户名" prop="userName">
        <el-input v-model="queryParams.userName" placeholder="取消人用户名" clearable style="width: 160px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="对象名称" prop="targetName">
        <el-input v-model="queryParams.targetName" placeholder="宠物名 / 商品名" clearable style="width: 180px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="取消原因" prop="reason">
        <el-input v-model="queryParams.reason" placeholder="原因关键词" clearable style="width: 160px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5"><el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete" v-hasPermi="['pet:cancel:remove']">删除</el-button></el-col>
      <el-col :span="1.5"><el-button type="danger" plain icon="Delete" @click="handleClean" v-hasPermi="['pet:cancel:remove']">清空</el-button></el-col>
      <el-col :span="1.5"><el-button type="warning" plain icon="Download" @click="handleExport" v-hasPermi="['pet:cancel:export']">导出</el-button></el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="recordList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column label="记录ID" align="center" prop="recordId" width="80" />
      <el-table-column label="取消类型" align="center" width="110">
        <template #default="scope">
          <el-tag :type="scope.row.targetType === 'appointment' ? 'warning' : 'primary'" size="small">
            {{ scope.row.targetType === 'appointment' ? '取消预约' : '取消订单' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="原记录ID" align="center" prop="refId" width="90" />
      <el-table-column label="取消人" align="center" width="130">
        <template #default="scope">
          <div>{{ scope.row.userName || '游客' }}</div>
          <div class="sub-id">{{ scope.row.userId ? 'ID: ' + scope.row.userId : '未登录' }}</div>
        </template>
      </el-table-column>
      <el-table-column label="对象名称" min-width="160" show-overflow-tooltip>
        <template #default="scope"><span class="name-text">{{ scope.row.targetName || '—' }}</span></template>
      </el-table-column>
      <el-table-column label="明细" min-width="240" show-overflow-tooltip>
        <template #default="scope"><span class="detail-text">{{ scope.row.detail || '—' }}</span></template>
      </el-table-column>
      <el-table-column label="取消原因" min-width="180" show-overflow-tooltip>
        <template #default="scope"><span class="reason-text">{{ scope.row.reason || '（未填写）' }}</span></template>
      </el-table-column>
      <el-table-column label="取消时间" align="center" prop="createTime" width="170">
        <template #default="scope"><span>{{ parseTime(scope.row.createTime) }}</span></template>
      </el-table-column>
      <el-table-column label="操作" align="center" width="130" fixed="right">
        <template #default="scope">
          <el-button link type="primary" icon="View" @click="handleView(scope.row)">详情</el-button>
          <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['pet:cancel:remove']">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />

    <!-- 详情弹窗 -->
    <el-dialog v-model="viewVisible" title="取消记录详情" width="640px" append-to-body>
      <div class="detail-box" v-if="current">
        <div class="d-row"><span class="d-lbl">记录ID</span><span>{{ current.recordId }}</span></div>
        <div class="d-row"><span class="d-lbl">取消类型</span><span>{{ current.targetType === 'appointment' ? '取消预约' : '取消订单' }} · 原记录ID {{ current.refId }}</span></div>
        <div class="d-row"><span class="d-lbl">取消人</span><span>{{ current.userName || '游客' }}{{ current.userId ? '（ID: ' + current.userId + '）' : '' }}</span></div>
        <div class="d-row"><span class="d-lbl">取消时间</span><span>{{ parseTime(current.createTime) }}</span></div>
        <div class="d-block">
          <div class="d-title">取消对象</div>
          <div class="d-content">{{ current.targetName || '—' }}</div>
        </div>
        <div class="d-block">
          <div class="d-title">明细快照</div>
          <div class="d-content">{{ current.detail || '（无）' }}</div>
        </div>
        <div class="d-block">
          <div class="d-title">取消原因</div>
          <div class="d-content r">{{ current.reason || '（用户未填写）' }}</div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup name="CancelRecord">
import { ref, reactive, toRefs, getCurrentInstance } from "vue";
import { listCancelRecord, delCancelRecord, cleanCancelRecord } from "@/api/pet/petCancelRecord";

const { proxy } = getCurrentInstance();
const recordList = ref([]);
const loading = ref(true);
const showSearch = ref(true);
const ids = ref([]);
const multiple = ref(true);
const total = ref(0);
const viewVisible = ref(false);
const current = ref(null);

const data = reactive({
  queryParams: { pageNum: 1, pageSize: 10, targetType: undefined, userName: undefined, targetName: undefined, reason: undefined },
});
const { queryParams } = toRefs(data);

function getList() {
  loading.value = true;
  listCancelRecord(queryParams.value).then((res) => {
    recordList.value = res.rows;
    total.value = res.total;
    loading.value = false;
  });
}
function handleQuery() { queryParams.value.pageNum = 1; getList(); }
function resetQuery() { proxy.resetForm("queryRef"); handleQuery(); }
function handleSelectionChange(selection) { ids.value = selection.map(i => i.recordId); multiple.value = !selection.length; }
function handleView(row) { current.value = row; viewVisible.value = true; }
function handleDelete(row) {
  const delIds = row.recordId || ids.value;
  proxy.$modal.confirm('是否确认删除取消记录ID为"' + delIds + '"的数据项？').then(() => delCancelRecord(delIds)).then(() => { getList(); proxy.$modal.msgSuccess("删除成功"); }).catch(() => {});
}
function handleClean() {
  proxy.$modal.confirm('是否确认清空全部取消记录？此操作不可恢复！').then(() => cleanCancelRecord()).then(() => { getList(); proxy.$modal.msgSuccess("已清空"); }).catch(() => {});
}
function handleExport() { proxy.download("pet/cancel/export", { ...queryParams.value }, `cancel_record_${new Date().getTime()}.xlsx`); }
getList();
</script>

<style scoped lang="scss">
.sub-id { font-size: 12px; color: var(--text-3); margin-top: 2px; }
.name-text { color: var(--text-1); font-weight: 600; }
.detail-text { color: var(--text-2); }
.reason-text { color: var(--warning-500); }
.detail-box { font-size: 14px; color: var(--text-1);
  .d-row { display: flex; gap: 12px; padding: 6px 0; border-bottom: 1px dashed var(--border-2);
    .d-lbl { width: 72px; color: var(--text-3); flex-shrink: 0; }
  }
  .d-block { margin-top: 14px;
    .d-title { font-size: 14px; font-weight: 600; color: var(--text-1); margin-bottom: 6px; }
    .d-content { background: var(--bg-page); border-radius: 8px; padding: 12px 14px; line-height: 1.8; white-space: pre-wrap; word-break: break-word;
      &.r { background: var(--brand-50); border: 1px solid var(--brand-100); }
    }
  }
}
</style>
