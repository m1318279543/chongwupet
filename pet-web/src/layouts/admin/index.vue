<template>
  <el-container class="admin-layout">
    <!-- 侧边栏：分组边界来自 layouts/admin/menu.js，标题/权限/图标全部来自 route.meta
         以前这里硬编码了 30 个 el-menu-item，和 router、pageTitle 表各存一份，新增页面要改三处 -->
    <el-aside :width="isNarrow ? '64px' : '220px'" class="sidebar">
      <div class="logo">
        <span class="icon">🐾</span>
        <span v-if="!isNarrow" class="text">宠物管理后台</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        :router="true"
        :collapse="isNarrow"
        :collapse-transition="false"
        class="menu"
        background-color="#2b2b36"
        text-color="#bfcbd9"
        active-text-color="var(--brand-500)"
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
import { updateUserProfile } from '@/api/system/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

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
  background: #2b2b36; overflow-x: hidden;
  .logo {
    height: 60px; display: flex; align-items: center; justify-content: center;
    color: #fff; gap: 8px;
    .icon { font-size: 22px; }
    .text { font-size: 16px; font-weight: 600; }
  }
  .menu { border-right: none; }
  :deep(.el-menu-item.is-active) { background: #3a3a4a !important; }
}
.header {
  background: #fff; display: flex; align-items: center; justify-content: space-between;
  box-shadow: 0 1px 4px rgba(0,0,0,.06); z-index: 10;
  .page-title { font-size: 18px; font-weight: 600; color: var(--text-1); }
  .ruoyi-link { margin-right: 16px; }
  .user { display: flex; align-items: center; gap: 8px; cursor: pointer; }
  .avatar { background: var(--brand-500); color: #fff; font-weight: 600; }
  .name { font-size: 14px; color: var(--text-1); }
}
// el-main 默认就有 20px padding，.app-container 也有 20px —— 以前叠加成 40px
.main { background: var(--bg-page); padding: 0; }
.fade-enter-active, .fade-leave-active { transition: opacity .2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.pf-dialog { display: flex; gap: 20px; align-items: flex-start; }
.pf-upload { cursor: pointer; }
.pf-avatar-box {
  position: relative; width: 96px; height: 96px; border-radius: 50%;
  overflow: hidden; background: var(--brand-500); display: flex; align-items: center; justify-content: center;
  img { width: 100%; height: 100%; object-fit: cover; }
  .pf-avatar-text { color: #fff; font-size: 32px; font-weight: 600; }
  .pf-mask {
    position: absolute; inset: 0; background: rgba(0,0,0,.45); color: #fff;
    font-size: 12px; display: flex; align-items: center; justify-content: center;
    opacity: 0; transition: opacity .2s;
  }
  &:hover .pf-mask, &.busy .pf-mask { opacity: 1; }
}
.pf-form { flex: 1; padding-top: 4px; }
</style>
