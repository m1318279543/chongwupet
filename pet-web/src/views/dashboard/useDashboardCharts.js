import { init } from 'echarts/core'

// 看板的 7 张图：图表实例 + option 构造 + 渲染/缩放/销毁，全部收在这里。
// 组件只负责拿数据、给容器 ref、在合适的时候调用 renderAll()。
// 契约：
//   dashboard —— 看板数据 ref（renderXxx 内部直接读 .value）
//   money     —— 金额格式化函数
//   refs      —— { trend, aptStatus, orderStatus, category, topPets, topGoods, hourly } 模板 ref
export function useDashboardCharts({ dashboard, money, refs }) {
  const charts = {
    trend: null,
    aptStatus: null,
    orderStatus: null,
    category: null,
    topPets: null,
    topGoods: null,
    hourly: null
  }

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
    if (!charts.trend && refs.trend.value) charts.trend = init(refs.trend.value)
    if (!charts.aptStatus && refs.aptStatus.value) charts.aptStatus = init(refs.aptStatus.value)
    if (!charts.orderStatus && refs.orderStatus.value) charts.orderStatus = init(refs.orderStatus.value)
    if (!charts.category && refs.category.value) charts.category = init(refs.category.value)
    if (!charts.topPets && refs.topPets.value) charts.topPets = init(refs.topPets.value)
    if (!charts.topGoods && refs.topGoods.value) charts.topGoods = init(refs.topGoods.value)
    if (!charts.hourly && refs.hourly.value) charts.hourly = init(refs.hourly.value)
  }

  const AXIS_LABEL = { color: '#909399', fontSize: 11 }
  const SPLIT_LINE = { lineStyle: { color: '#f0f2f5', type: 'dashed' } }

  function renderTrend() {
    if (!trend.value) return
    ensureCharts()
    if (!charts.trend) return
    const t = trend.value
    const showZoom = t.dates.length > 31
    charts.trend.setOption(
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
    if (!charts.aptStatus) return
    charts.aptStatus.setOption(pieOption(items, ['#e6a23c', '#5b8def', '#52c41a', '#c8c9cc']), true)
  }

  function renderOrderStatus() {
    const items = dashboard.value?.distribution?.orderStatus || []
    ensureCharts()
    if (!charts.orderStatus) return
    charts.orderStatus.setOption(pieOption(items, ['#ff8c42', '#c8c9cc']), true)
  }

  function renderCategory() {
    const items = dashboard.value?.distribution?.category || []
    ensureCharts()
    if (!charts.category) return
    charts.category.setOption(
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
    if (!charts.topPets) return
    charts.topPets.setOption(
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
    if (!charts.topGoods) return
    charts.topGoods.setOption(
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
    if (!charts.hourly) return
    charts.hourly.setOption(
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

  function eachChart(fn) {
    Object.values(charts).forEach((c) => c && fn(c))
  }

  function resizeAll() {
    eachChart((c) => c.resize())
  }

  function disposeAll() {
    eachChart((c) => c.dispose())
    Object.keys(charts).forEach((k) => { charts[k] = null })
  }

  return { ensure: ensureCharts, renderAll, resizeAll, disposeAll }
}
