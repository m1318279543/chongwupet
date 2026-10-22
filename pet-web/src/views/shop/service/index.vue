<template>
  <div class="service-page">
    <ShopHero
      eyebrow="服务保障 · 四重承诺"
      title="每一只，都经得起核对"
      highlight="经得起核对"
      desc="健康、来源、养护、售后四个环节全部公示：28 项入店筛查、一宠一档来源可溯、分品类养护指南、7 天健康保障与终身咨询。"
      :stats="heroStats"
      narrow
    />

    <div class="page-body">
      <!-- 板块目录：桌面端为左侧粘性侧栏，移动端回落为顶部横条 -->
      <nav class="anchor-rail" aria-label="服务板块目录">
        <a
          v-for="(s, si) in SERVICES"
          :key="s.slug"
          :href="'#' + s.slug"
          class="a-pill"
          :class="{ active: activeSlug === s.slug }"
          @click.prevent="scrollTo(s.slug)"
        >
          <span class="a-no">{{ String(si + 1).padStart(2, '0') }}</span>{{ s.title }}
        </a>
      </nav>

      <div class="main">
      <section
        v-for="(s, si) in SERVICES"
        :id="s.slug"
        :key="s.slug"
        class="block"
        :ref="(el) => setBlockRef(s.slug, el)"
      >
        <header class="b-head">
          <span class="b-no">{{ String(si + 1).padStart(2, '0') }}</span>
          <div class="b-text">
            <h2>{{ s.title }}</h2>
            <p>{{ s.slogan }}</p>
          </div>
        </header>

        <!-- 承诺点：轻量两列，不再每板块铺四张大卡 -->
        <ul class="b-points">
          <li v-for="p in s.points" :key="p.title">
            <b>{{ p.title }}</b>
            <span>{{ p.desc }}</span>
          </li>
        </ul>

        <!-- 流程：行内步骤流 -->
        <ol class="b-steps">
          <li v-for="(f, i) in s.flow" :key="i">
            <span class="fs-no">{{ String(i + 1).padStart(2, '0') }}</span>{{ f }}
          </li>
        </ol>

        <!-- ===== 板块专属内容 ===== -->
        <!-- 健康筛查：28 项明细 -->
        <div v-if="s.slug === 'health'" class="panel">
          <SectionHead title="筛查明细" desc="每只宠物入店后由合作宠物医院执行以下检查，报告随宠交付">
            <template #extra>共 {{ examCount }} 项</template>
          </SectionHead>
          <div class="exam-grid">
            <div v-for="(g, gi) in EXAM_GROUPS" :key="g.name" class="exam-group">
              <div class="eg-head">
                <span class="eg-no">{{ String(gi + 1).padStart(2, '0') }}</span>
                <b>{{ g.name }}</b>
                <i>{{ g.items.length }} 项</i>
              </div>
              <div class="tags">
                <span v-for="t in g.items" :key="t" class="tag">{{ t }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 真实信息：来源渠道 + 一宠一档 -->
        <template v-if="s.slug === 'origin'">
          <div class="panel">
            <SectionHead title="来源渠道公示" :desc="`每只宠物都登记了来源渠道与唯一档案编号，目前在售宠物来自以下 ${s.feature.channels.length} 类正规渠道`">
              <template #extra>{{ s.feature.channels.length }} 类渠道</template>
            </SectionHead>
            <div class="ch-grid">
              <div v-for="(c, ci) in s.feature.channels" :key="ci" class="ch">
                <span class="ch-no">{{ String(ci + 1).padStart(2, '0') }}</span>
                <div class="ch-body">
                  <div class="ch-top">
                    <b>{{ c.name }}</b>
                    <span class="ch-cnt">在售 {{ c.count }} 只</span>
                  </div>
                  <p>{{ c.desc }}</p>
                </div>
              </div>
            </div>
          </div>

          <div class="panel">
            <SectionHead title="怎么读懂一宠一档" desc="四类信息缺一不可，全部可在页面底部查询区逐只核对" />
            <ul class="kv-list">
              <li v-for="t in s.feature.tips" :key="t.k">
                <b>{{ t.k }}</b><span>{{ t.v }}</span>
              </li>
            </ul>
            <p class="note">{{ s.feature.note }}</p>
          </div>
        </template>

        <!-- 专业养护：分品类要点 + 接宠清单 -->
        <template v-if="s.slug === 'care'">
          <div class="panel">
            <SectionHead title="分品类养护要点" desc="不同品类习性差异很大，接宠前先了解它的真实需求">
              <template #extra>{{ s.feature.cats.length }} 个品类</template>
            </SectionHead>
            <div class="care-grid">
              <div v-for="(c, ci) in s.feature.cats" :key="ci" class="care-card">
                <div class="cc-head">
                  <b>{{ c.name }}</b>
                  <span class="cc-no">{{ String(ci + 1).padStart(2, '0') }}</span>
                </div>
                <ul>
                  <li v-for="pt in c.points" :key="pt">{{ pt }}</li>
                </ul>
              </div>
            </div>
          </div>

          <div class="panel">
            <SectionHead :title="s.feature.checklistTitle" desc="接宠前先备齐，避免到家手忙脚乱">
              <template #extra>{{ s.feature.checklist.length }} 项</template>
            </SectionHead>
            <div class="chips">
              <span v-for="x in s.feature.checklist" :key="x" class="chip-ok">
                <el-icon><Check /></el-icon>{{ x }}
              </span>
            </div>
          </div>
        </template>

        <!-- 售后无忧：政策 + FAQ + 联系 -->
        <template v-if="s.slug === 'after'">
          <div class="panel">
            <SectionHead title="保障政策" desc="合同、保障期、交付方式与咨询通道，逐项写清楚">
              <template #extra>{{ s.feature.guarantees.length }} 项承诺</template>
            </SectionHead>
            <div class="pol-grid">
              <div v-for="(g, gi) in s.feature.guarantees" :key="gi" class="pol">
                <span class="pol-no">{{ String(gi + 1).padStart(2, '0') }}</span>
                <div class="pol-body"><b>{{ g.t }}</b><p>{{ g.d }}</p></div>
              </div>
            </div>

            <h3 class="sub-title">{{ s.feature.deliveryTitle }}</h3>
            <div class="dl-grid">
              <div v-for="d in s.feature.delivery" :key="d.t" class="dl">
                <div class="pol-body"><b>{{ d.t }}</b><p>{{ d.d }}</p></div>
              </div>
            </div>
          </div>

          <div class="panel">
            <SectionHead title="常见问题" desc="关于售后保障，最常被问到的几件事" />
            <el-collapse v-model="activeFaq" class="faq">
              <el-collapse-item v-for="(item, i) in s.faqs" :key="i" :name="i">
                <template #title><span class="faq-q">{{ item.q }}</span></template>
                <p class="faq-a">{{ item.a }}</p>
              </el-collapse-item>
            </el-collapse>
          </div>

          <section class="contact">
            <div class="ct-copy">
              <h3>购宠不是结束，而是陪伴的开始</h3>
              <p class="ct-note">{{ s.contact.note }}</p>
              <ul class="ct-list">
                <li>
                  <el-icon class="ct-ico"><Phone /></el-icon>
                  <div>
                    <b>售后热线</b>
                    <a :href="'tel:' + s.contact.hotline" class="ct-val">{{ s.contact.hotline }}</a>
                    <i class="ct-sub">{{ s.contact.hotlineHours }}</i>
                  </div>
                </li>
                <li>
                  <el-icon class="ct-ico"><ChatDotRound /></el-icon>
                  <div>
                    <b>售后微信</b>
                    <span class="ct-val">{{ s.contact.wechat }}</span>
                    <i class="ct-sub">添加时备注宠物档案编号</i>
                  </div>
                </li>
              </ul>
            </div>
            <div class="ct-actions">
              <button type="button" class="ct-btn ct-btn-primary" @click="goConsult(s)">在线咨询</button>
              <button type="button" class="ct-btn ct-btn-ghost" @click="callHotline(s)">拨打售后热线</button>
            </div>
          </section>
        </template>
      </section>

      <!-- 统一档案查询：全页唯一一处，字段组在卡片上切换 -->
      <section class="query" id="query">
        <SectionHead
          title="在售宠物档案查询"
          desc="一套档案覆盖四个侧面：健康筛查、来源信息、养护要点、售后保障，按品类筛选或搜索后逐只核对"
        />
        <ServicePetQuery />
      </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ShopHero from '@/components/shop/ShopHero.vue'
import SectionHead from '@/components/shop/SectionHead.vue'
import ServicePetQuery from './ServicePetQuery.vue'
import { SERVICES, EXAM_GROUPS } from './serviceData'

const route = useRoute()
const router = useRouter()

const examCount = EXAM_GROUPS.reduce((n, g) => n + g.items.length, 0)

const heroStats = [
  { value: examCount, unit: '项', label: '入店健康筛查' },
  { value: 7, unit: '大', label: '正规来源渠道' },
  { value: 7, unit: '天', label: '健康保障期' },
  { value: '终身', unit: '', label: '售后咨询' }
]

const activeFaq = ref([])

/* ---------- 锚点：点击滚动 + 滚动高亮 ---------- */
const blockRefs = {}
const activeSlug = ref(SERVICES[0].slug)

function setBlockRef(slug, el) {
  if (el) blockRefs[slug] = el
}

function scrollTo(slug) {
  const el = blockRefs[slug]
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

let observer = null

onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) activeSlug.value = e.target.id
      })
    },
    // 视口上沿往下 30% 的带状区域决定当前板块
    { rootMargin: '-72px 0px -62% 0px', threshold: 0 }
  )
  Object.values(blockRefs).forEach((el) => observer.observe(el))

  // 支持 /shop/service#origin 直达
  if (route.hash && blockRefs[route.hash.slice(1)]) {
    nextTick(() => scrollTo(route.hash.slice(1)))
  }
})

onBeforeUnmount(() => observer && observer.disconnect())

watch(
  () => route.hash,
  (h) => {
    if (h && blockRefs[h.slice(1)]) nextTick(() => scrollTo(h.slice(1)))
  }
)

function goConsult(s) {
  router.push(s.contact?.consultPath || '/shop/consult')
}
function callHotline(s) {
  const tel = s.contact?.hotline
  if (tel) window.location.href = 'tel:' + tel
}
</script>

<style scoped lang="scss">
.service-page {
  background: var(--bg-page);
  min-height: 100%;
  padding-bottom: 64px;
}

.page-body {
  max-width: var(--container-lg);
  margin: 0 auto;
  padding: 0 24px;
  display: grid;
  grid-template-columns: 180px minmax(0, 1fr);
  gap: 44px;
  align-items: start;
}

.main { min-width: 0; }

/* ---------- 板块目录：桌面左侧粘性侧栏 ---------- */
.anchor-rail {
  position: sticky;
  top: 92px;
  z-index: 30;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.a-pill {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 10px 13px;
  border-radius: var(--radius-md);
  border-left: 2px solid transparent;
  font-size: 13.5px;
  font-weight: 500;
  color: var(--text-2);
  text-decoration: none;
  white-space: nowrap;
  transition: background 0.16s, color 0.16s, border-color 0.16s;

  .a-no {
    font-size: 10.5px;
    font-weight: 700;
    color: var(--text-4);
    font-variant-numeric: tabular-nums;
    transition: color 0.16s;
  }

  &:hover { background: var(--brand-50); color: var(--brand-700); }

  &.active {
    background: var(--brand-50);
    border-left-color: var(--brand-600);
    color: var(--brand-800);
    font-weight: 600;

    .a-no { color: var(--brand-600); }
  }
}

/* ---------- 板块区块 ---------- */
.block {
  padding-top: 40px;
  scroll-margin-top: 104px; // 顶栏高度 + 呼吸

  & + .block { border-top: 1px solid var(--border-2); margin-top: 40px; }
}

.b-head {
  display: flex;
  align-items: baseline;
  gap: 16px;
}

.b-no {
  font-size: 30px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--brand-200);
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.b-text {
  min-width: 0;

  h2 {
    margin: 0;
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: var(--text-1);
  }
  p {
    margin: 6px 0 0;
    font-size: 13px;
    line-height: 1.7;
    color: var(--text-3);
  }
}

/* ---------- 承诺点（轻量两列） ---------- */
.b-points {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 36px;
  margin: 18px 0 0;
  padding: 0;
  list-style: none;

  li {
    display: flex;
    gap: 14px;
    padding: 11px 0;
    border-bottom: 1px dashed var(--border-2);
    font-size: 13px;

    b {
      flex: 0 0 88px;
      font-weight: 600;
      color: var(--text-1);
      line-height: 1.7;
    }
    span {
      color: var(--text-3);
      line-height: 1.7;
    }
  }
}

/* ---------- 流程（行内步骤流） ---------- */
.b-steps {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 0;
  margin: 16px 0 0;
  padding: 0;
  list-style: none;

  li {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 12.5px;
    color: var(--text-2);
    white-space: nowrap;

    & + li::before {
      content: '';
      width: 20px;
      height: 1px;
      background: var(--border-1);
      margin: 0 10px;
    }
  }
}

.fs-no {
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--brand-50);
  font-size: 10px;
  font-weight: 700;
  color: var(--brand-700);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

/* ---------- 通用面板 ---------- */
.panel {
  margin-top: 18px;
  padding: 22px;
  background: var(--bg-card);
  border: 1px solid var(--border-1);
  border-radius: var(--radius-lg);
}

.sub-title {
  margin: 22px 0 12px;
  font-size: 15px;
  font-weight: 700;
  color: var(--text-1);
}

.note {
  margin: 14px 0 0;
  font-size: 12px;
  line-height: 1.7;
  color: var(--text-3);
}

/* ---------- 健康筛查 ---------- */
.exam-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.exam-group {
  padding: 15px 16px;
  background: var(--bg-page);
  border-radius: var(--radius-md);
}

.eg-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 11px;

  .eg-no {
    font-size: 11px;
    font-weight: 700;
    color: var(--brand-500);
    font-variant-numeric: tabular-nums;
  }
  b {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-1);
  }
  i {
    margin-left: auto;
    font-style: normal;
    font-size: 11.5px;
    color: var(--text-3);
  }
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;

  .tag {
    padding: 3px 9px;
    background: var(--bg-card);
    border: 1px solid var(--brand-200);
    border-radius: var(--radius-xs);
    font-size: 12px;
    line-height: 1.5;
    color: var(--brand-800);
  }
}

/* ---------- 来源渠道 ---------- */
.ch-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.ch {
  display: flex;
  gap: 12px;
  padding: 15px 16px;
  background: var(--bg-page);
  border-radius: var(--radius-md);

  .ch-no {
    flex: 0 0 auto;
    font-size: 11px;
    font-weight: 700;
    color: var(--brand-500);
    font-variant-numeric: tabular-nums;
    padding-top: 3px;
  }
}

.ch-body {
  min-width: 0;
  flex: 1;

  p {
    margin: 6px 0 0;
    font-size: 12.5px;
    line-height: 1.65;
    color: var(--text-3);
  }
}

.ch-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;

  b {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-1);
  }
}

.ch-cnt {
  flex-shrink: 0;
  padding: 2px 9px;
  background: var(--bg-card);
  border: 1px solid var(--brand-200);
  border-radius: var(--radius-pill);
  font-size: 11.5px;
  color: var(--brand-700);
  font-variant-numeric: tabular-nums;
}

.kv-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 2px;

  li {
    display: flex;
    gap: 14px;
    padding: 10px 0;
    border-bottom: 1px dashed var(--border-2);
    font-size: 13.5px;
    line-height: 1.7;

    &:last-child { border-bottom: 0; }

    b {
      flex: 0 0 76px;
      font-weight: 600;
      color: var(--text-1);
    }
    span { color: var(--text-2); }
  }
}

/* ---------- 专业养护 ---------- */
.care-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.care-card {
  padding: 14px 16px;
  background: var(--brand-50);
  border: 1px solid var(--brand-100);
  border-radius: var(--radius-md);

  .cc-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 7px;

    b {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-1);
    }
    .cc-no {
      font-size: 10.5px;
      font-weight: 700;
      color: var(--brand-500);
      font-variant-numeric: tabular-nums;
    }
  }

  ul {
    margin: 0;
    padding-left: 16px;

    li {
      font-size: 13px;
      line-height: 1.75;
      color: var(--text-2);
    }
  }
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip-ok {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 13px;
  background: var(--bg-card);
  border: 1px solid var(--brand-200);
  border-radius: var(--radius-pill);
  font-size: 13px;
  color: var(--text-1);

  .el-icon {
    font-size: 12px;
    color: var(--brand-600);
  }
}

/* ---------- 售后 ---------- */
.pol-grid,
.dl-grid {
  display: grid;
  gap: 12px;
}

.pol-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.dl-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }

.pol {
  display: flex;
  gap: 12px;
  padding: 15px 16px;
  background: var(--bg-page);
  border-radius: var(--radius-md);
  border-left: 2px solid var(--brand-300);

  .pol-no {
    flex: 0 0 auto;
    font-size: 11px;
    font-weight: 700;
    color: var(--brand-500);
    font-variant-numeric: tabular-nums;
    padding-top: 3px;
  }
}

.dl {
  padding: 15px 16px;
  background: var(--bg-page);
  border-radius: var(--radius-md);
  border-left: 2px solid var(--border-1);
}

.pol-body {
  min-width: 0;

  b {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-1);
  }
  p {
    margin: 5px 0 0;
    font-size: 12.5px;
    line-height: 1.65;
    color: var(--text-3);
  }
}

.faq {
  border-top: 1px solid var(--border-2);
  border-bottom: 0;

  :deep(.el-collapse-item__header) {
    height: 48px;
    padding: 0;
    border-bottom-color: var(--border-2);
    font-size: 14px;
    font-weight: 600;
    color: var(--text-1);

    &:hover { color: var(--brand-700); }
  }
  :deep(.el-collapse-item__wrap) { border-bottom: 0; }
  :deep(.el-collapse-item__content) { padding: 2px 0 16px; }
}

.faq-q { line-height: 1.5; }

.faq-a {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.85;
  color: var(--text-2);
}

/* ---------- 联系卡 ---------- */
.contact {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 240px;
  gap: 28px;
  align-items: center;
  margin-top: 18px;
  padding: 28px 32px;
  background: var(--grad-brand);
  border-radius: var(--radius-xl);
  color: #fff;
}

.ct-copy {
  min-width: 0;

  h3 {
    margin: 0 0 8px;
    font-size: 20px;
    font-weight: 700;
    color: #fff;
  }
}

.ct-note {
  margin: 0 0 18px;
  max-width: 42em;
  font-size: 13px;
  line-height: 1.75;
  color: rgba(255, 255, 255, 0.86);
}

.ct-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16px 40px;
  margin: 0;
  padding: 0;
  list-style: none;

  li {
    display: flex;
    align-items: flex-start;
    gap: 10px;

    .ct-ico {
      flex: 0 0 auto;
      width: 20px;
      height: 20px;
      font-size: 18px;
      color: rgba(255, 255, 255, 0.9);
      margin-top: 2px;
    }

    b {
      display: block;
      font-size: 12px;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.78);
      margin-bottom: 2px;
    }
  }
}

.ct-val {
  display: block;
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  text-decoration: none;
  font-variant-numeric: tabular-nums;

  &[href] { border-bottom: 1px dashed rgba(255, 255, 255, 0.55); }
}

.ct-sub {
  display: block;
  margin-top: 3px;
  font-style: normal;
  font-size: 11.5px;
  color: rgba(255, 255, 255, 0.72);
}

.ct-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

// 深绿底上不能再用主色按钮，改为反色
.ct-btn {
  height: 46px;
  border-radius: var(--radius-pill);
  border: 1px solid transparent;
  font-family: inherit;
  font-size: 14.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.16s, border-color 0.16s, color 0.16s;
}

.ct-btn-primary {
  background: #fff;
  color: var(--brand-800);

  &:hover { background: var(--brand-50); }
}

.ct-btn-ghost {
  background: transparent;
  border-color: rgba(255, 255, 255, 0.45);
  color: #fff;

  &:hover {
    background: rgba(255, 255, 255, 0.12);
    border-color: rgba(255, 255, 255, 0.7);
  }
}

/* ---------- 查询区 ---------- */
.query {
  margin-top: 48px;
  padding-top: 30px;
  border-top: 1px solid var(--border-1);
  scroll-margin-top: 128px;
}

/* ---------- 响应式 ---------- */
@media (max-width: 1000px) {
  .page-body {
    display: block;
  }

  /* 目录回落为顶部粘性横条 */
  .anchor-rail {
    top: 62px;
    flex-direction: row;
    overflow-x: auto;
    margin-bottom: 8px;
    padding: 6px;
    background: rgba(255, 255, 255, 0.94);
    backdrop-filter: blur(8px);
    border: 1px solid var(--border-1);
    border-radius: var(--radius-pill);
    box-shadow: var(--shadow-sm);

    .a-pill {
      flex: 0 0 auto;
      padding: 8px 15px;
      border-radius: var(--radius-pill);
      border-left: 0;

      &.active {
        background: var(--brand-600);
        color: #fff;

        .a-no { color: rgba(255, 255, 255, 0.75); }
      }
    }
  }

  .b-points { grid-template-columns: minmax(0, 1fr); }
  .exam-grid,
  .ch-grid,
  .care-grid,
  .pol-grid,
  .dl-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .contact { grid-template-columns: minmax(0, 1fr); }
  .ct-actions { flex-direction: row; }
  .ct-btn { flex: 1; }
}

@media (max-width: 768px) {
  .page-body { padding: 0 16px; }

  .anchor-rail {
    top: 56px;
    margin-top: 12px;

    .a-pill { padding: 8px 14px; }
  }

  .block {
    padding-top: 32px;
    scroll-margin-top: 116px;

    & + .block { margin-top: 32px; }
  }

  .b-no { font-size: 24px; }
  .b-text h2 { font-size: 19px; }

  .panel { padding: 16px; }

  .b-steps {
    flex-direction: column;
    align-items: stretch;
    gap: 9px;

    li { white-space: normal; align-items: flex-start; }

    li + li::before { display: none; }
  }

  .exam-grid,
  .ch-grid,
  .care-grid,
  .pol-grid,
  .dl-grid { grid-template-columns: minmax(0, 1fr); }

  .contact {
    padding: 22px 18px;
    border-radius: var(--radius-lg);
  }

  .ct-actions { flex-direction: column; }
}
</style>
