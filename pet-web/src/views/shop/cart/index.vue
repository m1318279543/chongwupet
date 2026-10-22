<template>
  <div class="cart-page">
    <div class="page-head">
      <h1>🛒 我的购物车</h1>
      <span class="sub">共 {{ cartStore.totalCount }} 件商品</span>
    </div>

    <!-- 空购物车 -->
    <div class="empty" v-if="cartStore.isEmpty">
      <div class="empty-icon">🛒</div>
      <p class="empty-text">购物车还是空的</p>
      <el-button type="warning" round @click="goShop">去挑选宠物粮</el-button>
    </div>

    <!-- 购物车列表 -->
    <template v-else>
      <div class="cart-card">
        <!-- 表头 -->
        <div class="row head">
          <div class="col-check">
            <el-checkbox :model-value="cartStore.allChecked" @change="toggleAll">全选</el-checkbox>
          </div>
          <div class="col-goods">商品</div>
          <div class="col-price">单价</div>
          <div class="col-qty">数量</div>
          <div class="col-sub">小计</div>
          <div class="col-op">操作</div>
        </div>

        <!-- 商品行 -->
        <div class="row item" v-for="item in cartStore.items" :key="item.id">
          <div class="col-check">
            <el-checkbox :model-value="item.checked" @change="(v) => cartStore.setChecked(item.id, v)" />
          </div>
          <div class="col-goods">
            <img :src="item.image" :alt="item.name" class="thumb" />
            <div class="goods-info">
              <div class="name">{{ item.name }}</div>
              <div class="spec">{{ item.spec }}</div>
            </div>
          </div>
          <div class="col-price">¥{{ item.price }}</div>
          <div class="col-qty">
            <el-input-number :model-value="item.qty" :min="1" :max="99" size="small"
              @change="(v) => cartStore.updateQty(item.id, v)" />
          </div>
          <div class="col-sub">¥{{ (item.price * item.qty).toFixed(2) }}</div>
          <div class="col-op">
            <el-button link type="danger" @click="removeItem(item)">删除</el-button>
          </div>
        </div>
      </div>

      <!-- 结算栏 -->
      <div class="checkout-bar">
        <div class="cb-left">
          <el-checkbox :model-value="cartStore.allChecked" @change="toggleAll">全选</el-checkbox>
          <el-button link type="info" @click="clearCart">清空购物车</el-button>
        </div>
        <div class="cb-right">
          <span class="sel-tip">已选 {{ cartStore.selectedCount }} 件</span>
          <span class="total-label">合计：</span>
          <span class="total-price">¥{{ cartStore.selectedPrice.toFixed(2) }}</span>
          <el-button type="warning" size="large" round :disabled="cartStore.selectedCount === 0"
            @click="checkout">结算</el-button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { inject } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/store/modules/user'
import { useCartStore } from '@/store/modules/cart'
import { submitPetCart } from '@/api/pet/petCart'

const router = useRouter()
const userStore = useUserStore()
const cartStore = useCartStore()
const openAuth = inject('openAuth', () => {})

function goShop() {
  router.push('/shop/food')
}

function toggleAll(val) {
  cartStore.setAllChecked(val)
}

function removeItem(item) {
  ElMessageBox.confirm(`确定从购物车移除「${item.name}」吗？`, '提示', { type: 'warning' })
    .then(() => {
      cartStore.removeItem(item.id)
      ElMessage.success('已移除')
    })
    .catch(() => {})
}

function clearCart() {
  if (cartStore.isEmpty) return
  ElMessageBox.confirm('确定清空购物车吗？', '提示', { type: 'warning' })
    .then(() => {
      cartStore.clear()
      ElMessage.success('购物车已清空')
    })
    .catch(() => {})
}

function checkout() {
  if (cartStore.selectedCount === 0) return
  if (!userStore.token) {
    ElMessageBox.confirm('结算需先登录账号，是否现在登录？', '请先登录', {
      type: 'info',
      confirmButtonText: '去登录',
      cancelButtonText: '取消'
    })
      .then(() => openAuth('login'))
      .catch(() => {})
    return
  }
  const amount = cartStore.selectedPrice.toFixed(2)
  const count = cartStore.selectedCount
  const items = cartStore.items
    .filter((i) => i.checked)
    .map((i) => ({ goodsId: i.goodsId, skuId: i.skuId, goodsName: i.name, goodsImage: i.image, goodsSpec: i.spec, price: i.price, qty: i.qty }))
  ElMessageBox.confirm(`确认提交订单？共 ${count} 件商品，合计 ¥${amount}`, '提交订单', {
    type: 'success',
    confirmButtonText: '确认下单',
    cancelButtonText: '再看看'
  })
    .then(() => {
      submitPetCart(items)
        .then((res) => {
          cartStore.clear()
          const orderNo = res?.data?.orderNo
          ElMessage.success('下单成功！即将进入收银台 🎉')
          // 带上订单号去订单页，自动弹出模拟收银台
          setTimeout(() => router.push(orderNo ? { path: '/shop/order', query: { pay: orderNo } } : '/shop/order'), 600)
        })
        .catch(() => {})
    })
    .catch(() => {})
}
</script>

<style scoped lang="scss">
.cart-page { max-width: var(--container-md); margin: 0 auto; padding: 24px; }
.page-head { display: flex; align-items: baseline; gap: 12px; margin-bottom: 20px;
  h1 { font-size: 24px; color: var(--text-1); margin: 0; }
  .sub { color: var(--text-3); font-size: 14px; }
}
.empty { text-align: center; padding: 80px 0; background: #fff; border-radius: 14px;
  .empty-icon { font-size: 64px; opacity: .5; }
  .empty-text { color: var(--text-3); font-size: 16px; margin: 16px 0 24px; }
}
.cart-card { background: #fff; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,.05); }
.row { display: flex; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--bg-sunken);
  &:last-child { border-bottom: none; }
  &.head { background: var(--bg-page); color: var(--text-3); font-size: 13px; }
  &.item:hover { background: var(--brand-50); }
}
.col-check { width: 70px; flex-shrink: 0; }
.col-goods { flex: 1; display: flex; align-items: center; gap: 14px;
  .thumb { width: 72px; height: 72px; border-radius: 8px; object-fit: cover; background: var(--bg-page); }
  .goods-info { .name { font-size: 15px; color: var(--text-1); font-weight: 600; }
    .spec { font-size: 13px; color: var(--text-3); margin-top: 4px; } }
}
.col-price { width: 100px; color: var(--text-2); font-size: 14px; }
.col-qty { width: 140px; }
.col-sub { width: 110px; color: var(--brand-500); font-weight: 700; font-size: 15px; }
.col-op { width: 70px; text-align: right; }

.checkout-bar { display: flex; align-items: center; justify-content: space-between;
  margin-top: 16px; padding: 16px 24px; background: #fff; border-radius: 14px;
  box-shadow: 0 4px 16px rgba(0,0,0,.05);
  .cb-left { display: flex; align-items: center; gap: 16px; }
  .cb-right { display: flex; align-items: center; gap: 12px;
    .sel-tip { color: var(--text-3); font-size: 14px; }
    .total-label { color: var(--text-2); font-size: 14px; }
    .total-price { color: var(--brand-500); font-size: 24px; font-weight: 700; }
  }
}
@media (max-width: 768px) {
  .row.head { display: none; }
  .row.item { flex-wrap: wrap; gap: 8px;
    .col-goods { width: 100%; }
    .col-price, .col-qty, .col-sub, .col-op { width: auto; flex: 1; }
  }
  .checkout-bar { flex-direction: column; gap: 12px; align-items: stretch;
    .cb-right { flex-wrap: wrap; justify-content: space-between; } }
}
</style>
