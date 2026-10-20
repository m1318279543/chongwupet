<template>
  <div class="profile-page">
    <div class="pf-hero">
      <div class="pf-hero-inner">
        <h1>个人资料</h1>
        <p>自定义你的头像与昵称，让社区里的每一次互动都更有辨识度</p>
      </div>
    </div>

    <div class="pf-card" v-loading="loading">
      <!-- 左侧头像区 -->
      <aside class="pf-aside">
        <el-upload
          class="avatar-uploader"
          :show-file-list="false"
          :action="avatarAction"
          :headers="uploadHeaders"
          name="avatarfile"
          accept="image/png,image/jpeg,image/jpg,image/gif,image/bmp"
          :before-upload="beforeAvatarUpload"
          :on-success="onAvatarSuccess"
          :on-error="onAvatarError"
        >
          <div class="avatar-box" :class="{ uploading }">
            <img v-if="avatarUrl && !avatarBroken" :src="avatarUrl" class="avatar-img" alt="头像" @error="avatarBroken = true" />
            <span v-else class="avatar-text">{{ initial }}</span>
            <div class="avatar-mask">
              <el-icon><Camera /></el-icon>
              <span>{{ uploading ? '上传中…' : '更换头像' }}</span>
            </div>
            <div class="avatar-badge"><el-icon><Camera /></el-icon></div>
          </div>
        </el-upload>
        <div class="pf-name">{{ form.nickName || userInfo.userName || '宠物之家用户' }}</div>
        <div class="pf-account">@{{ userInfo.userName }}</div>
        <p class="pf-tip">支持 jpg / png / gif，建议 200×200 以上，不超过 5MB<br />头像与资料会同步到后台，前后台一致</p>
      </aside>

      <!-- 右侧表单区 -->
      <section class="pf-main">
        <h2 class="pf-title">基本信息</h2>
        <el-form :model="form" label-width="88px" class="pf-form">
          <el-form-item label="用户昵称">
            <el-input v-model="form.nickName" maxlength="30" show-word-limit placeholder="给自己起个好听的名字" />
          </el-form-item>
          <el-form-item label="手机号码">
            <el-input v-model="form.phonenumber" maxlength="11" placeholder="选填，用于接收预约通知" />
          </el-form-item>
          <el-form-item label="电子邮箱">
            <el-input v-model="form.email" maxlength="50" placeholder="选填" />
          </el-form-item>
          <el-form-item label="登录账号">
            <el-input :model-value="userInfo.userName" disabled />
          </el-form-item>
          <el-form-item label="注册时间">
            <el-input :model-value="userInfo.createTime || '—'" disabled />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" round :loading="saving" @click="save">保存修改</el-button>
            <el-button round @click="loadProfile">重置</el-button>
          </el-form-item>
        </el-form>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Camera } from '@element-plus/icons-vue'
import { getUserProfile, updateUserProfile } from '@/api/system/user'
import { getToken } from '@/utils/auth'
import { useUserStore } from '@/store/modules/user'

const userStore = useUserStore()
const loading = ref(false)
const saving = ref(false)
const uploading = ref(false)
const avatarBroken = ref(false)
const userInfo = reactive({ userName: '', createTime: '' })
const form = reactive({ nickName: '', phonenumber: '', email: '', avatar: '' })

const apiBase = import.meta.env.VITE_APP_BASE_API || '/dev-api'
const avatarAction = apiBase + '/system/user/profile/avatar'
const uploadHeaders = { Authorization: 'Bearer ' + getToken() }
const avatarUrl = computed(() => resolveImg(userStore.avatar))
const initial = computed(() => (form.nickName || userInfo.userName || 'U').charAt(0).toUpperCase())

// 后端返回的是 /profile/xxx 相对路径，需拼上 API 前缀才能访问
function resolveImg(p) {
  if (!p) return ''
  if (/^https?:\/\//.test(p)) return p
  return apiBase + (p.startsWith('/') ? p : '/' + p)
}

async function loadProfile() {
  loading.value = true
  try {
    const res = await getUserProfile()
    const d = res.data || {}
    const u = d.user || d
    userInfo.userName = u.userName || ''
    userInfo.createTime = u.createTime || ''
    form.nickName = u.nickName || ''
    form.phonenumber = u.phonenumber || ''
    form.email = u.email || ''
    form.avatar = u.avatar || ''
    avatarBroken.value = false
    if (u.avatar) userStore.avatar = u.avatar
  } catch (e) {
    ElMessage.error('加载资料失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

function beforeAvatarUpload(file) {
  if (!/^image\//.test(file.type)) {
    ElMessage.warning('只能上传图片文件')
    return false
  }
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.warning('图片大小不能超过 5MB')
    return false
  }
  uploading.value = true
  return true
}

function onAvatarSuccess(res) {
  uploading.value = false
  if (res && res.code === 200 && res.imgUrl) {
    userStore.avatar = res.imgUrl
    form.avatar = res.imgUrl
    avatarBroken.value = false
    // 拉一次最新资料，保证昵称等与后台一致
    userStore.getInfo().catch(() => {})
    ElMessage.success('头像已更新')
  } else {
    ElMessage.error((res && res.msg) || '头像上传失败')
  }
}

function onAvatarError() {
  uploading.value = false
  ElMessage.error('头像上传失败，请稍后重试')
}

async function save() {
  if (!form.nickName || !form.nickName.trim()) {
    ElMessage.warning('昵称不能为空')
    return
  }
  if (form.phonenumber && !/^1[3-9]\d{9}$/.test(form.phonenumber)) {
    ElMessage.warning('请输入正确的手机号码')
    return
  }
  saving.value = true
  try {
    await updateUserProfile({
      nickName: form.nickName.trim(),
      phonenumber: form.phonenumber,
      email: form.email
    })
    userStore.nickName = form.nickName.trim()
    ElMessage.success('资料已保存')
  } catch (e) {
    ElMessage.error('保存失败，请稍后重试')
  } finally {
    saving.value = false
  }
}

onMounted(loadProfile)
</script>

<style scoped>
.profile-page {
  max-width: 980px;
  margin: 0 auto;
  padding: 28px 16px 60px;
}
.pf-hero {
  background: linear-gradient(135deg, #ff8c42, #ffb27a);
  border-radius: 18px;
  padding: 30px 34px;
  color: #fff;
  margin-bottom: 18px;
}
.pf-hero h1 { margin: 0 0 6px; font-size: 26px; }
.pf-hero p { margin: 0; font-size: 14px; opacity: 0.92; }
.pf-card {
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06);
  display: flex;
  gap: 40px;
  padding: 36px 40px;
}
.pf-aside {
  width: 220px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  border-right: 1px dashed #f0f0f0;
  padding-right: 36px;
}
.avatar-box {
  position: relative;
  width: 128px;
  height: 128px;
  border-radius: 50%;
  overflow: hidden;
  background: linear-gradient(135deg, #ff8c42, #ffb27a);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 8px 22px rgba(255, 140, 66, 0.28);
}
.avatar-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.avatar-text { color: #fff; font-size: 46px; font-weight: 700; }
.avatar-mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 12px;
  opacity: 0;
  transition: opacity 0.2s;
}
.avatar-box:hover .avatar-mask, .avatar-box.uploading .avatar-mask { opacity: 1; }
.avatar-badge {
  position: absolute;
  right: 2px;
  bottom: 2px;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #ff8c42;
  color: #fff;
  display: none;
  align-items: center;
  justify-content: center;
  border: 2px solid #fff;
  box-shadow: 0 2px 8px rgba(255, 140, 66, 0.45);
  font-size: 16px;
  pointer-events: none;
}
.pf-name { margin-top: 16px; font-size: 18px; font-weight: 700; color: #303133; text-align: center; word-break: break-all; }
.pf-account { font-size: 13px; color: #a8abb2; margin-top: 4px; }
.pf-tip { font-size: 12px; color: #b0b3b8; text-align: center; line-height: 1.6; margin: 14px 0 0; }
.pf-main { flex: 1; min-width: 0; }
.pf-title { margin: 0 0 22px; font-size: 18px; color: #303133; }
.pf-form { max-width: 460px; }
@media (max-width: 760px) {
  .pf-card { flex-direction: column; gap: 24px; padding: 24px 18px; }
  .pf-aside { width: 100%; border-right: none; border-bottom: 1px dashed #f0f0f0; padding: 0 0 20px; }
  .pf-form { max-width: 100%; }
  /* 手机端没有 hover，用常驻相机角标提示可点击更换 */
  .avatar-mask { display: none; }
  .avatar-box.uploading .avatar-mask { display: flex; background: rgba(0, 0, 0, 0.45); }
  .avatar-badge { display: flex; }
}
</style>
