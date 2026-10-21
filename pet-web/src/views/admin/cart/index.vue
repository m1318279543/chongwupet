<template>
  <div class="app-container">
    <!-- 支付状态总览（点击卡片即筛选） -->
    <div class="pay-overview">
      <div class="ov-card" :class="{ active: queryParams.payState === 'unpaid' }" @click="quickFilter('unpaid')">
        <div class="ov-label">待支付</div>
        <div class="ov-num">{{ overview.unpaidOrders || 0 }} <em>笔</em></div>
        <div class="ov-sub">¥{{ money(overview.unpaidAmount) }}</div>
      </div>
      <div class="ov-card ok" :class="{ active: queryParams.payState === 'paid' }" @click="quickFilter('paid')">
        <div class="ov-label">已支付</div>
        <div class="ov-num">{{ overview.paidOrders || 0 }} <em>笔</em></div>
        <div class="ov-sub">¥{{ money(overview.paidAmount) }}</div>
      </div>
      <div class="ov-card fail" :class="{ active: queryParams.payState === 'fail' }" @click="quickFilter('fail')">
        <div class="ov-label">支付失败</div>
        <div class="ov-num">{{ overview.failOrders || 0 }} <em>笔</em></div>
        <div class="ov-sub">待支付中曾失败</div>
      </div>
      <div class="ov-card gray" :class="{ active: queryParams.payState === 'canceled' }" @click="quickFilter('canceled')">
        <div class="ov-label">已取消</div>
        <div class="ov-num">{{ overview.canceledOrders || 0 }} <em>笔</em></div>
        <div class="ov-sub">¥{{ money(overview.canceledAmount) }}</div>
      </div>
    </div>

    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="76px">
      <el-form-item label="订单号" prop="orderNo">
        <el-input v-model="queryParams.orderNo" placeholder="订单号（支持模糊）" clearable style="width: 190px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="用户名" prop="userName">
        <el-input v-model="queryParams.userName" placeholder="用户名" clearable style="width: 140px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="商品名称" prop="goodsName">
        <el-input v-model="queryParams.goodsName" placeholder="商品名称" clearable style="width: 140px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="支付状态" prop="payState">
        <el-select v-model="queryParams.payState" placeholder="全部" clearable style="width: 130px" @change="handleQuery">
          <el-option label="全部" value="" />
          <el-option label="已支付" value="paid" />
          <el-option label="待支付" value="unpaid" />
          <el-option label="支付失败" value="fail" />
          <el-option label="已取消" value="canceled" />
        </el-select>
      </el-form-item>
      <el-form-item label="支付通道" prop="payMethod">
        <el-select v-model="queryParams.payMethod" placeholder="全部" clearable style="width: 120px" @change="handleQuery">
          <el-option label="全部" value="" />
          <el-option label="支付宝" value="alipay" />
          <el-option label="微信支付" value="wechat" />
          <el-option label="平台余额" value="balance" />
        </el-select>
      </el-form-item>
      <el-form-item label="下单时间">
        <el-date-picker
          v-model="dateRange" type="daterange" value-format="YYYY-MM-DD"
          start-placeholder="开始日期" end-placeholder="结束日期"
          style="width: 240px" @change="handleQuery"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5"><el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete" v-hasPermi="['pet:cart:remove']">删除</el-button></el-col>
      <el-col :span="1.5"><el-button type="warning" plain icon="Download" @click="handleExport" v-hasPermi="['pet:cart:export']">导出</el-button></el-col>
      <el-col :span="1.5"><el-button type="primary" plain icon="Tickets" @click="goPayment">支付流水</el-button></el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="cartList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column label="记录ID" align="center" prop="cartId" width="80" />
      <el-table-column label="用户" align="center" width="130">
        <template #default="scope">
          <div>ID: {{ scope.row.userId }}</div>
          <div>{{ scope.row.userName || '—' }}</div>
        </template>
      </el-table-column>
      <el-table-column label="商品" min-width="200">
        <template #default="scope">
          <div class="goods-cell">
            <img :src="scope.row.goodsImage" class="thumb" v-if="scope.row.goodsImage" />
            <div class="goods-meta">
              <div class="g-name">{{ scope.row.goodsName }}</div>
              <div class="g-spec">{{ scope.row.goodsSpec }}</div>
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="小计" align="center" width="100">
        <template #default="scope"><span class="amount">¥{{ scope.row.amount }}</span></template>
      </el-table-column>
      <el-table-column label="订单号" align="center" prop="orderNo" width="180" show-overflow-tooltip />
      <el-table-column label="支付状态" align="center" width="130">
        <template #default="scope">
          <el-tag v-if="scope.row.status === '3'" type="info" size="small">已取消</el-tag>
          <el-tooltip v-else-if="isFail(scope.row)" :content="scope.row.lastPayReason || '支付失败'" placement="top">
            <el-tag type="danger" size="small">支付失败{{ scope.row.payAttempts>1 ? `（${scope.row.payAttempts}次）` : '' }}</el-tag>
          </el-tooltip>
          <el-tag v-else-if="scope.row.payStatus === '1'" type="success" size="small">
            已支付{{ methodText(scope.row.payMethod) }}
          </el-tag>
          <el-tag v-else type="warning" size="small">待支付</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="支付说明" align="left" min-width="180" show-overflow-tooltip>
        <template #default="scope">
          <span v-if="scope.row.status === '3'" class="muted">订单已取消</span>
          <span v-else-if="isFail(scope.row)" class="fail-text">{{ scope.row.lastPayReason || '支付失败' }}</span>
          <span v-else-if="scope.row.payStatus === '1'" class="muted">{{ scope.row.lastPayReason || '支付成功' }}</span>
          <span v-else class="muted">尚未发起支付</span>
        </template>
      </el-table-column>
      <el-table-column label="支付时间" align="center" width="170">
        <template #default="scope">
          <span v-if="scope.row.payTime">{{ parseTime(scope.row.payTime) }}</span>
          <span v-else class="muted">—</span>
        </template>
      </el-table-column>
      <el-table-column label="下单时间" align="center" prop="createTime" width="170">
        <template #default="scope"><span>{{ parseTime(scope.row.createTime) }}</span></template>
      </el-table-column>
      <el-table-column label="操作" align="center" width="130" fixed="right">
        <template #default="scope">
          <el-button link type="primary" icon="Tickets" @click="goPayment(scope.row.orderNo)">流水</el-button>
          <el-button link type="danger" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['pet:cart:remove']">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />
  </div>
</template>

<script setup name="Cart">
import { ref, reactive, toRefs, getCurrentInstance } from "vue";
import { useRouter } from "vue-router";
import { listPetCart, delPetCart } from "@/api/pet/petCart";
import { paymentOverview } from "@/api/pet/petPayment";

const { proxy } = getCurrentInstance();
const router = useRouter();
const cartList = ref([]);
const loading = ref(true);
const showSearch = ref(true);
const ids = ref([]);
const single = ref(true);
const multiple = ref(true);
const total = ref(0);
const dateRange = ref([]);
const overview = ref({});

const data = reactive({
  queryParams: {
    pageNum: 1, pageSize: 10,
    userName: undefined, goodsName: undefined, orderNo: undefined,
    payState: '', payMethod: ''
  },
});
const { queryParams } = toRefs(data);

function money(v) {
  return Number(v || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function methodText(m) {
  return m === 'wechat' ? '·微信' : m === 'balance' ? '·余额' : m === 'alipay' ? '·支付宝' : '';
}
// 待支付但最近一次尝试失败 → 视为"支付失败"
function isFail(row) {
  return row.status !== '3' && row.payStatus !== '1' && row.lastPayResult === 'fail';
}

function getList() {
  loading.value = true;
  const p = { ...queryParams.value };
  p.params = {};
  if (dateRange.value && dateRange.value.length === 2) {
    p.params.beginTime = dateRange.value[0] + ' 00:00:00';
    p.params.endTime = dateRange.value[1] + ' 23:59:59';
  }
  listPetCart(p).then((res) => {
    cartList.value = res.rows;
    total.value = res.total;
    loading.value = false;
  }).catch(() => { loading.value = false; });
}

function getOverview() {
  paymentOverview().then((res) => { overview.value = res.data || {}; }).catch(() => {});
}

function quickFilter(state) {
  queryParams.value.payState = queryParams.value.payState === state ? '' : state;
  handleQuery();
}
function handleQuery() { queryParams.value.pageNum = 1; getList(); }
function resetQuery() {
  proxy.resetForm("queryRef");
  dateRange.value = [];
  queryParams.value.payState = '';
  queryParams.value.payMethod = '';
  handleQuery();
}
function handleSelectionChange(selection) { ids.value = selection.map(i => i.cartId); single.value = selection.length !== 1; multiple.value = !selection.length; }
function handleDelete(row) {
  const delIds = row.cartId || ids.value;
  proxy.$modal.confirm('是否确认删除购物车记录ID为"' + delIds + '"的数据项？').then(() => delPetCart(delIds)).then(() => { getList(); getOverview(); proxy.$modal.msgSuccess("删除成功"); }).catch(() => {});
}
function handleExport() { proxy.download("pet/cart/export", { ...queryParams.value }, `cart_${new Date().getTime()}.xlsx`); }
function goPayment(orderNo) {
  router.push({ path: '/admin/payment', query: orderNo ? { orderNo } : {} });
}

getList();
getOverview();
</script>

<style scoped lang="scss">
.pay-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(200px, 100%), 1fr));
  gap: 12px;
  margin-bottom: 16px;
  .ov-card {
    background: #fff; border: 1px solid #ffe6d5; border-radius: 10px;
    padding: 14px 16px; cursor: pointer; transition: all .2s;
    &:hover { box-shadow: 0 4px 14px rgba(255,140,66,.12); transform: translateY(-1px); }
    &.active { border-color: #ff8c42; box-shadow: 0 0 0 2px rgba(255,140,66,.15); }
    .ov-label { font-size: 13px; color: #909399; }
    .ov-num { font-size: 24px; font-weight: 700; color: #303133; margin: 4px 0 2px;
      em { font-size: 13px; font-weight: 400; color: #909399; font-style: normal; } }
    .ov-sub { font-size: 12px; color: #909399; }
    &.ok .ov-num { color: #67c23a; }
    &.fail .ov-num { color: #f56c6c; }
    &.gray .ov-num { color: #909399; }
  }
}
.goods-cell { display: flex; align-items: center; gap: 10px;
  .thumb { width: 48px; height: 48px; border-radius: 6px; object-fit: cover; background: #f5f5f5; flex-shrink: 0; }
  .goods-meta { .g-name { font-size: 14px; color: #303133; }
    .g-spec { font-size: 12px; color: #909399; margin-top: 2px; } }
}
.amount { color: #ff8c42; font-weight: 600; }
.muted { color: #909399; font-size: 12.5px; }
.fail-text { color: #f56c6c; font-size: 12.5px; }
</style>
