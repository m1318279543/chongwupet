<template>
  <div class="pet-query">
    <!-- 查询工具条：分类筛选 + 关键词搜索 -->
    <div class="toolbar">
      <div class="cats">
        <button class="cat" :class="{ active: selectedCat === 0 }" @click="selectedCat = 0">
          全部<em>{{ allList.length }}</em>
        </button>
        <button
          v-for="c in categories"
          :key="c.id"
          class="cat"
          :class="{ active: selectedCat === c.id }"
          @click="selectedCat = c.id"
        >
          {{ c.name }}<em>{{ countByCat(c.id) }}</em>
        </button>
      </div>
      <div class="search">
        <el-input
          v-model="keyword"
          placeholder="搜索宠物名字 / 品种，如：布偶、金毛"
          clearable
          :prefix-icon="Search"
        />
      </div>
    </div>

    <p class="coverage">
      已收录 <b>{{ allList.length }}</b> 只宠物真实档案 · 覆盖 <b>{{ categories.length }}</b> 个品类 ·
      当前筛选出 <b>{{ filtered.length }}</b> 只
    </p>

    <!-- 字段组切换：一个查询区看四个侧面，不再每个板块挂一份 -->
    <div class="grp-tabs" role="tablist" aria-label="档案字段组">
      <button
        v-for="g in GROUPS"
        :key="g.key"
        type="button"
        class="grp"
        :class="{ active: activeGroup === g.key }"
        role="tab"
        :aria-selected="activeGroup === g.key"
        @click="activeGroup = g.key"
      >{{ g.label }}</button>
    </div>

    <!-- 结果卡片网格（与 AI 选宠共用同一个卡片组件） -->
    <div class="grid" v-loading="loading">
      <PetMiniCard
        v-for="p in visible"
        :key="p.petId"
        :to="'/shop/pet/' + p.petId"
        :image="isImage(p.image) ? p.image : ''"
        :placeholder="catName(p.categoryId)"
        :name="p.petName"
        :sub="p.breed && p.breed !== p.petName ? p.breed : ''"
        :meta="metaOf(p)"
        :price="p.price"
        :badge="p.healthLevel || ''"
        :tone="levelTone(p.healthLevel)"
      >
        <ul class="facts">
          <li v-for="(f, i) in fieldOf(activeGroup, p)" :key="i">
            <span class="k">{{ f.label }}</span>
            <span class="v" :class="f.cls">{{ f.value }}</span>
          </li>
        </ul>
      </PetMiniCard>
    </div>

    <div class="empty" v-if="!loading && filtered.length === 0">没有匹配的宠物，换个关键词或分类试试</div>

    <div class="more" v-if="filtered.length > visible.length">
      <el-button round @click="pageSize += PAGE">
        加载更多（还有 {{ filtered.length - visible.length }} 只）
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { listOnSaleHealth } from '@/api/pet/petHealth'
import PetMiniCard from '@/components/shop/PetMiniCard.vue'
import { CATEGORIES, FIELD_GROUPS } from './serviceData'

const PAGE = 12
const pageSize = ref(PAGE)

const categories = CATEGORIES
const allList = ref([])
const loading = ref(true)
const selectedCat = ref(0)
const keyword = ref('')

// 四个字段组 = 原四个板块；在卡片上切换，替代「每个板块一份查询区」
const GROUPS = [
  { key: 'health', label: '健康筛查' },
  { key: 'origin', label: '来源档案' },
  { key: 'care', label: '养护要点' },
  { key: 'after', label: '售后保障' }
]
const activeGroup = ref('health')

function countByCat(id) { return allList.value.filter((p) => p.categoryId === id).length }

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return allList.value.filter((p) => {
    if (selectedCat.value !== 0 && p.categoryId !== selectedCat.value) return false
    if (kw) {
      const hay = ((p.petName || '') + ' ' + (p.breed || '')).toLowerCase()
      if (!hay.includes(kw)) return false
    }
    return true
  })
})

// 一次只渲染一屏多一点，避免全部档案把页面撑到两万像素
const visible = computed(() => filtered.value.slice(0, pageSize.value))
watch([keyword, selectedCat, activeGroup], () => {
  pageSize.value = PAGE
})

// 把原始字段配置转成 {label, value, cls}
// badge 类型（健康等级）已由卡片左上角角标呈现，列表里不再重复
function fieldOf(group, p) {
  return (FIELD_GROUPS[group] || [])
    .filter((f) => f.type !== 'badge')
    .map((f) => {
    let cls = ''
    let value = f.get(p)
    if (f.type === 'tag') cls = 'tag ' + skillTag(p.skillLevel)
    else if (f.type === 'ok') cls = 'ok'
    else if (f.type === 'mono') cls = 'mono'
    if (value == null || value === '' || value === '—') value = '—'
    return { label: f.label, value, cls }
  })
}

function catName(id) { return (categories.find((c) => c.id === id) || {}).name || '宠物' }
function catFamily(id) { return (categories.find((c) => c.id === id) || {}).family || '' }
function isImage(s) { return !!s && (s.indexOf('/') === 0 || s.indexOf('http') === 0) }
function levelTone(l) { return l === '优秀' ? 'success' : l === '良好' ? 'brand' : 'plain' }
function skillTag(s) { return s === '入门' ? 't-success' : s === '进阶' ? 't-warning' : 't-danger' }

function ageText(p) {
  if (!p.birthDate) return ''
  const b = new Date(p.birthDate)
  if (isNaN(b.getTime())) return ''
  const now = new Date()
  let months = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth())
  if (now.getDate() < b.getDate()) months--
  if (months <= 0) return '未满月'
  if (months < 12) return months + ' 月龄'
  const y = Math.floor(months / 12)
  const m = months % 12
  return m ? `${y} 岁 ${m} 个月` : `${y} 岁`
}

function metaOf(p) {
  return [ageText(p), catFamily(p.categoryId)].filter(Boolean).join(' · ')
}

onMounted(async () => {
  loading.value = true
  try {
    const res = await listOnSaleHealth({ pageNum: 1, pageSize: 300 })
    const d = res.data || {}
    // 档案表里存在少量没有对应宠物记录的孤儿数据，前台直接过滤掉
    allList.value = (d.rows || []).filter((r) => r.petName)
  } catch (e) {
    allList.value = []
  } finally {
    loading.value = false
  }
})
</script>

<style scoped lang="scss">
.pet-query { margin-top: 4px; }

/* ---------- 工具条 ---------- */
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
}

.cats {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.cat {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 13px;
  background: var(--bg-card);
  border: 1px solid var(--border-1);
  border-radius: var(--radius-pill);
  font-family: inherit;
  font-size: 13.5px;
  color: var(--text-2);
  cursor: pointer;
  transition: border-color 0.16s, background 0.16s, color 0.16s;

  em {
    font-style: normal;
    font-size: 11.5px;
    padding: 0 5px;
    border-radius: var(--radius-pill);
    background: var(--bg-page);
    color: var(--text-3);
    font-variant-numeric: tabular-nums;
  }

  &:hover {
    border-color: var(--brand-300);
    color: var(--brand-700);
  }

  &.active {
    background: var(--brand-600);
    border-color: var(--brand-600);
    color: #fff;

    em {
      background: rgba(255, 255, 255, 0.2);
      color: #fff;
    }
  }
}

.search { width: 300px; max-width: 100%; }

.coverage {
  margin: 14px 0;
  font-size: 12.5px;
  color: var(--text-3);

  b {
    color: var(--text-1);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
}

/* ---------- 字段组切换 ---------- */
.grp-tabs {
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  margin-bottom: 14px;
  background: var(--bg-sunken);
  border-radius: var(--radius-md);
}

.grp {
  padding: 7px 16px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-2);
  cursor: pointer;
  transition: background 0.16s, color 0.16s;

  &:hover { color: var(--text-1); }

  &.active {
    background: var(--bg-card);
    color: var(--text-1);
    font-weight: 600;
    box-shadow: var(--shadow-card);
  }
}

/* ---------- 结果网格 ---------- */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(280px, 100%), 1fr));
  gap: 16px;
  min-height: 120px;
}

/* ---------- 卡片内档案字段 ---------- */
.facts {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 1px;

  li {
    display: flex;
    gap: 8px;
    font-size: 12.5px;
    line-height: 1.75;

    .k {
      flex: 0 0 62px;
      color: var(--text-3);
    }
    .v {
      flex: 1;
      min-width: 0;
      color: var(--text-2);
      word-break: break-all;

      &.ok { color: var(--success-500); font-weight: 600; }
      &.mono { font-family: var(--font-num); font-size: 11.5px; color: var(--text-3); }

      &.tag {
        flex: 0 0 auto;
        width: fit-content;
        padding: 0 8px;
        border-radius: var(--radius-xs);
        font-size: 11.5px;
        line-height: 1.6;
        color: #fff;

        &.t-success { background: var(--success-500); }
        &.t-warning { background: var(--warning-500); }
        &.t-danger { background: var(--danger-500); }
      }
    }
  }
}

.empty {
  padding: 48px 0;
  text-align: center;
  font-size: 13px;
  color: var(--text-3);
}

.more {
  display: flex;
  justify-content: center;
  margin-top: 22px;
}

@media (max-width: 768px) {
  .search { width: 100%; }

  .grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
  }

  .grp-tabs {
    display: flex;
    width: 100%;

    .grp { flex: 1; padding: 7px 6px; }
  }
}
</style>
