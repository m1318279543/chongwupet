<template>
  <div class="my-apt">
    <div class="page-head">
      <h1>📅 我的预约</h1>
      <p>查看你的预约进度，商家会及时处理</p>
    </div>
    <div class="guest-alert" v-if="!userStore.token">
      <span>👀 您正在以游客身份浏览，</span>
      <el-button type="primary" link @click="openAuth('login')">登录</el-button>
      <span>后可查看和管理自己的预约</span>
    </div>
    <div class="content" v-loading="loading">
      <div v-if="list.length === 0 && !loading" class="empty">
        <span class="icon">📭</span>
        <p>还没有预约记录</p>
        <el-button type="primary" round @click="$router.push('/shop/home')">去预约</el-button>
      </div>
      <div class="timeline" v-else>
        <div class="apt-item" v-for="item in list" :key="item.appointmentId">
          <div class="apt-avatar" :style="{ background: petGradient(item.petId) }">
            <img v-if="isImage(item.image)" :src="item.image" :alt="item.petName" class="apt-photo" loading="lazy" />
            <span v-else>{{ petEmoji(item.categoryId) }}</span>
          </div>
          <div class="apt-body">
            <div class="apt-top">
              <span class="pet-name">{{ item.petName || '宠物' }}</span>
              <div class="apt-ops">
                <el-tag :type="statusType(item.status)" size="small">{{ statusText(item.status) }}</el-tag>
                <el-button
                  v-if="canCancel(item.status)"
                  type="danger" link size="small"
                  :loading="cancelingId === item.appointmentId"
                  @click="cancelApt(item)"
                >取消预约</el-button>
              </div>
            </div>
            <div class="apt-meta">
              <span class="meta-item"><el-icon><Calendar /></el-icon> {{ item.appointmentDate }}</span>
              <span class="meta-item"><el-icon><Phone /></el-icon> {{ item.contactPhone }}</span>
            </div>
            <div class="apt-remark" v-if="item.remark">留言：{{ item.remark }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Calendar, Phone } from '@element-plus/icons-vue'
import { listPetAppointment, cancelPetAppointment } from '@/api/pet/petAppointment'
import { listPetInfo } from '@/api/pet/petInfo'
import { useUserStore } from '@/store/modules/user'

const userStore = useUserStore()
const openAuth = inject('openAuth', () => {})
const loading = ref(false)
const list = ref([])
const cancelingId = ref(null)

const emojiPool = ['🐶', '🐱', '🐰', '🐹', '🐦', '🐢', '🐟', '🦎']
function isImage(s) { return !!s && (s.indexOf('/') === 0 || s.indexOf('http') === 0) }
function petEmoji(c) { return emojiPool[(c || 0) % emojiPool.length] }
function petGradient(id) {
  const colors = [['#fff4e6', '#ffe0b3'], ['#e8f5e9', '#c8e6c9'], ['#e3f2fd', '#bbdefb'], ['#fce4ec', '#f8bbd0']]
  return `linear-gradient(135deg, ${colors[(id||0)%colors.length][0]}, ${colors[(id||0)%colors.length][1]})`
}
function statusText(s) { return ['待处理', '已确认', '已完成', '已取消'][s] || '未知' }
function statusType(s) { return ['warning', 'primary', 'success', 'info'][s] || 'info' }
// 仅「待处理 / 已确认」可取消
function canCancel(s) { return s === '0' || s === '1' }

// 取消预约：先确认 + 填写原因，再调用后端（后端会写入取消记录）
function cancelApt(item) {
  ElMessageBox.prompt(
    `确认取消对「${item.petName || '该宠物'}」的预约吗？可填写取消原因：`,
    '取消预约',
    {
      confirmButtonText: '确认取消',
      cancelButtonText: '再想想',
      inputPlaceholder: '如：时间冲突 / 暂时不需要了（选填）',
      inputValue: '',
      type: 'warning'
    }
  ).then(({ value }) => {
    cancelingId.value = item.appointmentId
    return cancelPetAppointment(item.appointmentId, value || '')
      .then((res) => {
        ElMessage.success(res.msg || '预约已取消')
        return loadData()
      })
      .catch((e) => {
        ElMessage.error(e?.msg || e?.message || '取消失败')
      })
      .finally(() => {
        cancelingId.value = null
      })
  }).catch(() => {})
}

async function loadData() {
  loading.value = true
  try {
    const [aptRes, petRes] = await Promise.all([
      listPetAppointment({ userId: userStore.userId, pageNum: 1, pageSize: 1000 }),
      listPetInfo({ pageNum: 1, pageSize: 1000 }).catch(() => ({ rows: [] }))
    ])
    const pets = petRes.rows || []
    const petMap = {}
    pets.forEach(p => petMap[p.petId] = p)
    list.value = (aptRes.rows || []).map(a => ({
      ...a,
      petName: petMap[a.petId]?.petName,
      categoryId: petMap[a.petId]?.categoryId
    }))
  } catch (e) {
    ElMessage.error(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>

<style scoped lang="scss">
.my-apt { max-width: 900px; margin: 0 auto; padding: 32px 24px; }
.guest-alert { background: #fff7ef; border-radius: 10px; padding: 12px 18px; margin-bottom: 20px; font-size: 14px; color: #a06a3c; display: flex; align-items: center; gap: 4px; }
.page-head { margin-bottom: 24px;
  h1 { font-size: 26px; color: #303133; margin: 0 0 4px; }
  p { color: #909399; margin: 0; }
}
.empty { text-align: center; padding: 80px 0; color: #c0c4cc;
  .icon { font-size: 56px; display: block; margin-bottom: 12px; }
}
.timeline { display: flex; flex-direction: column; gap: 16px; }
.apt-item {
  background: #fff; border-radius: 12px; padding: 20px; display: flex; gap: 16px;
  box-shadow: 0 2px 12px rgba(0,0,0,.06);
  .apt-avatar { flex: 0 0 64px; width: 64px; height: 64px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 36px; overflow: hidden;
    .apt-photo { width: 100%; height: 100%; object-fit: cover; display: block; }
  }
  .apt-body { flex: 1; }
  .apt-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;
    .pet-name { font-size: 18px; font-weight: 600; color: #303133; }
    .apt-ops { display: flex; align-items: center; gap: 12px; }
  }
  .apt-meta { display: flex; gap: 20px; color: #606266; font-size: 14px;
    .meta-item { display: flex; align-items: center; gap: 4px; }
  }
  .apt-remark { margin-top: 8px; color: #909399; font-size: 13px; background: #f5f7fa; padding: 8px 12px; border-radius: 6px; }
}
</style>
