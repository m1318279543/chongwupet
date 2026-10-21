<template>
  <div class="app-container">
    <!-- 汇总条 -->
    <div class="pay-summary">
      <div class="ps-item">
        <span class="ps-label">近 {{ days }} 天成功</span>
        <span class="ps-val ok">{{ trendOk }} 笔 / ¥{{ money(trendOkAmount) }}</span>
      </div>
      <div class="ps-item">
        <span class="ps-label">近 {{ days }} 天失败</span>
        <span class="ps-val fail">{{ trendFail }} 笔</span>
      </div>
      <div class="ps-item">
        <span class="ps-label">当前待支付订单</span>
        <span class="ps-val warn">{{ overview.unpaidOrders || 0 }} 笔 / ¥{{ money(overview.unpaidAmount) }}</span>
      </div>
      <div class="ps-item">
        <span class="ps-label">已支付订单</span>
        <span class="ps-val ok">{{ overview.paidOrders || 0 }} 笔 / ¥{{ money(overview.paidAmount) }}</span>
      </div>
    </div>

    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="76px">
      <el-form-item label="订单号" prop="orderNo">
        <el-input v-model="queryParams.orderNo" placeholder="订单号（支持模糊）" clearable style="width: 200px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="用户" prop="userName">
        <el-input v-model="queryParams.userName" placeholder="用户名" clearable style="width: 140px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="结果" prop="result">
        <el-select v-model="queryParams.result" placeholder="全部" clearable style="width: 120px" @change="handleQuery">
          <el-option label="全部" value="" />
          <el-option label="成功" value="success" />
          <el-option label="失败" value="fail" />
        </el-select>
      </el-form-item>
      <el-form-item label="通道" prop="payMethod">
        <el-select v-model="queryParams.payMethod" placeholder="全部" clearable style="width: 120px" @change="handleQuery">
          <el-option label="全部" value="" />
          <el-option label="支付宝" value="alipay" />
          <el-option label="微信支付" value="wechat" />
          <el-option label="平台余额" value="balance" />
        </el-select>
      </el-form-item>
      <el-form-item label="时间">
        <el-date-picker v-model="dateRange" type="daterange" value-format="YYYY-MM-DD"
          start-placeholder="开始日期" end-placeholder="结束日期" style="width: 240px" @change="handleQuery" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button type="warning" plain icon="Download" @click="handleExport" v-hasPermi="['pet:payment:export']">导出</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button plain icon="Back" @click="$router.push('/admin/cart')">返回订单</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="logList">
      <el-table-column label="时间" align="center" width="180">
        <template #default="scope">{{ parseTime(scope.row.createTime) }}</template>
      </el-table-column>
      <el-table-column label="订单号" align="center" prop="orderNo" min-width="200" show-overflow-tooltip>
        <template #default="scope">
          <el-link type="primary" :underline="false" @click="filterByOrder(scope.row.orderNo)">{{ scope.row.orderNo }}</el-link>
        </template>
      </el-table-column>
      <el-table-column label="用户" align="center" width="140">
        <template #default="scope">
          <div>ID: {{ scope.row.userId }}</div>
          <div class="muted">{{ scope.row.userName || '—' }}</div>
        </template>
      </el-table-column>
      <el-table-column label="金额" align="center" width="110">
        <template #default="scope"><span class="amount">¥{{ scope.row.amount }}</span></template>
      </el-table-column>
      <el-table-column label="件数" align="center" prop="items" width="80" />
      <el-table-column label="通道" align="center" width="110">
        <template #default="scope">{{ methodText(scope.row.payMethod) }}</template>
      </el-table-column>
      <el-table-column label="结果" align="center" width="100">
        <template #default="scope">
          <el-tag :type="scope.row.result === 'success' ? 'success' : 'danger'" size="small">
            {{ scope.row.result === 'success' ? '成功' : '失败' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="说明" align="left" min-width="220" show-overflow-tooltip prop="reason" />
    </el-table>

    <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />
  </div>
</template>

<script setup name="PaymentLog">
import { ref, reactive, toRefs, getCurrentInstance, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { listPaymentLog, paymentOverview, paymentTrend } from "@/api/pet/petPayment";

const { proxy } = getCurrentInstance();
const route = useRoute();
const router = useRouter();
const logList = ref([]);
const loading = ref(true);
const showSearch = ref(true);
const total = ref(0);
const dateRange = ref([]);
const overview = ref({});
const trend = ref([]);
const days = 7;

const data = reactive({
  queryParams: {
    pageNum: 1, pageSize: 10,
    orderNo: route.query.orderNo || undefined,
    userName: undefined, result: '', payMethod: ''
  }
});
const { queryParams } = toRefs(data);

const trendOk = computed(() => (trend.value || []).reduce((s, i) => s + Number(i.okCount || 0), 0));
const trendFail = computed(() => (trend.value || []).reduce((s, i) => s + Number(i.failCount || 0), 0));
const trendOkAmount = computed(() => (trend.value || []).reduce((s, i) => s + Number(i.okAmount || 0), 0));

function money(v) {
  return Number(v || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function methodText(m) {
  return m === 'wechat' ? '微信支付' : m === 'balance' ? '平台余额' : m === 'alipay' ? '支付宝' : '—';
}

function getList() {
  loading.value = true;
  const p = { ...queryParams.value };
  p.params = {};
  if (dateRange.value && dateRange.value.length === 2) {
    p.params.beginTime = dateRange.value[0] + ' 00:00:00';
    p.params.endTime = dateRange.value[1] + ' 23:59:59';
  }
  listPaymentLog(p).then((res) => {
    logList.value = res.rows;
    total.value = res.total;
    loading.value = false;
  }).catch(() => { loading.value = false; });
}
function loadSummary() {
  paymentOverview().then((res) => { overview.value = res.data || {}; }).catch(() => {});
  paymentTrend(days).then((res) => { trend.value = (res.data && res.data.items) || []; }).catch(() => {});
}
function handleQuery() { queryParams.value.pageNum = 1; getList(); }
function resetQuery() {
  proxy.resetForm("queryRef");
  dateRange.value = [];
  queryParams.value.result = '';
  queryParams.value.payMethod = '';
  queryParams.value.orderNo = undefined;
  if (route.query.orderNo) router.replace({ path: '/admin/payment' });
  handleQuery();
}
function filterByOrder(orderNo) {
  queryParams.value.orderNo = orderNo;
  handleQuery();
}
function handleExport() {
  proxy.download("pet/payment/export", { ...queryParams.value }, `payment_${new Date().getTime()}.xlsx`);
}

getList();
loadSummary();
</script>

<style scoped lang="scss">
.pay-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(240px, 100%), 1fr));
  gap: 12px;
  margin-bottom: 16px;
  .ps-item {
    background: #fff; border: 1px solid #f0f0f0; border-radius: 10px; padding: 12px 16px;
    display: flex; flex-direction: column; gap: 6px;
    .ps-label { font-size: 12.5px; color: #909399; }
    .ps-val { font-size: 17px; font-weight: 600; color: #303133;
      &.ok { color: #67c23a; } &.fail { color: #f56c6c; } &.warn { color: #e6a23c; } }
  }
}
.muted { color: #909399; font-size: 12.5px; }
.amount { color: #ff8c42; font-weight: 600; }
</style>
