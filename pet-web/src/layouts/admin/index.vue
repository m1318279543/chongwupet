<template>
  <el-container class="admin-layout">
    <!-- 侧边栏 -->
    <el-aside width="220px" class="sidebar">
      <div class="logo">
        <span class="icon">🐾</span>
        <span class="text">宠物管理后台</span>
      </div>
      <el-menu :default-active="activeMenu" :router="true" class="menu" background-color="#2b2b36" text-color="#bfcbd9" active-text-color="#ff8c42">
        <el-menu-item index="/admin/dashboard">
          <el-icon><DataLine /></el-icon><span>数据看板</span>
        </el-menu-item>

        <el-sub-menu index="petBase">
          <template #title>
            <el-icon><Goods /></el-icon><span>宠物资料</span>
          </template>
          <el-menu-item index="/admin/category">宠物分类</el-menu-item>
          <el-menu-item index="/admin/info">宠物信息</el-menu-item>
          <el-menu-item index="/admin/health">健康档案</el-menu-item>
          <el-menu-item index="/admin/preference">宠物喜好</el-menu-item>
          <el-menu-item index="/admin/issue">健康百科</el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="petBiz">
          <template #title>
            <el-icon><Tickets /></el-icon><span>业务数据</span>
          </template>
          <el-menu-item index="/admin/appointment">预约管理</el-menu-item>
          <el-menu-item index="/admin/cart">购物车管理</el-menu-item>
          <el-menu-item index="/admin/favorite">收藏管理</el-menu-item>
          <el-menu-item index="/admin/like">点赞管理</el-menu-item>
          <el-menu-item index="/admin/comment">评论管理</el-menu-item>
          <el-menu-item index="/admin/consult">客服管理</el-menu-item>
          <el-menu-item index="/admin/doctor">医生咨询记录</el-menu-item>
          <el-menu-item index="/admin/cancel">取消记录</el-menu-item>
          <el-menu-item index="/admin/match">智能匹配记录</el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="sys">
          <template #title>
            <el-icon><Setting /></el-icon><span>系统管理</span>
          </template>
          <el-menu-item index="/admin/system/user" v-hasPermi="['system:user:list']">用户管理</el-menu-item>
          <el-menu-item index="/admin/system/role" v-hasPermi="['system:role:list']">角色管理</el-menu-item>
          <el-menu-item index="/admin/system/menu" v-hasPermi="['system:menu:list']">菜单管理</el-menu-item>
          <el-menu-item index="/admin/system/dept" v-hasPermi="['system:dept:list']">部门管理</el-menu-item>
          <el-menu-item index="/admin/system/log" v-hasPermi="['monitor:operlog:list','monitor:logininfor:list']">系统日志</el-menu-item>
          <el-menu-item index="/admin/system/online" v-hasPermi="['monitor:online:list']">在线用户</el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="monitor">
          <template #title>
            <el-icon><Odometer /></el-icon><span>系统监控</span>
          </template>
          <el-menu-item index="/admin/monitor/server" v-hasPermi="['monitor:server:list']">服务监控</el-menu-item>
          <el-menu-item index="/admin/monitor/cache" v-hasPermi="['monitor:cache:list']">缓存监控</el-menu-item>
        </el-sub-menu>

        <el-menu-item index="/shop/home">
          <el-icon><Monitor /></el-icon><span>前往前台</span>
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
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { DataLine, Goods, Calendar, Star, Monitor, ArrowDown, Setting, Pointer, ChatDotRound, FirstAidKit, Histogram, ChatLineRound, ChatLineSquare, CircleClose, IceCream, ShoppingCart, MagicStick, Tickets, Odometer } from '@element-plus/icons-vue'
import { useUserStore } from '@/store/modules/user'
import { getToken } from '@/utils/auth'
import { updateUserProfile } from '@/api/system/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const activeMenu = computed(() => route.path)
const pageTitle = computed(() => {
  const map = {
    '/admin/dashboard': '数据看板',
    '/admin/category': '宠物分类管理',
    '/admin/info': '宠物信息管理',
    '/admin/appointment': '预约管理',
    '/admin/favorite': '收藏管理',
    '/admin/cart': '购物车管理',
    '/admin/like': '点赞管理',
    '/admin/comment': '评论管理',
    '/admin/health': '健康档案',
    '/admin/preference': '宠物喜好',
    '/admin/issue': '健康百科',
    '/admin/consult': '客服管理',
    '/admin/doctor': '宠物医生咨询记录',
    '/admin/cancel': '取消记录',
    '/admin/match': '智能匹配记录',
    '/admin/system/user': '用户管理',
    '/admin/system/role': '角色管理',
    '/admin/system/menu': '菜单管理',
    '/admin/system/dept': '部门管理',
    '/admin/system/log': '系统日志',
    '/admin/system/online': '在线用户',
    '/admin/monitor/server': '服务监控',
    '/admin/monitor/cache': '缓存监控'
  }
  return map[route.path] || '宠物管理后台'
})
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
  .page-title { font-size: 18px; font-weight: 600; color: #303133; }
  .ruoyi-link { margin-right: 16px; }
  .user { display: flex; align-items: center; gap: 8px; cursor: pointer; }
  .avatar { background: #ff8c42; color: #fff; font-weight: 600; }
  .name { font-size: 14px; color: #303133; }
}
.main { background: #f5f7fa; padding: 20px; }
.fade-enter-active, .fade-leave-active { transition: opacity .2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.pf-dialog { display: flex; gap: 20px; align-items: flex-start; }
.pf-upload { cursor: pointer; }
.pf-avatar-box {
  position: relative; width: 96px; height: 96px; border-radius: 50%;
  overflow: hidden; background: #ff8c42; display: flex; align-items: center; justify-content: center;
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
