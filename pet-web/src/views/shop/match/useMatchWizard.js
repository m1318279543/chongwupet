// 智能选宠：全部页面逻辑（向导状态、画像计算、提交、收藏、展示工具）
// index.vue 只保留模板与一行装配，逻辑改动都在这里。
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { recommendPet } from '@/api/pet/petMatch'
import { addPetFavorite } from '@/api/pet/petFavorite'
import { useUserStore } from '@/store/modules/user'
import { useAssistant } from '@/components/assistant/useAssistant'
import { STEPS } from './matchData'

export function useMatchWizard() {
  const router = useRouter()
  const userStore = useUserStore()
  const { open: openAssistant } = useAssistant()

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
    // from 供详情页返回与导航高亮使用
    router.push({ path: '/shop/pet/' + id, query: { from: '/shop/match' } })
  }
  function goConsult() {
    router.push('/shop/consult')
  }

  /**
   * 带着问卷答案继续问 AI。
   * 答案随 open 存进 useAssistant，后续每轮对话都会把它带给后端，
   * 这样 AI 用的是用户亲手选的 10 个条件，而不是从一句话里正则猜出来的。
   */
  function askAi(pet) {
    const name = pet?.petName ? `「${pet.petName}」` : ''
    openAssistant({
      scene: 'match',
      answers: { ...answers },
      fresh: true,
      greeting: name
        ? `你刚才的测评条件我已经带过来了。可以直接追问${name}哪里适合你，也能让我换条件重筛。`
        : '你刚才的测评条件我已经带过来了，可以直接追问，比如换个大点的房子会推荐谁。',
      message: name ? `为什么「${pet.petName}」适合我？它和其余几只有什么区别？` : ''
    })
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

  return {
    // 状态
    loading, result, step, analyzeText, answers, STEPS,
    // 进度与画像
    totalCount, doneCount, progress, allDone, curGroup, curLeft, qIndex, groupAll, profile, profileRows,
    // 结果
    recommendations, top, rest, diag, candidateCount, nextBudget,
    // 动作
    next, submit, loosenType, raiseBudget, reset, goDetail, goConsult, askAi, fav,
    // 展示工具
    pad, fmt, isImg, genderText, preferName
  }
}
