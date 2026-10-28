<template>
  <div class="ui-page">
    <!-- 顶部标签栏：购物车 / 待支付 / 已支付 / 已取消，各分区独立查看（游客只有购物车，不显示标签） -->
    <nav class="tabs" v-if="userStore.token" aria-label="购物车分区">
      <button
        v-for="t in topTabs"
        :key="t.key"
        type="button"
        class="tab"
        :class="{ on: activeTab === t.key }"
        @click="activeTab = t.key"
      >
        {{ t.label }}<span class="tab__n">{{ t.count }}</span>
      </button>
    </nav>

    <!-- 三个标签共用同一块定高面板：切换时页面高度不变，结算条仍压在面板最底 -->
    <div class="tab-panel">
      <!-- ========== 购物车：只放未下单的商品，清空即空 ========== -->
      <template v-if="activeTab === 'cart'">
      <!-- 空态：头部（图标 + 一句话 + 行动）＋ 两级推荐，页面不再空一大片 -->
      <div class="cart-empty" v-if="cartStore.items.length === 0">
        <header class="ui-head cart-empty__head">
          <div class="ui-head__main">
            <h1 class="ui-title">
              <span class="ce-ico" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M6.5 8h11l-.9 11.2a1.6 1.6 0 01-1.6 1.3H9a1.6 1.6 0 01-1.6-1.3L6.5 8z"/><path d="M9 10V6.8A3 3 0 0112 4a3 3 0 013 2.8V10"/></svg>
              </span>
              购物车还是空的
            </h1>
            <p class="ui-sub">挑一只合眼缘的伙伴，或带几袋好粮，都放这里结算。</p>
          </div>
          <!-- 未登录时登录是结算前的必经步骤，设为主操作；宠物粮入口常驻 -->
          <div class="ui-head__aside ce-act">
            <button v-if="!userStore.token" type="button" class="ui-btn ui-btn--solid" @click="openAuth('login')">去登录</button>
            <button type="button" class="ui-btn" :class="userStore.token ? 'ui-btn--solid' : 'ui-btn--line'" @click="$router.push('/shop/pets')">去逛在售宠物</button>
            <button type="button" class="ui-btn ui-btn--line" @click="$router.push('/shop/food')">去逛宠物粮</button>
          </div>
        </header>

        <!-- 推荐①：在售宠物精选，卡片与首页/售卖页完全同一只（含收藏与评分） -->
        <section class="ce-sec" v-if="recPets.length || recLoading">
          <div class="ce-sec__head">
            <div>
              <h3>在售宠物 · 先从这几只看起</h3>
              <p>每一只都有可查的健康筛查与疫苗记录，支持到店看宠</p>
            </div>
            <router-link class="ce-more" to="/shop/pets">
              看全部在售
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6"/></svg>
            </router-link>
          </div>
          <div class="ce-grid" v-loading="recLoading">
            <PetCard
              v-for="pet in recPets"
              :key="pet.petId"
              :pet="pet"
              :faved="isFav(pet.petId)"
              :rating="petRating(pet.petId)"
              :gradient="petGradient(pet.petId)"
              @open="goPetDetail"
              @fav="toggleFav"
            />
          </div>
        </section>

        <!-- 推荐②：宠物粮精选，不用离开本页就能加购（与宠物粮专区同一加购口径） -->
        <section class="ce-sec" v-if="recFood.length">
          <div class="ce-sec__head">
            <div>
              <h3>宠物粮 · 顺带带几袋</h3>
              <p>按品类挑对口好粮，加购后可与宠物一起结算</p>
            </div>
            <router-link class="ce-more" to="/shop/food">
              逛宠物粮专区
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6"/></svg>
            </router-link>
          </div>
          <div class="ce-grid">
            <article class="ce-food" v-for="g in recFood" :key="g.id" @click="$router.push('/shop/food')">
              <div class="ce-food__thumb"><img :src="g.image" :alt="g.name" loading="lazy" /></div>
              <div class="ce-food__body">
                <div class="ce-food__name">{{ g.name }}</div>
                <div class="ce-food__spec">{{ g.spec }}</div>
                <div class="ce-food__row">
                  <span class="ce-food__price">¥{{ money(g.price) }}</span>
                  <button
                    type="button"
                    class="ce-food__add"
                    :disabled="!g.stock"
                    @click.stop="addFoodToCart(g)"
                  >{{ g.stock ? '加入购物车' : '暂时缺货' }}</button>
                </div>
              </div>
            </article>
          </div>
        </section>
      </div>
      <template v-else>
        <table class="ui-table cart-table">
          <thead>
            <tr>
              <th class="c-check">
                <el-checkbox :model-value="cartAll" @change="toggleCartAll">全选</el-checkbox>
              </th>
              <th class="c-goods">商品</th>
              <th class="c-price align-right">单价</th>
              <th class="c-qty">数量</th>
              <th class="c-sub align-right">小计</th>
              <th class="c-op align-right">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in pagedItems" :key="item.id">
              <td class="c-check">
                <el-checkbox :model-value="item.checked" @change="(v) => cartStore.setChecked(item.id, v)" />
              </td>
              <td class="c-goods">
                <div class="goods">
                  <img :src="item.image" :alt="item.name" class="thumb" loading="lazy" />
                  <div class="goods__text">
                    <div class="goods__name">
                      {{ item.name }}
                      <span v-if="isPet(item)" class="ui-chip ui-chip--brand">宠物</span>
                    </div>
                    <div class="goods__spec">
                      <span v-if="item.spec && item.spec !== item.name">{{ item.spec }}</span><span class="unit" :class="{ 'unit--solo': !item.spec || item.spec === item.name }">¥{{ money(item.price) }}</span>
                    </div>
                  </div>
                </div>
              </td>
              <td class="c-price align-right ui-num">¥{{ money(item.price) }}</td>
              <!-- 宠物是活的：一只一条，不给步进器 -->
              <td class="c-qty">
                <el-input-number
                  v-if="!isPet(item)"
                  :model-value="item.qty"
                  :min="1"
                  :max="99"
                  size="small"
                  @change="(v) => cartStore.updateQty(item.id, v)"
                />
                <span v-else class="qty-fixed">1 只</span>
              </td>
              <td class="c-sub align-right">
                <span class="ui-price ui-price--sm">¥{{ money(item.price * item.qty) }}</span>
              </td>
              <td class="c-op align-right">
                <button type="button" class="ui-linkbtn ui-linkbtn--danger" @click="removeItem(item)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- 定高翻页：每页 5 行，超出翻页查看；全选仍作用于全部商品 -->
        <div class="cart-foot">
          <span class="cart-foot__count">第 {{ rangeStart }}–{{ rangeEnd }} 件 / 共 {{ cartStore.items.length }} 件</span>
          <Pagination
            v-if="cartStore.items.length > PAGE_SIZE"
            :total="cartStore.items.length"
            v-model:page="page"
            :limit="PAGE_SIZE"
            :page-sizes="[PAGE_SIZE]"
            :background="false"
            layout="prev, pager, next"
            :auto-scroll="false"
          />
        </div>

        <!-- 结算条：贴在页脚正上方（随内容排在页面末尾） -->
        <div class="checkout">
          <div class="checkout__left">
            <el-checkbox :model-value="cartAll" @change="toggleCartAll">全选</el-checkbox>
            <button type="button" class="ui-linkbtn ui-linkbtn--muted clear-cart" @click="clearCart">清空购物车</button>
          </div>
          <div class="checkout__right">
            <span class="checkout__count">已选 <b>{{ cartSelectedRows }}</b> 行 · 共 {{ cartStore.selectedCount }} 件</span>
            <span class="checkout__sum">
              <i>合计</i>
              <span class="ui-price ui-price--lg">¥{{ money(cartStore.selectedPrice) }}</span>
            </span>
            <button type="button" class="ui-btn ui-btn--solid" :disabled="cartStore.selectedPrice === 0" @click="openCashier">
              结算
            </button>
          </div>
        </div>
      </template>
    </template>

    <!-- ========== 已支付 / 已取消：复用历史订单归档区（按顶部标签固定筛选） ========== -->
    <OrdersSection
      v-else
      :groups="archivedGroups"
      :loading="ordersLoading"
      :fixed-filter="activeTab"
    />
    </div>

    <!-- 收银台：一次支付所有勾选项（购物车商品自动先下单，再与勾选订单合并付款） -->
    <el-dialog v-model="cashierOpen" width="420px" align-center :show-close="!paySuccess" class="cashier-dialog"
               :close-on-click-modal="false">
      <template #header>
        <div class="cashier-head">
          <span>收银台</span>
        </div>
      </template>

      <div class="cashier-body" v-if="!paySuccess">
        <div class="cashier-amount">
          <span class="label">支付金额</span>
          <span class="num">¥{{ money(cashierTotal) }}</span>
        </div>
        <!-- 付款明细：合并付款场景下让用户先确认这笔钱由哪些商品/订单构成 -->
        <div class="cashier-detail" v-if="payDetail.length">
          <div class="cd-row" v-for="(d, i) in payDetail" :key="i">
            <span class="cd-name">{{ d.name }}</span>
            <span class="cd-qty">{{ d.qtyLabel }}</span>
            <span class="cd-amt">¥{{ money(d.amount) }}</span>
          </div>
        </div>
        <div class="pay-methods">
          <div class="pay-item" v-for="m in methods" :key="m.key" :class="{ active: payMethod === m.key }"
               @click="payMethod = m.key">
            <span class="pm-icon" :style="{ background: m.bg }"><el-icon><component :is="m.icon" /></el-icon></span>
            <div class="pm-info">
              <b>{{ m.name }}</b>
              <em>{{ m.desc }}</em>
            </div>
            <span class="pm-check"><el-icon v-if="payMethod === m.key"><Check /></el-icon></span>
          </div>
        </div>
        <div class="cashier-tip">
          <el-icon><InfoFilled /></el-icon>
          演示环境模拟支付，点击「立即支付」即完成付款，不会产生真实扣款
        </div>
        <div class="cashier-actions">
          <button type="button" class="ui-btn ui-btn--line" @click="cashierOpen = false" :disabled="paying">暂不支付</button>
          <button type="button" class="ui-btn ui-btn--solid" :disabled="paying" @click="doPay">
            立即支付<span v-if="countdown > 0">（{{ countdown }}s）</span>
          </button>
        </div>
      </div>

      <div class="cashier-success" v-else>
        <div class="s-icon"><el-icon><CircleCheckFilled /></el-icon></div>
        <h3>支付成功</h3>
        <p class="s-amount">¥{{ money(cashierTotal) }}</p>
        <p class="s-tip">支付进度可在「已支付」标签中查看</p>
        <button type="button" class="ui-btn ui-btn--solid" @click="cashierOpen = false">完成</button>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, inject, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Check, CircleCheckFilled, InfoFilled } from '@element-plus/icons-vue'
import { useUserStore } from '@/store/modules/user'
import { useCartStore } from '@/store/modules/cart'
import { submitPetCart, payPetCart } from '@/api/pet/petCart'
import { listMyOrders } from '@/api/pet/petOrder'
import { listMyRefunds } from '@/api/pet/petRefund'
import { getPetOverview } from '@/api/pet/petInfo'
import { listGoods } from '@/api/pet/petGoods'
import { commentStatGroup } from '@/api/pet/petComment'
import { listMyFavoriteIds, listPetFavorite, addPetFavorite, delPetFavorite } from '@/api/pet/petFavorite'
import OrdersSection from './OrdersSection.vue'
import Pagination from '@/components/Pagination/index.vue'
import PetCard from '@/views/shop/home/PetCard.vue'
import { PET_GRADIENTS } from '@/views/shop/home/homeData'
import { money } from '@/utils/money'

const userStore = useUserStore()
const cartStore = useCartStore()
const router = useRouter()
const openAuth = inject('openAuth', () => {})

// 购物车按账号绑定：登录后把服务端数据拉下来（本地条目自动合并上传），登出回到本地模式
onMounted(() => { cartStore.sync(); getOrders(); loadRecs() })
watch(() => userStore.token, () => { cartStore.sync(); getOrders() })
// 登出时标签栏消失，强制回到购物车标签
watch(() => userStore.token, (t) => { if (!t) activeTab.value = 'cart' })

/* ---------- 空态推荐：宠物精选 + 宠物粮精选（均免登录，接口不可用时不摆空壳） ---------- */
const recPets = ref([])
const recFood = ref([])
const recLoading = ref(false)
const myFavorites = ref([])
const ratingMap = ref({})

// 与宠物粮专区同一套字段口径（含 skuId/stock，加购时直接可用）
function adaptGoods(g) {
  return {
    id: g.goodsCode,
    goodsId: g.goodsId,
    skuId: g.skus && g.skus.length ? g.skus[0].skuId : null,
    image: g.image,
    name: g.goodsName,
    spec: g.spec,
    price: Number(g.price),
    stock: g.stock == null ? 0 : Number(g.stock)
  }
}

async function loadRecs() {
  recLoading.value = true
  try {
    // 一次请求拿「统计 + 精选」，前端不再拉全表自己排序截断
    const ov = await getPetOverview(4)
    recPets.value = (ov.featured || []).slice(0, 4)
  } catch (e) { /* 接口不可用时该区不渲染 */ }
  try {
    const gd = await listGoods({ status: '0', pageNum: 1, pageSize: 4 })
    recFood.value = (gd.rows || []).map(adaptGoods).filter((g) => g.price > 0)
  } catch (e) { /* 接口不可用时该区不渲染 */ }
  recLoading.value = false
  loadMyFavorites()
  loadRatings()
}

// 收藏：与首页同一套逻辑（未登录先引导登录）
function isFav(petId) { return myFavorites.value.includes(petId) }
async function loadMyFavorites() {
  if (!userStore.token) { myFavorites.value = []; return }
  try {
    const res = await listMyFavoriteIds()
    myFavorites.value = res.data || []
  } catch (e) { /* 静默 */ }
}
async function toggleFav(petId) {
  if (!userStore.token) {
    ElMessage.info('请先登录后再收藏')
    openAuth('login')
    return
  }
  if (isFav(petId)) {
    try {
      const res = await listPetFavorite({ userId: userStore.userId, petId })
      const fid = res.rows?.[0]?.favoriteId
      if (fid) await delPetFavorite(fid)
      myFavorites.value = myFavorites.value.filter((id) => id !== petId)
      ElMessage.success('已取消收藏')
    } catch (e) { ElMessage.error(e?.message || '取消失败') }
  } else {
    try {
      await addPetFavorite({ petId, userId: userStore.userId })
      myFavorites.value.push(petId)
      ElMessage.success('收藏成功')
    } catch (e) { ElMessage.error(e?.message || '收藏失败') }
  }
}

// 评分角标：petId -> {avg,count}
function petRating(petId) {
  const r = ratingMap.value[petId]
  return r && Number(r.count) > 0 ? r : null
}
async function loadRatings() {
  try {
    const res = await commentStatGroup('pet')
    const m = {}
    for (const row of res.data || []) m[row.petId] = row
    ratingMap.value = m
  } catch (e) { /* 静默 */ }
}

// 无图宠物的占位渐变：与首页同数组同取法，保证同一只宠物配色一致
function petGradient(petId) {
  const c = PET_GRADIENTS[(petId || 0) % PET_GRADIENTS.length]
  return `linear-gradient(135deg, ${c[0]}, ${c[1]})`
}

// 推荐宠物卡进详情：from 供详情页返回使用
function goPetDetail(petId) {
  router.push({ path: `/shop/pet/${petId}`, query: { from: '/shop/cart' } })
}

// 空态直接加购宠物粮：与宠物粮专区、详情页同一 store 口径
function addFoodToCart(g) {
  if (!g.stock) {
    ElMessage.warning('该商品暂时缺货')
    return
  }
  cartStore.addItem({
    id: g.id,
    itemType: '1',
    goodsId: g.goodsId,
    skuId: g.skuId,
    name: g.name,
    image: g.image,
    spec: g.spec,
    price: g.price
  })
  ElMessage.success({ message: `已将「${g.name}」加入购物车`, duration: 1500 })
}

// itemType '2' 是宠物（旧数据没有该字段，一律按宠物粮处理）；只用于行内徽标与数量锁定
function isPet(item) {
  return item.itemType === '2'
}

/* ---------- 顶部标签栏 ---------- */
const activeTab = ref('cart')

/* ---------- 订单数据：已支付/已取消进归档区 ---------- */
const rows = ref([])
const refundMap = ref({})
const ordersLoading = ref(false)

const groups = computed(() => rows.value.map((o) => ({
  orderNo: o.orderNo,
  items: o.items || [],
  canceled: o.status === '3',
  unpaid: o.payStatus === '0' && o.status === '0',
  paid: o.payStatus === '1',
  shipped: o.status === '1',
  isPet: o.orderType === '2' || (o.items || []).some((it) => it.itemType === '2'),
  createTime: String(o.createTime || '').replace('T', ' ').slice(5, 16),
  total: Number(o.payAmount || 0),
  refund: refundMap.value[o.orderNo] || null
})))

// 行内展示用的封面与首件名（一单多件只列首件 + 件数）
const archivedGroups = computed(() => groups.value.filter((g) => !(g.unpaid && !g.canceled)))

// 标签计数
const topTabs = computed(() => [
  { key: 'cart', label: '购物车', count: cartStore.items.length },
  { key: 'paid', label: '已支付', count: groups.value.filter((g) => g.paid && !g.canceled).length },
  { key: 'canceled', label: '已取消', count: groups.value.filter((g) => g.canceled).length }
])

function getOrders() {
  if (!userStore.token) { rows.value = []; refundMap.value = {}; return }
  ordersLoading.value = true
  Promise.all([listMyOrders(), listMyRefunds()])
    .then(([res, rf]) => {
      rows.value = res.data || []
      const map = {}
      // 同一订单可能有多条退款记录（被拒后可再申请），接口按 id 倒序，取第一条即最新
      for (const r of (rf.data || [])) {
        if (!map[r.orderNo]) map[r.orderNo] = r
      }
      refundMap.value = map
      ordersLoading.value = false
    })
    .catch(() => { ordersLoading.value = false })
}

/* ---------- 选择逻辑：购物车独立勾选 ---------- */
const cartAll = computed(() => cartStore.items.length > 0 && cartStore.items.every((i) => i.checked))

function toggleCartAll(val) {
  cartStore.setAllChecked(val)
}

const cartSelectedRows = computed(() => cartStore.items.filter((i) => i.checked).length)

/* ---------- 购物车定高翻页：每页 5 行，列表高度稳定不随商品数增长 ---------- */
const PAGE_SIZE = 5
const page = ref(1)
const pagedItems = computed(() => cartStore.items.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE))
const rangeStart = computed(() => (cartStore.items.length ? (page.value - 1) * PAGE_SIZE + 1 : 0))
const rangeEnd = computed(() => Math.min(page.value * PAGE_SIZE, cartStore.items.length))
watch(() => cartStore.items.length, (n) => {
  // 删除/结算后总数变少时避免停在空页
  if ((page.value - 1) * PAGE_SIZE >= n) page.value = 1
})

/* ---------- 购物车常规操作 ---------- */
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

/* ---------- 收银台：购物车勾选商品结算（先成单再支付） ---------- */
const cashierOpen = ref(false)
const paySuccess = ref(false)
const paying = ref(false)
const payMethod = ref('alipay')
const payDetail = ref([])
const cashierTotal = ref(0)
const countdown = ref(0)
let countdownTimer = null

const methods = [
  { key: 'alipay', icon: 'Money', name: '支付宝', desc: '快捷支付，实时到账', bg: 'linear-gradient(135deg,#1677ff,#69b1ff)' },
  { key: 'wechat', icon: 'ChatDotRound', name: '微信支付', desc: '微信快捷支付', bg: 'linear-gradient(135deg,#07c160,#5bd98a)' },
  { key: 'balance', icon: 'Wallet', name: '平台余额', desc: '余额抵扣，无需手续费', bg: 'var(--grad-brand)' }
]

function openCashier() {
  if (cartStore.selectedPrice === 0) return
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
  cashierTotal.value = cartStore.selectedPrice
  payDetail.value = cartStore.items.filter((i) => i.checked).map((i) => ({
    name: i.name,
    qtyLabel: isPet(i) ? '1 只' : `×${i.qty}`,
    amount: i.price * i.qty
  }))
  paySuccess.value = false
  payMethod.value = 'alipay'
  cashierOpen.value = true
  countdown.value = 15 * 60
  if (countdownTimer) clearInterval(countdownTimer)
  countdownTimer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(countdownTimer)
      cashierOpen.value = false
      ElMessage.info('支付超时，请重新结算')
    }
  }, 1000)
}

async function doPay() {
  if (paying.value) return
  paying.value = true
  try {
    // 勾选商品先成单，再立即支付该单
    const items = cartStore.items
      .filter((i) => i.checked)
      .map((i) => (i.itemType === '2'
        ? { itemType: '2', petId: i.petId, goodsName: i.name, goodsImage: i.image, goodsSpec: i.spec, price: i.price, qty: 1 }
        : { itemType: '1', goodsId: i.goodsId, skuId: i.skuId, goodsName: i.name, goodsImage: i.image, goodsSpec: i.spec, price: i.price, qty: i.qty }))
    const res = await submitPetCart(items)
    const orderNo = res?.data?.orderNo
    if (orderNo) await payPetCart(orderNo, payMethod.value)
    cartStore.clear()
    paySuccess.value = true
    if (countdownTimer) clearInterval(countdownTimer)
    getOrders()
    cartStore.reloadFromServer()
    // 支付成功会生成站内通知，通知铃铛立即刷新
    window.dispatchEvent(new CustomEvent('pet-notify-refresh'))
  } catch (e) {
    ElMessage.error(e?.msg || e?.message || '支付失败，请稍后再试')
  } finally {
    paying.value = false
  }
}

onBeforeUnmount(() => {
  if (countdownTimer) clearInterval(countdownTimer)
})
</script>

<style scoped lang="scss">
// 表格骨架来自 .ui-table；这里只定义标签栏、列宽与页面特有内容（商品/订单单元、结算条、收银台）。

/* ---------- 顶部标签栏：与历史订单区同一套文本标签样式 ---------- */
.tabs {
  display: flex;
  gap: 26px;
  margin-top: 0;
  border-bottom: 1px solid var(--border-1);
  overflow-x: auto;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
}
.tab {
  position: relative;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 0 12px;
  border: 0;
  background: none;
  font: inherit;
  font-size: 14px;
  color: var(--text-3);
  cursor: pointer;
  transition: color .16s ease;
  &:hover { color: var(--text-1); }
  &.on {
    color: var(--text-1);
    font-weight: 700;
    &::after {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      bottom: -1px;
      height: 2px;
      background: var(--text-1);
    }
  }
}
.tab__n {
  font-size: 12px;
  color: var(--text-4);
  font-variant-numeric: tabular-nums;
}
.tab.on .tab__n { color: var(--brand-600); }

.cart-table {
  margin-top: 20px;

  // 首列左对齐页面边线，末列贴右，避免整表内缩
  th:first-child, td:first-child { padding-left: 0; }
  th:last-child, td:last-child { padding-right: 0; }

  // 行内带交互控件，去掉斑马纹，只保留 1px 行分割线
  tbody tr:nth-child(even) { background: transparent; }
}

// 列宽用固定值，保证各行竖直对齐
.c-check { width: 76px; }

// 定高翻页条：与表格同宽对齐，左计数右翻页（底部由结算条的 1px 上边线收尾，不再各自画线）
.cart-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 0;
  &__count { font-size: 12.5px; color: var(--text-3); font-variant-numeric: tabular-nums; }
}
.c-goods { min-width: 240px; }
.c-price { width: 110px; }
.c-qty { width: 148px; }
.c-sub { width: 116px; }
.c-op { width: 72px; }

// 商品/订单单元：72px 缩略图 + 名称/规格两行
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
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-1);
  line-height: 1.45;
}
.goods__spec {
  margin-top: 4px;
  font-size: 12.5px;
  color: var(--text-3);
}
// 单价在窄屏并入规格行（见下方媒体查询），桌面端隐藏，避免重复显示
// 分隔符「·」由 ::before 提供；规格被省略（与名称重复）时去掉分隔符
.goods__spec .unit { display: none; }
.goods__spec .unit::before { content: ' · '; }
.goods__spec .unit--solo::before { content: none; }

// 宠物行 / 订单行数量恒定，不给步进器
.qty-fixed {
  font-size: 13px;
  color: var(--text-2);
  font-variant-numeric: tabular-nums;
}

/* ============================================================
   空购物车：头部 + 两级推荐（宠物卡 / 宠物粮卡）
   —— 原「居中一句话 + 两按钮」在定高面板里只剩一个小岛，四周全空；
      改成页面头语言（标题左、行动右、1px 收口） + 两级可操作推荐，
      既补信息密度，又给「现在就挑一件」的直达路径。
   ============================================================ */
.cart-empty { display: flex; flex-direction: column; }

// 空态头图标：品牌色淡底圆底，与首页数据条的图标同一处理
.ce-ico {
  display: inline-grid; place-items: center; flex-shrink: 0;
  width: 34px; height: 34px; border-radius: 50%; background: var(--brand-50);
  svg { width: 17px; height: 17px; stroke: var(--brand-600); fill: none; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
}
.cart-empty__head .ui-title { display: flex; align-items: center; gap: 12px; }

/* ---------- 推荐分区头：标题左、入口右，1px 线收口 ---------- */
.ce-sec { margin-top: 34px; }
.ce-sec__head {
  display: flex; align-items: flex-end; justify-content: space-between; gap: 16px;
  margin-bottom: 18px; padding-bottom: 13px; border-bottom: var(--rule);
  h3 { font-size: 16px; font-weight: 700; letter-spacing: -.01em; line-height: 1.3; color: var(--text-1); }
  p { margin-top: 4px; font-size: 12.5px; color: var(--text-3); }
}
.ce-more {
  display: inline-flex; align-items: center; gap: 5px; flex-shrink: 0;
  padding: 6px 0; font-size: 13px; font-weight: 700; color: var(--brand-700);
  text-decoration: none; white-space: nowrap;
  svg { width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 2; transition: transform .16s; }
  &:hover svg { transform: translateX(3px); }
}

/* ---------- 两级推荐共用网格：auto-fill 自适应，窄屏并排两张 ---------- */
.ce-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(215px, 45%), 1fr));
  gap: 22px 14px;
  min-height: 120px;
}

/* ---------- 宠物粮小卡：与宠物卡同一套扁平语言，图片 4:3 ---------- */
.ce-food {
  display: flex; flex-direction: column; padding: 0;
  background: none; border: 0; font-family: inherit; text-align: left; cursor: pointer;
  &:hover .ce-food__thumb { box-shadow: 0 0 0 1px var(--brand-200); }
}
.ce-food__thumb {
  aspect-ratio: 4 / 3; background: var(--bg-sunken); border-radius: var(--radius-md);
  overflow: hidden; transition: box-shadow .2s;
  img { width: 100%; height: 100%; object-fit: cover; transition: transform .3s; }
  .ce-food:hover & img { transform: scale(1.04); }
}
.ce-food__body { flex: 1; display: flex; flex-direction: column; padding: 11px 2px 0; }
.ce-food__name {
  font-size: 14.5px; font-weight: 700; line-height: 1.4; color: var(--text-1);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.ce-food__spec {
  margin-top: 3px; font-size: 12px; color: var(--text-3);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
// 价格行贴卡片底：商品名长短不一时，同排卡片的价格与按钮仍对齐
.ce-food__row {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  margin-top: auto; padding-top: 11px;
}
.ce-food__price {
  font-family: var(--font-num); font-size: 18px; font-weight: 700; letter-spacing: -.01em;
  color: var(--price); font-variant-numeric: tabular-nums;
}
.ce-food__add {
  height: 30px; padding: 0 13px; border: 1px solid var(--brand-500); border-radius: var(--radius-pill);
  background: none; font: inherit; font-size: 12.5px; font-weight: 700; color: var(--brand-700);
  cursor: pointer; white-space: nowrap; transition: background .15s, color .15s;
  &:hover:not(:disabled) { background: var(--brand-500); color: #fff; }
  &:disabled { border-color: var(--border-1); color: var(--text-4); cursor: not-allowed; }
}

/* ============================================================
   结算条：常规文档流，靠 margin-top:auto 推到 .ui-page 底部（页脚黑框正上方）
   ============================================================ */
// 页面被布局拉伸占满视口时，flex 列 + auto 外边距把结算条压到内容区最底、紧贴页脚
.ui-page {
  display: flex;
  flex-direction: column;
}

// 定高面板：三个标签共用同一高度（= 购物车 5 行满页的高度），切换标签不再忽高忽低；
// 面板自身也是 flex 列，结算条在面板内继续靠 margin-top:auto 压底
.tab-panel {
  display: flex;
  flex-direction: column;
  min-height: 560px;
  // 吸收页面剩余高度，结算条才落到底部而不是停在半空（页脚已移除，没有别的收束元素）
  flex: 1;
}
// 已支付/已取消的订单区在 OrdersSection 内部用 flex 撑满面板，翻页条自行吸底

.checkout {
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 0 16px;
  border-top: 1px solid var(--text-1);
}
.checkout__left {
  display: flex;
  align-items: center;
  gap: 18px;
}
// 清空/取消所选是破坏性操作：与「全选」之间加竖线分隔并拉开间距，避免连点误触（点击后仍有二次确认）
.clear-cart {
  padding-left: 18px;
  border-left: 1px solid var(--border-1);
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
    font-weight: 700;
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
}

/* ============================================================
   收银台（弹窗内部）
   ============================================================ */
.cashier-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  .cashier-no { font-size: 12px; color: var(--text-3); }
}
.cashier-body {
  .cashier-amount {
    text-align: center;
    padding: 6px 0 18px;
    .label { display: block; font-size: 13px; color: var(--text-3); }
    .num {
      font-family: var(--font-num);
      font-size: 28px;
      font-weight: 700;
      color: var(--price);
      font-variant-numeric: tabular-nums;
    }
  }
  .pay-methods { display: flex; flex-direction: column; gap: 10px; }
  // 明细区：过高时内部滚动，不挤压支付方式与按钮
  .cashier-detail {
    max-height: 168px;
    overflow-y: auto;
    margin-bottom: 14px;
    padding: 4px 0;
    border-top: 1px dashed var(--border-1);
    border-bottom: 1px dashed var(--border-1);
    .cd-row {
      display: flex;
      align-items: baseline;
      gap: 10px;
      padding: 6px 2px;
      font-size: 13px;
    }
    .cd-name { flex: 1; min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; color: var(--text-2); }
    .cd-qty { flex-shrink: 0; font-size: 12px; color: var(--text-3); }
    .cd-amt { flex-shrink: 0; font-variant-numeric: tabular-nums; color: var(--text-1); }
  }
  .pay-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    border: 1px solid var(--border-1);
    border-radius: var(--r-3);
    cursor: pointer;
    transition: border-color .15s ease, background-color .15s ease;
    &:hover { border-color: var(--brand-300); }
    &.active { border-color: var(--brand-500); background: var(--brand-50); }
    .pm-icon {
      width: 34px;
      height: 34px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--r-2);
      font-size: 16px;
      color: #fff;
    }
    .pm-info {
      flex: 1;
      b { display: block; font-size: 14px; color: var(--text-1); }
      em { font-size: 12px; color: var(--text-3); font-style: normal; }
    }
    .pm-check { width: 18px; text-align: center; color: var(--brand-500); font-weight: 700; }
  }
  .cashier-tip {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 14px;
    padding-left: 10px;
    border-left: 2px solid var(--border-1);
    font-size: 12.5px;
    line-height: 1.6;
    color: var(--text-3);
  }
  .cashier-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 22px;
  }
}
.cashier-success {
  text-align: center;
  padding: 6px 0 4px;
  .s-icon { font-size: 46px; color: var(--success-500); }
  h3 { margin: 10px 0 4px; font-size: 16px; color: var(--text-1); }
  .s-amount {
    margin: 0;
    font-family: var(--font-num);
    font-size: 24px;
    font-weight: 700;
    color: var(--price);
    font-variant-numeric: tabular-nums;
  }
  .s-tip { margin: 8px 0 20px; font-size: 13px; line-height: 1.7; color: var(--text-3); }
}

/* ============================================================
   手机端：表格折成两行式条目（仍是一行一条 + 1px 分割线）
   ============================================================ */
@media (max-width: 768px) {
  .tabs { gap: 18px; }

  // 空态头：按钮换到下一行并三等分，避免三个按钮挤在一行点不准
  .cart-empty__head { flex-wrap: wrap; gap: 14px; }
  .ce-act { width: 100%; gap: 8px;
    .ui-btn { flex: 1; min-width: 0; padding: 0 10px; } }
  .ce-sec { margin-top: 26px; }
  .ce-grid { gap: 18px 10px; }
  // 与首页宠物粮卡一致：窄屏图片改 1:1，卡片更紧凑
  .ce-food__thumb { aspect-ratio: 1 / 1; border-radius: var(--radius-sm); }
  .ce-food__name { font-size: 14px; }
  .ce-food__price { font-size: 16px; }

  .cart-table {
    margin-top: 16px;
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
  // 窄屏不单列单价：并进规格行，第二行只留 数量 / 金额 / 操作
  // 选择器带 .cart-table 是为了压过上面 `.cart-table td { display:block }` 的优先级
  .cart-table .c-price { display: none; }
  .goods__spec .unit { display: inline; }
  // 订单号过长会把日期挤折行：超宽截断出省略号，保住「· N 件 · 日期」整体可读
  .goods__spec {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }
  .c-qty {
    order: 3;
    width: auto;
    // 与上方缩略图左缘对齐（勾选框 22px + 间距 12px）
    margin-left: 34px;
    :deep(.el-input-number) { width: 132px; }
    // 步进器加减钮加宽，保证 ≥30px 可点区域（高频操作，small 档默认太窄）
    :deep(.el-input-number__decrease),
    :deep(.el-input-number__increase) { width: 30px; }
  }
  .qty-fixed { font-size: 14px; }
  .c-sub {
    order: 4;
    width: auto;
    margin-left: auto;
    // 窄屏没有列头，给金额补上「小计」标注，数量 >1 时用户不用心算单价与小计的关系
    &::before { content: '小计'; font-size: 11px; color: var(--text-3); margin-right: 5px; }
    .ui-price { font-size: 16px; }
  }
  .c-op { order: 5; width: auto; }

  .thumb { width: 60px; height: 60px; }
  .goods { gap: 12px; }
  .goods__name { font-size: 14px; }

  // 翻页条：窄屏允许换行，计数与页码各占一行也不挤压
  .cart-foot {
    flex-wrap: wrap;
    gap: 10px;
    padding: 12px 0;
  }

  // 结算条：左右两栏压缩，价格与按钮占一行
  .checkout {
    flex-wrap: wrap;
    gap: 10px;
    padding: 12px 0;
  }
  .checkout__left { gap: 14px; }
  .checkout__right { gap: 12px; margin-left: auto; }
  .checkout__count { display: none; } // 窄屏省掉重复计数，只留合计
  .checkout__sum .ui-price { font-size: 20px; }
  // 结算主按钮触控热区加高，避免误触
  .checkout__right .ui-btn--solid { min-height: 36px; padding: 8px 22px; }
}
</style>
