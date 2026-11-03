<template>
  <div class="disp">
    <!-- 顶栏 -->
    <header class="disp-head">
      <div class="brand">
        <router-link to="/shop/home" class="back">← 返回商城</router-link>
        <span class="paw">🐾</span> 宠物之家 · PET HOME
      </div>
      <h1 class="disp-title">门店展示大屏</h1>
      <div class="clock">
        <span class="time">{{ clock.time }}</span>
        <span class="date">{{ clock.date }}</span>
      </div>
    </header>

    <main class="disp-main">
      <!-- 左：顾客好评 -->
      <section class="panel side">
        <h2 class="panel-title">顾客好评</h2>
        <div class="score-hero">
          <div class="score-num">{{ rating.avgScore || '0.0' }}</div>
          <div class="score-meta">
            <div class="stars">
              <span v-for="i in 5" :key="i" class="star" :class="{ on: i <= Math.round(rating.avgScore || 0) }">★</span>
            </div>
            <p class="muted">累计 <b>{{ rating.total || 0 }}</b> 条评价 · 近 7 天 <b class="teal">+{{ recentCount }}</b></p>
          </div>
        </div>

        <div class="dist">
          <div v-for="d in rating.dist || []" :key="d.name" class="dist-row">
            <span class="dist-name">{{ d.name }}</span>
            <div class="dist-bar"><i :style="{ width: distPct(d.value) + '%' }"></i></div>
            <span class="dist-val">{{ d.value }}</span>
          </div>
        </div>

        <div class="block">
          <div class="block-head">
            <span>评分走势 · 近 12 周</span>
            <b>{{ trendDelta }}</b>
          </div>
          <div class="trend">
            <svg viewBox="0 0 300 96" preserveAspectRatio="none" class="trend-svg">
              <defs>
                <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#53d1ff" stop-opacity="0.45" />
                  <stop offset="100%" stop-color="#53d1ff" stop-opacity="0" />
                </linearGradient>
              </defs>
              <polygon :points="trendArea" fill="url(#tg)" />
              <polyline :points="trendLine" fill="none" stroke="#53d1ff" stroke-width="2" stroke-linejoin="round" />
              <circle v-for="(p, i) in trendPoints" :key="i" :cx="p.x" :cy="p.y" r="2.2" fill="#9ff0ff" />
            </svg>
            <div class="trend-labels">
              <span v-for="(l, i) in trendLabels" :key="i">{{ l }}</span>
            </div>
          </div>
        </div>

        <div class="block">
          <div class="block-head"><span>好评关键词</span><b>{{ keywords.length }} 个</b></div>
          <div class="cloud">
            <span
              v-for="k in keywords"
              :key="k.word"
              class="tag"
              :style="{ fontSize: tagSize(k.hits) + 'px', opacity: 0.55 + Math.min(k.hits / maxHits, 1) * 0.45 }"
            >
              {{ k.word }} <i>{{ k.hits }}</i>
            </span>
          </div>
        </div>
      </section>

      <!-- 中：三层 3D 旋转环（全部在售宠物） -->
      <section class="stage">
        <div class="scene" @mouseenter="paused = true" @mouseleave="paused = false">
          <div class="core">
            <span class="core-num">{{ petsTotal }}</span>
            <span class="core-text">只在售宠物<br />全部完成健康筛查</span>
          </div>

          <!-- 内层：精选 10 张大图 -->
          <div class="ring ring-inner" :class="{ paused }" :style="{ '--r': '250px' }">
            <div
              v-for="(p, i) in innerPets"
              :key="'i' + p.petId"
              class="ring-card big"
              :style="{ '--a': (360 / (innerPets.length || 1)) * i + 'deg' }"
              @click="goPet(p)"
            >
              <img :src="p.image" :alt="p.petName" />
              <div class="ring-info">
                <span class="pet-name">{{ p.petName }}</span>
                <span class="pet-price">¥{{ p.price }}</span>
              </div>
            </div>
          </div>

          <!-- 中层：每 3 只取 1 只 -->
          <div class="ring ring-mid" :class="{ paused }" :style="{ '--r': '470px' }">
            <div
              v-for="(p, i) in midPets"
              :key="'m' + p.petId"
              class="ring-card mid"
              :style="{ '--a': (360 / (midPets.length || 1)) * i + 'deg' }"
              @click="goPet(p)"
            >
              <img :src="p.image" :alt="p.petName" loading="lazy" />
            </div>
          </div>

          <!-- 外层：全部在售宠物 -->
          <div class="ring ring-outer" :class="{ paused }" :style="{ '--r': '760px' }">
            <div
              v-for="(p, i) in pets"
              :key="'o' + p.petId"
              class="ring-card mini"
              :style="{ '--a': (360 / (pets.length || 1)) * i + 'deg' }"
              @click="goPet(p)"
            >
              <img :src="p.image" :alt="p.petName" loading="lazy" />
            </div>
          </div>

          <div class="stage-glow"></div>
        </div>
        <p class="stage-tip">全部 {{ petsTotal }} 只在售宠物环绕展示 · 悬停暂停 · 点击查看详情</p>
        <div class="stage-strip">
          <div class="strip-item"><b>{{ petsTotal }}</b><span>在售宠物</span></div>
          <div class="strip-item"><b>{{ funnel.paidOrders || 0 }}</b><span>累计成交</span></div>
          <div class="strip-item"><b>{{ wallet.users || 0 }}</b><span>注册会员</span></div>
          <div class="strip-item"><b>{{ rating.total || 0 }}</b><span>累计评价</span></div>
          <div class="strip-item"><b class="up">+{{ recentCount }}</b><span>近 7 天评价</span></div>
        </div>
      </section>

      <!-- 右：复购口碑 -->
      <section class="panel side">
        <h2 class="panel-title">复购 · 口碑</h2>
        <div class="kpis">
          <div class="kpi">
            <span class="kpi-label">复购率</span>
            <b class="kpi-val teal">{{ kpi.repeatRate ?? 0 }}<i>%</i></b>
          </div>
          <div class="kpi">
            <span class="kpi-label">服务完成率</span>
            <b class="kpi-val gold">{{ kpi.serviceFinishRate ?? 0 }}<i>%</i></b>
          </div>
        </div>

        <div class="block">
          <div class="block-head"><span>复购客户</span><b>{{ repeatStats.users || 0 }} 位成交客户</b></div>
          <div class="rep-summary">
            <div class="rep-cell">
              <b>{{ repeatStats.repeatUsers || 0 }}</b>
              <span>复购客户</span>
            </div>
            <div class="rep-cell">
              <b>{{ repeatStats.avgOrders || 0 }}</b>
              <span>人均下单</span>
            </div>
            <div class="rep-cell">
              <b>{{ kpi.paidUsers || 0 }}</b>
              <span>付费客户</span>
            </div>
          </div>
        </div>

        <div class="block">
          <div class="block-head"><span>服务热度 TOP</span><b>累计成交</b></div>
          <div class="svc-list">
            <div v-for="(s, i) in services" :key="s.name" class="svc-row">
              <span class="svc-rank" :class="{ hot: i < 3 }">{{ i + 1 }}</span>
              <span class="svc-name">{{ s.name }}</span>
              <div class="svc-bar"><i :style="{ width: svcPct(s.value) + '%' }"></i></div>
              <span class="svc-val">{{ s.value }}</span>
            </div>
          </div>
        </div>

        <div class="block">
          <div class="block-head"><span>门店评分</span><b>满分 5.0</b></div>
          <ul class="store-list">
            <li v-for="s in storeRating" :key="s.name" class="store-row">
              <span class="store-name">{{ s.name }}</span>
              <span class="store-stars">{{ '★'.repeat(Math.round(s.score || 0)) }}</span>
              <b class="store-score">{{ s.score }}</b>
              <span class="store-total">{{ s.total }} 条</span>
            </li>
          </ul>
        </div>

        <div class="block grow">
          <div class="block-head"><span>最新好评</span><b>{{ goodComments.length }} 条</b></div>
          <ul class="gd-list">
            <li v-for="(c, i) in goodComments" :key="i" class="gd-item">
              <div class="gd-top">
                <span class="gd-stars">{{ '★'.repeat(c.score || 5) }}</span>
                <span class="gd-user">{{ c.userName || '顾客' }}</span>
                <span class="gd-time">{{ shortTime(c.createTime) }}</span>
              </div>
              <p class="gd-content">{{ c.content }}</p>
              <p v-if="c.petName" class="gd-pet">评价了「{{ c.petName }}」</p>
            </li>
          </ul>
        </div>
      </section>
    </main>

    <footer class="disp-foot">
      每一只在售宠物都完成健康筛查与疫苗、驱虫核验 · 支持到店看宠 · 智能选宠 · 上门/到店双模式服务
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { listPetInfo } from '@/api/pet/petInfo'
import { getDisplayScreen } from '@/api/pet/dashboard'

const router = useRouter()
const pets = ref([])
const petsTotal = ref(0)
const data = ref({})
const paused = ref(false)
const clock = ref({ time: '', date: '' })

const kpi = computed(() => data.value?.kpi || {})
const funnel = computed(() => data.value?.funnel || {})
const wallet = computed(() => data.value?.wallet || {})
const rating = computed(() => data.value?.rating || {})
const goodComments = computed(() => (data.value?.goodComments || []).slice(0, 5))
const repeatStats = computed(() => data.value?.repeatStats || {})
const services = computed(() => (data.value?.services || []).slice(0, 6))
const storeRating = computed(() => data.value?.storeRating || [])
const keywords = computed(() => (data.value?.keywords || []).slice(0, 12))
const recentCount = computed(() => data.value?.recentCommentCount ?? 0)

// 三层环：内层精选 10、中层每 3 只取 1、外层全部
const innerPets = computed(() => pets.value.slice(0, 10))
const midPets = computed(() => pets.value.filter((_, i) => i % 3 === 0).slice(0, 32))

const maxHits = computed(() => Math.max(1, ...keywords.value.map((k) => k.hits || 0)))
const tagSize = (hits) => Math.round(11 + Math.min(hits / maxHits.value, 1) * 7)
const distMax = computed(() => Math.max(1, ...(rating.value.dist || []).map((d) => d.value || 0)))
const distPct = (v) => Math.round(((v || 0) / distMax.value) * 100)
const svcMax = computed(() => Math.max(1, ...services.value.map((s) => s.value || 0)))
const svcPct = (v) => Math.round(((v || 0) / svcMax.value) * 100)

// 评分走势 → SVG 坐标（4~5 分映射到 y 88~12）
const trendPoints = computed(() => {
  const rows = data.value?.ratingTrend || []
  if (!rows.length) return []
  const n = rows.length
  return rows.map((r, i) => {
    const x = n === 1 ? 150 : (i / (n - 1)) * 292 + 4
    const s = Number(r.avgScore || 0)
    const y = Math.max(10, Math.min(88, 88 - ((s - 4) / 1) * 76))
    return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)), score: s }
  })
})
const trendLine = computed(() => trendPoints.value.map((p) => `${p.x},${p.y}`).join(' '))
const trendArea = computed(() => {
  const ps = trendPoints.value
  if (!ps.length) return ''
  return `${ps[0].x},96 ${ps.map((p) => `${p.x},${p.y}`).join(' ')} ${ps[ps.length - 1].x},96`
})
const trendLabels = computed(() => {
  const rows = data.value?.ratingTrend || []
  if (!rows.length) return []
  const pick = [rows[0], rows[Math.floor(rows.length / 2)], rows[rows.length - 1]]
  return pick.map((r) => String(r.startDate || '').slice(5, 10))
})
const trendDelta = computed(() => {
  const ps = trendPoints.value
  if (ps.length < 2) return '—'
  const d = (ps[ps.length - 1].score - ps[0].score).toFixed(1)
  return (d > 0 ? '↑ +' : d < 0 ? '↓ ' : '→ ') + d
})

function shortTime(t) {
  return t ? String(t).replace('T', ' ').slice(5, 10) : ''
}
function goPet(p) {
  router.push('/shop/pet/detail?id=' + p.petId)
}

async function loadPets() {
  try {
    // 一次取全部在售宠物（外层环要放全量）
    const res = await listPetInfo({ status: '0', pageNum: 1, pageSize: 200 })
    const rows = (res.rows || []).filter((p) => p.image)
    pets.value = rows
    petsTotal.value = res.total || rows.length
  } catch (e) {
    /* 静默，下轮重试 */
  }
}

async function loadSummary() {
  try {
    const res = await getDisplayScreen()
    if (res.code === 200) data.value = res.data || {}
  } catch (e) {
    /* 静默 */
  }
}

let clockTimer = null
function tick() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  clock.value.time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  const week = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()]
  clock.value.date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} 周${week}`
}

onMounted(() => {
  tick()
  clockTimer = setInterval(tick, 1000)
  loadPets()
  loadSummary()
  setInterval(loadSummary, 60000)
  setInterval(loadPets, 300000)
})
onUnmounted(() => clearInterval(clockTimer))
</script>

<style scoped>
.disp {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: radial-gradient(1200px 600px at 50% -10%, #10233c 0%, #0a1526 55%, #060d18 100%);
  color: #dfeaf5;
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
  padding: 12px 20px 6px;
  gap: 8px;
  overflow: hidden;
}

/* 顶栏 */
.disp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(64, 158, 255, 0.25);
  padding-bottom: 8px;
}
.brand { font-size: 14px; color: #7fb8e6; letter-spacing: 1px; display: flex; align-items: center; gap: 10px; }
.brand .back {
  color: #9db8d4;
  text-decoration: none;
  font-size: 12px;
  border: 1px solid rgba(64, 158, 255, 0.28);
  border-radius: 14px;
  padding: 3px 10px;
  transition: all 0.2s;
}
.brand .back:hover { color: #53d1ff; border-color: #53d1ff; background: rgba(83, 209, 255, 0.08); }
.paw { margin-right: 4px; }
.disp-title {
  margin: 0;
  font-size: clamp(18px, 2.2vw, 28px);
  letter-spacing: 6px;
  background: linear-gradient(180deg, #fff, #8ec9ff);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.clock { text-align: right; }
.clock .time { display: block; font-size: clamp(16px, 1.6vw, 24px); font-weight: 700; color: #eaf5ff; font-variant-numeric: tabular-nums; }
.clock .date { font-size: 11px; color: #7fb8e6; }

/* 主体三列 */
.disp-main {
  flex: 1;
  display: grid;
  grid-template-columns: minmax(250px, 22%) 1fr minmax(250px, 22%);
  gap: 12px;
  min-height: 0;
}
.panel {
  background: rgba(13, 30, 55, 0.6);
  border: 1px solid rgba(64, 158, 255, 0.18);
  border-radius: 12px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: hidden;
  min-height: 0;
}
.panel-title {
  margin: 0;
  font-size: 14px;
  color: #8ec9ff;
  letter-spacing: 2px;
  border-left: 3px solid #409eff;
  padding-left: 8px;
  flex-shrink: 0;
}
.block { display: flex; flex-direction: column; gap: 6px; min-height: 0; }
.block.grow { flex: 1; min-height: 0; }
.block-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 12px;
  color: #9db8d4;
  border-bottom: 1px dashed rgba(64, 158, 255, 0.18);
  padding-bottom: 4px;
}
.block-head b { color: #53d1ff; font-weight: 700; }
.teal { color: #53e6d1; }

/* 左：评分 */
.score-hero { display: flex; align-items: center; gap: 12px; }
.score-num {
  font-size: clamp(34px, 3.4vw, 48px);
  font-weight: 800;
  color: #ffc53d;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 0 22px rgba(255, 197, 61, 0.35);
  line-height: 1;
}
.stars .star { color: #37547a; font-size: 15px; }
.stars .star.on { color: #ffc53d; text-shadow: 0 0 8px rgba(255, 197, 61, 0.5); }
.muted { margin: 3px 0 0; font-size: 11px; color: #7fa6c9; }
.muted b { color: #dfeaf5; }
.dist { display: flex; flex-direction: column; gap: 4px; }
.dist-row { display: grid; grid-template-columns: 32px 1fr 24px; align-items: center; gap: 6px; font-size: 11px; }
.dist-name { color: #9db8d4; }
.dist-bar { height: 6px; background: rgba(64, 158, 255, 0.12); border-radius: 3px; overflow: hidden; }
.dist-bar i { display: block; height: 100%; border-radius: 3px; background: linear-gradient(90deg, #1c6fd1, #53d1ff); transition: width 0.8s ease; }
.dist-val { text-align: right; color: #cfe3f5; font-variant-numeric: tabular-nums; }

/* 评分走势 */
.trend { height: 96px; }
.trend-svg { width: 100%; height: 76px; display: block; }
.trend-labels { display: flex; justify-content: space-between; font-size: 9px; color: #6f95bd; padding: 0 2px; }

/* 关键词 */
.cloud { display: flex; flex-wrap: wrap; gap: 6px 8px; align-content: flex-start; }
.tag {
  color: #9ff0ff;
  background: rgba(83, 209, 255, 0.08);
  border: 1px solid rgba(83, 209, 255, 0.22);
  border-radius: 20px;
  padding: 2px 8px;
  line-height: 1.5;
  white-space: nowrap;
}
.tag i { font-style: normal; color: #53d1ff; font-size: 0.8em; opacity: 0.8; }

/* 中：三层 3D 环 */
.stage { display: flex; flex-direction: column; align-items: center; gap: 4px; min-height: 0; }
.scene {
  position: relative;
  flex: 1;
  width: 100%;
  perspective: 2800px;
  perspective-origin: 50% 45%;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
}
.core {
  position: absolute;
  z-index: 2;
  text-align: center;
  pointer-events: none;
}
.core-num {
  display: block;
  font-size: clamp(40px, 5vw, 72px);
  font-weight: 800;
  line-height: 1;
  color: #e8f8ff;
  text-shadow: 0 0 34px rgba(83, 209, 255, 0.65);
  font-variant-numeric: tabular-nums;
}
.core-text { display: block; margin-top: 4px; font-size: 11px; color: #7fb8e6; letter-spacing: 2px; line-height: 1.6; }

.ring {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 0;
  height: 0;
  transform-style: preserve-3d;
}
.ring-inner { animation: ring-spin 34s linear infinite; }
.ring-mid { animation: ring-spin-rev 52s linear infinite; }
.ring-outer { animation: ring-spin 76s linear infinite; }
.ring.paused { animation-play-state: paused; }
@keyframes ring-spin {
  from { transform: rotateX(-8deg) rotateY(0deg); }
  to { transform: rotateX(-8deg) rotateY(360deg); }
}
@keyframes ring-spin-rev {
  from { transform: rotateX(6deg) rotateY(360deg); }
  to { transform: rotateX(6deg) rotateY(0deg); }
}
.ring-card {
  position: absolute;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid rgba(94, 178, 255, 0.4);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5), 0 0 10px rgba(64, 158, 255, 0.18);
  cursor: pointer;
  backface-visibility: hidden;
  background: #0d1e37;
  transform: rotateY(var(--a)) translateZ(var(--r)) translate(-50%, -50%);
  transition: box-shadow 0.3s, border-color 0.3s;
}
.ring-card:hover { border-color: #53d1ff; box-shadow: 0 8px 30px rgba(0, 0, 0, 0.6), 0 0 22px rgba(83, 209, 255, 0.55); }
.ring-card img { width: 100%; height: 100%; object-fit: cover; display: block; }
.ring-card.big { width: 120px; height: 154px; }
.ring-card.mid { width: 88px; height: 112px; }
.ring-card.mini { width: 50px; height: 64px; border-radius: 6px; }
.ring-info {
  position: absolute;
  left: 0; right: 0; bottom: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 7px;
  font-size: 11px;
  background: linear-gradient(transparent, rgba(4, 12, 24, 0.94));
}
.pet-name { color: #fff; font-weight: 600; }
.pet-price { color: #ffc53d; font-weight: 700; }
.stage-glow {
  position: absolute;
  bottom: 2%;
  left: 50%;
  width: 58%;
  height: 30px;
  transform: translateX(-50%);
  background: radial-gradient(closest-side, rgba(64, 158, 255, 0.35), transparent);
  border-radius: 50%;
  pointer-events: none;
}
.stage-tip { margin: 0; font-size: 11px; color: #6f95bd; }
.stage-strip {
  display: grid;
  grid-template-columns: repeat(5, minmax(70px, 1fr));
  gap: 8px;
  width: 100%;
}
.strip-item {
  background: rgba(13, 30, 55, 0.6);
  border: 1px solid rgba(64, 158, 255, 0.18);
  border-radius: 8px;
  text-align: center;
  padding: 6px 4px;
}
.strip-item b {
  display: block;
  font-size: clamp(16px, 1.5vw, 22px);
  color: #53d1ff;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}
.strip-item b.up { color: #53e6d1; }
.strip-item span { font-size: 11px; color: #7fa6c9; }

/* 右：复购口碑 */
.kpis { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.kpi {
  background: rgba(64, 158, 255, 0.06);
  border: 1px solid rgba(64, 158, 255, 0.2);
  border-radius: 8px;
  padding: 8px 10px;
}
.kpi-label { font-size: 11px; color: #9db8d4; display: block; }
.kpi-val { font-size: clamp(20px, 1.9vw, 28px); font-weight: 800; font-variant-numeric: tabular-nums; }
.kpi-val i { font-style: normal; font-size: 12px; margin-left: 1px; }
.kpi-val.teal { color: #53e6d1; }
.kpi-val.gold { color: #ffc53d; }

.rep-bars { display: flex; flex-direction: column; gap: 5px; }
.rep-row { display: grid; grid-template-columns: 68px 1fr 26px; align-items: center; gap: 6px; font-size: 11px; }
.rep-name { color: #9db8d4; }
.rep-bar { height: 7px; background: rgba(83, 230, 209, 0.1); border-radius: 4px; overflow: hidden; }
.rep-bar i { display: block; height: 100%; border-radius: 4px; background: linear-gradient(90deg, #17a99a, #53e6d1); transition: width 0.8s ease; }
.rep-val { text-align: right; color: #cfe3f5; }

/* 复购小卡 */
.rep-summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.rep-cell {
  text-align: center;
  background: rgba(83, 230, 209, 0.06);
  border: 1px solid rgba(83, 230, 209, 0.18);
  border-radius: 8px;
  padding: 6px 2px;
}
.rep-cell b {
  display: block;
  font-size: clamp(16px, 1.4vw, 21px);
  color: #53e6d1;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
}
.rep-cell span { font-size: 10px; color: #7fa6c9; }

/* 服务热度 */
.svc-list { display: flex; flex-direction: column; gap: 4px; }
.svc-row { display: grid; grid-template-columns: 16px 1fr 42% 26px; align-items: center; gap: 5px; font-size: 11px; }
.svc-rank {
  width: 15px; height: 15px; line-height: 15px;
  text-align: center; border-radius: 4px;
  font-size: 9px; color: #6f95bd;
  background: rgba(64, 158, 255, 0.12);
}
.svc-rank.hot { color: #0a1526; background: linear-gradient(135deg, #ffd666, #ffa53d); font-weight: 700; }
.svc-name { color: #cfe3f5; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.svc-bar { height: 6px; background: rgba(64, 158, 255, 0.1); border-radius: 3px; overflow: hidden; }
.svc-bar i { display: block; height: 100%; border-radius: 3px; background: linear-gradient(90deg, #1c6fd1, #53d1ff); }
.svc-val { text-align: right; color: #53d1ff; font-variant-numeric: tabular-nums; }

.store-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
.store-row { display: grid; grid-template-columns: 1fr auto 26px 44px; align-items: center; gap: 5px; font-size: 11px; }
.store-name { color: #cfe3f5; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.store-stars { color: #ffc53d; letter-spacing: 0.5px; font-size: 10px; }
.store-score { color: #ffc53d; font-variant-numeric: tabular-nums; }
.store-total { color: #6f95bd; text-align: right; }

.gd-list { list-style: none; margin: 0; padding: 0; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 6px; scrollbar-width: none; }
.gd-list::-webkit-scrollbar { display: none; }
.gd-item {
  background: rgba(255, 197, 61, 0.05);
  border: 1px solid rgba(255, 197, 61, 0.16);
  border-radius: 8px;
  padding: 6px 8px;
}
.gd-top { display: flex; align-items: center; gap: 6px; font-size: 11px; }
.gd-stars { color: #ffc53d; letter-spacing: 1px; font-size: 10px; }
.gd-user { color: #dfeaf5; font-weight: 600; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gd-time { color: #6f95bd; }
.gd-content { margin: 3px 0 0; font-size: 11px; color: #b9d2e8; line-height: 1.45; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.gd-pet { margin: 2px 0 0; font-size: 10px; color: #6f95bd; }

/* 底栏 */
.disp-foot {
  text-align: center;
  font-size: 11px;
  color: #6f95bd;
  letter-spacing: 2px;
  border-top: 1px solid rgba(64, 158, 255, 0.15);
  padding-top: 5px;
}

@media (max-width: 900px) {
  .disp-main { grid-template-columns: 1fr; }
  .scene { min-height: 400px; }
}
</style>
