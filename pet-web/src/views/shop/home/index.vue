<template>
  <div class="home">

    <!-- ① 主视觉：浅底深字，左文案 + 右图集 -->
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
            支持到店看宠、养护咨询、7 天健康观察。
          </p>

          <!-- 搜索：跳到宠物售卖页出结果 -->
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
              智能选宠 · 30 秒
            </button>
            <button type="button" class="btn btn-ghost" @click="scrollToPets">先随便逛逛</button>
          </div>

          <div class="trust">
            <div><strong class="num">{{ petCats || 7 }}</strong><span>大品类覆盖</span></div>
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

    <!-- ② 本周值得一看：精选 12 只，右侧按钮去宠物售卖页看全部 -->
    <section class="sec pets-sec" ref="petsSec">
      <div class="sec-inner">
        <div class="sec-head">
          <div>
            <h2>本周值得一看</h2>
            <p>按健康记录完整度与到店可看时间排序</p>
          </div>
          <router-link class="more" to="/shop/pets">
            宠物售卖 · 全部 {{ allPets.length }} 只
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6"/></svg>
          </router-link>
        </div>

        <div class="grid" v-loading="loading">
          <PetCard
            v-for="pet in gridPets"
            :key="pet.petId"
            :pet="pet"
            :faved="isFav(pet.petId)"
            :rating="petRating(pet.petId)"
            :gradient="petGradient(pet.petId)"
            @open="goDetail"
            @fav="toggleFav"
          />
        </div>

        <div v-if="!loading && !gridPets.length" class="empty">
          <p>暂时没有在售宠物</p>
          <button type="button" class="btn btn-ghost btn-sm" @click="router.push('/shop/pets')">去宠物售卖页看看</button>
        </div>
      </div>
    </section>

    <!-- ③ 宠物粮精选：每类挑一款，入口去宠物粮专区 -->
    <section class="sec food-sec" v-if="foodList.length">
      <div class="sec-inner">
        <div class="sec-head">
          <div>
            <h2>宠物粮 · 今天吃什么</h2>
            <p>从主粮到营养补充，按品类挑对口好粮</p>
          </div>
          <router-link class="more" to="/shop/food">
            进入宠物粮专区
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6"/></svg>
          </router-link>
        </div>
        <div class="food-grid">
          <article class="food-card" v-for="p in foodList" :key="p.goodsId" @click="router.push('/shop/food')">
            <div class="thumb"><img :src="p.image" :alt="p.name" loading="lazy" /></div>
            <div class="body">
              <div class="name">{{ p.name }}</div>
              <div class="row">
                <span class="spec">{{ p.spec }}</span>
                <span class="price">¥{{ p.price }}<i>起</i></span>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>

    <!-- ④ 门店：把「本地直营」这条信任信息摆到页面上（数据来自 /pet/store） -->
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
          <h3>拿不定主意？和门店聊聊</h3>
          <p>选宠、喂养、健康疑问，客服与门店顾问随时帮你解答</p>
        </div>
        <div class="cta-actions">
          <router-link class="btn btn-primary" to="/shop/consult">联系客服</router-link>
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
import { listPetFavorite, addPetFavorite, delPetFavorite } from '@/api/pet/petFavorite'
import { commentStatGroup } from '@/api/pet/petComment'
import { listGoods } from '@/api/pet/petGoods'
import { storeOptions } from '@/api/pet/petStore'
import { useUserStore } from '@/store/modules/user'
import PetCard from './PetCard.vue'
import { PET_GRADIENTS } from './homeData'

const router = useRouter()
const userStore = useUserStore()
const openAuth = inject('openAuth', () => {})

const keyword = ref('')
const petList = ref([])
const allPets = ref([])
const loading = ref(false)
const myFavorites = ref([])
const stores = ref([])
const petsSec = ref(null)

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

function petGradient(id) {
  const c = PET_GRADIENTS[(id || 0) % PET_GRADIENTS.length]
  return `linear-gradient(135deg, ${c[0]}, ${c[1]})`
}
// image 字段可能是图片 URL（/images/... 或 http...），也可能是 emoji 兜底
function isImage(s) { return !!s && (s.indexOf('/') === 0 || s.indexOf('http') === 0) }
function isLogged() { return !!userStore.token }
function isFav(petId) { return myFavorites.value.includes(petId) }

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

// 首页精选顺序：猫 / 狗 / 兔 优先，其余按后台录入顺序
// 后台新增数据通常按分类批量导入，不排的话首屏可能整屏都是水族或爬行
const CAT_PRIORITY = { 1: 0, 2: 1, 3: 2 }
const featuredPets = computed(() => allPets.value.slice().sort((a, b) => {
  const pa = CAT_PRIORITY[a.categoryId] ?? 9
  const pb = CAT_PRIORITY[b.categoryId] ?? 9
  return pa - pb
}))

// 首页只放精选 12 只，完整列表（含品类筛选）在宠物售卖页
const HOME_COUNT = 12
const gridPets = computed(() => featuredPets.value.slice(0, HOME_COUNT))

// 宠物粮精选：每个品类挑一款，展示 4 款
const foodList = ref([])
const petCats = computed(() => new Set(allPets.value.map(p => p.categoryId)).size)
async function loadFood() {
  try {
    const res = await listGoods({ status: '0', pageNum: 1, pageSize: 200 })
    const rows = (res.rows || []).map((g) => ({
      goodsId: g.goodsId,
      image: g.image,
      name: g.goodsName,
      spec: g.spec,
      price: Number(g.price),
      cat: g.cat
    })).filter((g) => g.price > 0)
    const seen = []
    for (const g of rows) {
      if (!seen.includes(g.cat)) { seen.push(g.cat); foodList.value.push(g) }
      if (foodList.value.length >= 4) break
    }
    if (!foodList.value.length) foodList.value = rows.slice(0, 4)
  } catch (e) { /* 接口不可用时不摆空壳 */ }
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

function scrollToPets() {
  petsSec.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// 搜索：跳宠物售卖页出结果
function handleSearch() {
  const kw = keyword.value.trim()
  router.push(kw ? { path: '/shop/pets', query: { kw } } : { path: '/shop/pets' })
}

function goDetail(petId) {
  // from 供详情页返回与导航高亮使用
  router.push({ path: `/shop/pet/${petId}`, query: { from: '/shop/home' } })
}

onMounted(() => {
  loadAllPets()
  loadMyFavorites()
  loadRatings()
  loadStores()
  loadFood()
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
    overflow: hidden; border-radius: var(--radius-md); background: var(--bg-sunken);
    margin: 0;
    img { width: 100%; height: 100%; object-fit: cover; transition: transform .6s cubic-bezier(.2,.7,.3,1); }
    &:hover img { transform: scale(1.04); }
  }
  .m-main { grid-row: span 2; border-radius: var(--radius-lg); background: var(--brand-50);
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

/* ===== 区块通用 ===== */
.sec { padding: 96px 0; }
.sec-inner { max-width: var(--container-lg); margin: 0 auto; padding: 0 24px; }
.sec-head {
  display: flex; align-items: flex-end; justify-content: space-between; gap: 24px;
  margin-bottom: 32px; padding-bottom: 18px; border-bottom: var(--rule);
  h2 { font-size: 26px; font-weight: 700; letter-spacing: -.02em; line-height: 1.25; color: var(--text-1); }
  p { margin-top: 6px; font-size: 13.5px; color: var(--text-3); }
}
.more {
  display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0;
  font-size: 14px; font-weight: 600; color: var(--brand-700);
  background: none; border: 0; font-family: inherit; cursor: pointer; padding: 8px 0; white-space: nowrap;
  text-decoration: none;
  svg { width: 15px; height: 15px; stroke: currentColor; fill: none; stroke-width: 2; transition: transform .16s; }
  &:hover svg { transform: translateX(3px); }
}

/* 网格：4 / 3 / 2 列；卡片已去壳，行距加大靠留白分组 */
.grid {
  display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 26px 16px;
  min-height: 200px;
}
.empty {
  text-align: center; padding: 64px 0; color: var(--text-3);
  p { margin-bottom: 16px; font-size: 14px; }
}

/* ===== ③ 宠物粮精选：与宠物卡同一套扁平语言 ===== */
.food-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 26px 16px; }
.food-card {
  background: none; border: 0; cursor: pointer; text-align: left; font-family: inherit;
  &:hover .thumb { box-shadow: 0 0 0 1px var(--brand-200); }
  .thumb {
    height: 180px; background: var(--bg-sunken); border-radius: var(--radius-md);
    overflow: hidden; transition: box-shadow .2s;
    img { width: 100%; height: 100%; object-fit: cover; transition: transform .3s; }
    &:hover img { transform: scale(1.05); }
  }
  .body { padding: 12px 2px 0; }
  .name { font-size: 15px; font-weight: 600; color: var(--text-1); margin-bottom: 6px; }
  .row { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
  .spec { font-size: 13px; color: var(--text-3); }
  .price { font-size: 17px; font-weight: 700; color: var(--price); font-variant-numeric: tabular-nums;
    i { font-style: normal; font-size: 11.5px; color: var(--text-3); font-weight: 400; margin-left: 1px; } }
}

/* ===== ④ 门店：去卡化，列间 1px 细线，与整页扁平语言一致 ===== */
.stores { border-top: var(--rule); }
.store-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }
.store {
  display: flex; flex-direction: column; gap: 12px;
  padding: 0 28px; border-left: var(--rule-soft);
  &:first-child { border-left: 0; padding-left: 0; }
  &:last-child { padding-right: 0; }
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
  .grid, .food-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .hero-media { height: 420px; }
}
@media (max-width: 1000px) {
  .hero-inner { grid-template-columns: 1fr; gap: 32px; padding: 48px 24px 56px; }
  .hero-media { height: auto; aspect-ratio: 1.55; }
  .media-badge { left: 12px; bottom: 12px; }
  .sec { padding: 64px 0; }
  .store-grid { grid-template-columns: 1fr; }
  .store { padding: 0; border-left: 0;
    & + .store { margin-top: 20px; padding-top: 20px; border-top: var(--rule-soft); } }
  .cta-inner { flex-direction: column; align-items: flex-start; padding: 24px; }
  .cta-band { padding: 0 0 64px; }
}
@media (max-width: 768px) {
  .hero-inner { padding: 32px 16px 40px; }
  .sec-inner { padding: 0 16px; }
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
    .m-main { grid-row: auto; grid-column: 1 / -1; aspect-ratio: 16 / 9; border-radius: var(--radius-md); }
    figure:not(.m-main) { aspect-ratio: 1 / 1; border-radius: var(--radius-sm); }
  }
  .media-badge { display: none; }

  .sec { padding: 48px 0; }
  .sec-head { h2 { font-size: 21px; } p { margin-top: 4px; font-size: 12.5px; } }
  .more { font-size: 13px; }
  .grid, .food-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px 10px; }
  .food-card .thumb { height: auto; aspect-ratio: 1 / 1; border-radius: var(--radius-sm); }
  .cta-inner h3 { font-size: 17px; }
  .cta-actions { width: 100%;
    .btn { flex: 1; padding: 0 12px; font-size: 14px; } }
}
@media (max-width: 480px) {
  .hero-cta { flex-direction: column; }
  .hero-cta .btn { width: 100%; }
}
</style>
