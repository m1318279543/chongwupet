<template>
  <div class="detail" v-loading="loading">
    <div class="detail-inner" v-if="pet.petId">
      <!-- 左侧大图 -->
      <div class="left">
        <div class="big-avatar" :style="{ background: petGradient(pet.petId) }">
          <img v-if="isImage(pet.image)" :src="pet.image" :alt="pet.petName" class="big-photo" />
          <span v-else class="no-img">暂无图片</span>
        </div>
        <!-- 游客提示 -->
        <div class="guest-tip" v-if="!userStore.token">
          <span>您正在以游客身份浏览，</span>
          <el-link type="primary" underline="never" @click="openAuth('login')">登录后</el-link>
          <span>可收藏、预约、点赞和评论</span>
        </div>
      </div>
      <!-- 右侧信息 -->
      <div class="right">
        <h1>{{ pet.petName }}</h1>
        <div class="tags">
          <el-tag type="info">{{ pet.breed || '未知品种' }}</el-tag>
          <el-tag type="success" v-if="pet.age">{{ pet.age }}</el-tag>
          <el-tag type="warning">{{ genderText(pet.gender) }}</el-tag>
          <el-tag type="danger" v-if="pet.status">{{ statusText(pet.status) }}</el-tag>
          <el-tag type="success" effect="dark" v-if="health.healthId">
            健康等级：{{ health.healthLevel || '待评定' }}
          </el-tag>
        </div>
        <div class="price" v-if="pet.price">
          <span class="label">售价</span>
          <span class="amount">¥ {{ pet.price }}</span>
        </div>
        <div class="desc" v-if="pet.description">
          <h3>宠物简介</h3>
          <p>{{ pet.description }}</p>
        </div>
        <div class="actions">
          <el-button size="large" round :type="isFav ? 'danger' : 'default'" @click="toggleFav">
            {{ isFav ? '已收藏' : '收藏' }}
          </el-button>
          <el-button size="large" type="primary" round :loading="buying" :disabled="pet.status !== '0'" @click="buyNow">
            {{ pet.status === '0' ? '立即购买' : '已被订走' }}
          </el-button>
          <el-button size="large" type="primary" plain round @click="openAppoint">立即预约</el-button>
          <el-button size="large" round class="ai-ask" @click="askAi">问 AI</el-button>
        </div>
      </div>
    </div>

    <!-- 健康与服务档案（后台维护，前台实时展示） -->
    <div class="health-panel" v-if="pet.petId && health.healthId">
      <div class="panel-head">
        <h2>健康与服务档案</h2>
        <span class="archive">档案编号 {{ health.archiveNo }} · 体检机构：{{ health.examHospital }}</span>
      </div>

      <div class="health-grid">
        <!-- 健康筛查 -->
        <section class="h-card">
          <h3>健康筛查</h3>
          <ul>
            <li><span class="k">疫苗接种</span><span class="v">{{ health.vaccineName }}（{{ health.vaccineProgress }}）· {{ fmtDate(health.vaccineDate) }}</span></li>
            <li><span class="k">体内外驱虫</span><span class="v">{{ health.dewormName }} · {{ fmtDate(health.dewormDate) }}</span></li>
            <li><span class="k">体检项目</span><span class="v">{{ health.examItems }}</span></li>
            <li><span class="k">体检结论</span><span class="v ok">{{ health.examResult }}</span></li>
            <li><span class="k">体检日期</span><span class="v">{{ fmtDate(health.examDate) }}</span></li>
            <li><span class="k">遗传病排查</span><span class="v">{{ health.geneticScreen }}</span></li>
            <li v-if="health.healthNote"><span class="k">健康备注</span><span class="v">{{ health.healthNote }}</span></li>
          </ul>
        </section>

        <!-- 真实信息 -->
        <section class="h-card">
          <h3>真实信息</h3>
          <ul>
            <li><span class="k">来源渠道</span><span class="v">{{ health.sourceChannel }}</span></li>
            <li><span class="k">来源地</span><span class="v">{{ health.sourcePlace }}</span></li>
            <li><span class="k">父本</span><span class="v">{{ health.fatherInfo }}</span></li>
            <li><span class="k">母本</span><span class="v">{{ health.motherInfo }}</span></li>
            <li><span class="k">出生日期</span><span class="v">{{ fmtDate(health.birthDate) }}</span></li>
            <li><span class="k">照片</span><span class="v"><el-tag size="small" type="success">本店实拍</el-tag></span></li>
          </ul>
        </section>

        <!-- 专业养护 -->
        <section class="h-card">
          <h3>专业养护</h3>
          <ul>
            <li><span class="k">性格特点</span><span class="v">{{ health.temperament }}</span></li>
            <li><span class="k">饲养难度</span><span class="v"><el-tag size="small" :type="skillTag(health.skillLevel)">{{ health.skillLevel }}</el-tag></span></li>
            <li><span class="k">喂养方案</span><span class="v">{{ health.feedPlan }}</span></li>
            <li><span class="k">护理要点</span><span class="v">{{ health.carePoints }}</span></li>
          </ul>
        </section>

        <!-- 售后无忧 -->
        <section class="h-card">
          <h3>售后无忧</h3>
          <ul>
            <li><span class="k">健康保障</span><span class="v">{{ health.guaranteeDays }} 天重大传染病保障</span></li>
            <li><span class="k">合同编号</span><span class="v">{{ health.contractNo }}</span></li>
            <li><span class="k">送达方式</span><span class="v">{{ health.deliverySupport }}</span></li>
            <li><span class="k">售后说明</span><span class="v">{{ health.aftersaleNote }}</span></li>
          </ul>
        </section>
      </div>
    </div>

    <!-- 宠物喜好 -->
    <div class="pref-panel" v-if="pet.petId && preference.preferenceId">
      <div class="panel-head">
        <h2>它的小喜好</h2>
        <span class="archive">投其所好，相处更甜</span>
      </div>
      <div class="pref-grid">
        <div class="pref-item" v-if="preference.foodLike"><div><b>爱吃</b><p>{{ preference.foodLike }}</p></div></div>
        <div class="pref-item" v-if="preference.toyLike"><div><b>爱玩</b><p>{{ preference.toyLike }}</p></div></div>
        <div class="pref-item" v-if="preference.personality"><div><b>性格</b><p>{{ preference.personality }}</p></div></div>
        <div class="pref-item" v-if="preference.activityLevel"><div><b>活跃度</b><p>{{ preference.activityLevel }}</p></div></div>
        <div class="pref-item" v-if="preference.envLike"><div><b>喜欢的环境</b><p>{{ preference.envLike }}</p></div></div>
        <div class="pref-item warn" v-if="preference.taboo"><div><b>禁忌注意</b><p>{{ preference.taboo }}</p></div></div>
      </div>
    </div>

    <!-- 点赞 + 评论区 -->
    <PetSocial v-if="pet.petId" :pet-id="route.params.id" @auth="openAuth('login')" />

    <div class="not-found" v-else-if="!loading">
      <el-icon class="icon"><Search /></el-icon>
      <p>未找到该宠物信息</p>
      <el-button @click="$router.push('/shop/home')">返回首页</el-button>
    </div>

    <!-- 预约对话框 -->
    <el-dialog v-model="showAppoint" title="预约看宠" width="440px">
      <el-form ref="appointRef" :model="appointForm" :rules="appointRules" label-width="80px">
        <el-form-item label="宠物">
          <el-input :value="pet.petName" disabled />
        </el-form-item>
        <el-form-item label="到店门店" prop="storeId">
          <el-select v-model="appointForm.storeId" placeholder="选择门店" style="width:100%" @change="loadSlots">
            <el-option v-for="s in stores" :key="s.storeId" :label="s.storeName" :value="s.storeId" />
          </el-select>
        </el-form-item>
        <el-form-item label="到店日期" prop="date">
          <el-date-picker v-model="appointForm.date" type="date" value-format="YYYY-MM-DD" :disabled-date="disabledDate" placeholder="选择日期" style="width:100%" @change="loadSlots" />
        </el-form-item>
        <el-form-item label="到店时段" prop="slot">
          <div class="slot-grid" v-loading="slotLoading">
            <button v-for="s in slots" :key="s.slot" type="button" class="slot"
              :class="{ active: appointForm.slot === s.slot, full: s.available === 0 }"
              :disabled="s.available === 0" @click="appointForm.slot = s.slot">
              <b>{{ s.slot }}</b>
              <span>{{ s.available > 0 ? '剩 ' + s.available : '已满' }}</span>
            </button>
            <p class="slot-empty" v-if="!slotLoading && slots.length === 0">请先选择门店与日期</p>
          </div>
        </el-form-item>
        <el-form-item label="联系电话" prop="contactPhone">
          <el-input v-model="appointForm.contactPhone" placeholder="请输入11位手机号" maxlength="11" show-word-limit inputmode="numeric" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="appointForm.remark" type="textarea" :rows="3" placeholder="留言（可选）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAppoint = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitAppoint">提交预约</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, inject, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getPetInfo } from '@/api/pet/petInfo'
import { createPetOrder } from '@/api/pet/petOrder'
import { listPetFavorite, addPetFavorite, delPetFavorite } from '@/api/pet/petFavorite'
import { addPetAppointment, getAppointmentSlots } from '@/api/pet/petAppointment'
import { storeOptions } from '@/api/pet/petStore'
import { getPetHealth } from '@/api/pet/petHealth'
import { getPetPreference } from '@/api/pet/petPreference'
import { useUserStore } from '@/store/modules/user'
import PetSocial from '@/components/PetSocial/index.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const openAuth = inject('openAuth', () => {})  // 未登录触发顶栏登录对话框

const pet = ref({})
const health = ref({})
const preference = ref({})
const loading = ref(true)
const isFav = ref(false)
const showAppoint = ref(false)
const submitting = ref(false)
const buying = ref(false)
const appointRef = ref()
const appointForm = reactive({ storeId: null, date: '', slot: '', contactPhone: '', remark: '' })
const stores = ref([])
const slots = ref([])
const slotLoading = ref(false)
const appointRules = {
  storeId: [{ required: true, message: '请选择门店', trigger: 'change' }],
  date: [{ required: true, message: '请选择到店日期', trigger: 'change' }],
  slot: [{ required: true, message: '请选择到店时段', trigger: 'change' }],
  contactPhone: [
    { required: true, message: '请输入联系电话', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的11位手机号（1开头，共11位数字）', trigger: 'blur' }
  ]
}

// 实时过滤：只允许输入数字，最多 11 位，防止乱输入
watch(() => appointForm.contactPhone, (val) => {
  if (val) {
    const cleaned = val.replace(/[^\d]/g, '').slice(0, 11)
    if (cleaned !== val) appointForm.contactPhone = cleaned
  }
})

function petGradient(id) {
  const colors = [['#fff4e6', '#ffe0b3'], ['#e8f5e9', '#c8e6c9'], ['#e3f2fd', '#bbdefb'], ['#fce4ec', '#f8bbd0']]
  return `linear-gradient(135deg, ${colors[(id||0)%colors.length][0]}, ${colors[(id||0)%colors.length][1]})`
}
function genderText(g) { return g === '0' ? '公' : g === '1' ? '母' : '未知' }
function statusText(s) { return ['在售','已售','下架'][s] || '未知' }
function isImage(s) { return !!s && (s.indexOf('/') === 0 || s.indexOf('http') === 0) }
function fmtDate(d) { return d ? String(d).slice(0, 10) : '—' }
function skillTag(s) {
  return s === '入门' ? 'success' : s === '进阶' ? 'warning' : 'danger'
}

async function loadPet() {
  loading.value = true
  try {
    const res = await getPetInfo(route.params.id)
    pet.value = res.data || {}
    await Promise.all([loadFavStatus(), loadHealth(), loadPreference()])
  } catch (e) {
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

async function loadHealth() {
  try {
    const res = await getPetHealth(route.params.id)
    health.value = (res.data && res.data.healthId) ? res.data : {}
  } catch (e) {
    health.value = {}
  }
}

async function loadPreference() {
  try {
    const res = await getPetPreference(route.params.id)
    preference.value = (res.data && res.data.preferenceId) ? res.data : {}
  } catch (e) {
    preference.value = {}
  }
}

async function loadFavStatus() {
  if (!userStore.token) { isFav.value = false; return }  // 未登录不查收藏状态
  try {
    const res = await listPetFavorite({ userId: userStore.userId, petId: route.params.id })
    isFav.value = (res.rows || []).length > 0
  } catch (e) {}
}

/** 唤起全站 AI 助手，并带上当前宠物作为上下文 */
function askAi() {
  const p = pet.value || {}
  const q = `我在看「${p.petName}」（${p.breed || '品种未知'}，¥${p.price || '价格面议'}），它适合什么样的家庭？养它每月大概要花多少？`
  window.dispatchEvent(new CustomEvent('pet-ai-open', { detail: { q } }))
}

async function toggleFav() {
  if (!userStore.token) {
    ElMessage.info('请先登录后再收藏')
    openAuth('login')
    return
  }
  try {
    if (isFav.value) {
      const res = await listPetFavorite({ userId: userStore.userId, petId: route.params.id })
      const fid = res.rows?.[0]?.favoriteId
      if (fid) await delPetFavorite(fid)
      isFav.value = false
      ElMessage.success('已取消收藏')
    } else {
      await addPetFavorite({ petId: route.params.id, userId: userStore.userId })
      isFav.value = true
      ElMessage.success('收藏成功')
    }
  } catch (e) {
    ElMessage.error(e?.message || '操作失败')
  }
}

function disabledDate(d) {
  return d.getTime() < Date.now() - 24 * 3600 * 1000
}

async function loadSlots() {
  appointForm.slot = ''
  slots.value = []
  if (!appointForm.storeId || !appointForm.date) return
  slotLoading.value = true
  try {
    const res = await getAppointmentSlots(appointForm.storeId, appointForm.date)
    slots.value = res.data || []
  } catch (e) {
    slots.value = []
  } finally {
    slotLoading.value = false
  }
}

/** 立即购买：下单即锁定宠物，支付走订单收银台 */
async function buyNow() {
  if (!userStore.token) {
    ElMessage.info('请先登录后再购买')
    openAuth('login')
    return
  }
  if (pet.value.status !== '0') {
    ElMessage.warning('这只宠物已经被订走了')
    return
  }
  try {
    await ElMessageBox.confirm(
      `确认购买「${pet.value.petName}」？金额 ¥${pet.value.price || 0}。下单后这只宠物会为你锁定，未支付可在「我的订单」中取消释放。`,
      '确认购买',
      { confirmButtonText: '去支付', cancelButtonText: '再看看', type: 'warning' }
    )
  } catch (e) {
    return
  }
  buying.value = true
  try {
    const res = await createPetOrder(pet.value.petId)
    ElMessage.success('下单成功，请完成支付')
    // 带 pay 参数跳转，订单页会自动弹出收银台
    router.push({ path: '/shop/order', query: { pay: res.data && res.data.orderNo } })
  } catch (e) {
    ElMessage.error(e?.message || '下单失败，可能刚被别人订走')
    loadPet()
  } finally {
    buying.value = false
  }
}

function openAppoint() {
  showAppoint.value = true
  if (!appointForm.storeId && stores.value.length) {
    appointForm.storeId = stores.value[0].storeId
  }
  if (!appointForm.date) {
    const d = new Date()
    appointForm.date = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
  }
  loadSlots()
}

function submitAppoint() {
  if (!userStore.token) {
    ElMessage.info('请先登录后再预约')
    openAuth('login')
    return
  }
  appointRef.value.validate(async valid => {
    if (!valid) return
    submitting.value = true
    try {
      await addPetAppointment({
        petId: route.params.id,
        userId: userStore.userId,
        storeId: appointForm.storeId,
        appointmentDate: appointForm.date + ' ' + appointForm.slot + ':00',
        contactPhone: appointForm.contactPhone,
        status: '0',
        remark: appointForm.remark
      })
      ElMessage.success('预约提交成功，商家会尽快联系您！')
      showAppoint.value = false
      appointForm.slot = ''
      appointForm.contactPhone = ''
      appointForm.remark = ''
    } catch (e) {
      ElMessage.error(e?.message || '预约失败，请重试')
    } finally {
      submitting.value = false
    }
  })
}

onMounted(() => {
  loadPet()
  storeOptions().then((res) => { stores.value = res.data || [] }).catch(() => {})
})
</script>

<style scoped lang="scss">
.slot-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; width: 100%; }
.slot { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 6px 0; border: 1px solid var(--border-1); background: #fff; border-radius: 8px; cursor: pointer; transition: .15s;
  b { font-size: 13px; color: var(--text-1); font-weight: 500; }
  span { font-size: 11px; color: var(--text-3); }
  &:hover:not(:disabled) { border-color: var(--brand-500); }
  &.active { border-color: var(--brand-500); background: var(--brand-50); b { color: var(--brand-700); } }
  &.full { background: var(--bg-page); cursor: not-allowed; b { color: var(--text-4); } span { color: var(--text-4); } }
}
.slot-empty { grid-column: 1 / -1; margin: 0; font-size: 12px; color: var(--text-3); }

.detail { max-width: var(--container-md); margin: 0 auto; padding: 32px 24px; }
.detail-inner { display: flex; gap: 40px; background: #fff; border-radius: 16px; padding: 32px; box-shadow: 0 4px 20px rgba(0,0,0,.06); }
.left { flex: 0 0 380px;
  .big-avatar { height: 320px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 160px; overflow: hidden;
    .big-photo { width: 100%; height: 100%; object-fit: cover; display: block; }
  }
  .guest-tip { margin-top: 12px; background: var(--brand-50); border-radius: 8px; padding: 10px 14px; font-size: 13px; color: var(--brand-800); display: flex; gap: 4px; flex-wrap: wrap; align-items: center; }
}
.right { flex: 1;
  h1 { font-size: 30px; color: var(--text-1); margin: 0 0 16px; }
  .tags { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; }
  .price { background: var(--price-soft); border-radius: 10px; padding: 16px 20px; margin-bottom: 20px;
    .label { color: var(--text-3); font-size: 13px; margin-right: 12px; }
    .amount { color: var(--price); font-size: 28px; font-weight: 700; }
  }
  .desc { margin-bottom: 24px;
    h3 { font-size: 16px; color: var(--text-1); margin: 0 0 8px; }
    p { color: var(--text-2); line-height: 1.8; }
  }
  .actions { display: flex; gap: 16px; margin-top: 32px; flex-wrap: wrap;
    .ai-ask { background: linear-gradient(135deg, var(--brand-50), #fff); border-color: var(--brand-300); color: var(--brand-700); font-weight: 600;
      &:hover { background: var(--brand-50); border-color: var(--brand-500); color: var(--brand-700); }
    }
  }
}

/* 健康与服务档案 */
.health-panel { background: #fff; border-radius: 16px; padding: 26px 30px; margin-top: 24px; box-shadow: 0 4px 20px rgba(0,0,0,.06);
  .panel-head { display: flex; align-items: baseline; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-bottom: 18px;
    h2 { margin: 0; font-size: 20px; color: var(--text-1); }
    .archive { color: var(--text-3); font-size: 13px; }
  }
  .health-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(320px, 100%), 1fr)); gap: 16px;
    .h-card { border: 1px solid var(--border-2); border-radius: 12px; padding: 18px 20px; background: var(--bg-page);
      h3 { margin: 0 0 12px; font-size: 16px; color: var(--text-1); display: flex; align-items: center; gap: 8px;
        .ico { font-size: 18px; }
      }
      ul { margin: 0; padding: 0; list-style: none;
        li { display: flex; gap: 12px; padding: 6px 0; font-size: 13px; line-height: 1.7; border-bottom: 1px dashed var(--bg-sunken);
          &:last-child { border-bottom: none; }
          .k { flex: 0 0 76px; color: var(--text-3); }
          .v { flex: 1; color: var(--text-2); word-break: break-all;
            &.ok { color: var(--success-500); font-weight: 600; }
          }
        }
      }
    }
  }
}

.not-found { text-align: center; padding: 80px 0; color: var(--text-4);
  .icon { font-size: 64px; display: block; margin-bottom: 16px; }
}

/* 宠物喜好 */
.pref-panel { background: #fff; border-radius: 16px; padding: 26px 30px; margin-top: 24px; box-shadow: 0 4px 20px rgba(0,0,0,.06);
  .panel-head { display: flex; align-items: baseline; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-bottom: 18px;
    h2 { margin: 0; font-size: 20px; color: var(--text-1); }
    .archive { color: var(--text-3); font-size: 13px; }
  }
  .pref-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(260px, 100%), 1fr)); gap: 14px;
    .pref-item { display: flex; gap: 12px; align-items: flex-start; background: var(--brand-50); border: 1px solid var(--brand-100); border-radius: 12px; padding: 14px 16px;
      .ico { font-size: 22px; flex-shrink: 0; }
      b { display: block; font-size: 13px; color: var(--brand-500); margin-bottom: 2px; }
      p { margin: 0; font-size: 13px; color: var(--text-2); line-height: 1.6; }
      &.warn { background: var(--danger-50); border-color: var(--danger-100);
        b { color: var(--danger-500); }
      }
    }
  }
}
/* 手机端：左右结构改上下，大图等比例缩小，不再一张图占一屏 */
@media (max-width: 768px) {
  .detail { padding: 16px 12px; }
  .detail-inner { flex-direction: column; gap: 18px; padding: 20px 16px; }
  .left {
    flex: none;
    width: 100%;
    .big-avatar {
      height: auto;
      width: 100%;
      aspect-ratio: 4 / 3;   /* 保持等比，宽度跟随容器 */
      max-height: min(280px, 34vh);
      font-size: 96px;
    }
  }
  .right {
    h1 { font-size: 22px; margin-bottom: 12px; }
    .price { padding: 12px 16px; margin-bottom: 14px;
      .amount { font-size: 22px; }
    }
    .actions { gap: 10px; margin-top: 20px;
      .el-button { flex: 1 1 30%; min-width: 0; padding-left: 8px; padding-right: 8px; }
    }
  }
  .health-panel, .pref-panel { padding: 18px 14px;
    .panel-head h2 { font-size: 17px; }
  }
}
</style>
