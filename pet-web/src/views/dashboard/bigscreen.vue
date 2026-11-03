<template>
  <div class="bigscreen-wrap" ref="wrapRef">
    <div class="screen" :style="{ transform: `scale(${scale})` }">
      <!-- 顶部标题栏 -->
      <header class="bs-head">
        <div class="head-side left">
          <span class="chip" :class="{ on: days === 7 }" @click="switchDays(7)">近 7 天</span>
          <span class="chip" :class="{ on: days === 30 }" @click="switchDays(30)">近 30 天</span>
          <span class="chip" :class="{ on: days === 90 }" @click="switchDays(90)">近 90 天</span>
        </div>
        <h1 class="head-title">宠物之家 · 经营监控大屏</h1>
        <div class="head-side right">
          <span class="clock">{{ clock }}</span>
          <span class="chip" @click="toggleFullscreen">{{ isFullscreen ? '退出全屏' : '全屏' }}</span>
          <span class="chip" @click="backToDashboard">返回看板</span>
        </div>
      </header>

      <!-- KPI 指标行：客户与质量维度（看板是营收订单维度，两块屏互补） -->
      <section class="kpi-row">
        <div v-for="k in kpis" :key="k.key" class="kpi">
          <span class="kpi-label">{{ k.label }}</span>
          <em class="kpi-value" :style="{ color: k.color }">{{ k.value }}</em>
          <span class="kpi-sub">{{ k.sub }}</span>
        </div>
      </section>

      <!-- 三列主体 -->
      <section class="bs-body">
        <!-- 左列：漏斗 + 两个环形 -->
        <div class="col">
          <div class="panel">
            <div class="panel-title">经营转化漏斗 <i>咨询 → 下单 → 成交</i></div>
            <div ref="funnelRef" class="chart"></div>
            <div v-if="!funnel" class="empty center-empty">暂无数据</div>
          </div>
          <div class="panel">
            <div class="panel-title">服务模式占比 <i>门店服务工单</i></div>
            <div ref="serviceModeRef" class="chart"></div>
            <div v-if="!serviceMode?.length" class="empty center-empty">区间内暂无服务工单</div>
          </div>
          <div class="panel">
            <div class="panel-title">会员资产 <i>钱包余额池</i></div>
            <div class="wallet">
              <div class="wallet-main">
                <span class="wallet-label">会员总余额</span>
                <em class="wallet-value">¥{{ money(wallet?.balance) }}</em>
              </div>
              <div class="wallet-side">
                <div><b>{{ fmtInt(wallet?.users || 0) }}</b><i>充值会员</i></div>
                <div><b>¥{{ money(kpi?.avgOrderAmount) }}</b><i>平均客单价</i></div>
              </div>
            </div>
          </div>
        </div>

        <!-- 中列：客户增长 + 最新评价 -->
        <div class="col center">
          <div class="panel grow">
            <div class="panel-title">客户增长趋势 <i>每日新增注册（看板不看这件事）</i></div>
            <div ref="userTrendRef" class="chart chart-tall"></div>
          </div>
          <div class="panel feed-panel">
            <div class="panel-title">最新顾客评价 <i>每 30 秒自动刷新</i></div>
            <ul class="feed">
              <li v-for="(item, idx) in comments" :key="idx + String(item.createTime)">
                <span class="feed-stars">
                  <i v-for="n in 5" :key="n" :class="{ on: n <= (item.score || 0) }">★</i>
                </span>
                <span class="feed-user">{{ item.userName || '顾客' }}</span>
                <span class="feed-content">{{ item.content }}</span>
                <span class="feed-time">{{ fmtEventTime(item.createTime) }}</span>
              </li>
            </ul>
            <div v-if="!comments.length" class="empty">暂无顾客评价</div>
          </div>
        </div>

        <!-- 右列：门店对比 + 评分分布 + 服务热度 -->
        <div class="col">
          <div class="panel">
            <div class="panel-title">门店经营对比 <i>成交金额</i></div>
            <div ref="storeRef" class="chart"></div>
            <div v-if="!storeCompare?.length" class="empty center-empty">区间内暂无成交</div>
          </div>
          <div class="panel">
            <div class="panel-title">评分满意度分布 <i>区间内 {{ rating?.total || 0 }} 条评分</i></div>
            <div ref="ratingRef" class="chart"></div>
            <div v-if="!rating?.total" class="empty center-empty">区间内暂无评分</div>
          </div>
          <div class="panel">
            <div class="panel-title">服务项目热度 TOP <i>门店服务工单</i></div>
            <div ref="serviceTopRef" class="chart"></div>
            <div v-if="!rank?.services?.length" class="empty center-empty">区间内暂无服务工单</div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts/core'
import { LineChart, BarChart, PieChart, FunnelChart } from 'echarts/charts'
import { TooltipComponent, LegendComponent, GridComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([LineChart, BarChart, PieChart, FunnelChart, TooltipComponent, LegendComponent, GridComponent, CanvasRenderer])
import { getDashboardBigscreen } from '@/api/pet/dashboard'

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
const data = ref(null)
const clock = ref('')
const isFullscreen = ref(false)

let mainTimer = null
let clockTimer = null
const charts = {}

const kpi = computed(() => data.value?.kpi || null)
const funnel = computed(() => data.value?.funnel || null)
const wallet = computed(() => data.value?.wallet || null)
const rating = computed(() => data.value?.rating || null)
const serviceMode = computed(() => data.value?.serviceMode || [])
const storeCompare = computed(() => data.value?.storeCompare || [])
const comments = computed(() => data.value?.latestComments || [])
const rank = computed(() => data.value?.ranking || null)

/* ---------- KPI 行：客户与质量维度 ---------- */
function money(v) {
  const n = Number(v || 0)
  return n >= 10000 ? (n / 10000).toFixed(1) + 'w' : n.toFixed(n % 1 === 0 ? 0 : 2)
}
function fmtInt(v) {
  return Number(v || 0).toLocaleString()
}

const kpis = ref([])
function buildKpis() {
  const k = kpi.value || {}
  const w = wallet.value || {}
  const rangeDays = data.value?.range?.days || days.value
  kpis.value = [
    { key: 'newUsers', label: '新增客户', value: fmtInt(k.newUsers || 0), color: '#25f0ee', sub: `近 ${rangeDays} 天注册` },
    { key: 'repeat', label: '复购率', value: (k.repeatRate || 0).toFixed(1) + '%', color: '#3ddc97', sub: `成交客户 ${fmtInt(k.paidUsers || 0)} 人` },
    { key: 'goodRate', label: '好评率', value: (k.goodRate || 0).toFixed(1) + '%', color: '#ffc46b', sub: `${fmtInt(k.scoreComments || 0)} 条评分` },
    { key: 'finish', label: '服务完成率', value: (k.serviceFinishRate || 0).toFixed(1) + '%', color: '#4da2ff', sub: `工单 ${fmtInt(k.serviceTotal || 0)} 张` },
    { key: 'wallet', label: '会员总余额', value: '¥' + money(w.balance), color: '#b58bff', sub: `会员 ${fmtInt(w.users || 0)} 人` },
    { key: 'avg', label: '平均客单价', value: '¥' + money(k.avgOrderAmount), color: '#f78e3d', sub: '已支付订单' },
  ]
}

/* ---------- 图表 ---------- */
const funnelRef = ref(null)
const serviceModeRef = ref(null)
const userTrendRef = ref(null)
const storeRef = ref(null)
const ratingRef = ref(null)
const serviceTopRef = ref(null)

function fmtEventTime(time) {
  if (!time) return ''
  return String(time).slice(5, 16)
}

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
      orient: 'vertical', right: 4, top: 'center',
      textStyle: { color: '#9cc3e8', fontSize: 10 },
      itemWidth: 9, itemHeight: 9, itemGap: 7,
    },
    series: [{
      type: 'pie',
      radius: ['46%', '70%'],
      center: ['34%', '50%'],
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

function renderFunnel() {
  const c = initChart('funnel', funnelRef)
  if (!c || !funnel.value) return
  const f = funnel.value
  c.setOption({
    color: ['#25f0ee', '#ffc46b', '#3ddc97'],
    tooltip: { ...TOOLTIP, trigger: 'item', formatter: '{b}：{c}' },
    series: [{
      type: 'funnel',
      left: '8%', right: '8%', top: 8, bottom: 4,
      minSize: '32%',
      sort: 'descending',
      gap: 4,
      label: { show: true, position: 'inside', color: '#04101f', fontSize: 12, fontWeight: 700, formatter: '{b}  {c}' },
      itemStyle: { borderColor: '#081a30', borderWidth: 2 },
      data: [
        { name: '咨询', value: f.consults || 0 },
        { name: '下单', value: f.orders || 0 },
        { name: '成交', value: f.paidOrders || 0 },
      ],
    }],
  }, true)
}

function renderServiceMode() {
  const c = initChart('serviceMode', serviceModeRef)
  if (!c) return
  c.setOption(ringOption(serviceMode.value, ['#4da2ff', '#3ddc97', '#b58bff']), true)
}

function renderUserTrend() {
  const c = initChart('userTrend', userTrendRef)
  if (!c) return
  const t = data.value?.userTrend || { dates: [], newUsers: [] }
  c.setOption({
    tooltip: { ...TOOLTIP, trigger: 'axis' },
    grid: { left: 12, right: 26, top: 30, bottom: 6, containLabel: true },
    xAxis: {
      type: 'category', data: t.dates || [],
      axisTick: { show: false },
      axisLine: { lineStyle: { color: 'rgba(63,120,180,.4)' } },
      axisLabel: { ...AXIS, interval: Math.ceil((t.dates?.length || 1) / 12) },
    },
    yAxis: { type: 'value', minInterval: 1, splitLine: SPLIT, axisLabel: AXIS },
    series: [{
      name: '新增客户',
      type: 'line',
      data: t.newUsers || [],
      smooth: true,
      symbolSize: 5,
      lineStyle: { width: 2.5, color: '#25f0ee' },
      itemStyle: { color: '#25f0ee' },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(37, 240, 238, .38)' },
          { offset: 1, color: 'rgba(37, 240, 238, .02)' },
        ]),
      },
    }],
  }, true)
}

function renderStore() {
  const c = initChart('store', storeRef)
  if (!c) return
  const list = (storeCompare.value || []).slice(0, 8).reverse()
  c.setOption({
    grid: { left: 8, right: 56, top: 8, bottom: 2, containLabel: true },
    tooltip: { ...TOOLTIP, trigger: 'axis', axisPointer: { type: 'shadow' },
      formatter: (ps) => {
        const p = ps[0]
        const row = (storeCompare.value || []).find((s) => s.storeName === p.name) || {}
        return `${p.name}<br/>成交额 ¥${money(row.revenue)}<br/>订单 ${row.orders || 0} · 预约 ${row.appointments || 0} · 工单 ${row.serviceOrders || 0}`
      } },
    xAxis: { type: 'value', splitLine: SPLIT, axisLabel: { ...AXIS, fontSize: 10, formatter: (v) => '¥' + money(v) } },
    yAxis: {
      type: 'category', data: list.map((i) => i.storeName),
      axisTick: { show: false }, axisLine: { show: false },
      axisLabel: { color: '#9cc3e8', fontSize: 11, width: 96, overflow: 'truncate' },
    },
    series: [{
      type: 'bar', data: list.map((i) => i.revenue), barWidth: 10,
      itemStyle: { borderRadius: [0, 5, 5, 0], color: new echarts.graphic.LinearGradient(1, 0, 0, 0, [
        { offset: 0, color: '#ffc46b' }, { offset: 1, color: 'rgba(255,196,107,.08)' },
      ]) },
      label: { show: true, position: 'right', color: '#7fa8cc', fontSize: 10, formatter: (p) => '¥' + money(p.value) },
      animationDuration: 900, animationEasing: 'cubicOut',
    }],
  }, true)
}

function renderRating() {
  const c = initChart('rating', ratingRef)
  if (!c) return
  const list = (rating.value?.dist || []).slice().reverse()
  c.setOption({
    grid: { left: 8, right: 44, top: 8, bottom: 2, containLabel: true },
    tooltip: { ...TOOLTIP, trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'value', minInterval: 1, splitLine: SPLIT, axisLabel: { ...AXIS, fontSize: 10 } },
    yAxis: {
      type: 'category', data: list.map((i) => i.name),
      axisTick: { show: false }, axisLine: { show: false },
      axisLabel: { color: '#9cc3e8', fontSize: 11 },
    },
    series: [{
      type: 'bar', data: list.map((i) => i.value), barWidth: 10,
      itemStyle: { borderRadius: [0, 5, 5, 0], color: new echarts.graphic.LinearGradient(1, 0, 0, 0, [
        { offset: 0, color: '#ffc46b' }, { offset: 1, color: 'rgba(255,196,107,.08)' },
      ]) },
      label: { show: true, position: 'right', color: '#7fa8cc', fontSize: 10 },
      animationDuration: 900,
    }],
  }, true)
}

function renderServiceTop() {
  const c = initChart('serviceTop', serviceTopRef)
  if (!c) return
  const list = (data.value?.ranking?.services || []).slice(0, 8).reverse()
  c.setOption({
    grid: { left: 8, right: 46, top: 8, bottom: 2, containLabel: true },
    tooltip: { ...TOOLTIP, trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'value', minInterval: 1, splitLine: SPLIT, axisLabel: { ...AXIS, fontSize: 10 } },
    yAxis: {
      type: 'category', data: list.map((i) => i.name),
      axisTick: { show: false }, axisLine: { show: false },
      axisLabel: { color: '#9cc3e8', fontSize: 10, width: 92, overflow: 'truncate' },
    },
    series: [{
      type: 'bar', data: list.map((i) => i.value), barWidth: 8,
      itemStyle: { borderRadius: [0, 4, 4, 0], color: new echarts.graphic.LinearGradient(1, 0, 0, 0, [
        { offset: 0, color: '#3ddc97' }, { offset: 1, color: 'rgba(61,220,151,.08)' },
      ]) },
      label: { show: true, position: 'right', color: '#7fa8cc', fontSize: 10, formatter: (p) => p.value + ' 单' },
      animationDuration: 900,
    }],
  }, true)
}

function renderAll() {
  buildKpis()
  renderFunnel(); renderServiceMode(); renderUserTrend()
  renderStore(); renderRating(); renderServiceTop()
}

/* ---------- 数据加载 ---------- */
async function loadAll() {
  const res = await getDashboardBigscreen(days.value)
  data.value = res.data
  await nextTick()
  renderAll()
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
  await loadAll()
  mainTimer = setInterval(loadAll, 30_000)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', fit)
  document.removeEventListener('fullscreenchange', onFsChange)
  clearInterval(mainTimer); clearInterval(clockTimer)
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
  transform-origin: center center;
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
  /* 缓慢下移的扫描光束 */
  &::after {
    content: '';
    position: absolute; left: 0; right: 0; top: -120px;
    height: 120px;
    background: linear-gradient(180deg, transparent, rgba(37, 240, 238, .05) 55%, rgba(37, 240, 238, .12));
    animation: bs-scan 10s linear infinite;
    pointer-events: none;
  }
}
@keyframes bs-scan {
  to { transform: translateY(1340px); }
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
    background: linear-gradient(180deg, #ffffff 8%, #9ad9ff 55%, #25f0ee 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 0 18px rgba(37, 240, 238, .45)) drop-shadow(0 0 46px rgba(47, 123, 255, .3));
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
  transition: transform .2s, box-shadow .2s, border-color .2s;
  &:hover {
    transform: translateY(-2px);
    border-color: rgba(37, 240, 238, .45);
    box-shadow: 0 6px 22px rgba(0, 0, 0, .35), 0 0 14px rgba(37, 240, 238, .18);
  }
  &::before {
    content: '';
    position: absolute; left: 0; top: 0; bottom: 0;
    width: 3px;
    background: linear-gradient(180deg, #25f0ee, transparent);
    opacity: .7;
  }
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
  gap: 12px;
  min-height: 0;
  &.center { grid-template-rows: minmax(0, 1.7fr) minmax(0, 1fr); }
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
  overflow: hidden;
  &.grow { flex: 1; }
  &::before, &::after {
    content: '';
    position: absolute; inset: 0;
    pointer-events: none;
    background-repeat: no-repeat;
  }
  /* 四角科技描边 */
  &::before {
    background-image:
      linear-gradient(#25f0ee, #25f0ee), linear-gradient(#25f0ee, #25f0ee),
      linear-gradient(#25f0ee, #25f0ee), linear-gradient(#25f0ee, #25f0ee);
    background-position: left top, left top, right top, right top;
    background-size: 16px 2px, 2px 16px, 16px 2px, 2px 16px;
    opacity: .75;
  }
  &::after {
    background-image:
      linear-gradient(#25f0ee, #25f0ee), linear-gradient(#25f0ee, #25f0ee),
      linear-gradient(#25f0ee, #25f0ee), linear-gradient(#25f0ee, #25f0ee);
    background-position: left bottom, left bottom, right bottom, right bottom;
    background-size: 16px 2px, 2px 16px, 16px 2px, 2px 16px;
    opacity: .75;
  }
}
.panel-title {
  font-size: 15px;
  font-weight: 700;
  color: #d8ecff;
  letter-spacing: 1px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding-bottom: 6px;
  background: linear-gradient(90deg, rgba(37, 240, 238, .45), rgba(47, 123, 255, .15) 55%, transparent 85%) left bottom / 100% 1px no-repeat;
  &::before {
    content: '';
    width: 4px; height: 14px;
    border-radius: 2px;
    margin-right: 8px;
    background: linear-gradient(180deg, #25f0ee, #2f7bff);
    box-shadow: 0 0 8px rgba(37, 240, 238, .8);
  }
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

/* 会员资产卡 */
.wallet {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 12px;
  min-height: 0;
}
.wallet-main {
  display: flex;
  align-items: baseline;
  gap: 12px;
  .wallet-label { font-size: 13px; color: #9cc3e8; }
  .wallet-value {
    font-style: normal;
    font-size: 38px;
    font-weight: 800;
    color: #b58bff;
    font-variant-numeric: tabular-nums;
    text-shadow: 0 0 20px rgba(181, 139, 255, .5);
  }
}
.wallet-side {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  > div {
    padding: 8px 12px;
    border: 1px solid rgba(37, 240, 238, .12);
    border-radius: 8px;
    background: rgba(20, 55, 95, .3);
    b { display: block; font-size: 20px; color: #d8ecff; font-variant-numeric: tabular-nums; }
    i { font-style: normal; font-size: 11px; color: #5f86ad; }
  }
}

/* 最新评价 */
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
    padding: 8px 4px;
    border-bottom: 1px dashed rgba(63, 120, 180, .2);
    font-size: 13px;
    animation: feed-in .45s ease both;
  }
}
@keyframes feed-in {
  from { opacity: 0; transform: translateX(18px); }
  to { opacity: 1; transform: translateX(0); }
}
.feed-stars {
  flex-shrink: 0;
  i { font-style: normal; font-size: 13px; color: rgba(255, 196, 107, .22); }
  i.on { color: #ffc46b; text-shadow: 0 0 6px rgba(255, 196, 107, .5); }
}
.feed-user {
  flex-shrink: 0;
  color: #9cc3e8;
  font-weight: 600;
  max-width: 88px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.feed-content {
  flex: 1;
  color: #c4dcf5;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.feed-time { color: #5f86ad; font-size: 12px; font-variant-numeric: tabular-nums; flex-shrink: 0; }
.empty { color: #5f86ad; font-size: 13px; padding: 16px 4px; }
.center-empty {
  position: absolute;
  inset: 34px 0 8px;
  display: grid;
  place-items: center;
  padding: 0;
}
</style>
