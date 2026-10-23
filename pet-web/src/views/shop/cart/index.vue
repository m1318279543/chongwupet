<template>
  <div class="ui-page ui-page--md">
    <!-- 页面头：标题左、件数右，1px 线收口 -->
    <header class="ui-head">
      <div class="ui-head__main">
        <p class="ui-eyebrow">Cart</p>
        <h1 class="ui-title">我的购物车</h1>
        <p class="ui-sub">勾选要结算的商品，数量改动即时生效。</p>
      </div>
      <div class="ui-head__aside">
        <span class="ui-count"><b>{{ cartStore.totalCount }}</b>件商品</span>
      </div>
    </header>

    <!-- 空态：不套壳、不插图 -->
    <div class="ui-empty" v-if="cartStore.isEmpty">
      <p class="ui-empty__title">购物车还是空的</p>
      <p class="ui-empty__desc">去宠物粮专区挑几袋，回来这里一起结算。</p>
      <div class="ui-empty__act">
        <button type="button" class="ui-btn ui-btn--line" @click="goShop">去挑选宠物粮</button>
      </div>
    </div>

    <template v-else>
      <!-- 明细：原生表格（多字段规整数据），表头 + 行分割线区分行 -->
      <table class="ui-table cart-table">
        <thead>
          <tr>
            <th class="c-check">
              <el-checkbox :model-value="cartStore.allChecked" @change="toggleAll">全选</el-checkbox>
            </th>
            <th class="c-goods">商品</th>
            <th class="c-price align-right">单价</th>
            <th class="c-qty">数量</th>
            <th class="c-sub align-right">小计</th>
            <th class="c-op align-right">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in cartStore.items" :key="item.id">
            <td class="c-check">
              <el-checkbox :model-value="item.checked" @change="(v) => cartStore.setChecked(item.id, v)" />
            </td>
            <td class="c-goods">
              <div class="goods">
                <img :src="item.image" :alt="item.name" class="thumb" loading="lazy" />
                <div class="goods__text">
                  <div class="goods__name">{{ item.name }}</div>
                  <div class="goods__spec">
                    {{ item.spec }}<span class="unit"> · ¥{{ item.price }}</span>
                  </div>
                </div>
              </div>
            </td>
            <td class="c-price align-right ui-num">¥{{ item.price }}</td>
            <td class="c-qty">
              <el-input-number
                :model-value="item.qty"
                :min="1"
                :max="99"
                size="small"
                @change="(v) => cartStore.updateQty(item.id, v)"
              />
            </td>
            <td class="c-sub align-right">
              <span class="ui-price">¥{{ (item.price * item.qty).toFixed(2) }}</span>
            </td>
            <td class="c-op align-right">
              <button type="button" class="ui-linkbtn ui-linkbtn--danger" @click="removeItem(item)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- 结算条：底部吸附，顶部一条 1px 线隔离，不做悬浮卡片 -->
      <div class="checkout">
        <div class="checkout__left">
          <el-checkbox :model-value="cartStore.allChecked" @change="toggleAll">全选</el-checkbox>
          <button type="button" class="ui-linkbtn ui-linkbtn--muted" @click="clearCart">清空购物车</button>
        </div>
        <div class="checkout__right">
          <span class="checkout__count">已选 <b>{{ cartStore.selectedCount }}</b> 件</span>
          <span class="checkout__sum">
            <i>合计</i>
            <span class="ui-price">¥{{ cartStore.selectedPrice.toFixed(2) }}</span>
          </span>
          <button
            type="button"
            class="ui-btn ui-btn--solid"
            :disabled="cartStore.selectedCount === 0"
            @click="checkout"
          >
            结算
          </button>
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
          ElMessage.success('下单成功！即将进入收银台')
          // 带上订单号去订单页，自动弹出模拟收银台
          setTimeout(() => router.push(orderNo ? { path: '/shop/order', query: { pay: orderNo } } : '/shop/order'), 600)
        })
        .catch(() => {})
    })
    .catch(() => {})
}
</script>

<style scoped lang="scss">
// 表格骨架来自 .ui-table；这里只定义列宽与两处页面特有内容（商品单元、结算条）。

.cart-table {
  margin-top: 8px;

  // 首列左对齐页面边线，末列贴右，避免整表内缩
  th:first-child, td:first-child { padding-left: 0; }
  th:last-child, td:last-child { padding-right: 0; }

  // 行内带交互控件，去掉斑马纹，只保留 1px 行分割线
  tbody tr:nth-child(even) { background: transparent; }
}

// 列宽用固定值，保证各行竖直对齐
.c-check { width: 76px; }
.c-goods { min-width: 240px; }
.c-price { width: 110px; }
.c-qty { width: 148px; }
.c-sub { width: 116px; }
.c-op { width: 72px; }

// 商品单元：72px 缩略图 + 名称/规格两行
.goods {
  display: flex;
  align-items: center;
  gap: 14px;
}
.thumb {
  width: 72px;
  height: 72px;
  flex-shrink: 0;
  object-fit: cover;
  border: var(--rule);
  border-radius: var(--r-2);
  background: var(--bg-sunken);
}
.goods__text { min-width: 0; }
.goods__name {
  font-size: 14.5px;
  font-weight: 600;
  color: var(--text-1);
  line-height: 1.45;
}
.goods__spec {
  margin-top: 4px;
  font-size: 12.5px;
  color: var(--text-3);
}
// 单价在窄屏并入规格行（见下方媒体查询），桌面端隐藏，避免重复显示
.goods__spec .unit { display: none; }

/* ============================================================
   结算条：吸附在视口底部，靠顶部 1px 线把「明细」和「汇总」切开
   ============================================================ */
.checkout {
  position: sticky;
  bottom: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 4px;
  padding: 14px 0 16px;
  border-top: 1px solid var(--text-1);
  background: var(--bg-page);
}
.checkout__left {
  display: flex;
  align-items: center;
  gap: 18px;
}
.checkout__right {
  display: flex;
  align-items: center;
  gap: 20px;
}
.checkout__count {
  font-size: 13px;
  color: var(--text-3);
  b {
    font-weight: 650;
    color: var(--text-1);
    font-variant-numeric: tabular-nums;
  }
}
.checkout__sum {
  display: flex;
  align-items: baseline;
  gap: 8px;
  i {
    font-style: normal;
    font-size: 13px;
    color: var(--text-3);
  }
  .ui-price { font-size: 22px; }
}

/* ============================================================
   手机端：表格折成两行式条目（仍是一行一条 + 1px 分割线）
   ============================================================ */
@media (max-width: 768px) {
  .cart-table {
    margin-top: 4px;
    thead { display: none; }
    tbody, tr, td { display: block; }
    tbody tr {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px 12px;
      padding: 14px 0;
      border-bottom: var(--rule-soft);
    }
    td { border: 0; padding: 0; }
  }

  .c-check { width: 22px; flex: 0 0 22px; }
  .c-goods { flex: 1 1 calc(100% - 34px); min-width: 0; }
  // 窄屏不单列单价：并进规格行，第二行只留 数量 / 小计 / 删除
  // 选择器带 .cart-table 是为了压过上面 `.cart-table td { display:block }` 的优先级
  .cart-table .c-price { display: none; }
  .goods__spec .unit { display: inline; }
  .c-qty {
    order: 3;
    width: auto;
    // 与上方缩略图左缘对齐（勾选框 22px + 间距 12px）
    margin-left: 34px;
    :deep(.el-input-number) { width: 116px; }
  }
  .c-sub { order: 4; width: auto; margin-left: auto;
    .ui-price { font-size: 15px; }
  }
  .c-op { order: 5; width: auto; }

  .thumb { width: 60px; height: 60px; }
  .goods { gap: 12px; }
  .goods__name { font-size: 14px; }

  // 结算条：左右两栏压缩，价格与按钮占一行
  .checkout {
    flex-wrap: wrap;
    gap: 10px;
    padding: 12px 0;
  }
  .checkout__left { gap: 14px; }
  .checkout__right { gap: 12px; margin-left: auto; }
  .checkout__count { display: none; } // 窄屏省掉重复计数，只留合计
  .checkout__sum .ui-price { font-size: 19px; }
}
</style>
