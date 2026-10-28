<template>
  <div class="ui-page ui-page--lg food-page">
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
      <!-- 默认「全部」：每品类只有 2 款粮，若一进页面就锁在单个品类，首屏只有两款、下半屏全空 -->
      <button type="button"
        class="cat-tab" :class="{ active: active === 'all' }"
        @click="active = 'all'">
        <i class="dot" style="background: var(--text-4)"></i>全部
      </button>
      <!-- 类目随商品接口派生（foodData 只提供名称/配色元数据），后台上下架新品类前台自动跟随 -->
      <button v-for="c in categories" :key="c.id"
        class="cat-tab" :class="{ active: active === c.id }"
        @click="active = c.id">
        <i class="dot" :style="{ background: c.color }"></i>{{ c.name }}
      </button>
    </nav>

    <section class="grid" :class="{ 'grid--sparse': filtered.length > 0 && filtered.length <= 3 }">
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
          <div class="price-row">
            <span class="rating-tag" v-if="foodRating(p.fid)"><el-icon><Star /></el-icon>{{ foodRating(p.fid).avg }}（{{ foodRating(p.fid).count }}）</span>
            <div class="price">¥{{ money(p.price) }}<span class="unit">起</span></div>
            <span class="go">详情<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></span>
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

    <!-- 宠物粮详情弹窗 -->
    <el-dialog v-model="detailVisible" width="760px" top="6vh" class="food-detail-dialog" :show-close="true">
      <div class="food-detail-scroll" v-if="detail">
      <div class="detail" v-if="detail">
        <div class="detail-left">
          <img :src="detail.image" :alt="detail.name" />
        </div>
        <div class="detail-right">
          <div class="detail-cat">{{ currentCat.name }}专区</div>
          <h2 class="detail-name">{{ detail.name }}</h2>
          <div class="detail-price">¥{{ money(detail.price) }}<span class="unit">起</span></div>
          <div class="detail-tags">
            <el-tag v-for="t in detail.tags" :key="t" size="small" type="warning" effect="plain">{{ t }}</el-tag>
          </div>
          <ul class="detail-list">
            <li><span class="k">规格</span><span class="v">{{ detail.spec }}</span></li>
            <li><span class="k">适用阶段</span><span class="v">{{ detail.stage }}</span></li>
            <li><span class="k">营养指标</span><span class="v">{{ detail.nutrition }}</span></li>
            <li><span class="k">商品简介</span><span class="v">{{ detail.desc }}</span></li>
            <li><span class="k">喂食建议</span><span class="v">{{ detail.feeding }}</span></li>
            <li><span class="k">储存方式</span><span class="v">{{ detail.storage }}</span></li>
          </ul>
          <div class="detail-actions">
            <el-button type="primary" size="large" round :disabled="detail && detail.stock === 0" @click="addToCart(detail)">
              {{ detail && detail.stock === 0 ? '暂时缺货' : '加入购物车' }}
            </el-button>
            <span class="stock-hint" v-if="detail">
              {{ detail.stock > 0 ? '现货 ' + detail.stock + ' 件' : '补货中，可先咨询客服' }}
            </span>
          </div>
        </div>
      </div>
      <!-- 点赞 + 评论区 -->
      <div class="food-social">
        <PetSocial :pet-id="detail.fid" target-type="food" @auth="openAuth" />
      </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, inject, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { FOOD_CATEGORIES, FOOD_LIST } from './foodData.js'
import { listGoods } from '@/api/pet/petGoods'
import { useCartStore } from '@/store/modules/cart'
import PetSocial from '@/components/PetSocial/index.vue'
import { commentStatGroup } from '@/api/pet/petComment'
import { money } from '@/utils/money'

const cartStore = useCartStore()
const openAuth = inject('openAuth', () => {})  // 未登录触发顶栏登录对话框

const active = ref('all')

// 商品目录来自后端（价格与库存都由后台维护），接口不可用时退回静态数据兜底
const goodsList = ref([])
const fidByCode = {}
FOOD_LIST.forEach((f) => { fidByCode[f.id] = f.fid })

function adaptGoods(g) {
  const fallback = FOOD_LIST.find((f) => f.id === g.goodsCode) || {}
  return {
    id: g.goodsCode,
    goodsId: g.goodsId,
    skuId: g.skus && g.skus.length ? g.skus[0].skuId : null,
    fid: fallback.fid || fidByCode[g.goodsCode],
    cat: g.cat,
    image: g.image,
    name: g.goodsName,
    spec: g.spec,
    price: Number(g.price),
    stock: g.stock == null ? 0 : Number(g.stock),
    stage: g.stage,
    desc: g.description,
    tags: g.tagList || [],
    nutrition: g.nutrition,
    feeding: g.feeding,
    storage: g.storage
  }
}

async function loadGoods(cat = active.value) {
  // all 时按全量拉，否则按品类服务端筛选
  const query = { status: '0', pageNum: 1, pageSize: 50 }
  if (cat !== 'all') query.cat = cat
  try {
    const res = await listGoods(query)
    const rows = res.rows || []
    goodsList.value = rows.length ? rows.map(adaptGoods) : FOOD_LIST.filter(f => cat === 'all' || f.cat === cat)
  } catch (e) {
    goodsList.value = FOOD_LIST.filter(f => cat === 'all' || f.cat === cat)
  }
}

const filtered = computed(() =>
  active.value === 'all' ? goodsList.value : goodsList.value.filter(p => p.cat === active.value)
)

// 类目用固定元数据（与后台 pet_goods.cat 词表一致），不再从全量商品里派生
const CAT_META = Object.fromEntries(FOOD_CATEGORIES.map(c => [c.id, c]))
const categories = computed(() => FOOD_CATEGORIES)
watch(active, () => loadGoods())

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
  loadGoods()
})

const detailVisible = ref(false)
const detail = ref(null)
const currentCat = computed(() => categories.value.find(c => c.id === detail.value?.cat) || {})
function openDetail(p) {
  detail.value = p
  detailVisible.value = true
}

// 加入购物车：写入 store（持久化）
function addToCart(p) {
  if (p.stock === 0) {
    ElMessage.warning('该商品暂时缺货')
    return
  }
  cartStore.addItem(p)
  ElMessage.success({ message: `已将「${p.name}」加入购物车`, duration: 1500 })
}
</script>

<style scoped lang="scss">
.stock-hint { margin-left: 12px; font-size: 12px; color: var(--text-3); }

.food-page { padding-top: 40px; }
/* 页头复用 ui-head（自带 1px 收口线），这里只控制筛选行与列表的间距 */
.cat-tabs { display: flex; flex-wrap: wrap; gap: 8px; margin: 26px 0 24px; }
.cat-tab {
  display: inline-flex; align-items: center; gap: 7px;
  height: 36px; padding: 0 15px; border: 1px solid var(--border-1); background: var(--bg-card);
  border-radius: var(--radius-pill); cursor: pointer; font-size: 13px; color: var(--text-2);
  font-family: inherit; transition: all .16s;
  .dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
  &:hover { border-color: var(--brand-200); color: var(--brand-700); background: var(--brand-50); }
  &.active { background: var(--brand-600); border-color: var(--brand-600); color: #fff; font-weight: 700;
    .dot { background: rgba(255, 255, 255, .75) !important; } }
}

/* 网格：与首页宠物卡同一套扁平语言——无卡壳，靠图片圆角与 hover 细描边 */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(250px, 45%), 1fr));
  gap: 26px 20px;
}
/* 单品类的 2 款并排成一行：竖卡 + 16:10 图。
   单列长条会摊在 1200px 宽里右侧全空；纯竖卡 4:3 又会把图撑到 440 高、页面拉长。 */
.grid--sparse {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 28px 24px;

  .thumb { aspect-ratio: 16 / 10; }
}
.card {
  background: none; border: 0; cursor: pointer; text-align: left;
  &:hover .thumb { box-shadow: 0 0 0 1px var(--brand-200); }
  .thumb {
    position: relative; aspect-ratio: 4 / 3; background: var(--bg-sunken);
    border-radius: var(--radius-md); overflow: hidden;
    display: flex; align-items: center; justify-content: center;
    transition: box-shadow .2s;
    img { width: 100%; height: 100%; object-fit: cover; transition: transform .3s; }
    &:hover img { transform: scale(1.05); }
  }
  .body { padding: 12px 2px 0; }
  .name { font-size: 16px; font-weight: 700; color: var(--text-1); margin-bottom: 6px; }
  .meta { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
  .spec { font-size: 13px; color: var(--text-3); }
  .desc { font-size: 13px; color: var(--text-2); line-height: 1.6; min-height: 42px; margin-bottom: 10px; }
  .price-row { display: flex; align-items: center; gap: 10px; padding-top: 10px; border-top: var(--rule-soft); }
  // 与 PetCard 同一写法：数字字体、20px、价格色，价格左 / 行动右
  .price { font-family: var(--font-num); color: var(--price); font-size: 20px; font-weight: 700;
    line-height: 1.15; letter-spacing: -.01em; font-variant-numeric: tabular-nums;
    .unit { font-family: var(--font-sans); font-size: 12px; color: var(--text-3); font-weight: 400; margin-left: 2px; }
  }
  .go { display: inline-flex; align-items: center; gap: 3px; font-size: 12.5px; font-weight: 700;
    margin-left: auto; padding-bottom: 2px;
    color: var(--text-3); transition: color .16s;
    svg { width: 12px; height: 12px; stroke: currentColor; fill: none; stroke-width: 2; }
    .card:hover & { color: var(--brand-700); }
  }
}
.rating-tag { font-size: 12px; color: var(--brand-700); background: var(--brand-50); border-radius: var(--radius-pill);
  padding: 2px 8px; white-space: nowrap; }

/* 换粮贴士：去底色面板，改 1px 顶线 + 标题承接 */
.tip {
  margin-top: 48px; padding-top: 24px; border-top: var(--rule);
  h3 { margin: 0 0 8px; color: var(--text-1); font-size: 16px; }
  p { margin: 0; color: var(--text-2); font-size: 14px; line-height: 1.7; }
}

/* 详情弹窗 */
.food-detail-dialog {
  :deep(.el-dialog__body) { padding: 0; }
  .food-detail-scroll { max-height: 86vh; overflow-y: auto; }
  .food-social { padding: 0 18px 20px;
    :deep(.pet-social) { margin-top: 0; }
  }
  .detail { display: flex; gap: 0; min-height: 360px;
    .detail-left { width: 320px; flex-shrink: 0; background: var(--bg-page);
      img { width: 100%; height: 100%; max-height: 420px; object-fit: cover; display: block; }
    }
    .detail-right { flex: 1; padding: 24px 28px; }
    .detail-cat { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--brand-700);
      background: var(--brand-50); padding: 3px 12px; border-radius: var(--radius-pill); margin-bottom: 12px;
    }
    .detail-name { font-size: 20px; color: var(--text-1); margin: 0 0 10px; }
    .detail-price { font-family: var(--font-num); color: var(--price); font-size: 24px; font-weight: 700;
      letter-spacing: -.01em; font-variant-numeric: tabular-nums; margin-bottom: 12px;
      .unit { font-size: 13px; color: var(--text-3); font-weight: 400; margin-left: 3px; }
    }
    .detail-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 18px; }
    .detail-list { list-style: none; margin: 0 0 20px; padding: 0;
      li { display: flex; gap: 14px; padding: 10px 0; border-bottom: var(--rule-soft); font-size: 14px;
        .k { color: var(--text-3); width: 76px; flex-shrink: 0; }
        .v { color: var(--text-1); line-height: 1.6; flex: 1; }
      }
    }
    .detail-actions { display: flex; gap: 14px; flex-wrap: wrap; align-items: center;
      .el-button { flex: 1; min-width: 140px; font-weight: 700; }
    }
  }
}
@media (max-width: 768px) {
  /* 手机上两列横排卡会挤成一条窄缝，回到「单列 + 竖排大图」 */
  .grid--sparse {
    grid-template-columns: minmax(0, 1fr);
    gap: 0;
  }
  .grid--sparse .card {
    display: block;
    padding: 18px 0;
    border-bottom: var(--rule-soft);
  }
  .grid--sparse .card:first-child { padding-top: 4px; }
  .grid--sparse .card:last-child { border-bottom: 0; }
  .grid--sparse .thumb { aspect-ratio: 4 / 3; }
  .grid--sparse .body { padding: 12px 2px 0; }

  .food-detail-dialog .detail { flex-direction: column;
    .detail-left { width: 100%; img { max-height: min(240px, 30vh); } }
  }

  /* 手机端：两列小卡，图片等比（1:1），一屏可见多款 */
  .food-page { padding: 24px 12px 60px; }
  .cat-tabs { gap: 8px; margin: 18px 0 16px; }
  .cat-tab { height: 32px; padding: 0 12px; font-size: 13px; }
  .grid { gap: 18px 10px; }
  .card {
    .thumb { aspect-ratio: 1 / 1; border-radius: var(--radius-sm); }
    .body { padding: 9px 1px 0; }
    .name { font-size: 14px; margin-bottom: 4px; }
    .meta { margin-bottom: 4px;
      .spec { font-size: 12px; }
    }
    .desc { display: none; }   /* 详情弹窗里有完整简介，列表卡只留名称规格价格 */
    .price-row { gap: 6px; padding-top: 8px; }
  .rating-tag { font-size: 12px; padding: 1px 6px; }
  .price { font-size: 16px;
      .unit { font-size: 11px; }
    }
  // 窄屏也保留「详情」入口，价格左、行动右的结构与桌面一致
  .go { font-size: 12px; }
  }
  .tip { margin-top: 32px; padding-top: 18px;
    h3 { font-size: 14px; }
    p { font-size: 13px; }
  }
}
</style>
