<template>
  <div class="match-page">
    <header class="m-head">
      <div class="mh-inner">
        <div class="mh-main">
          <p class="mh-eyebrow">Smart Match</p>
          <h1>智能选宠</h1>
          <p class="mh-sub">10 个条件 → 六维画像 → 与在售个体逐维扣分。评分只用规则引擎与站内行为，没有黑盒。</p>
        </div>
        <div class="mh-stats">
          <div><b>{{ candidateCount }}</b><span>在售个体</span></div>
          <div><b>{{ totalCount }}</b><span>道题 · 3 组</span></div>
          <div><b>8</b><span>只上限</span></div>
        </div>
      </div>
    </header>

    <div class="m-body">
      <!-- ================= 问卷 ================= -->
      <div v-show="!result && !loading" class="wz">
        <aside class="side">
          <div class="panel">
            <div class="panel-h">
              <b>你的画像</b><span>{{ doneCount }} / {{ totalCount }}</span>
            </div>
            <div class="pf">
              <div v-for="r in profileRows" :key="r.label">
                <span>{{ r.label }}</span>
                <b :class="{ none: !r.filled }">{{ r.filled ? r.value : '未选' }}</b>
              </div>
            </div>
            <div class="pbar"><i :style="{ width: progress + '%' }"></i></div>
          </div>
          <p class="side-note">画像与后端 Profile 一一对应：空间 / 运动 / 经验 / 陪伴 / 噪音 / 预算。</p>
        </aside>

        <section class="main">
          <div class="stepnav">
            <button
              v-for="(g, i) in STEPS"
              :key="g.key"
              type="button"
              :class="{ on: step === i, done: groupAll(g) }"
              @click="step = i"
            >
              <b>{{ pad(i + 1) }}</b><span>{{ g.title }}</span>
            </button>
          </div>

          <div class="card qcard">
            <div class="qgroup-h">
              <b>{{ curGroup.title }}</b><span>{{ curGroup.questions.length }} 题</span>
            </div>

            <div class="q-body">
              <div v-for="q in curGroup.questions" :key="q.key" class="q">
                <div class="qt">
                  <i>Q{{ qIndex[q.key] }}</i>{{ q.title }}
                  <span v-if="q.hint">{{ q.hint }}</span>
                </div>
                <div class="opts">
                  <button
                    v-for="o in q.options"
                    :key="o.value"
                    type="button"
                    class="opt"
                    :class="{ on: answers[q.key] === o.value }"
                    @click="answers[q.key] = o.value"
                  >
                    <b>{{ o.label }}</b>
                    <em v-if="o.desc">{{ o.desc }}</em>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="qfoot">
            <span class="tip">{{ curLeft ? `这一步还有 ${curLeft} 题未选` : '这一步已完成' }}</span>
            <button type="button" class="btn btn--ghost" :disabled="step === 0" @click="step--">上一步</button>
            <button type="button" class="btn btn--solid" @click="next">
              {{ step === STEPS.length - 1 ? '生成匹配结果' : '下一步' }}
            </button>
          </div>
        </section>
      </div>

      <!-- ================= 分析中 ================= -->
      <div v-if="loading" class="analyzing">
        <div class="spin"></div>
        <h3>正在比对在售个体</h3>
        <p>{{ analyzeText }}</p>
      </div>

      <!-- ================= 结果 ================= -->
      <div v-if="result && !loading" class="result">
        <!-- 无结果：按 diagnosis.rootCause 分三态 -->
        <template v-if="!recommendations.length">
          <div class="card empty">
            <div class="ico">!</div>

            <template v-if="diag && diag.rootCause === 'prefer'">
              <h3>「{{ preferName(diag.prefer) }}」目前没有在售个体</h3>
              <p class="cause">
                {{ diag.total }} 只在售个体里，有 <span class="num">{{ diag.byPrefer }}</span> 只被类型条件排除，剩下 0 只。
                换一个类型就能看到推荐。
              </p>
              <div class="acts">
                <button type="button" class="btn btn--solid" @click="loosenType">改成「不限」重算</button>
              </div>
            </template>

            <template v-else-if="diag && diag.rootCause === 'kids'">
              <h3>有小孩的前提下没有可选个体</h3>
              <p class="cause">
                类型筛选后剩 {{ diag.total - diag.byPrefer }} 只，其中
                <span class="num">{{ diag.byKids }}</span> 只没有标注「适合儿童」。
                建议联系客服了解性情温和的个体。
              </p>
              <div class="acts">
                <button type="button" class="btn btn--line" @click="goConsult">联系客服</button>
              </div>
            </template>

            <template v-else>
              <h3>预算内没有可选个体</h3>
              <p class="cause">
                符合其他条件的个体最低价约
                <span class="num">¥{{ fmt(diag && diag.lowestPrice) }}</span>，
                高于你的购宠预算 ¥{{ fmt(answers.budget) }}。
                <template v-if="diag && diag.byPrefer">你偏好的类型里没有更便宜的选择。</template>
              </p>
              <div class="acts">
                <button
                  v-if="diag && diag.lowestPrice"
                  type="button"
                  class="btn btn--solid"
                  @click="raiseBudget"
                >上调预算到 ¥{{ fmt(nextBudget) }}</button>
                <button type="button" class="btn btn--line" @click="goConsult">联系客服</button>
              </div>
            </template>
          </div>
          <p class="foot-note">本次测评已记录，会作为选品参考。</p>
        </template>

        <template v-else>
          <div class="card summary">
            <p>{{ result.summary }}</p>
            <p class="sub">
              共比对 {{ result.candidateCount }} 只在售个体 ·
              <template v-if="result.hasHistory">
                已登录，协同过滤生效（内容 72% + 相似用户 16% + 人气 12%）
              </template>
              <template v-else>
                游客模式，不含协同过滤（内容 84% + 人气 16%）
              </template>
            </p>
          </div>

          <div class="top card">
            <div class="top-img">
              <img v-if="isImg(top.image)" :src="top.image" :alt="top.petName" />
              <span v-else class="ph">{{ top.categoryName }} · 暂无实拍图</span>
              <span class="rk">TOP 1</span>
            </div>

            <div class="top-main">
              <div class="tp-row">
                <div class="tp-title">
                  <h3>
                    {{ top.petName }}
                    <span v-if="top.breed" class="ui-chip">{{ top.breed }}</span>
                  </h3>
                  <div class="tp-info">
                    {{ top.categoryName }}<template v-if="top.age"> · {{ top.age }}</template>
                    <template v-if="top.gender !== undefined"> · {{ genderText(top.gender) }}</template>
                  </div>
                  <div class="tp-price">
                    ¥{{ fmt(top.price) }}<em>月均 ¥{{ fmt(top.monthlyCost) }}</em>
                  </div>
                </div>
                <div class="tp-score">
                  <b>{{ top.score }}<i>%</i></b>
                  <span>{{ top.matchLevel }}</span>
                </div>
              </div>

              <div class="blk">
                <div class="blk-h"><b>匹配度是这么算的</b><span>权重合计 100%</span></div>

                <div class="srow">
                  <span class="n">内容契合</span>
                  <div class="bar"><i :style="{ width: (top.contentScore || 0) + '%' }"></i></div>
                  <span class="v">{{ top.contentScore }}</span>
                  <span class="w">{{ result.hasHistory ? 72 : 84 }}%</span>
                </div>

                <div class="srow" :class="{ muted: !result.hasHistory }">
                  <span class="n">相似用户</span>
                  <div class="bar"><i :style="{ width: (top.cfScore || 0) + '%' }"></i></div>
                  <span class="v">{{ result.hasHistory ? top.cfScore : '—' }}</span>
                  <span class="w">{{ result.hasHistory ? 16 : 0 }}%</span>
                </div>

                <div class="srow">
                  <span class="n">全站人气</span>
                  <div class="bar"><i :style="{ width: (top.popularityScore || 0) + '%' }"></i></div>
                  <span class="v">{{ top.popularityScore }}</span>
                  <span class="w">{{ result.hasHistory ? 12 : 16 }}%</span>
                </div>
              </div>

              <div class="blk">
                <div class="blk-h"><b>七维评分</b><span>六维画像 + 全站人气，共七项</span></div>
                <div class="dims">
                  <div
                    v-for="(v, k) in top.breakdown"
                    :key="k"
                    class="dim"
                    :class="{ low: v < 60 }"
                  >
                    <span class="dim-h"><span class="dl">{{ k }}</span><b>{{ v }}</b></span>
                    <div class="dbar"><i :style="{ width: Math.max(4, Math.min(100, v)) + '%' }"></i></div>
                  </div>
                </div>
              </div>

              <div class="two">
                <div class="tagbox good">
                  <b>适合你</b>
                  <div class="tags">
                    <span v-for="r in top.reasons || []" :key="r" class="tag">{{ r }}</span>
                    <span v-if="!(top.reasons || []).length" class="tag">综合维度接近画像</span>
                  </div>
                </div>
                <div class="tagbox warn">
                  <b>要注意</b>
                  <div class="tags">
                    <span v-for="c in top.cautions || []" :key="c" class="tag w">{{ c }}</span>
                    <span v-if="!(top.cautions || []).length" class="tag">暂无硬性风险项</span>
                  </div>
                </div>
              </div>

              <div class="tp-act">
                <button type="button" class="btn btn--solid" @click="goDetail(top.petId)">查看详情</button>
                <button type="button" class="btn btn--line" @click="fav(top)">收藏</button>
                <span class="act-note">收藏会进入协同过滤，影响下次推荐</span>
              </div>
            </div>
          </div>

          <template v-if="rest.length">
            <div class="rethead">
              <h2>其余 {{ rest.length }} 只（上限 8 只）</h2>
              <span>按综合分降序</span>
            </div>
            <div class="rlist">
              <div
                v-for="p in rest"
                :key="p.petId"
                class="rrow"
                @click="goDetail(p.petId)"
              >
                <span class="no">{{ pad(p.rank) }}</span>
                <span class="nm">
                  <b>{{ p.petName }}</b>
                  <span>{{ p.categoryName }} · {{ p.matchLevel }}</span>
                </span>
                <span class="why">{{ (p.reasons && p.reasons[0]) || '综合维度匹配' }}</span>
                <span class="pr">¥{{ fmt(p.price) }}</span>
                <span class="sc">{{ p.score }}%</span>
                <span class="go">查看 ›</span>
              </div>
            </div>
            <p class="foot-note">
              游客无协同过滤，因此「相似用户」一栏为 —。登录后同一套答案的排序会变。
            </p>
          </template>

          <div class="redo">
            <button type="button" class="btn btn--line" @click="reset">重新测评</button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { recommendPet } from '@/api/pet/petMatch'
import { addPetFavorite } from '@/api/pet/petFavorite'
import { useUserStore } from '@/store/modules/user'
import { STEPS } from './matchData'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const result = ref(null)
const step = ref(0)
const analyzeText = ref('计算空间 / 运动 / 照料 / 经验 / 噪音 五维扣分…')

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

/* ---------- 进度 ---------- */
const totalCount = computed(() => STEPS.reduce((n, s) => n + s.questions.length, 0))
const doneCount = computed(() => Object.keys(answers).filter((k) => answers[k]).length)
const progress = computed(() => Math.round((doneCount.value / totalCount.value) * 100))
const allDone = computed(() => STEPS.every((s) => s.questions.every((q) => !!answers[q.key])))

const curGroup = computed(() => STEPS[step.value])
const curLeft = computed(
  () => curGroup.value.questions.filter((q) => !answers[q.key]).length
)

const qIndex = computed(() => {
  const m = {}
  let n = 0
  for (const g of STEPS) {
    for (const q of g.questions) {
      n++
      m[q.key] = n
    }
  }
  return m
})

function groupAll(g) {
  return g.questions.every((q) => !!answers[q.key])
}

/* ---------- 画像（与后端 Profile.of 同口径） ---------- */
const profile = computed(() => {
  const a = answers
  return {
    space: a.home === 'small' ? 1 : a.home === 'house' ? 3 : 2,
    activity: a.activity === 'low' ? 1 : a.activity === 'high' ? 3 : 2,
    experience: a.experience === 'none' ? 1 : a.experience === 'pro' ? 3 : 2,
    time: a.time === 'lt1' ? 1 : a.time === 'gt3' ? 3 : 2,
    noiseTol: a.noise === 'low' ? 1 : a.noise === 'high' ? 3 : 2
  }
})

const profileRows = computed(() => {
  const a = answers
  const p = profile.value
  return [
    { label: '居住空间', filled: !!a.home, value: ['小户型', '普通住宅', '大房子'][p.space - 1] },
    { label: '活动量', filled: !!a.activity, value: ['宅家', '偶尔运动', '每天运动'][p.activity - 1] },
    { label: '每日陪伴', filled: !!a.time, value: ['< 1 小时', '1 ~ 3 小时', '3 小时以上'][p.time - 1] },
    { label: '养宠经验', filled: !!a.experience, value: ['第一次', '养过 1-2 只', '多年'][p.experience - 1] },
    { label: '噪音容忍', filled: !!a.noise, value: ['不能接受', '一般', '无所谓'][p.noiseTol - 1] },
    { label: '购宠预算', filled: !!a.budget, value: budgetText(a.budget) },
    { label: '月均养护', filled: !!a.monthly, value: budgetText(a.monthly) }
  ]
})

function budgetText(v) {
  const n = Number(v)
  return !v || n >= 99999 ? '不限' : `¥${n.toLocaleString('zh-CN')}`
}

/* ---------- 结果 ---------- */
const recommendations = computed(() => result.value?.recommendations || [])
const top = computed(() => recommendations.value[0] || {})
const rest = computed(() => recommendations.value.slice(1))
const diag = computed(() => result.value?.diagnosis || null)
const candidateCount = computed(() => result.value?.candidateCount ?? '—')
const nextBudget = computed(() => {
  const low = diag.value?.lowestPrice
  if (!low) return ''
  return Math.ceil(low / 1000) * 1000
})

/* ---------- 提交 ---------- */
const ANALYZE_TEXTS = [
  '计算空间 / 运动 / 照料 / 经验 / 噪音 五维扣分…',
  '叠加购宠与月均预算的软性约束…',
  '计算协同过滤与全站人气权重…',
  '按综合分排序，取前 8 只…'
]

function next() {
  if (curLeft.value) {
    ElMessage.warning(`这一步还有 ${curLeft.value} 题没选`)
    return
  }
  if (step.value < STEPS.length - 1) {
    step.value++
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }
  submit()
}

async function submit() {
  if (!allDone.value) {
    ElMessage.warning('还有问题没有回答完')
    return
  }
  loading.value = true
  result.value = null
  let i = 0
  const timer = setInterval(() => {
    i = (i + 1) % ANALYZE_TEXTS.length
    analyzeText.value = ANALYZE_TEXTS[i]
  }, 480)

  try {
    const res = await recommendPet({ ...answers })
    result.value = res.data || {}
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (e) {
    ElMessage.error('匹配失败，请稍后重试')
  } finally {
    clearInterval(timer)
    loading.value = false
  }
}

function loosenType() {
  answers.prefer = 'any'
  submit()
}

function raiseBudget() {
  if (!nextBudget.value) return
  answers.budget = String(nextBudget.value)
  submit()
}

function reset() {
  result.value = null
  step.value = 0
  Object.keys(answers).forEach((k) => (answers[k] = ''))
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

/* ---------- 跳转 / 收藏 ---------- */
function goDetail(id) {
  router.push('/shop/pet/' + id)
}
function goConsult() {
  router.push('/shop/consult')
}

async function fav(pet) {
  if (!userStore.token) {
    ElMessage.info('请先登录后再收藏')
    return
  }
  try {
    await addPetFavorite({ petId: pet.petId, userId: userStore.userId })
    ElMessage.success('收藏成功，会影响下次推荐的协同得分')
  } catch (e) {
    ElMessage.error('收藏失败，请稍后重试')
  }
}

/* ---------- 展示工具 ---------- */
function pad(n) {
  return String(n).padStart(2, '0')
}
function fmt(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n.toLocaleString('zh-CN') : '—'
}
function isImg(s) {
  return !!s && (s.indexOf('/') === 0 || s.indexOf('http') === 0)
}
function genderText(g) {
  return String(g) === '0' ? '公' : String(g) === '1' ? '母' : '未知'
}
function preferName(id) {
  return { 1: '猫科', 2: '犬科', 3: '兔科', 4: '啮齿', 5: '鸟类', 6: '水族', 7: '爬行' }[id] || '所选类型'
}
</script>

<style scoped lang="scss">
.match-page {
  background: var(--bg-page);
  min-height: 100%;
  padding-bottom: 56px;

  button { font-family: inherit; }
}

/* ---------- 页头 ---------- */
.m-head {
  background: var(--bg-card);
  border-bottom: 1px solid var(--border-1);
}

.mh-inner {
  display: flex;
  align-items: flex-end;
  gap: 24px;
  flex-wrap: wrap;
  max-width: 1160px;
  margin: 0 auto;
  padding: 24px 24px 20px;
}

.mh-main {
  flex: 1;
  min-width: 0;
}

.mh-eyebrow {
  margin: 0 0 8px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--text-3);
}

.mh-main h1 {
  margin: 0;
  font-size: 26px;
  line-height: 1.25;
  font-weight: 650;
  letter-spacing: -0.01em;
  color: var(--text-1);
}

.mh-sub {
  margin: 7px 0 0;
  max-width: 46em;
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-3);
}

.mh-stats {
  display: flex;
  gap: 22px;
  flex-shrink: 0;

  div { text-align: right; }

  b {
    display: block;
    font-size: 19px;
    font-weight: 650;
    line-height: 1.2;
    color: var(--brand-700);
    font-variant-numeric: tabular-nums;
  }

  span {
    font-size: 10.5px;
    color: var(--text-3);
  }
}

/* ---------- 主体 ---------- */
.m-body {
  max-width: 1160px;
  margin: 0 auto;
  padding: 16px 24px 0;
}

/* ---------- 问卷布局 ---------- */
.wz {
  display: grid;
  grid-template-columns: 236px minmax(0, 1fr);
  gap: 24px;
  align-items: start;
  padding-bottom: 40px;
}

.side {
  position: sticky;
  top: 72px;
}

.panel {
  padding: 14px 15px;
  background: var(--bg-card);
  border: 1px solid var(--border-1);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
}

.panel-h {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 2px;

  b {
    font-size: 12.5px;
    font-weight: 700;
    color: var(--text-1);
  }

  span {
    font-size: 10.5px;
    color: var(--text-3);
    font-variant-numeric: tabular-nums;
  }
}

.pf {
  > div {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
    padding: 7px 0;
    border-bottom: 1px dashed var(--border-2);

    &:last-child { border-bottom: 0; }
  }

  span {
    flex-shrink: 0;
    font-size: 11px;
    color: var(--text-3);
  }

  b {
    font-size: 11.5px;
    font-weight: 600;
    color: var(--text-1);
    text-align: right;

    &.none {
      font-weight: 400;
      color: var(--text-4);
    }
  }
}

.pbar {
  height: 4px;
  margin-top: 12px;
  background: var(--bg-sunken);
  border-radius: var(--radius-pill);
  overflow: hidden;

  i {
    display: block;
    height: 100%;
    border-radius: var(--radius-pill);
    background: var(--brand-600);
    transition: width 0.3s;
  }
}

.side-note {
  margin: 11px 0 0;
  font-size: 10.5px;
  line-height: 1.7;
  color: var(--text-4);
}

.main { min-width: 0; }

.stepnav {
  display: flex;
  gap: 4px;
  margin-bottom: 12px;

  button {
    display: flex;
    align-items: center;
    gap: 7px;
    flex: 1;
    padding: 8px 10px;
    background: var(--bg-card);
    border: 1px solid var(--border-1);
    border-radius: var(--radius-sm);
    font-size: 11.5px;
    color: var(--text-2);
    cursor: pointer;
    transition: 0.15s;

    b {
      font-family: var(--font-num);
      font-size: 10px;
      font-weight: 600;
      color: var(--text-4);
    }

    &.done {
      border-color: var(--brand-200);
      background: var(--brand-50);
      color: var(--brand-700);

      b { color: var(--brand-600); }
    }

    &.on {
      border-color: var(--brand-600);
      box-shadow: inset 0 0 0 1px var(--brand-600);
      color: var(--brand-800);
      font-weight: 600;

      b { color: var(--brand-700); }
    }
  }
}

.card {
  background: var(--bg-card);
  border: 1px solid var(--border-1);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.qcard { padding: 20px 22px 8px; }

.qgroup-h {
  display: flex;
  align-items: baseline;
  gap: 9px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-2);

  b {
    font-size: 14.5px;
    font-weight: 700;
    color: var(--text-1);
  }

  span {
    font-size: 11px;
    color: var(--text-3);
  }
}

/* 定高：切换步骤时页面不跳动 */
.q-body {
  height: 404px;
  padding-right: 2px;
  overflow-y: auto;
}

.q {
  padding: 15px 0 6px;

  & + .q { border-top: 1px dashed var(--border-2); }
}

.qt {
  display: flex;
  align-items: baseline;
  gap: 7px;
  flex-wrap: wrap;
  margin-bottom: 9px;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-1);

  i {
    font-style: normal;
    font-family: var(--font-num);
    font-size: 10px;
    color: var(--text-4);
  }

  span {
    font-size: 11px;
    font-weight: 400;
    color: var(--text-3);
  }
}

.opts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 7px;
}

.opt {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 10px 12px;
  background: var(--bg-card);
  border: 1px solid var(--border-1);
  border-radius: var(--radius-sm);
  text-align: left;
  cursor: pointer;
  transition: 0.14s;

  b {
    font-size: 12.5px;
    font-weight: 600;
    line-height: 1.4;
    color: var(--text-1);
  }

  em {
    font-style: normal;
    font-size: 10.5px;
    line-height: 1.5;
    color: var(--text-3);
  }

  &:hover {
    border-color: var(--brand-300);
    background: var(--brand-50);
  }

  &.on {
    border-color: var(--brand-600);
    background: var(--brand-50);
    box-shadow: inset 0 0 0 1px var(--brand-600);

    b { color: var(--brand-800); }
  }
}

.qfoot {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;

  .tip {
    margin-right: auto;
    font-size: 11px;
    color: var(--text-3);
  }
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  padding: 0 16px;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: 0.16s;

  &--solid {
    background: var(--brand-600);
    color: #fff;

    &:hover { background: var(--brand-700); }
  }

  &--line {
    background: var(--bg-card);
    border-color: var(--border-1);
    color: var(--text-1);

    &:hover {
      border-color: var(--brand-300);
      color: var(--brand-700);
    }
  }

  &--ghost {
    background: transparent;
    color: var(--text-2);

    &:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
  }
}

/* ---------- 分析中 ---------- */
.analyzing {
  padding: 66px 20px;
  text-align: center;

  h3 {
    margin: 0 0 6px;
    font-size: 15px;
    font-weight: 700;
    color: var(--text-1);
  }

  p {
    margin: 0;
    font-size: 12px;
    color: var(--text-3);
  }
}

.spin {
  width: 46px;
  height: 46px;
  margin: 0 auto 18px;
  border: 3px solid var(--brand-100);
  border-top-color: var(--brand-600);
  border-radius: 50%;
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ---------- 结果 ---------- */
.result { padding-bottom: 24px; }

.summary {
  padding: 16px 18px;
  margin-bottom: 12px;

  p {
    margin: 0;
    font-size: 14.5px;
    font-weight: 600;
    line-height: 1.7;
    color: var(--text-1);
  }

  .sub {
    margin-top: 5px;
    font-size: 11.5px;
    font-weight: 400;
    line-height: 1.6;
    color: var(--text-3);
  }
}

.top {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  overflow: hidden;
}

.top-img {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 300px;
  background: linear-gradient(150deg, var(--brand-100), var(--bg-sunken) 62%, #dbe7e1);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .ph {
    padding: 6px 12px;
    background: var(--bg-card);
    border: 1px solid var(--border-1);
    border-radius: var(--radius-pill);
    font-size: 11.5px;
    line-height: 1.5;
    text-align: center;
    color: var(--brand-700);
  }

  .rk {
    position: absolute;
    left: 12px;
    top: 12px;
    padding: 3px 9px;
    background: var(--brand-600);
    border-radius: var(--radius-pill);
    font-size: 10.5px;
    font-weight: 600;
    color: #fff;
  }
}

.top-main {
  display: flex;
  flex-direction: column;
  gap: 13px;
  min-width: 0;
  padding: 20px 22px;
}

.tp-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.tp-title {
  min-width: 0;

  h3 {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    margin: 0 0 4px;
    font-size: 21px;
    font-weight: 700;
    color: var(--text-1);
  }

  :deep(.ui-chip) {
    height: 19px;
    font-size: 10.5px;
  }
}

.tp-info {
  font-size: 11.5px;
  color: var(--text-3);
}

.tp-price {
  margin-top: 6px;
  font-size: 19px;
  font-weight: 700;
  color: var(--price);
  font-variant-numeric: tabular-nums;

  em {
    margin-left: 7px;
    font-style: normal;
    font-size: 11px;
    font-weight: 400;
    color: var(--text-3);
  }
}

.tp-score {
  flex-shrink: 0;
  text-align: right;

  b {
    display: block;
    font-size: 29px;
    font-weight: 700;
    line-height: 1;
    letter-spacing: -0.02em;
    color: var(--brand-700);
    font-variant-numeric: tabular-nums;

    i {
      margin-left: 2px;
      font-style: normal;
      font-size: 11px;
      font-weight: 500;
      color: var(--text-3);
    }
  }

  span {
    display: inline-block;
    margin-top: 5px;
    padding: 2px 7px;
    background: var(--brand-50);
    border: 1px solid var(--brand-100);
    border-radius: var(--radius-xs);
    font-size: 10.5px;
    font-weight: 600;
    color: var(--brand-700);
  }
}

.blk {
  padding: 11px 13px;
  background: var(--bg-page);
  border-radius: var(--radius-md);
}

.blk-h {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 8px;

  b {
    font-size: 11.5px;
    font-weight: 600;
    color: var(--text-1);
  }

  span {
    font-size: 10px;
    color: var(--text-4);
  }
}

.srow {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 0;

  .n {
    width: 58px;
    flex-shrink: 0;
    font-size: 10.5px;
    color: var(--text-3);
  }

  .bar {
    flex: 1;
    height: 5px;
    background: var(--bg-sunken);
    border-radius: var(--radius-pill);
    overflow: hidden;

    i {
      display: block;
      height: 100%;
      border-radius: var(--radius-pill);
      background: var(--brand-500);
      transition: width 0.7s ease;
    }
  }

  .v {
    width: 26px;
    text-align: right;
    font-size: 10.5px;
    color: var(--text-2);
    font-variant-numeric: tabular-nums;
  }

  .w {
    width: 38px;
    text-align: right;
    font-size: 10px;
    color: var(--text-4);
    font-variant-numeric: tabular-nums;
  }

  &.muted {
    .n, .v { color: var(--text-4); }

    .bar i { background: var(--border-1); }
  }
}

.dims {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px 10px;

  /* 7 项在 4 列网格里末行只剩 3 项，让第 7 项跨两列补齐 */
  .dim:nth-child(7):last-child { grid-column: span 2; }
}

.dim {
  /* 减密：去掉底色块，只留 标签+分值 一行 与 一条色带 */
  .dim-h {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 6px;

    .dl {
      font-size: 11.5px;
      color: var(--text-3);
    }
  }

  b {
    font-size: 12.5px;
    font-weight: 600;
    color: var(--brand-700);
    font-variant-numeric: tabular-nums;
  }

  .dbar {
    margin-top: 5px;
    height: 4px;
    border-radius: 2px;
    background: var(--bg-sunken);
    overflow: hidden;

    i {
      display: block;
      height: 100%;
      border-radius: 2px;
      background: var(--brand-500);
    }
  }

  &.low .dbar i {
    background: var(--warning-500);
  }

  &.low b {
    color: var(--warning-500);
  }
}

.two {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.tagbox {
  b {
    display: block;
    margin-bottom: 6px;
    font-size: 11px;
    font-weight: 600;
  }

  &.good b { color: var(--success-500); }
  &.warn b { color: var(--warning-500); }
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.tag {
  padding: 3px 7px;
  background: var(--success-50);
  border: 1px solid var(--success-100);
  border-radius: var(--radius-xs);
  font-size: 10.5px;
  color: var(--success-500);

  &.w {
    background: var(--warning-50);
    border-color: var(--warning-100);
    color: var(--warning-500);
  }
}

.tp-act {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: auto;
  padding-top: 2px;

  .act-note {
    font-size: 10.5px;
    color: var(--text-4);
  }
}

/* ---------- 其余推荐 ---------- */
.rethead {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin: 24px 0 10px;

  h2 {
    margin: 0;
    font-size: 14px;
    font-weight: 700;
    color: var(--text-1);
  }

  span {
    font-size: 11px;
    color: var(--text-3);
  }
}

.rlist {
  max-height: 360px;
  overflow-y: auto;
  background: var(--bg-card);
  border: 1px solid var(--border-1);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
}

.rrow {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 14px;
  border-bottom: 1px solid var(--border-2);
  cursor: pointer;

  &:last-child { border-bottom: 0; }
  &:hover { background: var(--brand-50); }

  .no {
    width: 18px;
    flex-shrink: 0;
    font-family: var(--font-num);
    font-size: 10.5px;
    color: var(--text-4);
  }

  .nm {
    min-width: 150px;

    b {
      display: block;
      font-size: 12.5px;
      font-weight: 600;
      color: var(--text-1);
    }

    span {
      font-size: 10.5px;
      color: var(--text-3);
    }
  }

  .why {
    flex: 1;
    min-width: 0;
    font-size: 10.5px;
    color: var(--success-500);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .pr {
    width: 76px;
    text-align: right;
    font-size: 12px;
    font-weight: 600;
    color: var(--price);
    font-variant-numeric: tabular-nums;
  }

  .sc {
    width: 54px;
    text-align: right;
    font-size: 12.5px;
    font-weight: 700;
    color: var(--brand-700);
    font-variant-numeric: tabular-nums;
  }

  .go {
    flex-shrink: 0;
    font-size: 11px;
    color: var(--brand-600);
  }
}

.rlist,
.q-body {
  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-thumb {
    background: #d3ddd7;
    border-radius: 3px;
  }
  &::-webkit-scrollbar-track { background: transparent; }
}

/* ---------- 空结果 ---------- */
.empty {
  padding: 26px;
  text-align: center;

  .ico {
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    margin: 0 auto 12px;
    background: var(--warning-50);
    border-radius: 50%;
    font-size: 16px;
    font-weight: 700;
    color: var(--warning-500);
  }

  h3 {
    margin: 0 0 6px;
    font-size: 15px;
    font-weight: 700;
    color: var(--text-1);
  }

  .cause {
    max-width: 520px;
    margin: 0 auto 14px;
    font-size: 12.5px;
    line-height: 1.75;
    color: var(--text-2);
  }

  .num {
    font-weight: 700;
    color: var(--warning-500);
  }

  .acts {
    display: flex;
    gap: 8px;
    justify-content: center;
    flex-wrap: wrap;
  }
}

.foot-note {
  margin: 20px 0 0;
  text-align: center;
  font-size: 10.5px;
  line-height: 1.7;
  color: var(--text-3);
}

.redo {
  display: flex;
  justify-content: center;
  margin-top: 22px;
}

/* ---------- 响应式 ---------- */
@media (max-width: 1000px) {
  .wz { grid-template-columns: minmax(0, 1fr); }

  .side { position: static; }

  .pf {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0 16px;
  }

  .side-note, .pbar { display: none; }

  .top { grid-template-columns: minmax(0, 1fr); }

  .top-img {
    min-height: 0;
    aspect-ratio: 16 / 9;
    max-height: 220px;
  }

  .dims { grid-template-columns: repeat(3, minmax(0, 1fr)); }

  .q-body { height: 360px; }
}

@media (max-width: 768px) {
  .mh-inner { padding: 20px 16px 16px; }
  .mh-main h1 { font-size: 22px; }
  .mh-stats { display: none; }

  .m-body { padding: 14px 16px 0; }

  .stepnav button {
    justify-content: center;

    span { display: none; }
  }

  .qcard { padding: 16px 15px 8px; }
  .q-body { height: 320px; }
  .opts { grid-template-columns: 1fr 1fr; }

  .two { grid-template-columns: 1fr; }
  .dims { grid-template-columns: 1fr 1fr; }

  .top-main { padding: 18px 15px; }
  .tp-title h3 { font-size: 19px; }

  .tp-act {
    .btn { flex: 1; }
    .act-note { display: none; }
  }

  .rrow {
    .why { display: none; }
    .nm { flex: 1; min-width: 0; }
    .pr { width: auto; }
    .sc { width: auto; }
    .go { display: none; }
  }
}
</style>
