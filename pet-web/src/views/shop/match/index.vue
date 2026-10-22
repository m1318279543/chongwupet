<template>
  <div class="match-page">
    <ShopHero
      eyebrow="AI 智能选宠 · 10 道题"
      title="找到最懂你的那位伙伴"
      highlight="最懂你"
      :desc="`根据你的居住空间、生活节奏、养宠经验与预算，从 ${totalPets} 只在售宠物里筛出真正适配的那几只。`"
      narrow
    >
      <template #aside>
        <div class="hero-panel">
          <div class="hp-title">答题说明</div>
          <dl class="hp-list">
            <div><dt>10</dt><dd>道题 · 3 组</dd></div>
            <div><dt>2</dt><dd>分钟完成</dd></div>
          </dl>
          <p class="hp-note">也可以直接用一句话描述需求，系统会自动填好问卷。</p>
        </div>
      </template>
    </ShopHero>

    <div class="page-body">
      <!-- ================= 问卷 ================= -->
      <section v-if="!result" class="quiz">
        <!-- 一句话自动填答 -->
        <div class="ai-fill">
          <div class="af-head">
            <span class="af-badge">AI 自动填答</span>
            <h2>懒得答 10 道题？说一句话就行</h2>
            <p>描述你的居住环境、作息、预算和偏好，系统会自动识别并填好问卷。</p>
          </div>
          <div class="af-row">
            <el-input
              v-model="aiText"
              size="large"
              clearable
              maxlength="120"
              placeholder="例如：我住小户型，上班忙，预算 3000，想养只安静好照顾的猫"
              @keyup.enter="aiFill"
            />
            <el-button type="primary" size="large" round :loading="aiFilling" @click="aiFill">
              {{ aiFilling ? '解析中' : '智能填答' }}
            </el-button>
          </div>

          <p v-if="aiHint" class="af-hint">
            <el-icon><CircleCheck /></el-icon>{{ aiHint }}
            <button v-if="allDone" type="button" class="af-go" @click="submit">直接看结果</button>
          </p>

          <div class="af-examples">
            <span class="af-ex-label">试试</span>
            <button
              v-for="t in AI_EXAMPLES"
              :key="t"
              type="button"
              class="af-ex"
              @click="useExample(t)"
            >{{ t }}</button>
          </div>
        </div>

        <!-- 问卷主体：一页看全，随时改 -->
        <div class="quiz-card">
          <div class="qz-top">
            <div class="qz-meta">
              <b>选宠问卷</b>
              <span>{{ doneCount }} / {{ totalCount }} 已答</span>
            </div>
            <div class="qz-bar"><i :style="{ width: progress + '%' }"></i></div>
          </div>

          <section v-for="(g, gi) in STEPS" :key="g.key" class="group">
            <header class="g-head">
              <span class="g-no">{{ pad(gi + 1) }}</span>
              <div class="g-text">
                <b>{{ g.title }}</b>
                <span>{{ g.sub }}</span>
              </div>
              <span class="g-done" :class="{ full: groupDone(g) === g.questions.length }">
                {{ groupDone(g) }}/{{ g.questions.length }}
              </span>
            </header>

            <div v-for="q in g.questions" :key="q.key" class="q">
              <div class="q-head">
                <span class="q-title">{{ q.title }}</span>
                <span class="q-hint">{{ q.hint }}</span>
              </div>
              <div class="q-opts">
                <button
                  v-for="o in q.options"
                  :key="o.value"
                  type="button"
                  class="opt"
                  :class="{ on: answers[q.key] === o.value }"
                  @click="answers[q.key] = o.value"
                >
                  <span class="opt-main">
                    {{ o.label }}
                    <el-icon v-if="answers[q.key] === o.value" class="opt-check"><Select /></el-icon>
                  </span>
                  <span v-if="o.desc" class="opt-sub">{{ o.desc }}</span>
                </button>
              </div>
            </div>
          </section>

          <footer class="qz-foot">
            <span class="qz-tip" :class="{ done: allDone }">
              {{ allDone ? '已全部作答，可以开始匹配' : `还有 ${totalCount - doneCount} 题未选择` }}
            </span>
            <el-button
              type="primary"
              size="large"
              round
              :loading="loading"
              :disabled="!allDone"
              @click="submit"
            >
              {{ loading ? '分析中' : '开始智能匹配' }}
            </el-button>
          </footer>
        </div>
      </section>

      <!-- ================= 分析中 ================= -->
      <section v-if="loading" class="analyzing">
        <div class="scan-ring"></div>
        <h3>正在分析你的生活方式</h3>
        <p>{{ analyzeText }}</p>
      </section>

      <!-- ================= 结果 ================= -->
      <section v-if="result && !loading" class="result">
        <div class="result-head">
          <div class="rh-text">
            <span class="rh-eyebrow">匹配结果</span>
            <h2>{{ result.summary }}</h2>
            <p class="rh-algo">
              {{ result.algorithm }}
              <span v-if="result.hasHistory" class="on">已结合你的收藏 / 预约行为</span>
              <span v-else>登录后可结合历史喜好进一步优化</span>
            </p>
          </div>
          <el-button round @click="restart">重新测评</el-button>
        </div>

        <!-- 无结果 -->
        <div v-if="!result.recommendations.length" class="empty-result">
          <el-icon class="er-ico"><Search /></el-icon>
          <h3>暂时没有符合条件的宠物</h3>
          <p class="er-tips" v-if="result.diagnosis && result.diagnosis.tips && result.diagnosis.tips.length">
            <span v-for="(t, i) in result.diagnosis.tips" :key="i">{{ t }}</span>
          </p>
          <p v-else>可以适当放宽预算或宠物类型偏好后再试一次。</p>
          <p class="er-stat" v-if="result.diagnosis && result.diagnosis.total">
            本次共比对了 {{ result.diagnosis.total }} 只在售宠物
            <em v-if="result.diagnosis.byBudget">，其中 {{ result.diagnosis.byBudget }} 只超出预算</em>
            <em v-if="result.diagnosis.byPrefer">，{{ result.diagnosis.byPrefer }} 只类型不符</em>
          </p>
          <el-button type="primary" round @click="restart">重新填写</el-button>
        </div>

        <template v-else>
          <!-- 最佳匹配 -->
          <div class="top-pick">
            <div class="tp-image" @click="goDetail(top.petId)">
              <img v-if="isImg(top.image)" :src="top.image" :alt="top.petName" />
              <div v-else class="tp-holder"><span>{{ top.categoryName || '暂无图片' }}</span></div>
              <span class="tp-crown">最佳匹配</span>
            </div>

            <div class="tp-main">
              <div class="tp-head">
                <div class="tp-id">
                  <span class="tp-cat">{{ top.categoryName }} · {{ top.breed || '—' }}</span>
                  <h3>{{ top.petName }}</h3>
                  <div class="tp-price">
                    ¥{{ formatPrice(top.price) }}
                    <em>月均养护约 ¥{{ Math.round(top.monthlyCost) }}</em>
                  </div>
                </div>
                <div class="score-ring" :style="ringStyle(top.score)">
                  <div class="ring-inner">
                    <strong>{{ top.score }}</strong>
                    <span>匹配度</span>
                  </div>
                </div>
              </div>

              <div class="dims">
                <div v-for="(v, k) in top.breakdown" :key="k" class="dim">
                  <span class="dim-name">{{ k }}</span>
                  <div class="dim-bar"><i :style="{ width: v + '%', background: dimColor(v) }"></i></div>
                  <span class="dim-val">{{ v }}</span>
                </div>
              </div>

              <div class="reason-block">
                <span class="rb-title">为什么推荐它</span>
                <div class="reasons">
                  <span v-for="r in top.reasons || []" :key="r" class="reason">{{ r }}</span>
                  <span v-if="!(top.reasons || []).length" class="reason">综合维度最接近你的画像</span>
                </div>
              </div>

              <div v-if="(top.traits || []).length || (top.cautions || []).length" class="tp-tags">
                <span v-for="t in top.traits || []" :key="t" class="tag">{{ t }}</span>
                <span v-for="c in top.cautions || []" :key="c" class="tag caution">注意：{{ c }}</span>
              </div>

              <div class="tp-actions">
                <el-button type="primary" size="large" round @click="goDetail(top.petId)">查看详情</el-button>
                <el-button size="large" round @click="goDetail(top.petId)">预约看宠</el-button>
              </div>
            </div>
          </div>

          <!-- 其他推荐 -->
          <template v-if="rest.length">
            <SectionHead title="其他高匹配推荐" :desc="`按匹配度排序，共 ${rest.length} 只`" />
            <div class="cards">
              <PetMiniCard
                v-for="p in rest"
                :key="p.petId"
                :to="'/shop/pet/' + p.petId"
                :image="isImg(p.image) ? p.image : ''"
                :placeholder="p.categoryName"
                :name="p.petName"
                :sub="p.breed && p.breed !== p.petName ? p.breed : ''"
                :meta="p.categoryName"
                :price="p.price"
                :corner="p.score + '%'"
              >
                <p class="card-reason">{{ (p.reasons && p.reasons[0]) || '综合维度匹配' }}</p>
              </PetMiniCard>
            </div>
          </template>

          <p class="foot-note">
            匹配结果由后端算法实时计算：六维画像打分占 72%~84%，相似用户行为占 12%~16%，全站人气占 12%~16%。
          </p>
        </template>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { recommendPet } from '@/api/pet/petMatch'
import { aiParse } from '@/api/pet/petAi'
import ShopHero from '@/components/shop/ShopHero.vue'
import SectionHead from '@/components/shop/SectionHead.vue'
import PetMiniCard from '@/components/shop/PetMiniCard.vue'
import { STEPS, AI_EXAMPLES, ANALYZE_TEXTS } from './matchData'

const router = useRouter()

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

const totalCount = computed(() => STEPS.reduce((n, s) => n + s.questions.length, 0))
const doneCount = computed(() => Object.keys(answers).filter((k) => answers[k]).length)
const allDone = computed(() => STEPS.every((s) => s.questions.every((q) => !!answers[q.key])))
const progress = computed(() => Math.round((doneCount.value / totalCount.value) * 100))
const top = computed(() => (result.value?.recommendations?.[0] || {}))
const rest = computed(() => (result.value?.recommendations || []).slice(1))

function groupDone(g) {
  return g.questions.filter((q) => !!answers[q.key]).length
}
function pad(n) {
  return String(n).padStart(2, '0')
}

/* ---------- AI 一句话自动填答 ---------- */
const aiText = ref('')
const aiFilling = ref(false)
const aiHint = ref('')

function useExample(t) {
  aiText.value = t
  aiFill()
}

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
    aiHint.value = `已识别「${data.summary || '你的需求'}」，自动填好 ${filled}/${totalCount.value} 项 · ${how}`
  } catch (e) {
    ElMessage.error('解析失败，请重试或手动答题')
  } finally {
    aiFilling.value = false
  }
}

/* ---------- 提交 ---------- */
function startAnalyzeText() {
  let i = 0
  analyzeText.value = ANALYZE_TEXTS[0]
  return setInterval(() => {
    i = (i + 1) % ANALYZE_TEXTS.length
    analyzeText.value = ANALYZE_TEXTS[i]
  }, 900)
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
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (e) {
    ElMessage.error('匹配失败，请稍后重试')
  } finally {
    clearInterval(timer)
    loading.value = false
  }
}

function restart() {
  result.value = null
  Object.keys(answers).forEach((k) => (answers[k] = ''))
  aiHint.value = ''
  aiText.value = ''
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function goDetail(id) {
  router.push('/shop/pet/' + id)
}

function formatPrice(p) {
  return Number(p || 0).toLocaleString('zh-CN')
}

function isImg(s) {
  return !!s && (s.indexOf('/') === 0 || s.indexOf('http') === 0)
}

function ringStyle(score) {
  const pct = Math.max(0, Math.min(100, Number(score) || 0))
  return {
    background: `conic-gradient(var(--brand-600) 0% ${pct}%, var(--brand-100) ${pct}% 100%)`
  }
}

function dimColor(v) {
  if (v >= 80) return 'var(--brand-500)'
  if (v >= 60) return 'var(--warning-500)'
  return 'var(--danger-500)'
}
</script>

<style scoped lang="scss">
.match-page {
  background: var(--bg-page);
  min-height: 100%;
  padding-bottom: 64px;
}

.page-body {
  position: relative;
  z-index: 2;
  max-width: var(--container-md);
  margin: -28px auto 0;
  padding: 0 24px;
}

/* ---------- Hero 右侧说明卡 ---------- */
.hero-panel {
  padding: 20px 22px;
  background: var(--bg-card);
  border: 1px solid var(--border-1);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.hp-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-1);
}

.hp-list {
  display: flex;
  gap: 28px;
  margin: 14px 0 0;

  div { min-width: 0; }

  dt {
    font-size: 26px;
    font-weight: 700;
    line-height: 1.1;
    letter-spacing: -0.02em;
    color: var(--brand-700);
    font-variant-numeric: tabular-nums;
  }
  dd {
    margin: 4px 0 0;
    font-size: 12.5px;
    color: var(--text-3);
  }
}

.hp-note {
  margin: 16px 0 0;
  padding-top: 14px;
  border-top: 1px solid var(--border-2);
  font-size: 12.5px;
  line-height: 1.7;
  color: var(--text-3);
}

/* ---------- 一句话填答 ---------- */
.ai-fill {
  padding: 20px 22px;
  background: var(--bg-card);
  border: 1px solid var(--border-1);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.af-head {
  h2 {
    margin: 8px 0 4px;
    font-size: 17px;
    font-weight: 700;
    color: var(--text-1);
  }
  p {
    margin: 0 0 14px;
    font-size: 13px;
    line-height: 1.7;
    color: var(--text-3);
  }
}

.af-badge {
  display: inline-block;
  padding: 3px 9px;
  background: var(--brand-50);
  border: 1px solid var(--brand-100);
  border-radius: var(--radius-xs);
  font-size: 11.5px;
  font-weight: 600;
  color: var(--brand-700);
}

.af-row {
  display: flex;
  gap: 10px;
  align-items: center;

  :deep(.el-input) { flex: 1; }
}

.af-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 12px 0 0;
  padding: 8px 12px;
  background: var(--success-50);
  border-radius: var(--radius-sm);
  font-size: 12.5px;
  color: var(--success-500);

  .el-icon { font-size: 14px; }
}

.af-go {
  margin-left: auto;
  padding: 0;
  background: none;
  border: 0;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--brand-700);
  cursor: pointer;

  &:hover { text-decoration: underline; }
}

.af-examples {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
}

.af-ex-label {
  font-size: 11.5px;
  color: var(--text-3);
}

.af-ex {
  padding: 5px 10px;
  background: var(--bg-page);
  border: 1px solid var(--border-1);
  border-radius: var(--radius-pill);
  font-family: inherit;
  font-size: 12px;
  color: var(--text-2);
  cursor: pointer;
  transition: border-color 0.16s, color 0.16s, background 0.16s;

  &:hover {
    border-color: var(--brand-300);
    background: var(--brand-50);
    color: var(--brand-700);
  }
}

/* ---------- 问卷卡 ---------- */
.quiz-card {
  margin-top: 16px;
  padding: 22px 24px 0;
  background: var(--bg-card);
  border: 1px solid var(--border-1);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.qz-top {
  display: flex;
  align-items: center;
  gap: 18px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-2);
}

.qz-meta {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-shrink: 0;

  b {
    font-size: 15px;
    font-weight: 700;
    color: var(--text-1);
  }
  span {
    font-size: 12px;
    color: var(--text-3);
    font-variant-numeric: tabular-nums;
  }
}

.qz-bar {
  flex: 1;
  height: 5px;
  background: var(--bg-sunken);
  border-radius: var(--radius-pill);
  overflow: hidden;

  i {
    display: block;
    height: 100%;
    border-radius: var(--radius-pill);
    background: var(--brand-600);
    transition: width 0.3s ease;
  }
}

/* ---------- 分组 ---------- */
.group {
  padding: 20px 0 8px;

  & + .group { border-top: 1px solid var(--border-2); }
}

.g-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 4px;
}

.g-no {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--brand-50);
  font-size: 11px;
  font-weight: 700;
  color: var(--brand-700);
  font-variant-numeric: tabular-nums;
}

.g-text {
  display: flex;
  align-items: baseline;
  gap: 10px;
  min-width: 0;

  b {
    font-size: 14.5px;
    font-weight: 700;
    color: var(--text-1);
  }
  span {
    font-size: 12.5px;
    color: var(--text-3);
  }
}

.g-done {
  margin-left: auto;
  flex-shrink: 0;
  padding: 2px 9px;
  border-radius: var(--radius-pill);
  background: var(--bg-page);
  font-size: 11.5px;
  color: var(--text-3);
  font-variant-numeric: tabular-nums;

  &.full {
    background: var(--brand-50);
    color: var(--brand-700);
  }
}

/* ---------- 单题 ---------- */
.q {
  padding: 16px 0 4px 36px;

  & + .q { border-top: 1px dashed var(--border-2); }
}

.q-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 10px;
  margin-bottom: 10px;
}

.q-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-1);
}

.q-hint {
  font-size: 12px;
  color: var(--text-3);
}

.q-opts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 8px;
}

.opt {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 9px 12px;
  background: var(--bg-card);
  border: 1px solid var(--border-1);
  border-radius: var(--radius-md);
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.14s, background 0.14s, box-shadow 0.14s;

  &:hover {
    border-color: var(--brand-300);
    background: var(--brand-50);
  }

  &.on {
    border-color: var(--brand-600);
    background: var(--brand-50);
    box-shadow: inset 0 0 0 1px var(--brand-600);
  }
}

.opt-main {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13.5px;
  font-weight: 600;
  line-height: 1.45;
  color: var(--text-1);
}

.opt-check {
  font-size: 12px;
  color: var(--brand-600);
}

.opt-sub {
  font-size: 11.5px;
  line-height: 1.5;
  color: var(--text-3);
}

/* ---------- 底部操作 ---------- */
.qz-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin: 18px -24px 0;
  padding: 14px 24px;
  border-top: 1px solid var(--border-2);
  background: var(--bg-page);
  border-radius: 0 0 var(--radius-lg) var(--radius-lg);
}

.qz-tip {
  font-size: 12.5px;
  color: var(--text-3);

  &.done { color: var(--brand-700); font-weight: 600; }
}

/* ---------- 分析中 ---------- */
.analyzing {
  padding: 80px 20px;
  text-align: center;

  h3 {
    margin: 0 0 8px;
    font-size: 17px;
    font-weight: 700;
    color: var(--text-1);
  }
  p {
    margin: 0;
    font-size: 13px;
    color: var(--text-3);
  }
}

.scan-ring {
  width: 56px;
  height: 56px;
  margin: 0 auto 22px;
  border-radius: 50%;
  border: 3px solid var(--brand-100);
  border-top-color: var(--brand-600);
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ---------- 结果 ---------- */
.result-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  flex-wrap: wrap;
  padding: 20px 22px;
  background: var(--bg-card);
  border: 1px solid var(--border-1);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.rh-eyebrow {
  display: inline-block;
  padding: 3px 9px;
  background: var(--brand-50);
  border-radius: var(--radius-xs);
  font-size: 11.5px;
  font-weight: 600;
  color: var(--brand-700);
}

.rh-text h2 {
  margin: 10px 0 6px;
  font-size: 19px;
  font-weight: 700;
  line-height: 1.5;
  color: var(--text-1);
}

.rh-algo {
  margin: 0;
  font-size: 12px;
  line-height: 1.7;
  color: var(--text-3);

  .on { color: var(--success-500); }
}

.top-pick {
  display: grid;
  grid-template-columns: 360px minmax(0, 1fr);
  margin-top: 16px;
  background: var(--bg-card);
  border: 1px solid var(--border-1);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.tp-image {
  position: relative;
  min-height: 340px;
  background: var(--bg-sunken);
  cursor: pointer;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
}

// 数据库里部分宠物没有实拍图（image 存的是分类 emoji），降级为分类名占位
.tp-holder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;

  span {
    padding: 8px 16px;
    background: var(--bg-card);
    border: 1px solid var(--border-1);
    border-radius: var(--radius-pill);
    font-size: 13px;
    color: var(--text-3);
  }
}

.tp-crown {
  position: absolute;
  left: 14px;
  top: 14px;
  padding: 5px 11px;
  background: var(--brand-600);
  border-radius: var(--radius-pill);
  font-size: 11.5px;
  font-weight: 600;
  color: #fff;
}

.tp-main {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px 26px;
  min-width: 0;
}

.tp-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.tp-id { min-width: 0; }

.tp-cat {
  font-size: 12px;
  color: var(--text-3);
}

.tp-id h3 {
  margin: 4px 0 8px;
  font-size: 24px;
  font-weight: 700;
  color: var(--text-1);
}

.tp-price {
  font-size: 22px;
  font-weight: 700;
  color: var(--price);
  font-variant-numeric: tabular-nums;

  em {
    margin-left: 8px;
    font-style: normal;
    font-size: 12px;
    font-weight: 400;
    color: var(--text-3);
  }
}

.score-ring {
  display: grid;
  place-items: center;
  width: 86px;
  height: 86px;
  flex-shrink: 0;
  border-radius: 50%;
}

.ring-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 68px;
  height: 68px;
  background: var(--bg-card);
  border-radius: 50%;

  strong {
    font-size: 22px;
    font-weight: 700;
    line-height: 1;
    color: var(--brand-700);
    font-variant-numeric: tabular-nums;
  }
  span {
    margin-top: 2px;
    font-size: 10.5px;
    color: var(--text-3);
  }
}

.dims {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px 22px;
  padding: 13px 16px;
  background: var(--bg-page);
  border-radius: var(--radius-md);
}

.dim {
  display: flex;
  align-items: center;
  gap: 9px;
}

.dim-name {
  flex-shrink: 0;
  width: 42px;
  font-size: 12px;
  color: var(--text-3);
}

.dim-bar {
  flex: 1;
  height: 6px;
  background: var(--bg-sunken);
  border-radius: var(--radius-pill);
  overflow: hidden;

  i {
    display: block;
    height: 100%;
    border-radius: var(--radius-pill);
  }
}

.dim-val {
  width: 24px;
  flex-shrink: 0;
  text-align: right;
  font-size: 11.5px;
  color: var(--text-2);
  font-variant-numeric: tabular-nums;
}

.reason-block {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;

  .rb-title {
    font-size: 12.5px;
    font-weight: 600;
    color: var(--text-1);
  }
}

.reasons {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.reason {
  padding: 3px 9px;
  background: var(--success-50);
  border: 1px solid var(--success-100);
  border-radius: var(--radius-xs);
  font-size: 12px;
  color: var(--success-500);
}

.tp-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag {
  padding: 3px 9px;
  background: var(--bg-page);
  border-radius: var(--radius-xs);
  font-size: 12px;
  color: var(--text-2);

  &.caution {
    background: var(--warning-50);
    color: var(--warning-500);
  }
}

.tp-actions {
  display: flex;
  gap: 10px;
  margin-top: auto;
  padding-top: 2px;
}

.more-title {
  margin: 28px 0 14px;
  font-size: 16px;
  font-weight: 700;
  color: var(--text-1);
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(220px, 100%), 1fr));
  gap: 14px;
}

.card-reason {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--success-500);
}

/* ---------- 空结果 ---------- */
.empty-result {
  margin-top: 16px;
  padding: 56px 24px;
  text-align: center;
  background: var(--bg-card);
  border: 1px solid var(--border-1);
  border-radius: var(--radius-lg);

  h3 {
    margin: 14px 0 8px;
    font-size: 16px;
    font-weight: 700;
    color: var(--text-1);
  }
  p {
    margin: 0 0 8px;
    font-size: 13px;
    color: var(--text-3);
  }
}

.er-ico {
  font-size: 30px;
  color: var(--text-4);
}

.er-tips {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-width: 460px;
  margin: 0 auto 8px;
  line-height: 1.7;
  color: var(--text-2);
}

.er-stat {
  margin-bottom: 22px;
  font-size: 12px;
  color: var(--text-3);

  em {
    font-style: normal;
    color: var(--warning-500);
  }
}

.foot-note {
  margin-top: 24px;
  text-align: center;
  font-size: 12px;
  line-height: 1.75;
  color: var(--text-3);
}

/* ---------- 响应式 ---------- */
@media (max-width: 1000px) {
  .top-pick { grid-template-columns: minmax(0, 1fr); }

  .tp-image {
    min-height: 0;
    aspect-ratio: 16 / 10;
    max-height: min(240px, 30vh);
  }

  .dims { grid-template-columns: minmax(0, 1fr); }
}

@media (max-width: 768px) {
  .page-body {
    margin-top: -20px;
    padding: 0 16px;
  }

  .ai-fill { padding: 16px; }

  .af-row {
    flex-direction: column;
    align-items: stretch;

    :deep(.el-button) { width: 100%; }
  }

  .quiz-card {
    padding: 18px 16px 0;
  }

  .qz-top {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .q { padding-left: 0; }

  .q-opts { grid-template-columns: repeat(auto-fit, minmax(132px, 1fr)); }

  .qz-foot {
    margin: 16px -16px 0;
    padding: 12px 16px;

    :deep(.el-button) { width: 100%; }
  }

  .tp-main { padding: 18px 16px; }
  .tp-id h3 { font-size: 21px; }

  .tp-actions {
    :deep(.el-button) { flex: 1; margin: 0; }
  }

  .result-head { padding: 16px; }
}
</style>
