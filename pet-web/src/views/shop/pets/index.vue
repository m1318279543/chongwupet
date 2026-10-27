<template>
  <div class="ui-page ui-page--lg pets-page">
    <!-- 页面头：标题左、在售计数右，1px 线收口 -->
    <header class="ui-head">
      <div class="ui-head__main">
        <p class="ui-eyebrow">On Sale</p>
        <h1 class="ui-title">在售宠物</h1>
        <p class="ui-sub">每一只在售个体都有可查的健康筛查与疫苗记录，支持到店看宠。</p>
      </div>
      <div class="ui-head__aside">
        <span class="ui-count"><b>{{ counts.onSale }}</b>只在售</span>
      </div>
    </header>

    <!-- 品类快筛：吸附在顶栏下方；切换后平滑回到列表顶部，不做瞬跳 -->
    <nav class="chips" ref="chipsRef" role="group" aria-label="按品类筛选">
      <button type="button" class="chip" :class="{ on: !activeFilter }" @click="clearFilter">全部 <em>{{ total }}</em></button>
      <button
        v-for="c in categories" :key="c.categoryId" type="button" class="chip"
        :class="{ on: activeType === 'category' && activeValue === c.categoryId }"
        @click="applyFilter('category', c.categoryId)"
      >
        {{ c.categoryName }} <em>{{ catCounts[c.categoryId] || 0 }}</em>
      </button>
    </nav>

    <!-- 组合筛选（搜索/选了品类时出现） -->
    <div class="filter-bar" v-if="total > 0 && showResult">
      <span class="kw-note" v-if="keyword">搜索「{{ keyword }}」</span>
      <div class="fb-item">
        <span class="fb-label">性别</span>
        <el-radio-group v-model="fGender" size="small">
          <el-radio-button value="">全部</el-radio-button>
          <el-radio-button value="0">公</el-radio-button>
          <el-radio-button value="1">母</el-radio-button>
        </el-radio-group>
      </div>
      <div class="fb-item">
        <span class="fb-label">价格</span>
        <el-select v-model="fPrice" size="small" style="width: 130px">
          <el-option label="全部价格" value="" />
          <el-option label="¥0 - 500" value="0-500" />
          <el-option label="¥500 - 2000" value="500-2000" />
          <el-option label="¥2000 - 5000" value="2000-5000" />
          <el-option label="¥5000 以上" value="5000-" />
        </el-select>
      </div>
      <div class="fb-item">
        <span class="fb-label">排序</span>
        <el-radio-group v-model="fSort" size="small">
          <el-radio-button value="">默认</el-radio-button>
          <el-radio-button value="asc">价格低→高</el-radio-button>
          <el-radio-button value="desc">价格高→低</el-radio-button>
        </el-radio-group>
      </div>
      <el-checkbox v-model="fOnSale" size="small">仅看在售</el-checkbox>
      <button type="button" class="ui-linkbtn" @click="clearFilter">重置</button>
    </div>

    <div class="grid" ref="gridRef" v-loading="loading">
      <PetCard
        v-for="pet in list"
        :key="pet.petId"
        :pet="pet"
        :faved="isFav(pet.petId)"
        :rating="petRating(pet.petId)"
        :gradient="petGradient(pet.petId)"
        @open="goDetail"
        @fav="toggleFav"
      />
    </div>

    <!-- 服务端分页：每页 12 只，翻页只取当前页，不再一次拉全表 -->
    <div class="pets-pager" v-if="total > PAGE_SIZE">
      <Pagination
        :total="total"
        v-model:page="page"
        :limit="PAGE_SIZE"
        :page-sizes="[PAGE_SIZE]"
        layout="prev, pager, next"
        :background="false"
        :auto-scroll="false"
      />
    </div>

    <div v-if="!loading && !total" class="ui-empty">
      <p class="ui-empty__title">没有找到相关宠物</p>
      <p class="ui-empty__desc">换个品类或放宽筛选条件试试。</p>
      <div class="ui-empty__act">
        <button type="button" class="ui-btn ui-btn--solid" @click="clearFilter">看全部在售</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, inject, nextTick, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { listPetInfo, getPetOverview } from '@/api/pet/petInfo'
import { listCategory } from '@/api/pet/category'
import { listPetFavorite, addPetFavorite, delPetFavorite, listMyFavoriteIds } from '@/api/pet/petFavorite'
import { commentStatGroup } from '@/api/pet/petComment'
import { useUserStore } from '@/store/modules/user'
import Pagination from '@/components/Pagination/index.vue'
import PetCard from '@/views/shop/home/PetCard.vue'
import { PET_GRADIENTS } from '@/views/shop/home/homeData'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const openAuth = inject('openAuth', () => {})

const list = ref([])
const total = ref(0)
const counts = ref({ total: 0, onSale: 0, categoryCount: 0 })
const byCategory = ref([])
const loading = ref(false)
const myFavorites = ref([])
const gridRef = ref(null)
const chipsRef = ref(null)
// 服务端分页：每页 12 只，翻页只取当前页
const PAGE_SIZE = 12
const page = ref(1)

// 筛选状态
const keyword = ref(String(route.query.kw || ''))
const activeType = ref('')          // '' | 'category'
const activeValue = ref('')
const fGender = ref('')
const fPrice = ref('')
const fSort = ref('')
const fOnSale = ref(false)

// 评分角标：petId -> {avg,count}
const ratingMap = ref({})
function petRating(petId) {
  const r = ratingMap.value[petId]
  return r && Number(r.count) > 0 ? r : null
}

function petGradient(id) {
  const c = PET_GRADIENTS[(id || 0) % PET_GRADIENTS.length]
  return `linear-gradient(135deg, ${c[0]}, ${c[1]})`
}
function isLogged() { return !!userStore.token }
function isFav(petId) { return myFavorites.value.includes(petId) }

// 分类计数：来自 overview 接口的分类聚合，不再自己遍历全量列表
const catCounts = computed(() => {
  const m = {}
  for (const r of byCategory.value) m[r.categoryId] = Number(r.count)
  return m
})
// 品类名来自分类表，只展示有数据的分类；分类表未就绪时用 id 兜底
const categoryRows = ref([])
const categories = computed(() => {
  const present = new Set(Object.keys(catCounts.value).map(Number))
  const byMeta = categoryRows.value
    .filter(c => present.has(c.categoryId))
    .map(c => ({ categoryId: c.categoryId, categoryName: c.categoryName }))
  if (byMeta.length) return byMeta
  return [...present].map(id => ({ categoryId: id, categoryName: '其他' }))
})

const activeFilter = computed(() => activeType.value !== '')
const showResult = computed(() => !!keyword.value.trim() || activeFilter.value)

// 服务端筛选：条件全部拼进请求，前端只负责展示当前页
function buildQuery() {
  const q = { pageNum: page.value, pageSize: PAGE_SIZE }
  const extra = {}
  const kw = keyword.value.trim()
  if (kw) extra.keyword = kw
  if (fPrice.value) {
    if (fPrice.value.endsWith('-')) {
      extra.minPrice = Number(fPrice.value.slice(0, -1))
    } else {
      const [min, max] = fPrice.value.split('-').map(Number)
      extra.minPrice = min
      extra.maxPrice = max
    }
  }
  // 默认按「猫狗兔优先」排，与首页精选口径一致；价格排序由后端 order by 接管
  extra.orderBy = fSort.value === 'asc' ? 'priceAsc' : fSort.value === 'desc' ? 'priceDesc' : 'categoryFirst'
  q.params = extra
  if (activeFilter.value && activeValue.value) q.categoryId = activeValue.value
  if (fGender.value !== '') q.gender = fGender.value
  if (fOnSale.value) q.status = '0'
  return q
}

async function loadList() {
  loading.value = true
  try {
    const res = await listPetInfo(buildQuery())
    list.value = res.rows || []
    total.value = res.total || 0
  } catch (e) {
    console.error('加载宠物失败', e)
  } finally {
    loading.value = false
  }
}

async function loadOverview() {
  try {
    // limit=1：只要统计数字与分类聚合，精选不需要
    const res = await getPetOverview(1)
    counts.value = res.counts || { total: 0, onSale: 0, categoryCount: 0 }
    byCategory.value = res.byCategory || []
  } catch (e) { /* 统计失败不影响列表 */ }
}

// 筛选条件变化：合并 250ms 内的连续变更，回到第一页再请求
let filterTimer = null
watch([activeValue, fGender, fPrice, fSort, fOnSale, keyword], () => {
  clearTimeout(filterTimer)
  filterTimer = setTimeout(() => {
    page.value = 1
    loadList()
  }, 250)
})
// 翻页
watch(page, () => loadList())

async function loadMyFavorites() {
  if (!isLogged()) { myFavorites.value = []; return }
  try {
    const res = await listMyFavoriteIds()
    myFavorites.value = res.data || []
  } catch (e) { console.warn('收藏加载失败', e) }
}

async function toggleFav(petId) {
  if (!isLogged()) {
    ElMessage.info('请先登录后再收藏')
    openAuth('login')
    return
  }
  if (isFav(petId)) {
    try {
      const res = await listPetFavorite({ userId: userStore.userId, petId })
      const fid = res.rows?.[0]?.favoriteId
      if (fid) await delPetFavorite(fid)
      myFavorites.value = myFavorites.value.filter(id => id !== petId)
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

function applyFilter(type, value) {
  activeType.value = type
  activeValue.value = value
  keyword.value = ''
  keepGridInView()
}

function clearFilter() {
  activeType.value = ''
  activeValue.value = ''
  keyword.value = ''
  keepGridInView()
}

// 切换品类后列表高度会变；若列表顶部已滚出视口就平滑拉回品类条，
// 避免浏览器在列表变短时瞬间回跳（跳屏）。
// 本页关闭滚动锚定（overflow-anchor:none），滚动目标用 offsetTop（布局位置，不受 sticky 干扰）。
// 切换品类后列表高度骤减，浏览器的滚动钳制会瞬间回跳并打断平滑滚动，
// 因此在 DOM 更新同一帧直接定位到列表顶部（切品类回顶是电商标准交互）。
// 目标位置在挂载时缓存（offsetTop 干净状态测一次），运行时不重复测量。
const chipsDocTop = ref(0)
onMounted(() => {
  nextTick(() => { if (chipsRef.value) chipsDocTop.value = chipsRef.value.offsetTop })
})

function keepGridInView() {
  nextTick(() => {
    const g = gridRef.value
    if (!g) return
    if (g.getBoundingClientRect().top < 130) {
      window.scrollTo(0, Math.max(0, chipsDocTop.value - 74))
    }
  })
}

function goDetail(petId) {
  // from 供详情页返回与导航高亮使用
  router.push({ path: `/shop/pet/${petId}`, query: { from: '/shop/pets' } })
}

onMounted(() => {
  loadOverview()
  loadList()
  loadMyFavorites()
  listCategory({ pageNum: 1, pageSize: 100 }).then((res) => {
    categoryRows.value = res.rows || []
  }).catch(() => {})
  commentStatGroup('pet').then((res) => {
    const m = {}
    for (const row of res.data || []) m[row.petId] = row
    ratingMap.value = m
  }).catch(() => {})
})
</script>

<style scoped lang="scss">
/* 关闭滚动锚定：切品类时由 keepGridInView 统一控制滚动，避免两套滚动逻辑打架 */
.pets-page { overflow-anchor: none; }

/* 品类快筛：吸附在顶栏下方，滚动浏览时也能随手换品类 */
.chips {
  position: sticky; top: 71px; z-index: 30;
  display: flex; gap: 8px; flex-wrap: wrap;
  margin: 26px 0 22px; padding: 10px 0 12px;
  background: var(--bg-page);
  scroll-margin-top: 74px;
  &::-webkit-scrollbar { display: none; }
}
.chip {
  display: inline-flex; align-items: center; gap: 7px; height: 36px; padding: 0 15px;
  border: 1px solid var(--border-1); border-radius: var(--radius-pill);
  background: var(--bg-card); color: var(--text-2); font-size: 13px; font-weight: 500;
  font-family: inherit; white-space: nowrap; cursor: pointer; transition: all .16s;
  em { font-style: normal; font-size: 12px; opacity: .62; font-variant-numeric: tabular-nums; }
  &:hover { border-color: var(--brand-200); color: var(--brand-700); background: var(--brand-50); }
  &.on { background: var(--brand-600); border-color: var(--brand-600); color: #fff; font-weight: 700;
    em { opacity: .82; } }
}

/* 筛选条：工具栏形态——不加底色与描边，靠一条底边线与列表分开 */
.filter-bar {
  display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
  padding: 12px 0; margin-bottom: 20px;
  border-bottom: var(--rule);
  .fb-item { display: flex; align-items: center; gap: 8px; }
  .fb-label { font-size: 13px; color: var(--text-3); flex-shrink: 0; }
  .kw-note { font-size: 13px; color: var(--brand-700); font-weight: 700; }
}

/* 网格：auto-fill 自适应，390 两列 / 1000 三列 / 1200 四列，无断点跳变 */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(250px, 45%), 1fr));
  gap: 26px 16px;
  min-height: 200px; scroll-margin-top: 150px;
}

/* 服务端分页条：居中，与网格留出呼吸区 */
.pets-pager {
  display: flex; justify-content: center;
  margin: 28px 0 6px;
}

@media (max-width: 768px) {
  /* 品类条：单行横滑，吸附在 64px 顶栏下方；右侧渐隐提示还能滑 */
  .chips {
    top: 63px; flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none;
    -webkit-overflow-scrolling: touch; margin: 20px 0 16px;
    scroll-snap-type: x proximity;
    // 右侧 32px 渐隐：露出的半个 chip 与渐隐一起构成「可横滑」的暗示
    -webkit-mask-image: linear-gradient(to right, #000 0, #000 calc(100% - 32px), transparent 100%);
    mask-image: linear-gradient(to right, #000 0, #000 calc(100% - 32px), transparent 100%);
    padding-right: 32px;
  }
  .chip { height: 33px; padding: 0 12px; font-size: 13px; flex-shrink: 0; scroll-snap-align: start; }
  .grid { gap: 18px 10px; scroll-margin-top: 130px; }
  .filter-bar { gap: 10px; }
}
</style>
