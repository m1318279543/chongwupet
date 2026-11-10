<template>
  <div class="ui-page ui-page--md apt-page">
    <!-- 页面头 -->
    <header class="ui-head">
      <div class="ui-head__main">
        <p class="ui-eyebrow">Services</p>
        <h1 class="ui-title">预约服务</h1>
        <p class="ui-sub">选项目、定时间就能下单，预约与具体宠物解耦：到店服务直接带宠物过来，上门服务填好地址等技师上门。</p>
      </div>
      <div class="ui-head__aside">
        <!-- 顾客自己打分 + 写评价：点星快速评分，「写评价/评价列表」弹窗里可写文字 -->
        <div v-if="ratingLoaded" class="as-rate" @mouseleave="hoverStar = 0">
          <span class="as-rate__label">{{ myScore ? '您的评分' : '为本店服务打分' }}</span>
          <div class="as-rate__stars" role="radiogroup" aria-label="服务评分">
            <button
              v-for="n in 5"
              :key="n"
              type="button"
              class="as-rate__star"
              :class="{ 'is-on': n <= (hoverStar || myScore), 'is-mine': !hoverStar && n <= myScore }"
              :disabled="ratingSubmitting"
              :aria-label="`${n} 星`"
              :aria-checked="myScore === n"
              role="radio"
              @mouseenter="hoverStar = n"
              @click="rateService(n)"
            >
              <el-icon><StarFilled /></el-icon>
            </button>
          </div>
          <button type="button" class="as-rate__link" @click="openReviewDialog">
            {{ ratingCount > 0 ? `${ratingCount} 条评价` : '写评价' }}
          </button>
        </div>
      </div>
    </header>

    <p v-if="!userStore.token" class="apt-note">
      当前为游客浏览，
      <button type="button" class="ui-linkbtn" @click="openAuth('login')">登录</button>
      后可自助预约并在线支付。
    </p>

    <!-- 门店服务项目：点「立即预约」直接进下单弹窗，不再绕去宠物档案页 -->
    <section class="svc-price" v-if="serviceItems.length">
      <h3 class="svc-price__title">门店服务项目</h3>
      <div class="svc-price__grid">
        <div class="svc-item" v-for="it in serviceItems" :key="it.itemId">
          <div class="svc-item__head">
            <span class="svc-item__name">{{ it.itemName }}</span>
            <span class="svc-item__type">{{ typeText(it.itemType) }}</span>
          </div>
          <p class="svc-item__desc" v-if="it.remark">{{ it.remark }}</p>
          <div class="svc-item__foot">
            <span class="svc-item__price">{{ Number(it.price) > 0 ? '¥' + it.price : '免费' }}</span>
            <span class="svc-item__dur" v-if="it.duration">约 {{ durText(it.duration) }}</span>
            <button type="button" class="svc-item__cta" @click="openBooking(it)">立即预约</button>
          </div>
        </div>
      </div>
    </section>

    <!-- 我的预约：新旧两个来源合并为一个列表，Tab + 搜索实时过滤 -->
    <section class="apt-body" v-loading="loading">
      <div class="apt-sec">
        <h3 class="apt-sec__title">我的预约</h3>
        <span class="apt-sec__hint">共 {{ appointments.length }} 条 · 按预约时间倒序</span>
      </div>

      <div class="apt-tools">
        <div class="apt-tabs" role="tablist" aria-label="按状态筛选预约">
          <button
            v-for="t in TABS"
            :key="t.key"
            type="button"
            role="tab"
            class="apt-tab"
            :class="{ 'is-on': tab === t.key }"
            :aria-selected="tab === t.key"
            @click="tab = t.key"
          >
            {{ t.label }}
            <em v-if="tabCount(t.key)">{{ tabCount(t.key) }}</em>
          </button>
        </div>

        <label class="apt-search">
          <el-icon class="apt-search__icon"><Search /></el-icon>
          <input
            v-model="keyword"
            class="apt-search__input"
            type="search"
            placeholder="搜索宠物名称或手机号"
            aria-label="搜索宠物名称或手机号"
          />
          <button v-if="keyword" type="button" class="apt-search__clear" aria-label="清空搜索" @click="keyword = ''">
            <el-icon><Close /></el-icon>
          </button>
        </label>
      </div>

      <!-- 列表白面：有数据放预约行，没数据放空态；下面统一跟「第 X–Y 条 / 共 N 条」分页信息行 -->
      <div class="ap-list">
        <template v-if="visibleAppointments.length">
          <AppointmentCard
            v-for="item in pagedAppointments"
            :key="item.id"
            :appointment="item"
            :busy="cancelingId === item.id"
            @cancel="askCancel"
            @pay="openPayFromCard"
            @evaluate="openEvalFromCard"
          />
        </template>

        <div v-else-if="!loading" class="ui-empty">
          <template v-if="appointments.length">
            <p class="ui-empty__title">没有匹配的预约</p>
            <p class="ui-empty__desc">换个宠物名或手机号试试，也可以切回「全部」。</p>
            <button type="button" class="ui-linkbtn ap-empty-reset" @click="resetFilters">清空筛选条件</button>
          </template>
          <template v-else>
            <p class="ui-empty__title">还没有服务预约</p>
            <p class="ui-empty__desc">在上方挑一个服务项目，选好时间就能下单，支付后门店会接单。</p>
          </template>
        </div>
      </div>

      <div class="apt-pager" v-if="visibleAppointments.length">
        <span class="ui-box__count">第 {{ rangeStart }}–{{ rangeEnd }} 条 / 共 {{ visibleAppointments.length }} 条</span>
        <Pagination
          :total="visibleAppointments.length"
          v-model:page="page"
          :limit="PAGE_SIZE"
          :page-sizes="[PAGE_SIZE]"
          :background="false"
          layout="prev, pager, next"
          :auto-scroll="false"
        />
      </div>
    </section>

    <!-- 预约下单弹窗 -->
    <el-dialog v-model="bookingOpen" width="min(480px, 94vw)" align-center append-to-body class="bk-dialog"
               :close-on-click-modal="false">
      <template #header>
        <div class="bkd-head">
          <span>预约服务</span>
          <span class="bkd-sub" v-if="picked.itemName">{{ picked.itemName }}</span>
        </div>
      </template>

      <div class="bkd-body">
        <div class="bkd-picked" v-if="picked.itemName">
          <div class="bkd-picked__l">
            <b>{{ picked.itemName }}</b>
            <em>{{ typeText(picked.itemType) }}<template v-if="picked.duration"> · 约 {{ durText(picked.duration) }}</template></em>
          </div>
          <span class="bkd-picked__p">{{ Number(picked.price) > 0 ? '¥' + picked.price : '免费' }}</span>
        </div>

        <div class="bkd-field">
          <label>服务方式</label>
          <el-radio-group v-model="form.serviceMode">
            <el-radio-button value="1">到店服务</el-radio-button>
            <el-radio-button value="2">上门服务</el-radio-button>
          </el-radio-group>
          <p class="bkd-tip">{{ form.serviceMode === '2' ? '技师按地址上门，请填清楚小区/楼栋/门牌' : '按预约时间把宠物带到门店即可，无需填地址' }}</p>
        </div>

        <div class="bkd-field">
          <label>服务门店</label>
          <el-select v-model="form.storeId" placeholder="选择服务门店" style="width: 100%">
            <el-option v-for="s in storeList" :key="s.storeId" :value="s.storeId" :label="s.storeName">
              <span>{{ s.storeName }}</span>
              <span class="bkd-opt-addr">{{ [s.city, s.address].filter(Boolean).join('') }}</span>
              <span v-if="s.distance != null" class="bkd-opt-dist">距您 {{ formatDistance(s.distance) }}</span>
            </el-option>
          </el-select>
          <p class="bkd-tip" v-if="pickedStore">
            门店地址：{{ [pickedStore.city, pickedStore.address].filter(Boolean).join('') }}{{ pickedStore.businessHours ? ' · ' + pickedStore.businessHours : '' }}
            <template v-if="pickedStore.distance != null"> · 距您 {{ formatDistance(pickedStore.distance) }}</template>
          </p>
          <div class="bkd-loc" v-if="pickedStore">
            <template v-if="geoActive">
              <span class="bkd-loc__state">我的位置：{{ locName }}</span>
              <button type="button" class="bkd-loc__btn" @click="locOpen = true">更改</button>
            </template>
            <button v-else type="button" class="bkd-loc__btn" @click="locOpen = true">调整我的位置</button>
            <a v-if="pickedStore.lng != null && pickedStore.lat != null" class="bkd-loc__nav"
               :href="amapNavUrl(pickedStore, geoCoords)" target="_blank" rel="noopener">
              导航到店
            </a>
          </div>
          <p class="bkd-tip" v-else-if="!storeList.length">暂无可用门店信息</p>
        </div>

        <div class="bkd-field">
          <label>预约时间</label>
          <el-date-picker
            v-model="form.appointTime"
            type="datetime"
            placeholder="选择日期与时间"
            format="YYYY-MM-DD HH:mm"
            value-format="YYYY-MM-DD HH:mm:ss"
            :disabled-date="disablePastDate"
            style="width:100%"
          />
          <div class="bkd-slots">
            <button type="button" class="bkd-slot" v-for="s in quickSlots" :key="s.value"
                    :class="{ 'is-on': form.appointTime === s.value }" @click="form.appointTime = s.value">
              {{ s.label }}
            </button>
          </div>
        </div>

        <div class="bkd-field">
          <label>数量</label>
          <el-input-number v-model="form.qty" :min="1" :max="20" controls-position="right" />
          <span class="bkd-sum">合计 <b>¥{{ money(formTotal) }}</b></span>
        </div>

        <div class="bkd-row">
          <div class="bkd-field bkd-field--half">
            <label>联系人</label>
            <el-input v-model="form.contactName" maxlength="16" placeholder="怎么称呼你" />
          </div>
          <div class="bkd-field bkd-field--half">
            <label>联系电话</label>
            <el-input v-model="form.contactPhone" maxlength="11" inputmode="numeric" placeholder="11 位手机号"
                      :class="{ 'is-error': form.contactPhone && !phoneOk }" @input="onPhoneInput" />
            <p class="bkd-err" v-if="form.contactPhone && !phoneOk">请填写 11 位手机号（1 开头，第二位 3-9）</p>
          </div>
        </div>

        <div class="bkd-field" v-if="form.serviceMode === '2'">
          <label>上门地址</label>
          <el-input v-model="form.address" type="textarea" :rows="2" maxlength="120" show-word-limit
                    placeholder="如：XX 区 XX 路 12 号 3 栋 501" />
        </div>

        <div class="bkd-field">
          <label>备注 <em class="bkd-opt">选填</em></label>
          <el-input v-model="form.remark" maxlength="100" placeholder="宠物品种/体型、特殊要求等" />
        </div>
      </div>

      <template #footer>
        <div class="bkd-foot">
          <span class="bkd-foot__sum">应付 <b>¥{{ money(formTotal) }}</b></span>
          <div class="bkd-foot__btns">
            <button type="button" class="ui-btn ui-btn--line" :disabled="submitting" @click="bookingOpen = false">取消</button>
            <button type="button" class="ui-btn ui-btn--solid" :disabled="submitting" @click="submitBooking">
              {{ submitting ? '提交中…' : '提交并支付' }}
            </button>
          </div>
        </div>
      </template>
    </el-dialog>

    <!-- 收银台 -->
    <el-dialog v-model="cashierOpen" width="420px" align-center :show-close="!paySuccess" class="cashier-dialog"
               :close-on-click-modal="false">
      <template #header>
        <div class="cashier-head">
          <span>收银台</span>
          <span class="cashier-no" v-if="current">{{ current.serviceNo }}</span>
        </div>
      </template>

      <div class="cashier-body" v-if="!paySuccess">
        <div class="cashier-amount">
          <span class="label">支付金额</span>
          <span class="num">¥{{ money(payAmount) }}</span>
        </div>
        <p class="cashier-item" v-if="current">{{ current.itemName }} × {{ current.qty || 1 }}</p>

        <div class="pay-methods">
          <div class="pay-item" v-for="m in methods" :key="m.key" :class="{ active: payMethod === m.key }"
               @click="payMethod = m.key">
            <span class="pm-icon" :style="{ background: m.bg }"><el-icon><component :is="m.icon" /></el-icon></span>
            <div class="pm-info">
              <b>{{ m.name }}</b>
              <em>{{ m.key === 'balance' && walletBalance != null ? '可用 ¥' + money(walletBalance) : m.desc }}</em>
            </div>
            <span class="pm-check"><el-icon v-if="payMethod === m.key"><Check /></el-icon></span>
          </div>
        </div>

        <div class="balance-tip" v-if="payMethod === 'balance' && walletBalance != null">
          <template v-if="balanceShort">
            <span class="bt-text warn">余额不足：可用 ¥{{ money(walletBalance) }}，本单需 ¥{{ money(payAmount) }}</span>
            <el-button link type="warning" size="small" :loading="recharging" @click="askRecharge">去充值</el-button>
          </template>
          <span class="bt-text" v-else>可用余额 ¥{{ money(walletBalance) }}，支付后剩余 ¥{{ money(walletBalance - payAmount) }}</span>
        </div>

        <div class="cashier-tip">
          <el-icon><InfoFilled /></el-icon>
          演示环境模拟支付，点击「立即支付」即完成付款，不会产生真实扣款
        </div>

        <div class="cashier-actions">
          <button type="button" class="ui-btn ui-btn--line" :disabled="paying" @click="cashierOpen = false">暂不支付</button>
          <button type="button" class="ui-btn ui-btn--solid" :disabled="paying" @click="doPay">
            {{ paying ? '支付中…' : '立即支付' }}
          </button>
        </div>
      </div>

      <div class="cashier-success" v-else>
        <div class="s-icon"><el-icon><CircleCheckFilled /></el-icon></div>
        <h3>支付成功</h3>
        <p class="s-amount">¥{{ money(payAmount) }}</p>
        <p class="s-tip">门店会尽快接单，可在「我的服务预约」查看进度与联系方式</p>
        <button type="button" class="ui-btn ui-btn--solid" @click="cashierOpen = false">完成</button>
      </div>
    </el-dialog>

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

    <!-- 门店服务评价：打分 + 文字，下方展示其他顾客的评价 -->
    <el-dialog v-model="reviewOpen" title="门店服务评价" width="480px" append-to-body @open="loadReviews">
      <div class="rv-box">
        <div v-if="!userStore.token" class="rv-login">
          <button type="button" class="ui-linkbtn" @click="openAuth('login')">登录</button>
          后即可打分写评价
        </div>
        <div v-else class="rv-form">
          <el-rate v-model="reviewForm.score" :texts="['很不满意','不满意','一般','满意','非常满意']" show-text />
          <el-input v-model="reviewForm.content" type="textarea" :rows="3" maxlength="500" show-word-limit
            placeholder="说说我们的服务怎么样（选填）" style="margin-top:12px" />
          <el-button type="primary" size="small" :loading="reviewSubmitting" style="margin-top:10px" @click="submitReview">
            {{ myScore ? '更新我的评价' : '提交评价' }}
          </el-button>
        </div>

        <p class="rv-box__title">大家的评价<span v-if="ratingCount">（{{ ratingCount }} 条）</span></p>
        <div v-loading="reviewsLoading" class="rv-list">
          <p v-if="!reviewsLoading && !reviews.length" class="rv-empty">还没有评价，来当第一位吧～</p>
          <div v-for="rv in reviews" :key="rv.commentId" class="rv-item">
            <div class="rv-item__ava" :style="{ background: avatarBg(rv.userName) }">{{ (rv.userName || '客').charAt(0).toUpperCase() }}</div>
            <div class="rv-item__main">
              <p class="rv-item__head">
                <span class="rv-item__name" :style="{ color: nameColor(rv.userName) }">{{ rv.userName || '顾客' }}</span>
                <span class="rv-item__badge" :class="rv.userId === 1 ? 'rv-item__badge--admin' : 'rv-item__badge--lv' + lvOf(rv.userId)">{{ rv.userId === 1 ? '管理员' : 'LV' + lvOf(rv.userId) }}</span>
                <el-rate :model-value="rv.score" disabled size="small" />
              </p>
              <p class="rv-item__content">{{ rv.content }}</p>
              <p class="rv-item__foot">{{ fmtTime(rv.createTime) }}</p>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>

    <!-- 我的位置：零输入自动定位 / 商圈点选（不需要地址或经纬度） -->
    <LocationPicker v-model="locOpen" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, inject } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { InfoFilled, Check, CircleCheckFilled, StarFilled, Search, Close } from '@element-plus/icons-vue'
import { listMyAppointments, cancelPetAppointment } from '@/api/pet/petAppointment'
import { serviceRatingStat, submitServiceRating } from '@/api/pet/petServiceRating'
import { listPetComment } from '@/api/pet/petComment'
import {
  listMyServiceOrders,
  evaluateServiceOrder,
  serviceItemOptions,
  createServiceBooking,
  payServiceBooking,
  cancelServiceBooking
} from '@/api/pet/petService'
import { getMyWallet, rechargeWallet } from '@/api/pet/petWallet'
import { storeOptions } from '@/api/pet/petStore'
import { amapNavUrl, distanceMeters, formatDistance } from '@/utils/geo'
import { useGeolocation } from '@/composables/useGeolocation'
import LocationPicker from '@/components/LocationPicker.vue'
import { useUserStore } from '@/store/modules/user'
import Pagination from '@/components/Pagination/index.vue'
import AppointmentCard from './components/AppointmentCard.vue'
import { APPT_STATUS } from './appointmentStatus'
import { MOCK_APPOINTMENTS } from './mockAppointments'
import {
  TABS,
  adaptAppointment,
  countByTab,
  filterAppointments,
  sortByAppointTimeDesc
} from './appointmentModel'

const userStore = useUserStore()
const openAuth = inject('openAuth', () => {})
const loading = ref(false)

// 门店服务项目（后台「服务项目」维护，上下架实时生效）
const serviceItems = ref([])
const TYPE_TEXT = { 1: '洗护', 2: '美容', 3: '寄养', 4: '医疗', 5: '训练', 6: '接待', groom: '洗护', beauty: '美容', reception: '接待', medical: '医疗', board: '寄养', other: '其他' }
function typeText(t) { return TYPE_TEXT[t] || t || '服务' }
// 时长可读化：满 1 小时按小时显示（1440 分钟 → 24 小时 / 90 分钟 → 1.5 小时）
function durText(m) {
  const n = Number(m) || 0
  if (n >= 60) {
    const h = n / 60
    return (Number.isInteger(h) ? h : h.toFixed(1)) + ' 小时'
  }
  return n + ' 分钟'
}
function money(v) { return Number(v || 0).toFixed(2) }

async function loadServiceItems() {
  try {
    const res = await serviceItemOptions()
    serviceItems.value = res.data || []
  } catch (e) { /* 接口不可用时不摆空壳 */ }
}

// ---------------- 独立预约下单 ----------------
const bookingOpen = ref(false)
const submitting = ref(false)
const picked = reactive({ itemId: null, itemName: '', itemType: '', price: 0, duration: 0 })
const form = reactive({
  serviceMode: '1',
  storeId: null,
  appointTime: '',
  qty: 1,
  contactName: '',
  contactPhone: '',
  address: '',
  remark: ''
})
const formTotal = computed(() => (Number(picked.price) || 0) * (Number(form.qty) || 1))

// 服务门店（来自后台「门店管理」，只列营业中的门店）
const rawStores = ref([])
const pickedStore = computed(() => storeList.value.find((s) => s.storeId === form.storeId))
// 顾客定位：解构到顶层，模板才会自动解包
const geo = useGeolocation()
const { coords: geoCoords, active: geoActive, savedSpotName: locName } = geo
const locOpen = ref(false)

// 门店 + 距离：定位变化（顾客走动/换地标）时自动重算并重排
const storeList = computed(() => {
  const me = geoCoords.value
  const list = rawStores.value.map((s) => ({
    ...s,
    distance: me && s.lng != null && s.lat != null
      ? distanceMeters(me.lat, me.lng, Number(s.lat), Number(s.lng))
      : null
  }))
  return list.sort((a, b) => {
    if (a.distance == null && b.distance == null) return 0
    if (a.distance == null) return 1
    if (b.distance == null) return -1
    return a.distance - b.distance
  })
})

async function loadStores() {
  try {
    const res = await storeOptions()
    rawStores.value = res.data || []
    if (!form.storeId && storeList.value.length) form.storeId = storeList.value[0].storeId
  } catch (e) { /* 门店接口不可用时保留手填流程 */ }
}

// 首次定位成功后自动切到最近门店（顾客还没手动选过时）
watch(geoCoords, (v) => {
  if (v && storeList.value.length) form.storeId = storeList.value[0].storeId
})

// 手机号严格校验：只允许数字输入，且必须是 11 位大陆手机号（1 开头，第二位 3-9）
const phoneOk = computed(() => /^1[3-9]\d{9}$/.test(String(form.contactPhone || '').trim()))
function onPhoneInput(v) {
  const cleaned = String(v || '').replace(/[^\d]/g, '').slice(0, 11)
  if (cleaned !== v) form.contactPhone = cleaned
}

// 快捷时段：今天/明天的常见档期，点了直接填进时间框
const quickSlots = computed(() => {
  const now = new Date()
  const build = (dayOffset, hh, mm) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, hh, mm, 0)
    if (d.getTime() < now.getTime()) return null
    const p = (n) => String(n).padStart(2, '0')
    const value = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(hh)}:${p(mm)}:00`
    return { value, label: (dayOffset === 0 ? '今天 ' : '明天 ') + p(hh) + ':' + p(mm) }
  }
  return [build(0, 10, 0), build(0, 14, 0), build(0, 19, 0), build(1, 10, 0), build(1, 14, 0)].filter(Boolean)
})

function disablePastDate(d) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return d.getTime() < today.getTime()
}

function openBooking(it) {
  if (!userStore.token) {
    ElMessage.info('登录后即可自助预约')
    openAuth('login')
    return
  }
  picked.itemId = it.itemId
  picked.itemName = it.itemName
  picked.itemType = it.itemType
  picked.price = Number(it.price) || 0
  picked.duration = it.duration
  form.serviceMode = '1'
  if (storeList.value.length && !form.storeId) form.storeId = storeList.value[0].storeId
  form.appointTime = quickSlots.value[0] ? quickSlots.value[0].value : ''
  form.qty = 1
  form.contactName = userStore.nickName || userStore.name || ''
  form.contactPhone = ''
  form.address = ''
  form.remark = ''
  bookingOpen.value = true
}

function validateBooking() {
  if (!form.storeId) { ElMessage.warning('请选择服务门店'); return false }
  if (!form.appointTime) { ElMessage.warning('请选择预约时间'); return false }
  if (!form.contactName.trim()) { ElMessage.warning('请填写联系人'); return false }
  if (!phoneOk.value) { ElMessage.warning('请填写正确的手机号：11 位数字，1 开头，第二位为 3-9'); return false }
  if (form.serviceMode === '2' && form.address.trim().length < 6) { ElMessage.warning('上门服务请填写详细地址'); return false }
  if (new Date(form.appointTime.replace(/-/g, '/')).getTime() < Date.now() - 60000) {
    ElMessage.warning('预约时间不能早于当前时间')
    return false
  }
  return true
}

async function submitBooking() {
  if (!validateBooking()) return
  submitting.value = true
  try {
    const res = await createServiceBooking({
      itemId: picked.itemId,
      storeId: form.storeId,
      serviceMode: form.serviceMode,
      appointTime: form.appointTime,
      qty: form.qty,
      contactName: form.contactName.trim(),
      contactPhone: form.contactPhone.trim(),
      address: form.serviceMode === '2' ? form.address.trim() : '',
      remark: form.remark.trim()
    })
    const order = res.data || {}
    bookingOpen.value = false
    // 免费项目（如到店看宠接待）不用摆收银台，直接确认
    if (amountOf(order) <= 0) {
      try {
        await payServiceBooking(order.serviceNo, 'free')
        ElMessage.success('预约已提交（免费项目，无需支付）')
      } catch (e) {
        ElMessage.warning(e?.msg || '预约已创建，请在列表中查看')
      }
      await loadAppointments()
      return
    }
    ElMessage.success('预约已创建，请完成支付')
    await loadAppointments()
    openPay(order)
  } catch (e) {
    ElMessage.error(e?.msg || e?.message || '预约提交失败')
  } finally {
    submitting.value = false
  }
}

// ---------------- 我的预约列表 ----------------
/**
 * 数据源开关：true 用本地 mock（新旧来源已合并），false 走真实接口。
 * 真实接口模式下两个来源仍合并进同一个列表，只是不再单独占用一个模块。
 */
const USE_MOCK_DATA = true
const PAGE_SIZE = 6

const appointments = ref([])
const tab = ref(TABS[0].key)
const keyword = ref('')
const page = ref(1)
const cancelingId = ref(null)

// 过滤 → 分页都用 computed：数据或筛选条件一变就重算，页面不再手动调用刷新
const visibleAppointments = computed(() => filterAppointments(appointments.value, tab.value, keyword.value))
const pagedAppointments = computed(() =>
  visibleAppointments.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE)
)
const rangeStart = computed(() => (visibleAppointments.value.length ? (page.value - 1) * PAGE_SIZE + 1 : 0))
const rangeEnd = computed(() => Math.min(page.value * PAGE_SIZE, visibleAppointments.value.length))

function tabCount(key) {
  return countByTab(appointments.value, key)
}

// 换 Tab / 改搜索词都回到第一页，否则会停在空页
watch([tab, keyword], () => { page.value = 1 })
watch(() => visibleAppointments.value.length, (len) => {
  const maxPage = Math.max(1, Math.ceil(len / PAGE_SIZE))
  if (page.value > maxPage) page.value = maxPage
})

function resetFilters() {
  tab.value = TABS[0].key
  keyword.value = ''
  page.value = 1
}

function amountOf(o) {
  const total = Number(o.totalAmount)
  if (total > 0) return total
  return (Number(o.price) || 0) * (Number(o.qty) || 1)
}

async function loadAppointments() {
  if (USE_MOCK_DATA) {
    // mock 单没有真实服务端可支付，隐藏「去支付」避免点了必然失败
    appointments.value = sortByAppointTimeDesc(
      MOCK_APPOINTMENTS.map((raw, index) => adaptAppointment(raw, index))
    ).map((item) => ({ ...item, canPay: false }))
    return
  }

  if (!userStore.token) { appointments.value = []; return }

  // 两个接口互不依赖：任一失败不影响另一个来源的展示
  const [orderResult, legacyResult] = await Promise.allSettled([listMyServiceOrders(), listMyAppointments()])
  const orders = orderResult.status === 'fulfilled' ? orderResult.value.data || [] : []
  const legacy = legacyResult.status === 'fulfilled' ? legacyResult.value.data || [] : []

  appointments.value = sortByAppointTimeDesc([
    ...orders.map((raw, index) => adaptAppointment({ ...raw, source: 'ORDER' }, index)),
    ...legacy.map((raw, index) => adaptAppointment({ ...raw, source: 'LEGACY' }, index))
  ])
}

/** 卡片上的取消入口：window.confirm 二次确认，取消成功后只改本地状态，列表不整页刷新 */
async function askCancel(item) {
  const confirmed = window.confirm(`确认取消「${item.serviceName}」的预约吗？取消后不可恢复。`)
  if (!confirmed) return

  cancelingId.value = item.id
  try {
    if (USE_MOCK_DATA) {
      item.status = APPT_STATUS.CANCELED
      item.canCancel = false
      item.canPay = false
      ElMessage.success('预约已取消')
    } else {
      const res = item.source === 'LEGACY'
        ? await cancelPetAppointment(item.raw.appointmentId, '')
        : await cancelServiceBooking(item.raw.serviceId, '')
      ElMessage.success(res?.msg || '预约已取消')
      await loadAppointments()
    }
  } catch (e) {
    ElMessage.error(e?.msg || e?.message || '取消失败')
  } finally {
    cancelingId.value = null
  }
}

// 卡片只负责抛事件，支付/评价仍复用原有弹窗与接口
function openPayFromCard(item) { openPay(item.raw) }
function openEvalFromCard(item) { openEval(item.raw) }

// ---------------- 收银台 ----------------
const cashierOpen = ref(false)
const paySuccess = ref(false)
const paying = ref(false)
const payMethod = ref('alipay')
const current = ref(null)
const walletBalance = ref(null)
const recharging = ref(false)
const methods = [
  { key: 'alipay', icon: 'Money', name: '支付宝', desc: '推荐使用，秒到账', bg: 'linear-gradient(135deg,#1677ff,#69b1ff)' },
  { key: 'wechat', icon: 'ChatDotRound', name: '微信支付', desc: '微信快捷支付', bg: 'linear-gradient(135deg,#07c160,#5bd98a)' },
  { key: 'balance', icon: 'Wallet', name: '平台余额', desc: '演示专用通道', bg: 'var(--grad-brand)' }
]
const payAmount = computed(() => (current.value ? amountOf(current.value) : 0))
const balanceShort = computed(() => walletBalance.value != null && walletBalance.value + 1e-9 < payAmount.value)

async function loadWallet() {
  if (!userStore.token) return
  try {
    const res = await getMyWallet()
    walletBalance.value = Number(res.data?.balance ?? res.data ?? 0)
  } catch (e) { walletBalance.value = null }
}

function openPay(o) {
  current.value = o
  paySuccess.value = false
  payMethod.value = 'alipay'
  cashierOpen.value = true
  loadWallet()
}

async function doPay() {
  if (!current.value) return
  if (payMethod.value === 'balance' && balanceShort.value) {
    ElMessage.warning('余额不足，请先充值或更换支付方式')
    return
  }
  paying.value = true
  try {
    const res = await payServiceBooking(current.value.serviceNo, payMethod.value)
    const d = res.data || {}
    if (d.balance != null) walletBalance.value = Number(d.balance)
    paySuccess.value = true
    await loadAppointments()
    // 支付成功后同步刷新顶栏消息
    window.dispatchEvent(new CustomEvent('pet-notify-refresh'))
  } catch (e) {
    ElMessage.error(e?.msg || e?.message || '支付失败')
  } finally {
    paying.value = false
  }
}

async function askRecharge() {
  try {
    const { value } = await ElMessageBox.prompt('输入充值金额（演示环境，立即到账）', '充值平台余额', {
      confirmButtonText: '确认充值',
      cancelButtonText: '取消',
      inputValue: '100',
      inputPattern: /^\d+(\.\d{1,2})?$/,
      inputErrorMessage: '请输入正确的金额'
    })
    recharging.value = true
    const res = await rechargeWallet(Number(value))
    walletBalance.value = Number(res.data?.balance ?? res.data ?? 0)
    ElMessage.success('充值成功，当前余额 ¥' + money(walletBalance.value))
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e?.msg || e?.message || '充值失败')
  } finally {
    recharging.value = false
  }
}

// ---------------- 评价 ----------------
const evalOpen = ref(false)
const evalRow = ref({})
const evalSubmitting = ref(false)
const evalForm = reactive({ score: 5, comment: '' })

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
      return loadAppointments()
    })
    .catch((e) => ElMessage.error(e?.msg || e?.message || '评价失败'))
    .finally(() => { evalSubmitting.value = false })
}

// ---------------- 通用格式化 ----------------
// 评价列表等处仍在用（只展示到「月-日 时:分」）
function fmtTime(v) {
  if (!v) return '—'
  return String(v).replace('T', ' ').slice(5, 16)
}

onMounted(async () => {
  // 游客只加载价目区，避免 401 弹「登录已过期」
  loadServiceItems()
  loadStores()
  loadServiceRating()
  // mock 模式不依赖登录态，方便未登录时也能验收列表与筛选
  if (!USE_MOCK_DATA && !userStore.token) return
  loading.value = true
  try {
    await loadAppointments()
  } finally {
    loading.value = false
  }
})

/* 头部服务评分：顾客自己点星打分 + 评价弹窗（游客可看，打分需登录） */
const ratingLoaded = ref(false)
const myScore = ref(0)
const hoverStar = ref(0)
const ratingSubmitting = ref(false)
const ratingCount = ref(0)
const mineContent = ref('')

async function loadServiceRating() {
  try {
    const res = await serviceRatingStat()
    myScore.value = Number(res.data?.mine?.score) || 0
    mineContent.value = res.data?.mine?.content || ''
    ratingCount.value = Number(res.data?.count) || 0
  } catch (e) {
    myScore.value = 0
    mineContent.value = ''
    ratingCount.value = 0
  } finally {
    ratingLoaded.value = true
  }
}

async function rateService(score) {
  if (!userStore.token) {
    ElMessage.warning('登录后即可为本店服务打分')
    openAuth('login')
    return
  }
  if (ratingSubmitting.value) return
  ratingSubmitting.value = true
  hoverStar.value = 0
  try {
    const res = await submitServiceRating({ score, content: '' })
    myScore.value = score
    ratingCount.value = Number(res.data?.count) || ratingCount.value
    ElMessage.success('感谢您的评价，可点「写评价」补充文字')
  } catch (e) {
    // 错误提示由 request 统一弹出
  } finally {
    ratingSubmitting.value = false
  }
}

/* 评价弹窗：打分 + 文字 + 评价列表 */
const reviewOpen = ref(false)
const reviewForm = reactive({ score: 0, content: '' })
const reviewSubmitting = ref(false)
const reviews = ref([])
const reviewsLoading = ref(false)

function openReviewDialog() {
  reviewForm.score = myScore.value || 0
  // 已有文字评价时回填，改起来顺手（占位文案不回填）
  reviewForm.content = mineContent.value === '该顾客未填写文字评价' ? '' : mineContent.value
  reviewOpen.value = true
}
async function loadReviews() {
  reviewsLoading.value = true
  try {
    const res = await listPetComment({ petId: 0, targetType: 'service', pageNum: 1, pageSize: 20 })
    reviews.value = res.rows || []
  } catch (e) {
    reviews.value = []
  } finally {
    reviewsLoading.value = false
  }
}
async function submitReview() {
  if (!reviewForm.score) {
    ElMessage.warning('请先选择星级')
    return
  }
  reviewSubmitting.value = true
  try {
    const res = await submitServiceRating({ score: reviewForm.score, content: reviewForm.content.trim() })
    myScore.value = reviewForm.score
    mineContent.value = reviewForm.content.trim() || '该顾客未填写文字评价'
    ratingCount.value = Number(res.data?.count) || ratingCount.value
    ElMessage.success('感谢您的评价')
    reviewOpen.value = false
    loadReviews()
  } catch (e) {
    // 错误提示由 request 统一弹出
  } finally {
    reviewSubmitting.value = false
  }
}
function avatarBg(name) {
  const palette = ['#0e7a4a', '#b45309', '#64748b', '#a8542b', '#4f6df5', '#0e7490']
  let h = 0
  const s = String(name || '客')
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return palette[h % palette.length]
}
// B 站风：昵称按名字稳定取色 + 等级徽章（演示装饰，按 userId 稳定分级）
const RV_NAME_COLORS = ['#fb7299', '#00a1d6', '#ff7f24', '#6bc46d', '#c08bff']
function nameColor(name) {
  let h = 0
  const s = String(name || '')
  for (let i = 0; i < s.length; i++) h = (h * 131 + s.charCodeAt(i)) % 99991
  return RV_NAME_COLORS[h % RV_NAME_COLORS.length]
}
function lvOf(userId) {
  const n = Number(userId)
  if (!n || n <= 0) return 2
  return 2 + (n % 5)
}
</script>

<style scoped lang="scss">
/* 头部服务评分：可点击的五星 */
.as-rate {
  display: flex;
  align-items: center;
  gap: 8px;
  &__label {
    font-size: var(--fs-3);
    font-weight: 600;
    color: var(--text-2);
    white-space: nowrap;
  }
  &__stars {
    display: flex;
    align-items: center;
    gap: 2px;
  }
  &__star {
    display: inline-flex;
    padding: 2px;
    border: 0;
    background: none;
    color: var(--text-4);
    font-size: 22px;
    line-height: 1;
    cursor: pointer;
    transition: color .12s, transform .12s;
    &:hover:not(:disabled) { transform: scale(1.12); }
    &:disabled { cursor: progress; }
    &.is-on { color: #e6a23c; }
    &.is-mine { filter: drop-shadow(0 1px 2px rgba(230, 162, 60, .3)); }
  }
  &__link {
    border: 0;
    background: none;
    padding: 0;
    font-size: var(--fs-2);
    color: var(--brand-700);
    white-space: nowrap;
    cursor: pointer;
    &:hover { text-decoration: underline; }
  }
}
@media (max-width: 768px) {
  .as-rate {
    gap: 6px;
    &__star { font-size: 20px; }
    &__hint { font-size: var(--fs-1); }
  }
}
.apt-note {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 2px;
  margin: 22px 0 0;
  padding: 2px 0 2px 12px;
  border-left: 2px solid var(--brand-300);
  font-size: 13.5px;
  color: var(--text-2);
}

/* 门店服务项目价目区 */
.svc-price { margin-top: 26px; }
.svc-price__title { margin: 0 0 12px; font-size: 15px; font-weight: 700; color: var(--text-1); }
.svc-price__grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(min(240px, 100%), 1fr)); gap: 12px;
}
.svc-item {
  border: 1px solid var(--border-1); border-radius: var(--radius-md); background: var(--bg-card);
  padding: 12px 14px; display: flex; flex-direction: column; gap: 6px;
}
.svc-item__head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.svc-item__name { font-weight: 600; font-size: 13.5px; color: var(--text-1); }
.svc-item__type { flex-shrink: 0; font-size: 11px; color: var(--brand-700); background: var(--brand-50); border-radius: 999px; padding: 1px 8px; }
.svc-item__desc { margin: 0; font-size: 12px; color: var(--text-3); line-height: 1.5; }
.svc-item__foot { display: flex; align-items: center; gap: 10px; margin-top: 2px; }
.svc-item__price { font-weight: 700; color: var(--brand-700); }
.svc-item__dur { font-size: 12px; color: var(--text-3); }
/* 「立即预约」：按钮化，带 hover / focus 反馈 */
.svc-item__cta {
  margin-left: auto;
  flex-shrink: 0;
  padding: 4px 12px;
  border: 1px solid var(--brand-200);
  border-radius: var(--radius-pill);
  background: var(--brand-50);
  color: var(--brand-700);
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.5;
  cursor: pointer;
  transition: background .15s ease, border-color .15s ease, color .15s ease, transform .1s ease;

  &:hover {
    background: var(--brand-600);
    border-color: var(--brand-600);
    color: #fff;
  }

  &:active { transform: translateY(1px); }

  &:focus-visible {
    outline: 2px solid var(--brand-500);
    outline-offset: 2px;
  }
}

/* 我的预约 */
/* 页面不再参与拉伸（对齐「全部」Tab 的自然收口）：
   内容多高页面就多高，视口更高时由布局骨架的 min-height 把页脚压到屏幕底 */
.apt-page {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  /* 底部间距交给列表卡/分页行自己的 margin，页面不再额外垫内边距 */
  padding-bottom: 0;
}
.apt-body {
  margin-top: 26px;
  flex: 0 1 auto;
  display: flex;
  flex-direction: column;
}
.apt-sec, .apt-tools { flex: 0 0 auto; }
.apt-sec { display: flex; align-items: baseline; gap: 10px; margin-bottom: 12px; }
.apt-sec__title { margin: 0; font-size: 15px; font-weight: 700; color: var(--text-1); }
.apt-sec__hint { font-size: 12px; color: var(--text-3); }

/* 筛选工具条：分段 Tab + 搜索框 */
.apt-tools {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--sp-3);
  margin-bottom: var(--sp-3);
}

.apt-tabs {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border: 1px solid var(--border-1);
  border-radius: var(--radius-pill);
  background: var(--bg-sunken);
}

.apt-tab {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  border: 0;
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--text-2);
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: background .15s ease, color .15s ease;

  em {
    font-style: normal;
    font-size: 11px;
    font-variant-numeric: tabular-nums;
    color: var(--text-3);
  }

  &:hover { color: var(--brand-700); }

  &.is-on {
    background: var(--bg-card);
    color: var(--brand-700);
    font-weight: 600;
    box-shadow: 0 1px 2px rgb(22 33 29 / .08);

    em { color: var(--brand-500); }
  }

  &:focus-visible {
    outline: 2px solid var(--brand-500);
    outline-offset: 1px;
  }
}

.apt-search {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  width: 250px;
  max-width: 100%;
  height: 32px;
  padding: 0 10px;
  border: 1px solid var(--border-1);
  border-radius: var(--radius-pill);
  background: var(--bg-card);
  transition: border-color .15s ease, box-shadow .15s ease;

  &:focus-within {
    border-color: var(--brand-400);
    box-shadow: 0 0 0 3px rgb(var(--brand-600-rgb) / .08);
  }

  &__icon {
    flex-shrink: 0;
    font-size: 14px;
    color: var(--text-4);
  }

  &__input {
    flex: 1;
    min-width: 0;
    height: 100%;
    border: 0;
    background: none;
    outline: none;
    font-family: inherit;
    font-size: 13px;
    color: var(--text-1);

    &::placeholder { color: var(--text-4); }
    &::-webkit-search-cancel-button { display: none; }
  }

  &__clear {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    border: 0;
    border-radius: 50%;
    background: var(--bg-sunken);
    color: var(--text-3);
    font-size: 11px;
    cursor: pointer;

    &:hover { background: var(--border-1); color: var(--text-1); }
  }
}

/* 列表容器：一张白卡（口径对齐「我的订单」页的行式列表），行与行之间用分隔线。
   高度统一：分页固定每页 6 行（PAGE_SIZE），卡片按「一页 6 行」的实际高度预留 min-height，
   行数不足时由卡内空白补位 —— 切 Tab / 翻页时页面总高度恒定，不再随数据量缩短 */
.ap-list {
  flex: 0 1 auto;
  margin-bottom: var(--sp-4);
  min-height: 672px; /* = 每页 6 行的真实高度（行高约 112px），PAGE_SIZE 变了要同步调 */
  display: flex;
  flex-direction: column;
  gap: 0;
  background: var(--bg-card);
  border: var(--rule);
  border-radius: var(--radius-md);
  overflow: hidden;
}
.ap-empty-reset { margin-top: var(--sp-2); }
/* 空态在白卡内部，不再自带卡片描边（面由 .ap-list 提供），保底高度交给 .ui-empty 自己的 min-height */
.ap-list .ui-empty { flex: 0 0 auto; }

.apt-pager { flex: 0 0 auto; display: flex; align-items: center; justify-content: space-between; margin-top: 0; margin-bottom: var(--sp-4); }

/* 下单弹窗 */
.bkd-head { display: flex; align-items: baseline; gap: 10px; font-size: 16px; font-weight: 600; color: var(--text-1); }
.bkd-sub { font-size: 12px; font-weight: 400; color: var(--text-3); }
.bkd-body { display: flex; flex-direction: column; gap: 14px; }
.bkd-picked {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 10px 12px; border-radius: var(--radius-md); background: var(--brand-50);
  b { display: block; font-size: 14px; color: var(--text-1); }
  em { font-style: normal; font-size: 12px; color: var(--text-3); }
}
.bkd-picked__p { font-size: 16px; font-weight: 700; color: var(--brand-700); }
.bkd-field { display: flex; flex-direction: column; gap: 6px;
  label { font-size: 12.5px; color: var(--text-2); font-weight: 600; }
}
.bkd-row { display: flex; gap: 12px; }
.bkd-field--half { flex: 1; min-width: 0; }
.bkd-opt { font-style: normal; font-weight: 400; color: var(--text-4); margin-left: 4px; }
.bkd-opt-addr { float: right; font-size: 11px; color: var(--text-4); max-width: 55%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bkd-opt-dist { margin-left: 8px; padding: 0 6px; border-radius: var(--radius-pill); background: var(--brand-50); color: var(--brand-700); font-size: 11px; font-weight: 700; }
/* 门店定位条：定位/换地标/一键导航到店 */
.bkd-loc { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 6px; }
.bkd-loc__btn {
  height: 26px; padding: 0 10px; border-radius: var(--radius-pill);
  border: 1px solid var(--brand-200); background: var(--brand-50); color: var(--brand-700);
  font-family: inherit; font-size: 12px; font-weight: 600; cursor: pointer;
  &:hover { border-color: var(--brand-300); }
}
.bkd-loc__state { font-size: 12px; color: var(--text-3); }
.bkd-loc__sel { width: 132px; }
.bkd-loc__nav {
  margin-left: auto; font-size: 12px; font-weight: 700; color: var(--brand-700);
  text-decoration: none; padding: 3px 9px; border-radius: var(--radius-pill);
  border: 1px solid var(--brand-200); background: var(--bg-card);
  &:hover { border-color: var(--brand-300); }
}
.bkd-tip { margin: 0; font-size: 12px; color: var(--text-3); }
.bkd-err { margin: 0; font-size: 12px; color: #d92d20; }
.bkd-field .is-error :deep(.el-input__wrapper) { box-shadow: 0 0 0 1px #d92d20 inset; }
.bkd-slots { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 2px; }
.bkd-slot {
  border: 1px solid var(--border-1); background: var(--bg-card); border-radius: 999px;
  padding: 3px 12px; font-size: 12px; color: var(--text-2); cursor: pointer;
}
.bkd-slot.is-on { border-color: var(--brand-500, #6366f1); color: var(--brand-700); background: var(--brand-50); }
.bkd-sum { font-size: 12.5px; color: var(--text-3); margin-top: 4px;
  b { color: var(--brand-700); font-size: 15px; } }
.bkd-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.bkd-foot__sum { font-size: 13px; color: var(--text-2);
  b { font-size: 18px; color: var(--brand-700); } }
.bkd-foot__btns { display: flex; gap: 10px; }

/* 收银台 */
.cashier-head { display: flex; align-items: baseline; gap: 10px;
  .cashier-no { font-size: 12px; color: var(--text-3); } }
.cashier-body { display: flex; flex-direction: column; gap: 14px; }
.cashier-amount { display: flex; align-items: baseline; justify-content: space-between;
  .label { font-size: 13px; color: var(--text-3); }
  .num { font-size: 26px; font-weight: 700; color: var(--text-1); }
}
.cashier-item { margin: -8px 0 0; font-size: 12.5px; color: var(--text-3); }
.pay-methods { display: flex; flex-direction: column; gap: 8px; }
.pay-item {
  display: flex; align-items: center; gap: 12px; padding: 10px 12px;
  border: 1px solid var(--border-1); border-radius: var(--radius-md); cursor: pointer;
}
.pay-item.active { border-color: var(--brand-500, #6366f1); background: var(--brand-50); }
.pm-icon { width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; }
.pm-info { flex: 1; min-width: 0; display: flex; flex-direction: column;
  b { font-size: 13.5px; color: var(--text-1); }
  em { font-style: normal; font-size: 11.5px; color: var(--text-3); }
}
.pm-check { color: var(--brand-600, #4f46e5); }
.balance-tip { display: flex; align-items: center; justify-content: space-between; gap: 8px;
  font-size: 12.5px; color: var(--text-3);
  .warn { color: var(--danger-600, #dc2626); }
}
.cashier-tip { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-4); }
.cashier-actions { display: flex; justify-content: flex-end; gap: 10px; }
.cashier-success { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 8px 0 4px;
  .s-icon { font-size: 44px; color: var(--success-600, #16a34a); }
  h3 { margin: 0; font-size: 17px; color: var(--text-1); }
  .s-amount { margin: 0; font-size: 22px; font-weight: 700; color: var(--text-1); }
  .s-tip { margin: 0 0 10px; font-size: 12.5px; color: var(--text-3); text-align: center; }
}

.eval-box {
  .eval-title { margin: 0 0 12px; font-size: 15px; font-weight: 600; color: var(--text-1); }
}

/* 门店服务评价弹窗 */
.rv-box {
  &__title {
    margin: 18px 0 10px;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-1);
    border-top: 1px dashed var(--border-1);
    padding-top: 14px;
  }
}
.rv-login {
  font-size: 13.5px;
  color: var(--text-3);
}
.rv-list { min-height: 80px; max-height: 320px; overflow: auto; }
.rv-empty { margin: 20px 0; text-align: center; font-size: 13px; color: var(--text-3); }
.rv-item {
  display: flex;
  gap: 10px;
  padding: 10px 0;
  & + & { border-top: 1px solid var(--border-2); }
  &__ava {
    flex: 0 0 36px;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    color: #fff;
    font-weight: 700;
    font-size: 15px;
  }
  &__main { flex: 1; min-width: 0; }
  &__head {
    margin: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  &__name { font-size: 13.5px; font-weight: 600; }
  &__badge {
    font-size: 10.5px;
    font-weight: 700;
    line-height: 1;
    padding: 3px 5px;
    border-radius: 4px;
    color: #fff;
    letter-spacing: .3px;
    &--lv2 { background: #98c6a2; }
    &--admin { background: linear-gradient(135deg, #ff5c7c, #fb7299); }
    &--lv3 { background: #58b3c9; }
    &--lv4 { background: #f0a450; }
    &--lv5 { background: linear-gradient(135deg, #ff6b6b, #fb7299); }
    &--lv6 { background: linear-gradient(135deg, #ff2e63, #ff6b6b); }
  }
  &__foot { margin: 4px 0 0; font-size: 12px; color: var(--text-3); }
  &__content {
    margin: 4px 0 0;
    font-size: 13.5px;
    color: var(--text-2);
    line-height: 1.55;
    word-break: break-word;
  }
}

@media (max-width: 768px) {
  .svc-price__grid { grid-template-columns: 1fr; }
  .apt-tools { flex-direction: column; align-items: stretch; }
  .apt-tabs { align-self: flex-start; max-width: 100%; overflow-x: auto; }
  .apt-search { width: 100%; }
  .apt-pager { flex-direction: column; gap: 8px; }
  .bkd-row { flex-direction: column; }
  /* 手机端行会换行变高，按 6 行的实际最大高度预留，保证各 Tab 高度也一致 */
  .ap-list { min-height: 810px; }
}
</style>
