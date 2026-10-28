<template>
  <div class="shop-layout">
    <!-- 顶栏导航 -->
    <header class="topbar">
      <div class="bar-inner">
        <div class="brand" @click="router.push('/shop/home')">
          <span class="logo" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M7.2 10.2c1.2-1.5 1.6-3.4.9-4.3-.7-.9-2.1-.5-3.1.9s-1.2 3.2-.3 4c.6.5 1.6.3 2.5-.6zM16.8 10.2c-1.2-1.5-1.6-3.4-.9-4.3.7-.9 2.1-.5 3.1.9s1.2 3.2.3 4c-.6.5-1.6.3-2.5-.6zM12 10.6c1.6 0 3-.9 3.6-2 .7-1.3.2-2.9-1.1-3.5-1.5-.7-3.5-.7-5 0-1.3.6-1.8 2.2-1.1 3.5.6 1.1 2 2 3.6 2zM5.3 13.6c1.4-.5 2.3-1.6 2-2.6-.3-1-1.7-1.4-3.1-.9-1.4.5-2.3 1.6-2 2.6.3 1 1.7 1.4 3.1.9zM18.7 13.6c-1.4-.5-2.3-1.6-2-2.6.3-1 1.7-1.4 3.1-.9 1.4.5 2.3 1.6 2 2.6-.3 1-1.7 1.4-3.1.9zM12 12c-2.6 0-5.6 2.2-5.6 5 0 1.9 1.3 3.2 3 3.2 1 0 1.8-.5 2.6-.5s1.6.5 2.6.5c1.7 0 3-1.3 3-3.2 0-2.8-3-5-5.6-5z"/></svg>
          </span>
          <span class="brand-txt">
            <strong>宠物之家</strong>
            <span>CHONGWU HOME · 重庆</span>
          </span>
        </div>

        <!-- 主导航：首页 + 在售宠物（完整列表）+ 服务入口，个人事务收进头像菜单 -->
        <nav class="nav" aria-label="主导航">
          <router-link to="/shop/home" class="nav-item" :class="{ on: homeActive }">首页</router-link>
          <router-link to="/shop/pets" class="nav-item" :class="{ on: petsActive }">在售宠物</router-link>
          <router-link to="/shop/food" class="nav-item">宠物粮</router-link>
          <router-link to="/shop/match" class="nav-item nav-ai" :class="{ on: matchActive }">
            <svg class="spark" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9zM18.5 15l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9z"/></svg>
            智能选宠
          </router-link>
          <router-link to="/shop/cart" class="nav-item" :class="{ on: route.path.startsWith('/shop/cart') }">
            购物车<i v-if="cartCount > 0" class="nav-badge">{{ cartCount > 99 ? '99+' : cartCount }}</i>
          </router-link>
        </nav>

        <div class="user-area">
          <!-- 站内消息铃铛（登录后显示，桌面/手机共用） -->
          <NotificationBell v-if="isLogged" more-path="/shop/cart" />
          <!-- 手机端：购物车快捷入口 + 汉堡按钮 -->
          <router-link to="/shop/cart" class="m-cart" aria-label="购物车">
            <!-- 与导航/底栏同一族自绘线性图标（1.8 描边），不混用 Element 图标 -->
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h2l2.2 11h9.6L20 8H7"/><circle cx="9.5" cy="19" r="1.4"/><circle cx="16.5" cy="19" r="1.4"/></svg>
            <span class="cart-badge" v-if="cartCount > 0">{{ cartCount > 99 ? '99+' : cartCount }}</span>
          </router-link>
          <button class="hamburger" :class="{ active: menuOpen }" type="button"
                  :aria-expanded="menuOpen" aria-label="展开导航菜单" @click="toggleMenu">
            <span></span><span></span><span></span>
          </button>
          <!-- 桌面端用户区 -->
          <div class="desk-user">
            <template v-if="!isLogged">
              <!-- 注册入口暂不开放：注册链路未启用（账号由后台导入），开放前先统一加密口径，见 docs/上线前注意事项.md -->
              <el-button type="primary" round size="default" @click="openAuth('login')">登录</el-button>
            </template>
            <el-dropdown v-else @command="handleCommand">
              <span class="user">
                <el-avatar :size="34" class="avatar" :src="avatarUrl" @error="avatarBroken = true">{{ avatarText }}</el-avatar>
                <span class="uname">{{ userStore.nickName || userStore.userName }}</span>
                <el-icon><ArrowDown /></el-icon>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="/shop/cart">购物车</el-dropdown-item>
                  <el-dropdown-item command="/shop/mypet">我的宠物</el-dropdown-item>
                  <el-dropdown-item command="/shop/appointment">我的预约</el-dropdown-item>
                  <el-dropdown-item command="/shop/favorite">我的收藏</el-dropdown-item>
                  <el-dropdown-item command="/shop/profile" divided>个人资料</el-dropdown-item>
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
          <template v-if="isLogged">
            <router-link to="/shop/mypet" class="m-item" @click="closeMenu">我的宠物</router-link>
            <router-link to="/shop/appointment" class="m-item" @click="closeMenu">我的预约</router-link>
            <router-link to="/shop/favorite" class="m-item" @click="closeMenu">我的收藏</router-link>
            <div class="m-user">
              <div class="m-user-info">
                <el-avatar :size="34" class="avatar" :src="avatarUrl" @error="avatarBroken = true">{{ avatarText }}</el-avatar>
                <span class="m-uname">{{ userStore.nickName || userStore.userName }}</span>
              </div>
              <div class="m-user-actions">
                <button type="button" class="m-btn" @click="go('/shop/profile')">个人资料</button>
                <button type="button" class="m-btn m-btn-danger" @click="handleLogout">退出登录</button>
              </div>
            </div>
          </template>
          <template v-else>
            <div class="m-auth">
              <!-- 注册入口暂不开放，同桌面端 -->
              <button type="button" class="m-btn m-btn-primary" @click="openAuthFromMenu('login')">登录</button>
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

    <!-- 手机端底部标签栏：顺序与桌面主导航保持同一心智模型（首页→在售→粮→选宠），桌面端隐藏 -->
    <nav class="tabbar" aria-label="快捷导航">
      <router-link to="/shop/home" class="tab" :class="{ on: homeActive }">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 11L12 4l8.5 7"/><path d="M5.8 10.2V20h12.4v-9.8"/></svg>
        <span>首页</span>
      </router-link>
      <router-link to="/shop/pets" class="tab" :class="{ on: petsActive }">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 4.5h6v6h-6zM13.5 4.5h6v6h-6zM4.5 13.5h6v6h-6zM13.5 13.5h6v6h-6z"/></svg>
        <span>在售</span>
      </router-link>
      <router-link to="/shop/food" class="tab">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10h16a8 8 0 01-16 0z"/><path d="M9 7.5c0-1 1-1.5 1-2.5M13 7.5c0-1 1-1.5 1-2.5"/></svg>
        <span>宠物粮</span>
      </router-link>
      <router-link to="/shop/match" class="tab">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9zM18.5 15l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9z"/></svg>
        <span>选宠</span>
      </router-link>
      <button type="button" class="tab" :class="{ on: route.path.startsWith('/shop/profile') }" @click="goMine">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c1.2-3.4 4-5 7-5s5.8 1.6 7 5"/></svg>
        <span>我的</span>
      </button>
    </nav>

    <!-- 登录注册对话框 -->
    <AuthDialog ref="authRef" @success="onAuthSuccess" />

    <!-- AI 助手：场景内嵌唤起 + 桌面右下入口 -->
    <AssistantDock />
  </div>
</template>

<script setup>
import { ref, computed, provide, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { ArrowDown } from '@element-plus/icons-vue'
import { useUserStore } from '@/store/modules/user'
import { useCartStore } from '@/store/modules/cart'
import AuthDialog from '@/components/AuthDialog.vue'
import NotificationBell from '@/components/NotificationBell.vue'
import AssistantDock from '@/components/assistant/AssistantDock.vue'
import { useAssistant } from '@/components/assistant/useAssistant'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const cartStore = useCartStore()
const assistant = useAssistant()
const authRef = ref()

// 触屏设备下拉改 click 触发（hover 不可靠）
// 折叠断点与样式保持一致：768 以下收起主导航、显示汉堡与底部标签栏。
// 769–1000 保留完整主导航，避免平板区间只剩一个汉堡、既无导航也无底栏。
const mql = window.matchMedia('(max-width: 768px)')
const isMobile = ref(mql.matches)
const onMqlChange = (e) => {
  isMobile.value = e.matches
  if (!e.matches) closeMenu()
}

const isLogged = computed(() => !!userStore.token)
const cartCount = computed(() => cartStore.totalCount)
const avatarText = computed(() => (userStore.nickName || userStore.userName || 'U').charAt(0).toUpperCase())
// 宠物详情页：导航高亮跟随进入来源（?from=），无来源时不挂高亮
const detailFrom = computed(() => (route.path.startsWith('/shop/pet/') ? String(route.query.from || '') : ''))
const petsActive = computed(() => route.path === '/shop/pets' || detailFrom.value === '/shop/pets')
const homeActive = computed(() => route.path === '/shop/home' || detailFrom.value === '/shop/home')
const matchActive = computed(() => route.path === '/shop/match' || detailFrom.value === '/shop/match')

/* ---------- 手机端下拉菜单 ---------- */
const menuOpen = ref(false)

function lockBody(lock) {
  document.body.style.overflow = lock ? 'hidden' : ''
}
function toggleMenu() {
  menuOpen.value = !menuOpen.value
}
function closeMenu() {
  if (!menuOpen.value) return
  menuOpen.value = false
}
// 菜单展开时锁滚动，关闭/切页/卸载时恢复
watch(menuOpen, (v) => lockBody(v))
watch(() => route.fullPath, () => {
  closeMenu()
  // 切页时顺带同步一次资料，后台改过昵称/头像也能立刻生效
  refreshUserInfo()
})

function go(path) {
  closeMenu()
  router.push(path)
}

// 底部标签栏「我的」：登录进个人资料，未登录唤起登录弹窗
function goMine() {
  if (isLogged.value) router.push('/shop/profile')
  else openAuth('login')
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
  window.addEventListener('pet-assistant-open', onAssistantOpen)
})
onBeforeUnmount(() => {
  mql.removeEventListener('change', onMqlChange)
  document.removeEventListener('visibilitychange', refreshUserInfo)
  window.removeEventListener('focus', refreshUserInfo)
  window.removeEventListener('pet-assistant-open', onAssistantOpen)
  lockBody(false)
})

/** 页面通过 window 事件唤起助手，避免每个页面都引入同一份状态 */
function onAssistantOpen(event) {
  assistant.open({ ...(event?.detail || {}), fresh: true })
}
// 头像后端存的是 /profile/xxx 相对路径，需拼 API 前缀
// 头像文件失效时退回文字头像
const avatarBroken = ref(false)
watch(() => userStore.avatar, () => { avatarBroken.value = false })
const avatarUrl = computed(() => {
  if (avatarBroken.value) return ''
  const p = userStore.avatar
  if (!p) return ''
  if (/^https?:\/\//.test(p)) return p
  return (import.meta.env.VITE_APP_BASE_API || '/dev-api') + (p.startsWith('/') ? p : '/' + p)
})

function openAuth(mode) {
  authRef.value?.open(mode)
}

// 提供给子页面：未登录操作时触发登录对话框
provide('openAuth', openAuth)

function onAuthSuccess() {
  // 登录成功后刷新当前页，让收藏/预约等数据重新加载
  window.location.reload()
}

function handleCommand(cmd) {
  if (cmd === 'logout') {
    handleLogout()
    return
  }
  if (cmd) router.push(cmd)
}
</script>

<style scoped lang="scss">
.shop-layout { min-height: 100vh; display: flex; flex-direction: column; background: var(--bg-page); }

/* ===== 顶栏 ===== */
.topbar {
  position: sticky; top: 0; z-index: 100;
  background: rgba(255, 255, 255, .92);
  backdrop-filter: saturate(1.6) blur(12px);
  border-bottom: 1px solid var(--border-1);

  .bar-inner {
    max-width: var(--container-lg); margin: 0 auto; height: 72px;
    display: flex; align-items: center; gap: 32px; padding: 0 24px;
  }

  .brand {
    display: flex; align-items: center; gap: 10px; cursor: pointer;
    flex-shrink: 0;
    .logo {
      width: 36px; height: 36px; border-radius: var(--radius-md); display: grid; place-items: center;
      background: var(--grad-brand);
      svg { width: 20px; height: 20px; fill: #fff; }
    }
    .brand-txt {
      strong { display: block; font-size: 16px; font-weight: 700; color: var(--text-1); line-height: 1.2; letter-spacing: -.01em; }
      span { display: block; font-size: 11px; letter-spacing: .14em; color: var(--text-3); font-weight: 500; }
    }
  }

  .nav {
    display: flex; align-items: center; gap: 4px; flex: 1; min-width: 0;
    overflow-x: auto; overflow-y: hidden; scrollbar-width: none;
    padding: 14px 2px; margin: -14px -2px;
    &::-webkit-scrollbar { display: none; }
  }
  .nav-item {
    position: relative; display: inline-flex; align-items: center; gap: 6px;
    padding: 10px 14px; font-size: 16px; font-weight: 500; color: var(--text-2);
    border-radius: var(--radius-sm); white-space: nowrap; flex-shrink: 0;
    transition: color .16s, background .16s;
    &:hover { color: var(--text-1); background: var(--bg-sunken); }
    &.on, &.router-link-active { color: var(--text-1); font-weight: 700; }
    &.on::after, &.router-link-active::after {
      content: ''; position: absolute; left: 14px; right: 14px; bottom: 2px;
      height: 2px; border-radius: 2px; background: var(--brand-600);
    }
  }
  .nav-ai {
    color: var(--brand-700);
    .spark { width: 14px; height: 14px; fill: var(--brand-500); }
    &:hover { background: var(--brand-50); color: var(--brand-700); }
  }

  // 导航购物车数量徽标
  .nav-badge {
    font-style: normal; font-size: 11px; font-weight: 700; line-height: 1;
    padding: 3px 6px; border-radius: 999px;
    background: var(--brand-600); color: #fff;
    font-variant-numeric: tabular-nums;
  }

  .user-area { display: flex; align-items: center; gap: 4px; flex-shrink: 0;
    .user { display: flex; align-items: center; gap: 8px; cursor: pointer; padding-left: 6px; }
    .avatar { background: var(--brand-50); color: var(--brand-700); font-weight: 700;
      border: 1px solid var(--brand-200); }
    .uname { font-size: 14px; color: var(--text-1); }
  }
  .desk-user { display: flex; align-items: center; gap: 8px; }

  /* 手机专用控件（桌面隐藏） */
  .m-cart { display: none; position: relative; width: 44px; height: 44px; border-radius: var(--radius-sm);
    align-items: center; justify-content: center; color: var(--text-1);
    &:active { background: var(--bg-sunken); }
    svg { width: 22px; height: 22px; stroke: currentColor; fill: none; stroke-width: 1.8;
      stroke-linecap: round; stroke-linejoin: round; }
    .cart-badge { position: absolute; top: 2px; right: 2px; }
  }
  .hamburger { display: none; width: 44px; height: 44px; padding: 0; border: 0; border-radius: var(--radius-sm);
    background: transparent; cursor: pointer; flex-direction: column; align-items: center; justify-content: center;
    gap: 4px; -webkit-tap-highlight-color: transparent;
    span { display: block; width: 19px; height: 2px; border-radius: 1px; background: var(--text-1);
      transition: transform .25s ease, opacity .18s ease; }
    &:active { background: var(--bg-sunken); }
    &.active span:nth-child(1) { transform: translateY(6px) rotate(45deg); }
    &.active span:nth-child(2) { opacity: 0; }
    &.active span:nth-child(3) { transform: translateY(-6px) rotate(-45deg); }
  }

  .m-menu { display: none; }
}

.cart-badge {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 18px; height: 18px; padding: 0 5px; border-radius: var(--radius-pill);
  background: var(--brand-600); color: #fff; font-size: 11px; font-weight: 700;
  border: 2px solid #fff; box-sizing: content-box;
}
.m-item .cart-badge { margin-left: 6px; }

.m-mask { display: none; }

/* 中等宽度：收紧间距，保证导航始终单行不折行 */
@media (max-width: 1240px) {
  .topbar .bar-inner { gap: 20px; }
  .topbar .nav { gap: 0; }
  .topbar .nav-item { padding: 10px 10px; font-size: 14px; }
}
@media (max-width: 1000px) {
  .topbar .user-area .uname { display: none; }
}

/* ===== 手机端：导航折叠为下拉菜单（与底部标签栏同一断点）===== */
@media (max-width: 768px) {
  .topbar {
    .bar-inner { height: 64px; padding: 0 12px; gap: 8px; }
    .brand { margin-right: auto;
      .logo { width: 34px; height: 34px; border-radius: var(--radius-md); }
      .brand-txt strong { font-size: 16px; }
      .brand-txt span { display: none; }
    }
    .nav, .desk-user { display: none; }
    .user-area { gap: 2px; }
    .m-cart { display: inline-flex; }
    .hamburger { display: inline-flex; }

    // 窄卡片菜单：挂在汉堡按钮下方右对齐，宽度固定，不再全宽铺满屏幕
    .m-menu {
      display: block; position: absolute; top: calc(100% + 8px); right: 12px; z-index: 101;
      width: min(264px, calc(100vw - 24px));
      background: #fff; border: 1px solid var(--border-1); border-radius: var(--radius-md);
      box-shadow: 0 16px 28px rgba(22, 25, 23, .14);
      max-height: calc(100vh - 64px - 24px); overflow-y: auto; -webkit-overflow-scrolling: touch;
      padding: 6px 0 14px;
    }
    .m-item {
      display: flex; align-items: center; gap: 8px;
      padding: 13px 16px; font-size: 16px; color: var(--text-1); text-decoration: none;
      background: transparent; border: 0; width: 100%; text-align: left; font-family: inherit;
      line-height: 1.3; box-sizing: border-box;
      &.router-link-active { color: var(--brand-700); background: var(--brand-50); font-weight: 700; }
      &:active { background: var(--bg-page); }
    }
    .m-user { padding: 4px 16px 0;
      .m-user-info { display: flex; align-items: center; gap: 10px; padding: 10px 0 12px; }
      .m-uname { font-size: 16px; color: var(--text-1); font-weight: 700; }
      .m-user-actions { display: flex; gap: 10px; }
    }
    .m-auth { display: flex; gap: 10px; padding: 4px 16px 0; }
    .m-btn { flex: 1; height: 44px; border-radius: var(--radius-md); border: 1px solid var(--border-1); background: #fff;
      color: var(--text-1); font-size: 16px; font-family: inherit; cursor: pointer;
      &:active { background: var(--bg-sunken); }
    }
    .m-btn-primary { background: var(--brand-600); border-color: var(--brand-600); color: #fff; font-weight: 700;
      &:active { background: var(--brand-700); }
    }
    .m-btn-danger { color: var(--danger-500); border-color: var(--border-1); }
  }
  .m-mask { display: block; position: fixed; inset: 0; top: 64px; z-index: 99; background: rgba(22, 25, 23, .32); }
}

.m-drop-enter-active, .m-drop-leave-active { transition: opacity .2s ease, transform .24s ease; }
.m-drop-enter-from, .m-drop-leave-to { opacity: 0; transform: translateY(-8px); }

/* ===== 内容区 ===== */
// 子页面作为拉伸项填满剩余高度，页面自己不再写 min-height:100vh
.content { flex: 1; display: flex; flex-direction: column; }
.content > * { flex: 1 0 auto; min-width: 0; }

/* 给手机端固定底栏让位，避免 tabbar 盖住页面最后一行 */
@media (max-width: 768px) {
  .content { padding-bottom: calc(66px + env(safe-area-inset-bottom)); }
}

/* ===== 手机端底部标签栏 ===== */
.tabbar {
  display: none;
}
@media (max-width: 768px) {
  .tabbar {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    position: fixed; left: 0; right: 0; bottom: 0; z-index: 90;
    background: rgba(255, 255, 255, .96);
    backdrop-filter: blur(8px);
    border-top: var(--rule);
    padding: 5px 0 calc(5px + env(safe-area-inset-bottom));
  }
  .tab {
    position: relative;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px;
    // 触控热区 ≥44px（图标 21 + 文字 11 + 上下留白）
    min-height: 44px; padding: 5px 0;
    border: 0; background: none; font-family: inherit; cursor: pointer;
    text-decoration: none; color: var(--text-3); font-size: 11px; line-height: 1;
    svg { width: 21px; height: 21px; stroke: currentColor; fill: none; stroke-width: 1.7;
      stroke-linecap: round; stroke-linejoin: round; }
    &.on { color: var(--brand-600); font-weight: 700;
      svg { stroke-width: 2.1; } }
  }
  .tab-badge {
    position: absolute; top: 0; right: calc(50% - 22px);
    min-width: 16px; height: 16px; border-radius: var(--radius-pill); padding: 0 4px;
    background: var(--danger-500); color: #fff; font-size: 11px; font-weight: 700;
    font-style: normal; display: grid; place-items: center;
  }
}

.fade-enter-active, .fade-leave-active { transition: opacity .2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
