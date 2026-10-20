<template>
  <div class="app-container">
    <el-row :gutter="14">
      <el-col :span="24">
        <el-card class="mon-card">
          <template #header><el-icon><Monitor /></el-icon> 基本信息</template>
          <el-descriptions :column="4" border size="small">
            <el-descriptions-item label="Redis 版本">{{ info.redis_version ?? '—' }}</el-descriptions-item>
            <el-descriptions-item label="运行模式">{{ info.redis_mode === 'standalone' ? '单机' : '集群' }}</el-descriptions-item>
            <el-descriptions-item label="端口">{{ info.tcp_port ?? '—' }}</el-descriptions-item>
            <el-descriptions-item label="客户端数">{{ info.connected_clients ?? '—' }}</el-descriptions-item>
            <el-descriptions-item label="运行时间(天)">{{ info.uptime_in_days ?? '—' }}</el-descriptions-item>
            <el-descriptions-item label="使用内存">{{ info.used_memory_human ?? '—' }}</el-descriptions-item>
            <el-descriptions-item label="使用 CPU">{{ info.used_cpu_user_children ?? '—' }}</el-descriptions-item>
            <el-descriptions-item label="内存配置">{{ info.maxmemory_human ?? '—' }}</el-descriptions-item>
            <el-descriptions-item label="AOF 开启">{{ info.aof_enabled === '0' ? '否' : '是' }}</el-descriptions-item>
            <el-descriptions-item label="RDB 状态">{{ info.rdb_last_bgsave_status ?? '—' }}</el-descriptions-item>
            <el-descriptions-item label="Key 数量">{{ dbSize ?? '—' }}</el-descriptions-item>
            <el-descriptions-item label="网络入口/出口">
              {{ info.instantaneous_input_kbps ?? '—' }}kps / {{ info.instantaneous_output_kbps ?? '—' }}kps
            </el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>

      <el-col :xs="24" :md="12">
        <el-card class="mon-card">
          <template #header><el-icon><PieChart /></el-icon> 命令统计</template>
          <div ref="commandRef" class="chart-box"></div>
        </el-card>
      </el-col>

      <el-col :xs="24" :md="12">
        <el-card class="mon-card">
          <template #header><el-icon><Odometer /></el-icon> 内存消耗</template>
          <div ref="memoryRef" class="chart-box"></div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup name="CacheMonitor">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import * as echarts from 'echarts'
import { getCache } from '@/api/monitor/cache'

const info = ref({})
const dbSize = ref(null)
const commandRef = ref(null)
const memoryRef = ref(null)
let commandChart = null
let memoryChart = null

function renderCharts(commandStats) {
  commandChart = echarts.init(commandRef.value)
  commandChart.setOption({
    tooltip: { trigger: 'item', formatter: '{a} <br/>{b} : {c} ({d}%)' },
    series: [{
      name: '命令',
      type: 'pie',
      roseType: 'radius',
      radius: [15, 95],
      center: ['50%', '50%'],
      data: commandStats || [],
      animationEasing: 'cubicInOut',
      animationDuration: 800
    }]
  })

  memoryChart = echarts.init(memoryRef.value)
  memoryChart.setOption({
    tooltip: { formatter: '{b} <br/>已用 : ' + (info.value.used_memory_human || '') },
    series: [{
      name: '内存消耗',
      type: 'gauge',
      min: 0,
      max: 1000,
      detail: { formatter: info.value.used_memory_human || '' },
      data: [{ value: parseFloat(info.value.used_memory_human) || 0, name: '内存消耗' }]
    }]
  })
}

function handleResize() {
  commandChart && commandChart.resize()
  memoryChart && memoryChart.resize()
}

function getList() {
  getCache().then((response) => {
    const data = response.data || {}
    info.value = data.info || {}
    dbSize.value = data.dbSize
    nextTick(() => renderCharts(data.commandStats))
  }).catch(() => {})
}

onMounted(() => {
  getList()
  window.addEventListener('resize', handleResize)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  commandChart && commandChart.dispose()
  memoryChart && memoryChart.dispose()
})
</script>

<style scoped>
.mon-card {
  margin-bottom: 14px;
}
.mon-card :deep(.el-card__header) {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  font-size: 14px;
}
.chart-box {
  height: 380px;
}
</style>
