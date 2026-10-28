// 智能选宠：全部页面逻辑（向导状态、画像计算、提交、收藏、展示工具）
// index.vue 只保留模板与一行装配，逻辑改动都在这里。
import { ref, reactive, computed, watch, onMounted } from 'vue'
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

  /* ---------- 状态持久化 ----------
     问卷要答 10 题，点进宠物详情再返回时本页组件会重新挂载，
     不落盘就得从头再答一遍。用 sessionStorage 而不是 Pinia：
     这份状态只属于「这一次挑选」，关掉标签页就该消失，
     也不该让隔几天再进选宠页的用户一上来就看见上次的结果还挂在上面。 */
  const STATE_KEY = 'pet-match-state'
  const STATE_VER = 1

  function loadState() {
    try {
      const raw = sessionStorage.getItem(STATE_KEY)
      if (!raw) return null
      const s = JSON.parse(raw)
      return s && s.v === STATE_VER ? s : null
    } catch (e) {
      return null // 数据损坏或隐私模式：按首次进入处理
    }
  }

  function saveState() {
    // 全空时删掉而不是写一条空记录：reset() 先同步删过一次，
    // 紧接着 watch 又会触发本函数，没有这个判断就会把空状态写回去。
    const hasAny = Object.values(answers).some(Boolean) || step.value > 0 || result.value
    try {
      if (hasAny) {
        sessionStorage.setItem(STATE_KEY, JSON.stringify({
          v: STATE_VER,
          t: Date.now(),
          answers: { ...answers },
          step: step.value,
          result: result.value
        }))
      } else {
        sessionStorage.removeItem(STATE_KEY)
      }
    } catch (e) {
      // 隐私模式或配额超限：只是返回时不恢复，不影响正常答题
    }
  }

  // 恢复上次进度：答案、所在步骤、已生成的结果都要带回来
  const saved = loadState()
  if (saved) {
    Object.keys(answers).forEach((k) => {
      if (typeof saved.answers?.[k] === 'string') answers[k] = saved.answers[k]
    })
    if (Number.isInteger(saved.step) && saved.step >= 0 && saved.step < STEPS.length) {
      step.value = saved.step
    }
    if (saved.result && typeof saved.result === 'object') result.value = saved.result
  }

  // 答案 / 步骤 / 结果任一变就落盘，三个的变化频率都很低
  watch([answers, step, result], saveState, { deep: true })

  // 返回本页时不管浏览器有没有恢复滚动位置，都回到顶部看结果
  onMounted(() => window.scrollTo(0, 0))

  /* ---------- 进度 ---------- */
  const totalCount = computed(() => STEPS.reduce((n, s) => n + s.questions.length, 0))
  const doneCount = computed(() => Object.keys(answers).filter((k) => answers[k]).length)
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

  // 某组已答几题 / 完成百分比，给步骤条用（步骤条同时是导航条，进度就内嵌在里面）
  function groupDone(g) {
    return `${g.questions.filter((q) => !!answers[q.key]).length}/${g.questions.length}`
  }

  function groupPct(g) {
    const n = g.questions.filter((q) => !!answers[q.key]).length
    return Math.round((n / g.questions.length) * 100)
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
    try {
      sessionStorage.removeItem(STATE_KEY)
    } catch (e) { /* 同上：清不掉也不阻塞重置 */ }
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
    // 进度
    totalCount, doneCount, allDone, curGroup, curLeft, qIndex, groupAll, groupDone, groupPct,
    // 结果
    recommendations, top, rest, diag, candidateCount, nextBudget,
    // 动作
    next, submit, loosenType, raiseBudget, reset, goDetail, goConsult, askAi, fav,
    // 展示工具
    pad, fmt, isImg, genderText, preferName
  }
}
