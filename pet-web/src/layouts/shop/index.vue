<template>
  <div class="shop-layout">
    <!-- 顶栏导航 -->
    <header class="topbar">
      <div class="bar-inner">
        <div class="brand" @click="router.push('/shop/home')">
          <span class="logo">🐾</span>
          <span class="name">宠物之家</span>
        </div>
        <nav class="nav">
          <router-link to="/shop/home" class="nav-item">首页</router-link>
          <router-link to="/shop/match" class="nav-item nav-ai">AI 选宠</router-link>
          <el-dropdown class="nav-item service-dropdown" @command="goService" :trigger="isMobile ? 'click' : 'hover'">
            <span class="drop-trigger">服务保障<el-icon class="caret"><ArrowDown /></el-icon></span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="/shop/service/health">健康筛查</el-dropdown-item>
                <el-dropdown-item command="/shop/service/origin">真实信息</el-dropdown-item>
                <el-dropdown-item command="/shop/service/care">专业养护</el-dropdown-item>
                <el-dropdown-item command="/shop/service/after">售后无忧</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <router-link to="/shop/doctor" class="nav-item">宠物医生</router-link>
          <router-link to="/shop/consult" class="nav-item">联系客服</router-link>
          <router-link to="/shop/food" class="nav-item">宠物粮</router-link>
          <router-link to="/shop/cart" class="nav-item cart-link">
            购物车
            <span class="cart-badge" v-if="cartCount > 0">{{ cartCount > 99 ? '99+' : cartCount }}</span>
          </router-link>
          <router-link to="/shop/favorite" class="nav-item" v-if="isLogged">我的收藏</router-link>
          <router-link to="/shop/appointment" class="nav-item" v-if="isLogged">我的预约</router-link>
          <router-link to="/shop/order" class="nav-item" v-if="isLogged">我的订单</router-link>
        </nav>
        <div class="user-area">
          <!-- 未登录：登录/注册按钮 -->
          <template v-if="!isLogged">
            <el-button type="primary" round size="default" @click="openAuth('login')">登录</el-button>
            <el-button round size="default" @click="openAuth('register')">注册</el-button>
          </template>
          <!-- 已登录：头像下拉 -->
          <el-dropdown v-else @command="handleCommand">
            <span class="user">
              <el-avatar :size="30" class="avatar" :src="avatarUrl">{{ avatarText }}</el-avatar>
              <span class="uname">{{ userStore.nickName || userStore.userName }}</span>
              <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">个人资料</el-dropdown-item>
                <el-dropdown-item command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </header>

    <!-- 内容区 -->
    <main class="content">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <!-- 页脚 -->
    <footer class="footer">
      <p>🐾 宠物之家 · 让每一只宠物找到温暖的家</p>
    </footer>

    <!-- 登录注册对话框 -->
    <AuthDialog ref="authRef" @success="onAuthSuccess" />
  </div>
</template>

<script setup>
import { ref, computed, provide, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { ArrowDown } from '@element-plus/icons-vue'
import { useUserStore } from '@/store/modules/user'
import { useCartStore } from '@/store/modules/cart'
import AuthDialog from '@/components/AuthDialog.vue'

const router = useRouter()
const userStore = useUserStore()
const cartStore = useCartStore()
const authRef = ref()

// 触屏设备下拉改 click 触发（hover 不可靠）
const mql = window.matchMedia('(max-width: 900px)')
const isMobile = ref(mql.matches)
const onMqlChange = (e) => { isMobile.value = e.matches }

const isLogged = computed(() => !!userStore.token)
const cartCount = computed(() => cartStore.totalCount)
const avatarText = computed(() => (userStore.nickName || userStore.userName || 'U').charAt(0).toUpperCase())

// 页面重新可见时刷新用户资料（后台改了昵称/头像，切回前台即可看到）
let lastInfoAt = 0
function refreshUserInfo() {
  if (!userStore.token) return
  const now = Date.now()
  if (now - lastInfoAt < 15000) return
  lastInfoAt = now
  userStore.getInfo().catch(() => {})
}
onMounted(() => {
  mql.addEventListener('change', onMqlChange)
  document.addEventListener('visibilitychange', refreshUserInfo)
  window.addEventListener('focus', refreshUserInfo)
})
onBeforeUnmount(() => {
  mql.removeEventListener('change', onMqlChange)
  document.removeEventListener('visibilitychange', refreshUserInfo)
  window.removeEventListener('focus', refreshUserInfo)
})
// 头像后端存的是 /profile/xxx 相对路径，需拼 API 前缀
const avatarUrl = computed(() => {
  const p = userStore.avatar
  if (!p) return ''
  if (/^https?:\/\//.test(p)) return p
  return (import.meta.env.VITE_APP_BASE_API || '/dev-api') + (p.startsWith('/') ? p : '/' + p)
})

function openAuth(mode) {
  authRef.value?.open(mode)
}

// 导航栏「服务保障」下拉跳转
function goService(path) {
  router.push(path)
}

// 提供给子页面：未登录操作时触发登录对话框
provide('openAuth', openAuth)

function onAuthSuccess() {
  // 登录成功后刷新当前页，让收藏/预约等数据重新加载
  window.location.reload()
}

function handleCommand(cmd) {
  if (cmd === 'profile') {
    router.push('/shop/profile')
    return
  }
  if (cmd === 'logout') {
    ElMessageBox.confirm('确定要退出登录吗？', '提示', { type: 'warning' }).then(() => {
      userStore.logOut().then(() => {
        router.push('/shop/home')
        setTimeout(() => window.location.reload(), 100)
      })
    }).catch(() => {})
  }
}
</script>

<style scoped lang="scss">
.shop-layout { min-height: 100vh; display: flex; flex-direction: column; background: #fafafa; }
.topbar {
  position: sticky; top: 0; z-index: 100;
  background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,.06);
  .bar-inner { max-width: 1200px; margin: 0 auto; height: 64px; display: flex; align-items: center; padding: 0 24px; }
  .brand { display: flex; align-items: center; gap: 8px; cursor: pointer; margin-right: 36px; flex-shrink: 0;
    .logo { font-size: 24px; }
    .name { font-size: 20px; font-weight: 700; color: #ff8c42; }
  }
  /* 手机端：导航在自身盒子内横向滚动，溢出内容被裁切，不再压到右侧登录按钮上 */
  .nav { display: flex; gap: 26px; flex: 1; align-items: center; min-width: 0;
    overflow-x: auto; overflow-y: hidden; scrollbar-width: none; -webkit-overflow-scrolling: touch;
    padding: 14px 2px; margin: -14px -2px; /* 裁切框外扩，保住 AI 胶囊阴影与选中下划线 */
    &::-webkit-scrollbar { display: none; }
  }
  .nav-item { font-size: 15px; color: #606266; padding: 6px 0; border-bottom: 2px solid transparent; transition: all .2s;
    white-space: nowrap; flex-shrink: 0;
    &:hover, &.router-link-active { color: #ff8c42; border-bottom-color: #ff8c42; }
  }
  .nav-ai { color: #fff; background: linear-gradient(135deg, #ff6b35, #ff9f5e); padding: 6px 14px; border-radius: 16px; font-weight: 600;
    box-shadow: 0 3px 10px rgba(255, 107, 53, .28);
    &:hover, &.router-link-active { color: #fff; border-bottom-color: transparent; opacity: .92; }
  }
  .service-dropdown { display: inline-flex; align-items: center; flex-shrink: 0;
    .drop-trigger { display: inline-flex; align-items: center; gap: 2px; font-size: 15px; color: #606266;
      cursor: pointer; padding: 6px 0; border-bottom: 2px solid transparent; transition: all .2s;
      white-space: nowrap;
      &:hover { color: #ff8c42; border-bottom-color: #ff8c42; }
      .caret { font-size: 13px; }
    }
  }
  .cart-link { position: relative;
    .cart-badge { display: inline-block; vertical-align: top; margin-left: 3px; transform: translateY(-3px);
      min-width: 18px; height: 18px; line-height: 16px; text-align: center; padding: 0 5px; border-radius: 9px;
      background: #ff4d4f; color: #fff; font-size: 12px; font-weight: 600; }
  }
  .user-area { display: flex; align-items: center; gap: 8px; flex-shrink: 0;
    :deep(.el-button--primary) { background: #ff8c42; border-color: #ff8c42; }
    .user { display: flex; align-items: center; gap: 8px; cursor: pointer; }
    .avatar { background: #ff8c42; color: #fff; font-weight: 600; }
    .uname { font-size: 14px; color: #303133; }
  }
}
/* 中等宽度：收紧间距，保证导航始终单行不折行 */
@media (max-width: 1240px) {
  .topbar .brand { margin-right: 20px; }
  .topbar .nav { gap: 16px; }
}
@media (max-width: 1100px) {
  .topbar .nav { gap: 12px; }
  .topbar .nav-item, .topbar .service-dropdown .drop-trigger { font-size: 14px; }
  .topbar .nav-ai { padding: 5px 10px; }
}
@media (max-width: 1000px) {
  .topbar .nav { gap: 10px; }
  .topbar .user-area .uname { display: none; }
}
/* 窄屏 / 窄预览面板：品牌只留爪印，导航区内滚动，登录按钮固定右侧 */
@media (max-width: 900px) {
  .topbar .bar-inner { padding: 0 12px; }
  .topbar .brand { margin-right: 14px;
    .name { display: none; }
  }
  .topbar .nav { gap: 14px; }
  .topbar .user-area { flex-shrink: 0;
    :deep(.el-button) { padding: 8px 12px; }
  }
}
.content { flex: 1; }
.footer { text-align: center; padding: 24px; color: #909399; font-size: 13px; background: #fff; border-top: 1px solid #f0f0f0; }
.fade-enter-active, .fade-leave-active { transition: opacity .2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
