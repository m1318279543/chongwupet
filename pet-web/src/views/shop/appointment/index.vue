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
              <span class="meta-item"><el-icon><Calendar /></el-icon> {{ fmtTime(item.appointmentDate) }}</span>
              <span class="meta-item"><el-icon><Phone /></el-icon> {{ item.contactPhone }}</span>
            </div>
            <div class="apt-remark" v-if="item.remark">留言：{{ item.remark }}</div>

            <!-- 服务工单：预约被门店接单后才算真正排上，进度看这里 -->
            <div class="svc" v-if="svcOf(item)">
              <span class="svc-no">工单 {{ svcOf(item).serviceNo }}</span>
              <el-tag size="small" :type="svcType(svcOf(item).status)">{{ svcText(svcOf(item).status) }}</el-tag>
              <span class="svc-staff" v-if="svcOf(item).staffName">执行：{{ svcOf(item).staffName }}</span>
              <el-button v-if="svcOf(item).status === '3' && !svcOf(item).score" link type="primary" size="small" @click="openEval(svcOf(item))">评价服务</el-button>
              <span class="svc-score" v-if="svcOf(item).score">已评 {{ svcOf(item).score }} 分</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 服务评价 -->
    <el-dialog v-model="evalOpen" title="评价本次服务" width="420px" append-to-body>
      <div class="eval-box">
        <p class="eval-title">{{ evalRow.itemName }}</p>
        <el-rate v-model="evalForm.score" :texts="['很不满意','不满意','一般','满意','非常满意']" show-text />
        <el-input v-model="evalForm.comment" type="textarea" :rows="3" maxlength="200" show-word-limit
          placeholder="说说这次服务怎么样（选填）" style="margin-top:12px" />
      </div>
      <template #footer>
        <el-button @click="evalOpen = false">取消</el-button>
        <el-button type="primary" :loading="evalSubmitting" @click="submitEval">提交评价</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, inject } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Calendar, Phone } from '@element-plus/icons-vue'
import { listMyAppointments, cancelPetAppointment } from '@/api/pet/petAppointment'
import { listPetInfo } from '@/api/pet/petInfo'
import { listMyServiceOrders, evaluateServiceOrder } from '@/api/pet/petService'
import { useUserStore } from '@/store/modules/user'

const userStore = useUserStore()
const openAuth = inject('openAuth', () => {})
const loading = ref(false)
const list = ref([])
const cancelingId = ref(null)
const serviceMap = ref({})
const evalOpen = ref(false)
const evalRow = ref({})
const evalSubmitting = ref(false)
const evalForm = reactive({ score: 5, comment: '' })

function svcOf(item) { return serviceMap.value[item.appointmentId] }
function svcText(s) { return { 0: '待接单', 1: '已接单', 2: '服务中', 3: '已完成', 4: '已取消', 5: '爽约' }[s] || '' }
function svcType(s) { return { 0: 'warning', 1: 'primary', 2: 'success', 3: 'success', 4: 'info', 5: 'danger' }[s] || 'info' }

function openEval(row) {
  evalRow.value = row
  evalForm.score = 5
  evalForm.comment = ''
  evalOpen.value = true
}

function submitEval() {
  if (!evalForm.score) {
    ElMessage.warning('请先选择评分')
    return
  }
  evalSubmitting.value = true
  evaluateServiceOrder(evalRow.value.serviceId, { score: evalForm.score, comment: evalForm.comment })
    .then((res) => {
      ElMessage.success(res.msg || '感谢你的评价')
      evalOpen.value = false
      return loadService()
    })
    .catch((e) => ElMessage.error(e?.msg || '评价失败'))
    .finally(() => { evalSubmitting.value = false })
}

async function loadService() {
  if (!userStore.token) return
  try {
    const res = await listMyServiceOrders()
    const map = {}
    ;(res.data || []).forEach((o) => { if (o.appointmentId) map[o.appointmentId] = o })
    serviceMap.value = map
  } catch (e) {
    serviceMap.value = {}
  }
}

const emojiPool = ['🐶', '🐱', '🐰', '🐹', '🐦', '🐢', '🐟', '🦎']
function isImage(s) { return !!s && (s.indexOf('/') === 0 || s.indexOf('http') === 0) }
function petEmoji(c) { return emojiPool[(c || 0) % emojiPool.length] }
function petGradient(id) {
  const colors = [['#fff4e6', '#ffe0b3'], ['#e8f5e9', '#c8e6c9'], ['#e3f2fd', '#bbdefb'], ['#fce4ec', '#f8bbd0']]
  return `linear-gradient(135deg, ${colors[(id||0)%colors.length][0]}, ${colors[(id||0)%colors.length][1]})`
}
function fmtTime(v) {
  if (!v) return '—'
  const str = String(v).replace('T', ' ')
  return str.slice(5, 16)
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
      listMyAppointments(),
      listPetInfo({ pageNum: 1, pageSize: 1000 }).catch(() => ({ rows: [] }))
    ])
    const pets = petRes.rows || []
    const petMap = {}
    pets.forEach(p => petMap[p.petId] = p)
    list.value = (aptRes.data || []).map(a => ({
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

onMounted(() => {
  loadData()
  loadService()
})
</script>

<style scoped lang="scss">
.eval-box { .eval-title { margin: 0 0 12px; font-size: 15px; font-weight: 600; color: var(--text-1); } }

.my-apt { max-width: var(--container-md); margin: 0 auto; padding: 32px 24px; }
.guest-alert { background: var(--brand-50); border-radius: 10px; padding: 12px 18px; margin-bottom: 20px; font-size: 14px; color: var(--brand-800); display: flex; align-items: center; gap: 4px; }
.page-head { margin-bottom: 24px;
  h1 { font-size: 26px; color: var(--text-1); margin: 0 0 4px; }
  p { color: var(--text-3); margin: 0; }
}
.empty { text-align: center; padding: 80px 0; color: var(--text-4);
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
    .pet-name { font-size: 18px; font-weight: 600; color: var(--text-1); }
    .apt-ops { display: flex; align-items: center; gap: 12px; }
  }
  .apt-meta { display: flex; gap: 20px; color: var(--text-2); font-size: 14px;
    .meta-item { display: flex; align-items: center; gap: 4px; }
  }
  .svc { margin-top: 10px; padding-top: 10px; border-top: 1px dashed var(--border-1); display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
    .svc-no { font-size: 12px; color: var(--text-3); }
    .svc-staff { font-size: 12px; color: var(--text-2); }
    .svc-score { font-size: 12px; color: var(--warning-500); }
  }
  .apt-remark { margin-top: 8px; color: var(--text-3); font-size: 13px; background: var(--bg-page); padding: 8px 12px; border-radius: 6px; }
}
</style>
