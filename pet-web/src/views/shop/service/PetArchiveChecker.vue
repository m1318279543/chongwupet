<template>
  <div class="archive-checker">
    <!-- 选择器：搜索涵盖全部分类，不再铺商品网格 -->
    <div class="ac-toolbar">
      <el-select
        v-model="selectedId"
        filterable
        clearable
        size="large"
        placeholder="选择或搜索宠物名字 / 品种，逐只核对档案"
        :loading="loading"
        class="ac-select"
      >
        <el-option
          v-for="p in allList"
          :key="p.petId"
          :value="p.petId"
          :label="`${p.petName}（${p.breed || catName(p.categoryId)}）`"
        >
          <span class="opt-name">{{ p.petName }}</span>
          <span class="opt-sub">{{ p.breed || catName(p.categoryId) }} · {{ catName(p.categoryId) }}</span>
        </el-option>
      </el-select>
      <button
        type="button"
        class="ui-btn ui-btn--solid"
        :disabled="!current"
        @click="goDetail"
      >去在售宠物页查看</button>
    </div>

    <div v-if="loading" class="ac-loading" v-loading="loading"></div>

    <div v-else-if="!current" class="ac-empty">
      <p>选择一只在售宠物，查看它的健康筛查、来源信息、养护要点与售后保障真实档案。</p>
      <p class="ac-hint">商品浏览与购买请前往「在售宠物」页面。</p>
    </div>

    <!-- 单只宠物的四侧档案 -->
    <div v-else class="ac-body">
      <aside class="ac-pet">
        <div class="ac-media">
          <img v-if="!imgFailed" :src="current.image" :alt="current.petName" @error="imgFailed = true" />
          <span v-else class="ac-holder">{{ catName(current.categoryId) }}</span>
        </div>
        <div class="ac-info">
          <h3>{{ current.petName }}</h3>
          <p class="ac-meta">
            {{ [current.breed, genderText(current.gender), ageOf(current.birthDate)].filter(Boolean).join(' · ') }}
          </p>
          <span v-if="current.healthLevel" class="ui-chip ac-badge" :class="levelTone(current.healthLevel)">
            健康等级：{{ current.healthLevel }}
          </span>
          <p v-if="current.price" class="ac-price"><em>¥</em>{{ Number(current.price).toLocaleString('zh-CN') }}</p>
        </div>
      </aside>

      <div class="ac-groups">
        <section v-for="(g, gi) in GROUPS" :key="g.key" class="ac-group">
          <header class="acg-head">
            <span class="g-no">{{ String(gi + 1).padStart(2, '0') }}</span>
            <b>{{ g.label }}</b>
          </header>
          <ul class="facts">
            <li v-for="(f, i) in fieldOf(g.key, current)" :key="i">
              <span class="k">{{ f.label }}</span>
              <span class="v" :class="f.cls">{{ f.value }}</span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { listOnSaleHealth } from '@/api/pet/petHealth'
import { CATEGORIES, FIELD_GROUPS as GROUP_FIELDS } from './serviceData'

const router = useRouter()

const GROUPS = [
  { key: 'health', label: '健康筛查' },
  { key: 'origin', label: '来源档案' },
  { key: 'care', label: '养护要点' },
  { key: 'after', label: '售后保障' }
]

const allList = ref([])
const loading = ref(true)
const selectedId = ref(null)
const imgFailed = ref(false)

const current = computed(() => allList.value.find((p) => p.petId === selectedId.value) || null)

watch(() => selectedId.value, () => { imgFailed.value = false })

// badge 类型（健康等级）已在左侧宠物卡展示，列表不重复
function fieldOf(group, p) {
  return (GROUP_FIELDS[group] || [])
    .filter((f) => f.type !== 'badge')
    .map((f) => {
      let cls = ''
      let value = f.get(p)
      if (f.type === 'tag') cls = 'ui-chip ' + skillTag(p.skillLevel)
      else if (f.type === 'ok') cls = 'ok'
      else if (f.type === 'mono') cls = 'mono'
      if (value == null || value === '' || value === '—') value = '—'
      return { label: f.label, value, cls }
    })
}

function catName(id) {
  return (CATEGORIES.find((c) => c.id === id) || {}).name || '宠物'
}
function genderText(g) {
  return g === '1' || g === 1 ? '公' : g === '0' || g === 0 ? '母' : ''
}
function ageOf(birth) {
  if (!birth) return ''
  const b = new Date(birth)
  if (isNaN(b.getTime())) return ''
  const now = new Date()
  let m = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth())
  if (now.getDate() < b.getDate()) m--
  if (m <= 0) return '未满月'
  if (m < 12) return m + ' 月龄'
  const y = Math.floor(m / 12)
  const r = m % 12
  return r ? `${y} 岁 ${r} 个月` : `${y} 岁`
}
// 健康等级 / 技能标签：统一映射到 1px 描边芯片（见 flat.scss 的 .ui-chip）
function levelTone(l) { return l === '优秀' ? 'ui-chip--ok' : l === '良好' ? 'ui-chip--brand' : 'ui-chip--warn' }
function skillTag(s) { return s === '入门' ? 'ui-chip--ok' : s === '进阶' ? 'ui-chip--warn' : 'ui-chip--danger' }

function goDetail() {
  if (current.value) router.push('/shop/pet/' + current.value.petId)
}

onMounted(async () => {
  loading.value = true
  try {
    const res = await listOnSaleHealth({ pageNum: 1, pageSize: 300 })
    const d = res.data || {}
    // 过滤掉没有对应宠物记录的孤儿档案
    allList.value = (d.rows || []).filter((r) => r.petName)
  } catch (e) {
    allList.value = []
  } finally {
    loading.value = false
  }
})

/* 字段配置直接复用 serviceData 的 FIELD_GROUPS，避免两处维护 */
</script>

<style scoped lang="scss">
// 档案核验：不用卡片。
// 左栏是身份（1px 竖线分隔），右栏是四组字段（组头 + 1px 线 + 键值行）。
.archive-checker { min-width: 0; }

/* ---------- 工具条 ---------- */
.ac-toolbar {
  display: flex;
  gap: 12px;
  align-items: center;

  .ac-select { flex: 1; max-width: 520px; }
}

/* ---------- 空态：一段说明文字，不套虚线框 ---------- */
.ac-loading { min-height: 220px; }

.ac-empty {
  padding: 28px 0 8px;
  max-width: 60em;

  p {
    margin: 0;
    font-size: 13.5px;
    color: var(--text-3);
    line-height: 1.8;
  }
  .ac-hint {
    margin-top: 4px;
    font-size: 12.5px;
    color: var(--text-4);
  }
}

/* ---------- 档案主体 ---------- */
.ac-body {
  display: grid;
  grid-template-columns: 236px minmax(0, 1fr);
  gap: 40px;
  align-items: start;
  margin-top: 22px;
}

/* 左：身份栏，靠右侧 1px 竖线与字段区分 */
.ac-pet {
  position: sticky;
  top: 96px;
  padding-right: 32px;
  border-right: 1px solid var(--border-1);
}

.ac-media {
  position: relative;
  aspect-ratio: 4 / 3;
  background: var(--bg-sunken);
  border: 1px solid var(--border-1);
  border-radius: var(--r-2);
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .ac-holder {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12.5px;
    color: var(--text-4);
  }
}

.ac-info {
  padding-top: 14px;

  h3 {
    margin: 0;
    font-size: 17px;
    font-weight: 650;
    color: var(--text-1);
  }
}

.ac-meta {
  margin: 6px 0 10px;
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--text-3);
}

.ac-badge { margin-bottom: 2px; }

.ac-price {
  margin: 12px 0 0;
  font-size: 20px;
  font-weight: 650;
  color: var(--price);
  font-variant-numeric: tabular-nums;

  em {
    font-style: normal;
    font-size: 12.5px;
    margin-right: 1px;
  }
}

/* 右：四组档案，两列；组与组之间靠留白与 1px 线分隔 */
.ac-groups {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 26px 40px;
}

.ac-group { min-width: 0; }

.acg-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 4px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-1);

  .g-no {
    font-family: var(--font-num);
    font-size: 10.5px;
    font-weight: 600;
    color: var(--brand-500);
    letter-spacing: .04em;
  }
  b {
    font-size: 13.5px;
    font-weight: 650;
    color: var(--text-1);
  }
}

/* 字段行：键固定宽度，值占据剩余；行间 1px 细线 */
.facts {
  margin: 0;
  padding: 0;
  list-style: none;

  li {
    display: flex;
    gap: 10px;
    padding: 7px 0;
    font-size: 12.5px;
    line-height: 1.7;
    border-bottom: 1px solid var(--border-2);

    &:last-child { border-bottom: 0; }

    .k {
      flex: 0 0 64px;
      color: var(--text-3);
    }
    .v {
      flex: 1;
      min-width: 0;
      color: var(--text-2);
      overflow-wrap: anywhere;

      &.ok { color: var(--success-500); font-weight: 600; }
      &.mono { font-family: var(--font-num); font-size: 11.5px; color: var(--text-3); }

      // 技能等级标签复用 .ui-chip 的描边样式，只是不参与拉伸
      &.ui-chip {
        flex: 0 0 auto;
        width: fit-content;
        align-self: flex-start;
        margin-top: 1px;
      }
    }
  }
}

/* 下拉选项 */
.opt-sub {
  float: right;
  margin-left: 16px;
  font-size: 11.5px;
  color: var(--text-3);
}

/* ---------- 响应式 ---------- */
@media (max-width: 1000px) {
  .ac-body { grid-template-columns: minmax(0, 1fr); gap: 24px; }
  .ac-pet {
    position: static;
    padding-right: 0;
    padding-bottom: 24px;
    border-right: 0;
    border-bottom: 1px solid var(--border-1);
    display: grid;
    grid-template-columns: 128px minmax(0, 1fr);
    gap: 16px;
    align-items: start;
  }
  .ac-info { padding-top: 0; }
}

@media (max-width: 768px) {
  .ac-toolbar {
    flex-direction: column;
    align-items: stretch;

    .ac-select { max-width: none; }
  }

  .ac-groups { grid-template-columns: minmax(0, 1fr); gap: 22px; }
}
</style>
