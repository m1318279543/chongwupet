<template>
  <div class="ui-page ui-page--lg food-page">
    <!-- 返回首页：从首页「进入宠物粮专区」过来后，页面内给一个明确的回程入口 -->
    <button type="button" class="ui-back" @click="router.push('/shop/home')">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>
      返回首页
    </button>
    <!-- 页面头：与其他前台页同一套 ui-head 语言，1px 线收口 -->
    <header class="ui-head">
      <div class="ui-head__main">
        <p class="ui-eyebrow">Pet Food</p>
        <h1 class="ui-title">宠物粮 · 科学喂养每一餐</h1>
        <p class="ui-sub">覆盖店内全部宠物品类，从主粮到营养补充，按品类挑对口好粮</p>
      </div>
      <div class="ui-head__aside">
        <span class="ui-count"><b>{{ filtered.length }}</b>款在售</span>
      </div>
    </header>

    <nav class="cat-tabs" aria-label="按品类筛选">
      <!-- 类目随商品接口派生（foodData 只提供名称/配色元数据），后台上下架新品类前台自动跟随 -->
      <button v-for="c in categories" :key="c.id"
        class="cat-tab" :class="{ active: active === c.id }"
        @click="active = c.id">
        <i class="dot" :style="{ background: c.color }"></i>{{ c.name }}
      </button>
    </nav>

    <section class="grid">
      <article class="card" v-for="(p, i) in filtered" :key="i" @click="openDetail(p)">
        <div class="thumb">
          <img :src="p.image" :alt="p.name" loading="lazy" />
        </div>
        <div class="body">
          <div class="name">{{ p.name }}</div>
          <div class="meta">
            <span class="spec">{{ p.spec }}</span>
            <el-tag v-if="p.stock !== undefined" size="small" :type="p.stock > 10 ? 'info' : (p.stock > 0 ? 'warning' : 'danger')" effect="plain">
              {{ p.stock > 0 ? '库存 ' + p.stock : '暂时缺货' }}
            </el-tag>
          </div>
          <div class="desc">{{ p.desc }}</div>
          <div class="buy">
            <div class="price-row">
              <span class="rating-tag" v-if="foodRating(p.fid)"><el-icon><Star /></el-icon>{{ foodRating(p.fid).avg }}（{{ foodRating(p.fid).count }}）</span>
              <div class="price">¥{{ p.price }}<span class="unit">起</span></div>
            </div>
            <div class="act-row">
              <button type="button" class="quick-cart" :disabled="p.stock === 0"
                :title="p.stock === 0 ? '暂时缺货' : '加入购物车'"
                @click.stop="addToCart(p)">
                <el-icon><ShoppingCart /></el-icon>加入购物车
              </button>
              <span class="go">详情<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></span>
            </div>
          </div>
        </div>
      </article>
    </section>

    <section class="tip">
      <h3>换粮小贴士</h3>
      <p>
        新粮请按「7 日过渡法」逐步替换旧粮（旧 75% → 50% → 25% → 全换新），观察排便与食欲，减少肠胃应激。
        具体喂量参考包装建议并结合宠物体型调整；水族、爬行类请配合对应温控与水质管理。
      </p>
    </section>

    <!-- 宠物粮详情弹窗：与首页「宠物粮精选」共用同一组件 -->
    <FoodDetailDialog v-model="detailVisible" :goods-id="detail?.goodsId" :fallback="detail" @auth="openAuth" />
  </div>
</template>

<script setup>
import { ref, computed, inject, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import { FOOD_CATEGORIES, adaptGoods, loadAllGoods } from './foodShared.js'
import { useCartStore } from '@/store/modules/cart'
import FoodDetailDialog from '@/components/FoodDetailDialog/index.vue'
import { commentStatGroup } from '@/api/pet/petComment'

const cartStore = useCartStore()
const route = useRoute()
const router = useRouter()
const openAuth = inject('openAuth', () => {})  // 未登录触发顶栏登录对话框

const active = ref('cat')

// 商品目录来自后端（价格与库存都由后台维护），接口不可用时退回静态数据兜底
const goodsList = ref([])

async function loadGoods() {
  goodsList.value = await loadAllGoods()
}

const filtered = computed(() => goodsList.value.filter(p => p.cat === active.value))

// 类目清单：随商品数据派生（按 FOOD_CATEGORIES 元数据顺序排，出现新 cat 值则追加在末尾）
const CAT_META = Object.fromEntries(FOOD_CATEGORIES.map(c => [c.id, c]))
const categories = computed(() => {
  const seen = []
  for (const p of goodsList.value) {
    if (p.cat && !seen.includes(p.cat)) seen.push(p.cat)
  }
  // 元数据顺序优先，未知类目兜底追加
  const ordered = [
    ...FOOD_CATEGORIES.filter(c => seen.includes(c.id)),
    ...seen.filter(id => !CAT_META[id]).map(id => ({ id, name: id, color: '#9aa79f' }))
  ]
  return ordered
})
watch(categories, (list) => {
  if (list.length && !list.some(c => c.id === active.value)) active.value = list[0].id
})

// 详情弹窗
// 评分角标：fid -> {avg,count}
const ratingMap = ref({})
function foodRating(fid) {
  const r = ratingMap.value[fid]
  return r && Number(r.count) > 0 ? r : null
}
async function loadRatings() {
  try {
    const res = await commentStatGroup('food')
    const m = {}
    for (const row of res.data || []) m[row.petId] = row
    ratingMap.value = m
  } catch (e) { /* 静默 */ }
}
onMounted(() => {
  loadRatings()
  loadGoods().then(openFromQuery)
})

const detailVisible = ref(false)
const detail = ref(null)
function openDetail(p) {
  detail.value = p
  detailVisible.value = true
  // URL 带上 gid：首页卡片「详情」、分享链接都能直达这款粮
  if (String(route.query.gid || '') !== String(p.goodsId)) {
    router.replace({ query: { ...route.query, gid: p.goodsId } })
  }
}
// 关闭弹窗时清掉 gid，刷新页面不再莫名弹出
watch(detailVisible, (v) => {
  if (!v && route.query.gid) {
    const q = { ...route.query }
    delete q.gid
    router.replace({ query: q })
  }
})
// /shop/food?gid=<goodsId>：目录加载完直开对应宠物粮详情
function openFromQuery() {
  const gid = Number(route.query.gid)
  if (!gid) return
  const hit = goodsList.value.find((g) => Number(g.goodsId) === gid)
  if (hit) openDetail(hit)
}
watch(() => route.query.gid, () => {
  if (goodsList.value.length) openFromQuery()
})

// 加入购物车：写入 store（持久化）
function addToCart(p) {
  if (p.stock === 0) {
    ElMessage.warning('该商品暂时缺货')
    return
  }
  cartStore.addItem(p)
  ElMessage.success(`已将「${p.name}」加入购物车`)
}
</script>

<style scoped lang="scss">
.food-page { padding-top: 40px; }
/* 页头复用 ui-head（自带 1px 收口线），这里只控制筛选行与列表的间距 */
.cat-tabs { display: flex; flex-wrap: wrap; gap: 8px; margin: 26px 0 24px; }
.cat-tab {
  display: inline-flex; align-items: center; gap: 7px;
  height: 36px; padding: 0 15px; border: 1px solid var(--border-1); background: var(--bg-card);
  border-radius: var(--radius-pill); cursor: pointer; font-size: 13.5px; color: var(--text-2);
  font-family: inherit; transition: all .16s;
  .dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
  &:hover { border-color: var(--brand-200); color: var(--brand-700); background: var(--brand-50); }
  &.active { background: var(--brand-600); border-color: var(--brand-600); color: #fff; font-weight: 600;
    .dot { background: rgba(255, 255, 255, .75) !important; } }
}

/* 网格：与首页宠物卡同一套扁平语言——无卡壳，靠图片圆角与 hover 细描边 */
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(260px, 100%), 1fr)); gap: 26px 20px; }
.act-row { display: flex; align-items: center; gap: 10px; }
.quick-cart {
  display: inline-flex; align-items: center; justify-content: center; gap: 5px;
  flex: 1; white-space: nowrap;
  height: 32px; padding: 0 12px; border: 1px solid var(--brand-200);
  border-radius: var(--radius-pill); background: var(--bg-card);
  font-size: 12.5px; font-weight: 600; color: var(--brand-700); cursor: pointer;
  transition: all .16s; font-family: inherit;
  &:hover { background: var(--brand-50); border-color: var(--brand-600); }
  &:disabled { opacity: .5; cursor: not-allowed; }
}

.card {
  background: none; border: 0; cursor: pointer; text-align: left;
  &:hover .thumb { box-shadow: 0 0 0 1px var(--brand-200); }
  .thumb {
    position: relative; height: 200px; background: var(--bg-sunken);
    border-radius: var(--radius-md); overflow: hidden;
    display: flex; align-items: center; justify-content: center;
    transition: box-shadow .2s;
    img { width: 100%; height: 100%; object-fit: cover; transition: transform .3s; }
    &:hover img { transform: scale(1.05); }
  }
  .body { padding: 12px 2px 0; }
  .name { font-size: 15.5px; font-weight: 600; color: var(--text-1); margin-bottom: 6px; }
  .meta { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
  .spec { font-size: 13px; color: var(--text-3); }
  .desc { font-size: 13px; color: var(--text-2); line-height: 1.6; min-height: 42px; margin-bottom: 10px; }
  /* 底部购买区：评分+价格一行、按钮独立一行，任意卡宽都不挤压换行 */
  .buy {
    padding-top: 10px; border-top: var(--rule-soft);
    display: flex; flex-direction: column; gap: 9px;
  }
  .price-row { display: flex; align-items: center; gap: 10px; min-height: 24px; }
  .price { color: var(--price); font-size: 19px; font-weight: 700; margin-left: auto;
    white-space: nowrap;
    .unit { font-size: 12px; color: var(--text-3); font-weight: 400; margin-left: 2px; }
  }
  .go { display: inline-flex; align-items: center; gap: 3px; font-size: 12.5px; font-weight: 600;
    color: var(--text-3); transition: color .16s; flex-shrink: 0; white-space: nowrap;
    svg { width: 12px; height: 12px; stroke: currentColor; fill: none; stroke-width: 2; }
    .card:hover & { color: var(--brand-700); }
  }
}
.rating-tag { font-size: 12px; color: var(--brand-700); background: var(--brand-50); border-radius: var(--radius-pill);
  padding: 2px 8px; white-space: nowrap; flex-shrink: 0; }

/* 换粮贴士：去底色面板，改 1px 顶线 + 标题承接 */
.tip {
  margin-top: 48px; padding-top: 24px; border-top: var(--rule);
  h3 { margin: 0 0 8px; color: var(--text-1); font-size: 16px; }
  p { margin: 0; color: var(--text-2); font-size: 14px; line-height: 1.7; }
}

/* 详情弹窗样式已抽到共享组件 components/FoodDetailDialog */
@media (max-width: 768px) {
  /* 手机端：两列小卡，图片等比（1:1），一屏可见多款 */
  .food-page { padding: 24px 12px 60px; }
  .cat-tabs { gap: 8px; margin: 18px 0 16px; }
  .cat-tab { height: 32px; padding: 0 12px; font-size: 13px; }
  .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px 10px; }
  .card {
    .thumb { height: auto; aspect-ratio: 1 / 1; border-radius: var(--radius-sm); }
    .body { padding: 9px 1px 0; }
    .name { font-size: 13px; margin-bottom: 4px; }
    .meta { margin-bottom: 4px;
      .spec { font-size: 12px; }
    }
    .desc { display: none; }   /* 详情弹窗里有完整简介，列表卡只留名称规格价格 */
    .buy { gap: 7px; padding-top: 8px; }
    .price-row { gap: 6px; }
  .rating-tag { font-size: 11px; padding: 1px 6px; }
  .price { font-size: 15px;
      .unit { font-size: 11px; }
    }
  .go { display: none; }
  }
  .tip { margin-top: 32px; padding-top: 18px;
    h3 { font-size: 14px; }
    p { font-size: 13px; }
  }
}
</style>
