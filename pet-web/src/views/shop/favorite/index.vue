<template>
  <div class="my-fav">
    <div class="page-head">
      <h1>❤️ 我的收藏</h1>
      <p>你收藏的宠物，随时来看它们</p>
    </div>
    <div class="guest-alert" v-if="!userStore.token">
      <span>👀 您正在以游客身份浏览，</span>
      <el-button type="primary" link @click="openAuth('login')">登录</el-button>
      <span>后可查看和管理自己的收藏</span>
    </div>
    <div class="content" v-loading="loading">
      <div v-if="list.length === 0 && !loading" class="empty">
        <span class="icon">🤍</span>
        <p>还没有收藏任何宠物</p>
        <el-button type="primary" round @click="$router.push('/shop/home')">去逛逛</el-button>
      </div>
      <div class="grid" v-else>
        <div class="card" v-for="item in list" :key="item.favoriteId" @click="goDetail(item.petId)">
          <div class="avatar" :style="{ background: petGradient(item.petId) }">
            <img v-if="isImage(item.image)" :src="item.image" :alt="item.petName" class="avatar-photo" loading="lazy" />
            <span v-else>{{ petEmoji(item.categoryId) }}</span>
          </div>
          <div class="info">
            <div class="name">{{ item.petName || '宠物' }}</div>
            <div class="tags">
              <el-tag size="small" type="info">{{ item.breed || '未知品种' }}</el-tag>
              <el-tag size="small" type="success" v-if="item.age">{{ item.age }}岁</el-tag>
            </div>
            <div class="price" v-if="item.price">¥ {{ item.price }}</div>
          </div>
          <div class="ops">
            <el-button size="small" type="primary" round @click.stop="goDetail(item.petId)">查看</el-button>
            <el-button size="small" type="danger" round plain @click.stop="removeFav(item.favoriteId)">取消收藏</el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { listPetFavorite, delPetFavorite } from '@/api/pet/petFavorite'
import { listPetInfo } from '@/api/pet/petInfo'
import { useUserStore } from '@/store/modules/user'

const router = useRouter()
const userStore = useUserStore()
const openAuth = inject('openAuth', () => {})
const loading = ref(false)
const list = ref([])

const emojiPool = ['🐶', '🐱', '🐰', '🐹', '🐦', '🐢', '🐟', '🦎']
function petEmoji(c) { return emojiPool[(c || 0) % emojiPool.length] }
function isImage(s) { return !!s && (s.indexOf('/') === 0 || s.indexOf('http') === 0) }
function petGradient(id) {
  const colors = [['#fff4e6', '#ffe0b3'], ['#e8f5e9', '#c8e6c9'], ['#e3f2fd', '#bbdefb'], ['#fce4ec', '#f8bbd0']]
  return `linear-gradient(135deg, ${colors[(id||0)%colors.length][0]}, ${colors[(id||0)%colors.length][1]})`
}

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
      categoryId: petMap[f.petId]?.categoryId
    })).filter(item => item.petName)  // 只展示仍存在的宠物
  } catch (e) {
    ElMessage.error(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function goDetail(petId) {
  router.push(`/shop/pet/${petId}`)
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
.my-fav { max-width: 1200px; margin: 0 auto; padding: 32px 24px; }
.guest-alert { background: #fff7ef; border-radius: 10px; padding: 12px 18px; margin-bottom: 20px; font-size: 14px; color: #a06a3c; display: flex; align-items: center; gap: 4px; }
.page-head { margin-bottom: 24px;
  h1 { font-size: 26px; color: #303133; margin: 0 0 4px; }
  p { color: #909399; margin: 0; }
}
.empty { text-align: center; padding: 80px 0; color: #c0c4cc;
  .icon { font-size: 56px; display: block; margin-bottom: 12px; }
}
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
.card { background: #fff; border-radius: 12px; overflow: hidden; cursor: pointer; box-shadow: 0 2px 12px rgba(0,0,0,.06); transition: all .25s;
  &:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(0,0,0,.12); }
  .avatar { height: 140px; display: flex; align-items: center; justify-content: center; font-size: 64px; overflow: hidden;
    .avatar-photo { width: 100%; height: 100%; object-fit: cover; display: block; }
  }
  .info { padding: 14px 16px; }
  .name { font-size: 17px; font-weight: 600; color: #303133; margin-bottom: 8px; }
  .tags { display: flex; gap: 6px; margin-bottom: 6px; }
  .price { color: #f56c6c; font-weight: 700; }
  .ops { padding: 0 16px 16px; display: flex; gap: 8px; }
}
</style>
