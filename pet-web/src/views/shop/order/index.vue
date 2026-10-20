<template>
  <div class="order-page">
    <div class="page-head">
      <h1>📦 我的订单</h1>
      <span class="sub" v-if="isLogged">共 {{ orderList.length }} 条下单记录</span>
    </div>

    <!-- 未登录 -->
    <div class="empty" v-if="!isLogged">
      <div class="empty-icon">🔒</div>
      <p class="empty-text">请先登录后查看你的下单记录</p>
      <el-button type="warning" round @click="openAuth('login')">去登录</el-button>
    </div>

    <!-- 空订单 -->
    <div class="empty" v-else-if="orderList.length === 0">
      <div class="empty-icon">📦</div>
      <p class="empty-text">还没有下单记录，挑点好粮给毛孩子吧～</p>
      <el-button type="warning" round @click="goShop">去挑选宠物粮</el-button>
    </div>

    <!-- 订单列表 -->
    <div class="order-list" v-else v-loading="loading">
      <div class="order-card" :class="{ canceled: isCanceled(o) }" v-for="o in orderList" :key="o.cartId">
        <div class="order-head">
          <div class="head-left">
            <span class="order-no">订单 #{{ o.cartId }}</span>
            <el-tag v-if="isCanceled(o)" type="info" size="small">已取消</el-tag>
            <el-tag v-else type="success" size="small">正常</el-tag>
          </div>
          <div class="head-right">
            <span class="order-time">
              <el-icon><Clock /></el-icon>{{ o.createTime }}
            </span>
            <el-button
              v-if="!isCanceled(o)"
              type="danger" link size="small"
              :loading="cancelingId === o.cartId"
              @click="cancelOrder(o)"
            >取消订单</el-button>
          </div>
        </div>
        <div class="order-body">
          <img :src="o.goodsImage" class="thumb" v-if="o.goodsImage" @error="onImgErr" />
          <div class="goods-info">
            <div class="name">{{ o.goodsName }}</div>
            <div class="spec">{{ o.goodsSpec }}</div>
          </div>
          <div class="col-price">¥{{ o.price }}</div>
          <div class="col-qty">×{{ o.qty }}</div>
          <div class="col-sub">¥{{ (o.amount != null ? o.amount : o.price * o.qty).toFixed(2) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, inject, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/store/modules/user'
import { listPetCart, cancelPetCart } from '@/api/pet/petCart'

const router = useRouter()
const userStore = useUserStore()
const openAuth = inject('openAuth', () => {})
const isLogged = computed(() => !!userStore.token)
const orderList = ref([])
const loading = ref(false)
const cancelingId = ref(null)

// 订单状态：0 正常 / 3 已取消
function isCanceled(o) { return o.status === '3' }

// 取消订单：先确认 + 填写原因，再调用后端（后端会写入取消记录）
function cancelOrder(o) {
  ElMessageBox.prompt(
    `确认取消订单 #${o.cartId}（${o.goodsName}）吗？可填写取消原因：`,
    '取消订单',
    {
      confirmButtonText: '确认取消',
      cancelButtonText: '再想想',
      inputPlaceholder: '如：拍错了 / 不想要了（选填）',
      inputValue: '',
      type: 'warning'
    }
  ).then(({ value }) => {
    cancelingId.value = o.cartId
    return cancelPetCart(o.cartId, value || '')
      .then((res) => {
        ElMessage.success(res.msg || '订单已取消')
        getList()
      })
      .catch((e) => {
        ElMessage.error(e?.msg || e?.message || '取消失败')
      })
      .finally(() => {
        cancelingId.value = null
      })
  }).catch(() => {})
}

function goShop() {
  router.push('/shop/food')
}
function onImgErr(e) {
  e.target.style.display = 'none'
}
function getList() {
  if (!isLogged.value) return
  loading.value = true
  listPetCart({ pageNum: 1, pageSize: 100 })
    .then((res) => {
      orderList.value = res.rows || []
      loading.value = false
    })
    .catch(() => {
      loading.value = false
    })
}
onMounted(getList)
</script>

<style scoped lang="scss">
.order-page { max-width: 1100px; margin: 0 auto; padding: 24px; }
.page-head { display: flex; align-items: baseline; gap: 12px; margin-bottom: 20px;
  h1 { font-size: 24px; color: #303133; margin: 0; }
  .sub { color: #909399; font-size: 14px; }
}
.empty { text-align: center; padding: 80px 0; background: #fff; border-radius: 14px;
  .empty-icon { font-size: 64px; opacity: .5; }
  .empty-text { color: #909399; font-size: 16px; margin: 16px 0 24px; }
}
.order-list { display: flex; flex-direction: column; gap: 14px; }
.order-card { background: #fff; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,.05); }
.order-head { display: flex; align-items: center; justify-content: space-between;
  padding: 12px 20px; background: #fafafa; border-bottom: 1px solid #f0f0f0;
  .head-left { display: flex; align-items: center; gap: 8px; }
  .head-right { display: flex; align-items: center; gap: 12px; }
  .order-no { font-size: 14px; font-weight: 600; color: #303133; }
  .order-time { display: inline-flex; align-items: center; gap: 4px; font-size: 13px; color: #909399; }
}
.order-card.canceled {
  opacity: .72;
  .order-body { filter: grayscale(.35); }
}
.order-body { display: flex; align-items: center; gap: 16px; padding: 16px 20px;
  .thumb { width: 64px; height: 64px; border-radius: 8px; object-fit: cover; background: #f7f7f7; flex-shrink: 0; }
  .goods-info { flex: 1; min-width: 0;
    .name { font-size: 15px; color: #303133; font-weight: 600; }
    .spec { font-size: 13px; color: #909399; margin-top: 4px; }
  }
  .col-price { width: 100px; color: #606266; font-size: 14px; text-align: center; }
  .col-qty { width: 80px; color: #606266; font-size: 14px; text-align: center; }
  .col-sub { width: 120px; color: #ff8c42; font-weight: 700; font-size: 16px; text-align: right; }
}
@media (max-width: 720px) {
  .order-body { flex-wrap: wrap; gap: 8px;
    .goods-info { width: 100%; }
    .col-price, .col-qty { width: auto; flex: 1; text-align: left; }
    .col-sub { width: 100%; text-align: right; }
  }
}
</style>
