<template>
  <div class="dash" v-loading="loading" element-loading-text="正在聚合历史数据...">
    <!-- 顶部：标题 + 时间范围 + 实时开关 -->
    <header class="dash-head">
      <div class="head-title">
        <h2>数据看板</h2>
        <p>
          真实业务数据 · {{ rangeText }} · 每日聚合
          <span class="dot-sep">·</span>
          数据源：预约 / 订单 / 咨询 / 互动 / 取消记录
        </p>
      </div>
      <div class="head-tools">
        <span class="live" :class="{ on: autoRefresh }">
          <i></i>{{ autoRefresh ? '实时刷新中' : '已暂停' }}
        </span>
        <el-radio-group v-model="days" size="small" @change="handleRangeChange">
          <el-radio-button :value="7">近 7 天</el-radio-button>
          <el-radio-button :value="30">近 30 天</el-radio-button>
          <el-radio-button :value="90">近 90 天</el-radio-button>
        </el-radio-group>
        <el-select v-model="intervalSec" size="small" style="width: 96px" @change="resetRealtimeTimer">
          <el-option :value="10" label="10 秒" />
          <el-option :value="30" label="30 秒" />
          <el-option :value="60" label="60 秒" />
        </el-select>
        <el-switch v-model="autoRefresh" size="small" @change="resetRealtimeTimer" />
        <el-button size="small" :loading="refreshing" @click="manualRefresh">
          <el-icon><Refresh /></el-icon>刷新
        </el-button>
      </div>
    </header>

    <div class="meta-bar">
      <span v-if="updatedAt">最后更新 {{ updatedAt }}</span>
      <span v-if="overview">
        待处理预约 <b class="warn">{{ overview.pendingAppointments }}</b>
        <span class="dot-sep">·</span>
        待回复咨询 <b class="warn">{{ overview.pendingConsults }}</b>
        <span class="dot-sep">·</span>
        在售宠物 <b>{{ overview.totalPets }}</b>
        <span class="dot-sep">·</span>
        平台用户 <b>{{ overview.totalUsers }}</b>
      </span>
      <span v-if="todayStat" class="today-chip">
        今日新增：订单 {{ todayStat.todayOrders || 0 }} · 预约 {{ todayStat.todayAppointments || 0 }} · 咨询
        {{ (todayStat.todayConsults || 0) + (todayStat.todayDoctorConsults || 0) }}
      </span>
    </div>

    <!-- AI 经营洞察 -->
    <section class="ai-insight">
      <div class="ai-insight-head">
        <div class="ai-title">
          <span class="ai-badge">🤖 AI 洞察</span>
          <h3>智能经营分析</h3>
          <p>自动读取近 {{ days }} 天的预约、订单、咨询与取消数据，给出结论和行动建议</p>
        </div>
        <el-button type="primary" round :loading="aiLoading" @click="loadInsight">
          {{ aiText ? '重新生成' : '生成分析' }}
        </el-button>
      </div>
      <div v-if="aiText" class="ai-body" :class="{ rule: aiSource !== 'ai' }">
        <p class="ai-text">{{ aiText }}</p>
        <span class="ai-source">
          {{ aiSource === 'ai' ? '由大模型基于真实业务数据生成 · 仅供参考' : '模型通道繁忙，本次由本地规则生成' }}
        </span>
      </div>
      <p v-else class="ai-empty">
        点击「生成分析」，AI 会总结本期表现、指出关键问题，并给出可执行的运营建议。
      </p>
    </section>

    <!-- KPI -->
    <section class="kpi-grid">
      <div v-for="k in kpis" :key="k.key" class="kpi-card" :style="{ '--accent': k.color }">
        <div class="kpi-head">
          <span class="kpi-label">{{ k.label }}</span>
          <span v-if="k.growth !== null" class="badge" :class="growthClass(k.growth)">
            {{ growthText(k.growth) }}
          </span>
          <span v-else class="badge flat">区间</span>
        </div>
        <div class="kpi-value">{{ k.value }}</div>
        <div class="kpi-sub">{{ k.sub }}</div>
      </div>
    </section>

    <!-- 趋势 + 实时动态 -->
    <section class="grid grid-main">
      <div class="card">
        <div class="card-head">
          <h3>业务趋势</h3>
          <span>订单 / 预约 / 咨询（左轴） · 营业额（右轴）</span>
        </div>
        <div ref="trendRef" class="chart chart-lg"></div>
      </div>
      <div class="card feed-card">
        <div class="card-head">
          <h3>实时动态</h3>
          <span class="live-tag" :class="{ on: autoRefresh }">LIVE</span>
        </div>
        <ul v-if="feed.length" class="feed">
          <li v-for="(item, idx) in feed" :key="idx">
            <span class="feed-icon" :style="{ background: typeMeta(item.type).bg }">{{ typeMeta(item.type).icon }}</span>
            <div class="feed-body">
              <div class="feed-title">{{ item.title }}</div>
              <div class="feed-time">
                {{ fmtEventTime(item.time) }}
                <span class="feed-status" :class="statusClass(item)">{{ feedStatus(item) }}</span>
              </div>
            </div>
            <span v-if="item.amount" class="feed-amount">¥{{ money(item.amount) }}</span>
          </li>
        </ul>
        <div v-else class="empty">暂无业务动态</div>
      </div>
    </section>

    <!-- 分布 -->
    <section class="grid grid-3">
      <div class="card">
        <div class="card-head"><h3>预约状态分布</h3><span>区间内</span></div>
        <div ref="aptStatusRef" class="chart chart-md"></div>
      </div>
      <div class="card">
        <div class="card-head"><h3>订单状态分布</h3><span>区间内</span></div>
        <div ref="orderStatusRef" class="chart chart-md"></div>
      </div>
      <div class="card">
        <div class="card-head"><h3>在售宠物分类</h3><span>库存结构</span></div>
        <div ref="categoryRef" class="chart chart-md"></div>
      </div>
    </section>

    <!-- 排行 -->
    <section class="grid grid-2">
      <div class="card">
        <div class="card-head"><h3>预约热度 TOP8</h3><span>{{ rangeText }}预约次数</span></div>
        <div ref="topPetsRef" class="chart chart-md"></div>
      </div>
      <div class="card">
        <div class="card-head"><h3>热销商品 TOP8</h3><span>{{ rangeText }}成交金额</span></div>
        <div ref="topGoodsRef" class="chart chart-md"></div>
      </div>
    </section>

    <!-- 时段 -->
    <section class="grid grid-1">
      <div class="card">
        <div class="card-head"><h3>24 小时活跃分布</h3><span>下单与预约的时段偏好</span></div>
        <div ref="hourlyRef" class="chart chart-sm"></div>
      </div>
    </section>

    <p class="footnote">
      说明：所有指标由后端对业务表实时聚合（左闭右开时间区间、按天补零），切换时间范围会重新查询数据库；「实时动态」按
      {{ intervalSec }} 秒轮询刷新。
    </p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts/core'
import { LineChart, BarChart, PieChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  DataZoomComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { getDashboardAll, getDashboardRealtime } from '@/api/pet/dashboard'
import { aiInsight } from '@/api/pet/petAi'

echarts.use([
  LineChart,
  BarChart,
  PieChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  DataZoomComponent,
  CanvasRenderer,
])

// ------------------------------------------------------------------ 状态
const days = ref(30)
const loading = ref(false)
const refreshing = ref(false)

/* ---------- AI 经营洞察 ---------- */
const aiLoading = ref(false)
const aiText = ref('')
const aiSource = ref('')

async function loadInsight() {
  if (aiLoading.value) return
  aiLoading.value = true
  try {
    const res = await aiInsight(days.value)
    const data = (res && res.data) || {}
    aiText.value = data.insight || '暂时没有拿到分析结果，请稍后重试。'
    aiSource.value = data.source || 'rule'
  } catch (e) {
    ElMessage.error(e?.message || 'AI 分析失败，请稍后重试')
  } finally {
    aiLoading.value = false
  }
}
const autoRefresh = ref(true)
const intervalSec = ref(30)
const updatedAt = ref('')
const dashboard = ref(null)
const realtime = ref(null)

const trendRef = ref(null)
const aptStatusRef = ref(null)
const orderStatusRef = ref(null)
const categoryRef = ref(null)
const topPetsRef = ref(null)
const topGoodsRef = ref(null)
const hourlyRef = ref(null)

let trendChart = null
let aptStatusChart = null
let orderStatusChart = null
let categoryChart = null
let topPetsChart = null
let topGoodsChart = null
let hourlyChart = null

let realtimeTimer = null
let fullTimer = null
let resizeTimer = null

// ------------------------------------------------------------------ 计算属性
const overview = computed(() => dashboard.value?.overview || null)
const todayStat = computed(() => realtime.value?.today || dashboard.value?.today || null)
const feed = computed(() => realtime.value?.feed || [])
const trend = computed(() => dashboard.value?.trend || null)
const rangeText = computed(() => `近 ${days.value} 天`)

const kpis = computed(() => {
  const o = overview.value
  if (!o) return []
  const t = todayStat.value || {}
  return [
    {
      key: 'revenue',
      label: '营业额',
      value: '¥' + money(o.revenue),
      growth: o.growth?.revenue ?? null,
      sub: `今日 ¥${money(t.todayRevenue || 0)} · 客单价 ¥${money(o.avgOrderAmount || 0)}`,
      color: '#ff8c42',
    },
    {
      key: 'orders',
      label: '订单量',
      value: fmtInt(o.orders),
      growth: o.growth?.orders ?? null,
      sub: `今日 ${t.todayOrders || 0} 单 · 待处理 ${o.pendingOrders}`,
      color: '#5b8def',
    },
    {
      key: 'appointments',
      label: '预约量',
      value: fmtInt(o.appointments),
      growth: o.growth?.appointments ?? null,
      sub: `今日 ${t.todayAppointments || 0} 单 · 待处理 ${o.pendingAppointments}`,
      color: '#52c41a',
    },
    {
      key: 'consults',
      label: '咨询量',
      value: fmtInt((o.consults || 0) + (o.doctorConsults || 0)),
      growth: o.growth?.consults ?? null,
      sub: `今日 ${(t.todayConsults || 0) + (t.todayDoctorConsults || 0)} 次 · 待回复 ${o.pendingConsults}`,
      color: '#9254de',
    },
    {
      key: 'social',
      label: '互动量',
      value: fmtInt((o.favorites || 0) + (o.comments || 0) + (o.likes || 0)),
      growth: o.growth?.favorites ?? null,
      sub: `收藏 ${o.favorites} · 评论 ${o.comments} · 点赞 ${o.likes}`,
      color: '#13c2c2',
    },
    {
      key: 'cancel',
      label: '取消率',
      value: `${o.cancelRate}%`,
      growth: null,
      sub: `取消 ${o.cancels} 笔 · 今日 ${t.todayCancels || 0} 笔`,
      color: '#f56c6c',
    },
  ]
})

// ------------------------------------------------------------------ 工具函数
function money(v) {
  const n = Number(v || 0)
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtInt(v) {
  return Number(v || 0).toLocaleString('zh-CN')
}

function growthClass(g) {
  if (g > 0) return 'up'
  if (g < 0) return 'down'
  return 'flat'
}

function growthText(g) {
  if (g > 0) return `↑ ${g}%`
  if (g < 0) return `↓ ${Math.abs(g)}%`
  return '持平'
}

const FEED_META = {
  appointment: { icon: '📅', label: '预约', bg: '#eef4ff' },
  order: { icon: '🛒', label: '订单', bg: '#fff4e9' },
  consult: { icon: '💬', label: '咨询', bg: '#f5eeff' },
  doctor: { icon: '🩺', label: '问诊', bg: '#e9fbfb' },
  cancel: { icon: '↩️', label: '取消', bg: '#fdeeee' },
}

function typeMeta(type) {
  return FEED_META[type] || { icon: '•', label: '动态', bg: '#f4f4f5' }
}

function feedStatus(item) {
  const s = String(item.status ?? '')
  if (item.type === 'appointment') return { '0': '待处理', '1': '已确认', '2': '已完成', '3': '已取消' }[s] || '—'
  if (item.type === 'order') return { '0': '正常', '3': '已取消' }[s] || '—'
  if (item.type === 'consult') return s === '0' ? '待回复' : '已回复'
  if (item.type === 'cancel') return '已取消'
  return '已解答'
}

function statusClass(item) {
  const text = feedStatus(item)
  if (text === '已取消' || text === '待处理' || text === '待回复') return 'warn'
  if (text === '已完成' || text === '已回复' || text === '已解答' || text === '已确认') return 'ok'
  return ''
}

function fmtEventTime(t) {
  if (!t) return ''
  const s = String(t)
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  if (s.slice(0, 10) === todayStr) return '今天 ' + s.slice(11, 19)
  return s.slice(5, 16)
}

// ------------------------------------------------------------------ 数据加载
async function loadAll(showLoading = false) {
  if (showLoading) loading.value = true
  try {
    const res = await getDashboardAll(days.value)
    dashboard.value = res.data
    updatedAt.value = res.data?.generatedAt || ''
    await nextTick()
    renderAll()
  } catch (e) {
    // 请求层已统一提示
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

async function loadRealtime() {
  try {
    const res = await getDashboardRealtime()
    realtime.value = res.data
  } catch (e) {
    // 静默失败，等待下一次轮询
  }
}

async function manualRefresh() {
  refreshing.value = true
  await Promise.all([loadAll(false), loadRealtime()])
}

async function handleRangeChange() {
  await loadAll(true)
}

function resetRealtimeTimer() {
  clearInterval(realtimeTimer)
  clearInterval(fullTimer)
  if (!autoRefresh.value) return
  realtimeTimer = setInterval(loadRealtime, intervalSec.value * 1000)
  // 完整重算（趋势/分布）每 5 分钟一次，避免频繁重查
  fullTimer = setInterval(() => loadAll(false), 5 * 60 * 1000)
}

// ------------------------------------------------------------------ 图表渲染
function renderAll() {
  renderTrend()
  renderAptStatus()
  renderOrderStatus()
  renderCategory()
  renderTopPets()
  renderTopGoods()
  renderHourly()
}

function ensureCharts() {
  if (!trendChart && trendRef.value) trendChart = echarts.init(trendRef.value)
  if (!aptStatusChart && aptStatusRef.value) aptStatusChart = echarts.init(aptStatusRef.value)
  if (!orderStatusChart && orderStatusRef.value) orderStatusChart = echarts.init(orderStatusRef.value)
  if (!categoryChart && categoryRef.value) categoryChart = echarts.init(categoryRef.value)
  if (!topPetsChart && topPetsRef.value) topPetsChart = echarts.init(topPetsRef.value)
  if (!topGoodsChart && topGoodsRef.value) topGoodsChart = echarts.init(topGoodsRef.value)
  if (!hourlyChart && hourlyRef.value) hourlyChart = echarts.init(hourlyRef.value)
}

const AXIS_LABEL = { color: '#909399', fontSize: 11 }
const SPLIT_LINE = { lineStyle: { color: '#f0f2f5', type: 'dashed' } }

function renderTrend() {
  if (!trend.value) return
  ensureCharts()
  if (!trendChart) return
  const t = trend.value
  const showZoom = t.dates.length > 31
  trendChart.setOption(
    {
      color: ['#ff8c42', '#5b8def', '#52c41a', '#c9a227'],
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross', label: { backgroundColor: '#606266' } },
        backgroundColor: 'rgba(255,255,255,.96)',
        borderColor: '#ebeef5',
        textStyle: { color: '#303133', fontSize: 12 },
        formatter: (params) => {
          const idx = params[0].dataIndex
          let html = `<div style="font-weight:600;margin-bottom:5px">${t.dates[idx]}</div>`
          params.forEach((p) => {
            const isMoney = p.seriesName === '营业额'
            const val = isMoney ? '¥' + money(p.value) : `${p.value}`
            html += `<div style="display:flex;justify-content:space-between;gap:20px;line-height:20px"><span>${p.marker}${p.seriesName}</span><b>${val}</b></div>`
          })
          return html
        },
      },
      legend: {
        top: 0,
        right: 0,
        icon: 'roundRect',
        itemWidth: 10,
        itemHeight: 6,
        textStyle: { color: '#606266', fontSize: 12 },
      },
      grid: { left: 6, right: 10, top: 42, bottom: showZoom ? 40 : 6, containLabel: true },
      xAxis: {
        type: 'category',
        data: t.dates,
        boundaryGap: false,
        axisLine: { lineStyle: { color: '#e4e7ed' } },
        axisTick: { show: false },
        axisLabel: { ...AXIS_LABEL, formatter: (v) => v.slice(5) },
      },
      yAxis: [
        {
          type: 'value',
          name: '单量',
          nameTextStyle: { color: '#b1b3b8', fontSize: 11 },
          splitLine: SPLIT_LINE,
          axisLabel: AXIS_LABEL,
        },
        {
          type: 'value',
          name: '营业额',
          nameTextStyle: { color: '#b1b3b8', fontSize: 11 },
          splitLine: { show: false },
          axisLabel: { ...AXIS_LABEL, formatter: (v) => (v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v) },
        },
      ],
      series: [
        {
          name: '订单量',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          showSymbol: t.dates.length <= 31,
          lineStyle: { width: 2.5 },
          areaStyle: { opacity: 0.1 },
          data: t.orders,
        },
        {
          name: '预约量',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          showSymbol: t.dates.length <= 31,
          lineStyle: { width: 2.5 },
          areaStyle: { opacity: 0.08 },
          data: t.appointments,
        },
        {
          name: '咨询量',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          showSymbol: t.dates.length <= 31,
          lineStyle: { width: 2 },
          data: t.consults,
        },
        {
          name: '营业额',
          type: 'bar',
          yAxisIndex: 1,
          barWidth: t.dates.length > 45 ? 4 : 8,
          itemStyle: { color: 'rgba(201,162,39,.28)', borderRadius: [3, 3, 0, 0] },
          data: t.revenue,
        },
      ],
      dataZoom: showZoom
        ? [
            { type: 'inside' },
            { type: 'slider', height: 16, bottom: 2, borderColor: 'transparent', fillerColor: 'rgba(255,140,66,.12)', handleSize: 14 },
          ]
        : [{ type: 'inside' }],
    },
    true
  )
}

function pieOption(items, colors) {
  const total = items.reduce((sum, i) => sum + Number(i.value || 0), 0)
  return {
    color: colors,
    title: {
      text: fmtInt(total),
      subtext: '总计',
      left: 'center',
      top: '32%',
      textAlign: 'center',
      textStyle: { color: '#303133', fontSize: 22, fontWeight: 700 },
      subtextStyle: { color: '#a8abb2', fontSize: 11 },
    },
    tooltip: { trigger: 'item', formatter: '{b}：{c}（{d}%）' },
    legend: {
      bottom: 0,
      icon: 'circle',
      itemWidth: 8,
      itemHeight: 8,
      itemGap: 14,
      textStyle: { color: '#606266', fontSize: 11 },
      formatter: (name) => {
        const item = items.find((i) => i.name === name)
        return `${name} ${item ? item.value : ''}`
      },
    },
    series: [
      {
        type: 'pie',
        radius: ['52%', '72%'],
        center: ['50%', '42%'],
        avoidLabelOverlap: true,
        itemStyle: { borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        labelLine: { show: false },
        emphasis: { scale: true, scaleSize: 6 },
        data: items,
      },
    ],
  }
}

function renderAptStatus() {
  const items = dashboard.value?.distribution?.appointmentStatus || []
  ensureCharts()
  if (!aptStatusChart) return
  aptStatusChart.setOption(pieOption(items, ['#e6a23c', '#5b8def', '#52c41a', '#c8c9cc']), true)
}

function renderOrderStatus() {
  const items = dashboard.value?.distribution?.orderStatus || []
  ensureCharts()
  if (!orderStatusChart) return
  orderStatusChart.setOption(pieOption(items, ['#ff8c42', '#c8c9cc']), true)
}

function renderCategory() {
  const items = dashboard.value?.distribution?.category || []
  ensureCharts()
  if (!categoryChart) return
  categoryChart.setOption(
    {
      grid: { left: 6, right: 10, top: 16, bottom: 4, containLabel: true },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: '{b}：{c} 只' },
      xAxis: {
        type: 'category',
        data: items.map((i) => i.name),
        axisTick: { show: false },
        axisLine: { lineStyle: { color: '#e4e7ed' } },
        axisLabel: { ...AXIS_LABEL, interval: 0, fontSize: 10 },
      },
      yAxis: { type: 'value', splitLine: SPLIT_LINE, axisLabel: AXIS_LABEL },
      series: [
        {
          type: 'bar',
          data: items.map((i) => i.value),
          barWidth: '46%',
          itemStyle: { color: '#ffb27a', borderRadius: [5, 5, 0, 0] },
          emphasis: { itemStyle: { color: '#ff8c42' } },
          label: { show: true, position: 'top', color: '#909399', fontSize: 10 },
        },
      ],
    },
    true
  )
}

function renderTopPets() {
  const items = (dashboard.value?.ranking?.pets || []).slice().reverse()
  ensureCharts()
  if (!topPetsChart) return
  topPetsChart.setOption(
    {
      grid: { left: 6, right: 30, top: 10, bottom: 4, containLabel: true },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: '{b}：{c} 次预约' },
      xAxis: { type: 'value', splitLine: SPLIT_LINE, axisLabel: AXIS_LABEL },
      yAxis: {
        type: 'category',
        data: items.map((i) => i.name),
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: { color: '#606266', fontSize: 11, width: 96, overflow: 'truncate' },
      },
      series: [
        {
          type: 'bar',
          data: items.map((i) => i.value),
          barWidth: 12,
          itemStyle: { color: '#7ea6f5', borderRadius: [0, 6, 6, 0] },
          emphasis: { itemStyle: { color: '#5b8def' } },
          label: { show: true, position: 'right', color: '#909399', fontSize: 10 },
        },
      ],
    },
    true
  )
}

function renderTopGoods() {
  const items = (dashboard.value?.ranking?.goods || []).slice().reverse()
  ensureCharts()
  if (!topGoodsChart) return
  topGoodsChart.setOption(
    {
      grid: { left: 6, right: 46, top: 10, bottom: 4, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params) => {
          const i = items[params[0].dataIndex]
          return `${i.name}<br/>成交额：¥${money(i.amount)}<br/>订单数：${i.orders} 单`
        },
      },
      xAxis: { type: 'value', splitLine: SPLIT_LINE, axisLabel: { ...AXIS_LABEL, formatter: (v) => '¥' + v } },
      yAxis: {
        type: 'category',
        data: items.map((i) => i.name),
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: { color: '#606266', fontSize: 11, width: 96, overflow: 'truncate' },
      },
      series: [
        {
          type: 'bar',
          data: items.map((i) => i.amount),
          barWidth: 12,
          itemStyle: { color: '#ffc48a', borderRadius: [0, 6, 6, 0] },
          emphasis: { itemStyle: { color: '#ff8c42' } },
          label: {
            show: true,
            position: 'right',
            color: '#909399',
            fontSize: 10,
            formatter: (p) => '¥' + Number(p.value).toFixed(0),
          },
        },
      ],
    },
    true
  )
}

function renderHourly() {
  const h = dashboard.value?.hourly || { hours: [], orders: [], appointments: [] }
  ensureCharts()
  if (!hourlyChart) return
  hourlyChart.setOption(
    {
      color: ['#ff8c42', '#5b8def'],
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { top: 0, right: 0, icon: 'roundRect', itemWidth: 10, itemHeight: 6, textStyle: { color: '#606266', fontSize: 12 } },
      grid: { left: 6, right: 10, top: 34, bottom: 4, containLabel: true },
      xAxis: {
        type: 'category',
        data: h.hours.map((v) => `${String(v).padStart(2, '0')}:00`),
        axisTick: { show: false },
        axisLine: { lineStyle: { color: '#e4e7ed' } },
        axisLabel: { ...AXIS_LABEL, interval: 1 },
      },
      yAxis: { type: 'value', splitLine: SPLIT_LINE, axisLabel: AXIS_LABEL },
      series: [
        {
          name: '订单',
          type: 'bar',
          data: h.orders,
          barWidth: 8,
          itemStyle: { borderRadius: [3, 3, 0, 0] },
        },
        {
          name: '预约',
          type: 'bar',
          data: h.appointments,
          barWidth: 8,
          itemStyle: { borderRadius: [3, 3, 0, 0] },
        },
      ],
    },
    true
  )
}

// ------------------------------------------------------------------ 生命周期
function handleResize() {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => {
    ;[trendChart, aptStatusChart, orderStatusChart, categoryChart, topPetsChart, topGoodsChart, hourlyChart].forEach((c) => c && c.resize())
  }, 120)
}

onMounted(async () => {
  ensureCharts()
  await Promise.all([loadAll(true), loadRealtime()])
  resetRealtimeTimer()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  clearInterval(realtimeTimer)
  clearInterval(fullTimer)
  clearTimeout(resizeTimer)
  window.removeEventListener('resize', handleResize)
  ;[trendChart, aptStatusChart, orderStatusChart, categoryChart, topPetsChart, topGoodsChart, hourlyChart].forEach((c) => c && c.dispose())
  trendChart = aptStatusChart = orderStatusChart = categoryChart = topPetsChart = topGoodsChart = hourlyChart = null
})
</script>

<style scoped lang="scss">
.dash {
  padding: 20px 24px 30px;
  background: #f4f6f9;
  min-height: calc(100vh - 60px);
  box-sizing: border-box;
}

.dash-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 10px;

  h2 {
    margin: 0;
    font-size: 22px;
    font-weight: 700;
    color: #1f2329;
    letter-spacing: 0.5px;
  }

  p {
    margin: 6px 0 0;
    font-size: 12px;
    color: #909399;
  }
}

.head-tools {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.live {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #909399;
  padding: 4px 10px;
  border-radius: 20px;
  background: #eef0f3;

  i {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #c0c4cc;
  }

  &.on {
    color: #3d9c40;
    background: #eaf7ea;

    i {
      background: #52c41a;
      box-shadow: 0 0 0 0 rgba(82, 196, 26, 0.5);
      animation: pulse 1.8s infinite;
    }
  }
}

@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(82, 196, 26, 0.45); }
  70% { box-shadow: 0 0 0 7px rgba(82, 196, 26, 0); }
  100% { box-shadow: 0 0 0 0 rgba(82, 196, 26, 0); }
}

.meta-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  font-size: 12px;
  color: #909399;
  margin-bottom: 16px;

  b {
    color: #303133;
    font-weight: 600;
  }

  b.warn {
    color: #e6a23c;
  }
}

.dot-sep {
  margin: 0 6px;
  color: #dcdfe6;
}

.today-chip {
  margin-left: auto;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 14px;
  padding: 3px 12px;
  color: #606266;
}

/* AI 经营洞察 */
.ai-insight {
  background: linear-gradient(135deg, #fff7f1 0%, #ffffff 60%);
  border: 1px solid #ffe0cc;
  border-radius: 16px;
  padding: 18px 20px;
  margin-bottom: 16px;
  box-shadow: 0 6px 20px rgba(255, 107, 53, 0.07);
}
.ai-insight-head {
  display: flex;
  align-items: center;
  gap: 16px;
  justify-content: space-between;
  flex-wrap: wrap;
}
.ai-insight .ai-title h3 {
  margin: 6px 0 3px;
  font-size: 17px;
  color: #303133;
}
.ai-insight .ai-title p {
  margin: 0;
  font-size: 12.5px;
  color: #909399;
}
.ai-badge {
  display: inline-block;
  font-size: 12px;
  font-weight: 600;
  color: #ff6b35;
  background: #fff1e6;
  border-radius: 10px;
  padding: 2px 9px;
}
.ai-body {
  margin-top: 14px;
  padding: 14px 16px;
  background: #fff;
  border-radius: 12px;
  border-left: 3px solid #ff8c42;
}
.ai-body.rule {
  border-left-color: #e6a23c;
}
.ai-text {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.85;
  color: #4a4a4a;
  white-space: pre-wrap;
}
.ai-source {
  display: block;
  margin-top: 8px;
  font-size: 11.5px;
  color: #b0b3b8;
}
.ai-empty {
  margin: 14px 0 0;
  font-size: 13px;
  color: #a0a3a8;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 16px;
}

.kpi-card {
  background: #fff;
  border-radius: 10px;
  padding: 16px 18px;
  border: 1px solid #eef0f3;
  position: relative;
  overflow: hidden;
  transition: box-shadow 0.2s, transform 0.2s;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: var(--accent);
  }

  &:hover {
    box-shadow: 0 6px 18px rgba(31, 35, 41, 0.07);
    transform: translateY(-2px);
  }
}

.kpi-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.kpi-label {
  font-size: 12px;
  color: #909399;
}

.badge {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 9px;
  line-height: 16px;
  white-space: nowrap;

  &.up {
    color: #d4380d;
    background: #fff2e8;
  }

  &.down {
    color: #389e0d;
    background: #f0f9eb;
  }

  &.flat {
    color: #909399;
    background: #f4f4f5;
  }
}

.kpi-value {
  font-size: 25px;
  font-weight: 700;
  color: #1f2329;
  margin: 8px 0 4px;
  letter-spacing: -0.5px;
  white-space: nowrap;
}

.kpi-sub {
  font-size: 11px;
  color: #a8abb2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.grid {
  display: grid;
  gap: 14px;
  margin-bottom: 14px;
}

.grid-main {
  grid-template-columns: minmax(0, 2fr) minmax(min(280px, 100%), 1fr);
}

.grid-3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.grid-2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.grid-1 {
  grid-template-columns: minmax(0, 1fr);
}

.card {
  background: #fff;
  border-radius: 10px;
  border: 1px solid #eef0f3;
  padding: 14px 16px 10px;
  min-width: 0;
}

.card-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;

  h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: #303133;
  }

  span {
    font-size: 11px;
    color: #a8abb2;
  }
}

.chart {
  width: 100%;
}

.chart-lg {
  height: 328px;
}

.chart-md {
  height: 226px;
}

.chart-sm {
  height: 200px;
}

.live-tag {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1px;
  color: #c0c4cc;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 0 5px;
  line-height: 15px;

  &.on {
    color: #f56c6c;
    border-color: #fbc4c4;
    background: #fef0f0;
  }
}

.feed-card {
  display: flex;
  flex-direction: column;
}

.feed {
  list-style: none;
  margin: 6px 0 0;
  padding: 0 2px 0 0;
  overflow-y: auto;
  max-height: 316px;

  li {
    display: flex;
    align-items: flex-start;
    gap: 9px;
    padding: 8px 0;
    border-bottom: 1px dashed #f0f2f5;

    &:last-child {
      border-bottom: none;
    }
  }
}

.feed-icon {
  width: 26px;
  height: 26px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  flex-shrink: 0;
}

.feed-body {
  min-width: 0;
  flex: 1;
}

.feed-title {
  font-size: 12.5px;
  color: #303133;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.feed-time {
  font-size: 11px;
  color: #a8abb2;
  margin-top: 3px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.feed-status {
  font-size: 10px;
  padding: 0 5px;
  border-radius: 3px;
  background: #f4f4f5;
  color: #909399;

  &.ok {
    color: #389e0d;
    background: #f0f9eb;
  }

  &.warn {
    color: #d48806;
    background: #fdf6ec;
  }
}

.feed-amount {
  font-size: 12px;
  font-weight: 600;
  color: #ff8c42;
  white-space: nowrap;
  padding-top: 2px;
}

.empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #c0c4cc;
  font-size: 12px;
  min-height: 180px;
}

.footnote {
  margin: 4px 2px 0;
  font-size: 11px;
  color: #b1b3b8;
  line-height: 18px;
}

@media (max-width: 1400px) {
  .kpi-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 1100px) {
  .grid-main,
  .grid-2,
  .grid-3 {
    grid-template-columns: minmax(0, 1fr);
  }

  .kpi-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

/* 手机端：图表等比收窄，避免一张图表占满一屏 */
@media (max-width: 768px) {
  .dash {
    padding: 12px 10px 24px;
  }

  .dash-head h2 {
    font-size: 18px;
  }

  .chart-lg {
    height: min(240px, 32vh);
  }

  .chart-md {
    height: min(200px, 28vh);
  }

  .chart-sm {
    height: min(170px, 25vh);
  }

  .kpi-grid {
    gap: 8px;
  }
}
</style>
