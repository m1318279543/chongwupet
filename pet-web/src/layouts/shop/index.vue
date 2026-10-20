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
          <!-- 手机端：购物车快捷入口 + 汉堡按钮 -->
          <router-link to="/shop/cart" class="m-cart" aria-label="购物车">
            <el-icon :size="21"><ShoppingCart /></el-icon>
            <span class="cart-badge" v-if="cartCount > 0">{{ cartCount > 99 ? '99+' : cartCount }}</span>
          </router-link>
          <button class="hamburger" :class="{ active: menuOpen }" type="button"
                  :aria-expanded="menuOpen" aria-label="展开导航菜单" @click="toggleMenu">
            <span></span><span></span><span></span>
          </button>
          <!-- 桌面端用户区 -->
          <div class="desk-user">
            <template v-if="!isLogged">
              <el-button type="primary" round size="default" @click="openAuth('login')">登录</el-button>
              <el-button round size="default" @click="openAuth('register')">注册</el-button>
            </template>
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
      </div>

      <!-- 手机端下拉菜单 -->
      <transition name="m-drop">
        <div v-if="menuOpen" class="m-menu">
          <router-link to="/shop/home" class="m-item" @click="closeMenu">首页</router-link>
          <router-link to="/shop/match" class="m-item m-ai" @click="closeMenu">
            AI 选宠<span class="m-tag">智能推荐</span>
          </router-link>

          <div class="m-group">
            <button type="button" class="m-item m-toggle" :class="{ open: serviceOpen }" @click="serviceOpen = !serviceOpen">
              服务保障
              <el-icon class="caret"><ArrowDown /></el-icon>
            </button>
            <div class="m-sub" v-show="serviceOpen">
              <router-link v-for="s in serviceLinks" :key="s.to" :to="s.to" class="m-item m-sub-item" @click="closeMenu">
                {{ s.text }}
              </router-link>
            </div>
          </div>

          <router-link to="/shop/doctor" class="m-item" @click="closeMenu">宠物医生</router-link>
          <router-link to="/shop/consult" class="m-item" @click="closeMenu">联系客服</router-link>
          <router-link to="/shop/food" class="m-item" @click="closeMenu">宠物粮</router-link>
          <router-link to="/shop/cart" class="m-item" @click="closeMenu">
            购物车
            <span class="cart-badge" v-if="cartCount > 0">{{ cartCount > 99 ? '99+' : cartCount }}</span>
          </router-link>

          <template v-if="isLogged">
            <div class="m-divider"></div>
            <router-link to="/shop/favorite" class="m-item" @click="closeMenu">我的收藏</router-link>
            <router-link to="/shop/appointment" class="m-item" @click="closeMenu">我的预约</router-link>
            <router-link to="/shop/order" class="m-item" @click="closeMenu">我的订单</router-link>
            <div class="m-user">
              <div class="m-user-info">
                <el-avatar :size="34" class="avatar" :src="avatarUrl">{{ avatarText }}</el-avatar>
                <span class="m-uname">{{ userStore.nickName || userStore.userName }}</span>
              </div>
              <div class="m-user-actions">
                <button type="button" class="m-btn" @click="go('/shop/profile')">个人资料</button>
                <button type="button" class="m-btn m-btn-danger" @click="handleLogout">退出登录</button>
              </div>
            </div>
          </template>
          <template v-else>
            <div class="m-divider"></div>
            <div class="m-auth">
              <button type="button" class="m-btn m-btn-primary" @click="openAuthFromMenu('login')">登录</button>
              <button type="button" class="m-btn" @click="openAuthFromMenu('register')">注册</button>
            </div>
          </template>
        </div>
      </transition>
    </header>
    <div v-if="menuOpen" class="m-mask" @click="closeMenu"></div>

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
import { ref, computed, provide, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { ArrowDown, ShoppingCart } from '@element-plus/icons-vue'
import { useUserStore } from '@/store/modules/user'
import { useCartStore } from '@/store/modules/cart'
import AuthDialog from '@/components/AuthDialog.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const cartStore = useCartStore()
const authRef = ref()

// 触屏设备下拉改 click 触发（hover 不可靠）
const mql = window.matchMedia('(max-width: 900px)')
const isMobile = ref(mql.matches)
const onMqlChange = (e) => {
  isMobile.value = e.matches
  if (!e.matches) closeMenu()
}

const isLogged = computed(() => !!userStore.token)
const cartCount = computed(() => cartStore.totalCount)
const avatarText = computed(() => (userStore.nickName || userStore.userName || 'U').charAt(0).toUpperCase())

/* ---------- 手机端下拉菜单 ---------- */
const menuOpen = ref(false)
const serviceOpen = ref(false)
const serviceLinks = [
  { to: '/shop/service/health', text: '健康筛查' },
  { to: '/shop/service/origin', text: '真实信息' },
  { to: '/shop/service/care', text: '专业养护' },
  { to: '/shop/service/after', text: '售后无忧' }
]

function lockBody(lock) {
  document.body.style.overflow = lock ? 'hidden' : ''
}
function toggleMenu() {
  menuOpen.value = !menuOpen.value
  if (!menuOpen.value) serviceOpen.value = false
}
function closeMenu() {
  if (!menuOpen.value) return
  menuOpen.value = false
  serviceOpen.value = false
}
// 菜单展开时锁滚动，关闭/切页/卸载时恢复
watch(menuOpen, (v) => lockBody(v))
watch(() => route.fullPath, closeMenu)

function go(path) {
  closeMenu()
  router.push(path)
}

function openAuthFromMenu(mode) {
  closeMenu()
  // 等抽屉收起动画与 body 解锁，避免对话框被遮罩层影响
  setTimeout(() => openAuth(mode), 60)
}

function handleLogout() {
  closeMenu()
  ElMessageBox.confirm('确定要退出登录吗？', '提示', { type: 'warning' }).then(() => {
    userStore.logOut().then(() => {
      router.push('/shop/home')
      setTimeout(() => window.location.reload(), 100)
    })
  }).catch(() => {})
}

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
  lockBody(false)
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

// 桌面导航「服务保障」下拉跳转
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
    handleLogout()
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
    .name { font-size: 20px; font-weight: 700; color: #ff8c42; white-space: nowrap; }
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
  .cart-link { position: relative; }
  .cart-badge { display: inline-block; vertical-align: top; margin-left: 3px; transform: translateY(-3px);
    min-width: 18px; height: 18px; line-height: 16px; text-align: center; padding: 0 5px; border-radius: 9px;
    background: #ff4d4f; color: #fff; font-size: 12px; font-weight: 600; }
  .user-area { display: flex; align-items: center; gap: 8px; flex-shrink: 0;
    :deep(.el-button--primary) { background: #ff8c42; border-color: #ff8c42; }
    .user { display: flex; align-items: center; gap: 8px; cursor: pointer; }
    .avatar { background: #ff8c42; color: #fff; font-weight: 600; }
    .uname { font-size: 14px; color: #303133; }
  }
  .desk-user { display: flex; align-items: center; gap: 8px; }

  /* 手机专用控件（桌面隐藏） */
  .m-cart { display: none; position: relative; width: 38px; height: 38px; border-radius: 10px;
    align-items: center; justify-content: center; color: #303133;
    &:active { background: #f5f5f5; }
    .cart-badge { position: absolute; top: -1px; right: -1px; margin: 0; transform: none; }
  }
  .hamburger { display: none; width: 38px; height: 38px; padding: 0; border: 0; border-radius: 10px;
    background: transparent; cursor: pointer; flex-direction: column; align-items: center; justify-content: center;
    gap: 4px; -webkit-tap-highlight-color: transparent;
    span { display: block; width: 19px; height: 2px; border-radius: 1px; background: #303133;
      transition: transform .25s ease, opacity .18s ease; }
    &:active { background: #f5f5f5; }
    &.active span:nth-child(1) { transform: translateY(6px) rotate(45deg); }
    &.active span:nth-child(2) { opacity: 0; }
    &.active span:nth-child(3) { transform: translateY(-6px) rotate(-45deg); }
  }

  /* 下拉菜单（仅手机端显示） */
  .m-menu { display: none; }
}
.m-mask { display: none; }

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

/* ===== 手机端：导航折叠为下拉菜单 ===== */
@media (max-width: 900px) {
  .topbar {
    .bar-inner { height: 56px; padding: 0 10px 0 12px; gap: 8px; }
    .brand { margin-right: auto;
      .logo { font-size: 22px; }
      .name { font-size: 17px; }
    }
    .nav, .desk-user { display: none; }
    .user-area { gap: 2px; }
    .m-cart { display: inline-flex; }
    .hamburger { display: inline-flex; }

    .m-menu {
      display: block; position: absolute; top: 100%; left: 0; right: 0; z-index: 101;
      background: #fff; border-top: 1px solid #f2f2f2;
      box-shadow: 0 16px 28px rgba(0,0,0,.14);
      max-height: calc(100vh - 56px); overflow-y: auto; -webkit-overflow-scrolling: touch;
      padding: 6px 0 14px;
    }
    .m-item {
      display: flex; align-items: center; gap: 8px;
      padding: 13px 20px; font-size: 16px; color: #303133; text-decoration: none;
      background: transparent; border: 0; width: 100%; text-align: left; font-family: inherit;
      line-height: 1.3; box-sizing: border-box;
      &.router-link-active { color: #ff8c42; background: #fff7f1; font-weight: 600; }
      &:active { background: #f7f7f7; }
    }
    .m-ai { color: #ff7a3d; font-weight: 600;
      .m-tag { margin-left: auto; font-size: 12px; font-weight: 400; color: #ff8c42;
        background: #fff1e6; border-radius: 10px; padding: 2px 8px; }
    }
    .m-toggle { justify-content: space-between; cursor: pointer;
      .caret { font-size: 14px; color: #909399; transition: transform .22s ease; }
      &.open .caret { transform: rotate(180deg); }
    }
    .m-sub { background: #fafafa;
      .m-sub-item { padding-left: 40px; font-size: 15px; color: #606266; }
    }
    .m-divider { height: 8px; background: #f6f6f6; margin: 6px 0; }
    .m-user { padding: 4px 20px 0;
      .m-user-info { display: flex; align-items: center; gap: 10px; padding: 10px 0 12px; }
      .m-uname { font-size: 15px; color: #303133; font-weight: 600; }
      .m-user-actions { display: flex; gap: 10px; }
    }
    .m-auth { display: flex; gap: 10px; padding: 4px 20px 0; }
    .m-btn { flex: 1; height: 40px; border-radius: 20px; border: 1px solid #dcdfe6; background: #fff;
      color: #303133; font-size: 15px; font-family: inherit; cursor: pointer;
      &:active { background: #f5f5f5; }
    }
    .m-btn-primary { background: #ff8c42; border-color: #ff8c42; color: #fff; font-weight: 600;
      &:active { background: #f07c33; }
    }
    .m-btn-danger { color: #ff4d4f; border-color: #ffd6d6; }
  }
  .m-mask { display: block; position: fixed; inset: 0; top: 56px; z-index: 99; background: rgba(0,0,0,.32); }
}

.m-drop-enter-active, .m-drop-leave-active { transition: opacity .2s ease, transform .24s ease; }
.m-drop-enter-from, .m-drop-leave-to { opacity: 0; transform: translateY(-8px); }

.content { flex: 1; }
.footer { text-align: center; padding: 24px; color: #909399; font-size: 13px; background: #fff; border-top: 1px solid #f0f0f0; }
.fade-enter-active, .fade-leave-active { transition: opacity .2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
