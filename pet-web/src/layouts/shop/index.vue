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

        <!-- 主导航：只放「找宠物 / 找服务」两类入口，个人事务收进头像菜单 -->
        <nav class="nav" aria-label="主导航">
          <router-link to="/shop/home" class="nav-item" :class="{ on: petsActive }">在售宠物</router-link>
          <router-link to="/shop/match" class="nav-item nav-ai">
            <svg class="spark" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9zM18.5 15l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9z"/></svg>
            AI 选宠
          </router-link>
          <router-link to="/shop/food" class="nav-item">宠物粮</router-link>
          <router-link to="/shop/service" class="nav-item" :class="{ on: route.path.startsWith('/shop/service') }">服务保障</router-link>
          <router-link to="/shop/doctor" class="nav-item">问诊社区</router-link>
        </nav>

        <div class="user-area">
          <!-- 站内消息铃铛（登录后显示，桌面/手机共用） -->
          <NotificationBell v-if="isLogged" more-path="/shop/order" />
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
                <el-avatar :size="34" class="avatar" :src="avatarUrl" @error="avatarBroken = true">{{ avatarText }}</el-avatar>
                <span class="uname">{{ userStore.nickName || userStore.userName }}</span>
                <el-icon><ArrowDown /></el-icon>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="/shop/order">我的订单</el-dropdown-item>
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
          <router-link to="/shop/home" class="m-item" @click="closeMenu">在售宠物</router-link>
          <router-link to="/shop/match" class="m-item m-ai" @click="closeMenu">
            AI 选宠<span class="m-tag">智能推荐</span>
          </router-link>
          <router-link to="/shop/food" class="m-item" @click="closeMenu">宠物粮</router-link>

          <router-link to="/shop/service" class="m-item" @click="closeMenu">服务保障</router-link>

          <router-link to="/shop/doctor" class="m-item" @click="closeMenu">问诊社区</router-link>
          <router-link to="/shop/cart" class="m-item" @click="closeMenu">
            购物车
            <span class="cart-badge" v-if="cartCount > 0">{{ cartCount > 99 ? '99+' : cartCount }}</span>
          </router-link>

          <template v-if="isLogged">
            <div class="m-divider"></div>
            <router-link to="/shop/order" class="m-item" @click="closeMenu">我的订单</router-link>
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
      <div class="foot-inner">
        <div class="foot-grid">
          <div class="foot-brand">
            <div class="fb-logo">
              <span class="logo" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M7.2 10.2c1.2-1.5 1.6-3.4.9-4.3-.7-.9-2.1-.5-3.1.9s-1.2 3.2-.3 4c.6.5 1.6.3 2.5-.6zM16.8 10.2c-1.2-1.5-1.6-3.4-.9-4.3.7-.9 2.1-.5 3.1.9s1.2 3.2.3 4c-.6.5-1.6.3-2.5-.6zM12 10.6c1.6 0 3-.9 3.6-2 .7-1.3.2-2.9-1.1-3.5-1.5-.7-3.5-.7-5 0-1.3.6-1.8 2.2-1.1 3.5.6 1.1 2 2 3.6 2zM5.3 13.6c1.4-.5 2.3-1.6 2-2.6-.3-1-1.7-1.4-3.1-.9-1.4.5-2.3 1.6-2 2.6.3 1 1.7 1.4 3.1.9zM18.7 13.6c-1.4-.5-2.3-1.6-2-2.6.3-1 1.7-1.4 3.1-.9 1.4.5 2.3 1.6 2 2.6-.3 1-1.7 1.4-3.1.9zM12 12c-2.6 0-5.6 2.2-5.6 5 0 1.9 1.3 3.2 3 3.2 1 0 1.8-.5 2.6-.5s1.6.5 2.6.5c1.7 0 3-1.3 3-3.2 0-2.8-3-5-5.6-5z"/></svg>
              </span>
              <strong>宠物之家</strong>
            </div>
            <p>重庆本地宠物直营门店，提供选宠、看宠、养护与问诊的一站式服务。每一只在售宠物都有可查的健康记录。</p>
          </div>
          <div class="foot-col">
            <h6>选购</h6>
            <router-link to="/shop/home">在售宠物</router-link>
            <router-link to="/shop/match">AI 智能选宠</router-link>
            <router-link to="/shop/food">宠物粮</router-link>
            <router-link to="/shop/cart">购物车</router-link>
          </div>
          <div class="foot-col">
            <h6>服务</h6>
            <router-link to="/shop/service/health">健康筛查</router-link>
            <router-link to="/shop/service/origin">真实信息</router-link>
            <router-link to="/shop/service/care">专业养护</router-link>
            <router-link to="/shop/service/after">售后无忧</router-link>
          </div>
          <div class="foot-col">
            <h6>联系</h6>
            <router-link to="/shop/doctor">在线问诊</router-link>
            <router-link to="/shop/consult">联系客服</router-link>
            <a href="tel:02388880001">客服 023-8888 0001</a>
            <router-link to="/shop/home">门店地址</router-link>
          </div>
        </div>
        <div class="foot-bot">
          <span>© {{ year }} 宠物之家 · 重庆</span>
          <span>让每一只宠物找到温暖的家</span>
        </div>
      </div>
    </footer>

    <!-- 登录注册对话框 -->
    <AuthDialog ref="authRef" @success="onAuthSuccess" />

    <!-- 全站 AI 智能助手（悬浮球） -->
    <AiAssistant />
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
import AiAssistant from '@/components/AiAssistant.vue'
import NotificationBell from '@/components/NotificationBell.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const cartStore = useCartStore()
const authRef = ref()
const year = new Date().getFullYear()

// 触屏设备下拉改 click 触发（hover 不可靠）
// 断点必须与样式里的手机端 @media 一致（768 以下是紧凑，1000 以下是折叠导航）
const mql = window.matchMedia('(max-width: 1000px)')
const isMobile = ref(mql.matches)
const onMqlChange = (e) => {
  isMobile.value = e.matches
  if (!e.matches) closeMenu()
}

const isLogged = computed(() => !!userStore.token)
const cartCount = computed(() => cartStore.totalCount)
const avatarText = computed(() => (userStore.nickName || userStore.userName || 'U').charAt(0).toUpperCase())
// 宠物详情页仍然算「在售宠物」这一栏
const petsActive = computed(() => route.path === '/shop/home' || route.path.startsWith('/shop/pet'))

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
      width: 36px; height: 36px; border-radius: 11px; display: grid; place-items: center;
      background: var(--grad-brand);
      box-shadow: 0 3px 8px -2px rgba(var(--brand-600-rgb) / .5);
      svg { width: 20px; height: 20px; fill: #fff; }
    }
    .brand-txt {
      strong { display: block; font-size: 17px; font-weight: 700; color: var(--text-1); line-height: 1.2; letter-spacing: -.01em; }
      span { display: block; font-size: 10px; letter-spacing: .14em; color: var(--text-3); font-weight: 500; }
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
    padding: 10px 14px; font-size: 15px; font-weight: 500; color: var(--text-2);
    border-radius: var(--radius-sm); white-space: nowrap; flex-shrink: 0;
    transition: color .16s, background .16s;
    &:hover { color: var(--text-1); background: var(--bg-sunken); }
    &.on, &.router-link-active { color: var(--text-1); font-weight: 600; }
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

  .user-area { display: flex; align-items: center; gap: 4px; flex-shrink: 0;
    .user { display: flex; align-items: center; gap: 8px; cursor: pointer; padding-left: 6px; }
    .avatar { background: var(--brand-50); color: var(--brand-700); font-weight: 600;
      border: 1px solid var(--brand-200); }
    .uname { font-size: 14px; color: var(--text-1); }
  }
  .desk-user { display: flex; align-items: center; gap: 8px; }

  /* 手机专用控件（桌面隐藏） */
  .m-cart { display: none; position: relative; width: 40px; height: 40px; border-radius: var(--radius-sm);
    align-items: center; justify-content: center; color: var(--text-1);
    &:active { background: var(--bg-sunken); }
    .cart-badge { position: absolute; top: 2px; right: 2px; }
  }
  .hamburger { display: none; width: 40px; height: 40px; padding: 0; border: 0; border-radius: var(--radius-sm);
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
  min-width: 18px; height: 18px; padding: 0 5px; border-radius: 9px;
  background: var(--brand-600); color: #fff; font-size: 11px; font-weight: 600;
  border: 2px solid #fff; box-sizing: content-box;
}
.m-item .cart-badge { margin-left: 6px; }

.m-mask { display: none; }

/* 中等宽度：收紧间距，保证导航始终单行不折行 */
@media (max-width: 1240px) {
  .topbar .bar-inner { gap: 20px; }
  .topbar .nav { gap: 0; }
  .topbar .nav-item { padding: 10px 10px; font-size: 14.5px; }
}
@media (max-width: 1000px) {
  .topbar .user-area .uname { display: none; }
}

/* ===== 手机端：导航折叠为下拉菜单 ===== */
@media (max-width: 1000px) {
  .topbar {
    .bar-inner { height: 64px; padding: 0 12px; gap: 8px; }
    .brand { margin-right: auto;
      .logo { width: 34px; height: 34px; border-radius: 10px; }
      .brand-txt strong { font-size: 16px; }
      .brand-txt span { display: none; }
    }
    .nav, .desk-user { display: none; }
    .user-area { gap: 2px; }
    .m-cart { display: inline-flex; }
    .hamburger { display: inline-flex; }

    .m-menu {
      display: block; position: absolute; top: 100%; left: 0; right: 0; z-index: 101;
      background: #fff; border-top: 1px solid var(--border-1);
      box-shadow: 0 16px 28px rgba(22, 25, 23, .14);
      max-height: calc(100vh - 64px); overflow-y: auto; -webkit-overflow-scrolling: touch;
      padding: 6px 0 14px;
    }
    .m-item {
      display: flex; align-items: center; gap: 8px;
      padding: 13px 20px; font-size: 16px; color: var(--text-1); text-decoration: none;
      background: transparent; border: 0; width: 100%; text-align: left; font-family: inherit;
      line-height: 1.3; box-sizing: border-box;
      &.router-link-active { color: var(--brand-700); background: var(--brand-50); font-weight: 600; }
      &:active { background: var(--bg-page); }
    }
    .m-ai { color: var(--brand-700); font-weight: 600;
      .m-tag { margin-left: auto; font-size: 12px; font-weight: 400; color: var(--brand-700);
        background: var(--brand-50); border-radius: 10px; padding: 2px 8px; }
    }
    .m-divider { height: 8px; background: var(--bg-sunken); margin: 6px 0; }
    .m-user { padding: 4px 20px 0;
      .m-user-info { display: flex; align-items: center; gap: 10px; padding: 10px 0 12px; }
      .m-uname { font-size: 15px; color: var(--text-1); font-weight: 600; }
      .m-user-actions { display: flex; gap: 10px; }
    }
    .m-auth { display: flex; gap: 10px; padding: 4px 20px 0; }
    .m-btn { flex: 1; height: 40px; border-radius: 20px; border: 1px solid var(--border-1); background: #fff;
      color: var(--text-1); font-size: 15px; font-family: inherit; cursor: pointer;
      &:active { background: var(--bg-sunken); }
    }
    .m-btn-primary { background: var(--brand-600); border-color: var(--brand-600); color: #fff; font-weight: 600;
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

/* ===== 页脚 ===== */
.footer {
  background: var(--text-1); color: #d6d3d1; padding: 56px 0 0;
  .foot-inner { max-width: var(--container-lg); margin: 0 auto; padding: 0 24px; }
  .foot-grid { display: grid; grid-template-columns: 1.6fr 1fr 1fr 1fr; gap: 48px; }
  .foot-brand {
    .fb-logo { display: flex; align-items: center; gap: 10px; }
    .logo {
      width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center;
      background: var(--grad-brand);
      svg { width: 19px; height: 19px; fill: #fff; }
    }
    strong { font-size: 17px; font-weight: 700; color: #fff; }
    p { margin-top: 16px; font-size: 13px; line-height: 1.85; color: #a8a29e; max-width: 24em; }
  }
  .foot-col {
    display: flex; flex-direction: column; gap: 10px;
    h6 { font-size: 13px; font-weight: 600; color: #fff; margin-bottom: 4px; letter-spacing: .02em; }
    a { font-size: 13px; color: #a8a29e; transition: color .16s;
      &:hover { color: #fff; } }
  }
  .foot-bot {
    margin-top: 48px; border-top: 1px solid rgba(255, 255, 255, .09); padding: 20px 0;
    display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap;
    font-size: 12px; color: #78716c;
  }
}

@media (max-width: 1000px) {
  .footer {
    .foot-grid { grid-template-columns: 1fr 1fr; gap: 32px; }
    .foot-brand p { max-width: none; }
  }
}
@media (max-width: 768px) {
  .footer {
    padding: 40px 0 0;
    .foot-inner { padding: 0 16px; }
    .foot-grid { grid-template-columns: 1fr; gap: 24px; }
    .foot-bot { margin-top: 24px; font-size: 11.5px; }
  }
}

.fade-enter-active, .fade-leave-active { transition: opacity .2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
