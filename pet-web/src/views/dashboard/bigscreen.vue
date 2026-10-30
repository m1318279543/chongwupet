<template>
  <div class="bigscreen-wrap" ref="wrapRef">
    <div class="screen" :style="{ transform: `scale(${scale})` }">
      <!-- 顶部标题栏 -->
      <header class="bs-head">
        <div class="head-side left">
          <span class="chip" :class="{ on: days === 7 }" @click="switchDays(7)">近 7 天</span>
          <span class="chip" :class="{ on: days === 30 }" @click="switchDays(30)">近 30 天</span>
        </div>
        <h1 class="head-title">宠物之家 · 数据可视化大屏</h1>
        <div class="head-side right">
          <span class="clock">{{ clock }}</span>
          <span class="chip" @click="toggleFullscreen">{{ isFullscreen ? '退出全屏' : '全屏' }}</span>
          <span class="chip" @click="backToDashboard">返回看板</span>
        </div>
      </header>

      <!-- KPI 指标行 -->
      <section class="kpi-row">
        <div v-for="k in kpis" :key="k.key" class="kpi">
          <span class="kpi-label">{{ k.label }}</span>
          <em class="kpi-value" :style="{ color: k.color }">{{ k.value }}</em>
          <span class="kpi-sub">{{ k.sub }}</span>
        </div>
      </section>

      <!-- 三列主体 -->
      <section class="bs-body">
        <!-- 左列 -->
        <div class="col">
          <div class="panel">
            <div class="panel-title">品类销售占比</div>
            <div ref="categoryRef" class="chart"></div>
          </div>
          <div class="panel">
            <div class="panel-title">订单状态分布</div>
            <div ref="orderStatusRef" class="chart"></div>
          </div>
          <div class="panel">
            <div class="panel-title">预约状态分布</div>
            <div ref="aptStatusRef" class="chart"></div>
          </div>
        </div>

        <!-- 中列 -->
        <div class="col center">
          <div class="panel grow">
            <div class="panel-title">业务趋势 <i>营业额 / 订单 / 预约 / 咨询</i></div>
            <div ref="trendRef" class="chart chart-tall"></div>
          </div>
          <div class="panel feed-panel">
            <div class="panel-title">实时业务动态 <i>每 30 秒自动刷新</i></div>
            <ul class="feed">
              <li v-for="(item, idx) in feed" :key="idx">
                <span class="feed-icon">{{ typeMeta(item.type).icon }}</span>
                <span class="feed-title">{{ item.title }}</span>
                <span v-if="item.amount" class="feed-amount">¥{{ money(item.amount) }}</span>
                <span class="feed-time">{{ fmtEventTime(item.time) }}</span>
              </li>
            </ul>
            <div v-if="!feed.length" class="empty">暂无业务动态</div>
          </div>
        </div>

        <!-- 右列 -->
        <div class="col">
          <div class="panel">
            <div class="panel-title">热销商品 TOP · 成交额</div>
            <div ref="topGoodsRef" class="chart"></div>
          </div>
          <div class="panel">
            <div class="panel-title">预约热度 TOP · 宠物</div>
            <div ref="topPetsRef" class="chart"></div>
          </div>
          <div class="panel">
            <div class="panel-title">24 小时活跃分布</div>
            <div ref="hourlyRef" class="chart"></div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts/core'
import { LineChart, BarChart, PieChart } from 'echarts/charts'
import { TooltipComponent, LegendComponent, GridComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([LineChart, BarChart, PieChart, TooltipComponent, LegendComponent, GridComponent, CanvasRenderer])
import { getDashboardAll, getDashboardRealtime } from '@/api/pet/dashboard'
import { paymentOverview } from '@/api/pet/petPayment'

const router = useRouter()

/* ---------- 缩放适配：1920×1080 设计稿等比铺满 ---------- */
const wrapRef = ref(null)
const scale = ref(1)
function fit() {
  const w = window.innerWidth
  const h = window.innerHeight
  scale.value = Math.min(w / 1920, h / 1080)
}

/* ---------- 状态 ---------- */
const days = ref(7)
const dashboard = ref(null)
const realtime = ref(null)
const pay = ref({})
const clock = ref('')
const isFullscreen = ref(false)

let mainTimer = null
let rtTimer = null
let clockTimer = null
const charts = {}

/* ---------- KPI ---------- */
function money(v) {
  const n = Number(v || 0)
  return n >= 10000 ? (n / 10000).toFixed(1) + 'w' : n.toFixed(n % 1 === 0 ? 0 : 2)
}
function fmtInt(v) {
  return Number(v || 0).toLocaleString()
}

const kpis = ref([])
function buildKpis() {
  const o = dashboard.value?.overview || {}
  const t = realtime.value?.today || dashboard.value?.today || {}
  const payRate = Number(pay.value.totalOrders || 0) > 0
    ? (Number(pay.value.paidOrders || 0) / Number(pay.value.totalOrders)) * 100
    : 0
  kpis.value = [
    { key: 'revenue', label: '区间营业额', value: '¥' + money(o.revenue), color: '#ffc46b', sub: `今日 ¥${money(t.todayRevenue || 0)}` },
    { key: 'payAmount', label: '支付金额', value: '¥' + money(pay.value.paidAmount), color: '#f78e3d', sub: `成功 ${fmtInt(pay.value.paidOrders || 0)} 单` },
    { key: 'orders', label: '订单量', value: fmtInt(o.orders), color: '#4da2ff', sub: `今日 ${t.todayOrders || 0} 单` },
    { key: 'appointments', label: '预约量', value: fmtInt(o.appointments), color: '#3ddc97', sub: `今日 ${t.todayAppointments || 0} 单` },
    { key: 'consults', label: '咨询量', value: fmtInt(o.consults), color: '#b58bff', sub: `今日 ${t.todayConsults || 0} 次` },
    { key: 'payRate', label: '支付成功率', value: payRate.toFixed(1) + '%', color: '#25f0ee', sub: `失败 ${fmtInt(pay.value.failOrders || 0)} 单` },
  ]
}

/* ---------- 实时动态 ---------- */
const feed = ref([])
const TYPE_META = {
  order: { icon: '🧾' },
  appointment: { icon: '📅' },
  consult: { icon: '💬' },
  cancel: { icon: '🚫' },
  service: { icon: '🛁' },
}
function typeMeta(type) {
  return TYPE_META[type] || { icon: '📌' }
}
function fmtEventTime(time) {
  if (!time) return ''
  return String(time).slice(5, 16)
}

/* ---------- 图表 ---------- */
const categoryRef = ref(null)
const orderStatusRef = ref(null)
const aptStatusRef = ref(null)
const trendRef = ref(null)
const topGoodsRef = ref(null)
const topPetsRef = ref(null)
const hourlyRef = ref(null)

const TOOLTIP = {
  backgroundColor: 'rgba(8,25,50,.92)',
  borderColor: '#1f4d7a',
  textStyle: { color: '#d8ecff', fontSize: 12 },
}
const AXIS = { color: '#7fa8cc', fontSize: 11 }
const SPLIT = { lineStyle: { color: 'rgba(63,120,180,.18)' } }

function initChart(key, elRef) {
  if (!charts[key] && elRef.value) charts[key] = echarts.init(elRef.value)
  return charts[key]
}

function ringOption(items, colors) {
  return {
    color: colors,
    tooltip: { ...TOOLTIP, trigger: 'item', formatter: '{b}：{c}（{d}%）' },
    legend: {
      orient: 'vertical', right: 6, top: 'center',
      textStyle: { color: '#9cc3e8', fontSize: 11 },
      itemWidth: 10, itemHeight: 10,
    },
    series: [{
      type: 'pie',
      radius: ['52%', '76%'],
      center: ['38%', '50%'],
      avoidLabelOverlap: true,
      itemStyle: { borderColor: '#081a30', borderWidth: 2 },
      label: { show: false },
      emphasis: {
        label: { show: true, formatter: '{b}\n{d}%', color: '#d8ecff', fontSize: 12, fontWeight: 600 },
      },
      data: items,
    }],
  }
}

function renderCategory() {
  const c = initChart('category', categoryRef)
  c && c.setOption(ringOption(dashboard.value?.distribution?.category || [], ['#ffc46b', '#4da2ff', '#3ddc97', '#b58bff', '#25f0ee', '#f78e3d']), true)
}
function renderOrderStatus() {
  const c = initChart('orderStatus', orderStatusRef)
  c && c.setOption(ringOption(dashboard.value?.distribution?.orderStatus || [], ['#f78e3d', '#3d5a80']), true)
}
function renderAptStatus() {
  const c = initChart('aptStatus', aptStatusRef)
  c && c.setOption(ringOption(dashboard.value?.distribution?.appointmentStatus || [], ['#ffc46b', '#4da2ff', '#3ddc97', '#3d5a80']), true)
}

function renderTrend() {
  const c = initChart('trend', trendRef)
  if (!c) return
  const t = dashboard.value?.trend || { dates: [], revenue: [], orders: [], appointments: [], consults: [] }
  c.setOption({
    color: ['#ffc46b', '#4da2ff', '#3ddc97', '#b58bff'],
    tooltip: { ...TOOLTIP, trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { top: 2, textStyle: { color: '#9cc3e8', fontSize: 11 }, itemWidth: 12, itemHeight: 8 },
    grid: { left: 10, right: 16, top: 34, bottom: 6, containLabel: true },
    xAxis: {
      type: 'category', data: t.dates || [],
      axisTick: { show: false },
      axisLine: { lineStyle: { color: 'rgba(63,120,180,.4)' } },
      axisLabel: { ...AXIS, interval: Math.ceil((t.dates?.length || 1) / 12) },
    },
    yAxis: [
      { type: 'value', name: '金额¥', splitLine: SPLIT, axisLabel: AXIS, nameTextStyle: AXIS },
      { type: 'value', name: '数量', splitLine: { show: false }, axisLabel: AXIS, nameTextStyle: AXIS },
    ],
    series: [
      { name: '营业额', type: 'bar', data: t.revenue || [], barWidth: '32%',
        itemStyle: { borderRadius: [4, 4, 0, 0], color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#ffc46b' }, { offset: 1, color: 'rgba(255,196,107,.15)' },
        ]) } },
      { name: '订单', type: 'line', yAxisIndex: 1, data: t.orders || [], smooth: true, symbolSize: 5, lineStyle: { width: 2 } },
      { name: '预约', type: 'line', yAxisIndex: 1, data: t.appointments || [], smooth: true, symbolSize: 5, lineStyle: { width: 2 } },
      { name: '咨询', type: 'line', yAxisIndex: 1, data: t.consults || [], smooth: true, symbolSize: 5, lineStyle: { width: 2 } },
    ],
  }, true)
}

function barOption(items, valueKey, color, fmt) {
  const list = (items || []).slice().reverse()
  return {
    grid: { left: 8, right: 44, top: 8, bottom: 4, containLabel: true },
    tooltip: { ...TOOLTIP, trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'value', splitLine: SPLIT, axisLabel: { ...AXIS, formatter: fmt } },
    yAxis: {
      type: 'category', data: list.map((i) => i.name),
      axisTick: { show: false }, axisLine: { show: false },
      axisLabel: { color: '#9cc3e8', fontSize: 11, width: 96, overflow: 'truncate' },
    },
    series: [{
      type: 'bar', data: list.map((i) => i[valueKey]), barWidth: 10,
      itemStyle: { borderRadius: [0, 5, 5, 0], color: new echarts.graphic.LinearGradient(1, 0, 0, 0, [
        { offset: 0, color }, { offset: 1, color: 'rgba(37,240,238,.08)' },
      ]) },
      label: { show: true, position: 'right', color: '#7fa8cc', fontSize: 10, formatter: (p) => fmt(p.value) },
    }],
  }
}
function renderTopGoods() {
  const c = initChart('topGoods', topGoodsRef)
  c && c.setOption(barOption(dashboard.value?.ranking?.goods, 'amount', '#ffc46b', (v) => '¥' + Number(v).toFixed(0)), true)
}
function renderTopPets() {
  const c = initChart('topPets', topPetsRef)
  c && c.setOption(barOption(dashboard.value?.ranking?.pets, 'value', '#4da2ff', (v) => v + ' 次'), true)
}

function renderHourly() {
  const c = initChart('hourly', hourlyRef)
  if (!c) return
  const h = dashboard.value?.hourly || { hours: [], orders: [], appointments: [] }
  c.setOption({
    color: ['#ffc46b', '#4da2ff'],
    tooltip: { ...TOOLTIP, trigger: 'axis' },
    legend: { top: 0, textStyle: { color: '#9cc3e8', fontSize: 10 }, itemWidth: 10, itemHeight: 7 },
    grid: { left: 8, right: 10, top: 26, bottom: 4, containLabel: true },
    xAxis: {
      type: 'category', data: h.hours || [],
      axisTick: { show: false },
      axisLine: { lineStyle: { color: 'rgba(63,120,180,.4)' } },
      axisLabel: { ...AXIS, interval: 2 },
    },
    yAxis: { type: 'value', splitLine: SPLIT, axisLabel: AXIS },
    series: [
      { name: '下单', type: 'line', data: h.orders || [], smooth: true, symbolSize: 4,
        areaStyle: { color: 'rgba(255,196,107,.15)' }, lineStyle: { width: 2 } },
      { name: '预约', type: 'line', data: h.appointments || [], smooth: true, symbolSize: 4,
        areaStyle: { color: 'rgba(77,162,255,.15)' }, lineStyle: { width: 2 } },
    ],
  }, true)
}

function renderAll() {
  renderCategory(); renderOrderStatus(); renderAptStatus()
  renderTrend(); renderTopGoods(); renderTopPets(); renderHourly()
  buildKpis()
}

/* ---------- 数据加载 ---------- */
async function loadAll() {
  const [all, payRes] = await Promise.all([getDashboardAll(days.value), paymentOverview()])
  dashboard.value = all.data
  pay.value = payRes.data || {}
  renderAll()
}
async function loadRealtime() {
  const res = await getDashboardRealtime()
  realtime.value = res.data
  feed.value = res.data?.feed || []
  buildKpis()
}

function switchDays(d) {
  if (days.value === d) return
  days.value = d
  loadAll()
}
function backToDashboard() {
  router.push('/admin/dashboard')
}
async function toggleFullscreen() {
  try {
    if (!document.fullscreenElement) {
      await wrapRef.value?.requestFullscreen?.()
      isFullscreen.value = true
    } else {
      await document.exitFullscreen?.()
      isFullscreen.value = false
    }
  } catch (e) { /* 忽略 */ }
}
function onFsChange() {
  isFullscreen.value = !!document.fullscreenElement
}

function tick() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  clock.value = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

onMounted(async () => {
  fit()
  window.addEventListener('resize', fit)
  document.addEventListener('fullscreenchange', onFsChange)
  tick()
  clockTimer = setInterval(tick, 1000)
  await nextTick()
  await Promise.all([loadAll(), loadRealtime()])
  mainTimer = setInterval(loadAll, 60_000)
  rtTimer = setInterval(loadRealtime, 30_000)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', fit)
  document.removeEventListener('fullscreenchange', onFsChange)
  clearInterval(mainTimer); clearInterval(rtTimer); clearInterval(clockTimer)
  Object.values(charts).forEach((c) => c && c.dispose())
})
</script>

<style scoped lang="scss">
.bigscreen-wrap {
  position: fixed;
  inset: 0;
  background: #04101f;
  overflow: hidden;
  z-index: 2000;
}
.screen {
  width: 1920px;
  height: 1080px;
  transform-origin: left top;
  position: absolute;
  left: 50%; top: 50%;
  margin-left: -960px;
  margin-top: -540px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px 24px 20px;
  background:
    radial-gradient(1200px 500px at 50% -8%, rgba(31, 77, 122, .5), transparent 60%),
    radial-gradient(900px 420px at 100% 110%, rgba(20, 90, 130, .35), transparent 65%),
    linear-gradient(180deg, #06182f 0%, #04101f 60%, #030b18 100%);

  &::before {
    content: '';
    position: absolute; inset: 10px;
    border: 1px solid rgba(37, 240, 238, .12);
    pointer-events: none;
  }
}

.bs-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  flex-shrink: 0;
  border-bottom: 1px solid rgba(37, 240, 238, .18);
  .head-title {
    margin: 0;
    font-size: 30px;
    font-weight: 800;
    letter-spacing: 6px;
    color: #e8f6ff;
    text-shadow: 0 0 24px rgba(37, 240, 238, .55), 0 0 60px rgba(47, 123, 255, .3);
  }
  .head-side {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 300px;
    &.right { justify-content: flex-end; }
  }
  .chip {
    padding: 5px 14px;
    border: 1px solid rgba(37, 240, 238, .35);
    border-radius: 999px;
    color: #9cc3e8;
    font-size: 13px;
    cursor: pointer;
    transition: all .15s;
    user-select: none;
    &:hover { color: #25f0ee; border-color: #25f0ee; }
    &.on {
      color: #04101f;
      background: #25f0ee;
      border-color: #25f0ee;
      font-weight: 600;
    }
  }
  .clock {
    font-size: 16px;
    color: #d8ecff;
    letter-spacing: 1px;
    font-variant-numeric: tabular-nums;
    margin-right: 6px;
  }
}

.kpi-row {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 14px;
  flex-shrink: 0;
}
.kpi {
  position: relative;
  padding: 14px 18px 12px;
  border: 1px solid rgba(37, 240, 238, .16);
  border-radius: 10px;
  background: linear-gradient(180deg, rgba(20, 55, 95, .45), rgba(8, 26, 48, .35));
  overflow: hidden;
  &::after {
    content: '';
    position: absolute; left: 0; top: 0;
    width: 100%; height: 2px;
    background: linear-gradient(90deg, transparent, rgba(37, 240, 238, .6), transparent);
  }
  .kpi-label { font-size: 14px; color: #9cc3e8; }
  .kpi-value {
    display: block;
    font-style: normal;
    font-size: 34px;
    font-weight: 800;
    line-height: 1.25;
    font-variant-numeric: tabular-nums;
    text-shadow: 0 0 18px currentColor;
  }
  .kpi-sub { font-size: 12px; color: #5f86ad; }
}

.bs-body {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 430px minmax(0, 1fr) 430px;
  gap: 14px;
}
.col {
  display: grid;
  grid-template-rows: repeat(3, minmax(0, 1fr));
  gap: 14px;
  min-height: 0;
  &.center { grid-template-rows: minmax(0, 1.5fr) minmax(0, 1fr); }
}
.panel {
  position: relative;
  min-height: 0;
  border: 1px solid rgba(37, 240, 238, .14);
  border-radius: 10px;
  background: linear-gradient(180deg, rgba(16, 45, 80, .4), rgba(7, 22, 42, .55));
  padding: 12px 14px 8px;
  display: flex;
  flex-direction: column;
  &.grow { flex: 1; }
  &::before, &::after {
    content: '';
    position: absolute;
    width: 14px; height: 14px;
    border-color: #25f0ee;
    border-style: solid;
    opacity: .8;
  }
  &::before { left: -1px; top: -1px; border-width: 2px 0 0 2px; border-radius: 8px 0 0 0; }
  &::after { right: -1px; bottom: -1px; border-width: 0 2px 2px 0; border-radius: 0 0 8px 0; }
}
.panel-title {
  font-size: 15px;
  font-weight: 700;
  color: #d8ecff;
  letter-spacing: 1px;
  flex-shrink: 0;
  i {
    font-style: normal;
    font-size: 11px;
    font-weight: 400;
    color: #5f86ad;
    margin-left: 8px;
  }
}
.chart {
  flex: 1;
  min-height: 0;
  width: 100%;
}
.chart-tall { min-height: 0; }

.feed-panel { overflow: hidden; }
.feed {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  overflow-y: auto;
  flex: 1;
  li {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 7px 4px;
    border-bottom: 1px dashed rgba(63, 120, 180, .2);
    font-size: 13px;
  }
}
.feed-icon {
  width: 26px; height: 26px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  background: rgba(37, 240, 238, .12);
  flex-shrink: 0;
  font-size: 14px;
}
.feed-title {
  flex: 1;
  color: #c4dcf5;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.feed-amount { color: #ffc46b; font-weight: 600; font-variant-numeric: tabular-nums; }
.feed-time { color: #5f86ad; font-size: 12px; font-variant-numeric: tabular-nums; }
.empty { color: #5f86ad; font-size: 13px; padding: 16px 4px; }
</style>
