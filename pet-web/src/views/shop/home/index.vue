<template>
  <div class="boqii-home">
    <!-- ① 服务栏 -->
    <div class="service-bar">
      <div class="service-inner">
        <span class="welcome">🐾 欢迎来到宠物之家，让每一个生命都被温柔以待</span>
        <div class="service-right">
          <template v-if="!isLogged">
            <a @click="openAuth('login')">登录</a>
            <span class="sep">|</span>
            <a @click="openAuth('register')">注册</a>
          </template>
          <template v-else>
            <span class="user">👤 {{ userStore.name || '用户' }}</span>
            <span class="sep">|</span>
            <a @click="router.push('/shop/favorite')">我的收藏</a>
            <span class="sep">|</span>
            <a @click="router.push('/shop/appointment')">我的预约</a>
            <span class="sep">|</span>
            <a @click="logout">退出</a>
          </template>
        </div>
      </div>
    </div>

    <!-- ② 主导航：logo + 搜索 + 购物车 -->
    <div class="main-header">
      <div class="header-inner">
        <div class="logo" @click="router.push('/shop/home')">
          <span class="logo-emoji">🏠</span>
          <span class="logo-text">宠物之家<em>BOQII</em></span>
        </div>
        <div class="search-box">
          <el-input v-model="keyword" placeholder="搜索宠物名称或品种…" size="large" clearable @keyup.enter="handleSearch">
            <template #append>
              <el-button :icon="Search" @click="handleSearch">搜索</el-button>
            </template>
          </el-input>
        </div>
        <div class="header-actions">
          <div class="action-item" @click="router.push('/shop/favorite')">
            <span class="action-icon">❤️</span>
            <span class="action-text">收藏</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ③ 分类导航条：可按统称类 / 科系 切换 -->
    <div class="category-bar">
      <div class="category-inner">
        <div class="cat-all">
          <span>☰</span> 全部分类
        </div>
        <div class="cat-mode">
          <span class="mode-btn" :class="{active: navMode==='group'}" @click="navMode='group'">统称分类</span>
          <span class="mode-btn" :class="{active: navMode==='family'}" @click="navMode='family'">按科系</span>
        </div>
        <div class="cat-tabs">
          <span class="cat-tab" :class="{active: !activeFilter}" @click="clearFilter()">全部</span>
          <template v-if="navMode==='group'">
            <span class="cat-tab" v-for="g in groups" :key="g.name" :class="{active: activeType==='group' && activeValue===g.name}" @click="applyFilter('group', g.name)">
              {{ g.name }} <em>({{ g.list.length }})</em>
            </span>
          </template>
          <template v-else>
            <span class="cat-tab" v-for="f in families" :key="f.name" :class="{active: activeType==='family' && activeValue===f.name}" @click="applyFilter('family', f.name)">
              {{ f.name }}
            </span>
          </template>
        </div>
      </div>
    </div>

    <!-- ④ Hero Banner -->
    <section class="hero">
      <div class="hero-bg"></div>
      <div class="hero-inner">
        <div class="hero-text">
          <span class="hero-badge">🐾 信赖宠物之家 · 健康保障</span>
          <h1>找到你的<em>心仪伙伴</em></h1>
          <p>每一只宠物都经过健康筛查，等待一个温暖的家。<br/>浏览 · 收藏 · 预约，三步遇见你的小伙伴。</p>
          <div class="hero-cta" @click="router.push('/shop/match')">
            <span class="cta-icon">🤖</span>
            <span class="cta-body">
              <strong>不知道养什么？试试 AI 智能选宠</strong>
              <em>10 道题，30 秒为你匹配最合拍的伙伴 →</em>
            </span>
          </div>
          <div class="hero-stats">
            <div class="stat"><span class="num">{{ petCount }}</span><span class="lbl">在售宠物</span></div>
            <div class="stat"><span class="num">{{ categoryCount }}</span><span class="lbl">宠物分类</span></div>
            <div class="stat"><span class="num">100%</span><span class="lbl">健康保障</span></div>
          </div>
        </div>
      </div>
    </section>

    <!-- ⑤ 服务承诺 -->
    <section class="features">
      <div class="features-inner">
        <div class="feature" v-for="f in features" :key="f.title">
          <span class="feature-icon">{{ f.icon }}</span>
          <div>
            <h3>{{ f.title }}</h3>
            <p>{{ f.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ⑤½ 宠物粮专区推荐 -->
    <section class="food-promo">
      <div class="food-promo-inner">
        <div class="food-head">
          <div class="food-title">
            <span class="food-emoji">🛒</span>
            <div>
              <h2>宠物粮专区</h2>
              <p>覆盖猫狗兔仓鼠鸟鱼爬行全 7 类 · 科学配比 · 严选好粮</p>
            </div>
          </div>
          <a class="food-more" @click="router.push('/shop/food')">查看全部 14 款粮 →</a>
        </div>
        <div class="food-grid">
          <div class="food-card" v-for="item in featuredFoods" :key="item.name" @click="router.push('/shop/food')">
            <div class="food-img">
              <img :src="item.image" :alt="item.name" loading="lazy" />
            </div>
            <div class="food-body">
              <div class="food-cat"><span class="dot" :style="{ background: item.color }"></span>{{ item.catName }}</div>
              <div class="food-name">{{ item.name }}</div>
              <div class="food-spec">{{ item.spec }}</div>
              <div class="food-bottom">
                <span class="food-price">¥<em>{{ item.price }}</em></span>
                <span class="food-btn">去看看</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ⑥ 楼层式宠物展示（波奇网核心格式）-->
    <section class="floors" v-loading="loading">
      <div class="floors-inner">
        <!-- 搜索/筛选结果模式 -->
        <template v-if="showResult">
          <div class="floor">
            <div class="floor-head">
              <h2><span class="floor-emoji">🔍</span> {{ resultTitle }}</h2>
              <span class="floor-count">共 {{ resultCount }} 只</span>
            </div>
            <div class="grid" v-if="resultPets.length">
              <div class="pet-card" v-for="pet in resultPets" :key="pet.petId" @click="goDetail(pet.petId)">
                <div class="pet-image" :style="{ background: petGradient(pet.petId) }">
                  <img v-if="isImage(pet.image)" :src="pet.image" :alt="pet.petName" class="pet-photo" loading="lazy" />
                  <span v-else class="pet-emoji">{{ petEmoji(pet.categoryId) }}</span>
                  <span class="fav-mark" v-if="isFav(pet.petId)">❤️</span>
                  <span class="status-tag" v-if="pet.status === '1'">已售</span>
                </div>
                <div class="pet-body">
                  <div class="pet-title">{{ pet.petName }}</div>
                  <div class="pet-desc">{{ pet.description || '暂无描述' }}</div>
                  <div class="pet-meta">
                    <el-tag size="small" type="info">{{ pet.breed || '未知品种' }}</el-tag>
                    <el-tag size="small" v-if="pet.age">{{ pet.age }}</el-tag>
                    <el-tag size="small" type="warning">{{ genderText(pet.gender) }}</el-tag>
                  </div>
                  <div class="pet-bottom">
                    <span class="pet-price" v-if="pet.price > 0">¥<em>{{ pet.price }}</em></span>
                    <span class="pet-price free" v-else>协商领养</span>
                    <span class="fav-btn" :class="{ active: isFav(pet.petId) }" @click.stop="toggleFav(pet.petId)">
                      {{ isFav(pet.petId) ? '❤️' : '🤍' }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="empty">
              <span class="empty-icon">😿</span>
              <p>没有找到相关宠物</p>
            </div>
          </div>
        </template>

        <!-- 楼层模式：每个分类一个楼层 -->
        <template v-else>
          <div class="floor" v-for="cat in categories" :key="cat.categoryId">
            <div class="floor-head">
              <h2><span class="floor-emoji">{{ catEmoji(cat.categoryId) }}</span> {{ cat.categoryName }}专区</h2>
              <a class="floor-more" @click="applyFilter('category', cat.categoryId)">查看更多 →</a>
            </div>
            <p class="floor-desc">{{ cat.remark || '' }}</p>
            <div class="grid" v-if="floorPets(cat.categoryId).length">
              <div class="pet-card" v-for="pet in floorPets(cat.categoryId)" :key="pet.petId" @click="goDetail(pet.petId)">
                <div class="pet-image" :style="{ background: petGradient(pet.petId) }">
                  <img v-if="isImage(pet.image)" :src="pet.image" :alt="pet.petName" class="pet-photo" loading="lazy" />
                  <span v-else class="pet-emoji">{{ petEmoji(pet.categoryId) }}</span>
                  <span class="fav-mark" v-if="isFav(pet.petId)">❤️</span>
                  <span class="status-tag" v-if="pet.status === '1'">已售</span>
                </div>
                <div class="pet-body">
                  <div class="pet-title">{{ pet.petName }}</div>
                  <div class="pet-desc">{{ pet.description || '暂无描述' }}</div>
                  <div class="pet-meta">
                    <el-tag size="small" type="info">{{ pet.breed || '未知品种' }}</el-tag>
                    <el-tag size="small" v-if="pet.age">{{ pet.age }}</el-tag>
                    <el-tag size="small" type="warning">{{ genderText(pet.gender) }}</el-tag>
                  </div>
                  <div class="pet-bottom">
                    <span class="pet-price" v-if="pet.price > 0">¥<em>{{ pet.price }}</em></span>
                    <span class="pet-price free" v-else>协商领养</span>
                    <span class="fav-btn" :class="{ active: isFav(pet.petId) }" @click.stop="toggleFav(pet.petId)">
                      {{ isFav(pet.petId) ? '❤️' : '🤍' }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </section>

    <!-- ⑦ 品牌承诺 -->
    <section class="promise">
      <div class="promise-inner">
        <h2>为什么选择宠物之家？</h2>
        <div class="promise-grid">
          <div class="promise-item" v-for="p in promises" :key="p.title">
            <span class="p-icon">{{ p.icon }}</span>
            <div>
              <h4>{{ p.title }}</h4>
              <p>{{ p.desc }}</p>
            </div>
          </div>
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
import { FOOD_CATEGORIES, FOOD_LIST } from '@/views/shop/food/foodData'
import { useUserStore } from '@/store/modules/user'

const router = useRouter()
const userStore = useUserStore()
const openAuth = inject('openAuth', () => {})

const keyword = ref('')
const selectedCategory = ref('')
const navMode = ref('group')        // 'group'=统称分类 | 'family'=按科系
const activeType = ref('')          // '' | 'category' | 'group' | 'family'
const activeValue = ref('')         // categoryId / groupName / family
const categories = ref([])
const petList = ref([])
const allPets = ref([])  // 楼层模式用：所有宠物
const total = ref(0)
const petCount = ref(0)
const categoryCount = ref(0)
const loading = ref(false)
const myFavorites = ref([])

const features = [
  { icon: '🩺', title: '健康筛查', desc: '每只宠物入站前完成体检' },
  { icon: '📸', title: '真实信息', desc: '实物拍摄，所见即所得' },
  { icon: '📋', title: '专业养护', desc: '科学喂养，记录完整' },
  { icon: '🤝', title: '售后无忧', desc: '领养后持续指导陪伴' }
]
const promises = [
  { icon: '✅', title: '来源透明', desc: '每只宠物可追溯来源，拒绝来路不明' },
  { icon: '💉', title: '疫苗齐全', desc: '基础疫苗接种完成，健康有保障' },
  { icon: '🏠', title: '温馨过渡', desc: '到家的过渡期，我们全程协助' },
  { icon: '❤️', title: '终身咨询', desc: '领养只是开始，养护问题随时咨询' }
]

const emojiPool = ['🐶', '🐱', '🐰', '🐹', '🐦', '🐢', '🐟', '🦎']
const catEmojiMap = {'猫咪':'🐱','狗狗':'🐶','兔子':'🐰','仓鼠':'🐹','鸟类':'🐦','水族':'🐠','猫':'🐱','狗':'🐶','兔':'🐰','仓':'🐹','鸟':'🐦','鱼':'🐠'}
function petEmoji(c) { return emojiPool[(c || 0) % emojiPool.length] }
function catEmoji(id) {
  const c = categories.value.find(c => c.categoryId === id)
  return c ? (catEmojiMap[c.categoryName] || '🐾') : '🐾'
}
function petGradient(id) {
  const colors = [
    ['#fff4e6', '#ffe0b3'], ['#e8f5e9', '#c8e6c9'], ['#e3f2fd', '#bbdefb'], ['#fce4ec', '#f8bbd0'],
    ['#f3e5f5', '#e1bee7'], ['#fff8e1', '#ffecb3'], ['#e0f7fa', '#b2ebf2'], ['#fce4ec', '#f8bbd0']
  ]
  const c = colors[(id || 0) % colors.length]
  return `linear-gradient(135deg, ${c[0]}, ${c[1]})`
}
function genderText(g) { return g === '0' ? '公' : g === '1' ? '母' : '未知' }

// 首页宠物粮推荐：每类取 1 款主推，带分类中文名与主题色
const catNameMap = FOOD_CATEGORIES.reduce((m, c) => { m[c.id] = c.name; return m }, {})
const catColorMap = FOOD_CATEGORIES.reduce((m, c) => { m[c.id] = c.color; return m }, {})
const featuredFoods = computed(() => {
  const seen = new Set()
  const result = []
  for (const f of FOOD_LIST) {
    if (!seen.has(f.cat)) {
      seen.add(f.cat)
      result.push({ ...f, catName: catNameMap[f.cat], color: catColorMap[f.cat] })
    }
  }
  return result
})
// image 字段可能是图片 URL（/images/... 或 http...），也可能是 emoji 兜底
function isImage(s) { return !!s && (s.indexOf('/') === 0 || s.indexOf('http') === 0) }
function isLogged() { return !!userStore.token }
function isFav(petId) { return myFavorites.value.includes(petId) }

const selectedCategoryName = computed(() => {
  const c = categories.value.find(c => c.categoryId === selectedCategory.value)
  return c ? c.categoryName : ''
})
const selectedCategoryEmoji = computed(() => {
  return selectedCategory.value ? catEmoji(selectedCategory.value) : '🔍'
})

// 统称类分组（如 猫狗/小宠/水族/爬行）
const groups = computed(() => {
  const m = {}
  for (const c of categories.value) {
    const g = c.groupName || '其他'
    if (!m[g]) m[g] = { name: g, list: [] }
    m[g].list.push(c)
  }
  return Object.values(m)
})
// 科系分组（如 猫科/犬科/兔科…）
const families = computed(() => {
  const m = {}
  for (const c of categories.value) {
    const f = c.family || '未知'
    if (!m[f]) m[f] = { name: f, list: [] }
    m[f].list.push(c)
  }
  return Object.values(m)
})
const activeFilter = computed(() => activeType.value !== '')
const displayPets = computed(() => {
  if (!activeFilter.value) return allPets.value
  if (activeType.value === 'category') return allPets.value.filter(p => p.categoryId === activeValue.value)
  if (activeType.value === 'group') {
    const g = groups.value.find(x => x.name === activeValue.value)
    const ids = (g ? g.list : []).map(c => c.categoryId)
    return allPets.value.filter(p => ids.includes(p.categoryId))
  }
  if (activeType.value === 'family') {
    const f = families.value.find(x => x.name === activeValue.value)
    const ids = (f ? f.list : []).map(c => c.categoryId)
    return allPets.value.filter(p => ids.includes(p.categoryId))
  }
  return allPets.value
})
const showResult = computed(() => !!keyword.value || activeFilter.value)
const resultPets = computed(() => keyword.value ? petList.value : displayPets.value)
const resultTitle = computed(() => keyword.value ? '搜索结果' : (activeValue.value || '全部'))
const resultCount = computed(() => keyword.value ? total.value : displayPets.value.length)

// 楼层模式：取每个分类的前6只
function floorPets(catId) {
  return allPets.value.filter(p => p.categoryId === catId).slice(0, 6)
}

async function loadCategories() {
  try {
    const res = await listCategory({ pageNum: 1, pageSize: 100 })
    categories.value = res.rows || []
    categoryCount.value = categories.value.length
  } catch (e) { console.warn('分类加载失败', e) }
}

async function loadAllPets() {
  loading.value = true
  try {
    const res = await listPetInfo({ pageNum: 1, pageSize: 1000 })
    allPets.value = res.rows || []
    petCount.value = res.total || 0
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
    if (selectedCategory.value) query.categoryId = selectedCategory.value
    if (keyword.value) query.petName = keyword.value
    const res = await listPetInfo(query)
    petList.value = res.rows || []
    total.value = res.total || 0
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
      ElMessage.success('收藏成功 ❤️')
    } catch (e) { ElMessage.error(e?.message || '收藏失败') }
  }
}

function applyFilter(type, value) {
  activeType.value = type
  activeValue.value = value
  keyword.value = ''
  selectedCategory.value = ''
  document.querySelector('.floors')?.scrollIntoView({ behavior: 'smooth' })
}

function clearFilter() {
  activeType.value = ''
  activeValue.value = ''
  keyword.value = ''
  selectedCategory.value = ''
  document.querySelector('.floors')?.scrollIntoView({ behavior: 'smooth' })
}

function selectCategory(catId) {
  applyFilter('category', catId)
}

function handleSearch() {
  if (keyword.value) {
    activeType.value = ''
    activeValue.value = ''
    selectedCategory.value = ''
    loadPets()
    document.querySelector('.floors')?.scrollIntoView({ behavior: 'smooth' })
  }
}

function goDetail(petId) {
  router.push(`/shop/pet/${petId}`)
}

function logout() {
  userStore.resetState()
  ElMessage.success('已退出登录')
}

onMounted(() => {
  loadCategories()
  loadAllPets()
  loadMyFavorites()
})
</script>

<style scoped lang="scss">
/* ① 服务栏 */
.service-bar { background: #f5f5f5; border-bottom: 1px solid #eee; font-size: 12px; color: #666; }
.service-inner { max-width: 1200px; margin: 0 auto; padding: 6px 24px; display: flex; justify-content: space-between; align-items: center; }
.welcome { color: #888; }
.service-right { display: flex; align-items: center; gap: 6px;
  a { color: #ff6b35; cursor: pointer; &:hover { text-decoration: underline; } }
  .sep { color: #ccc; }
  .user { color: #333; font-weight: 500; }
}

/* ② 主导航 */
.main-header { background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,.04); }
.header-inner { max-width: 1200px; margin: 0 auto; padding: 16px 24px; display: flex; align-items: center; gap: 32px; }
.logo { display: flex; align-items: center; gap: 8px; cursor: pointer; flex-shrink: 0;
  .logo-emoji { font-size: 32px; }
  .logo-text { font-size: 24px; font-weight: 800; color: #ff6b35; em { font-style: normal; font-size: 12px; color: #999; margin-left: 4px; vertical-align: super; } }
}
.search-box { flex: 1; max-width: 560px; }
.header-actions { display: flex; gap: 20px; }
.action-item { display: flex; flex-direction: column; align-items: center; cursor: pointer; color: #666; transition: color .2s;
  &:hover { color: #ff6b35; }
  .action-icon { font-size: 22px; }
  .action-text { font-size: 12px; margin-top: 2px; }
}

/* ③ 分类导航条 */
.category-bar { background: #fff; border-top: 2px solid #ff6b35; }
.category-inner { max-width: 1200px; margin: 0 auto; padding: 0 24px; display: flex; align-items: center; gap: 20px; }
.cat-all { background: #ff6b35; color: #fff; padding: 10px 20px; font-size: 15px; font-weight: 600; cursor: pointer; flex-shrink: 0; }
.cat-mode { display: flex; gap: 4px; flex-shrink: 0; margin-right: 4px;
  .mode-btn { font-size: 13px; color: #666; cursor: pointer; padding: 5px 12px; border-radius: 14px; border: 1px solid #eee; background: #fafafa; transition: all .2s;
    &:hover { color: #ff6b35; border-color: #ffd4a8; }
    &.active { background: #ff6b35; color: #fff; border-color: #ff6b35; }
  }
}
.cat-tabs { display: flex; gap: 24px; overflow-x: auto; padding: 10px 0; }
.cat-tab { white-space: nowrap; font-size: 14px; color: #333; cursor: pointer; padding: 6px 4px; border-bottom: 2px solid transparent; transition: all .2s;
  &:hover, &.active { color: #ff6b35; border-bottom-color: #ff6b35; }
}

/* ④ Hero */
.hero { position: relative; min-height: 420px; display: flex; align-items: center; overflow: hidden; }
.hero-bg { position: absolute; inset: 0; background: linear-gradient(135deg, #ff8c42 0%, #ffb347 40%, #ffd699 100%); }
.hero-bg::after { content: '🐾'; position: absolute; font-size: 200px; opacity: .08; right: 5%; top: 10%; }
.hero-inner { position: relative; z-index: 2; max-width: 1200px; margin: 0 auto; padding: 56px 24px; width: 100%; }
.hero-text { max-width: 560px; color: #fff;
  .hero-badge { display: inline-block; background: rgba(255,255,255,.25); padding: 4px 14px; border-radius: 20px; font-size: 13px; margin-bottom: 16px; }
  h1 { font-size: 42px; margin: 0 0 16px; line-height: 1.2; em { font-style: normal; color: #fff7e6; border-bottom: 4px solid rgba(255,255,255,.5); } }
  p { font-size: 15px; opacity: .95; margin: 0 0 20px; line-height: 1.7; }
  .hero-cta { display: inline-flex; align-items: center; gap: 12px; background: rgba(255,255,255,.16);
    border: 1px solid rgba(255,255,255,.45); border-radius: 14px; padding: 12px 18px; cursor: pointer;
    transition: all .2s; margin-bottom: 8px;
    &:hover { background: rgba(255,255,255,.28); transform: translateY(-2px); }
    .cta-icon { font-size: 26px; }
    .cta-body { display: flex; flex-direction: column; gap: 2px; text-align: left;
      strong { font-size: 14px; } em { font-style: normal; font-size: 12px; opacity: .88; } }
  }
  .hero-stats { display: flex; gap: 40px; margin-top: 32px;
    .stat { .num { font-size: 26px; font-weight: 700; display: block; } .lbl { font-size: 13px; opacity: .9; } }
  }
}

/* ⑤ 特色卡 */
.features { background: #fff; padding: 36px 0; border-bottom: 1px solid #f5f5f5; }
.features-inner { max-width: 1200px; margin: 0 auto; padding: 0 24px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; }
.feature { display: flex; gap: 12px; align-items: center;
  .feature-icon { font-size: 36px; flex-shrink: 0; }
  h3 { font-size: 16px; color: #303133; margin: 0 0 4px; }
  p { font-size: 12px; color: #909399; margin: 0; }
}

/* ⑤½ 宠物粮推荐 */
.food-promo { background: linear-gradient(135deg, #fff7ef 0%, #fffdfa 100%); padding: 36px 0; border-bottom: 1px solid #f5f5f5; }
.food-promo-inner { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
.food-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;
  .food-title { display: flex; align-items: center; gap: 14px;
    .food-emoji { font-size: 40px; flex-shrink: 0; }
    h2 { font-size: 24px; color: #303133; margin: 0 0 4px; }
    p { font-size: 13px; color: #909399; margin: 0; }
  }
  .food-more { color: #ff6b35; font-size: 14px; cursor: pointer; font-weight: 600; &:hover { text-decoration: underline; } }
}
.food-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 16px; }
.food-card { background: #fff; border: 1px solid #f0f0f0; border-radius: 10px; overflow: hidden; cursor: pointer; transition: all .2s;
  &:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(255,107,53,.15); border-color: #ffd4a8; }
  .food-img { height: 130px; background: #fafafa; display: flex; align-items: center; justify-content: center; overflow: hidden;
    img { width: 100%; height: 100%; object-fit: cover; transition: transform .3s; }
    &:hover img { transform: scale(1.06); }
  }
  .food-body { padding: 10px 12px 12px; }
  .food-cat { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #909399; margin-bottom: 4px;
    .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
  }
  .food-name { font-size: 14px; font-weight: 600; color: #303133; margin-bottom: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .food-spec { font-size: 12px; color: #b0b3b8; margin-bottom: 8px; }
  .food-bottom { display: flex; align-items: center; justify-content: space-between; }
  .food-price { color: #ff6b35; font-size: 12px; em { font-style: normal; font-size: 17px; font-weight: 700; } }
  .food-btn { font-size: 12px; color: #fff; background: #ff6b35; padding: 3px 10px; border-radius: 12px; }
}

/* ⑥ 楼层 */
.floors { background: #f7f7f7; padding: 32px 0; min-height: 400px; }
.floors-inner { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
.floor { background: #fff; border-radius: 8px; overflow: hidden; margin-bottom: 24px; padding: 24px; }
.floor-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;
  h2 { font-size: 22px; color: #303133; margin: 0; .floor-emoji { font-size: 26px; margin-right: 8px; } }
  .floor-count { font-size: 13px; color: #909399; }
  .floor-more { color: #ff6b35; font-size: 14px; cursor: pointer; &:hover { text-decoration: underline; } }
}
.floor-desc { font-size: 13px; color: #909399; margin: 0 0 20px; }

.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
.empty { text-align: center; padding: 60px 0; color: #c0c4cc;
  .empty-icon { font-size: 48px; display: block; margin-bottom: 8px; }
}

/* 商品卡片（波奇网风格）*/
.pet-card { background: #fff; border: 1px solid #f0f0f0; border-radius: 8px; overflow: hidden; cursor: pointer; transition: all .2s;
  &:hover { transform: translateY(-3px); box-shadow: 0 6px 20px rgba(0,0,0,.1); border-color: #ffd4a8; }
  .pet-image { height: 180px; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden;
    .pet-emoji { font-size: 72px; transition: transform .3s; }
    &:hover .pet-emoji { transform: scale(1.15); }
    .pet-photo { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .3s; background: #fafafa; }
    &:hover .pet-photo { transform: scale(1.06); }
    .fav-mark { position: absolute; top: 8px; right: 10px; font-size: 18px; }
    .status-tag { position: absolute; top: 8px; left: 10px; background: rgba(0,0,0,.5); color: #fff; font-size: 11px; padding: 2px 8px; border-radius: 3px; }
  }
  .pet-body { padding: 12px 14px; }
  .pet-title { font-size: 15px; font-weight: 600; color: #303133; margin-bottom: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .pet-desc { font-size: 12px; color: #909399; line-height: 1.5; margin-bottom: 8px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; height: 36px; }
  .pet-meta { display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 8px; }
  .pet-bottom { display: flex; align-items: center; justify-content: space-between; padding-top: 8px; border-top: 1px solid #f5f5f5; }
  .pet-price { color: #ff6b35; font-size: 13px; em { font-style: normal; font-size: 20px; font-weight: 700; } &.free { color: #67c23a; font-size: 14px; font-weight: 600; } }
  .fav-btn { font-size: 20px; cursor: pointer; transition: transform .15s; &:hover { transform: scale(1.25); } }
}

/* ⑦ 品牌承诺 */
.promise { background: linear-gradient(135deg, #fff7ef 0%, #fff 100%); padding: 48px 0; }
.promise-inner { max-width: 1000px; margin: 0 auto; padding: 0 24px;
  h2 { text-align: center; font-size: 24px; color: #303133; margin: 0 0 32px; }
}
.promise-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
.promise-item { display: flex; gap: 14px; align-items: flex-start;
  .p-icon { font-size: 28px; flex-shrink: 0; }
  h4 { font-size: 15px; color: #303133; margin: 0 0 4px; }
  p { color: #909399; font-size: 13px; margin: 0; line-height: 1.5; }
}

@media (max-width: 768px) {
  .features-inner, .promise-grid { grid-template-columns: 1fr 1fr; }
  .hero-text h1 { font-size: 28px; }
  .header-inner { flex-wrap: wrap; }
  .search-box { order: 3; flex: 1 1 100%; max-width: none; }
}
</style>
