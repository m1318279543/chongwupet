<template>
  <div class="match-page">
    <!-- 顶部 -->
    <section class="hero">
      <div class="hero-inner">
        <div class="hero-badge">🤖 AI 智能选宠 · 10 道题</div>
        <h1>找到最懂你的<span>那位伙伴</span></h1>
        <p>根据你的居住空间、生活节奏、养宠经验与预算，智能算法从 {{ totalPets }} 只在售宠物中为你精准匹配。</p>
        <div class="hero-tags">
          <span>规则引擎</span><span>协同过滤</span><span>人气加权</span>
        </div>
      </div>
    </section>

    <!-- 问卷 -->
    <section v-if="!result" class="quiz-wrap">
      <!-- AI 一句话自动填答 -->
      <div class="ai-fill">
        <div class="ai-fill-head">
          <span class="ai-fill-badge">✨ AI 自动填答</span>
          <h3>懒得答 10 道题？说一句话就行</h3>
          <p>描述你的居住环境、作息、预算和偏好，AI 会自动识别并填好问卷</p>
        </div>
        <div class="ai-fill-row">
          <el-input
            v-model="aiText"
            size="large"
            clearable
            maxlength="120"
            placeholder="例如：我住小户型，上班忙，预算 3000，想养只安静好照顾的猫"
            @keyup.enter="aiFill"
          />
          <el-button type="primary" size="large" round :loading="aiFilling" @click="aiFill">
            {{ aiFilling ? 'AI 解析中…' : '智能填答' }}
          </el-button>
        </div>
        <div v-if="aiHint" class="ai-fill-result">
          <span class="ai-fill-ok">✓ {{ aiHint }}</span>
          <el-button v-if="allDone" type="primary" link @click="submit">直接查看匹配结果 →</el-button>
        </div>
        <div class="ai-fill-tags">
          <span v-for="t in aiExamples" :key="t" class="ai-fill-tag" @click="aiText = t; aiFill()">{{ t }}</span>
        </div>
      </div>

      <!-- 顶部进度条 -->
      <div class="quiz-card">
        <div class="quiz-top">
          <span class="quiz-chip">{{ currentGroup }}</span>
          <span class="quiz-count">{{ qIndex + 1 }} / {{ allQuestions.length }}</span>
        </div>
        <div class="quiz-bar"><i :style="{ width: progress + '%' }"></i></div>

        <Transition name="qslide" mode="out-in">
          <div class="q-panel" :key="currentQ.key">
            <h2 class="q-title">{{ currentQ.title }}</h2>
            <p class="q-hint">{{ currentQ.hint }}</p>
            <div class="opt-list">
              <div
                v-for="o in currentQ.options"
                :key="o.value"
                class="opt"
                :class="{ selected: answers[currentQ.key] === o.value }"
                @click="select(o.value)"
              >
                <span class="opt-emoji">{{ o.emoji }}</span>
                <span class="opt-body">
                  <span class="opt-label">{{ o.label }}</span>
                  <span v-if="o.desc" class="opt-desc">{{ o.desc }}</span>
                </span>
                <span class="opt-check">✓</span>
              </div>
            </div>
          </div>
        </Transition>

        <!-- 操作 -->
        <div class="quiz-actions">
          <el-button v-if="qIndex > 0" size="large" round @click="prev">上一题</el-button>
          <el-button
            v-if="qIndex < allQuestions.length - 1"
            type="primary"
            size="large"
            round
            :disabled="!answers[currentQ.key]"
            @click="next"
          >
            下一题
          </el-button>
          <el-button
            v-else
            type="primary"
            size="large"
            round
            :loading="loading"
            :disabled="!allDone"
            @click="submit"
          >
            {{ loading ? 'AI 分析中…' : '开始智能匹配' }}
          </el-button>
        </div>
      </div>
    </section>

    <!-- 分析中 -->
    <section v-if="loading" class="analyzing">
      <div class="scan-ring"></div>
      <h3>正在分析你的生活方式…</h3>
      <p>{{ analyzeText }}</p>
    </section>

    <!-- 结果 -->
    <section v-if="result && !loading" class="result-wrap">
      <div class="result-head">
        <div>
          <h2>匹配结果</h2>
          <p class="summary">{{ result.summary }}</p>
          <p class="algo">
            算法：{{ result.algorithm }}
            <span v-if="result.hasHistory" class="cf-on">已结合你的收藏 / 预约行为</span>
            <span v-else class="cf-off">登录后可根据你的历史喜好进一步优化</span>
          </p>
        </div>
        <el-button round @click="restart">重新测评</el-button>
      </div>

      <div v-if="!result.recommendations.length" class="empty-result">
        <div class="emoji">🐾</div>
        <h3>暂时没有符合条件的宠物</h3>
        <p>可以适当放宽预算或宠物类型偏好后再试一次。</p>
        <el-button type="primary" round @click="restart">重新填写</el-button>
      </div>

      <template v-else>
        <!-- 最佳匹配 -->
        <div class="top-pick">
          <div class="tp-image" @click="goDetail(result.recommendations[0].petId)">
            <img :src="result.recommendations[0].image" :alt="result.recommendations[0].petName" />
            <span class="tp-crown">🏆 最佳匹配</span>
          </div>
          <div class="tp-main">
            <div class="tp-head">
              <div>
                <div class="tp-cat">{{ result.recommendations[0].categoryName }} · {{ result.recommendations[0].breed || '—' }}</div>
                <h3>{{ result.recommendations[0].petName }}</h3>
                <div class="tp-price">¥{{ formatPrice(result.recommendations[0].price) }}
                  <em>月均养护约 ¥{{ Math.round(result.recommendations[0].monthlyCost) }}</em>
                </div>
              </div>
              <div class="score-ring" :style="ringStyle(result.recommendations[0].score)">
                <div class="ring-inner">
                  <strong>{{ result.recommendations[0].score }}</strong>
                  <span>匹配度</span>
                </div>
              </div>
            </div>

            <div class="tags">
              <span class="tag level">{{ result.recommendations[0].matchLevel }}</span>
              <span v-for="t in result.recommendations[0].traits" :key="t" class="tag">{{ t }}</span>
            </div>

            <div class="reason-block">
              <div class="rb-title">为什么推荐它</div>
              <div class="reasons">
                <span v-for="r in result.recommendations[0].reasons" :key="r" class="reason">✓ {{ r }}</span>
                <span v-if="!result.recommendations[0].reasons.length" class="reason">综合维度最接近你的画像</span>
              </div>
            </div>

            <div class="dims">
              <div v-for="(v, k) in result.recommendations[0].breakdown" :key="k" class="dim">
                <span class="dim-name">{{ k }}</span>
                <div class="dim-bar"><i :style="{ width: v + '%', background: dimColor(v) }"></i></div>
                <span class="dim-val">{{ v }}</span>
              </div>
            </div>

            <div v-if="result.recommendations[0].cautions.length" class="cautions">
              <span class="c-title">需要注意</span>
              <span v-for="c in result.recommendations[0].cautions" :key="c" class="caution">· {{ c }}</span>
            </div>

            <div class="tp-actions">
              <el-button type="primary" size="large" round @click="goDetail(result.recommendations[0].petId)">查看详情</el-button>
              <el-button size="large" round @click="goDetail(result.recommendations[0].petId)">立即预约看宠</el-button>
            </div>
          </div>
        </div>

        <!-- 其他推荐 -->
        <h3 class="more-title">其他高匹配推荐</h3>
        <div class="cards">
          <div
            v-for="p in result.recommendations.slice(1)"
            :key="p.petId"
            class="card"
            @click="goDetail(p.petId)"
          >
            <div class="card-img">
              <img :src="p.image" :alt="p.petName" loading="lazy" />
              <span class="card-score">{{ p.score }}%</span>
            </div>
            <div class="card-body">
              <div class="card-cat">{{ p.categoryName }} · {{ p.breed || '—' }}</div>
              <div class="card-name">{{ p.petName }}</div>
              <div class="card-price">¥{{ formatPrice(p.price) }}</div>
              <div class="card-reason">{{ (p.reasons && p.reasons[0]) || '综合维度匹配' }}</div>
            </div>
          </div>
        </div>

        <p class="foot-note">
          匹配结果由纯后端算法实时计算：规则的六维画像打分占 72%~84%，相似用户行为（协同过滤）占 12%~16%，全站人气占 12%~16%。
        </p>
      </template>
    </section>
  </div>
</template>

<script setup>
import { ref, reactive, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { recommendPet } from '@/api/pet/petMatch'
import { aiParse } from '@/api/pet/petAi'

const router = useRouter()

/* ---------- AI 一句话自动填答 ---------- */
const aiText = ref('')
const aiFilling = ref(false)
const aiHint = ref('')
const aiExamples = [
  '小户型上班族，预算 3000 想养猫',
  '家里有小孩，想养温顺的狗',
  '第一次养，想省心安静的小宠物'
]

async function aiFill() {
  const text = aiText.value.trim()
  if (!text) {
    ElMessage.warning('先用一句话说说你的情况')
    return
  }
  aiFilling.value = true
  aiHint.value = ''
  try {
    const res = await aiParse(text)
    const data = (res && res.data) || {}
    const a = data.answers || {}
    let filled = 0
    Object.keys(answers).forEach((k) => {
      const v = a[k]
      if (v !== undefined && v !== null && String(v) !== '') {
        answers[k] = String(v)
        filled++
      }
    })
    const how = data.source === 'ai' ? '大模型解析' : '本地规则解析'
    aiHint.value = `已识别「${data.summary || '你的需求'}」，自动填好 ${filled}/10 项 · ${how}`
    qIndex.value = allQuestions.length - 1
    await nextTick()
    document.querySelector('.quiz-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  } catch (e) {
    ElMessage.error('解析失败，请重试或手动答题')
  } finally {
    aiFilling.value = false
  }
}

const totalPets = ref(96)
const loading = ref(false)
const result = ref(null)
const analyzeText = ref('正在读取你的居住空间与生活节奏…')

const answers = reactive({
  home: '',
  kids: '',
  noise: '',
  activity: '',
  time: '',
  companion: '',
  experience: '',
  budget: '',
  monthly: '',
  prefer: ''
})

const steps = [
  {
    key: 'life',
    title: '居住与家庭',
    sub: '先看看你家的环境',
    questions: [
      {
        key: 'home',
        title: '你现在的居住环境是？',
        hint: '决定宠物的活动空间',
        options: [
          { value: 'small', emoji: '🏢', label: '小户型 / 合租', desc: '一室或合租，空间有限' },
          { value: 'apartment', emoji: '🏠', label: '普通住宅', desc: '两室一厅，有阳台' },
          { value: 'house', emoji: '🏡', label: '大房子 / 带院子', desc: '空间充裕，可自由活动' }
        ]
      },
      {
        key: 'kids',
        title: '家里有 12 岁以下的小朋友吗？',
        hint: '会优先排除不适合儿童的品种',
        options: [
          { value: 'yes', emoji: '🧒', label: '有小朋友' },
          { value: 'no', emoji: '👤', label: '没有' }
        ]
      },
      {
        key: 'noise',
        title: '你对宠物叫声的容忍度？',
        hint: '公寓隔音差建议选安静型',
        options: [
          { value: 'low', emoji: '🤫', label: '几乎不能接受', desc: '怕吵到邻居' },
          { value: 'mid', emoji: '🙂', label: '偶尔叫可以' },
          { value: 'high', emoji: '😄', label: '完全无所谓' }
        ]
      }
    ]
  },
  {
    key: 'pace',
    title: '生活方式',
    sub: '你的日常节奏很重要',
    questions: [
      {
        key: 'activity',
        title: '你的日常活动量？',
        hint: '喜欢户外的人更适合高精力犬种',
        options: [
          { value: 'low', emoji: '🛋️', label: '宅家为主', desc: '很少出门运动' },
          { value: 'medium', emoji: '🚶', label: '偶尔运动', desc: '周末会出门走走' },
          { value: 'high', emoji: '🏃', label: '每天运动', desc: '常跑步、爬山、户外' }
        ]
      },
      {
        key: 'time',
        title: '每天能陪宠物多久？',
        hint: '决定它需要多高的照料投入',
        options: [
          { value: 'lt1', emoji: '⏱️', label: '不到 1 小时', desc: '工作忙，只有早晚' },
          { value: '1to3', emoji: '🕐', label: '1 ~ 3 小时' },
          { value: 'gt3', emoji: '🕓', label: '3 小时以上', desc: '时间充裕' }
        ]
      },
      {
        key: 'companion',
        title: '你期待的相处模式？',
        hint: '性格匹配比品种更重要',
        options: [
          { value: 'clingy', emoji: '🤗', label: '粘人陪伴', desc: '希望它主动亲近我' },
          { value: 'independent', emoji: '🧘', label: '独立省心', desc: '各过各的也很好' },
          { value: 'any', emoji: '✨', label: '都可以' }
        ]
      }
    ]
  },
  {
    key: 'budget',
    title: '经验与预算',
    sub: '最后一步，马上出结果',
    questions: [
      {
        key: 'experience',
        title: '你的养宠经验？',
        hint: '新手会优先推荐好养品种',
        options: [
          { value: 'none', emoji: '🌱', label: '第一次养', desc: '需要省心的品种' },
          { value: 'some', emoji: '🌿', label: '养过 1 ~ 2 只' },
          { value: 'pro', emoji: '🌳', label: '多年经验', desc: '能驾驭高难度品种' }
        ]
      },
      {
        key: 'budget',
        title: '购宠预算大概是？',
        hint: '超出预算的宠物会被直接过滤',
        options: [
          { value: '1000', emoji: '💵', label: '1000 元以内' },
          { value: '3000', emoji: '💰', label: '1000 ~ 3000 元' },
          { value: '6000', emoji: '💳', label: '3000 ~ 6000 元' },
          { value: '99999', emoji: '💎', label: '6000 元以上 / 不限' }
        ]
      },
      {
        key: 'monthly',
        title: '每月养护预算？',
        hint: '含粮、用品、医疗等日常开销',
        options: [
          { value: '200', emoji: '🥣', label: '200 元以内' },
          { value: '500', emoji: '🍖', label: '200 ~ 500 元' },
          { value: '1000', emoji: '🧴', label: '500 ~ 1000 元' },
          { value: '99999', emoji: '🏦', label: '1000 元以上 / 不限' }
        ]
      },
      {
        key: 'prefer',
        title: '有偏好的宠物类型吗？',
        hint: '选择后只在对应类别中推荐',
        options: [
          { value: 'any', emoji: '🎲', label: '不限，都可以' },
          { value: '1', emoji: '🐱', label: '猫咪' },
          { value: '2', emoji: '🐶', label: '狗狗' },
          { value: '3', emoji: '🐰', label: '兔子' },
          { value: '4', emoji: '🐹', label: '仓鼠' },
          { value: '5', emoji: '🦜', label: '鸟类' },
          { value: '6', emoji: '🐠', label: '水族' },
          { value: '7', emoji: '🐢', label: '爬行宠物' }
        ]
      }
    ]
  }
]

const allQuestions = steps.flatMap((s) => s.questions.map((q) => ({ ...q, group: s.title })))
const qIndex = ref(0)
const currentQ = computed(() => allQuestions[qIndex.value])
const currentGroup = computed(() => currentQ.value.group)
const allDone = computed(() => steps.every((s) => s.questions.every((q) => !!answers[q.key])))
const progress = computed(() => {
  const total = steps.reduce((n, s) => n + s.questions.length, 0)
  const done = Object.keys(answers).filter((k) => answers[k]).length
  return Math.round((done / total) * 100)
})

let advancing = false
function select(value) {
  if (advancing) return
  answers[currentQ.value.key] = value
  // 选中后自动滑入下一题（最后一题停留，等用户点"开始智能匹配"）
  if (qIndex.value < allQuestions.length - 1) {
    advancing = true
    setTimeout(() => {
      qIndex.value += 1
      advancing = false
    }, 280)
  }
}

function prev() {
  if (qIndex.value > 0) qIndex.value -= 1
}

function next() {
  if (!answers[currentQ.value.key]) {
    ElMessage.warning('请先选择一个选项')
    return
  }
  if (qIndex.value < allQuestions.length - 1) qIndex.value += 1
}

const analyzeTexts = [
  '正在读取你的居住空间与生活节奏…',
  '比对 96 只宠物的空间 / 精力 / 照料特征…',
  '计算与你相似用户的偏好（协同过滤）…',
  '生成个性化匹配报告…'
]

function startAnalyzeText() {
  let i = 0
  analyzeText.value = analyzeTexts[0]
  const timer = setInterval(() => {
    i = (i + 1) % analyzeTexts.length
    analyzeText.value = analyzeTexts[i]
  }, 900)
  return timer
}

async function submit() {
  if (!allDone.value) {
    ElMessage.warning('还有问题没有回答完')
    return
  }
  loading.value = true
  result.value = null
  const timer = startAnalyzeText()
  try {
    const res = await recommendPet({ ...answers })
    const data = res.data || {}
    result.value = data
    if (data.candidateCount) totalPets.value = data.candidateCount
    if (!data.recommendations || !data.recommendations.length) {
      ElMessage.info('暂时没有符合条件的宠物，试着放宽条件')
    }
  } catch (e) {
    ElMessage.error('匹配失败，请稍后重试')
  } finally {
    clearInterval(timer)
    loading.value = false
  }
}

function restart() {
  result.value = null
  qIndex.value = 0
  Object.keys(answers).forEach((k) => (answers[k] = ''))
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function goDetail(id) {
  router.push('/shop/pet/' + id)
}

function formatPrice(p) {
  const n = Number(p || 0)
  return n.toLocaleString('zh-CN')
}

function ringStyle(score) {
  const pct = Math.max(0, Math.min(100, Number(score) || 0))
  return {
    background: `conic-gradient(#ff6b35 0% ${pct}%, #ffe6da ${pct}% 100%)`
  }
}

function dimColor(v) {
  if (v >= 80) return 'linear-gradient(90deg,#67c23a,#95d475)'
  if (v >= 60) return 'linear-gradient(90deg,#ff9f43,#ffc078)'
  return 'linear-gradient(90deg,#f56c6c,#fab6b6)'
}
</script>

<style scoped>
.match-page {
  background: #f7f8fa;
  min-height: 100vh;
  padding-bottom: 60px;
}
/* Hero */
.hero {
  background: linear-gradient(135deg, #ff6b35 0%, #ff8f5e 55%, #ffb27a 100%);
  color: #fff;
  padding: 48px 0 40px;
  position: relative;
  overflow: hidden;
}
.hero::after {
  content: '🐾';
  position: absolute;
  right: 6%;
  top: 50%;
  transform: translateY(-50%);
  font-size: 180px;
  opacity: 0.13;
}
.hero-inner {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 20px;
  position: relative;
  z-index: 1;
}
.hero-badge {
  display: inline-block;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.4);
  padding: 4px 14px;
  border-radius: 20px;
  font-size: 13px;
  margin-bottom: 14px;
}
.hero h1 {
  font-size: 36px;
  margin: 0 0 10px;
  font-weight: 700;
}
.hero h1 span {
  color: #fff5eb;
  text-decoration: underline;
  text-decoration-color: rgba(255, 255, 255, 0.5);
  text-underline-offset: 8px;
}
.hero p {
  margin: 0 0 16px;
  font-size: 14px;
  opacity: 0.93;
  max-width: 640px;
  line-height: 1.7;
}
.hero-tags span {
  display: inline-block;
  font-size: 12px;
  background: rgba(255, 255, 255, 0.16);
  border-radius: 12px;
  padding: 3px 10px;
  margin-right: 8px;
}
/* 问卷 */
.quiz-wrap {
  max-width: 720px;
  margin: -24px auto 0;
  padding: 0 16px 40px;
  position: relative;
  z-index: 2;
}
/* AI 一句话自动填答 */
.ai-fill {
  background: linear-gradient(135deg, #fff7f1, #fff);
  border: 1px solid #ffe0cc;
  border-radius: 18px;
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: 0 8px 24px rgba(255, 107, 53, 0.09);
}
.ai-fill-head h3 {
  margin: 8px 0 4px;
  font-size: 18px;
  color: #303133;
}
.ai-fill-head p {
  margin: 0 0 14px;
  font-size: 13px;
  color: #909399;
  line-height: 1.6;
}
.ai-fill-badge {
  display: inline-block;
  font-size: 12px;
  color: #ff6b35;
  background: #fff1e6;
  border-radius: 12px;
  padding: 3px 10px;
  font-weight: 600;
}
.ai-fill-row {
  display: flex;
  gap: 10px;
  align-items: center;
}
.ai-fill-row :deep(.el-input) {
  flex: 1;
}
.ai-fill-result {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 10px;
  font-size: 13px;
}
.ai-fill-ok {
  color: #67c23a;
  background: #f0f9eb;
  border-radius: 10px;
  padding: 5px 10px;
}
.ai-fill-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}
.ai-fill-tag {
  font-size: 12px;
  color: #606266;
  background: #fff;
  border: 1px dashed #e4e7ed;
  border-radius: 14px;
  padding: 5px 10px;
  cursor: pointer;
  transition: all 0.2s;
}
.ai-fill-tag:hover {
  color: #ff6b35;
  border-color: #ffb27a;
  background: #fff7f1;
}
@media (max-width: 640px) {
  .ai-fill {
    padding: 16px;
    border-radius: 14px;
  }
  .ai-fill-head h3 {
    font-size: 16px;
  }
  .ai-fill-row {
    flex-direction: column;
    align-items: stretch;
  }
  .ai-fill-row :deep(.el-button) {
    width: 100%;
  }
}
.quiz-card {
  background: #fff;
  border-radius: 18px;
  padding: 26px 30px 24px;
  box-shadow: 0 10px 34px rgba(0, 0, 0, 0.08);
}
.quiz-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.quiz-chip {
  font-size: 13px;
  font-weight: 600;
  color: #ff6b35;
  background: #fff1e8;
  border-radius: 20px;
  padding: 5px 14px;
}
.quiz-count {
  font-size: 13px;
  color: #a8abb2;
  font-variant-numeric: tabular-nums;
}
.quiz-bar {
  height: 6px;
  background: #f2f3f5;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 24px;
}
.quiz-bar i {
  display: block;
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, #ff6b35, #ffb27a);
  transition: width 0.35s ease;
}
.q-title {
  font-size: 21px;
  color: #303133;
  font-weight: 700;
  margin: 0 0 6px;
}
.q-hint {
  font-size: 13px;
  color: #a8abb2;
  margin: 0 0 20px;
}
/* 选项：纵向大卡片，纯 flex 布局，任何宽度都不会溢出 */
.opt-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.opt {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  box-sizing: border-box;
  border: 1.5px solid #ebeef5;
  border-radius: 12px;
  padding: 14px 18px;
  cursor: pointer;
  transition: all 0.18s;
  background: #fcfcfd;
}
.opt:hover {
  border-color: #ffc5a8;
  background: #fff9f5;
  transform: translateY(-2px);
}
.opt.selected {
  border-color: #ff6b35;
  background: #fff4ec;
  box-shadow: 0 4px 14px rgba(255, 107, 53, 0.16);
}
.opt-emoji {
  font-size: 26px;
  flex-shrink: 0;
  line-height: 1;
}
.opt-body {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  flex: 1;
}
.opt-label {
  font-size: 15px;
  color: #303133;
  font-weight: 600;
}
.opt-desc {
  font-size: 12px;
  color: #909399;
}
.opt-check {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #ff6b35;
  color: #fff;
  font-size: 12px;
  display: none;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.opt.selected .opt-check {
  display: flex;
}
/* 题目切换动画 */
.qslide-enter-active,
.qslide-leave-active {
  transition: opacity 0.24s ease, transform 0.24s ease;
}
.qslide-enter-from {
  opacity: 0;
  transform: translateX(26px);
}
.qslide-leave-to {
  opacity: 0;
  transform: translateX(-26px);
}
.quiz-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  margin-top: 26px;
}
/* 分析中 */
.analyzing {
  text-align: center;
  padding: 90px 20px;
}
.scan-ring {
  width: 74px;
  height: 74px;
  margin: 0 auto 24px;
  border-radius: 50%;
  border: 4px solid #ffe6da;
  border-top-color: #ff6b35;
  animation: spin 0.9s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.analyzing h3 {
  font-size: 18px;
  color: #303133;
  margin: 0 0 8px;
}
.analyzing p {
  font-size: 13px;
  color: #909399;
  margin: 0;
}
/* 结果 */
.result-wrap {
  max-width: 1100px;
  margin: -24px auto 0;
  padding: 24px 20px 0;
  position: relative;
  z-index: 2;
}
.result-head {
  background: #fff;
  border-radius: 14px;
  padding: 22px 26px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.05);
  margin-bottom: 18px;
}
.result-head h2 {
  margin: 0 0 6px;
  font-size: 20px;
  color: #303133;
}
.summary {
  margin: 0 0 6px;
  font-size: 14px;
  color: #606266;
}
.algo {
  margin: 0;
  font-size: 12px;
  color: #a8abb2;
}
.cf-on {
  color: #67c23a;
  margin-left: 8px;
}
.cf-off {
  color: #e6a23c;
  margin-left: 8px;
}
.top-pick {
  display: grid;
  grid-template-columns: 380px 1fr;
  gap: 0;
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 10px 34px rgba(255, 107, 53, 0.13);
  border: 1px solid #ffe6da;
}
.tp-image {
  position: relative;
  background: #fafafa;
  cursor: pointer;
  min-height: 380px;
}
.tp-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.tp-crown {
  position: absolute;
  top: 14px;
  left: 14px;
  background: linear-gradient(135deg, #ff6b35, #ff9f5e);
  color: #fff;
  font-size: 12px;
  padding: 5px 12px;
  border-radius: 14px;
  font-weight: 600;
}
.tp-main {
  padding: 26px 28px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.tp-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}
.tp-cat {
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}
.tp-head h3 {
  margin: 0 0 8px;
  font-size: 26px;
  color: #303133;
}
.tp-price {
  color: #ff6b35;
  font-size: 24px;
  font-weight: 700;
}
.tp-price em {
  font-style: normal;
  font-size: 12px;
  color: #909399;
  font-weight: 400;
  margin-left: 8px;
}
.score-ring {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.ring-inner {
  width: 76px;
  height: 76px;
  background: #fff;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.ring-inner strong {
  font-size: 24px;
  color: #ff6b35;
  line-height: 1;
}
.ring-inner span {
  font-size: 11px;
  color: #909399;
  margin-top: 3px;
}
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.tag {
  font-size: 12px;
  color: #606266;
  background: #f5f7fa;
  padding: 3px 10px;
  border-radius: 12px;
}
.tag.level {
  background: #fff0e8;
  color: #ff6b35;
  font-weight: 600;
}
.reason-block .rb-title {
  font-size: 13px;
  color: #303133;
  font-weight: 600;
  margin-bottom: 8px;
}
.reasons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.reason {
  font-size: 12px;
  color: #529b2e;
  background: #f0f9eb;
  padding: 4px 10px;
  border-radius: 12px;
}
.dims {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px 22px;
  background: #fafbfc;
  border-radius: 10px;
  padding: 12px 16px;
}
.dim {
  display: flex;
  align-items: center;
  gap: 8px;
}
.dim-name {
  font-size: 12px;
  color: #909399;
  width: 34px;
  flex-shrink: 0;
}
.dim-bar {
  flex: 1;
  height: 7px;
  background: #eef0f3;
  border-radius: 4px;
  overflow: hidden;
}
.dim-bar i {
  display: block;
  height: 100%;
  border-radius: 4px;
}
.dim-val {
  font-size: 12px;
  color: #606266;
  width: 26px;
  text-align: right;
}
.cautions {
  font-size: 12px;
  color: #b88230;
  background: #fdf6ec;
  border-radius: 8px;
  padding: 9px 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}
.c-title {
  font-weight: 600;
}
.tp-actions {
  display: flex;
  gap: 12px;
  margin-top: 2px;
}
.more-title {
  font-size: 17px;
  color: #303133;
  margin: 28px 0 14px;
}
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(220px, 100%), 1fr));
  gap: 16px;
}
.card {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid #f0f0f0;
}
.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.09);
  border-color: #ffd4a8;
}
.card-img {
  position: relative;
  height: 160px;
  background: #fafafa;
}
.card-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.card-score {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(255, 107, 53, 0.92);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 12px;
}
.card-body {
  padding: 12px 14px 14px;
}
.card-cat {
  font-size: 11px;
  color: #a8abb2;
  margin-bottom: 4px;
}
.card-name {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 6px;
}
.card-price {
  color: #ff6b35;
  font-size: 17px;
  font-weight: 700;
  margin-bottom: 6px;
}
.card-reason {
  font-size: 12px;
  color: #67c23a;
  background: #f0f9eb;
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.empty-result {
  background: #fff;
  border-radius: 14px;
  text-align: center;
  padding: 70px 20px;
}
.empty-result .emoji {
  font-size: 48px;
  margin-bottom: 12px;
}
.empty-result h3 {
  margin: 0 0 6px;
  color: #303133;
}
.empty-result p {
  color: #909399;
  font-size: 13px;
  margin: 0 0 18px;
}
.foot-note {
  text-align: center;
  font-size: 12px;
  color: #a8abb2;
  margin-top: 26px;
  line-height: 1.7;
}
@media (max-width: 860px) {
  .top-pick {
    grid-template-columns: 1fr;
  }
  .tp-image {
    min-height: 240px;
  }
  .hero h1 {
    font-size: 26px;
  }
  .dims {
    grid-template-columns: 1fr;
  }
}
/* 窄屏 / 窄预览面板：问卷卡收内边距、结果卡退化为单列 */
@media (max-width: 640px) {
  .quiz-wrap {
    padding: 0 10px 30px;
  }
  .quiz-card {
    padding: 20px 16px 18px;
  }
  .q-title {
    font-size: 18px;
  }
  .opt {
    padding: 12px 14px;
  }
  .opt-label {
    font-size: 14px;
  }
}
</style>
