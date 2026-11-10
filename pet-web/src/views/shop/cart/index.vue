<template>
  <div class="ui-page">
    <!-- 页面头：购物车只承载待结算商品，订单进度统一去「我的订单」看 -->
    <header class="ui-head">
      <div class="ui-head__main">
        <p class="ui-eyebrow">Cart</p>
        <h1 class="ui-title">购物车</h1>
        <p class="ui-sub">这里只放还没结算的商品，付款后可在「我的订单」查看进度。</p>
      </div>
      <div class="ui-head__aside">
        <span class="ui-count" v-if="cartRows.length"><b>{{ cartRows.length }}</b>项待结算</span>
        <router-link class="head-link" to="/shop/order">
          我的订单
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6"/></svg>
        </router-link>
      </div>
    </header>

    <!-- 不切标签，页面高度由内容决定：结算条始终贴在卡片底部 -->
    <div class="cart-body">
      <!-- 空态：居中一句话 + 一个主行动（对齐参考稿），下方「为你推荐」给出现在就逛的路径 -->
      <div class="cart-empty" v-if="cartRows.length === 0">
        <div class="cart-empty__hero">
          <span class="ce-ico" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M6.5 8h11l-.9 11.2a1.6 1.6 0 01-1.6 1.3H9a1.6 1.6 0 01-1.6-1.3L6.5 8z"/><path d="M9 10V6.8A3 3 0 0112 4a3 3 0 013 2.8V10"/></svg>
          </span>
          <p class="cart-empty__text">购物车还是空的，快去逛逛吧！</p>
          <!-- 未登录时登录是结算前的必经步骤，设为主操作 -->
          <div class="ce-act">
            <button v-if="!userStore.token" type="button" class="ui-btn ui-btn--solid" @click="openAuth('login')">去登录</button>
            <button type="button" class="ui-btn" :class="userStore.token ? 'ui-btn--solid' : 'ui-btn--line'" @click="$router.push('/shop/pets')">去逛在售宠物</button>
            <button type="button" class="ui-btn ui-btn--line" @click="$router.push('/shop/food')">去逛宠物粮</button>
          </div>
        </div>

        <!-- 为你推荐：在售宠物 + 宠物粮共用一个分区头，两组卡片各带一行小标注 -->
        <section class="ce-sec" v-if="recPets.length || recFood.length">
          <div class="ce-sec__head">
            <h3>为你推荐</h3>
            <div class="ce-more-group">
              <router-link class="ce-more" to="/shop/pets">
                看全部在售
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6"/></svg>
              </router-link>
              <router-link class="ce-more" to="/shop/food">
                逛宠物粮专区
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6"/></svg>
              </router-link>
            </div>
          </div>

          <template v-if="recPets.length || recLoading">
            <p class="ce-sub">在售宠物</p>
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
          </template>

          <template v-if="recFood.length">
            <p class="ce-sub">宠物粮</p>
            <div class="ce-grid">
              <article class="ce-food" v-for="g in recFood" :key="g.id" @click="$router.push({ path: '/shop/food', query: { gid: g.goodsId } })">
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
          </template>
        </section>
      </div>
      <!-- 待结算商品：内容装进白色卡片，页面的绿灰底从卡片四周透出来 -->
      <div class="cart-sheet" v-else>
          <table class="ui-table cart-table">
          <thead>
            <tr>
              <th class="c-check">
                <el-checkbox :model-value="cartAll" @change="toggleCartAll">全选</el-checkbox>
              </th>
              <th class="c-goods">商品信息</th>
              <th class="c-price align-right">单价</th>
              <th class="c-qty">数量</th>
              <th class="c-sub align-right">小计</th>
              <th class="c-op align-right">操作</th>
            </tr>
          </thead>
          <!-- 按 itemType 分组：活体与宠物粮的下单规则不同（宠物一只一条），分开成组各自勾选与小计 -->
          <tbody v-for="grp in cartGroups" :key="grp.key">
            <tr class="group-row">
              <td class="c-check">
                <el-checkbox :model-value="grp.allChecked" @change="(v) => toggleGroup(grp, v)" />
              </td>
              <td colspan="5" class="group-cell">
                <div class="group-inner">
                  <span class="group-ico" aria-hidden="true">
                    <svg viewBox="0 0 24 24"><path :d="grp.icon" /></svg>
                  </span>
                  <b class="group-name">{{ grp.label }}</b>
                  <span class="group-note">{{ grp.note }}</span>
                </div>
              </td>
            </tr>
            <tr v-for="item in grp.items" :key="item.id">
              <td class="c-check">
                <el-checkbox :model-value="item.checked" @change="(v) => cartStore.setChecked(item.id, v)" />
              </td>
              <td class="c-goods">
                <div class="goods">
                  <img :src="item.image" :alt="item.name" class="thumb" loading="lazy" />
                  <div class="goods__text">
                    <div class="goods__name">{{ item.name }}</div>
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
            <tr class="group-sum">
              <td colspan="6">
                数量小计：<b>{{ grp.qty }} {{ grp.unit }}</b>
                <i class="sep"></i>
                金额小计：<b class="ui-price ui-price--sm">¥{{ money(grp.sum) }}</b>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- 结算条：全选 + 批量操作在左，件数/合计/结算在右（对齐参考稿的底栏结构） -->
          <div class="checkout">
            <div class="checkout__left">
              <el-checkbox :model-value="cartAll" @change="toggleCartAll">全选</el-checkbox>
              <button type="button" class="ui-linkbtn ui-linkbtn--danger" @click="removeSelected">删除所选</button>
              <button type="button" class="ui-linkbtn ui-linkbtn--muted clear-cart" @click="clearCart">清空购物车</button>
            </div>
            <div class="checkout__right">
              <!-- 活体按「只」、用品按「件」分别计数：笼统加总会出现「16 件」这种错单位 -->
              <span class="checkout__count">
                已选 <b>{{ cartSelectedRows }}</b> 项
                <template v-if="cartSelectedPetQty"><i class="dot">·</i>宠物 <b>{{ cartSelectedPetQty }}</b> 只</template>
                <template v-if="cartSelectedGoodsQty"><i class="dot">·</i>商品 <b>{{ cartSelectedGoodsQty }}</b> 件</template>
              </span>
              <span class="checkout__sum">
                <i>商品金额合计</i>
                <span class="ui-price ui-price--lg">¥{{ money(cartSelectedPrice) }}</span>
              </span>
              <button type="button" class="checkout__go" :disabled="cartSelectedPrice === 0" @click="openCashier">
                结算
              </button>
            </div>
          </div>
        </div>
    </div>

    <!-- 收银台：勾选商品先成单再支付，支付完成即清空已购条目 -->
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
        <p class="s-tip">支付进度可在「我的订单」中查看</p>
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
import { getPetOverview } from '@/api/pet/petInfo'
import { listGoods } from '@/api/pet/petGoods'
import PetCard from '@/views/shop/home/PetCard.vue'
import { usePetFavorite } from '@/composables/usePetFavorite'
import { usePetRatings } from '@/composables/usePetRatings'
import { petGradient } from '@/utils/petDisplay'
import { money } from '@/utils/money'
import { adaptGoods } from '@/utils/goodsAdapter'

const userStore = useUserStore()
const cartStore = useCartStore()
const router = useRouter()
const openAuth = inject('openAuth', () => {})

// 购物车按账号绑定：登录后把服务端数据拉下来（本地条目自动合并上传），登出回到本地模式
onMounted(() => { cartStore.sync(); loadRecs() })
watch(() => userStore.token, () => { cartStore.sync() })

/* ---------- 空态推荐：宠物精选 + 宠物粮精选（均免登录，接口不可用时不摆空壳） ---------- */
const recPets = ref([])
const recFood = ref([])
const recLoading = ref(false)
// 收藏 / 评分：全站共用 composable（空态推荐卡与首页同一套口径）
const { isFav, load: loadMyFavorites, toggle: toggleFav } = usePetFavorite(openAuth)
const { rating: petRating, load: loadRatings } = usePetRatings('pet')

// 商品字段适配统一走 utils/goodsAdapter（与宠物粮专区同一口径，含 skuId/stock，加购时直接可用）

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

// itemType '2' 是宠物（旧数据没有该字段，一律按商品处理）；只用于行内徽标与数量锁定
function isPet(item) {
  return item.itemType === '2'
}

/* ---------- 选择逻辑：购物车可同时放用品与活体，各自独立勾选 ---------- */
// 购物车条目：用品（itemType='1'，可多件）+ 活体（itemType='2'，一只一条），可同单结算
const cartRows = computed(() => cartStore.items)
const cartAll = computed(() => cartRows.value.length > 0 && cartRows.value.every((i) => i.checked))

function toggleCartAll(val) {
  cartRows.value.forEach((i) => cartStore.setChecked(i.id, val))
}

const cartSelectedItems = computed(() => cartRows.value.filter((i) => i.checked))
// 已选「项」按条目数算；数量按单位拆开：活体一只一条，用品按件累加
const cartSelectedRows = computed(() => cartSelectedItems.value.length)
const cartSelectedPetQty = computed(() => cartSelectedItems.value.filter(isPet).reduce((n, i) => n + i.qty, 0))
const cartSelectedGoodsQty = computed(() => cartSelectedItems.value.filter((i) => !isPet(i)).reduce((n, i) => n + i.qty, 0))
const cartSelectedPrice = computed(() => cartSelectedItems.value.reduce((s, i) => s + i.price * i.qty, 0))

/* ---------- 分组：活体与用品下单规则不同（宠物一只一条），分组勾选、同单结算 ---------- */
const GROUP_PET = 'M12 5.5c-2 0-3.4 1-4.2 2.4-.9-.4-2.2-.2-3 .9-.9 1.3-.6 3 .3 3.9.6.5 1.5.5 2.3-.1C8.3 14.8 10 16.4 12 16.4s3.7-1.6 4.6-3.8c.8.6 1.7.6 2.3.1.9-.9 1.2-2.6.3-3.9-.8-1.1-2.1-1.3-3-.9C15.4 6.5 14 5.5 12 5.5zM9.4 17.4c-1.4 0-2.6.9-2.6 2.1 0 1.2 1.2 2.1 2.6 2.1s2.6-.9 2.6-2.1c0-1.2-1.2-2.1-2.6-2.1zm5.2 0c-1.4 0-2.6.9-2.6 2.1 0 1.2 1.2 2.1 2.6 2.1s2.6-.9 2.6-2.1c0-1.2-1.2-2.1-2.6-2.1z'
const GROUP_FOOD = 'M6.5 8h11l-.9 11.2a1.6 1.6 0 01-1.6 1.3H9a1.6 1.6 0 01-1.6-1.3L6.5 8zM9 10V6.8A3 3 0 0112 4a3 3 0 013 2.8V10'

const cartGroups = computed(() => {
  const pets = cartRows.value.filter(isPet)
  const goods = cartRows.value.filter((i) => !isPet(i))
  const build = (key, label, note, icon, unit, items) => ({
    key, label, note, icon, unit, items,
    allChecked: items.every((i) => i.checked),
    qty: items.reduce((n, i) => n + i.qty, 0),
    sum: items.reduce((s, i) => s + i.price * i.qty, 0)
  })
  const out = []
  // 宠物按「只」、用品按「件」：分组小计各用各的单位
  if (pets.length) out.push(build('pet', '活体宠物', '一只一条，结账后到店接宠', GROUP_PET, '只', pets))
  if (goods.length) out.push(build('goods', '宠物用品', '可与宠物一起结算', GROUP_FOOD, '件', goods))
  return out
})

function toggleGroup(grp, val) {
  grp.items.forEach((i) => cartStore.setChecked(i.id, val))
}

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

/* 批量删除所选：与单行删除同一确认口径，删前必须勾选 */
function removeSelected() {
  const picked = cartRows.value.filter((i) => i.checked)
  if (!picked.length) {
    ElMessage.info('请先勾选要删除的商品')
    return
  }
  ElMessageBox.confirm(`确定删除所选的 ${picked.length} 项商品吗？`, '提示', { type: 'warning' })
    .then(() => {
      picked.forEach((i) => cartStore.removeItem(i.id))
      ElMessage.success('已删除所选商品')
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
  if (cartSelectedPrice.value === 0) return
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
  cashierTotal.value = cartSelectedPrice.value
  payDetail.value = cartSelectedItems.value.map((i) => ({
    name: i.name,
    qtyLabel: isPet(i) ? '1 只' : `×${i.qty}`,
    amount: i.price * i.qty
  }))
  paySuccess.value = false
  payMethod.value = 'alipay'
  cashierOpen.value = true
  startCountdown()
}

// 15 分钟支付倒计时，超时自动关窗
function startCountdown() {
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
    // 勾选商品先成单，再立即支付该单（用品与活体可同单，活体由服务端锁宠）
    const items = cartSelectedItems.value.map((i) => (isPet(i)
      ? { itemType: '2', petId: i.petId, goodsName: i.name, goodsImage: i.image, goodsSpec: i.spec, price: i.price, qty: 1 }
      : { itemType: '1', goodsId: i.goodsId, skuId: i.skuId, goodsName: i.name, goodsImage: i.image, goodsSpec: i.spec, price: i.price, qty: i.qty }))
    const res = await submitPetCart(items)
    const orderNo = res?.data?.orderNo
    if (orderNo) await payPetCart(orderNo, payMethod.value)
    // 清空已购条目：先等服务端删除完成再回填，避免 GET 抢在 DELETE 前把旧条目刷回来
    await cartStore.clearAfterCheckout()
    paySuccess.value = true
    if (countdownTimer) clearInterval(countdownTimer)
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
// 表格骨架来自 .ui-table；页头来自 flat.scss 的 .ui-head 基元。
// 这里只定义列宽与页面特有内容（商品单元、结算条、收银台）。

/* ---------- 页面背景：顶部一层品牌色渐变洗，压住大面积白底的刺眼感 ---------- */
.ui-page {
  position: relative;
  background-color: var(--bg-page);
  background-image: linear-gradient(180deg, var(--brand-50) 0%, rgba(255, 255, 255, 0) 340px);
  background-repeat: no-repeat;
}

/* ---------- 内容卡片：表格 + 结算条同卡，页底色从四周透出 ---------- */
.cart-sheet {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-top: 20px;
  background: var(--bg-card);
  border: 1px solid var(--border-1);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  overflow: hidden; // 圆角裁掉首尾行贴边
}

/* ---------- 页面头右侧：回到「我的订单」 ---------- */
.head-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: var(--fs-4);
  font-weight: 700;
  color: var(--brand-700);
  text-decoration: none;
  white-space: nowrap;
  svg { width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; transition: transform .16s; }
  &:hover svg { transform: translateX(3px); }
}

.cart-table {
  // 卡片内所有列统一留 12px 内边距（不再首末列贴 0），内容与卡片边缘保持呼吸
  th:first-child, td:first-child { padding-left: 16px; }
  th:last-child, td:last-child { padding-right: 16px; }

  // 恢复斑马纹与悬停底色（分组行除外）：整页纯白看久了累，行与行之间给一点底色节奏
  tbody tr:nth-child(even) { background: var(--bg-zebra); }
  tbody tr:not(.group-row):not(.group-sum):hover { background: var(--bg-row-hover); }
}

// 列宽用固定值，保证各行竖直对齐
.c-check { width: 76px; }

.c-goods { min-width: 240px; }
.c-price { width: 110px; }
.c-qty { width: 148px; }
.c-sub { width: 116px; }
.c-op { width: 72px; }

/* ---------- 分组行（对齐参考稿的店铺分组头）：组勾选 + 图标 + 组名 + 说明 ---------- */
.group-row td {
  padding-top: 14px; padding-bottom: 10px;
  border-bottom: var(--rule-soft);
  // 组头整行铺一层品牌浅底：一眼看出「这是一组的开始」，也打断纯白
  background: var(--brand-50);
}
.group-cell { padding-right: 0; }
// flex 放在内层 div 上：td 直接改 display 会脱离表格布局，破坏 colspan 对齐
.group-inner { display: flex; align-items: center; gap: 8px; min-width: 0; }
.group-ico {
  display: inline-grid; place-items: center; flex-shrink: 0;
  width: 26px; height: 26px; border-radius: 50%; background: var(--brand-50);
  svg { width: 15px; height: 15px; fill: var(--brand-600); }
}
.group-name { font-size: var(--fs-5); font-weight: 700; color: var(--text-1); }
.group-note { font-size: var(--fs-3); color: var(--text-3); }

/* ---------- 组小计行：右对齐，与本组商品行之间留一条 1px 分割线 ---------- */
.group-sum td {
  padding: 10px 0 14px;
  border-bottom: var(--rule);
  text-align: right;
  font-size: var(--fs-4);
  color: var(--text-3);
  b { font-weight: 700; color: var(--text-1); font-variant-numeric: tabular-nums; }
  .sep { display: inline-block; width: 1px; height: 12px; margin: 0 16px; background: var(--border-1); vertical-align: -1px; }
}

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
  font-size: var(--fs-5);
  font-weight: 700;
  color: var(--text-1);
  line-height: 1.45;
}
.goods__spec {
  margin-top: 4px;
  font-size: var(--fs-3);
  color: var(--text-3);
}
// 单价在窄屏并入规格行（见下方媒体查询），桌面端隐藏，避免重复显示
// 分隔符「·」由 ::before 提供；规格被省略（与名称重复）时去掉分隔符
.goods__spec .unit { display: none; }
.goods__spec .unit::before { content: ' · '; }
.goods__spec .unit--solo::before { content: none; }

// 宠物行 / 订单行数量恒定，不给步进器
.qty-fixed {
  font-size: var(--fs-4);
  color: var(--text-2);
  font-variant-numeric: tabular-nums;
}

/* ============================================================
   空购物车：居中一句话 + 主行动（对齐参考稿），下方「为你推荐」
   ============================================================ */
.cart-empty { display: flex; flex-direction: column; }

.cart-empty__hero {
  display: flex; flex-direction: column; align-items: center; gap: 14px;
  padding: 56px 0 8px; text-align: center;
}
// 空态头图标：品牌色淡底圆底，与首页数据条的图标同一处理
.ce-ico {
  display: inline-grid; place-items: center; flex-shrink: 0;
  width: 44px; height: 44px; border-radius: 50%; background: var(--brand-50);
  svg { width: 21px; height: 21px; stroke: var(--brand-600); fill: none; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
}
.cart-empty__text { margin: 0; font-size: var(--fs-6); font-weight: 700; color: var(--text-1); }
.ce-act { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }

/* ---------- 推荐分区头：标题左、入口右，1px 线收口 ---------- */
.ce-sec { margin-top: 44px; }
.ce-sec__head {
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  margin-bottom: 18px; padding-bottom: 13px; border-bottom: var(--rule);
  h3 { font-size: var(--fs-6); font-weight: 700; letter-spacing: -.01em; line-height: 1.3; color: var(--text-1); }
}
.ce-more-group { display: flex; align-items: center; gap: 20px; }
.ce-more {
  display: inline-flex; align-items: center; gap: 5px; flex-shrink: 0;
  padding: 6px 0; font-size: var(--fs-4); font-weight: 700; color: var(--brand-700);
  text-decoration: none; white-space: nowrap;
  svg { width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 2; transition: transform .16s; }
  &:hover svg { transform: translateX(3px); }
}
.ce-sub { margin: 16px 0 10px; font-size: var(--fs-3); font-weight: 700; color: var(--text-3); }
.ce-sec__head + .ce-sub { margin-top: 0; }

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
  font-size: var(--fs-5); font-weight: 700; line-height: 1.4; color: var(--text-1);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.ce-food__spec {
  margin-top: 3px; font-size: var(--fs-2); color: var(--text-3);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
// 价格行贴卡片底：商品名长短不一时，同排卡片的价格与按钮仍对齐
.ce-food__row {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  margin-top: auto; padding-top: 11px;
}
.ce-food__price {
  font-family: var(--font-num); font-size: var(--fs-7); font-weight: 700; letter-spacing: -.01em;
  color: var(--price); font-variant-numeric: tabular-nums;
}
.ce-food__add {
  height: 30px; padding: 0 13px; border: 1px solid var(--brand-500); border-radius: var(--radius-pill);
  background: none; font: inherit; font-size: var(--fs-3); font-weight: 700; color: var(--brand-700);
  cursor: pointer; white-space: nowrap; transition: background .15s, color .15s;
  &:hover:not(:disabled) { background: var(--brand-500); color: var(--on-accent); }
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

// 内容区：flex 列吸收页面剩余高度，列表装不满时结算条仍压在卡片底部
.cart-body {
  display: flex;
  flex-direction: column;
  min-height: 560px;
  flex: 1;
}

.checkout {
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px 16px;
  border-top: var(--rule);
  // 结算条铺一层极浅品牌底：与表格区拉开层次，金额与按钮也更聚焦
  background: rgb(var(--brand-500-rgb) / .04);
}
.checkout__left {
  display: flex;
  align-items: center;
  gap: 18px;
}
// 清空/删除所选是破坏性操作：与「全选」之间留间距，避免连点误触（点击后仍有二次确认）
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
  font-size: var(--fs-4);
  color: var(--text-3);
  b {
    margin: 0 2px;
    font-weight: 700;
    color: var(--text-1);
    font-variant-numeric: tabular-nums;
  }
  // 「·」只作分隔，不与数字争夺注意力
  .dot {
    margin: 0 6px;
    font-style: normal;
    color: var(--text-4);
  }
}
.checkout__sum {
  display: flex;
  align-items: baseline;
  gap: 8px;
  i {
    font-style: normal;
    font-size: var(--fs-4);
    color: var(--text-3);
  }
}
// 结算主按钮：块状加大（参考稿的底栏大按钮），禁用时降饱和度而不是变灰
.checkout__go {
  min-width: 112px;
  height: 46px;
  padding: 0 30px;
  border: 0;
  border-radius: var(--radius-sm);
  background: var(--brand-600);
  color: var(--on-accent);
  font: inherit;
  font-size: var(--fs-6);
  font-weight: 700;
  letter-spacing: .04em;
  cursor: pointer;
  transition: background .15s, transform .1s;
  &:hover:not(:disabled) { background: var(--brand-700); }
  &:active:not(:disabled) { transform: translateY(1px); }
  &:disabled { background: var(--brand-200); cursor: not-allowed; }
}

/* ============================================================
   收银台（弹窗内部）
   ============================================================ */
.cashier-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  .cashier-no { font-size: var(--fs-2); color: var(--text-3); }
}
.cashier-body {
  .cashier-amount {
    text-align: center;
    padding: 6px 0 18px;
    .label { display: block; font-size: var(--fs-4); color: var(--text-3); }
    .num {
      font-family: var(--font-num);
      font-size: var(--fs-10);
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
      font-size: var(--fs-4);
    }
    .cd-name { flex: 1; min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; color: var(--text-2); }
    .cd-qty { flex-shrink: 0; font-size: var(--fs-2); color: var(--text-3); }
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
      font-size: var(--fs-6);
      color: var(--on-accent);
    }
    .pm-info {
      flex: 1;
      b { display: block; font-size: var(--fs-5); color: var(--text-1); }
      em { font-size: var(--fs-2); color: var(--text-3); font-style: normal; }
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
    font-size: var(--fs-3);
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
  h3 { margin: 10px 0 4px; font-size: var(--fs-6); color: var(--text-1); }
  .s-amount {
    margin: 0;
    font-family: var(--font-num);
    font-size: var(--fs-9);
    font-weight: 700;
    color: var(--price);
    font-variant-numeric: tabular-nums;
  }
  .s-tip { margin: 8px 0 20px; font-size: var(--fs-4); line-height: 1.7; color: var(--text-3); }
}

/* ============================================================
   手机端：表格折成两行式条目（仍是一行一条 + 1px 分割线）
   ============================================================ */
@media (max-width: 768px) {
  // 空态：居中排布天然适配窄屏，只压上下留白；按钮换行并三等分，避免挤在一行点不准
  .cart-empty__hero { padding: 36px 0 4px; gap: 12px; }
  .ce-act { width: 100%; gap: 8px;
    .ui-btn { flex: 1; min-width: 0; padding: 0 10px; } }
  .ce-sec { margin-top: 28px; }
  .ce-more-group { gap: 14px; }
  .ce-grid { gap: 18px 10px; }
  // 与首页宠物粮卡一致：窄屏图片改 1:1，卡片更紧凑
  .ce-food__thumb { aspect-ratio: 1 / 1; border-radius: var(--radius-sm); }
  .ce-food__name { font-size: var(--fs-5); }
  .ce-food__price { font-size: var(--fs-6); }

  .cart-sheet { margin-top: 14px; }

  .cart-table {
    thead { display: none; }
    tbody, tr, td { display: block; }
    tbody tr {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px 12px;
      padding: 14px 12px;
      border-bottom: var(--rule-soft);
    }
    td { border: 0; padding: 0; }
  }

  // 组头 / 组小计在窄屏仍保持整行：组头横排，小计单独一行靠右
  .cart-table tr.group-row { padding: 14px 0 8px; }
  .cart-table .group-sum td { text-align: right; }

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
  .qty-fixed { font-size: var(--fs-5); }
  .c-sub {
    order: 4;
    width: auto;
    margin-left: auto;
    // 窄屏没有列头，给金额补上「小计」标注，数量 >1 时用户不用心算单价与小计的关系
    &::before { content: '小计'; font-size: var(--fs-1); color: var(--text-3); margin-right: 5px; }
    .ui-price { font-size: var(--fs-6); }
  }
  .c-op { order: 5; width: auto; }

  .thumb { width: 60px; height: 60px; }
  .goods { gap: 12px; }
  .goods__name { font-size: var(--fs-5); }

  // 结算条：左栏操作一行，右栏计数独占一行、合计与结算并排
  .checkout {
    flex-wrap: wrap;
    gap: 10px;
    padding: 12px;
  }
  .checkout__left { gap: 14px; }
  .checkout__right {
    flex: 1 1 100%;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 8px 12px;
    margin-left: 0;
  }
  // 窄屏也保留「按单位分开计数」：活体件数混算最容易被误读
  .checkout__count { flex: 1 1 100%; order: -1; font-size: var(--fs-3); }
  .checkout__sum .ui-price { font-size: var(--fs-8); }
  // 结算主按钮触控热区加高，避免误触
  .checkout__go { min-width: 0; min-height: 40px; padding: 8px 22px; font-size: var(--fs-5); }
}
</style>
