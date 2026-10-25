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
        <span class="ui-count"><b>{{ filteredPets.length }}</b>只在售</span>
      </div>
    </header>

    <!-- 品类快筛：吸附在顶栏下方；切换后平滑回到列表顶部，不做瞬跳 -->
    <nav class="chips" ref="chipsRef" role="group" aria-label="按品类筛选">
      <button type="button" class="chip" :class="{ on: !activeFilter }" @click="clearFilter">全部 <em>{{ allPets.length }}</em></button>
      <button
        v-for="c in categories" :key="c.categoryId" type="button" class="chip"
        :class="{ on: activeType === 'category' && activeValue === c.categoryId }"
        @click="applyFilter('category', c.categoryId)"
      >
        {{ c.categoryName }} <em>{{ catCounts[c.categoryId] || 0 }}</em>
      </button>
    </nav>

    <!-- 组合筛选（搜索/选了品类时出现） -->
    <div class="filter-bar" v-if="filteredPets.length > 0 && showResult">
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
        v-for="pet in sortedPets"
        :key="pet.petId"
        :pet="pet"
        :faved="isFav(pet.petId)"
        :rating="petRating(pet.petId)"
        :gradient="petGradient(pet.petId)"
        @open="goDetail"
        @fav="toggleFav"
      />
    </div>

    <div v-if="!loading && !filteredPets.length" class="ui-empty">
      <p class="ui-empty__title">没有找到相关宠物</p>
      <p class="ui-empty__desc">换个品类或放宽筛选条件试试。</p>
      <div class="ui-empty__act">
        <button type="button" class="ui-btn ui-btn--line" @click="clearFilter">看全部在售</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, inject, nextTick, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { listPetInfo } from '@/api/pet/petInfo'
import { listCategory } from '@/api/pet/category'
import { listPetFavorite, addPetFavorite, delPetFavorite } from '@/api/pet/petFavorite'
import { commentStatGroup } from '@/api/pet/petComment'
import { useUserStore } from '@/store/modules/user'
import PetCard from '@/views/shop/home/PetCard.vue'
import { PET_GRADIENTS } from '@/views/shop/home/homeData'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const openAuth = inject('openAuth', () => {})

const allPets = ref([])
const loading = ref(false)
const myFavorites = ref([])
const gridRef = ref(null)
const chipsRef = ref(null)

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

// 分类计数：品类 chip 上的数量用真实数据，不写死
const catCounts = computed(() => {
  const m = {}
  for (const p of allPets.value) m[p.categoryId] = (m[p.categoryId] || 0) + 1
  return m
})
// 品类名来自分类表（宠物接口不返回 categoryName），按分类表 sort 排序；
// 分类表未就绪时按宠物数据兜底
const categoryRows = ref([])
const categories = computed(() => {
  const present = new Set(allPets.value.map(p => p.categoryId))
  const byMeta = categoryRows.value
    .filter(c => present.has(c.categoryId))
    .map(c => ({ categoryId: c.categoryId, categoryName: c.categoryName }))
  if (byMeta.length) return byMeta
  const seen = []
  for (const p of allPets.value) {
    if (p.categoryId && !seen.some(c => c.categoryId === p.categoryId)) {
      seen.push({ categoryId: p.categoryId, categoryName: '其他' })
    }
  }
  return seen
})

const activeFilter = computed(() => activeType.value !== '')
// 搜索词命中名称或品种
const basePets = computed(() => {
  const kw = keyword.value.trim()
  if (!kw) return allPets.value
  return allPets.value.filter(p => (p.petName || '').includes(kw) || (p.breed || '').includes(kw))
})
const showResult = computed(() => !!keyword.value.trim() || activeFilter.value)
const displayPets = computed(() => {
  if (!activeFilter.value) return basePets.value
  return basePets.value.filter(p => p.categoryId === activeValue.value)
})

// 组合筛选后的结果（性别/价格/在售/排序，纯前端过滤）
const filteredPets = computed(() => {
  let list = displayPets.value.slice()
  if (fGender.value !== '') list = list.filter((p) => p.gender === fGender.value)
  if (fPrice.value) {
    const [min, max] = fPrice.value.endsWith('-')
      ? [Number(fPrice.value.slice(0, -1)), Infinity]
      : fPrice.value.split('-').map(Number)
    list = list.filter((p) => (p.price || 0) >= min && (p.price || 0) <= max)
  }
  if (fOnSale.value) list = list.filter((p) => p.status !== '1')
  if (fSort.value === 'asc') list.sort((a, b) => (a.price || 0) - (b.price || 0))
  else if (fSort.value === 'desc') list.sort((a, b) => (b.price || 0) - (a.price || 0))
  return list
})

// 默认顺序：猫 / 狗 / 兔 优先，其余按后台录入顺序
// 后台新增数据通常按分类批量导入，不排的话首屏可能整屏都是水族或爬行
const CAT_PRIORITY = { 1: 0, 2: 1, 3: 2 }
const sortedPets = computed(() => filteredPets.value.slice().sort((a, b) => {
  const pa = CAT_PRIORITY[a.categoryId] ?? 9
  const pb = CAT_PRIORITY[b.categoryId] ?? 9
  return pa - pb
}))

async function loadAllPets() {
  loading.value = true
  try {
    const res = await listPetInfo({ pageNum: 1, pageSize: 1000 })
    allPets.value = res.rows || []
  } catch (e) {
    console.error('加载宠物失败', e)
  } finally {
    loading.value = false
  }
}

async function loadMyFavorites() {
  if (!isLogged()) { myFavorites.value = []; return }
  try {
    const res = await listPetFavorite({ userId: userStore.userId, pageNum: 1, pageSize: 1000 })
    myFavorites.value = (res.rows || []).map(r => r.petId)
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
  router.push(`/shop/pet/${petId}`)
}

onMounted(() => {
  loadAllPets()
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
  background: var(--bg-card); color: var(--text-2); font-size: 13.5px; font-weight: 500;
  font-family: inherit; white-space: nowrap; cursor: pointer; transition: all .16s;
  em { font-style: normal; font-size: 11.5px; opacity: .62; font-variant-numeric: tabular-nums; }
  &:hover { border-color: var(--brand-200); color: var(--brand-700); background: var(--brand-50); }
  &.on { background: var(--brand-600); border-color: var(--brand-600); color: #fff; font-weight: 600;
    em { opacity: .82; } }
}

/* 筛选条 */
.filter-bar {
  display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
  padding: 12px 16px; margin-bottom: 24px;
  background: var(--bg-card); border: 1px solid var(--border-1); border-radius: var(--radius-sm);
  .fb-item { display: flex; align-items: center; gap: 8px; }
  .fb-label { font-size: 13px; color: var(--text-3); flex-shrink: 0; }
  .kw-note { font-size: 13px; color: var(--brand-700); font-weight: 600; }
}

/* 网格：4 / 3 / 2 列；scroll-margin 给「切类后平滑回列表顶」留出吸顶条高度 */
.grid {
  display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 26px 16px;
  min-height: 200px; scroll-margin-top: 150px;
}

@media (max-width: 1240px) {
  .grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
@media (max-width: 768px) {
  /* 品类条：单行横滑，吸附在 64px 顶栏下方 */
  .chips { top: 63px; flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none;
    -webkit-overflow-scrolling: touch; margin: 20px 0 16px; }
  .chip { height: 33px; padding: 0 12px; font-size: 13px; flex-shrink: 0; }
  .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px 10px; scroll-margin-top: 130px; }
  .filter-bar { gap: 10px; padding: 10px 12px; }
}
</style>
