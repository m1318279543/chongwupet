<template>
  <div class="home">

    <!-- ① 主视觉：浅底深字，左文案 + 右图集（不再整块亮橙压白字） -->
    <section class="hero">
      <div class="hero-inner">
        <div class="hero-copy">
          <span class="hero-badge">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0116 0z"/><circle cx="12" cy="10" r="2.6"/></svg>
            <b>重庆</b> {{ stores.length || 3 }} 家门店
            <i class="sep"></i>
            到店看宠可预约
          </span>

          <h1>
            在重庆，遇见<br>
            <em>值得托付<svg viewBox="0 0 120 10" preserveAspectRatio="none" aria-hidden="true"><path d="M2 7C22 3 44 2.5 62 4.5c18 2 34 3 56 1.5"/></svg></em>的第一只伙伴
          </h1>

          <p class="hero-sub">
            每一只在售宠物都完成<b>健康筛查</b>与<b>疫苗、驱虫记录</b>核验，
            支持到店看宠、线上问诊、7 天健康观察。
          </p>

          <!-- 搜索：全站唯一入口 -->
          <div class="hero-search">
            <el-icon class="s-ico"><Search /></el-icon>
            <input
              v-model="keyword"
              type="search"
              placeholder="搜索品种，如「布偶」「柯基」"
              aria-label="搜索宠物名称或品种"
              @keyup.enter="handleSearch"
            />
            <button type="button" class="s-go" @click="handleSearch">搜索</button>
          </div>

          <div class="hero-cta">
            <button type="button" class="btn btn-primary" @click="router.push('/shop/match')">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9zM18.5 15l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9z"/></svg>
              AI 智能选宠 · 30 秒
            </button>
            <button type="button" class="btn btn-ghost" @click="scrollToPets">先随便逛逛</button>
          </div>

          <div class="trust">
            <div><strong class="num">{{ categories.length || 7 }}</strong><span>大品类覆盖</span></div>
            <div><strong class="num">{{ stores.length || 3 }}</strong><span>重庆直营门店</span></div>
            <div><strong class="num">100<i>%</i></strong><span>健康筛查记录</span></div>
            <div><strong class="num">7<i> 天</i></strong><span>健康观察期</span></div>
          </div>
        </div>

        <!-- 图集：从在售宠物里取猫 / 狗 / 小宠各一张 -->
        <div class="hero-media" v-if="heroPets.length">
          <figure class="m-main"><img :src="heroPets[0].image" :alt="heroPets[0].petName" /></figure>
          <figure v-if="heroPets[1]"><img :src="heroPets[1].image" :alt="heroPets[1].petName" loading="lazy" /></figure>
          <figure v-if="heroPets[2]"><img :src="heroPets[2].image" :alt="heroPets[2].petName" loading="lazy" /></figure>
          <div class="media-badge">
            <span class="ok"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12.5l5 5L20 6.5"/></svg></span>
            <span>
              <strong>健康筛查已通过</strong>
              <span>疫苗、驱虫、体检记录随宠物交付</span>
            </span>
          </div>
        </div>
      </div>
    </section>

    <!-- ② 品类快筛：替代原来的「全部分类 + 统称分类/按科系」双层导航 -->
    <div class="filters">
      <div class="filters-inner">
        <div class="chips" role="group" aria-label="按品类筛选">
          <button type="button" class="chip" :class="{ on: !activeFilter }" @click="clearFilter">全部 <em>{{ allPets.length }}</em></button>
          <button
            v-for="c in categories" :key="c.categoryId" type="button" class="chip"
            :class="{ on: activeType === 'category' && activeValue === c.categoryId }"
            @click="applyFilter('category', c.categoryId)"
          >
            {{ c.categoryName }} <em>{{ catCounts[c.categoryId] || 0 }}</em>
          </button>
        </div>
      </div>
    </div>

    <!-- ③ 宠物网格 -->
    <section class="sec pets-sec" ref="petsSec">
      <div class="sec-inner">
        <div class="sec-head">
          <div>
            <h2>{{ gridTitle }}</h2>
            <p>{{ gridSub }}</p>
          </div>
          <button v-if="canExpand" type="button" class="more" @click="showAll = true">
            全部 {{ allPets.length }} 只
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6"/></svg>
          </button>
        </div>

        <!-- 组合筛选（仅在有筛选/搜索时出现） -->
        <div class="filter-bar" v-if="displayPets.length > 0 && showResult">
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
        </div>

        <div class="grid" v-loading="loading">
          <PetCard
            v-for="pet in gridPets"
            :key="pet.petId"
            :pet="pet"
            :faved="isFav(pet.petId)"
            :rating="petRating(pet.petId)"
            :gradient="petGradient(pet.petId)"
            :emoji="petEmoji(pet.categoryId)"
            @open="goDetail"
            @fav="toggleFav"
          />
        </div>

        <div v-if="!loading && !gridPets.length" class="empty">
          <p>没有找到相关宠物</p>
          <button type="button" class="btn btn-ghost btn-sm" @click="clearFilter">看看全部在售</button>
        </div>
      </div>
    </section>

    <!-- ④ 宠物粮专区 -->
    <section class="sec">
      <div class="sec-inner">
        <div class="food-panel">
          <div class="sec-head">
            <div>
              <h2>宠物粮专区</h2>
              <p>{{ FOOD_CATEGORIES.length }} 类宠物 · {{ FOOD_LIST.length }} 款主粮 · 营养指标与喂食建议公开可查</p>
            </div>
            <router-link class="more" to="/shop/food">
              全部 {{ FOOD_LIST.length }} 款
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6"/></svg>
            </router-link>
          </div>
          <div class="food-grid">
            <router-link class="food" v-for="item in featuredFoods" :key="item.id" to="/shop/food">
              <div class="food-img">
                <img v-if="isImage(item.image)" :src="item.image" :alt="item.name" loading="lazy" />
                <span v-else class="food-emoji">🛒</span>
              </div>
              <div class="food-body">
                <span class="food-tag">{{ item.catName }}</span>
                <div class="food-name">{{ item.name }}</div>
                <div class="food-spec">{{ item.spec }}</div>
                <div class="food-price num"><i>¥</i>{{ item.price }}</div>
              </div>
            </router-link>
          </div>
        </div>
      </div>
    </section>

    <!-- ⑤ 服务保障 -->
    <section class="sec">
      <div class="sec-inner">
        <div class="sec-head">
          <div>
            <h2>买之前，先把这些说清楚</h2>
            <p>四项承诺写进订单，出问题按条款处理</p>
          </div>
        </div>
        <div class="svc-grid">
          <div class="svc">
            <span class="svc-ico"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7 3v6c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6l7-3z"/><path d="M9 12l2 2 4-4"/></svg></span>
            <h3>健康筛查</h3>
            <p>到店前完成基础体检、疫苗与驱虫记录核验，档案随宠物交付。</p>
            <router-link class="svc-link" to="/shop/service#health">了解流程 →</router-link>
          </div>
          <div class="svc">
            <span class="svc-ico"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg></span>
            <h3>真实信息</h3>
            <p>品种、月龄、性别、来源如实登记，图片为实拍，不做美颜合成。</p>
            <router-link class="svc-link" to="/shop/service#origin">查看标准 →</router-link>
          </div>
          <div class="svc">
            <span class="svc-ico"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-9a4 4 0 017-2.6A4 4 0 0119 11c0 4.6-7 9-7 9z"/></svg></span>
            <h3>专业养护</h3>
            <p>交付附 30 天养护清单：喂养节奏、疫苗排期、常见问题处理。</p>
            <router-link class="svc-link" to="/shop/service#care">养护指南 →</router-link>
          </div>
          <div class="svc">
            <span class="svc-ico"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1114 5.3"/><path d="M4 17v-5h5"/><path d="M9 17h11"/></svg></span>
            <h3>售后无忧</h3>
            <p>7 天健康观察期内出现约定疾病，凭体检报告可协商退换。</p>
            <router-link class="svc-link" to="/shop/service#after">售后条款 →</router-link>
          </div>
        </div>
      </div>
    </section>

    <!-- ⑥ 门店：把「本地直营」这条信任信息摆到页面上（数据来自 /pet/store） -->
    <section class="sec stores" v-if="stores.length">
      <div class="sec-inner">
        <div class="sec-head">
          <div>
            <h2>重庆 {{ stores.length }} 家门店，欢迎先来看一眼</h2>
            <p>看宠建议提前预约，我们会安排独立的接待时间</p>
          </div>
          <router-link class="more" to="/shop/appointment">
            预约到店
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6"/></svg>
          </router-link>
        </div>
        <div class="store-grid">
          <div class="store" v-for="s in stores" :key="s.storeId">
            <div class="store-top">
              <h4>{{ s.storeName }}</h4>
              <span class="tag">{{ s.storeType === '1' ? '加盟' : '直营' }}</span>
            </div>
            <div class="store-row">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0116 0z"/><circle cx="12" cy="10" r="2.5"/></svg>
              <span>{{ [s.city, s.address].filter(Boolean).join('') }}</span>
            </div>
            <div class="store-row tel" v-if="s.phone">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h3l1.8 4.5-2.3 1.7a12 12 0 006.3 6.3l1.7-2.3L21 15v3a2 2 0 01-2.2 2A17 17 0 014 5.2 2 2 0 016 3z"/></svg>
              <span>{{ s.phone }}</span>
            </div>
            <div class="store-row" v-if="s.businessHours">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
              <span>{{ s.businessHours }}</span>
            </div>
            <router-link class="btn store-btn" to="/shop/appointment">预约到店</router-link>
          </div>
        </div>
      </div>
    </section>

    <!-- 尾段：拿不定主意时的兜底入口 -->
    <section class="cta-band">
      <div class="cta-inner">
        <div>
          <h3>拿不定主意？让医生和顾问帮你选</h3>
          <p>在线问诊免费，工作日 9:00–21:00 有人应答</p>
        </div>
        <div class="cta-actions">
          <router-link class="btn btn-primary" to="/shop/doctor">在线问诊</router-link>
          <router-link class="btn btn-ghost" to="/shop/consult">联系客服</router-link>
        </div>
      </div>
    </section>

  </div>
</template>

<script setup>
import { ref, inject, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import { listPetInfo } from '@/api/pet/petInfo'
import { listCategory } from '@/api/pet/category'
import { listPetFavorite, addPetFavorite, delPetFavorite } from '@/api/pet/petFavorite'
import { commentStatGroup } from '@/api/pet/petComment'
import { storeOptions } from '@/api/pet/petStore'
import { FOOD_CATEGORIES, FOOD_LIST } from '@/views/shop/food/foodData'
import { useUserStore } from '@/store/modules/user'
import PetCard from './PetCard.vue'
import { EMOJI_POOL, PET_GRADIENTS } from './homeData'

const router = useRouter()
const userStore = useUserStore()
const openAuth = inject('openAuth', () => {})

const keyword = ref('')
const activeType = ref('')          // '' | 'category'
const activeValue = ref('')         // categoryId
const categories = ref([])
const petList = ref([])
const allPets = ref([])
const loading = ref(false)
const myFavorites = ref([])
const stores = ref([])
const showAll = ref(false)
const PAGE_SIZE = 12
const petsSec = ref(null)

// 组合筛选状态
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
async function loadRatings() {
  try {
    const res = await commentStatGroup('pet')
    const m = {}
    for (const row of res.data || []) m[row.petId] = row
    ratingMap.value = m
  } catch (e) { /* 静默 */ }
}

function petEmoji(c) { return EMOJI_POOL[(c || 0) % EMOJI_POOL.length] }
function petGradient(id) {
  const c = PET_GRADIENTS[(id || 0) % PET_GRADIENTS.length]
  return `linear-gradient(135deg, ${c[0]}, ${c[1]})`
}
// image 字段可能是图片 URL（/images/... 或 http...），也可能是 emoji 兜底
function isImage(s) { return !!s && (s.indexOf('/') === 0 || s.indexOf('http') === 0) }
function isLogged() { return !!userStore.token }
function isFav(petId) { return myFavorites.value.includes(petId) }

// 首页宠物粮推荐：每类取 1 款主推
const catNameMap = FOOD_CATEGORIES.reduce((m, c) => { m[c.id] = c.name; return m }, {})
const featuredFoods = computed(() => {
  const seen = new Set()
  const result = []
  for (const f of FOOD_LIST) {
    if (!seen.has(f.cat)) {
      seen.add(f.cat)
      result.push({ ...f, catName: catNameMap[f.cat] })
    }
  }
  return result.slice(0, 4)
})

// 分类计数：品类 chip 上的数量用真实数据，不写死
const catCounts = computed(() => {
  const m = {}
  for (const p of allPets.value) m[p.categoryId] = (m[p.categoryId] || 0) + 1
  return m
})

// Hero 图集：猫 / 狗 / 小宠各取一张有图的
const heroPets = computed(() => {
  const withImg = allPets.value.filter((p) => isImage(p.image))
  const pick = []
  for (const id of [1, 2, 3]) {
    const p = withImg.find((x) => x.categoryId === id)
    if (p) pick.push(p)
  }
  return (pick.length >= 3 ? pick : withImg).slice(0, 3)
})

const activeFilter = computed(() => activeType.value !== '')
const displayPets = computed(() => {
  if (!activeFilter.value) return allPets.value
  if (activeType.value === 'category') return allPets.value.filter(p => p.categoryId === activeValue.value)
  return allPets.value
})
const showResult = computed(() => !!keyword.value || activeFilter.value)
const resultPets = computed(() => keyword.value ? petList.value : displayPets.value)
const gridTitle = computed(() => {
  if (keyword.value) return '搜索结果'
  if (activeType.value === 'category') {
    const c = categories.value.find(x => x.categoryId === activeValue.value)
    return c ? `${c.categoryName}专区` : '筛选结果'
  }
  return '本周值得一看'
})
const gridSub = computed(() => {
  if (showResult.value) return `共 ${filteredPets.value.length} 只符合条件`
  return '按健康记录完整度与到店可看时间排序'
})

// 组合筛选后的结果（性别/价格/在售/排序，纯前端过滤）
const filteredPets = computed(() => {
  let list = resultPets.value.slice()
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

// 首页精选顺序：猫 / 狗 / 兔 优先，其余按后台录入顺序
// 后台新增数据通常按分类批量导入，不排的话首屏可能整屏都是水族或爬行
const CAT_PRIORITY = { 1: 0, 2: 1, 3: 2 }
const featuredPets = computed(() => allPets.value.slice().sort((a, b) => {
  const pa = CAT_PRIORITY[a.categoryId] ?? 9
  const pb = CAT_PRIORITY[b.categoryId] ?? 9
  return pa - pb
}))

const gridPets = computed(() => {
  if (showResult.value) return filteredPets.value
  return showAll.value ? featuredPets.value : featuredPets.value.slice(0, PAGE_SIZE)
})
const canExpand = computed(() => !showResult.value && !showAll.value && allPets.value.length > PAGE_SIZE)

async function loadCategories() {
  try {
    const res = await listCategory({ pageNum: 1, pageSize: 100 })
    categories.value = res.rows || []
  } catch (e) { console.warn('分类加载失败', e) }
}

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

async function loadPets() {
  loading.value = true
  try {
    const query = { pageNum: 1, pageSize: 100 }
    if (keyword.value) query.petName = keyword.value
    const res = await listPetInfo(query)
    petList.value = res.rows || []
  } catch (e) {
    console.error('加载宠物失败', e)
  } finally {
    loading.value = false
  }
}

// 门店是公开信息；接口不可用时整块不渲染，不摆空壳
async function loadStores() {
  try {
    const res = await storeOptions()
    stores.value = (res.data || []).filter(s => s.status !== '1')
  } catch (e) { /* 静默：游客态或后端未开通该接口 */ }
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
  showAll.value = false
  scrollToPets()
}

function clearFilter() {
  activeType.value = ''
  activeValue.value = ''
  keyword.value = ''
}

function scrollToPets() {
  petsSec.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function handleSearch() {
  if (!keyword.value) return
  activeType.value = ''
  activeValue.value = ''
  loadPets()
  scrollToPets()
}

function goDetail(petId) {
  router.push(`/shop/pet/${petId}`)
}

onMounted(() => {
  loadCategories()
  loadAllPets()
  loadMyFavorites()
  loadRatings()
  loadStores()
})
</script>

<style scoped lang="scss">
/* ===== ① Hero ===== */
.hero {
  position: relative; overflow: hidden;
  background:
    radial-gradient(760px 380px at 82% 4%, var(--brand-100) 0%, rgba(255, 255, 255, 0) 70%),
    linear-gradient(180deg, var(--brand-50) 0%, var(--bg-page) 100%);
  border-bottom: 1px solid var(--border-1);
}
.hero-inner {
  max-width: var(--container-lg); margin: 0 auto; padding: 64px 24px 72px;
  display: grid; grid-template-columns: 1.02fr .98fr; gap: 64px; align-items: center;
}
.hero-badge {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 6px 12px 6px 10px; background: var(--bg-card);
  border: 1px solid var(--border-1); border-radius: var(--radius-pill);
  font-size: 12.5px; font-weight: 500; color: var(--text-2); box-shadow: var(--shadow-card);
  svg { width: 13px; height: 13px; stroke: var(--brand-600); fill: none; stroke-width: 1.8; flex-shrink: 0; }
  b { color: var(--text-1); font-weight: 600; }
  .sep { width: 1px; height: 11px; background: var(--border-1); }
}

h1 {
  margin: 20px 0 0; font-size: clamp(30px, 3.3vw, 44px); line-height: 1.16;
  font-weight: 700; letter-spacing: -.012em; color: var(--text-1);
  em {
    font-style: normal; color: var(--brand-700); position: relative; white-space: nowrap;
    svg {
      position: absolute; left: 0; right: 0; bottom: -6px; width: 100%; height: 9px;
      stroke: var(--brand-300); fill: none; stroke-width: 2.4; stroke-linecap: round;
    }
  }
}
.hero-sub {
  margin: 20px 0 0; max-width: 30em; font-size: 15.5px; line-height: 1.8; color: var(--text-2);
  b { color: var(--text-1); font-weight: 600; }
}

.hero-search {
  display: flex; align-items: center; gap: 8px; margin-top: 32px;
  height: 56px; padding: 0 8px 0 18px; background: var(--bg-card);
  border: 1px solid var(--border-1); border-radius: 14px;
  box-shadow: var(--shadow-sm); max-width: 520px;
  transition: border-color .16s, box-shadow .16s;
  &:focus-within { border-color: var(--brand-300); box-shadow: 0 0 0 3px var(--brand-50), var(--shadow-sm); }
  .s-ico { font-size: 18px; color: var(--text-3); flex-shrink: 0; }
  input {
    flex: 1; min-width: 0; border: 0; outline: 0; background: none;
    font-size: 15px; font-family: inherit; color: var(--text-1);
    &::placeholder { color: var(--text-4); }
    &::-webkit-search-cancel-button { display: none; }
  }
  .s-go {
    height: 40px; padding: 0 22px; border-radius: 10px; border: 0;
    background: var(--brand-600); color: #fff; font-size: 14.5px; font-weight: 600;
    font-family: inherit; cursor: pointer; flex-shrink: 0; transition: background .16s;
    &:hover { background: var(--brand-700); }
  }
}

.hero-cta { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 24px; }
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  height: 48px; padding: 0 22px; border-radius: var(--radius-md);
  font-size: 15px; font-weight: 600; font-family: inherit; cursor: pointer;
  border: 1px solid transparent; transition: transform .16s, background .16s, border-color .16s, color .16s;
  svg { width: 17px; height: 17px; stroke: currentColor; fill: none; stroke-width: 1.9; }
}
.btn-primary {
  background: var(--brand-600); color: #fff; box-shadow: var(--shadow-cta);
  &:hover { background: var(--brand-700); transform: translateY(-1px); }
}
.btn-ghost {
  background: var(--bg-card); color: var(--text-1); border-color: var(--border-1);
  box-shadow: var(--shadow-card);
  &:hover { border-color: var(--brand-300); color: var(--brand-700); background: var(--brand-50); }
}
.btn-sm { height: 38px; padding: 0 16px; font-size: 13.5px; border-radius: 10px; }

.trust {
  display: flex; gap: 32px; margin-top: 48px; padding-top: 24px; border-top: 1px solid var(--border-1);
  div strong {
    display: block; font-size: 20px; font-weight: 700; letter-spacing: -.02em;
    line-height: 1.3; color: var(--text-1);
    i { font-style: normal; font-size: 12px; font-weight: 600; }
  }
  div span { display: block; font-size: 12.5px; color: var(--text-3); margin-top: 2px; }
}

.hero-media {
  display: grid; grid-template-columns: 1.3fr 1fr; grid-template-rows: 1fr 1fr;
  gap: 14px; height: 470px; position: relative;
  figure {
    overflow: hidden; border-radius: var(--radius-lg); background: var(--bg-sunken);
    box-shadow: var(--shadow-sm); margin: 0;
    img { width: 100%; height: 100%; object-fit: cover; transition: transform .6s cubic-bezier(.2,.7,.3,1); }
    &:hover img { transform: scale(1.04); }
  }
  .m-main { grid-row: span 2; border-radius: var(--radius-xl); background: var(--brand-50);
    img { object-position: center 30%; } }
}
.media-badge {
  position: absolute; left: -18px; bottom: 26px;
  display: flex; align-items: center; gap: 10px;
  padding: 11px 16px 11px 12px; background: var(--bg-card);
  border: 1px solid var(--border-1); border-radius: 14px; box-shadow: var(--shadow-float);
  .ok { width: 28px; height: 28px; border-radius: 50%; background: var(--brand-50);
    display: grid; place-items: center; flex-shrink: 0;
    svg { width: 15px; height: 15px; stroke: var(--brand-600); fill: none; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; } }
  strong { display: block; font-size: 13px; font-weight: 600; line-height: 1.35; color: var(--text-1); }
  & > span > span { display: block; font-size: 11.5px; color: var(--text-3); line-height: 1.35; }
}

/* ===== ② 品类快筛 ===== */
.filters { background: var(--bg-card); border-bottom: 1px solid var(--border-1); }
.filters-inner {
  max-width: var(--container-lg); margin: 0 auto; padding: 0 24px;
  display: flex; align-items: center; height: 70px;
}
.chips {
  display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; padding: 2px;
  width: 100%;
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

/* ===== 区块通用 ===== */
.sec { padding: 96px 0; }
.sec-inner { max-width: var(--container-lg); margin: 0 auto; padding: 0 24px; }
.sec-head {
  display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; margin-bottom: 32px;
  h2 { font-size: 26px; font-weight: 700; letter-spacing: -.02em; line-height: 1.25; color: var(--text-1); }
  p { margin-top: 6px; font-size: 13.5px; color: var(--text-3); }
}
.more {
  display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0;
  font-size: 14px; font-weight: 600; color: var(--brand-700);
  background: none; border: 0; font-family: inherit; cursor: pointer; padding: 8px 0; white-space: nowrap;
  svg { width: 15px; height: 15px; stroke: currentColor; fill: none; stroke-width: 2; transition: transform .16s; }
  &:hover svg { transform: translateX(3px); }
}

/* 筛选条 */
.filter-bar {
  display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
  padding: 12px 16px; margin-bottom: 20px;
  background: var(--bg-card); border: 1px solid var(--border-1); border-radius: var(--radius-md);
  .fb-item { display: flex; align-items: center; gap: 8px; }
  .fb-label { font-size: 13px; color: var(--text-3); flex-shrink: 0; }
}

/* 网格：4 / 3 / 2 列 */
.grid {
  display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px;
  min-height: 200px;
}
.empty {
  text-align: center; padding: 64px 0; color: var(--text-3);
  p { margin-bottom: 16px; font-size: 14px; }
}

/* ===== ④ 宠物粮 ===== */
.food-panel {
  background: var(--bg-sunken); border: 1px solid var(--border-1);
  border-radius: var(--radius-xl); padding: 32px;
}
.food-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
.food {
  display: block; background: var(--bg-card); border-radius: var(--radius-md);
  overflow: hidden; border: 1px solid transparent;
  transition: transform .2s, box-shadow .2s;
  &:hover { transform: translateY(-3px); box-shadow: var(--shadow-sm); }
}
.food-img {
  aspect-ratio: 1 / 1; overflow: hidden; background: #fff;
  display: grid; place-items: center;
  img { width: 100%; height: 100%; object-fit: cover; transition: transform .4s; }
  .food-emoji { font-size: 36px; }
  .food:hover & img { transform: scale(1.05); }
}
.food-body { padding: 12px 14px 14px; }
.food-tag {
  display: inline-block; padding: 2px 7px; border-radius: var(--radius-xs);
  background: var(--brand-50); color: var(--brand-700); font-size: 11.5px; font-weight: 600;
}
.food-name {
  margin-top: 7px; font-size: 14px; font-weight: 600; line-height: 1.45; color: var(--text-1);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  overflow: hidden; min-height: 40px;
}
.food-spec { margin-top: 2px; font-size: 12px; color: var(--text-3); }
.food-price {
  margin-top: 8px; font-size: 16px; font-weight: 700; color: var(--price); letter-spacing: -.01em;
  i { font-style: normal; font-size: 11.5px; font-weight: 600; }
}

/* ===== ⑤ 服务保障 ===== */
.svc-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 24px; }
.svc {
  padding-right: 16px;
  h3 { font-size: 15px; font-weight: 600; margin-bottom: 6px; color: var(--text-1); }
  p { font-size: 13px; line-height: 1.7; color: var(--text-3); }
}
.svc-ico {
  width: 44px; height: 44px; border-radius: var(--radius-md);
  background: var(--brand-50); border: 1px solid var(--brand-100);
  display: grid; place-items: center; margin-bottom: 16px;
  svg { width: 22px; height: 22px; stroke: var(--brand-700); fill: none;
    stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
}
.svc-link {
  display: inline-block; margin-top: 10px; font-size: 12.5px; font-weight: 600;
  color: var(--brand-700);
  &:hover { text-decoration: underline; }
}

/* ===== ⑥ 门店 ===== */
.stores { background: var(--bg-card); border-top: 1px solid var(--border-1); border-bottom: 1px solid var(--border-1); }
.store-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
.store {
  display: flex; flex-direction: column; gap: 12px;
  padding: 24px; border: 1px solid var(--border-1); border-radius: var(--radius-lg);
  background: var(--bg-card);
  transition: border-color .2s, box-shadow .2s;
  &:hover { border-color: var(--brand-200); box-shadow: var(--shadow-sm); }
}
.store-top {
  display: flex; align-items: center; gap: 8px;
  h4 { font-size: 16px; font-weight: 600; letter-spacing: -.01em; color: var(--text-1); }
  .tag { padding: 2px 7px; border-radius: var(--radius-xs); background: var(--brand-50);
    color: var(--brand-700); font-size: 11px; font-weight: 600; }
}
.store-row {
  display: flex; align-items: flex-start; gap: 8px; font-size: 13px; color: var(--text-2); line-height: 1.6;
  svg { width: 14px; height: 14px; stroke: var(--text-3); fill: none; stroke-width: 1.7; margin-top: 3px; flex-shrink: 0; }
  &.tel { color: var(--text-1); font-weight: 600; font-variant-numeric: tabular-nums; }
}
.store-btn {
  margin-top: auto; width: 100%; height: 40px; font-size: 13.5px; border-radius: 10px;
  background: var(--bg-card); color: var(--brand-700); border: 1px solid var(--brand-200);
  &:hover { background: var(--brand-50); border-color: var(--brand-300); }
}

/* ===== 尾段行动区 ===== */
.cta-band { padding: 0 0 96px; }
.cta-inner {
  max-width: var(--container-lg); margin: 0 auto; padding: 32px;
  display: flex; align-items: center; justify-content: space-between; gap: 24px;
  background: var(--brand-50); border: 1px solid var(--brand-100); border-radius: var(--radius-xl);
  h3 { font-size: 20px; font-weight: 700; letter-spacing: -.01em; color: var(--text-1); }
  p { margin-top: 6px; font-size: 13.5px; color: var(--text-2); }
  .cta-actions { display: flex; gap: 12px; flex-shrink: 0; }
}

/* ===== 响应式 ===== */
@media (max-width: 1240px) {
  .grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .hero-media { height: 420px; }
}
@media (max-width: 1000px) {
  .hero-inner { grid-template-columns: 1fr; gap: 32px; padding: 48px 24px 56px; }
  .hero-media { height: auto; aspect-ratio: 1.55; }
  .media-badge { left: 12px; bottom: 12px; }
  .sec { padding: 64px 0; }
  .food-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .svc-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
  .store-grid { grid-template-columns: 1fr; }
  .cta-inner { flex-direction: column; align-items: flex-start; padding: 24px; }
  .cta-band { padding: 0 0 64px; }
}
@media (max-width: 768px) {
  .hero-inner { padding: 32px 16px 40px; }
  .sec-inner, .filters-inner { padding: 0 16px; }
  h1 { font-size: 27px; }
  .hero-sub { font-size: 14.5px; }
  .hero-search { height: 52px; border-radius: var(--radius-md); margin-top: 24px;
    .s-go { padding: 0 16px; font-size: 14px; } }
  .hero-cta { margin-top: 20px; }
  .hero-cta .btn { flex: 1; min-width: 0; padding: 0 12px; font-size: 14px; height: 46px; }
  /* 信任数据压成一行，给首屏腾出「本周值得一看」的位置 */
  .trust { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px; margin-top: 28px; padding-top: 20px; }
  .trust div strong { font-size: 16px; }
  .trust div span { font-size: 11px; line-height: 1.4; }

  /* 图集改为主图横幅 + 两张并排 */
  .hero-media {
    height: auto; aspect-ratio: auto; gap: 10px;
    grid-template-columns: 1fr 1fr; grid-template-rows: auto auto;
    .m-main { grid-row: auto; grid-column: 1 / -1; aspect-ratio: 16 / 9; border-radius: var(--radius-lg); }
    figure:not(.m-main) { aspect-ratio: 1 / 1; border-radius: var(--radius-md); }
  }
  .media-badge { display: none; }

  .filters-inner { height: 60px; }
  .chip { height: 33px; padding: 0 12px; font-size: 13px; }
  .sec { padding: 48px 0; }
  .sec-head { h2 { font-size: 21px; } p { margin-top: 4px; font-size: 12.5px; } }
  .more { font-size: 13px; }
  .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .food-panel { padding: 16px; border-radius: var(--radius-lg); }
  .food-grid { gap: 10px; }
  .food-name { font-size: 13px; min-height: 38px; }
  .svc-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
  .svc { padding-right: 0;
    .svc-ico { width: 38px; height: 38px; border-radius: 10px; margin-bottom: 10px;
      svg { width: 19px; height: 19px; } }
    h3 { font-size: 14px; }
    p { font-size: 12px; line-height: 1.6; }
  }
  .store { padding: 16px; border-radius: var(--radius-md); }
  .cta-inner h3 { font-size: 17px; }
  .cta-actions { width: 100%;
    .btn { flex: 1; padding: 0 12px; font-size: 14px; } }
}
@media (max-width: 480px) {
  .hero-cta { flex-direction: column; }
  .hero-cta .btn { width: 100%; }
}
</style>
