<template>
  <div class="app-container">
    <el-row :gutter="14">
      <el-col :xs="24" :md="12">
        <el-card class="mon-card">
          <template #header><el-icon><Cpu /></el-icon> CPU</template>
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="核心数">{{ server.cpu?.cpuNum ?? '—' }}</el-descriptions-item>
            <el-descriptions-item label="用户使用率">{{ server.cpu?.used ?? '—' }}%</el-descriptions-item>
            <el-descriptions-item label="系统使用率">{{ server.cpu?.sys ?? '—' }}%</el-descriptions-item>
            <el-descriptions-item label="当前空闲率">{{ server.cpu?.free ?? '—' }}%</el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>

      <el-col :xs="24" :md="12">
        <el-card class="mon-card">
          <template #header><el-icon><Tickets /></el-icon> 内存 / JVM</template>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="总内存">{{ server.mem?.total ?? '—' }}G</el-descriptions-item>
            <el-descriptions-item label="JVM 总量">{{ server.jvm?.total ?? '—' }}M</el-descriptions-item>
            <el-descriptions-item label="已用内存">{{ server.mem?.used ?? '—' }}G</el-descriptions-item>
            <el-descriptions-item label="JVM 已用">{{ server.jvm?.used ?? '—' }}M</el-descriptions-item>
            <el-descriptions-item label="剩余内存">{{ server.mem?.free ?? '—' }}G</el-descriptions-item>
            <el-descriptions-item label="JVM 剩余">{{ server.jvm?.free ?? '—' }}M</el-descriptions-item>
            <el-descriptions-item label="内存使用率">
              <span :class="{ 'text-danger': server.mem && server.mem.usage > 80 }">{{ server.mem?.usage ?? '—' }}%</span>
            </el-descriptions-item>
            <el-descriptions-item label="JVM 使用率">
              <span :class="{ 'text-danger': server.jvm && server.jvm.usage > 80 }">{{ server.jvm?.usage ?? '—' }}%</span>
            </el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>

      <el-col :span="24">
        <el-card class="mon-card">
          <template #header><el-icon><Monitor /></el-icon> 服务器信息</template>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="服务器名称">{{ server.sys?.computerName ?? '—' }}</el-descriptions-item>
            <el-descriptions-item label="操作系统">{{ server.sys?.osName ?? '—' }}</el-descriptions-item>
            <el-descriptions-item label="服务器 IP">{{ server.sys?.computerIp ?? '—' }}</el-descriptions-item>
            <el-descriptions-item label="系统架构">{{ server.sys?.osArch ?? '—' }}</el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>

      <el-col :span="24">
        <el-card class="mon-card">
          <template #header><el-icon><CoffeeCup /></el-icon> Java 虚拟机</template>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="Java 名称">{{ server.jvm?.name ?? '—' }}</el-descriptions-item>
            <el-descriptions-item label="Java 版本">{{ server.jvm?.version ?? '—' }}</el-descriptions-item>
            <el-descriptions-item label="启动时间">{{ server.jvm?.startTime ?? '—' }}</el-descriptions-item>
            <el-descriptions-item label="运行时长">{{ server.jvm?.runTime ?? '—' }}</el-descriptions-item>
            <el-descriptions-item label="安装路径" :span="2">{{ server.jvm?.home ?? '—' }}</el-descriptions-item>
            <el-descriptions-item label="项目路径" :span="2">{{ server.sys?.userDir ?? '—' }}</el-descriptions-item>
            <el-descriptions-item label="运行参数" :span="2">{{ server.jvm?.inputArgs ?? '—' }}</el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>

      <el-col :span="24">
        <el-card class="mon-card">
          <template #header><el-icon><MessageBox /></el-icon> 磁盘状态</template>
          <el-table :data="server.sysFiles || []" size="small" border>
            <el-table-column prop="dirName" label="盘符路径" min-width="110" />
            <el-table-column prop="sysTypeName" label="文件系统" min-width="100" />
            <el-table-column prop="typeName" label="盘符类型" min-width="100" />
            <el-table-column prop="total" label="总大小" min-width="100" />
            <el-table-column prop="free" label="可用大小" min-width="100" />
            <el-table-column prop="used" label="已用大小" min-width="100" />
            <el-table-column label="已用百分比" min-width="110">
              <template #default="scope">
                <span :class="{ 'text-danger': scope.row.usage > 80 }">{{ scope.row.usage }}%</span>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup name="ServerMonitor">
import { ref, onMounted } from 'vue'
import { getServer } from '@/api/monitor/server'

const server = ref({})

function getList() {
  getServer().then((response) => {
    server.value = response.data || {}
  }).catch(() => {})
}

onMounted(getList)
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
.text-danger {
  color: #f56c6c;
  font-weight: 600;
}
</style>
