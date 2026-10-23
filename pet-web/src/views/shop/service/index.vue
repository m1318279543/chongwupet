<template>
  <div class="svc" :class="{ 'svc--anim': animOn }" ref="rootEl">
    <!-- ============ 幕 1：页头 + 交付清单 ============ -->
    <section id="intro" class="scene" :ref="(el) => setSceneRef(el, 0)">
      <div class="ui-page ui-page--md svc__head">
        <header class="ui-head rv">
          <div class="ui-head__main">
            <p class="ui-eyebrow">Aftercare</p>
            <h1 class="ui-title">先看保障，再接它回家</h1>
            <p class="ui-sub">
              从入店筛查到接宠交付，每个环节都留了记录。下面按接宠前、交付时、接宠后三步说明。
            </p>
          </div>
        </header>

        <!-- 三个关键数字：封面页的视觉重心，不套卡片，纯字号与 1px 线 -->
        <dl class="figures rv">
          <div>
            <dt>28</dt>
            <dd>项入店健康筛查</dd>
          </div>
          <div>
            <dt>7</dt>
            <dd>类来源渠道公示</dd>
          </div>
          <div>
            <dt>7</dt>
            <dd>天重大传染病保障</dd>
          </div>
        </dl>

        <!-- 三步目录：直接跳到对应块，也是这一页的叙事提纲 -->
        <ol class="toc">
          <li v-for="item in TOC" :key="item.no" class="rv">
            <button type="button" @click="go(item.to)">
              <span class="toc__no">{{ item.no }}</span>
              <b class="toc__title">{{ item.t }}</b>
              <span class="toc__desc">{{ item.d }}</span>
              <span class="toc__arrow" aria-hidden="true">→</span>
            </button>
          </li>
        </ol>
      </div>
    </section>

    <!-- ============ 幕 2：接宠前 ============ -->
    <section id="pre" class="scene" :ref="(el) => setSceneRef(el, 1)">
      <div class="stage">
        <header class="stage__head rv">
          <span class="stage__no">01</span>
          <div class="stage__intro">
            <h2 class="stage__title">接宠前 · 逐只过筛，结果可查</h2>
            <p class="stage__desc">28 项筛查分 5 组执行，来源渠道逐只公示，结果都写进档案。</p>
          </div>
        </header>

        <div class="stage__cols">
          <!-- 28 项筛查 -->
          <div class="col">
            <h3 class="col__title rv">入店 28 项健康筛查<span class="col__tag">5 组</span></h3>
            <dl class="exam" data-reveal-group>
              <div class="exam__group" v-for="g in EXAM_GROUPS" :key="g.name">
                <dt>{{ g.name }}<i>{{ g.items.length }} 项</i></dt>
                <dd>
                  <span class="tag" v-for="t in g.items" :key="t">{{ t }}</span>
                </dd>
              </div>
            </dl>
          </div>

          <!-- 来源渠道 -->
          <div class="col">
            <h3 class="col__title rv">来源渠道公示<span class="col__tag">7 大渠道</span></h3>
            <div class="bars" data-reveal-group>
              <div v-for="c in CHANNELS" :key="c.name" class="bar-row">
                <span class="bar-row__name">{{ c.name }}</span>
                <div class="bar"><i :style="{ width: (c.count / channelMax) * 100 + '%' }"></i></div>
                <em class="bar-row__num">{{ c.count }} 只</em>
              </div>
            </div>
            <ul class="notes" data-reveal-group>
              <li>页面照片均为本店实拍，支持到店比对</li>
              <li>月龄按出生日期推算，猫狗可查父母本</li>
            </ul>
          </div>
        </div>

        <!-- 筛查流程：5 步横排，把「过了哪些关」按顺序摆出来 -->
        <section class="flowline">
          <h3 class="col__title rv">筛查流程<span class="col__tag">5 步</span></h3>
          <ol class="flowline__list" data-reveal-group>
            <li v-for="(f, i) in HEALTH_FLOW" :key="f">
              <span class="flowline__no">{{ String(i + 1).padStart(2, '0') }}</span>
              <b>{{ f }}</b>
            </li>
          </ol>
        </section>
      </div>
    </section>

    <!-- ============ 幕 3：交付时 ============ -->
    <section id="delivery" class="scene" :ref="(el) => setSceneRef(el, 2)">
      <div class="stage">
        <header class="stage__head rv">
          <span class="stage__no">02</span>
          <div class="stage__intro">
            <h2 class="stage__title">交付时 · 材料齐全，方式可选</h2>
            <p class="stage__desc">六样材料当面点清，合同写清责任，交付方式三选一。</p>
          </div>
        </header>

        <!-- 六样材料：3 列 × 2 行，交付时逐项核对 -->
        <section class="handover">
          <div class="ui-sec__head rv">
            <h3 class="ui-sec__title">随宠交付的 6 样材料</h3>
            <span class="ui-sec__hint">缺一项可不接</span>
          </div>
          <ol class="handover__list handover__list--3" data-reveal-group>
            <li v-for="(h, i) in HANDOVER" :key="h.t">
              <span class="handover__no">{{ String(i + 1).padStart(2, '0') }}</span>
              <div class="handover__txt">
                <b>{{ h.t }}</b>
                <span>{{ h.d }}</span>
              </div>
            </li>
          </ol>
        </section>

        <div class="stage__cols">
          <div class="col">
            <h3 class="col__title rv">写进合同的三件事<span class="col__tag">正规合同</span></h3>
            <ul class="checks" data-reveal-group>
              <li v-for="p in DELIVERY_POINTS" :key="p">{{ p }}</li>
            </ul>
            <p class="col__note">7 天内确诊犬瘟、细小、猫瘟等重大传染病，凭合作医院诊断证明免费退换或治疗。</p>
          </div>

          <div class="col">
            <h3 class="col__title rv">三种交付方式<span class="col__tag">全国可接</span></h3>
            <dl class="ways" data-reveal-group>
              <div class="ways__item" v-for="dv in AFTER.feature.delivery" :key="dv.t">
                <dt>{{ dv.t }}</dt>
                <dd>{{ dv.d }}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ 幕 4：接宠后 ============ -->
    <section id="after" class="scene" :ref="(el) => setSceneRef(el, 3)">
      <div class="stage">
        <header class="stage__head rv">
          <span class="stage__no">03</span>
          <div class="stage__intro">
            <h2 class="stage__title">接宠后 · 养护陪跑，售后兜底</h2>
            <p class="stage__desc">按品类给喂养与护理方案；售后顾问终身免费，日常问题随时问。</p>
          </div>
        </header>

        <div class="stage__cols">
          <div class="col">
            <h3 class="col__title rv">分品类养护要点<span class="col__tag">7 类指南</span></h3>
            <dl class="care" data-reveal-group>
              <div class="care__row" v-for="c in CARE.feature.cats" :key="c.name">
                <dt>{{ c.name }}</dt>
                <dd>{{ c.points[0] }}</dd>
              </div>
            </dl>
            <ul class="kits" data-reveal-group>
              <li>免费新手养护课</li>
              <li>1 对 1 兽医顾问群</li>
              <li>购宠享 3 次免费洗护</li>
            </ul>
          </div>

          <div class="col">
            <h3 class="col__title rv">售后流程与承诺<span class="col__tag">终身有效</span></h3>
            <ol class="flow" data-reveal-group>
              <li v-for="(st, i) in AFTER.flow" :key="st">
                <span class="flow__no">{{ String(i + 1).padStart(2, '0') }}</span>
                <b>{{ st }}</b>
              </li>
            </ol>
            <ul class="checks checks--gap" data-reveal-group>
              <li>7 天内重大传染病免费退换或治疗，自动生效</li>
              <li>紧急健康问题优先转接合作医院</li>
            </ul>
          </div>
        </div>

      </div>
    </section>

    <!-- ============ 幕 5：常见问题 + 联系区 ============ -->
    <section id="contact" class="scene" :ref="(el) => setSceneRef(el, 4)">
      <!-- FAQ：放在收尾块，与联系方式一起承接「售后还能找谁」 -->
      <section class="faq faq--page rv">
        <div class="ui-sec__head">
          <h2 class="ui-sec__title">常被问到的几件事</h2>
          <span class="ui-sec__hint">{{ AFTER.faqs.length }} 个问题</span>
        </div>
        <el-collapse v-model="activeFaq" class="faq__collapse">
          <el-collapse-item v-for="(item, i) in AFTER.faqs" :key="i" :name="i">
            <template #title><span class="faq__q">{{ item.q }}</span></template>
            <p class="faq__a">{{ item.a }}</p>
          </el-collapse-item>
        </el-collapse>
      </section>

      <section class="contact rv">
        <div class="contact__copy">
          <h3 class="contact__title">接宠之后，仍可随时找到人</h3>
          <p class="contact__note">{{ AFTER.contact.note }}</p>
          <dl class="ui-kv contact__kv">
            <dt>售后热线</dt>
            <dd>
              <a :href="'tel:' + AFTER.contact.hotline" class="contact__val">{{ AFTER.contact.hotline }}</a>
              <i class="contact__sub">{{ AFTER.contact.hotlineHours }}</i>
            </dd>
            <dt>售后微信</dt>
            <dd>
              <span class="contact__val">{{ AFTER.contact.wechat }}</span>
              <i class="contact__sub">添加时备注宠物档案编号</i>
            </dd>
          </dl>
        </div>
        <div class="contact__actions">
          <button type="button" class="ui-btn ui-btn--solid" @click="goConsult">在线咨询</button>
          <button type="button" class="ui-btn ui-btn--line" @click="callHotline">拨打售后热线</button>
        </div>
      </section>
    </section>

    <!-- ============ 分块导航：右侧短横线，点击跳块 ============ -->
    <nav class="dots" aria-label="分块导航">
      <button
        v-for="(t, i) in SCENE_TITLES"
        :key="t"
        type="button"
        class="dots__item"
        :class="{ 'is-on': current === i }"
        :aria-label="t"
        @click="go(i)"
      >
        <span class="dots__tick"></span>
        <span class="dots__label">{{ t }}</span>
      </button>
    </nav>

    <!-- 首次进入的提示，滚过一次就消失 -->
    <p class="scroll-tip" :class="{ 'is-hidden': scrolled }">滚动切换下一块</p>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { SERVICES, EXAM_GROUPS } from './serviceData'

const route = useRoute()
const router = useRouter()

const svcOrigin = SERVICES.find((s) => s.slug === 'origin')
const CARE = SERVICES.find((s) => s.slug === 'care')
const AFTER = SERVICES.find((s) => s.slug === 'after')
const CHANNELS = svcOrigin?.feature?.channels || []
const channelMax = Math.max(...CHANNELS.map((c) => c.count), 1)

/* 交付材料（页首清单） */
const HANDOVER = [
  { icon: 'Document', t: '购宠合同', d: '品种、健康与双方责任，一式两份' },
  { icon: 'DataAnalysis', t: '28 项体检报告', d: '合作医院出具，随宠交付' },
  { icon: 'Notebook', t: '疫苗本', d: '按龄接种，记录完整' },
  { icon: 'Collector', t: '驱虫记录', d: '体内外驱虫，含用药名称与日期' },
  { icon: 'Postcard', t: '唯一档案编号', d: '一宠一档，四类信息可逐项核验' },
  { icon: 'Umbrella', t: '7 天保障条款', d: '重大传染病免费退换，写入合同' }
]

/* 交付段要点 */
const DELIVERY_POINTS = [
  '写明品种、性别、月龄、健康状态与双方责任',
  '附疫苗本与 28 项体检报告',
  '7 天观察期，符合条款可退换'
]

const activeFaq = ref([])

/* 封面页的三步目录：既是提纲，也能直接跳到对应块 */
const TOC = [
  { no: '01', t: '接宠前', d: '28 项筛查与来源公示', to: 1 },
  { no: '02', t: '交付时', d: '6 样材料、合同与交付方式', to: 2 },
  { no: '03', t: '接宠后', d: '分品类养护与终身售后', to: 3 }
]

/* 筛查流程：复用 health 板块已有的流程数据 */
const HEALTH_FLOW = SERVICES.find((s) => s.slug === 'health')?.flow || []

/* ============================================================
   分块切换：一屏一块，滚轮 / 触控板 / 方向键切换到下一块
   块内的内容进入视口后再逐条弹出
   ============================================================ */
const rootEl = ref(null)
const prefersReduced =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches
// 减少动效偏好下不启用入场动画；CSS 的初始隐藏只挂在 .svc--anim 下，未启用时内容照常可见
const animOn = !prefersReduced

const SCENE_IDS = ['intro', 'pre', 'delivery', 'after', 'contact']
const SCENE_TITLES = ['交付清单', '接宠前', '交付时', '接宠后', '联系我们']

const sceneEls = []
function setSceneRef(el, i) {
  if (el) sceneEls[i] = el
}

const current = ref(0)
const scrolled = ref(false)
let sceneIO = null
let locked = false
let lockTimer = null

/* 块内元素按文档顺序编号，作为入场延迟档位（上限 9 档，末尾不再无限等待） */
function initScenes() {
  const root = rootEl.value
  if (!root) return
  root.querySelectorAll('.scene').forEach((scene) => {
    const items = [...scene.querySelectorAll('.rv, [data-reveal-group] > *')]
    items.forEach((el, i) => {
      el.classList.add('rv')
      el.style.setProperty('--i', String(Math.min(i, 9)))
    })
  })
}

/* 滚动结束后按实际位置校准当前块，避免途中掠过的块把序号带偏 */
function syncCurrent() {
  const y = window.scrollY
  let best = 0
  let bestD = Infinity
  sceneEls.forEach((el, i) => {
    if (!el) return
    const d = Math.abs(el.offsetTop - y)
    if (d < bestD) {
      bestD = d
      best = i
    }
  })
  current.value = best
}

function lock() {
  locked = true
  clearTimeout(lockTimer)
  lockTimer = setTimeout(() => {
    locked = false
    syncCurrent()
  }, 720)
}

function go(i) {
  const idx = Math.max(0, Math.min(SCENE_IDS.length - 1, i))
  current.value = idx
  scrolled.value = true
  if (idx === 0) {
    // 第一块要从页面最顶开始，否则会把块顶的留白滚掉
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } else {
    sceneEls[idx]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  lock()
}

/* 块比视口高出不少时（如手机端长块），先让这块自己滚完，再切下一块。
   只高出几十像素的不算，否则要多滚一格才切块。 */
function canScrollInside(dir) {
  const el = sceneEls[current.value]
  if (!el) return false
  const vh = window.innerHeight
  if (el.offsetHeight <= vh * 1.12) return false
  const top = el.offsetTop
  const bottom = top + el.offsetHeight
  const y = window.scrollY
  return dir > 0 ? y + vh < bottom - 2 : y > top + 2
}

function onWheel(e) {
  if (Math.abs(e.deltaY) < 2) return
  // 横向手势（触控板左右滑）不接管
  if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
  if (locked) {
    e.preventDefault()
    return
  }
  const dir = e.deltaY > 0 ? 1 : -1
  if (canScrollInside(dir)) return
  e.preventDefault()
  scrolled.value = true
  go(current.value + dir)
}

function onKey(e) {
  const tag = (e.target?.tagName || '').toLowerCase()
  if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return
  if (e.key === 'Home') {
    e.preventDefault()
    go(0)
    return
  }
  if (e.key === 'End') {
    e.preventDefault()
    go(SCENE_IDS.length - 1)
    return
  }
  let dir = 0
  if (e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey)) dir = 1
  else if (e.key === 'ArrowUp' || e.key === 'PageUp' || (e.key === ' ' && e.shiftKey)) dir = -1
  if (!dir) return
  e.preventDefault()
  if (locked) return
  if (canScrollInside(dir)) {
    window.scrollBy({ top: dir * window.innerHeight * 0.8, behavior: 'smooth' })
    return
  }
  go(current.value + dir)
}

onMounted(() => {
  if (animOn) {
    initScenes()
    sceneIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return
          e.target.classList.add('is-on')
        })
      },
      // 块的中段进入视口中部即播放：高块也能触发，不会因为整块可见才播
      { threshold: 0, rootMargin: '-18% 0px -28% 0px' }
    )
    sceneEls.forEach((el) => el && sceneIO.observe(el))
    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('keydown', onKey)
  }

  // 触摸设备不做滚轮劫持，交给原生滑动 + 就近吸附（见样式里的 svc-snap）
  if (window.matchMedia('(hover: none)').matches) {
    document.documentElement.classList.add('svc-snap')
  }

  // 带锚点进来：直接停在那一块
  const hashIdx = SCENE_IDS.indexOf(route.hash.slice(1))
  if (hashIdx >= 0) {
    current.value = hashIdx
    nextTick(() => {
      sceneEls[hashIdx]?.classList.add('is-on')
      sceneEls[hashIdx]?.scrollIntoView({ block: 'start' })
    })
  }
})

onBeforeUnmount(() => {
  sceneIO && sceneIO.disconnect()
  clearTimeout(lockTimer)
  window.removeEventListener('wheel', onWheel)
  window.removeEventListener('keydown', onKey)
  document.documentElement.classList.remove('svc-snap')
})

function goConsult() {
  router.push(AFTER.contact?.consultPath || '/shop/consult')
}
function callHotline() {
  const tel = AFTER.contact?.hotline
  if (tel) window.location.href = 'tel:' + tel
}
</script>

<style scoped lang="scss">
// 页头 / 定义列表 / 按钮 / 折叠头来自 .ui-* 基元。
// 本页自定义：分块舞台、三步数据区、联系区、右侧块导航。
// 全页没有 box-shadow 与超过 8px 的圆角；分割只用 1px 线。

.svc {
  padding-bottom: 0;
}

/* ============================================================
   封面：放大标题与说明，让第一块有封面的分量
   ============================================================ */
.svc__head {
  max-width: 1240px;
  padding-bottom: 0;

  .ui-eyebrow {
    margin-bottom: 16px;
    font-size: 11.5px;
    letter-spacing: .2em;
  }
  .ui-title {
    font-size: 42px;
    line-height: 1.18;
    letter-spacing: -.02em;
  }
  .ui-sub {
    margin-top: 16px;
    font-size: 16px;
    line-height: 1.75;
    max-width: 44em;
  }
}

/* 三个关键数字：纯字号 + 1px 竖线，不套卡片 */
.figures {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin: 46px 0 0;
  padding: 26px 0 0;
  border-top: 1px solid var(--border-1);

  div {
    padding: 0 30px;
    border-left: 1px solid var(--border-2);
    &:first-child { padding-left: 0; border-left: 0; }
  }
  dt {
    font-family: var(--font-num);
    font-size: 46px;
    font-weight: 600;
    line-height: 1;
    letter-spacing: -.02em;
    color: var(--text-1);
  }
  dd {
    margin: 10px 0 0;
    font-size: 13.5px;
    color: var(--text-3);
  }
}

/* 三步目录：一行一条，hover 时箭头滑入 */
.toc {
  margin: 38px 0 0;
  padding: 0;
  list-style: none;

  li + li { border-top: 1px solid var(--border-2); }

  button {
    display: grid;
    grid-template-columns: 52px 120px minmax(0, 1fr) 28px;
    align-items: baseline;
    gap: 14px;
    width: 100%;
    padding: 20px 0;
    border: 0;
    background: transparent;
    font: inherit;
    text-align: left;
    color: inherit;
    cursor: pointer;
    transition: padding-left .22s cubic-bezier(.16, 1, .3, 1);

    &:hover {
      padding-left: 10px;
      .toc__arrow { opacity: 1; transform: translateX(0); }
    }
  }
}
.toc__no {
  font-family: var(--font-num);
  font-size: 12px;
  letter-spacing: .06em;
  color: var(--brand-500);
}
.toc__title {
  font-size: 17px;
  font-weight: 650;
  color: var(--text-1);
}
.toc__desc {
  font-size: 13.5px;
  color: var(--text-3);
}
.toc__arrow {
  font-size: 14px;
  color: var(--brand-500);
  opacity: 0;
  transform: translateX(-6px);
  transition: opacity .18s ease, transform .18s ease;
}

/* ============================================================
   0. 分幕舞台：每一幕占满一屏，内容垂直居中
   内容少的幕像一页幻灯片，内容多的幕自然撑高
   ============================================================ */
.scene {
  box-sizing: border-box;
  min-height: 100vh;
  min-height: 100svh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 88px 0 72px;
}

// 触摸设备：滑到靠近某块时自动吸附，滚轮劫持只在鼠标设备上做
:global(html.svc-snap) {
  scroll-snap-type: y proximity;
}
:global(html.svc-snap) .scene {
  scroll-snap-align: start;
}

/* ============================================================
   1. 交付清单：两列，序号 + 名称 + 一句说明
   ============================================================ */
.handover { padding-top: 34px; }
.handover__list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 56px;
  margin: 0;
  padding: 0;
  list-style: none;
  li {
    display: flex;
    gap: 16px;
    padding: 20px 0;
    border-bottom: 1px solid var(--border-2);
  }
  // 交付块里的 6 样材料排 3 列 × 2 行，横向铺满
  &--3 {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0 40px;
  }
}
.handover__no {
  font-family: var(--font-num);
  font-size: 13px;
  color: var(--brand-500);
  padding-top: 4px;
  letter-spacing: .04em;
}
.handover__txt {
  min-width: 0;
  b {
    display: block;
    font-size: 17px;
    font-weight: 650;
    color: var(--text-1);
    line-height: 1.45;
  }
  span {
    display: block;
    margin-top: 4px;
    font-size: 13px;
    line-height: 1.65;
    color: var(--text-3);
  }
}

/* ============================================================
   2. 三步数据区：编号 + 标题 + 两栏，栏间 1px 竖线
   ============================================================ */
.stage {
  box-sizing: border-box;
  width: 100%;
  max-width: calc(var(--container-md) + 48px);
  margin: 0 auto;
  padding: 0 24px;
}
.stage__head {
  display: flex;
  gap: 18px;
  align-items: baseline;
}
.stage__no {
  position: relative;
  flex-shrink: 0;
  font-family: var(--font-num);
  font-size: 13.5px;
  font-weight: 600;
  letter-spacing: .08em;
  color: var(--brand-600);
  padding-top: 6px;
  // 编号左侧的短线由动效层控制宽度：0 → 13px
  &::before {
    content: '';
    position: absolute;
    left: -18px;
    top: 50%;
    width: 0;
    height: 1px;
    background: var(--brand-400);
    transition: width .5s cubic-bezier(.16, 1, .3, 1) .12s;
  }
}
.stage__intro { min-width: 0; }
.stage__title {
  margin: 0;
  font-size: 32px;
  font-weight: 650;
  letter-spacing: -.015em;
  color: var(--text-1);
}
.stage__desc {
  margin: 12px 0 0;
  font-size: 15.5px;
  line-height: 1.8;
  color: var(--text-3);
  max-width: 56em;
}

/* 两栏：右侧栏用 1px 竖线切分，不各自套框 */
.stage__cols {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 56px;
  margin-top: 34px;
}
.col { min-width: 0; }
.col + .col {
  padding-left: 56px;
  border-left: 1px solid var(--border-2);
}
.col__title {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin: 0 0 16px;
  font-size: 18px;
  font-weight: 650;
  color: var(--text-1);
}
.col__tag {
  font-size: 12px;
  font-weight: 400;
  color: var(--text-4);
  letter-spacing: .02em;
}
.col__note {
  margin: 16px 0 0;
  padding-left: 12px;
  border-left: 2px solid var(--border-1);
  font-size: 13.5px;
  line-height: 1.75;
  color: var(--text-3);
}

/* 28 项筛查：分组用 dt，标签用 1px 描边小芯片 */
.exam__group {
  padding: 14px 0;
  & + .exam__group { border-top: 1px solid var(--border-2); }
  dt {
    display: flex;
    align-items: baseline;
    gap: 8px;
    font-size: 15px;
    font-weight: 600;
    color: var(--text-1);
    i {
      font-style: normal;
      font-size: 12.5px;
      font-weight: 400;
      color: var(--text-4);
      font-variant-numeric: tabular-nums;
    }
  }
  dd {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin: 10px 0 0;
  }
}
.tag {
  padding: 3px 8px;
  border: 1px solid var(--border-1);
  border-radius: var(--r-1);
  background: #fff;
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--text-2);
  white-space: nowrap;
}

/* 来源渠道：细条形图（数据可视化，非装饰） */
.bars { display: flex; flex-direction: column; gap: 2px; }
.bar-row {
  display: grid;
  // 渠道名固定 136px：「持证爬行动物繁育场」这类长名也能单行放下
  grid-template-columns: 136px minmax(0, 1fr) 52px;
  align-items: center;
  gap: 14px;
  padding: 10px 0;
  & + .bar-row { border-top: 1px solid var(--border-2); }
}
.bar-row__name { font-size: 13.5px; line-height: 1.5; color: var(--text-2); }
.bar {
  height: 4px;
  background: var(--bg-sunken);
  i {
    display: block;
    height: 100%;
    background: var(--brand-400);
  }
}
.bar-row__num {
  font-style: normal;
  font-size: 12.5px;
  color: var(--text-3);
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.notes {
  margin: 14px 0 0;
  padding-left: 18px;
  list-style: disc;
  li {
    font-size: 13px;
    line-height: 1.8;
    color: var(--text-3);
  }
}

/* 合同要点 / 服务包：文本清单，行首一条短横 */
.checks {
  margin: 0;
  padding: 0;
  list-style: none;
  li {
    position: relative;
    padding: 12px 0 12px 18px;
    font-size: 15px;
    line-height: 1.7;
    color: var(--text-2);
    border-bottom: 1px solid var(--border-2);
    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 21px;
      width: 8px;
      height: 1px;
      background: var(--brand-500);
    }
    &:last-child { border-bottom: 0; }
  }
}
.checks--gap { margin-top: 12px; }

/* 交付方式：定义列表 */
.ways__item {
  padding: 14px 0;
  & + .ways__item { border-top: 1px solid var(--border-2); }
  dt { font-size: 15.5px; font-weight: 600; color: var(--text-1); }
  dd { margin: 5px 0 0; font-size: 14px; line-height: 1.7; color: var(--text-3); }
}

/* 分品类养护：品名 | 要点 两列对齐 */
.care__row {
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr);
  gap: 14px;
  padding: 12px 0;
  & + .care__row { border-top: 1px solid var(--border-2); }
  dt { font-size: 14.5px; font-weight: 600; color: var(--text-1); }
  dd { margin: 0; font-size: 14px; line-height: 1.7; color: var(--text-3); }
}
.kits {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 10px;
  margin: 18px 0 0;
  padding: 0;
  list-style: none;
  li {
    padding: 4px 10px;
    border: 1px solid var(--brand-200);
    border-radius: var(--r-1);
    font-size: 12.5px;
    color: var(--brand-700);
  }
}

/* 售后流程：编号步骤 */
.flow {
  margin: 0;
  padding: 0;
  list-style: none;
  li {
    display: flex;
    align-items: baseline;
    gap: 12px;
    padding: 12px 0;
    & + li { border-top: 1px solid var(--border-2); }
    b { font-size: 15px; font-weight: 600; color: var(--text-2); }
  }
}
.flow__no {
  font-family: var(--font-num);
  font-size: 12px;
  color: var(--brand-500);
  letter-spacing: .04em;
}

/* 筛查流程：5 步横排，步与步之间只用 1px 竖线 */
.flowline {
  margin-top: 34px;
  padding-top: 26px;
  border-top: 1px solid var(--border-1);
}
.flowline__list {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  margin: 0;
  padding: 0;
  list-style: none;

  li {
    padding: 0 18px;
    border-left: 1px solid var(--border-2);
    &:first-child { padding-left: 0; border-left: 0; }
    &:last-child { padding-right: 0; }
  }
  b {
    display: block;
    margin-top: 8px;
    font-size: 13.5px;
    font-weight: 600;
    line-height: 1.55;
    color: var(--text-2);
  }
}
.flowline__no {
  display: block;
  font-family: var(--font-num);
  font-size: 11.5px;
  letter-spacing: .06em;
  color: var(--brand-500);
}

/* ============================================================
   3. FAQ：折叠面板，只留 1px 线
   ============================================================ */
.faq { padding-top: 36px; }
// 收尾块里的 FAQ：与联系区同宽（880），上下留白由这一层控制
.faq--page {
  box-sizing: border-box;
  width: 100%;
  max-width: 880px;
  margin: 0 auto;
  padding: 0 24px 34px;
}
.faq__q { font-size: 15px; color: var(--text-1); }
.faq__a {
  margin: 0;
  font-size: 14px;
  line-height: 1.85;
  color: var(--text-2);
}
.faq__collapse {
  border-top: 0;
  border-bottom: 0;
  :deep(.el-collapse-item__header) {
    height: 56px;
    padding: 0;
    border-bottom: 1px solid var(--border-2);
    background: transparent;
    font-size: 15px;
  }
  :deep(.el-collapse-item__wrap) { border-bottom: 1px solid var(--border-2); }
  :deep(.el-collapse-item__content) { padding: 4px 0 18px; }
}

/* ============================================================
   4. 联系区：上下 1px 线夹住内容
   ============================================================ */
.contact {
  box-sizing: border-box;
  width: 100%;
  max-width: 880px;
  margin: 0 auto;
  // 结束页：左边一段话与联系方式，右边操作竖排，两栏底部对齐
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 40px;
  padding: 40px 24px;
  border-top: 1px solid var(--text-1);
  border-bottom: 1px solid var(--border-1);
}
.contact__copy { min-width: 0; }
.contact__title {
  margin: 0;
  font-size: 24px;
  font-weight: 650;
  letter-spacing: -.01em;
  color: var(--text-1);
}
.contact__note {
  margin: 10px 0 0;
  font-size: 14px;
  line-height: 1.75;
  color: var(--text-3);
  max-width: 46em;
}
.contact__kv {
  grid-template-columns: 92px minmax(0, 1fr);
  margin-top: 20px;
  dt, dd { padding: 11px 0; }
}
.contact__val {
  font-size: 19px;
  font-weight: 600;
  letter-spacing: .01em;
  color: var(--text-1);
  font-variant-numeric: tabular-nums;
}
.contact__sub {
  margin-left: 12px;
  font-style: normal;
  font-size: 12px;
  color: var(--text-4);
}
.contact__actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex-shrink: 0;
}

/* ============================================================
   5. 分块导航：右侧短横线，当前块拉长
   ============================================================ */
.dots {
  position: fixed;
  right: 22px;
  top: 50%;
  z-index: 55;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
  transform: translateY(-50%);
}
.dots__item {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  width: 64px;
  height: 16px;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}
.dots__tick {
  display: block;
  width: 18px;
  height: 2px;
  background: var(--border-1);
  transition: width .26s cubic-bezier(.16, 1, .3, 1), background-color .26s ease;
}
.dots__item.is-on .dots__tick {
  width: 32px;
  background: var(--brand-500);
}
.dots__label {
  position: absolute;
  right: 42px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 11.5px;
  color: var(--text-3);
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity .18s ease;
}
.dots__item:hover .dots__label { opacity: 1; }

/* 首次进入的提示：滚过一次就淡出 */
.scroll-tip {
  position: fixed;
  left: 50%;
  bottom: 26px;
  z-index: 55;
  margin: 0;
  font-size: 12px;
  letter-spacing: .04em;
  color: var(--text-4);
  transform: translateX(-50%);
  transition: opacity .4s ease, transform .4s ease;
  &::after {
    content: '↓';
    margin-left: 6px;
  }
  &.is-hidden {
    opacity: 0;
    transform: translate(-50%, 8px);
  }
}

/* ============================================================
   6. 入场动效：一块进入视口，内部逐条弹出
   只动 opacity 与 translateY，不缩放、不加阴影
   ============================================================ */
// 初始隐藏只挂在 .svc--anim 下：脚本未启用或用户偏好减少动效时，内容照常直接可见
.svc--anim {
  .scene .rv {
    opacity: 0;
    transform: translateY(14px);
    transition:
      opacity .5s ease,
      transform .62s cubic-bezier(.16, 1, .3, 1);
    // 幕内序号越大越晚，形成一条接一条的节奏（上限 9 档）
    transition-delay: calc(var(--i, 0) * 85ms);
  }

  .scene.is-on .rv {
    opacity: 1;
    transform: none;
  }

  // 步骤编号左侧的短线随该幕出现而生长，强化「一步一步往前」
  .scene.is-on .stage__no::before { width: 13px; }
}

// 打印或截图工具里不该缺内容
@media print {
  .rv { opacity: 1 !important; transform: none !important; }
  .scene { min-height: auto; padding: 24px 0; }
  .dots, .scroll-tip { display: none; }
}

/* ============================================================
   7. 响应式
   ============================================================ */
@media (max-width: 768px) {
  .scene { padding: 80px 0 64px; }

  // 封面：标题回落到窄屏尺度，数字仍占一行三列
  .svc__head {
    .ui-title { font-size: 27px; }
    .ui-sub { margin-top: 12px; font-size: 14.5px; }
  }
  .figures {
    margin-top: 28px;
    padding-top: 20px;
    div { padding: 0 14px; }
    dt { font-size: 32px; }
    dd { margin-top: 7px; font-size: 12px; line-height: 1.5; }
  }
  .toc {
    margin-top: 26px;
    button {
      grid-template-columns: 34px minmax(0, 1fr) 18px;
      row-gap: 4px;
      padding: 14px 0;
      &:hover { padding-left: 0; }
    }
  }
  .toc__no { grid-row: 1 / 3; }
  .toc__title { grid-column: 2 / 3; font-size: 15.5px; }
  .toc__desc { grid-column: 2 / 3; font-size: 12.5px; }
  .toc__arrow {
    grid-column: 3 / 4;
    grid-row: 1 / 3;
    align-self: center;
    opacity: 1;
    transform: none;
  }

  .handover__list {
    grid-template-columns: minmax(0, 1fr);
    gap: 0;
    &--3 { grid-template-columns: minmax(0, 1fr); }
  }

  .stage { padding: 0 14px; }
  .stage__head { gap: 12px; }
  // 窄屏左侧余量只有 14px，短线会顶到视口边缘并触发横向滚动
  .stage__no::before { display: none; }
  .stage__title { font-size: 22px; }
  .stage__desc { font-size: 14px; }
  .stage__cols { grid-template-columns: minmax(0, 1fr); gap: 0; }
  .col + .col {
    padding-left: 0;
    padding-top: 22px;
    margin-top: 22px;
    border-left: 0;
    border-top: 1px solid var(--border-1);
  }
  .col__title { font-size: 16px; }

  .bar-row { grid-template-columns: 68px minmax(0, 1fr) 44px; gap: 10px; }
  .care__row { grid-template-columns: 60px minmax(0, 1fr); }
  .checks li { padding: 10px 0 10px 16px; font-size: 14px; &::before { top: 18px; } }
  .faq--page { padding: 0 14px 26px; }

  // 5 步流程在窄屏折成两列，奇数列去掉左侧竖线
  .flowline__list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    row-gap: 18px;
    li { padding: 0 14px; }
    li:nth-child(odd) { padding-left: 0; border-left: 0; }
    li:nth-child(even) { padding-right: 0; }
  }

  .contact {
    grid-template-columns: minmax(0, 1fr);
    gap: 20px;
    padding: 26px 14px;
  }
  .contact__title { font-size: 20px; }
  .contact__val { font-size: 17px; }
  // 窄屏放大字号后说明放不进一行，改成块级换行，避免挂在值后面参差不齐
  .contact__kv { grid-template-columns: 76px minmax(0, 1fr); }
  .contact__sub { display: block; margin: 4px 0 0; }
  .contact__actions { flex-direction: column; width: 100%; }
  .contact__actions .ui-btn { width: 100%; }

  // 触摸设备用原生滑动切换，右侧指示器收起；提示语仍在底部居中
  .dots { display: none; }
  .scroll-tip { bottom: 18px; font-size: 11.5px; }
}
</style>
