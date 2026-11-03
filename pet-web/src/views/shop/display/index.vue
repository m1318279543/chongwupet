<template>
  <div class="disp">
    <!-- 顶栏 -->
    <header class="disp-head">
      <div class="brand"><span class="paw">🐾</span> 宠物之家 · PET HOME</div>
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
            <p class="muted">累计 <b>{{ rating.total || 0 }}</b> 条评价</p>
          </div>
        </div>
        <div class="dist">
          <div v-for="d in rating.dist || []" :key="d.name" class="dist-row">
            <span class="dist-name">{{ d.name }}</span>
            <div class="dist-bar"><i :style="{ width: distPct(d.value) + '%' }"></i></div>
            <span class="dist-val">{{ d.value }}</span>
          </div>
        </div>
        <div class="good-rate">
          <span>好评率（4 星及以上）</span>
          <b class="hl">{{ kpi.goodRate ?? 0 }}%</b>
        </div>
      </section>

      <!-- 中：宠物照片 3D 旋转环 -->
      <section class="stage">
        <div class="scene" @mouseenter="paused = true" @mouseleave="paused = false">
          <div class="ring" :class="{ paused }" :style="{ '--n': pets.length }">
            <div
              v-for="(p, i) in pets"
              :key="p.petId"
              class="ring-card"
              :style="{ '--a': (360 / pets.length) * i + 'deg' }"
              @click="goPet(p)"
            >
              <img :src="p.image" :alt="p.petName" loading="lazy" />
              <div class="ring-info">
                <span class="pet-name">{{ p.petName }}</span>
                <span class="pet-price">¥{{ p.price }}</span>
              </div>
            </div>
          </div>
          <div class="stage-glow"></div>
        </div>
        <p class="stage-tip">点击宠物卡片查看详情 · 鼠标悬停暂停旋转</p>
        <div class="stage-strip">
          <div class="strip-item"><b>{{ petsTotal }}</b><span>在售宠物</span></div>
          <div class="strip-item"><b>{{ funnel.paidOrders || 0 }}</b><span>累计成交</span></div>
          <div class="strip-item"><b>{{ wallet.users || 0 }}</b><span>注册会员</span></div>
          <div class="strip-item"><b>{{ rating.total || 0 }}</b><span>顾客评价</span></div>
        </div>
      </section>

      <!-- 右：复购口碑 + 最新好评 -->
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
        <div class="mini-rows">
          <div class="mini"><span>累计成交订单</span><b>{{ funnel.paidOrders || 0 }} 单</b></div>
          <div class="mini"><span>服务工单</span><b>{{ kpi.serviceTotal || 0 }} 单</b></div>
          <div class="mini"><span>会员总数</span><b>{{ wallet.users || 0 }} 位</b></div>
        </div>
        <h2 class="panel-title mt">最新好评</h2>
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
const goodComments = computed(() => (data.value?.goodComments || []).slice(0, 6))

const distMax = computed(() => Math.max(1, ...(rating.value.dist || []).map((d) => d.value || 0)))
const distPct = (v) => Math.round(((v || 0) / distMax.value) * 100)

function shortTime(t) {
  if (!t) return ''
  const s = String(t).replace('T', ' ')
  return s.slice(5, 10)
}

function goPet(p) {
  router.push('/shop/pet/detail?id=' + p.petId)
}

async function loadPets() {
  try {
    const res = await listPetInfo({ status: '0', pageNum: 1, pageSize: 12 })
    const rows = res.rows || []
    // 只留有图片的，保证环上不出现空卡片
    pets.value = rows.filter((p) => p.image).slice(0, 12)
    petsTotal.value = res.total || rows.length
  } catch (e) {
    /* 静默：下一轮轮询重试 */
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
  padding: 14px 22px 8px;
  gap: 10px;
}

/* 顶栏 */
.disp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(64, 158, 255, 0.25);
  padding-bottom: 10px;
}
.brand { font-size: 15px; color: #7fb8e6; letter-spacing: 1px; }
.paw { margin-right: 4px; }
.disp-title {
  margin: 0;
  font-size: clamp(20px, 2.6vw, 32px);
  letter-spacing: 6px;
  background: linear-gradient(180deg, #fff, #8ec9ff);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.clock { text-align: right; }
.clock .time { display: block; font-size: clamp(18px, 1.8vw, 26px); font-weight: 700; color: #eaf5ff; font-variant-numeric: tabular-nums; }
.clock .date { font-size: 12px; color: #7fb8e6; }

/* 主体三列 */
.disp-main {
  flex: 1;
  display: grid;
  grid-template-columns: minmax(240px, 23%) 1fr minmax(240px, 23%);
  gap: 16px;
  min-height: 0;
}
.panel {
  background: rgba(13, 30, 55, 0.6);
  border: 1px solid rgba(64, 158, 255, 0.18);
  border-radius: 14px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: hidden;
}
.panel-title {
  margin: 0;
  font-size: 15px;
  color: #8ec9ff;
  letter-spacing: 2px;
  border-left: 3px solid #409eff;
  padding-left: 8px;
}
.panel-title.mt { margin-top: 4px; }
.side { min-height: 0; }

/* 左：评分 */
.score-hero { display: flex; align-items: center; gap: 14px; }
.score-num {
  font-size: clamp(38px, 4vw, 56px);
  font-weight: 800;
  color: #ffc53d;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 0 22px rgba(255, 197, 61, 0.35);
}
.stars .star { color: #37547a; font-size: 18px; }
.stars .star.on { color: #ffc53d; text-shadow: 0 0 8px rgba(255, 197, 61, 0.5); }
.muted { margin: 2px 0 0; font-size: 12px; color: #7fa6c9; }
.muted b { color: #dfeaf5; }
.dist { display: flex; flex-direction: column; gap: 6px; }
.dist-row { display: grid; grid-template-columns: 34px 1fr 26px; align-items: center; gap: 8px; font-size: 12px; }
.dist-name { color: #9db8d4; }
.dist-bar { height: 8px; background: rgba(64, 158, 255, 0.12); border-radius: 4px; overflow: hidden; }
.dist-bar i { display: block; height: 100%; border-radius: 4px; background: linear-gradient(90deg, #1c6fd1, #53d1ff); transition: width 0.8s ease; }
.dist-val { text-align: right; color: #cfe3f5; font-variant-numeric: tabular-nums; }
.good-rate {
  margin-top: auto;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  background: rgba(255, 197, 61, 0.08);
  border: 1px solid rgba(255, 197, 61, 0.25);
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 13px;
  color: #cfe3f5;
}
.good-rate .hl { font-size: 24px; color: #ffc53d; font-weight: 800; }

/* 中：3D 旋转环 */
.stage { display: flex; flex-direction: column; align-items: center; gap: 8px; min-height: 0; }
.scene {
  position: relative;
  flex: 1;
  width: 100%;
  perspective: 1300px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
}
.ring {
  position: relative;
  width: clamp(120px, 11vw, 170px);
  height: clamp(150px, 15vw, 220px);
  transform-style: preserve-3d;
  animation: ring-spin 30s linear infinite;
}
.ring.paused { animation-play-state: paused; }
@keyframes ring-spin {
  from { transform: rotateX(-6deg) rotateY(0deg); }
  to { transform: rotateX(-6deg) rotateY(360deg); }
}
.ring-card {
  position: absolute;
  inset: 0;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid rgba(94, 178, 255, 0.45);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45), 0 0 14px rgba(64, 158, 255, 0.25);
  cursor: pointer;
  backface-visibility: hidden;
  transform: rotateY(var(--a)) translateZ(min(34vw, 330px));
  background: #0d1e37;
  transition: box-shadow 0.3s;
}
.ring-card:hover { box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6), 0 0 24px rgba(94, 200, 255, 0.6); }
.ring-card img { width: 100%; height: 100%; object-fit: cover; display: block; }
.ring-info {
  position: absolute;
  left: 0; right: 0; bottom: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 9px;
  font-size: 12px;
  background: linear-gradient(transparent, rgba(4, 12, 24, 0.92));
}
.pet-name { color: #fff; font-weight: 600; }
.pet-price { color: #ffc53d; font-weight: 700; }
.stage-glow {
  position: absolute;
  bottom: 4%;
  left: 50%;
  width: 46%;
  height: 26px;
  transform: translateX(-50%);
  background: radial-gradient(closest-side, rgba(64, 158, 255, 0.4), transparent);
  border-radius: 50%;
  pointer-events: none;
}
.stage-tip { margin: 0; font-size: 12px; color: #6f95bd; }
.stage-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(90px, 1fr));
  gap: 10px;
  width: 100%;
}
.strip-item {
  background: rgba(13, 30, 55, 0.6);
  border: 1px solid rgba(64, 158, 255, 0.18);
  border-radius: 10px;
  text-align: center;
  padding: 8px 4px;
}
.strip-item b {
  display: block;
  font-size: clamp(18px, 1.8vw, 26px);
  color: #53d1ff;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}
.strip-item span { font-size: 12px; color: #7fa6c9; }

/* 右：复购口碑 */
.kpis { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.kpi {
  background: rgba(64, 158, 255, 0.06);
  border: 1px solid rgba(64, 158, 255, 0.2);
  border-radius: 10px;
  padding: 10px 12px;
}
.kpi-label { font-size: 12px; color: #9db8d4; display: block; }
.kpi-val { font-size: clamp(24px, 2.2vw, 34px); font-weight: 800; font-variant-numeric: tabular-nums; }
.kpi-val i { font-style: normal; font-size: 14px; margin-left: 2px; }
.kpi-val.teal { color: #53e6d1; }
.kpi-val.gold { color: #ffc53d; }
.mini-rows { display: flex; flex-direction: column; gap: 6px; }
.mini {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #9db8d4;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  padding: 7px 10px;
}
.mini b { color: #dfeaf5; font-variant-numeric: tabular-nums; }

/* 最新好评滚动 */
.gd-list { list-style: none; margin: 0; padding: 0; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 8px; scrollbar-width: none; }
.gd-list::-webkit-scrollbar { display: none; }
.gd-item {
  background: rgba(255, 197, 61, 0.05);
  border: 1px solid rgba(255, 197, 61, 0.16);
  border-radius: 10px;
  padding: 8px 10px;
}
.gd-top { display: flex; align-items: center; gap: 8px; font-size: 12px; }
.gd-stars { color: #ffc53d; letter-spacing: 1px; }
.gd-user { color: #dfeaf5; font-weight: 600; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gd-time { color: #6f95bd; }
.gd-content { margin: 4px 0 0; font-size: 12px; color: #b9d2e8; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.gd-pet { margin: 3px 0 0; font-size: 11px; color: #6f95bd; }

/* 底栏 */
.disp-foot {
  text-align: center;
  font-size: 13px;
  color: #6f95bd;
  letter-spacing: 2px;
  border-top: 1px solid rgba(64, 158, 255, 0.15);
  padding-top: 8px;
}

@media (max-width: 900px) {
  .disp-main { grid-template-columns: 1fr; }
  .scene { min-height: 320px; }
}
</style>
