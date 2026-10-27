<template>
  <div class="ui-page ui-page--md">
    <!-- 页面头：标题左、计数右，靠一条 1px 线收口 -->
    <header class="ui-head">
      <div class="ui-head__main">
        <p class="ui-eyebrow">Collection</p>
        <h1 class="ui-title">我的收藏</h1>
        <p class="ui-sub">收藏的宠物集中在这里，点任意一行查看完整档案。</p>
      </div>
      <div class="ui-head__aside">
        <span class="ui-count"><b>{{ list.length }}</b>只已收藏</span>
      </div>
    </header>

    <!-- 游客提示：只留一条左侧色线，不做提示卡片 -->
    <p v-if="!userStore.token" class="fav-note">
      当前为游客浏览，
      <button type="button" class="ui-linkbtn" @click="openAuth('login')">登录</button>
      后可管理自己的收藏。
    </p>

    <section class="fav-body" v-loading="loading">
      <!-- 定高列表：每页 5 条（5 × 116px ≈ 583px），超出靠底部翻页 -->
      <div class="ui-box fav-box" v-if="list.length">
        <div class="ui-box__body">
          <ul class="ui-list">
            <li
              v-for="item in pagedList"
              :key="item.favoriteId"
              class="ui-row ui-row--link"
              @click="goDetail(item.petId)"
            >
              <div class="ui-thumb">
                <img
                  v-if="isImage(item.image)"
                  :src="item.image"
                  :alt="item.petName"
                  loading="lazy"
                  @error="onImgError(item)"
                />
                <span v-else class="ui-thumb__ph">暂无图</span>
              </div>

              <div class="ui-row__main">
                <div class="ui-row__title">{{ item.petName || '宠物' }}</div>
                <div class="ui-row__meta">
                  <span>{{ item.breed || '品种待补' }}</span>
                  <span v-if="item.age">{{ item.age }}</span>
                </div>
              </div>

              <div class="ui-row__end">
                <span class="ui-price ui-row__price" v-if="item.price"><small>¥</small>{{ item.price }}</span>
                <div class="ui-row__ops">
                  <button type="button" class="ui-linkbtn" @click.stop="goDetail(item.petId)">
                    查看档案<span aria-hidden="true">→</span>
                  </button>
                  <button type="button" class="ui-linkbtn ui-linkbtn--danger" @click.stop="removeFav(item.favoriteId)">
                    取消收藏
                  </button>
                </div>
              </div>
            </li>
          </ul>
        </div>

        <!-- 翻页条：位置固定，翻页时页脚不动 -->
        <div class="ui-box__foot">
          <span class="ui-box__count">第 {{ rangeStart }}–{{ rangeEnd }} 条 / 共 {{ list.length }} 条</span>
          <Pagination
            v-if="list.length > PAGE_SIZE"
            :total="list.length"
            v-model:page="page"
            :limit="PAGE_SIZE"
            :page-sizes="[PAGE_SIZE]"
            :background="false"
            layout="prev, pager, next"
            :auto-scroll="false"
          />
        </div>
      </div>

      <!-- 空态：纯文案 + 一个主操作，不画插图、不套卡片 -->
      <div v-else-if="!loading" class="ui-empty">
        <p class="ui-empty__title">还没有收藏任何宠物</p>
        <p class="ui-empty__desc">在宠物档案页点「收藏」，这里就会留下记录。</p>
        <div class="ui-empty__act">
          <button type="button" class="ui-btn ui-btn--line" @click="$router.push('/shop/home')">去挑一只</button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, inject } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { listPetFavorite, delPetFavorite } from '@/api/pet/petFavorite'
import { listPetInfo } from '@/api/pet/petInfo'
import { useUserStore } from '@/store/modules/user'
import Pagination from '@/components/Pagination/index.vue'

const router = useRouter()
const userStore = useUserStore()
const openAuth = inject('openAuth', () => {})
const loading = ref(false)
const list = ref([])

// 定高列表分页：每页 5 条（单行 116px，5 行正好铺满 583px 的列表区）
const PAGE_SIZE = 5
const page = ref(1)
const pagedList = computed(() => list.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE))
const rangeStart = computed(() => (list.value.length ? (page.value - 1) * PAGE_SIZE + 1 : 0))
const rangeEnd = computed(() => Math.min(page.value * PAGE_SIZE, list.value.length))
// 收藏被取消后总数可能少于当前页起点，回到第一页避免空白页
watch(() => list.value.length, (len) => {
  if ((page.value - 1) * PAGE_SIZE >= len) page.value = 1
})

function isImage(s) { return !!s && (s.indexOf('/') === 0 || s.indexOf('http') === 0) }
// 图片 404 / 加载失败时回退成占位文案，避免出现破图
function onImgError(item) { item.image = '' }

async function loadData() {
  loading.value = true
  try {
    // 拿我的收藏列表
    const favRes = await listPetFavorite({ userId: userStore.userId, pageNum: 1, pageSize: 1000 })
    const favs = favRes.rows || []
    if (favs.length === 0) { list.value = []; return }
    // 拿所有宠物信息，前端 join
    const petRes = await listPetInfo({ pageNum: 1, pageSize: 1000 })
    const pets = petRes.rows || []
    const petMap = {}
    pets.forEach(p => petMap[p.petId] = p)
    list.value = favs.map(f => ({
      favoriteId: f.favoriteId,
      petId: f.petId,
      petName: petMap[f.petId]?.petName,
      breed: petMap[f.petId]?.breed,
      age: petMap[f.petId]?.age,
      price: petMap[f.petId]?.price,
      // 收藏接口本身会联表返回 image，宠物表兜底再取一次
      image: f.image || petMap[f.petId]?.image
    })).filter(item => item.petName)  // 只展示仍存在的宠物
  } catch (e) {
    ElMessage.error(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function goDetail(petId) {
  // from 供详情页返回与导航高亮使用
  router.push({ path: `/shop/pet/${petId}`, query: { from: '/shop/favorite' } })
}

function removeFav(favoriteId) {
  ElMessageBox.confirm('确定取消收藏这只宠物吗？', '提示', { type: 'warning' }).then(async () => {
    await delPetFavorite(favoriteId)
    ElMessage.success('已取消收藏')
    loadData()
  }).catch(() => {})
}

onMounted(loadData)
</script>

<style scoped lang="scss">
// 注意：页面骨架、行列表、缩略图、空态全部来自 styles/flat.scss 的 .ui-* 基元，
// 这里只写本页特有的两处：游客提示的内缩，和空态里的一个描边按钮。

// 游客提示：左侧 2px 色线替代整块浅底提示卡
.fav-note {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 2px;
  margin: 22px 0 0;
  padding: 2px 0 2px 12px;
  border-left: 2px solid var(--brand-300);
  font-size: 13.5px;
  color: var(--text-2);
}

// 数据未回来时给加载遮罩留出高度，避免布局跳动
.fav-body { margin-top: 8px; min-height: 240px; }

// 列表区定高：5 行 × 116px + 行内 1px 线 ≈ 583px，翻页条在列表下方独立成行
</style>
