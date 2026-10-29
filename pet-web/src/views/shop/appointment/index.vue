<template>
  <div class="ui-page">
    <!-- 页面头 -->
    <header class="ui-head">
      <div class="ui-head__main">
        <p class="ui-eyebrow">Appointments</p>
        <h1 class="ui-title">我的预约</h1>
        <p class="ui-sub">预约进度与门店工单在这里同步，接单后以工单状态为准。</p>
      </div>
      <div class="ui-head__aside">
        <span class="ui-count"><b>{{ list.length }}</b>条预约</span>
      </div>
    </header>

    <!-- 游客提示：一条左色线，不做提示卡 -->
    <p v-if="!userStore.token" class="ui-note">
      当前为游客浏览，
      <button type="button" class="ui-linkbtn" @click="openAuth('login')">登录</button>
      后可查看和管理自己的预约。
    </p>

    <section class="apt-body" v-loading="loading">
      <!-- 定高列表：每页 5 条（单行 126px），超出靠底部翻页 -->
      <div class="ui-box apt-box" v-if="list.length">
        <div class="ui-box__body">
          <ul class="ui-list">
            <li v-for="item in pagedList" :key="item.appointmentId" class="ui-row">
              <div class="ui-thumb">
                <img
                  v-if="isImage(item.image)"
                  :src="item.image"
                  :alt="item.petName"
                  loading="lazy"
                />
                <span v-else class="ui-thumb__ph">暂无图</span>
              </div>

              <div class="ui-row__main">
                <div class="ui-row__title">
                  {{ item.petName || '原宠物已下架' }}
                  <span class="ui-chip" :class="statusClass(item.status)">{{ statusText(item.status) }}</span>
                </div>

                <div class="ui-row__meta">
                  <span class="meta-item"><el-icon><Calendar /></el-icon>{{ fmtTime(item.appointmentDate) }}</span>
                  <span class="meta-item"><el-icon><Phone /></el-icon>{{ item.contactPhone }}</span>
                  <!-- 留言并入元信息行：既保留信息，又不让某一条把行高撑破 -->
                  <span class="meta-item meta-item--remark" v-if="item.remark" :title="item.remark">
                    留言：{{ item.remark }}
                  </span>
                </div>

                <!-- 服务工单：左侧竖线 + 缩进表示「依附于这条预约」的下级信息 -->
                <div class="svc" v-if="svcOf(item)">
                  <span class="svc__no">工单 {{ svcOf(item).serviceNo }}</span>
                  <span class="ui-chip" :class="svcClass(svcOf(item).status)">{{ svcText(svcOf(item).status) }}</span>
                  <span class="svc__staff" v-if="svcOf(item).staffName">执行 · {{ svcOf(item).staffName }}</span>
                  <button
                    v-if="svcOf(item).status === '3' && !svcOf(item).score"
                    type="button"
                    class="ui-linkbtn"
                    @click="openEval(svcOf(item))"
                  >评价服务</button>
                  <span class="svc__score" v-if="svcOf(item).score">已评 {{ svcOf(item).score }} 分</span>
                </div>
              </div>

              <div class="ui-row__end">
                <button
                  v-if="canCancel(item.status)"
                  type="button"
                  class="ui-linkbtn ui-linkbtn--danger"
                  :disabled="cancelingId === item.appointmentId"
                  @click="cancelApt(item)"
                >{{ cancelingId === item.appointmentId ? '取消中…' : '取消预约' }}</button>
              </div>
            </li>
          </ul>
        </div>

        <!-- 翻页条：位置固定，翻页时页脚不动 -->
        <div class="ui-box__foot">
          <span class="ui-box__count">第 {{ rangeStart }}–{{ rangeEnd }} 条 / 共 {{ list.length }} 条</span>
          <Pagination
            v-if="list.length > PAGE_SIZE"
            :total="list.length"
            v-model:page="page"
            :limit="PAGE_SIZE"
            :page-sizes="[PAGE_SIZE]"
            :background="false"
            layout="prev, pager, next"
            :auto-scroll="false"
          />
        </div>
      </div>

      <div v-else-if="!loading" class="ui-empty">
        <p class="ui-empty__title">还没有预约记录</p>
        <p class="ui-empty__desc">在宠物档案页提交预约后，进度会出现在这里。</p>
        <div class="ui-empty__act">
          <button type="button" class="ui-btn ui-btn--solid" @click="$router.push('/shop/home')">去看宠物</button>
        </div>
      </div>
    </section>

    <!-- 服务评价（弹窗内部属于允许使用「面」的例外） -->
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
import { listMyServiceOrders, evaluateServiceOrder } from '@/api/pet/petService'
import { useUserStore } from '@/store/modules/user'
import Pagination from '@/components/Pagination/index.vue'
import { useClientPaging } from '@/composables/usePagedList'
import { isImage } from '@/utils/petDisplay'

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

// 定高列表分页：每页 5 条（单行 126px，5 行铺满 630px 的列表区）
const PAGE_SIZE = 5
const { page, paged: pagedList, rangeStart, rangeEnd } = useClientPaging(list, PAGE_SIZE)

function svcOf(item) { return serviceMap.value[item.appointmentId] }
function svcText(s) { return { 0: '待接单', 1: '已接单', 2: '服务中', 3: '已完成', 4: '已取消', 5: '爽约' }[s] || '' }

// 状态用 1px 描边小标签表达，不用实心色块；语义靠色相区分
function statusText(s) { return ['待处理', '已确认', '已完成', '已取消'][s] || '未知' }
function statusClass(s) { return { 0: 'ui-chip--warn', 1: 'ui-chip--brand', 2: 'ui-chip--ok' }[s] || '' }
function svcClass(s) { return { 0: 'ui-chip--warn', 1: 'ui-chip--brand', 2: 'ui-chip--brand', 3: 'ui-chip--ok', 5: 'ui-chip--danger' }[s] || '' }

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

function fmtTime(v) {
  if (!v) return '—'
  const str = String(v).replace('T', ' ')
  return str.slice(5, 16)
}
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
  // 游客没有 token 时不请求 /pet/appointment/mine，避免 401 触发全局重新登录弹窗
  if (!userStore.token) { loading.value = false; return }
  loading.value = true
  try {
    // /mine 接口已 join 宠物表返回 petName/image/categoryId，无需再拉全量宠物列表
    const aptRes = await listMyAppointments()
    list.value = aptRes.data || []
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
// 骨架（页头/行列表/状态标签/空态）全部来自 .ui-* 基元，
// 这里只处理「留言」和「工单」两处从属信息的分层。

.apt-body { margin-top: 8px; min-height: 240px; }

// 定高后每条必须等高：留言已并入元信息行并做单行省略，避免撑破行高
.apt-box {

  .ui-row__meta { flex-wrap: nowrap; min-width: 0; }
  .meta-item--remark {
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
}

// 元信息里的小图标：只做扫描辅助，颜色压到最弱
.ui-row__meta .meta-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--text-3);
  .el-icon { font-size: var(--fs-4); color: var(--text-4); }
}

// 工单：依附于预约的下级信息 —— 缩进 + 左侧竖线，不用第二个框
.svc {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 14px;
  margin-top: 12px;
  padding: 10px 0 2px 12px;
  border-left: 2px solid var(--brand-200);
  font-size: var(--fs-3);
  color: var(--text-2);
}
.svc__no { font-variant-numeric: tabular-nums; color: var(--text-2); }
.svc__staff { color: var(--text-3); }
.svc__score { color: var(--warning-500); }

.eval-box {
  .eval-title { margin: 0 0 12px; font-size: var(--fs-6); font-weight: 700; color: var(--text-1); }
}

@media (max-width: 768px) {
  .ui-row__end { justify-content: flex-end; }
  .svc { gap: 4px 10px; }
}
</style>
