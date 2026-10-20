<template>
  <div class="pet-query">
    <!-- 查询工具条：分类筛选 + 关键词搜索 -->
    <div class="toolbar">
      <div class="cats">
        <button
          class="cat"
          :class="{ active: selectedCat === 0 }"
          @click="selectedCat = 0"
        >全部（{{ allList.length }}）</button>
        <button
          v-for="c in categories"
          :key="c.id"
          class="cat"
          :class="{ active: selectedCat === c.id }"
          @click="selectedCat = c.id"
        >{{ c.emoji }} {{ c.name }}<span class="cnt">{{ countByCat(c.id) }}</span></button>
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
      当前显示 <b>{{ filtered.length }}</b> 只
    </p>

    <!-- 结果卡片网格 -->
    <div class="grid" v-loading="loading">
      <div class="card" v-for="p in filtered" :key="p.petId">
        <div class="pic" @click="goDetail(p)">
          <img v-if="isImage(p.image)" :src="p.image" :alt="p.petName" loading="lazy" />
          <span v-else class="emoji">{{ petEmoji(p.categoryId) }}</span>
          <span class="cat-tag">{{ catName(p.categoryId) }}</span>
          <span class="lv" v-if="p.healthLevel" :class="levelClass(p.healthLevel)">{{ p.healthLevel }}</span>
        </div>
        <div class="info">
          <div class="head">
            <h3 @click="goDetail(p)">{{ p.petName }}</h3>
            <span class="breed">{{ p.breed || '未知品种' }}</span>
          </div>
          <p class="meta" v-if="ageText(p)">🎂 {{ ageText(p) }} · {{ catFamily(p.categoryId) }}</p>

          <!-- 当前板块字段 -->
          <ul class="facts">
            <li v-for="(f, i) in fieldOf(section, p)" :key="i">
              <span class="k">{{ f.label }}</span>
              <span class="v" :class="f.cls">{{ f.value }}</span>
            </li>
          </ul>

          <!-- 展开完整档案：补齐其它三个板块 -->
          <div class="expand" v-if="expanded.has(p.petId)">
            <template v-for="g in otherGroups" :key="g">
              <div class="grp-title">{{ groupTitle(g) }}</div>
              <ul class="facts sub">
                <li v-for="(f, i) in fieldOf(g, p)" :key="i">
                  <span class="k">{{ f.label }}</span>
                  <span class="v" :class="f.cls">{{ f.value }}</span>
                </li>
              </ul>
            </template>
          </div>

          <div class="row">
            <span class="price" v-if="p.price">¥{{ p.price }}</span>
            <span class="spacer" />
            <el-button link type="primary" size="small" @click="toggle(p.petId)">
              {{ expanded.has(p.petId) ? '收起完整档案 ▲' : '展开完整档案 ▼' }}
            </el-button>
            <el-button type="primary" size="small" round @click="goDetail(p)">查看详情</el-button>
          </div>
        </div>
      </div>
    </div>

    <div class="empty" v-if="!loading && filtered.length === 0">没有匹配的宠物，换个关键词或分类试试</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Search } from '@element-plus/icons-vue'
import { listOnSaleHealth } from '@/api/pet/petHealth'
import { CATEGORIES, FIELD_GROUPS } from './serviceData'

const props = defineProps({ section: { type: String, required: true } })

const router = useRouter()
const categories = CATEGORIES
const allList = ref([])
const loading = ref(true)
const selectedCat = ref(0)
const keyword = ref('')
const expanded = ref(new Set())

const GROUP_TITLES = { health: '🩺 健康筛查', origin: '📋 真实信息', care: '🐾 专业养护', after: '🛡️ 售后无忧' }
const ALL_GROUPS = ['health', 'origin', 'care', 'after']
const otherGroups = computed(() => ALL_GROUPS.filter(g => g !== props.section))

function groupTitle(g) { return GROUP_TITLES[g] }
function countByCat(id) { return allList.value.filter(p => p.categoryId === id).length }

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return allList.value.filter(p => {
    if (selectedCat.value !== 0 && p.categoryId !== selectedCat.value) return false
    if (kw) {
      const hay = ((p.petName || '') + ' ' + (p.breed || '')).toLowerCase()
      if (!hay.includes(kw)) return false
    }
    return true
  })
})

// 把原始字段配置转成 {label, value, cls}
function fieldOf(group, p) {
  return (FIELD_GROUPS[group] || []).map(f => {
    let cls = ''
    let value = f.get(p)
    if (f.type === 'badge') cls = levelClass(p.healthLevel) + ' badge'
    else if (f.type === 'tag') cls = 'tag ' + skillTag(p.skillLevel)
    else if (f.type === 'ok') cls = 'ok'
    else if (f.type === 'mono') cls = 'mono'
    if (value == null || value === '' || value === '—') value = '—'
    return { label: f.label, value, cls }
  })
}

function toggle(id) {
  const s = new Set(expanded.value)
  s.has(id) ? s.delete(id) : s.add(id)
  expanded.value = s
}

function catName(id) { return (categories.find(c => c.id === id) || {}).name || '宠物' }
function catFamily(id) { return (categories.find(c => c.id === id) || {}).family || '' }
function petEmoji(id) { return (categories.find(c => c.id === id) || {}).emoji || '🐾' }
function isImage(s) { return !!s && (s.indexOf('/') === 0 || s.indexOf('http') === 0) }
function levelClass(l) { return l === '优秀' ? 'lv-good' : l === '良好' ? 'lv-ok' : 'lv-warn' }
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
function goDetail(p) { router.push('/shop/pet/' + p.petId) }

onMounted(async () => {
  loading.value = true
  try {
    const res = await listOnSaleHealth({ pageNum: 1, pageSize: 300 })
    const d = res.data || {}
    allList.value = d.rows || []
  } catch (e) {
    allList.value = []
  } finally {
    loading.value = false
  }
})
</script>

<style scoped lang="scss">
.pet-query { margin-top: 8px; }
.toolbar { display: flex; flex-wrap: wrap; gap: 14px; align-items: center; justify-content: space-between;
  .cats { display: flex; flex-wrap: wrap; gap: 8px;
    .cat { border: 1px solid #ffe0c7; background: #fff; color: #606266; border-radius: 20px;
      padding: 7px 16px; font-size: 14px; cursor: pointer; transition: all .2s; display: flex; align-items: center; gap: 6px;
      .cnt { font-size: 12px; color: #c0a08a; background: #fff4e6; border-radius: 10px; padding: 0 7px; }
      &:hover { border-color: #ff8c42; color: #ff8c42; }
      &.active { background: linear-gradient(135deg, #ff9a56, #ff6b9d); color: #fff; border-color: transparent;
        .cnt { background: rgba(255,255,255,.25); color: #fff; }
      }
    }
  }
  .search { width: 300px; max-width: 100%; }
}
.coverage { color: #909399; font-size: 13px; margin: 14px 2px 6px;
  b { color: #ff6b9d; }
}
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(300px, 100%), 1fr)); gap: 18px; min-height: 120px;
  .card { background: #fff; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,.05);
    transition: transform .2s, box-shadow .2s; display: flex; flex-direction: column;
    &:hover { transform: translateY(-4px); box-shadow: 0 10px 24px rgba(0,0,0,.1); }
    .pic { position: relative; height: 168px; background: #fff4e6; display: flex; align-items: center; justify-content: center; cursor: pointer;
      img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .emoji { font-size: 66px; }
      .cat-tag { position: absolute; left: 10px; bottom: 10px; background: rgba(0,0,0,.5); color: #fff;
        font-size: 12px; border-radius: 12px; padding: 2px 10px; }
      .lv { position: absolute; top: 10px; right: 10px; color: #fff; font-size: 12px; border-radius: 12px; padding: 2px 10px;
        &.lv-good { background: #67c23a; } &.lv-ok { background: #409eff; } &.lv-warn { background: #e6a23c; }
      }
    }
    .info { padding: 14px 16px 14px; flex: 1; display: flex; flex-direction: column;
      .head { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap;
        h3 { margin: 0; font-size: 17px; color: #303133; cursor: pointer;
          &:hover { color: #ff6b9d; } }
        .breed { color: #909399; font-size: 13px; }
      }
      .meta { margin: 4px 0 10px; color: #a0a0a0; font-size: 12px; }
      .facts { margin: 0 0 8px; padding: 0; list-style: none;
        li { display: flex; gap: 8px; font-size: 13px; line-height: 1.9; color: #606266;
          .k { flex: 0 0 64px; color: #909399; }
          .v { flex: 1; word-break: break-all;
            &.ok { color: #67c23a; font-weight: 600; }
            &.mono { font-family: Consolas, monospace; color: #909399; }
            &.badge { display: inline-block; width: fit-content; padding: 1px 10px; border-radius: 10px; color: #fff; font-size: 12px;
              &.lv-good { background: #67c23a; } &.lv-ok { background: #409eff; } &.lv-warn { background: #e6a23c; } }
            &.tag { display: inline-block; width: fit-content; padding: 1px 10px; border-radius: 10px; font-size: 12px; color: #fff;
              &.t-success { background: #67c23a; } &.t-warning { background: #e6a23c; } &.t-danger { background: #f56c6c; } }
          }
        }
        &.sub { margin-bottom: 12px; }
      }
      .grp-title { font-size: 13px; color: #ff6b9d; font-weight: 600; margin: 6px 0 2px; }
      .expand { background: #fafafa; border-radius: 10px; padding: 10px 12px; margin-bottom: 8px; }
      .row { display: flex; align-items: center; gap: 8px; margin-top: auto; padding-top: 6px;
        .price { color: #f56c6c; font-weight: 700; font-size: 18px; }
        .spacer { flex: 1; }
      }
    }
  }
}
.empty { text-align: center; color: #c0c4cc; padding: 40px 0; }
</style>
