<template>
  <div class="detail" v-loading="loading">
    <!-- 返回入口：从哪张卡片点进来就退回哪里 -->
    <button type="button" class="back-row" @click="goBack">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>
      返回{{ backLabel }}
    </button>
    <div class="detail-inner" v-if="pet.petId">
      <!-- 左侧大图 -->
      <div class="left">
        <div class="big-avatar" :style="{ background: petGradient(pet.petId) }">
          <img
            v-if="isImage(pet.image)" :src="pet.image" :alt="pet.petName" class="big-photo"
            :style="imageVars(pet.petId)"
          />
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
        <div class="title-row">
          <h1>{{ pet.petName }}</h1>
          <!-- 状态先于行动：能不能买一眼可见，不藏在按钮的禁用态里 -->
          <span class="state-chip" :class="pet.status === '0' ? 'ok' : 'off'">
            <i></i>{{ statusText(pet.status) }}
          </span>
          <button
            type="button" class="fav-star" :class="{ on: isFav }"
            :aria-pressed="isFav" :aria-label="isFav ? '取消收藏' : '收藏'"
            @click="toggleFav"
          >
            <svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-9a4 4 0 017-2.6A4 4 0 0119 11c0 4.6-7 9-7 9z"/></svg>
          </button>
        </div>
        <div class="tags">
          <el-tag effect="plain" type="info">{{ pet.breed || '未知品种' }}</el-tag>
          <el-tag effect="plain" type="info" v-if="pet.age">{{ pet.age }}</el-tag>
          <el-tag effect="plain" type="info">{{ genderText(pet.gender) }}</el-tag>
          <el-tag v-if="health.healthId" class="tag-health">健康等级：{{ health.healthLevel || '待评定' }}</el-tag>
        </div>
        <!-- 健康信任条：把档案证据提到首屏决策区，点击跳转完整档案 -->
        <button type="button" class="health-strip" v-if="health.healthId" @click="jumpArchive">
          <span class="hs-item">
            <i class="hs-dot"></i>
            <span class="hs-txt"><b>疫苗接种</b>{{ health.vaccineName }} {{ health.vaccineProgress }} · {{ fmtDate(health.vaccineDate) }}</span>
          </span>
          <span class="hs-item">
            <i class="hs-dot"></i>
            <span class="hs-txt"><b>体内外驱虫</b>{{ health.dewormName }} · {{ fmtDate(health.dewormDate) }}</span>
          </span>
          <span class="hs-item">
            <i class="hs-dot"></i>
            <span class="hs-txt"><b>体检结论</b>{{ health.examResult }} · {{ fmtDate(health.examDate) }}</span>
          </span>
          <span class="hs-more">完整档案 ↓</span>
        </button>
        <div class="price" v-if="pet.price">
          <span class="label">售价</span>
          <span class="amount"><i>¥</i>{{ fmtPrice(pet.price) }}</span>
        </div>
        <div class="desc" v-if="pet.description">
          <h3>宠物简介</h3>
          <p>{{ pet.description }}</p>
        </div>
        <div class="actions" v-if="pet.status === '0'">
          <el-button size="large" type="primary" :loading="buying" @click="buyNow">立即购买</el-button>
          <el-button size="large" @click="addPetToCart">加入购物车</el-button>
          <el-button size="large" @click="openAppoint">立即预约看宠</el-button>
          <button type="button" class="ai-link" @click="askAi">它适合我吗？问 AI ›</button>
        </div>
        <!-- 已被订走：主行动换成「现在还能做什么」，禁用的购买按钮不再占据首屏最重的位置 -->
        <div class="actions" v-else>
          <el-button size="large" type="primary" @click="goSameBreed">看看同品种在售</el-button>
          <el-button size="large" @click="openAppoint">预约到店看宠</el-button>
          <button type="button" class="ai-link" @click="askAi('match')">帮我按条件重新匹配 ›</button>
        </div>
        <p class="sold-note" v-if="pet.status !== '0'">
          这只已经被订走了。同品种个体可以到店再看；也可以让 AI 按你的预算与居住条件重新匹配。
        </p>
      </div>
    </div>

    <!-- 移动端吸底购买栏：价格常驻 + 加购/购买主行动，替代随滚动离场的按钮组 -->
    <div class="buy-bar" v-if="pet.petId">
      <div class="bb-price">
        <span class="label">售价</span>
        <span class="amount"><i>¥</i>{{ fmtPrice(pet.price) }}</span>
      </div>
      <template v-if="pet.status === '0'">
        <el-button @click="addPetToCart">加购</el-button>
        <el-button type="primary" :loading="buying" @click="buyNow">立即购买</el-button>
      </template>
      <el-button v-else type="primary" @click="goSameBreed">看看同品种</el-button>
    </div>

    <!-- 健康与服务档案（后台维护，前台实时展示）：时间线表格是本页的信任主角 -->
    <div class="health-panel" v-if="pet.petId && health.healthId" id="health-archive">
      <div class="panel-head">
        <h2>健康与服务档案</h2>
        <span class="archive">档案编号 {{ health.archiveNo }} · 体检机构：{{ health.examHospital }}</span>
      </div>

      <table class="tl">
        <thead>
          <tr><th>日期</th><th>事项</th><th>明细</th><th>结果</th></tr>
        </thead>
        <tbody>
          <tr v-for="(r, i) in timeline" :key="i">
            <td class="tl-date">{{ r.date ? fmtDate(r.date) : '—' }}</td>
            <td class="tl-name">{{ r.name }}</td>
            <td class="tl-detail">{{ r.detail }}</td>
            <td class="tl-res"><i class="dot"></i>{{ r.result }}</td>
          </tr>
        </tbody>
      </table>
      <p class="tl-note" v-if="health.healthNote">备注：{{ health.healthNote }}</p>

      <div class="health-grid">
        <!-- 真实信息 -->
        <section class="h-sec">
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
        <section class="h-sec">
          <h3>专业养护</h3>
          <ul>
            <li><span class="k">性格特点</span><span class="v">{{ health.temperament }}</span></li>
            <li><span class="k">饲养难度</span><span class="v"><el-tag size="small" :type="skillTag(health.skillLevel)">{{ health.skillLevel }}</el-tag></span></li>
            <li><span class="k">喂养方案</span><span class="v">{{ health.feedPlan }}</span></li>
            <li><span class="k">护理要点</span><span class="v">{{ health.carePoints }}</span></li>
          </ul>
        </section>

        <!-- 售后无忧 -->
        <section class="h-sec">
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
import { ref, reactive, computed, onMounted, inject, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getPetInfo } from '@/api/pet/petInfo'
import { createPetOrder } from '@/api/pet/petOrder'
import { listPetFavorite, addPetFavorite, delPetFavorite } from '@/api/pet/petFavorite'
import { imageVars } from '@/views/shop/home/imageTuning'
import { addPetAppointment, getAppointmentSlots } from '@/api/pet/petAppointment'
import { storeOptions } from '@/api/pet/petStore'
import { getPetHealth } from '@/api/pet/petHealth'
import { getPetPreference } from '@/api/pet/petPreference'
import { useUserStore } from '@/store/modules/user'
import { useCartStore } from '@/store/modules/cart'
import PetSocial from '@/components/PetSocial/index.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const cartStore = useCartStore()
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
// 价格统一千分位，与列表卡同一写法（¥2,800 而不是 ¥ 2500）
function fmtPrice(p) {
  const n = Number(p)
  return Number.isFinite(n) ? n.toLocaleString('zh-CN') : p
}
function skillTag(s) {
  return s === '入门' ? 'success' : s === '进阶' ? 'warning' : 'danger'
}

/** 健康时间线：按日期倒序，无日期的排最后 */
const timeline = computed(() => {
  const h = health.value
  if (!h.healthId) return []
  const rows = []
  if (h.vaccineDate || h.vaccineName) rows.push({
    date: h.vaccineDate,
    name: '疫苗接种',
    detail: `${h.vaccineName || ''}（${h.vaccineProgress || '—'}）`,
    result: h.vaccineProgress === '3/3' ? '已完成' : (h.vaccineProgress || '进行中')
  })
  if (h.dewormDate || h.dewormName) rows.push({
    date: h.dewormDate,
    name: '体内外驱虫',
    detail: h.dewormName || '—',
    result: '已完成'
  })
  if (h.examDate || h.examItems) rows.push({
    date: h.examDate,
    name: '体检',
    detail: `${h.examItems || '—'}${h.examHospital ? ' · ' + h.examHospital : ''}`,
    result: h.examResult || '—'
  })
  if (h.geneticScreen) rows.push({
    date: null,
    name: '遗传病排查',
    detail: h.geneticScreen,
    result: '未见异常'
  })
  rows.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
  return rows
})

function jumpArchive() {
  document.getElementById('health-archive')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/* 返回：优先回到进入来源页（卡片来源由 ?from= 带入）；
   直接打开的 URL 没有 from 时，回应用内上一页，再兜底到在售宠物页 */
const FROM_LABELS = {
  '/shop/home': '首页',
  '/shop/pets': '在售宠物',
  '/shop/favorite': '我的收藏',
  '/shop/match': '智能选宠'
}
const backLabel = computed(() => FROM_LABELS[String(route.query.from || '')] || '')
function goBack() {
  const from = String(route.query.from || '')
  if (from && FROM_LABELS[from]) {
    // 来源页若要恢复现场（目前只有智能选宠，由 ?restore= 标记），把标记一起带回去；
    // 其余来源不带 query，避免给列表页的 URL 添上无意义的参数
    const query = route.query.restore ? { restore: String(route.query.restore) } : {}
    return router.push({ path: from, query })
  }
  if (window.history.state && window.history.state.back) return router.back()
  router.push('/shop/pets')
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

/** 唤起 AI 选宠顾问，带上当前宠物作为上下文；已售时改问「重新匹配」 */
function askAi(mode) {
  const id = pet.value?.petId || route.params.id
  const sold = pet.value?.status !== '0'
  const message = (mode === 'match' || sold)
    ? '这只已经被订走了，按我的预算和居住条件重新推荐几只'
    : '它适合新手吗？每月大概要花多少钱？'
  window.dispatchEvent(new CustomEvent('pet-assistant-open', {
    detail: { scene: 'detail', petId: id, bizId: String(id || ''), message }
  }))
}

/** 已售时的去处：同品种在售列表（没有品种名就退回全部在售） */
function goSameBreed() {
  const kw = String(pet.value?.breed || '').trim()
  router.push(kw ? { path: '/shop/pets', query: { kw } } : '/shop/pets')
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

/** 加入购物车：宠物一只一条（数量固定 1），可与宠物粮一起结算 */
function addPetToCart() {
  if (pet.value.status !== '0') {
    ElMessage.warning('这只宠物已经被订走了')
    return
  }
  cartStore.addItem({
    id: `pet-${pet.value.petId}`,
    itemType: '2',
    petId: pet.value.petId,
    name: pet.value.petName,
    image: pet.value.image,
    spec: pet.value.breed,
    price: pet.value.price
  })
  ElMessage.success('已加入购物车，可与宠物粮一起结算')
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
      `确认购买「${pet.value.petName}」？金额 ¥${pet.value.price || 0}。下单后这只宠物会为你锁定，未支付可在购物车的「下单记录」中取消释放。`,
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
    // 带 pay 参数去购物车页，下单记录会自动弹出收银台
    router.push({ path: '/shop/cart', query: { pay: res.data && res.data.orderNo } })
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
.slot { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 6px 0; border: 1px solid var(--border-1); background: #fff; border-radius: var(--radius-md); cursor: pointer; transition: .15s;
  b { font-size: 13px; color: var(--text-1); font-weight: 500; }
  span { font-size: 11px; color: var(--text-3); }
  &:hover:not(:disabled) { border-color: var(--brand-500); }
  &.active { border-color: var(--brand-500); background: var(--brand-50); b { color: var(--brand-700); } }
  &.full { background: var(--bg-page); cursor: not-allowed; b { color: var(--text-4); } span { color: var(--text-4); } }
}
.slot-empty { grid-column: 1 / -1; margin: 0; font-size: 12px; color: var(--text-3); }

/* 移动端吸底购买栏：默认隐藏；手机端固定在底部标签栏（66px+安全区）之上 */
.buy-bar { display: none; }
@media (max-width: 768px) {
  /* 本页吸底栏与 AI 悬浮球同占右下角：注入变量把悬浮球抬到购买栏上方 */
  :global(.assistant-dock) { --as-dock-bottom: 136px; }
  .buy-bar {
    display: flex; align-items: center; gap: 10px;
    position: fixed; left: 0; right: 0;
    bottom: calc(66px + env(safe-area-inset-bottom));
    z-index: 89; /* 低于 tabbar(90)，但位置在其上方不重叠 */
    padding: 10px 12px;
    background: rgba(255, 255, 255, .97);
    backdrop-filter: blur(8px);
    border-top: var(--rule);
    .bb-price { flex: 1; display: flex; align-items: baseline; gap: 6px; min-width: 0;
      .label { font-size: 12px; color: var(--text-3); }
      .amount { color: var(--price); font-family: var(--font-num); font-size: 22px; font-weight: 700;
        line-height: 1.1; letter-spacing: -.01em; font-variant-numeric: tabular-nums;
        i { font-style: normal; font-size: 13px; margin-right: 1px; } }
    }
    .el-button { height: 40px; margin: 0; font-weight: 700; padding-left: 14px; padding-right: 14px; }
  }
}

.detail { max-width: var(--container-lg); margin: 0 auto; padding: 24px 24px 32px; }
.back-row {
  display: inline-flex; align-items: center; gap: 5px;
  margin: 0 0 14px; padding: 6px 10px 6px 6px;
  border: 0; background: none; cursor: pointer; font-family: inherit;
  border-radius: var(--radius-sm);
  font-size: 13px; font-weight: 700; color: var(--text-3);
  transition: color .16s, background .16s;
  svg { width: 15px; height: 15px; stroke: currentColor; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
  &:hover { color: var(--brand-700); background: var(--brand-50); }
}
/* 首屏：不再把左右两块装进一张白卡，改为「图片 + 一条竖分割线 + 信息」 */
.detail-inner { display: flex; gap: 40px; padding: 8px 0 0; }
.left { flex: 0 0 380px;
  .big-avatar { height: 320px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; font-size: 160px; overflow: hidden;
    .big-photo {
    width: 100%; height: 100%; object-fit: cover; display: block;
    object-position: var(--img-pos, 50% 45%);
    transform: scale(var(--img-zoom, 1));
  }
  }
  .guest-tip { margin-top: 12px; padding: 2px 0 2px 12px; border-left: 2px solid var(--brand-300); font-size: 13px; color: var(--brand-800); display: flex; gap: 4px; flex-wrap: wrap; align-items: center; }
}
.right { flex: 1; min-width: 0; padding-left: 40px; border-left: var(--rule);
  .title-row { display: flex; align-items: center; gap: 12px; margin: 0 0 16px;
    h1 { font-size: 28px; color: var(--text-1); margin: 0; }
    .fav-star { flex-shrink: 0; width: 40px; height: 40px; border-radius: 50%;
      border: 1px solid var(--border-1); background: var(--bg-card); cursor: pointer;
      display: grid; place-items: center; transition: border-color .16s, background .16s;
      svg { width: 18px; height: 18px; stroke: var(--text-2); fill: none; stroke-width: 1.8; transition: stroke .16s, fill .16s; }
      &:hover { border-color: var(--brand-300); background: var(--brand-50);
        svg { stroke: var(--brand-600); } }
      &.on { border-color: var(--brand-300); background: var(--brand-50);
        svg { stroke: var(--brand-600); fill: var(--brand-600); } }
    }
  }
  /* 状态 chip：与卡片上的「已售 / 可到店看」同一套语义色 */
  .state-chip { display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0;
    height: 24px; padding: 0 9px; border-radius: var(--radius-xs);
    border: 1px solid var(--border-1); background: var(--bg-sunken);
    font-size: 12px; font-weight: 700; color: var(--text-2);
    i { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
    &.ok { border-color: var(--success-100); background: var(--success-50); color: var(--success-500); }
  }
  .tags { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px;
    .tag-health { background: var(--brand-600); border-color: var(--brand-600); color: #fff; font-weight: 700; }
  }
  .health-strip { display: flex; align-items: stretch; gap: 0; width: 100%; margin: 0 0 20px; padding: 12px 0;
    border: 0; border-top: var(--rule); border-bottom: var(--rule); background: none; cursor: pointer; text-align: left; font-family: inherit;
    // 条目多时允许换行，避免第 3 条与「完整档案」互相挤到截断
    flex-wrap: wrap; row-gap: 12px;
    &:hover .hs-more { color: var(--brand-500); }
    &:hover .hs-txt b { color: var(--brand-700); }
    .hs-item { display: flex; align-items: flex-start; gap: 8px; flex: 1 1 200px; padding: 0 16px; border-left: var(--rule-soft);
      &:first-child { border-left: 0; padding-left: 0; }
      .hs-dot { flex-shrink: 0; width: 7px; height: 7px; margin-top: 5px; border-radius: 50%; background: var(--success-500); box-shadow: 0 0 0 3px var(--success-50); }
      .hs-txt { font-size: 12.5px; color: var(--text-2); line-height: 1.55; overflow-wrap: anywhere;
        b { display: block; font-size: 12px; font-weight: 700; letter-spacing: .06em; color: var(--text-3); margin-bottom: 2px; }
      }
    }
    .hs-more { flex-shrink: 0; align-self: center; padding-left: 16px; border-left: var(--rule-soft); font-size: 12.5px; color: var(--text-3); white-space: nowrap; }
  }
  /* 价格：去底色块，用上下两条 1px 线把「售价」框成一行 */
  .price { display: flex; align-items: center; gap: 12px; padding: 16px 0; margin-bottom: 20px;
    border-top: var(--rule); border-bottom: var(--rule);
    .label { color: var(--text-3); font-size: 13px; }
    .amount { color: var(--price); font-family: var(--font-num); font-size: 28px; font-weight: 700;
      line-height: 1.1; letter-spacing: -.01em; font-variant-numeric: tabular-nums;
      i { font-style: normal; font-size: 16px; margin-right: 2px; } }
  }
  .desc { margin-bottom: 24px;
    h3 { font-size: 16px; color: var(--text-1); margin: 0 0 8px; }
    p { color: var(--text-2); line-height: 1.8; }
  }
  .actions { display: flex; align-items: center; gap: 16px; margin-top: 32px; flex-wrap: wrap;
    // 首屏主行动统一 48px 高（与首页 .btn 同一档）
    .el-button { height: 48px; min-width: 148px; font-weight: 700; }
    .ai-link { border: 0; background: none; padding: 4px 0; cursor: pointer; font-family: inherit;
      font-size: 13px; font-weight: 700; color: var(--text-3); transition: color .16s;
      &:hover { color: var(--brand-700); }
    }
  }
  /* 已售说明：一行解释，不占按钮位 */
  .sold-note { margin: 14px 0 0; max-width: 34em; font-size: 12.5px; line-height: 1.7; color: var(--text-3); }
}

/* 健康与服务档案：去容器化，1px 顶线 + 分区标题直接承接；锚点定位给 sticky 头留偏移 */
.health-panel { margin-top: 32px; padding: 26px 0 8px; border-top: var(--rule);
  scroll-margin-top: 130px;
  .panel-head { display: flex; align-items: baseline; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-bottom: 18px;
    h2 { margin: 0; font-size: 20px; color: var(--text-1); }
    .archive { color: var(--text-3); font-size: 13px; }
  }

  /* 健康时间线：1px 分割线的表格是本面板主角 */
  .tl { width: 100%; border-collapse: collapse; margin-bottom: 8px;
    th { padding: 0 12px 9px 0; font-size: 12px; font-weight: 700; letter-spacing: .08em; color: var(--text-3); text-align: left; border-bottom: var(--rule); white-space: nowrap; }
    td { padding: 11px 12px 11px 0; font-size: 13px; line-height: 1.6; vertical-align: top; border-bottom: var(--rule-soft); }
    tr:last-child td { border-bottom: none; }
    .tl-date { width: 100px; white-space: nowrap; color: var(--text-2); font-variant-numeric: tabular-nums; }
    .tl-name { width: 92px; white-space: nowrap; color: var(--text-1); font-weight: 700; }
    .tl-detail { color: var(--text-2); }
    .tl-res { width: 150px; white-space: nowrap; color: var(--success-500); font-weight: 700;
      .dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: var(--success-500); margin-right: 7px; box-shadow: 0 0 0 3px var(--success-50); }
    }
  }
  .tl-note { margin: 4px 0 0; font-size: 12.5px; color: var(--text-3); }

  .health-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr)); gap: 8px 36px; margin-top: 22px; padding-top: 20px; border-top: var(--rule);
    .h-sec {
      h3 { margin: 0 0 6px; font-size: 14px; color: var(--text-1); }
      ul { margin: 0; padding: 0; list-style: none;
        li { display: flex; gap: 12px; padding: 7px 0; font-size: 13px; line-height: 1.7; border-bottom: var(--rule-soft);
          &:last-child { border-bottom: none; }
          .k { flex: 0 0 76px; color: var(--text-3); }
          .v { flex: 1; color: var(--text-2); word-break: break-all; }
        }
      }
    }
  }
}

.not-found { text-align: center; padding: 80px 0; color: var(--text-4);
  .icon { font-size: 64px; display: block; margin-bottom: 16px; }
}

/* 宠物喜好 */
.pref-panel { margin-top: 32px; padding: 26px 0 8px; border-top: var(--rule);
  .panel-head { display: flex; align-items: baseline; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-bottom: 18px;
    h2 { margin: 0; font-size: 20px; color: var(--text-1); }
    .archive { color: var(--text-3); font-size: 13px; }
  }
  .pref-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(260px, 100%), 1fr)); gap: 14px;
    .pref-item { display: flex; gap: 12px; align-items: flex-start; padding: 3px 0 3px 12px; border-left: 2px solid var(--brand-200);
      .ico { font-size: 20px; flex-shrink: 0; }
      b { display: block; font-size: 13px; color: var(--brand-500); margin-bottom: 2px; }
      p { margin: 0; font-size: 13px; color: var(--text-2); line-height: 1.6; }
      &.warn { border-left-color: var(--danger-500);
        b { color: var(--danger-500); }
      }
    }
  }
}
/* 手机端：左右结构改上下，大图等比例缩小，不再一张图占一屏 */
@media (max-width: 768px) {
  /* 底部多让出吸底购买栏(约60px)+安全区，避免盖住页面最后几行 */
  .detail { padding: 16px 12px calc(60px + env(safe-area-inset-bottom)); }
  .detail-inner { flex-direction: column; gap: 18px; padding: 0; }
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
    padding-left: 0; border-left: 0;
    .title-row { margin-bottom: 12px;
      h1 { font-size: 20px; }
      .fav-star { width: 40px; height: 40px; }
    }
    .price { padding: 12px 0; margin-bottom: 14px;
      .amount { font-size: 24px; }
    }
    .actions { gap: 10px; margin-top: 20px;
      .el-button { flex: 1 1 40%; min-width: 0; padding-left: 8px; padding-right: 8px; }
      .ai-link { flex: 1 1 100%; order: 3; }
    }
  }
  .health-panel, .pref-panel { padding: 18px 0 0; margin-top: 24px;
    .panel-head h2 { font-size: 16px; }
    .tl {
      thead { display: none; }
      tr { display: block; padding: 10px 0; border-bottom: var(--rule-soft); }
      tr:last-child { border-bottom: none; }
      td { display: block; padding: 0; border: 0; }
      .tl-date { width: auto; margin-bottom: 2px; font-size: 12px; color: var(--text-3); }
      .tl-name { display: inline; width: auto; margin-right: 8px; }
      .tl-detail { margin: 3px 0; }
      .tl-res { width: auto; margin-top: 3px; }
    }
    .health-grid { gap: 6px 0; margin-top: 16px; padding-top: 14px; }
  }
  .right .health-strip { flex-wrap: wrap; row-gap: 10px; padding: 10px 0;
    .hs-item { flex: 1 1 100%; padding: 0; border-left: 0; }
    .hs-more { margin-left: auto; padding-left: 0; border-left: 0; }
  }
}
</style>
