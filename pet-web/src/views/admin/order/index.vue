<template>
  <div class="app-container">
    <!-- 订单 / 退款 / 取消记录原先是三个平级菜单页。三者本是一条资金流：
         下单 → 支付 → 取消/退款 → 留痕，运营时要对着看，合并为一个页用 tab 切换。 -->
    <el-tabs v-model="activeTab" class="trade-tabs" @tab-change="onTabChange">

      <!-- ==================== 订单 ==================== -->
      <el-tab-pane label="订单" name="order">
        <StatCards :items="[
          { label: '今日订单', value: orderStats.total || 0 },
          { label: '今日实收', value: money(orderStats.paid, 2), prefix: '¥', tone: 'money' },
          { label: '待付款', value: orderStats.unpaid || 0, tone: 'warn', onClick: () => orderFilterStatus('0') },
          { label: '待发货', value: orderStats.toShip || 0, tone: 'brand', onClick: () => orderFilterStatus('1') }
        ]" />

        <el-form :model="orderQuery" ref="orderQueryRef" :inline="true" v-show="orderShowSearch" label-width="72px">
          <el-form-item label="关键词" prop="keyword">
            <el-input v-model="orderQuery.keyword" placeholder="订单号 / 账号 / 收货人" clearable style="width: 220px" @keyup.enter="orderHandleQuery" />
          </el-form-item>
          <el-form-item label="类型" prop="orderType">
            <el-select v-model="orderQuery.orderType" placeholder="全部" clearable style="width: 110px">
              <el-option label="商品单" value="1" />
              <el-option label="宠物单" value="2" />
            </el-select>
          </el-form-item>
          <el-form-item label="状态" prop="status">
            <el-select v-model="orderQuery.status" placeholder="全部状态" clearable style="width: 130px">
              <el-option v-for="s in ORDER_STATUS" :key="s.value" :label="s.label" :value="s.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="支付" prop="payStatus">
            <el-select v-model="orderQuery.payStatus" placeholder="全部" clearable style="width: 110px">
              <el-option label="未付" value="0" />
              <el-option label="已付" value="1" />
            </el-select>
          </el-form-item>
          <el-form-item label="下单日期" prop="queryDate">
            <el-date-picker v-model="orderQuery.queryDate" type="date" value-format="YYYY-MM-DD" placeholder="全部日期" style="width: 150px" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" icon="Search" @click="orderHandleQuery">搜索</el-button>
            <el-button icon="Refresh" @click="orderResetQuery">重置</el-button>
          </el-form-item>
        </el-form>

        <el-table v-loading="orderLoading" :data="orderList">
          <el-table-column label="订单号" prop="orderNo" width="182" />
          <el-table-column label="商品" min-width="240">
            <template #default="scope">
              <div class="cell-main">
                <el-tag v-if="scope.row.orderType === '2'" size="small" type="danger" effect="plain" class="type-tag">宠物单</el-tag>{{ orderFirstGoods(scope.row) }}
              </div>
              <div class="ui-cell-sub">共 {{ scope.row.itemCount }} 件</div>
            </template>
          </el-table-column>
          <el-table-column label="客户 / 门店" width="140">
            <template #default="scope">
              <div class="cell-main">{{ scope.row.userName || '—' }}</div>
              <div class="ui-cell-sub">{{ scope.row.storeName || '—' }}</div>
            </template>
          </el-table-column>
          <el-table-column label="金额" width="100">
            <template #default="scope"><span class="ui-money">¥{{ money(scope.row.payAmount, 2) }}</span></template>
          </el-table-column>
          <el-table-column label="支付" width="110">
            <template #default="scope">
              <el-tag size="small" :type="scope.row.payStatus === '1' ? 'success' : 'info'">
                {{ scope.row.payStatus === '1' ? orderMethodText(scope.row.payMethod) : '未支付' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="94">
            <template #default="scope">
              <el-tag size="small" :type="orderStatusType(scope.row.status)">{{ enumText(ORDER_STATUS, scope.row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="下单时间" width="110">
            <template #default="scope">{{ fmtShort(scope.row.createTime) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="180" fixed="right" class-name="small-padding fixed-width">
            <template #default="scope">
              <el-button link type="primary" @click="orderOpenDetail(scope.row)">详情</el-button>
              <el-button v-if="scope.row.status === '1'" link type="success" @click="orderHandleShip(scope.row)" v-hasPermi="['pet:order:ship']">
                {{ scope.row.orderType === '2' ? '确认交付' : '发货' }}
              </el-button>
              <el-button v-if="['0','1'].includes(scope.row.status)" link type="danger" @click="orderHandleCancel(scope.row)" v-hasPermi="['pet:order:cancel']">取消</el-button>
            </template>
          </el-table-column>
        </el-table>

        <pagination v-show="orderTotal > 0" :total="orderTotal" v-model:page="orderQuery.pageNum" v-model:limit="orderQuery.pageSize" @pagination="orderGetList" />

        <el-drawer v-model="orderDetailOpen" title="订单详情" size="560px">
          <div v-loading="orderDetailLoading" class="detail">
            <div class="detail-head">
              <div>
                <p class="no">{{ orderDetail.orderNo }}</p>
                <p class="sub">{{ orderDetail.storeName || '—' }} · {{ orderDetail.userName || '—' }}</p>
              </div>
              <div>
                <el-tag v-if="orderDetail.orderType === '2'" type="danger" effect="plain" style="margin-right:6px">宠物单</el-tag>
                <el-tag :type="orderStatusType(orderDetail.status)">{{ enumText(ORDER_STATUS, orderDetail.status) }}</el-tag>
              </div>
            </div>

            <el-descriptions :column="2" border size="small">
              <el-descriptions-item label="商品件数">{{ orderDetail.itemCount || 0 }}</el-descriptions-item>
              <el-descriptions-item label="实付金额">¥{{ money(orderDetail.payAmount, 2) }}</el-descriptions-item>
              <el-descriptions-item label="支付状态">{{ orderDetail.payStatus === '1' ? '已支付' : '未支付' }}</el-descriptions-item>
              <el-descriptions-item label="支付方式">{{ orderMethodText(orderDetail.payMethod) }}</el-descriptions-item>
              <el-descriptions-item label="支付时间">{{ fmtShort(orderDetail.payTime) }}</el-descriptions-item>
              <el-descriptions-item label="下单时间">{{ fmtShort(orderDetail.createTime) }}</el-descriptions-item>
              <el-descriptions-item label="履约方式">{{ orderDetail.deliveryType === '2' ? '配送' : '到店自提' }}</el-descriptions-item>
              <el-descriptions-item label="收货人">{{ orderDetail.receiver || '—' }}</el-descriptions-item>
              <el-descriptions-item label="联系电话" :span="2">{{ orderDetail.receiverPhone || '—' }}</el-descriptions-item>
              <el-descriptions-item label="收货地址" :span="2">{{ orderDetail.receiverAddress || '—' }}</el-descriptions-item>
              <el-descriptions-item v-if="orderDetail.cancelReason" label="取消原因" :span="2">{{ orderDetail.cancelReason }}</el-descriptions-item>
            </el-descriptions>

            <p class="section-title">商品明细</p>
            <el-table :data="orderDetail.items || []" size="small" border>
              <el-table-column label="商品" min-width="180">
                <template #default="scope">
                  <div class="cell-main">{{ scope.row.goodsName }}</div>
                  <div class="ui-cell-sub">{{ scope.row.goodsSpec }}</div>
                </template>
              </el-table-column>
              <el-table-column label="类型" width="70" align="center">
                <template #default="scope">
                  <el-tag size="small" :type="scope.row.itemType === '2' ? 'danger' : 'info'" effect="plain">
                    {{ scope.row.itemType === '2' ? '宠物' : '商品' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="单价" width="90" align="center">
                <template #default="scope">¥{{ money(scope.row.price, 2) }}</template>
              </el-table-column>
              <el-table-column label="数量" prop="qty" width="70" align="center" />
              <el-table-column label="小计" width="96" align="right">
                <template #default="scope"><span class="ui-money">¥{{ money(scope.row.amount, 2) }}</span></template>
              </el-table-column>
            </el-table>
            <p class="total-line">合计：<b>¥{{ money(orderDetail.payAmount, 2) }}</b></p>
          </div>
        </el-drawer>
      </el-tab-pane>

      <!-- ==================== 退款 ==================== -->
      <el-tab-pane label="退款" name="refund">
        <StatCards :items="[
          { label: '待审核', value: refundStats.pending || 0, tone: 'warn', onClick: () => refundFilterStatus('0') },
          { label: '今日退款额', value: money(refundStats.refunded, 2), prefix: '¥', tone: 'money' },
          { label: '已退款', value: refundStats.done || 0, tone: 'success', onClick: () => refundFilterStatus('1') },
          { label: '已拒绝', value: refundStats.rejected || 0, onClick: () => refundFilterStatus('2') }
        ]" />

        <el-form :model="refundQuery" ref="refundQueryRef" :inline="true" v-show="refundShowSearch" label-width="72px">
          <el-form-item label="关键词" prop="keyword">
            <el-input v-model="refundQuery.keyword" placeholder="退款单号 / 订单号 / 账号" clearable style="width: 230px" @keyup.enter="refundHandleQuery" />
          </el-form-item>
          <el-form-item label="状态" prop="status">
            <el-select v-model="refundQuery.status" placeholder="全部状态" clearable style="width: 130px">
              <el-option v-for="s in REFUND_STATUS" :key="s.value" :label="s.label" :value="s.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="申请日期" prop="queryDate">
            <el-date-picker v-model="refundQuery.queryDate" type="date" value-format="YYYY-MM-DD" placeholder="全部日期" style="width: 150px" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" icon="Search" @click="refundHandleQuery">搜索</el-button>
            <el-button icon="Refresh" @click="refundResetQuery">重置</el-button>
          </el-form-item>
        </el-form>

        <el-table v-loading="refundLoading" :data="refundList">
          <el-table-column label="退款单号" prop="refundNo" width="190" />
          <el-table-column label="订单号" prop="orderNo" width="190" />
          <el-table-column label="申请账号" prop="userName" width="110" />
          <el-table-column label="门店" prop="storeName" width="130" :show-overflow-tooltip="true" />
          <el-table-column label="退款金额" width="110">
            <template #default="scope"><span class="ui-money">¥{{ money(scope.row.amount, 2) }}</span></template>
          </el-table-column>
          <el-table-column label="退款原因" prop="reason" min-width="170" :show-overflow-tooltip="true" />
          <el-table-column label="状态" width="96">
            <template #default="scope">
              <el-tag size="small" :type="refundStatusType(scope.row.status)">{{ enumText(REFUND_STATUS, scope.row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="申请时间" width="130">
            <template #default="scope">{{ fmtShort(scope.row.createTime) }}</template>
          </el-table-column>
          <el-table-column label="审核意见" prop="auditRemark" min-width="140" :show-overflow-tooltip="true" />
          <el-table-column label="操作" width="160" fixed="right" class-name="small-padding fixed-width">
            <template #default="scope">
              <template v-if="scope.row.status === '0'">
                <el-button link type="success" @click="refundHandleAudit(scope.row, true)" v-hasPermi="['pet:refund:audit']">同意退款</el-button>
                <el-button link type="danger" @click="refundHandleAudit(scope.row, false)" v-hasPermi="['pet:refund:audit']">拒绝</el-button>
              </template>
              <span v-else class="ui-cell-sub">{{ scope.row.auditBy || '—' }} · {{ fmtShort(scope.row.auditTime) }}</span>
            </template>
          </el-table-column>
        </el-table>

        <pagination v-show="refundTotal > 0" :total="refundTotal" v-model:page="refundQuery.pageNum" v-model:limit="refundQuery.pageSize" @pagination="refundGetList" />
      </el-tab-pane>

      <!-- ==================== 取消记录 ==================== -->
      <el-tab-pane label="取消记录" name="cancel">
        <el-form :model="cancelQuery" ref="cancelQueryRef" :inline="true" v-show="cancelShowSearch" label-width="80px">
          <el-form-item label="取消类型" prop="targetType">
            <el-select v-model="cancelQuery.targetType" placeholder="全部" clearable style="width: 140px">
              <el-option label="取消预约" value="appointment" />
              <el-option label="取消订单" value="order" />
            </el-select>
          </el-form-item>
          <el-form-item label="用户名" prop="userName">
            <el-input v-model="cancelQuery.userName" placeholder="取消人用户名" clearable style="width: 160px" @keyup.enter="cancelHandleQuery" />
          </el-form-item>
          <el-form-item label="对象名称" prop="targetName">
            <el-input v-model="cancelQuery.targetName" placeholder="宠物名 / 商品名" clearable style="width: 180px" @keyup.enter="cancelHandleQuery" />
          </el-form-item>
          <el-form-item label="取消原因" prop="reason">
            <el-input v-model="cancelQuery.reason" placeholder="原因关键词" clearable style="width: 160px" @keyup.enter="cancelHandleQuery" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" icon="Search" @click="cancelHandleQuery">搜索</el-button>
            <el-button icon="Refresh" @click="cancelResetQuery">重置</el-button>
          </el-form-item>
        </el-form>

        <el-row :gutter="10" class="mb8">
          <el-col :span="1.5"><el-button type="danger" plain icon="Delete" :disabled="cancelMultiple" @click="cancelHandleDelete" v-hasPermi="['pet:cancel:remove']">删除</el-button></el-col>
          <el-col :span="1.5"><el-button type="danger" plain icon="Delete" @click="cancelHandleClean" v-hasPermi="['pet:cancel:remove']">清空</el-button></el-col>
          <el-col :span="1.5"><el-button type="warning" plain icon="Download" @click="cancelHandleExport" v-hasPermi="['pet:cancel:export']">导出</el-button></el-col>
          <right-toolbar v-model:showSearch="cancelShowSearch" @queryTable="cancelGetList"></right-toolbar>
        </el-row>

        <el-table v-loading="cancelLoading" :data="cancelRecordList" @selection-change="cancelHandleSelectionChange">
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
              <el-button link type="primary" icon="View" @click="cancelHandleView(scope.row)">详情</el-button>
              <el-button link type="primary" icon="Delete" @click="cancelHandleDelete(scope.row)" v-hasPermi="['pet:cancel:remove']">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <pagination v-show="cancelTotal > 0" :total="cancelTotal" v-model:page="cancelQuery.pageNum" v-model:limit="cancelQuery.pageSize" @pagination="cancelGetList" />

        <el-dialog v-model="cancelViewVisible" title="取消记录详情" width="640px" append-to-body>
          <div class="detail-box" v-if="cancelCurrent">
            <div class="d-row"><span class="d-lbl">记录ID</span><span>{{ cancelCurrent.recordId }}</span></div>
            <div class="d-row"><span class="d-lbl">取消类型</span><span>{{ cancelCurrent.targetType === 'appointment' ? '取消预约' : '取消订单' }} · 原记录ID {{ cancelCurrent.refId }}</span></div>
            <div class="d-row"><span class="d-lbl">取消人</span><span>{{ cancelCurrent.userName || '游客' }}{{ cancelCurrent.userId ? '（ID: ' + cancelCurrent.userId + '）' : '' }}</span></div>
            <div class="d-row"><span class="d-lbl">取消时间</span><span>{{ parseTime(cancelCurrent.createTime) }}</span></div>
            <div class="d-block">
              <div class="d-title">取消对象</div>
              <div class="d-content">{{ cancelCurrent.targetName || '—' }}</div>
            </div>
            <div class="d-block">
              <div class="d-title">明细快照</div>
              <div class="d-content">{{ cancelCurrent.detail || '（无）' }}</div>
            </div>
            <div class="d-block">
              <div class="d-title">取消原因</div>
              <div class="d-content r">{{ cancelCurrent.reason || '（用户未填写）' }}</div>
            </div>
          </div>
        </el-dialog>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup name="Trade">
import StatCards from '@/components/StatCards.vue'
import { ref, reactive, getCurrentInstance, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { listOrders, getOrder, orderStats as fetchOrderStats, shipOrder, cancelOrder } from '@/api/pet/petOrder'
import { listRefunds, refundStats as fetchRefundStats, auditRefund } from '@/api/pet/petRefund'
import { listCancelRecord, delCancelRecord, cleanCancelRecord } from '@/api/pet/petCancelRecord'
import { money, fmtShort, enumText } from '@/utils/format'

const { proxy } = getCurrentInstance()

const activeTab = ref('order')

const ORDER_STATUS = [
  { value: '0', label: '待付款' },
  { value: '1', label: '待发货' },
  { value: '2', label: '已完成' },
  { value: '3', label: '已取消' }
]
const REFUND_STATUS = [
  { value: '0', label: '待审核' },
  { value: '1', label: '已退款' },
  { value: '2', label: '已拒绝' },
  { value: '3', label: '已撤销' }
]

// ---------------- 订单 ----------------
const orderList = ref([])
const orderStats = ref({})
const orderLoading = ref(true)
const orderShowSearch = ref(true)
const orderTotal = ref(0)
const orderDetailOpen = ref(false)
const orderDetailLoading = ref(false)
const orderDetail = ref({})
const orderQuery = reactive({ pageNum: 1, pageSize: 10, keyword: undefined, orderType: undefined, status: undefined, payStatus: undefined, queryDate: undefined })

function orderStatusType(s) { return { 0: 'warning', 1: 'primary', 2: 'success', 3: 'info' }[s] || 'info' }
function orderMethodText(m) { return { alipay: '支付宝', wechat: '微信', balance: '余额' }[m] || (m ? '线上' : '—') }
function orderFirstGoods(row) {
  const items = row.items || []
  if (!items.length) return '—'
  return items.length > 1 ? `${items[0].goodsName} 等 ${items.length} 种` : items[0].goodsName
}
function orderGetList() {
  orderLoading.value = true
  listOrders(orderQuery).then((res) => {
    orderList.value = res.rows || []
    orderTotal.value = res.total || 0
    orderLoading.value = false
  }).catch(() => { orderLoading.value = false })
}
function orderGetStats() { fetchOrderStats().then((res) => { orderStats.value = res.data || {} }).catch(() => {}) }
function orderHandleQuery() { orderQuery.pageNum = 1; orderGetList() }
function orderResetQuery() { proxy.resetForm('orderQueryRef'); orderHandleQuery() }
function orderFilterStatus(status) { orderQuery.status = status; orderQuery.queryDate = undefined; orderHandleQuery() }
function orderOpenDetail(row) {
  orderDetailOpen.value = true
  orderDetailLoading.value = true
  getOrder(row.orderNo).then((res) => { orderDetail.value = res.data || {}; orderDetailLoading.value = false })
    .catch(() => { orderDetailLoading.value = false })
}
function orderHandleShip(row) {
  const isPet = row.orderType === '2'
  const tip = isPet ? `确认客户已到店接走宠物？订单 ${row.orderNo} 将标记为已完成。` : `确认订单 ${row.orderNo} 已发出？`
  ElMessageBox.confirm(tip, isPet ? '确认交付' : '发货', { type: 'info' })
    .then(() => shipOrder(row.orderNo))
    .then((res) => { ElMessage.success(res.msg || '已发货'); orderGetList(); orderGetStats() })
    .catch(() => {})
}
function orderHandleCancel(row) {
  ElMessageBox.prompt('取消订单，请填写原因（库存会自动回补）：', '取消订单', {
    confirmButtonText: '确认取消', cancelButtonText: '再想想', inputPlaceholder: '如：客户改期 / 缺货'
  }).then(({ value }) => cancelOrder(row.orderNo, value || ''))
    .then((res) => { ElMessage.success(res.msg || '订单已取消'); orderGetList(); orderGetStats() })
    .catch(() => {})
}

// ---------------- 退款 ----------------
const refundList = ref([])
const refundStats = ref({})
const refundLoading = ref(true)
const refundShowSearch = ref(true)
const refundTotal = ref(0)
const refundQuery = reactive({ pageNum: 1, pageSize: 10, keyword: undefined, status: undefined, queryDate: undefined })

function refundStatusType(s) { return { 0: 'warning', 1: 'success', 2: 'danger', 3: 'info' }[s] || 'info' }
function refundGetList() {
  refundLoading.value = true
  listRefunds(refundQuery).then((res) => {
    refundList.value = res.rows || []
    refundTotal.value = res.total || 0
    refundLoading.value = false
  }).catch(() => { refundLoading.value = false })
}
function refundGetStats() { fetchRefundStats().then((res) => { refundStats.value = res.data || {} }).catch(() => {}) }
function refundHandleQuery() { refundQuery.pageNum = 1; refundGetList() }
function refundResetQuery() { proxy.resetForm('refundQueryRef'); refundHandleQuery() }
function refundFilterStatus(status) { refundQuery.status = status; refundHandleQuery() }
function refundHandleAudit(row, pass) {
  const isPass = pass === true
  const title = isPass ? '同意退款' : '拒绝退款'
  const msg = isPass
    ? `确认给订单 ${row.orderNo} 退款 ¥${money(row.amount, 2)}？\n同意后订单置为「已退款」，商品库存自动退回（宠物放回在售）。`
    : `确认拒绝退款单 ${row.refundNo}？请填写拒绝理由：`
  const action = isPass
    ? ElMessageBox.confirm(msg, title, { type: 'warning', confirmButtonText: '确认退款', cancelButtonText: '再想想' })
    : ElMessageBox.prompt(msg, title, { type: 'warning', confirmButtonText: '确认拒绝', cancelButtonText: '取消', inputPlaceholder: '如：已拆封使用，不符合退货条件' })
  action
    .then((res) => {
      const remark = isPass ? '门店同意退款' : (res.value || '不符合退款条件')
      return auditRefund(row.refundId, isPass, remark)
    })
    .then((res) => { ElMessage.success(res.msg || '已处理'); refundGetList(); refundGetStats() })
    .catch(() => {})
}

// ---------------- 取消记录 ----------------
const cancelRecordList = ref([])
const cancelLoading = ref(true)
const cancelShowSearch = ref(true)
const cancelIds = ref([])
const cancelMultiple = ref(true)
const cancelTotal = ref(0)
const cancelViewVisible = ref(false)
const cancelCurrent = ref(null)
const cancelQuery = reactive({ pageNum: 1, pageSize: 10, targetType: undefined, userName: undefined, targetName: undefined, reason: undefined })

function cancelGetList() {
  cancelLoading.value = true
  listCancelRecord(cancelQuery).then((res) => {
    cancelRecordList.value = res.rows || []
    cancelTotal.value = res.total || 0
    cancelLoading.value = false
  }).catch(() => { cancelLoading.value = false })
}
function cancelHandleQuery() { cancelQuery.pageNum = 1; cancelGetList() }
function cancelResetQuery() { proxy.resetForm('cancelQueryRef'); cancelHandleQuery() }
function cancelHandleSelectionChange(selection) { cancelIds.value = selection.map(i => i.recordId); cancelMultiple.value = !selection.length }
function cancelHandleView(row) { cancelCurrent.value = row; cancelViewVisible.value = true }
function cancelHandleDelete(row) {
  const delIds = row.recordId || cancelIds.value
  proxy.$modal.confirm('是否确认删除取消记录ID为"' + delIds + '"的数据项？')
    .then(() => delCancelRecord(delIds))
    .then(() => { cancelGetList(); proxy.$modal.msgSuccess('删除成功') })
    .catch(() => {})
}
function cancelHandleClean() {
  proxy.$modal.confirm('是否确认清空全部取消记录？此操作不可恢复！')
    .then(() => cleanCancelRecord())
    .then(() => { cancelGetList(); proxy.$modal.msgSuccess('已清空') })
    .catch(() => {})
}
function cancelHandleExport() { proxy.download('pet/cancel/export', { ...cancelQuery }, `cancel_record_${new Date().getTime()}.xlsx`) }

// 懒加载：只有切到某个 tab 时才拉它的数据，首屏只加载订单
function onTabChange(name) {
  if (name === 'refund') { refundGetList(); refundGetStats() }
  if (name === 'cancel') { cancelGetList() }
}

onMounted(() => { orderGetList(); orderGetStats() })
</script>

<style scoped lang="scss">
.trade-tabs { :deep(.el-tabs__header) { margin-bottom: 14px; } }
.cell-main, .ui-cell-sub { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cell-main { font-size: var(--fs-5); color: var(--text-1); }
.type-tag { margin-right: 6px; }
.detail-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px;
  .no { margin: 0; font-size: var(--fs-6); font-weight: 600; color: var(--text-1); }
  .sub { margin: 4px 0 0; font-size: var(--fs-2); color: var(--text-3); }
}
.section-title { margin: 20px 0 10px; font-size: var(--fs-5); font-weight: 600; color: var(--text-1); }
.total-line { text-align: right; margin: 10px 0 0; color: var(--text-2); b { color: var(--brand-700); font-size: var(--fs-7); } }
.sub-id { font-size: var(--fs-2); color: var(--text-3); margin-top: 2px; }
.name-text { color: var(--text-1); font-weight: 600; }
.detail-text { color: var(--text-2); }
.reason-text { color: var(--warning-500); }
.detail-box { font-size: var(--fs-5); color: var(--text-1);
  .d-row { display: flex; gap: 12px; padding: 6px 0; border-bottom: 1px dashed var(--border-2);
    .d-lbl { width: 72px; color: var(--text-3); flex-shrink: 0; }
  }
  .d-block { margin-top: 14px;
    .d-title { font-size: var(--fs-5); font-weight: 600; color: var(--text-1); margin-bottom: 6px; }
    .d-content { background: var(--bg-page); border-radius: var(--radius-md); padding: 12px 14px; line-height: 1.8; white-space: pre-wrap; word-break: break-word;
      &.r { background: var(--brand-50); border: 1px solid var(--brand-100); }
    }
  }
}
</style>
