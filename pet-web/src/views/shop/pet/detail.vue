<template>
  <div class="detail" v-loading="loading">
    <div class="detail-inner" v-if="pet.petId">
      <!-- 左侧大图 -->
      <div class="left">
        <div class="big-avatar" :style="{ background: petGradient(pet.petId) }">
          <img v-if="isImage(pet.image)" :src="pet.image" :alt="pet.petName" class="big-photo" />
          <span v-else>{{ petEmoji(pet.categoryId) }}</span>
        </div>
        <!-- 游客提示 -->
        <div class="guest-tip" v-if="!userStore.token">
          <span>👀 您正在以游客身份浏览，</span>
          <el-link type="primary" underline="never" @click="openAuth('login')">登录后</el-link>
          <span>可收藏、预约、点赞和评论</span>
        </div>
      </div>
      <!-- 右侧信息 -->
      <div class="right">
        <h1>{{ pet.petName }}</h1>
        <div class="tags">
          <el-tag type="info">{{ pet.breed || '未知品种' }}</el-tag>
          <el-tag type="success" v-if="pet.age">{{ pet.age }}岁</el-tag>
          <el-tag type="warning">{{ genderText(pet.gender) }}</el-tag>
          <el-tag type="danger" v-if="pet.status">{{ statusText(pet.status) }}</el-tag>
          <el-tag type="success" effect="dark" v-if="health.healthId">
            健康等级：{{ health.healthLevel || '待评定' }}
          </el-tag>
        </div>
        <div class="price" v-if="pet.price">
          <span class="label">领养价</span>
          <span class="amount">¥ {{ pet.price }}</span>
        </div>
        <div class="desc" v-if="pet.description">
          <h3>宠物简介</h3>
          <p>{{ pet.description }}</p>
        </div>
        <div class="actions">
          <el-button size="large" round :type="isFav ? 'danger' : 'default'" @click="toggleFav">
            {{ isFav ? '❤️ 已收藏' : '🤍 收藏' }}
          </el-button>
          <el-button size="large" type="primary" round @click="showAppoint = true">📅 立即预约</el-button>
          <el-button size="large" round class="ai-ask" @click="askAi">🤖 问 AI</el-button>
        </div>
      </div>
    </div>

    <!-- 健康与服务档案（后台维护，前台实时展示） -->
    <div class="health-panel" v-if="pet.petId && health.healthId">
      <div class="panel-head">
        <h2>🗂️ 健康与服务档案</h2>
        <span class="archive">档案编号 {{ health.archiveNo }} · 体检机构：{{ health.examHospital }}</span>
      </div>

      <div class="health-grid">
        <!-- 健康筛查 -->
        <section class="h-card">
          <h3><span class="ico">🩺</span>健康筛查</h3>
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
          <h3><span class="ico">📋</span>真实信息</h3>
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
          <h3><span class="ico">🐾</span>专业养护</h3>
          <ul>
            <li><span class="k">性格特点</span><span class="v">{{ health.temperament }}</span></li>
            <li><span class="k">饲养难度</span><span class="v"><el-tag size="small" :type="skillTag(health.skillLevel)">{{ health.skillLevel }}</el-tag></span></li>
            <li><span class="k">喂养方案</span><span class="v">{{ health.feedPlan }}</span></li>
            <li><span class="k">护理要点</span><span class="v">{{ health.carePoints }}</span></li>
          </ul>
        </section>

        <!-- 售后无忧 -->
        <section class="h-card">
          <h3><span class="ico">🛡️</span>售后无忧</h3>
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
        <h2>🐾 它的小喜好</h2>
        <span class="archive">投其所好，相处更甜</span>
      </div>
      <div class="pref-grid">
        <div class="pref-item" v-if="preference.foodLike"><span class="ico">🍖</span><div><b>爱吃</b><p>{{ preference.foodLike }}</p></div></div>
        <div class="pref-item" v-if="preference.toyLike"><span class="ico">🧶</span><div><b>爱玩</b><p>{{ preference.toyLike }}</p></div></div>
        <div class="pref-item" v-if="preference.personality"><span class="ico">💗</span><div><b>性格</b><p>{{ preference.personality }}</p></div></div>
        <div class="pref-item" v-if="preference.activityLevel"><span class="ico">⚡</span><div><b>活跃度</b><p>{{ preference.activityLevel }}</p></div></div>
        <div class="pref-item" v-if="preference.envLike"><span class="ico">🏡</span><div><b>喜欢的环境</b><p>{{ preference.envLike }}</p></div></div>
        <div class="pref-item warn" v-if="preference.taboo"><span class="ico">⚠️</span><div><b>禁忌注意</b><p>{{ preference.taboo }}</p></div></div>
      </div>
    </div>

    <!-- 常见健康问题 -->
    <div class="issue-panel" v-if="pet.petId && issues.length">
      <div class="panel-head">
        <h2>⚕️ 常见健康问题</h2>
        <el-link type="primary" underline="never" @click="router.push('/shop/doctor')">宠物医生智能问答 ›</el-link>
      </div>
      <div class="issue-list">
        <div class="issue-card" v-for="it in issues" :key="it.issueId">
          <div class="issue-top">
            <span class="issue-name">🔹 {{ it.issueName }}</span>
            <el-tag size="small" :type="it.severity === '重' ? 'danger' : it.severity === '中' ? 'warning' : 'success'">{{ it.severity }}</el-tag>
            <el-tag size="small" type="info">{{ it.family }}</el-tag>
          </div>
          <div class="issue-row" v-if="it.symptoms"><b>症状</b><span>{{ it.symptoms }}</span></div>
          <div class="issue-row" v-if="it.solution"><b>措施</b><span>{{ it.solution }}</span></div>
          <div class="issue-row" v-if="it.prevention"><b>预防</b><span>{{ it.prevention }}</span></div>
        </div>
      </div>
    </div>

    <!-- 点赞 + 评论区 -->
    <PetSocial v-if="pet.petId" :pet-id="route.params.id" @auth="openAuth('login')" />

    <div class="not-found" v-else-if="!loading">
      <span class="icon">😿</span>
      <p>未找到该宠物信息</p>
      <el-button @click="$router.push('/shop/home')">返回首页</el-button>
    </div>

    <!-- 预约对话框 -->
    <el-dialog v-model="showAppoint" title="预约看宠" width="440px">
      <el-form ref="appointRef" :model="appointForm" :rules="appointRules" label-width="80px">
        <el-form-item label="宠物">
          <el-input :value="pet.petName" disabled />
        </el-form-item>
        <el-form-item label="预约日期" prop="appointmentDate">
          <el-date-picker v-model="appointForm.appointmentDate" type="datetime" placeholder="选择预约时间" value-format="YYYY-MM-DD HH:mm:ss" style="width:100%" />
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
import { ElMessage } from 'element-plus'
import { getPetInfo } from '@/api/pet/petInfo'
import { listPetFavorite, addPetFavorite, delPetFavorite } from '@/api/pet/petFavorite'
import { addPetAppointment } from '@/api/pet/petAppointment'
import { getPetHealth } from '@/api/pet/petHealth'
import { getPetPreference } from '@/api/pet/petPreference'
import { listIssueFront } from '@/api/pet/petHealthIssue'
import { useUserStore } from '@/store/modules/user'
import PetSocial from '@/components/PetSocial/index.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const openAuth = inject('openAuth', () => {})  // 未登录触发顶栏登录对话框

const pet = ref({})
const health = ref({})
const preference = ref({})
const issues = ref([])
const loading = ref(true)
const isFav = ref(false)
const showAppoint = ref(false)
const submitting = ref(false)
const appointRef = ref()
const appointForm = reactive({ appointmentDate: '', contactPhone: '', remark: '' })
const appointRules = {
  appointmentDate: [{ required: true, message: '请选择预约日期', trigger: 'change' }],
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

const emojiPool = ['🐶', '🐱', '🐰', '🐹', '🐦', '🐢', '🐟', '🦎']
function petEmoji(c) { return emojiPool[(c || 0) % emojiPool.length] }
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
    await Promise.all([loadFavStatus(), loadHealth(), loadPreference(), loadIssues()])
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

async function loadIssues() {
  try {
    const res = await listIssueFront({ categoryId: pet.value.categoryId, pageSize: 100 })
    issues.value = res.data || []
  } catch (e) {
    issues.value = []
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
      ElMessage.success('收藏成功 ❤️')
    }
  } catch (e) {
    ElMessage.error(e?.message || '操作失败')
  }
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
        appointmentDate: appointForm.appointmentDate,
        contactPhone: appointForm.contactPhone,
        status: '0',
        remark: appointForm.remark
      })
      ElMessage.success('预约提交成功，商家会尽快联系您！')
      showAppoint.value = false
      appointForm.appointmentDate = ''
      appointForm.contactPhone = ''
      appointForm.remark = ''
    } catch (e) {
      ElMessage.error(e?.message || '预约失败，请重试')
    } finally {
      submitting.value = false
    }
  })
}

onMounted(loadPet)
</script>

<style scoped lang="scss">
.detail { max-width: 1100px; margin: 0 auto; padding: 32px 24px; }
.detail-inner { display: flex; gap: 40px; background: #fff; border-radius: 16px; padding: 32px; box-shadow: 0 4px 20px rgba(0,0,0,.06); }
.left { flex: 0 0 380px;
  .big-avatar { height: 320px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 160px; overflow: hidden;
    .big-photo { width: 100%; height: 100%; object-fit: cover; display: block; }
  }
  .guest-tip { margin-top: 12px; background: #fff7ef; border-radius: 8px; padding: 10px 14px; font-size: 13px; color: #a06a3c; display: flex; gap: 4px; flex-wrap: wrap; align-items: center; }
}
.right { flex: 1;
  h1 { font-size: 30px; color: #303133; margin: 0 0 16px; }
  .tags { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; }
  .price { background: #fff7ef; border-radius: 10px; padding: 16px 20px; margin-bottom: 20px;
    .label { color: #909399; font-size: 13px; margin-right: 12px; }
    .amount { color: #f56c6c; font-size: 28px; font-weight: 700; }
  }
  .desc { margin-bottom: 24px;
    h3 { font-size: 16px; color: #303133; margin: 0 0 8px; }
    p { color: #606266; line-height: 1.8; }
  }
  .actions { display: flex; gap: 16px; margin-top: 32px; flex-wrap: wrap;
    .ai-ask { background: linear-gradient(135deg, #fff7f1, #fff); border-color: #ffb27a; color: #e2600f; font-weight: 600;
      &:hover { background: #fff1e6; border-color: #ff8c42; color: #d2550a; }
    }
  }
}

/* 健康与服务档案 */
.health-panel { background: #fff; border-radius: 16px; padding: 26px 30px; margin-top: 24px; box-shadow: 0 4px 20px rgba(0,0,0,.06);
  .panel-head { display: flex; align-items: baseline; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-bottom: 18px;
    h2 { margin: 0; font-size: 20px; color: #303133; }
    .archive { color: #909399; font-size: 13px; }
  }
  .health-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(320px, 100%), 1fr)); gap: 16px;
    .h-card { border: 1px solid #f0f0f0; border-radius: 12px; padding: 18px 20px; background: #fcfcfd;
      h3 { margin: 0 0 12px; font-size: 16px; color: #303133; display: flex; align-items: center; gap: 8px;
        .ico { font-size: 18px; }
      }
      ul { margin: 0; padding: 0; list-style: none;
        li { display: flex; gap: 12px; padding: 6px 0; font-size: 13px; line-height: 1.7; border-bottom: 1px dashed #f5f5f5;
          &:last-child { border-bottom: none; }
          .k { flex: 0 0 76px; color: #909399; }
          .v { flex: 1; color: #606266; word-break: break-all;
            &.ok { color: #67c23a; font-weight: 600; }
          }
        }
      }
    }
  }
}

.not-found { text-align: center; padding: 80px 0; color: #c0c4cc;
  .icon { font-size: 64px; display: block; margin-bottom: 16px; }
}

/* 宠物喜好 */
.pref-panel { background: #fff; border-radius: 16px; padding: 26px 30px; margin-top: 24px; box-shadow: 0 4px 20px rgba(0,0,0,.06);
  .panel-head { display: flex; align-items: baseline; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-bottom: 18px;
    h2 { margin: 0; font-size: 20px; color: #303133; }
    .archive { color: #909399; font-size: 13px; }
  }
  .pref-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(260px, 100%), 1fr)); gap: 14px;
    .pref-item { display: flex; gap: 12px; align-items: flex-start; background: #fff8f3; border: 1px solid #ffe6d2; border-radius: 12px; padding: 14px 16px;
      .ico { font-size: 22px; flex-shrink: 0; }
      b { display: block; font-size: 13px; color: #ff8c42; margin-bottom: 2px; }
      p { margin: 0; font-size: 13px; color: #606266; line-height: 1.6; }
      &.warn { background: #fff5f5; border-color: #ffd9d9;
        b { color: #f56c6c; }
      }
    }
  }
}

/* 常见健康问题 */
.issue-panel { background: #fff; border-radius: 16px; padding: 26px 30px; margin-top: 24px; box-shadow: 0 4px 20px rgba(0,0,0,.06);
  .panel-head { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-bottom: 18px;
    h2 { margin: 0; font-size: 20px; color: #303133; }
  }
  .issue-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(320px, 100%), 1fr)); gap: 14px;
    .issue-card { border: 1px solid #eef0f3; border-radius: 12px; padding: 16px 18px; background: #fcfcfd;
      .issue-top { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; flex-wrap: wrap;
        .issue-name { font-size: 15px; font-weight: 600; color: #303133; flex: 1; min-width: 140px; }
      }
      .issue-row { font-size: 13px; line-height: 1.7; padding: 4px 0; color: #606266; border-bottom: 1px dashed #f3f3f3;
        &:last-child { border-bottom: none; }
        b { display: inline-block; width: 44px; color: #909399; flex-shrink: 0; font-weight: 600; }
        span { color: #606266; }
      }
    }
  }
}
</style>
