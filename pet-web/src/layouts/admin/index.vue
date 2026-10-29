<template>
  <el-container class="admin-layout">
    <!-- 侧边栏：分组边界来自 layouts/admin/menu.js，标题/权限/图标全部来自 route.meta
         以前这里硬编码了 30 个 el-menu-item，和 router、pageTitle 表各存一份，新增页面要改三处 -->
    <el-aside :width="isNarrow ? '64px' : '220px'" class="sidebar">
      <div class="logo">
        <span class="mark" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M7.2 10.2c1.2-1.5 1.6-3.4.9-4.3-.7-.9-2.1-.5-3.1.9s-1.2 3.2-.3 4c.6.5 1.6.3 2.5-.6zM16.8 10.2c-1.2-1.5-1.6-3.4-.9-4.3.7-.9 2.1-.5 3.1.9s1.2 3.2.3 4c-.6.5-1.6.3-2.5-.6zM12 10.6c1.6 0 3-.9 3.6-2 .7-1.3.2-2.9-1.1-3.5-1.5-.7-3.5-.7-5 0-1.3.6-1.8 2.2-1.1 3.5.6 1.1 2 2 3.6 2zM5.3 13.6c1.4-.5 2.3-1.6 2-2.6-.3-1-1.7-1.4-3.1-.9-1.4.5-2.3 1.6-2 2.6.3 1 1.7 1.4 3.1.9zM18.7 13.6c-1.4-.5-2.3-1.6-2-2.6.3-1 1.7-1.4 3.1-.9 1.4.5 2.3 1.6 2 2.6-.3 1-1.7 1.4-3.1.9zM12 12c-2.6 0-5.6 2.2-5.6 5 0 1.9 1.3 3.2 3 3.2 1 0 1.8-.5 2.6-.5s1.6.5 2.6.5c1.7 0 3-1.3 3-3.2 0-2.8-3-5-5.6-5z"/></svg>
        </span>
        <span v-if="!isNarrow" class="text">宠物之家 · 后台</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        :router="true"
        :collapse="isNarrow"
        :collapse-transition="false"
        class="menu"
        background-color="#0a3329"
        text-color="#a9bdb5"
        active-text-color="#dcede6"
      >
        <template v-for="group in menuGroups" :key="group.key">
          <el-menu-item v-if="!group.title" :index="group.children[0].path">
            <el-icon><component :is="group.children[0].icon || 'Menu'" /></el-icon>
            <template #title>{{ group.children[0].title }}</template>
          </el-menu-item>

          <el-sub-menu v-else :index="group.key">
            <template #title>
              <el-icon><component :is="group.icon || 'Menu'" /></el-icon>
              <span>{{ group.title }}</span>
            </template>
            <el-menu-item v-for="item in group.children" :key="item.path" :index="item.path">
              {{ item.title }}
            </el-menu-item>
          </el-sub-menu>
        </template>

        <el-menu-item index="/shop/home">
          <el-icon><Monitor /></el-icon>
          <template #title>前往前台</template>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <!-- 顶栏 -->
      <el-header class="header">
        <div class="left">
          <span class="page-title">{{ pageTitle }}</span>
        </div>
        <div class="right">
          <!-- 经营助手入口：固定在顶栏、消息铃铛左侧，与前台同一位置 -->
          <AssistantEntry scene="admin" />
          <NotificationBell />
          <el-dropdown @command="handleCommand">
            <span class="user">
              <el-avatar :size="32" class="avatar" :src="avatarUrl">{{ avatarText }}</el-avatar>
              <span class="name">{{ userStore.nickName || userStore.userName }}</span>
              <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">个人资料</el-dropdown-item>
                <el-dropdown-item command="shop">前往前台</el-dropdown-item>
                <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <!-- 个人资料弹窗：头像上传 + 昵称修改 -->
      <el-dialog v-model="profileOpen" title="个人资料" width="420px" append-to-body>
        <div class="pf-dialog">
          <el-upload
            class="pf-upload"
            :show-file-list="false"
            :action="apiBase + '/system/user/profile/avatar'"
            :headers="{ Authorization: 'Bearer ' + token }"
            name="avatarfile"
            accept="image/png,image/jpeg,image/jpg,image/gif,image/bmp"
            :before-upload="beforeAvatar"
            :on-success="onAvatarOk"
            :on-error="onAvatarErr"
          >
            <div class="pf-avatar-box" :class="{ busy: avatarBusy }">
              <img v-if="avatarUrl" :src="avatarUrl" alt="头像" />
              <span v-else class="pf-avatar-text">{{ avatarText }}</span>
              <div class="pf-mask">{{ avatarBusy ? '上传中…' : '更换头像' }}</div>
            </div>
          </el-upload>
          <el-form label-width="72px" class="pf-form">
            <el-form-item label="登录账号">
              <el-input :model-value="userStore.userName" disabled />
            </el-form-item>
            <el-form-item label="用户昵称">
              <el-input v-model="nickInput" maxlength="30" show-word-limit placeholder="昵称会同步显示在前台" />
            </el-form-item>
          </el-form>
        </div>
        <template #footer>
          <el-button round @click="profileOpen = false">取消</el-button>
          <el-button type="primary" round :loading="saving" @click="saveProfile">保存</el-button>
        </template>
      </el-dialog>

      <!-- 内容区 -->
      <el-main class="main">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>

      <!-- 经营助手：按看板口径回答指标，仅管理员与店长可用；入口已收进顶栏铃铛左侧 -->
      <AssistantDock default-scene="admin" :show-launcher="false" />
    </el-container>
  </el-container>
</template>

<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Monitor } from '@element-plus/icons-vue'
import { useUserStore } from '@/store/modules/user'
import { hasPermi } from '@/permission'
import { MENU_GROUPS } from './menu'
import { getToken } from '@/utils/auth'
import NotificationBell from '@/components/NotificationBell.vue'
import AssistantDock from '@/components/assistant/AssistantDock.vue'
import AssistantEntry from '@/components/assistant/AssistantEntry.vue'
import { useAssistant } from '@/components/assistant/useAssistant'
import { updateUserProfile } from '@/api/system/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const assistant = useAssistant()

// 页面通过事件唤起经营助手，避免每个页面都引入同一份状态
function onAssistantOpen(event) {
  assistant.open({ ...(event?.detail || {}), scene: 'admin', fresh: true })
}
onMounted(() => window.addEventListener('pet-assistant-open', onAssistantOpen))
onBeforeUnmount(() => window.removeEventListener('pet-assistant-open', onAssistantOpen))

const activeMenu = computed(() => route.path)

// 窄屏折叠为图标栏（以前 220px 侧栏在手机上只剩 150px 内容区）
const mq = window.matchMedia('(max-width: 1000px)')
const isNarrow = ref(mq.matches)
const onMq = (e) => { isNarrow.value = e.matches }
onMounted(() => mq.addEventListener('change', onMq))
onBeforeUnmount(() => mq.removeEventListener('change', onMq))

// 菜单 = 分组结构 × 路由 meta，按当前账号权限过滤
const allRoutes = router.getRoutes()
function metaOf(path) {
  const rec = allRoutes.find((r) => r.path === path)
  return rec ? rec.meta || {} : {}
}
function allowed(m) {
  if (!m.perm) return true
  return hasPermi(Array.isArray(m.perm) ? m.perm : [m.perm])
}
const menuGroups = computed(() =>
  MENU_GROUPS.map((g) => ({
    key: g.key,
    title: g.title,
    icon: g.icon,
    children: g.items
      .map((path) => ({ path, ...metaOf(path) }))
      .filter((c) => c.title && allowed(c))
  })).filter((g) => g.children.length > 0)
)
const pageTitle = computed(() => route.meta.title || '宠物管理后台')
const avatarText = computed(() => (userStore.nickName || userStore.userName || 'U').charAt(0).toUpperCase())

// ---------- 个人资料（头像上传 + 昵称修改） ----------
const apiBase = import.meta.env.VITE_APP_BASE_API || '/dev-api'
const token = getToken()
const profileOpen = ref(false)
const avatarBusy = ref(false)
const saving = ref(false)
const nickInput = ref('')
// 后端存的是 /profile/xxx 相对路径，需拼 API 前缀
const avatarUrl = computed(() => {
  const p = userStore.avatar
  if (!p) return ''
  if (/^https?:\/\//.test(p)) return p
  return apiBase + (p.startsWith('/') ? p : '/' + p)
})

function beforeAvatar(file) {
  if (!/^image\//.test(file.type)) { ElMessage.warning('只能上传图片文件'); return false }
  if (file.size > 5 * 1024 * 1024) { ElMessage.warning('图片大小不能超过 5MB'); return false }
  avatarBusy.value = true
  return true
}
function onAvatarOk(res) {
  avatarBusy.value = false
  if (res && res.code === 200 && res.imgUrl) {
    userStore.avatar = res.imgUrl
    ElMessage.success('头像已更新')
  } else {
    ElMessage.error((res && res.msg) || '头像上传失败')
  }
}
function onAvatarErr() {
  avatarBusy.value = false
  ElMessage.error('头像上传失败，请稍后重试')
}

async function saveProfile() {
  const nick = (nickInput.value || '').trim()
  if (!nick) { ElMessage.warning('昵称不能为空'); return }
  saving.value = true
  try {
    await updateUserProfile({ nickName: nick })
    userStore.nickName = nick
    ElMessage.success('资料已保存，前台刷新后生效')
    profileOpen.value = false
  } catch (e) {
    ElMessage.error(e && e.msg ? e.msg : '保存失败，请稍后重试')
  } finally {
    saving.value = false
  }
}

function handleCommand(cmd) {
  if (cmd === 'profile') {
    nickInput.value = userStore.nickName || ''
    profileOpen.value = true
    // 以服务端最新资料为准（可能在用户管理里刚改过自己的昵称/头像）
    userStore.getInfo().then(() => {
      nickInput.value = userStore.nickName || ''
    }).catch(() => {})
  } else if (cmd === 'shop') {
    router.push('/shop/home')
  } else if (cmd === 'logout') {
    ElMessageBox.confirm('确定要退出登录吗？', '提示', { type: 'warning' }).then(() => {
      userStore.logOut().then(() => {
        router.push('/admin/login')
      })
    }).catch(() => {})
  }
}
</script>

<style scoped lang="scss">
.admin-layout { height: 100vh; }
.sidebar {
  background: var(--brand-900); overflow-x: hidden;
  .logo {
    height: 60px; display: flex; align-items: center; justify-content: center;
    gap: 9px; padding: 0 12px;
    // 与商城顶栏同一枚爪印标：白爪印 + 品牌渐变方块
    .mark {
      width: 28px; height: 28px; flex-shrink: 0; border-radius: var(--radius-sm);
      display: grid; place-items: center; background: var(--grad-brand);
      svg { width: 17px; height: 17px; fill: var(--on-accent); }
    }
    .text { color: var(--on-accent); font-size: var(--fs-6); font-weight: 700; letter-spacing: -.01em; white-space: nowrap; }
  }
  .menu { border-right: none; background: transparent; }
  // 激活项：浅色底 + 左侧 2px 品牌色，文字用最亮的一档（11.4:1）
  :deep(.el-menu-item.is-active) {
    background: rgba(185, 219, 206, .14) !important;
    box-shadow: inset 2px 0 0 var(--brand-300);
    font-weight: 700;
  }
  :deep(.el-menu-item:hover),
  :deep(.el-sub-menu__title:hover) { background: rgba(185, 219, 206, .08) !important; }
}
.header {
  background: var(--bg-card); display: flex; align-items: center; justify-content: space-between;
  border-bottom: 1px solid var(--border-1); z-index: var(--z-adminbar);
  // 右侧操作组：AI 入口 + 消息铃铛 + 用户菜单，固定间距避免换行空隙抖动
  .right { display: flex; align-items: center; gap: 4px; }
  .page-title { font-size: var(--fs-6); font-weight: 700; color: var(--text-1); }
  .ruoyi-link { margin-right: 16px; }
  .user { display: flex; align-items: center; gap: 8px; cursor: pointer; }
  .avatar { background: var(--brand-600); color: var(--on-accent); font-weight: 600; }
  .name { font-size: var(--fs-5); color: var(--text-1); }
}
// el-main 默认就有 20px padding，.app-container 也有 20px —— 以前叠加成 40px
.main { background: var(--bg-page); padding: 0; }
.fade-enter-active, .fade-leave-active { transition: opacity .2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.pf-dialog { display: flex; gap: 20px; align-items: flex-start; }
.pf-upload { cursor: pointer; }
.pf-avatar-box {
  position: relative; width: 96px; height: 96px; border-radius: 50%;
  overflow: hidden; background: var(--brand-600); display: flex; align-items: center; justify-content: center;
  img { width: 100%; height: 100%; object-fit: cover; }
  .pf-avatar-text { color: var(--on-accent); font-size: 32px; font-weight: 600; }
  .pf-mask {
    position: absolute; inset: 0; background: rgba(0,0,0,.45); color: var(--on-accent);
    font-size: var(--fs-2); display: flex; align-items: center; justify-content: center;
    opacity: 0; transition: opacity .2s;
  }
  &:hover .pf-mask, &.busy .pf-mask { opacity: 1; }
}
.pf-form { flex: 1; padding-top: 4px; }
</style>
