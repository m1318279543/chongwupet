<template>
  <div class="food-page">
    <section class="hero">
      <h1>宠物粮 · 科学喂养每一餐</h1>
      <p>覆盖店内全部宠物品类，从主粮到营养补充，按品类挑对口好粮</p>
    </section>

    <nav class="cat-tabs">
      <!-- 类目随商品接口派生（foodData 只提供名称/配色元数据），后台上下架新品类前台自动跟随 -->
      <button v-for="c in categories" :key="c.id"
        class="cat-tab" :class="{ active: active === c.id }"
        @click="active = c.id">
        <i class="dot" :style="{ background: c.color }"></i>{{ c.name }}
      </button>
    </nav>

    <section class="grid">
      <div class="card" v-for="(p, i) in filtered" :key="i" @click="openDetail(p)">
        <div class="thumb">
          <img :src="p.image" :alt="p.name" loading="lazy" />
          <span class="view-mask">查看详情 ›</span>
        </div>
        <div class="body">
          <div class="name">{{ p.name }}</div>
          <div class="meta">
            <span class="spec">{{ p.spec }}</span>
            <el-tag size="small" type="success" effect="plain">{{ p.stage }}</el-tag>
            <el-tag v-if="p.stock !== undefined" size="small" :type="p.stock > 10 ? 'info' : (p.stock > 0 ? 'warning' : 'danger')" effect="plain">
              {{ p.stock > 0 ? '库存 ' + p.stock : '暂时缺货' }}
            </el-tag>
          </div>
          <div class="desc">{{ p.desc }}</div>
          <div class="price-row">
            <span class="rating-tag" v-if="foodRating(p.fid)"><el-icon><Star /></el-icon>{{ foodRating(p.fid).avg }}（{{ foodRating(p.fid).count }}）</span>
            <div class="price">¥{{ p.price }}<span class="unit">起</span></div>
          </div>
        </div>
      </div>
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
          <div class="detail-cat">
            <span class="emoji">{{ currentCat.emoji }}</span>{{ currentCat.name }}专区
          </div>
          <h2 class="detail-name">{{ detail.name }}</h2>
          <div class="detail-price">¥{{ detail.price }}<span class="unit">起</span></div>
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
            <el-button type="warning" size="large" round :disabled="detail && detail.stock === 0" @click="addToCart(detail)">
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

const cartStore = useCartStore()
const openAuth = inject('openAuth', () => {})  // 未登录触发顶栏登录对话框

const active = ref('cat')

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

async function loadGoods() {
  try {
    const res = await listGoods({ status: '0', pageNum: 1, pageSize: 200 })
    const rows = res.rows || []
    goodsList.value = rows.length ? rows.map(adaptGoods) : FOOD_LIST
  } catch (e) {
    goodsList.value = FOOD_LIST
  }
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
  ElMessage.success(`已将「${p.name}」加入购物车`)
}
</script>

<style scoped lang="scss">
.stock-hint { margin-left: 12px; font-size: 12px; color: var(--text-3); }

.food-page { max-width: var(--container-lg); margin: 0 auto; padding: 24px; }
.hero {
  text-align: center; padding: 36px 16px;
  background: linear-gradient(135deg, var(--brand-50), var(--brand-100));
  border-radius: 16px; margin-bottom: 24px;
  h1 { font-size: 28px; color: var(--brand-500); margin: 0 0 8px; }
  p { color: var(--text-3); margin: 0; font-size: 15px; }
}
.cat-tabs { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; margin-bottom: 28px; }
.cat-tab {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 8px 18px; border: 1px solid var(--border-1); background: #fff;
  border-radius: 999px; cursor: pointer; font-size: 15px; color: var(--text-2);
  transition: all .2s;
  .dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
  &:hover { border-color: var(--brand-300); color: var(--brand-700); }
  &.active { background: var(--brand-600); border-color: var(--brand-600); color: #fff; font-weight: 600;
    .dot { background: rgba(255, 255, 255, .75) !important; } }
}
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(260px, 100%), 1fr)); gap: 20px; }
.card {
  background: #fff; border-radius: 14px; overflow: hidden; cursor: pointer;
  box-shadow: 0 4px 16px rgba(0, 0, 0, .06);
  transition: transform .2s, box-shadow .2s;
  &:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(0, 0, 0, .1); }
  .thumb {
    position: relative; height: 200px; background: var(--bg-page);
    display: flex; align-items: center; justify-content: center; overflow: hidden;
    img { width: 100%; height: 100%; object-fit: cover; transition: transform .3s; }
    &:hover img { transform: scale(1.06); }
    .view-mask {
      position: absolute; right: 10px; bottom: 10px;
      background: rgb(var(--brand-500-rgb) / .92); color: #fff;
      font-size: 12px; padding: 4px 10px; border-radius: 12px;
      opacity: 0; transform: translateY(6px); transition: all .2s;
    }
    &:hover .view-mask { opacity: 1; transform: translateY(0); }
  }
  .body { padding: 16px; }
  .name { font-size: 16px; font-weight: 600; color: var(--text-1); margin-bottom: 8px; }
  .meta { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
  .spec { font-size: 13px; color: var(--text-3); }
  .desc { font-size: 13px; color: var(--text-2); line-height: 1.6; min-height: 42px; margin-bottom: 10px; }
  .price { color: var(--brand-500); font-size: 20px; font-weight: 700;
    .unit { font-size: 12px; color: var(--text-4); font-weight: 400; margin-left: 2px; }
  }
}
.tip {
  margin-top: 32px; padding: 20px 24px;
  background: var(--brand-50); border: 1px solid var(--brand-100); border-radius: 12px;
  h3 { margin: 0 0 8px; color: var(--brand-500); font-size: 16px; }
  p { margin: 0; color: var(--text-2); font-size: 14px; line-height: 1.7; }
}

/* 详情弹窗 */
.food-detail-dialog {
  :deep(.el-dialog__body) { padding: 0; }
  .food-detail-scroll { max-height: 86vh; overflow-y: auto; }
  .food-social { padding: 0 18px 20px;
    :deep(.pet-social) { margin-top: 0; border-radius: 12px; padding: 22px 22px; }
  }
  .detail { display: flex; gap: 0; min-height: 360px;
    .detail-left { width: 320px; flex-shrink: 0; background: var(--bg-page);
      img { width: 100%; height: 100%; max-height: 420px; object-fit: cover; display: block; }
    }
    .detail-right { flex: 1; padding: 24px 28px; }
    .detail-cat { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--brand-500);
      background: var(--brand-50); padding: 3px 12px; border-radius: 12px; margin-bottom: 12px;
      .emoji { font-size: 16px; }
    }
    .detail-name { font-size: 22px; color: var(--text-1); margin: 0 0 10px; }
    .detail-price { color: var(--brand-500); font-size: 26px; font-weight: 700; margin-bottom: 12px;
      .unit { font-size: 13px; color: var(--text-4); font-weight: 400; margin-left: 3px; }
    }
    .detail-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 18px; }
    .detail-list { list-style: none; margin: 0 0 20px; padding: 0;
      li { display: flex; gap: 14px; padding: 10px 0; border-bottom: 1px dashed #eee; font-size: 14px;
        .k { color: var(--text-3); width: 76px; flex-shrink: 0; }
        .v { color: var(--text-1); line-height: 1.6; flex: 1; }
      }
    }
    .detail-actions { display: flex; gap: 14px; flex-wrap: wrap;
      .el-button { flex: 1; min-width: 140px; font-weight: 600; }
    }
  }
}
@media (max-width: 768px) {
  .food-detail-dialog .detail { flex-direction: column;
    .detail-left { width: 100%; img { max-height: min(240px, 30vh); } }
  }

  /* 手机端：单列大图改为两列小卡，图片等比例缩小（1:1），一屏可见多款 */
  .food-page { padding: 16px 12px; }
  .hero { padding: 22px 12px; margin-bottom: 16px;
    h1 { font-size: 20px; margin-bottom: 6px; }
    p { font-size: 13px; }
  }
  .cat-tabs { gap: 8px; margin-bottom: 16px; }
  .cat-tab { padding: 6px 12px; font-size: 13px;
    .emoji { font-size: 15px; }
  }
  .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .card { border-radius: 10px;
    .thumb { height: auto; aspect-ratio: 1 / 1; }
    .body { padding: 10px 10px 12px; }
    .name { font-size: 13px; margin-bottom: 4px; }
    .meta { margin-bottom: 4px;
      .spec { font-size: 12px; }
    }
    .desc { display: none; }   /* 详情弹窗里有完整简介，列表卡只留名称规格价格 */
    .price-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.rating-tag { font-size: 12px; color: var(--brand-700); background: var(--brand-50); border-radius: 10px;
  padding: 2px 8px; white-space: nowrap; }
.price { font-size: 15px;
      .unit { font-size: 11px; }
    }
  }
  .tip { padding: 14px 16px; margin-top: 20px;
    h3 { font-size: 14px; }
    p { font-size: 13px; }
  }
}
</style>
