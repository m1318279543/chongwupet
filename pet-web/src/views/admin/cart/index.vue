<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="80px">
      <el-form-item label="用户名" prop="userName">
        <el-input v-model="queryParams.userName" placeholder="用户名" clearable style="width: 160px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="商品名称" prop="goodsName">
        <el-input v-model="queryParams.goodsName" placeholder="商品名称" clearable style="width: 160px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5"><el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete" v-hasPermi="['pet:cart:remove']">删除</el-button></el-col>
      <el-col :span="1.5"><el-button type="warning" plain icon="Download" @click="handleExport" v-hasPermi="['pet:cart:export']">导出</el-button></el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="cartList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column label="记录ID" align="center" prop="cartId" width="80" />
      <el-table-column label="用户" align="center" width="140">
        <template #default="scope">
          <div>ID: {{ scope.row.userId }}</div>
          <div>{{ scope.row.userName || '—' }}</div>
        </template>
      </el-table-column>
      <el-table-column label="商品" min-width="220">
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
      <el-table-column label="单价" align="center" prop="price" width="100">
        <template #default="scope"><span>¥{{ scope.row.price }}</span></template>
      </el-table-column>
      <el-table-column label="数量" align="center" prop="qty" width="80" />
      <el-table-column label="小计" align="center" width="110">
        <template #default="scope"><span class="amount">¥{{ scope.row.amount }}</span></template>
      </el-table-column>
      <el-table-column label="订单号" align="center" prop="orderNo" width="180" show-overflow-tooltip />
      <el-table-column label="支付状态" align="center" width="100">
        <template #default="scope">
          <el-tag v-if="scope.row.status === '3'" type="info" size="small">已取消</el-tag>
          <el-tag v-else-if="scope.row.payStatus === '1'" type="success" size="small">
            已支付{{ scope.row.payMethod === 'wechat' ? '·微信' : scope.row.payMethod === 'balance' ? '·余额' : '·支付宝' }}
          </el-tag>
          <el-tag v-else type="warning" size="small">待支付</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="提交时间" align="center" prop="createTime" width="180">
        <template #default="scope"><span>{{ parseTime(scope.row.createTime) }}</span></template>
      </el-table-column>
      <el-table-column label="操作" align="center" width="100" fixed="right">
        <template #default="scope">
          <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['pet:cart:remove']">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />
  </div>
</template>

<script setup name="Cart">
import { ref, reactive, toRefs, getCurrentInstance } from "vue";
import { listPetCart, delPetCart } from "@/api/pet/petCart";

const { proxy } = getCurrentInstance();
const cartList = ref([]);
const loading = ref(true);
const showSearch = ref(true);
const ids = ref([]);
const single = ref(true);
const multiple = ref(true);
const total = ref(0);

const data = reactive({
  queryParams: { pageNum: 1, pageSize: 10, userName: undefined, goodsName: undefined },
});
const { queryParams } = toRefs(data);

function getList() {
  loading.value = true;
  listPetCart(queryParams.value).then((res) => { cartList.value = res.rows; total.value = res.total; loading.value = false; });
}
function handleQuery() { queryParams.value.pageNum = 1; getList(); }
function resetQuery() { proxy.resetForm("queryRef"); handleQuery(); }
function handleSelectionChange(selection) { ids.value = selection.map(i => i.cartId); single.value = selection.length !== 1; multiple.value = !selection.length; }
function handleDelete(row) {
  const delIds = row.cartId || ids.value;
  proxy.$modal.confirm('是否确认删除购物车记录ID为"' + delIds + '"的数据项？').then(() => delPetCart(delIds)).then(() => { getList(); proxy.$modal.msgSuccess("删除成功"); }).catch(() => {});
}
function handleExport() { proxy.download("pet/cart/export", { ...queryParams.value }, `cart_${new Date().getTime()}.xlsx`); }
getList();
</script>

<style scoped lang="scss">
.goods-cell { display: flex; align-items: center; gap: 10px;
  .thumb { width: 48px; height: 48px; border-radius: 6px; object-fit: cover; background: #f5f5f5; flex-shrink: 0; }
  .goods-meta { .g-name { font-size: 14px; color: #303133; }
    .g-spec { font-size: 12px; color: #909399; margin-top: 2px; } }
}
.amount { color: #ff8c42; font-weight: 600; }
</style>
