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
        {{ todayStat.todayConsults || 0 }}
      </span>
    </div>

    <!-- KPI -->
    <!-- 指标条：竖细线切分，与订单页 ui-stats 同一套写法，不做卡片 -->
    <section class="kpi-strip">
      <div v-for="k in kpis" :key="k.key" class="kpi">
        <div class="kpi-head">
          <span class="kpi-label">{{ k.label }}</span>
          <span v-if="k.tone" class="badge" :class="k.tone.cls">{{ k.tone.text }}</span>
          <span v-else-if="k.growth !== null" class="badge" :class="growthClass(k.growth)">
            {{ growthText(k.growth) }}
          </span>
          <span v-else class="badge flat">区间内</span>
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
            <span class="feed-icon" :style="{ background: typeMeta(item.type).bg }"><el-icon><component :is="typeMeta(item.type).icon" /></el-icon></span>
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
import { useDashboardCharts } from './useDashboardCharts'

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


let realtimeTimer = null
let fullTimer = null
let resizeTimer = null

// 图表层（实例 + option + 渲染/缩放/销毁）抽到 useDashboardCharts，
// 页面只保留数据与交互。refs 传模板 ref，dashboard/money 由这里提供。
const charts = useDashboardCharts({
  dashboard,
  money,
  fmtInt,
  refs: {
    trend: trendRef,
    aptStatus: aptStatusRef,
    orderStatus: orderStatusRef,
    category: categoryRef,
    topPets: topPetsRef,
    topGoods: topGoodsRef,
    hourly: hourlyRef
  }
})

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
    },
    {
      key: 'orders',
      label: '订单量',
      value: fmtInt(o.orders),
      growth: o.growth?.orders ?? null,
      sub: `今日 ${t.todayOrders || 0} 单 · 待处理 ${o.pendingOrders}`,
    },
    {
      key: 'appointments',
      label: '预约量',
      value: fmtInt(o.appointments),
      growth: o.growth?.appointments ?? null,
      sub: `今日 ${t.todayAppointments || 0} 单 · 待处理 ${o.pendingAppointments}`,
    },
    {
      key: 'consults',
      label: '咨询量',
      value: fmtInt(o.consults || 0),
      growth: o.growth?.consults ?? null,
      sub: `今日 ${t.todayConsults || 0} 次 · 待回复 ${o.pendingConsults}`,
    },
    {
      key: 'social',
      label: '互动量',
      // 值是收藏 + 评论 + 点赞的合计，三者增长率口径不同，不拿单个分项冒充整体 → 不给涨跌徽标
      value: fmtInt((o.favorites || 0) + (o.comments || 0) + (o.likes || 0)),
      growth: null,
      sub: `收藏 ${o.favorites} · 评论 ${o.comments} · 点赞 ${o.likes}`,
    },
    {
      key: 'cancel',
      label: '取消率',
      value: `${o.cancelRate}%`,
      growth: null,
      // 取消率不适合用涨跌表达（越低越好），改按阈值给结论
      tone: cancelTone(o.cancelRate),
      sub: `取消 ${o.cancels} 笔 · 今日 ${t.todayCancels || 0} 笔`,
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

/** 取消率阈值评价：≥10% 偏高，≥5% 需关注，其余正常 */
function cancelTone(rate) {
  const v = Number(rate || 0)
  if (v >= 10) return { cls: 'bad', text: '偏高' }
  if (v >= 5) return { cls: 'warn', text: '需关注' }
  return { cls: 'good', text: '正常' }
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
  appointment: { icon: 'Calendar', label: '预约', bg: '#eef4ff' },
  order: { icon: 'ShoppingCart', label: '订单', bg: '#fff4e9' },
  consult: { icon: 'ChatDotRound', label: '咨询', bg: '#f5eeff' },
  cancel: { icon: 'RefreshLeft', label: '取消', bg: '#fdeeee' },
}

function typeMeta(type) {
  return FEED_META[type] || { icon: 'More', label: '动态', bg: '#f4f4f5' }
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
    charts.renderAll()
  } catch (e) {
    // 请求层已统一提示；这里兜底打印，避免图表渲染类错误被静默吞掉
    console.error('看板数据加载/渲染失败', e)
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


// ------------------------------------------------------------------ 生命周期
function handleResize() {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => charts.resizeAll(), 120)
}

onMounted(async () => {
  charts.ensure()
  await Promise.all([loadAll(true), loadRealtime()])
  resetRealtimeTimer()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  clearInterval(realtimeTimer)
  clearInterval(fullTimer)
  clearTimeout(resizeTimer)
  window.removeEventListener('resize', handleResize)
  charts.disposeAll()
})
</script>

<style scoped lang="scss">
// 底色交给 .main，这里只管内容间距（以前叠了第二层灰底 + 第二层 20px）
.dash {
  padding: 20px 20px 30px;
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
    color: var(--text-3);
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
  color: var(--text-3);
  padding: 4px 10px;
  border-radius: var(--radius-pill);
  background: #eef0f3;

  i {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--text-4);
  }

  &.on {
    color: var(--success-500);
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
  color: var(--text-3);
  margin-bottom: 16px;

  b {
    color: var(--text-1);
    font-weight: 600;
  }

  b.warn {
    color: var(--warning-500);
  }
}

.dot-sep {
  margin: 0 6px;
  color: #dcdfe6;
}

.today-chip {
  margin-left: auto;
  background: #fff;
  border: 1px solid var(--border-1);
  border-radius: var(--radius-sm);
  padding: 3px 12px;
  color: var(--text-2);
}

/* 指标条：与订单页 ui-stats 同一写法——上下 1px 线 + 竖细线切分，不做卡片、不用投影 */
.kpi-strip {
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 18px;
  border-top: 1px solid var(--border-1);
  border-bottom: 1px solid var(--border-1);
}

.kpi {
  flex: 1 1 0;
  min-width: 176px;
  padding: 16px 18px;
  border-left: 1px solid var(--border-2);

  &:first-child {
    padding-left: 0;
    border-left: 0;
  }
}

.kpi-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.kpi-label {
  font-size: 12.5px;
  color: var(--text-3);
}

/* 徽标：颜色只表达「对经营是好是坏」，方向交给箭头 */
.badge {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: var(--radius-xs);
  line-height: 16px;
  white-space: nowrap;

  &.up,
  &.good {
    color: var(--success-500);
    background: var(--success-50);
  }

  &.down,
  &.bad {
    color: var(--danger-600);
    background: var(--danger-50);
  }

  &.warn {
    color: var(--warning-500);
    background: var(--warning-50);
  }

  &.flat {
    color: var(--text-3);
    background: var(--bg-sunken);
  }
}

.kpi-value {
  margin: 8px 0 4px;
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -.01em;
  color: var(--text-1);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.kpi-sub {
  font-size: 12px;
  color: var(--text-3);
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
  background: var(--bg-card);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-1);
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
    color: var(--text-1);
  }

  span {
    font-size: 11.5px;
    color: var(--text-3);
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
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
  color: var(--text-4);
  border: 1px solid var(--border-1);
  border-radius: 4px;
  padding: 0 5px;
  line-height: 15px;

  &.on {
    color: var(--danger-500);
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
  color: var(--text-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.feed-time {
  font-size: 11.5px;
  color: var(--text-3);
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
  color: var(--text-3);

  &.ok {
    color: var(--success-500);
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
  color: var(--brand-500);
  white-space: nowrap;
  padding-top: 2px;
}

.empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-4);
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
  .kpi {
    min-width: 33%;
  }
}

@media (max-width: 1000px) {
  .grid-main,
  .grid-2,
  .grid-3 {
    grid-template-columns: minmax(0, 1fr);
  }

  .kpi {
    min-width: 50%;
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

  .kpi {
    min-width: 50%;
    padding: 12px 14px;
  }

  .kpi-value {
    font-size: 20px;
  }
}
</style>
