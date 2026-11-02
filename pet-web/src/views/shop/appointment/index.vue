<template>
  <div class="ui-page ui-page--md">
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
            <button type="button" class="ui-linkbtn" @click="openBooking(it)">立即预约</button>
          </div>
        </div>
      </div>
    </section>

    <!-- 我的服务预约（独立下单、独立结算） -->
    <section class="apt-body" v-loading="loading">
      <div class="apt-sec">
        <h3 class="apt-sec__title">我的服务预约</h3>
        <span class="apt-sec__hint" v-if="unpaidCount">{{ unpaidCount }} 笔待支付</span>
      </div>

      <div v-if="orders.length" class="bk-list">
        <article class="bk-card" v-for="o in pagedOrders" :key="o.serviceId">
          <div class="bk-card__main">
            <div class="bk-card__head">
              <span class="bk-name">
                {{ o.itemName || '服务项目' }}
                <em v-if="Number(o.qty) > 1">×{{ o.qty }}</em>
              </span>
              <span class="ui-chip" :class="orderChip(o)">{{ orderStatusText(o) }}</span>
            </div>

            <div class="bk-meta">
              <span class="bk-meta__i" v-if="o.storeName"><el-icon><OfficeBuilding /></el-icon>{{ o.storeName }}</span>
              <span class="bk-meta__i"><el-icon><Timer /></el-icon>{{ fmtTime(o.appointTime) }}</span>
              <span class="bk-meta__i"><el-icon><Van /></el-icon>{{ modeText(o.serviceMode) }}</span>
              <span class="bk-meta__i"><el-icon><User /></el-icon>{{ o.contactName || '—' }} {{ o.contactPhone }}</span>
              <span class="bk-meta__i bk-meta__addr" v-if="o.address" :title="o.address">
                <el-icon><Location /></el-icon>{{ o.address }}
              </span>
            </div>

            <div class="bk-sub">
              <span class="bk-no">单号 {{ o.serviceNo }}</span>
              <span v-if="o.staffName">执行 · {{ o.staffName }}</span>
              <span v-if="o.remark" class="bk-remark" :title="o.remark">备注：{{ o.remark }}</span>
              <span class="bk-score" v-if="o.score">已评 {{ o.score }} 分</span>
            </div>
          </div>

          <div class="bk-card__end">
            <span class="bk-amount">¥{{ money(amountOf(o)) }}</span>
            <span class="bk-paytag" :class="{ 'bk-paytag--ok': o.payStatus === '1' }">
              {{ payTag(o) }}
            </span>
            <div class="bk-acts">
              <button v-if="canPay(o)" type="button" class="ui-btn ui-btn--solid bk-btn" @click="openPay(o)">去支付</button>
              <button v-if="canCancelOrder(o)" type="button" class="ui-linkbtn ui-linkbtn--danger" @click="cancelOrder(o)">取消预约</button>
              <button v-if="o.status === '3' && !o.score" type="button" class="ui-linkbtn" @click="openEval(o)">评价服务</button>
            </div>
          </div>
        </article>
      </div>

      <div v-else-if="!loading" class="ui-empty">
        <p class="ui-empty__title">还没有服务预约</p>
        <p class="ui-empty__desc">在上方挑一个服务项目，选好时间就能下单，支付后门店会接单。</p>
      </div>

      <div class="apt-pager" v-if="orders.length > PAGE_SIZE">
        <span class="ui-box__count">第 {{ rangeStart }}–{{ rangeEnd }} 条 / 共 {{ orders.length }} 条</span>
        <Pagination
          :total="orders.length"
          v-model:page="page"
          :limit="PAGE_SIZE"
          :page-sizes="[PAGE_SIZE]"
          :background="false"
          layout="prev, pager, next"
          :auto-scroll="false"
        />
      </div>
    </section>

    <!-- 历史：绑定宠物的旧版预约记录，只做查看与取消 -->
    <section class="apt-legacy" v-if="list.length">
      <div class="apt-sec">
        <h3 class="apt-sec__title">宠物档案预约记录</h3>
        <span class="apt-sec__hint">旧版按宠物提交的预约，可在门店工单里同步进度</span>
      </div>
      <ul class="lg-list">
        <li v-for="item in list" :key="item.appointmentId" class="lg-row">
          <span class="lg-pet">{{ item.petName || '原宠物已下架' }}</span>
          <span class="ui-chip" :class="statusClass(item.status)">{{ statusText(item.status) }}</span>
          <span class="lg-time">{{ fmtTime(item.appointmentDate) }}</span>
          <span class="lg-phone">{{ item.contactPhone }}</span>
          <button
            v-if="canCancel(item.status)"
            type="button"
            class="ui-linkbtn ui-linkbtn--danger lg-act"
            :disabled="cancelingId === item.appointmentId"
            @click="cancelApt(item)"
          >{{ cancelingId === item.appointmentId ? '取消中…' : '取消预约' }}</button>
        </li>
      </ul>
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
            <button v-if="!geoActive" type="button" class="bkd-loc__btn" @click="startLocate()">定位</button>
            <span v-else class="bkd-loc__state">
              {{ geoStatus === 'manual' ? '我的位置：' + (geoCoords && geoCoords.label) : '已定位' }}
            </span>
            <el-select v-model="spotKey" size="small" class="bkd-loc__sel" placeholder="或选择我的位置" clearable>
              <el-option v-for="sp in CHONGQING_SPOTS" :key="sp.key" :label="sp.name" :value="sp.key" />
            </el-select>
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
                <span class="rv-item__name">{{ rv.userName || '顾客' }}</span>
                <el-rate :model-value="rv.score" disabled size="small" />
                <span class="rv-item__time">{{ fmtTime(rv.createTime) }}</span>
              </p>
              <p class="rv-item__content">{{ rv.content }}</p>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, inject } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Timer, Van, User, Location, InfoFilled, Check, CircleCheckFilled, OfficeBuilding, StarFilled } from '@element-plus/icons-vue'
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
import { CHONGQING_SPOTS, amapNavUrl, distanceMeters, formatDistance } from '@/utils/geo'
import { useGeolocation } from '@/composables/useGeolocation'
import { useUserStore } from '@/store/modules/user'
import Pagination from '@/components/Pagination/index.vue'

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
const { status: geoStatus, coords: geoCoords, active: geoActive, manualKey: geoManualKey, start: startLocate, applyManual } = geo
const spotKey = computed({ get: () => geoManualKey.value, set: (v) => applyManual(v) })

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
      await loadOrders()
      return
    }
    ElMessage.success('预约已创建，请完成支付')
    await loadOrders()
    openPay(order)
  } catch (e) {
    ElMessage.error(e?.msg || e?.message || '预约提交失败')
  } finally {
    submitting.value = false
  }
}

// ---------------- 我的服务预约 ----------------
const orders = ref([])
const PAGE_SIZE = 5
const page = ref(1)
const pagedOrders = computed(() => orders.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE))
const rangeStart = computed(() => (orders.value.length ? (page.value - 1) * PAGE_SIZE + 1 : 0))
const rangeEnd = computed(() => Math.min(page.value * PAGE_SIZE, orders.value.length))
const unpaidCount = computed(() => orders.value.filter((o) => o.payStatus === '0' && o.status !== '4' && o.source === '2').length)
watch(() => orders.value.length, (len) => {
  if ((page.value - 1) * PAGE_SIZE >= len) page.value = 1
})

function amountOf(o) {
  const total = Number(o.totalAmount)
  if (total > 0) return total
  return (Number(o.price) || 0) * (Number(o.qty) || 1)
}
function modeText(m) { return m === '2' ? '上门服务' : '到店服务' }
function payMethodText(m) { return { alipay: '支付宝', wechat: '微信', balance: '余额', free: '免费' }[m] || '已支付' }
function payTag(o) {
  if (o.payStatus === '1') return o.payMethod === 'free' ? '免费' : '已支付'
  // 旧版到店预约本来就是门店收款，别显示成「待支付」
  return o.source === '2' ? '待支付' : '门店收款'
}
function orderStatusText(o) {
  if (o.status === '4') return '已取消'
  if (o.status === '3') return '已完成'
  if (o.status === '2') return '服务中'
  if (o.status === '1') return '已接单'
  // 自助预约未付款是「待支付」；旧版到店预约本来就是门店收款，不能误导成待支付
  if (o.source === '2') return o.payStatus === '1' ? '待接单' : '待支付'
  return '待接单'
}
function orderChip(o) {
  if (o.status === '4') return 'ui-chip--danger'
  if (o.status === '3') return 'ui-chip--ok'
  if (o.payStatus === '1') return 'ui-chip--brand'
  return 'ui-chip--warn'
}
// 只有自助预约单支持在线支付/自助取消；旧版预约单在门店收费
function canPay(o) { return o.source === '2' && o.payStatus === '0' && o.status !== '4' }
function canCancelOrder(o) { return o.source === '2' && (o.status === '0' || o.status === '1') }

async function loadOrders() {
  if (!userStore.token) { orders.value = []; return }
  try {
    const res = await listMyServiceOrders()
    orders.value = res.data || []
  } catch (e) {
    orders.value = []
  }
}

async function cancelOrder(o) {
  try {
    const { value } = await ElMessageBox.prompt(
      `确认取消「${o.itemName}」的预约吗？${o.payStatus === '1' ? '已支付金额将退回平台余额。' : ''}`,
      '取消预约',
      {
        confirmButtonText: '确认取消',
        cancelButtonText: '再想想',
        inputPlaceholder: '如：时间冲突 / 暂时不需要了（选填）',
        type: 'warning'
      }
    )
    const res = await cancelServiceBooking(o.serviceId, value || '')
    ElMessage.success(res.msg || '预约已取消')
    await loadOrders()
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e?.msg || e?.message || '取消失败')
  }
}

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
    await loadOrders()
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
      return loadOrders()
    })
    .catch((e) => ElMessage.error(e?.msg || e?.message || '评价失败'))
    .finally(() => { evalSubmitting.value = false })
}

// ---------------- 旧版宠物预约记录 ----------------
const list = ref([])
const cancelingId = ref(null)
function statusText(s) { return ['待处理', '已确认', '已完成', '已取消'][s] || '未知' }
function statusClass(s) { return { 0: 'ui-chip--warn', 1: 'ui-chip--brand', 2: 'ui-chip--ok' }[s] || '' }
function canCancel(s) { return s === '0' || s === '1' }
function fmtTime(v) {
  if (!v) return '—'
  return String(v).replace('T', ' ').slice(5, 16)
}

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
        return loadLegacy()
      })
      .catch((e) => ElMessage.error(e?.msg || e?.message || '取消失败'))
      .finally(() => { cancelingId.value = null })
  }).catch(() => {})
}

async function loadLegacy() {
  if (!userStore.token) { list.value = []; return }
  try {
    const res = await listMyAppointments()
    list.value = res.data || []
  } catch (e) {
    list.value = []
  }
}

onMounted(async () => {
  // 游客只加载价目区，避免 401 弹「登录已过期」
  loadServiceItems()
  loadStores()
  loadServiceRating()
  if (!userStore.token) return
  loading.value = true
  try {
    await Promise.all([loadOrders(), loadLegacy()])
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
.svc-item__foot .ui-linkbtn { margin-left: auto; }

/* 我的服务预约 */
.apt-body { margin-top: 26px; min-height: 180px; }
.apt-sec { display: flex; align-items: baseline; gap: 10px; margin-bottom: 12px; }
.apt-sec__title { margin: 0; font-size: 15px; font-weight: 700; color: var(--text-1); }
.apt-sec__hint { font-size: 12px; color: var(--text-3); }

.bk-list { display: flex; flex-direction: column; gap: 10px; }
.bk-card {
  display: flex; align-items: stretch; gap: 16px;
  border: 1px solid var(--border-1); border-radius: var(--radius-md); background: var(--bg-card);
  padding: 14px 16px;
}
.bk-card__main { flex: 1; min-width: 0; }
.bk-card__head { display: flex; align-items: center; gap: 10px; }
.bk-name { font-size: 14.5px; font-weight: 600; color: var(--text-1);
  em { font-style: normal; font-weight: 500; color: var(--text-3); margin-left: 4px; } }
.bk-meta {
  display: flex; align-items: center; flex-wrap: wrap; gap: 6px 16px; margin-top: 8px;
  font-size: 12.5px; color: var(--text-3);
}
.bk-meta__i { display: inline-flex; align-items: center; gap: 5px; min-width: 0;
  .el-icon { font-size: 13px; color: var(--text-4); } }
.bk-meta__addr { max-width: 100%; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.bk-sub {
  display: flex; align-items: center; flex-wrap: wrap; gap: 6px 14px; margin-top: 8px;
  font-size: 12px; color: var(--text-3);
  .bk-remark { max-width: 320px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
}
.bk-no { font-variant-numeric: tabular-nums; color: var(--text-3); }
.bk-score { color: var(--warning-500); }

.bk-card__end {
  display: flex; flex-direction: column; align-items: flex-end; justify-content: center; gap: 6px;
  flex-shrink: 0; padding-left: 16px; border-left: 1px dashed var(--border-1);
}
.bk-amount { font-size: 17px; font-weight: 700; color: var(--brand-700); font-variant-numeric: tabular-nums; }
.bk-paytag { font-size: 11px; color: var(--warning-600, #b45309); border: 1px solid currentColor; border-radius: 999px; padding: 0 7px; }
.bk-paytag--ok { color: var(--success-600, #15803d); }
.bk-acts { display: flex; align-items: center; gap: 10px; margin-top: 2px; }
.bk-btn { padding: 6px 14px; font-size: 13px; }

.apt-pager { display: flex; align-items: center; justify-content: space-between; margin-top: 14px; }

/* 旧版宠物预约：弱化为单行清单 */
.apt-legacy { margin-top: 30px; padding-top: 18px; border-top: 1px solid var(--border-1); }
.lg-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
.lg-row {
  display: flex; align-items: center; gap: 12px; padding: 8px 10px; border-radius: var(--radius-sm, 6px);
  font-size: 12.5px; color: var(--text-2);
  &:hover { background: var(--bg-hover, rgba(0, 0, 0, 0.02)); }
}
.lg-pet { font-weight: 600; color: var(--text-1); }
.lg-time, .lg-phone { color: var(--text-3); font-variant-numeric: tabular-nums; }
.lg-act { margin-left: auto; }

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
  &__name { font-size: 13.5px; font-weight: 600; color: var(--text-1); }
  &__time { font-size: 12px; color: var(--text-3); margin-left: auto; }
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
  .bk-card { flex-direction: column; gap: 10px; }
  .bk-card__end {
    flex-direction: row; align-items: center; justify-content: space-between;
    padding-left: 0; padding-top: 10px; border-left: 0; border-top: 1px dashed var(--border-1);
  }
  .bk-acts { margin-top: 0; }
  .apt-pager { flex-direction: column; gap: 8px; }
  .lg-row { flex-wrap: wrap; gap: 8px; }
  .lg-act { margin-left: 0; }
  .bkd-row { flex-direction: column; }
}
</style>
