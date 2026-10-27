<template>
  <div class="ui-page">
    <header class="ui-head">
      <div class="ui-head__main">
        <p class="ui-eyebrow">Profile</p>
        <h1 class="ui-title">个人资料</h1>
        <p class="ui-sub">头像与昵称会同步到后台，前后台显示保持一致。</p>
      </div>
    </header>

    <div class="pf" v-loading="loading">
      <!-- 左栏：头像与身份，靠一条竖线与表单区分 -->
      <aside class="pf__aside">
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
          <div class="avatar" :class="{ uploading }">
            <img v-if="avatarUrl && !avatarBroken" :src="avatarUrl" class="avatar__img" alt="头像" @error="avatarBroken = true" />
            <span v-else class="avatar__text">{{ initial }}</span>
            <div class="avatar__mask">
              <el-icon><Camera /></el-icon>
              <span>{{ uploading ? '上传中…' : '更换头像' }}</span>
            </div>
          </div>
        </el-upload>

        <p class="pf__name">{{ form.nickName || userInfo.userName || '宠物之家用户' }}</p>
        <p class="pf__account">@{{ userInfo.userName }}</p>
        <p class="pf__tip">支持 jpg / png / gif<br />建议 200×200 以上，不超过 5MB</p>
      </aside>

      <!-- 右栏：只读信息用定义列表，可编辑字段平铺 -->
      <section class="pf__main">
        <div class="ui-sec__head pf__head">
          <h2 class="ui-sec__title">账号信息</h2>
          <span class="ui-sec__hint">由系统维护，不可修改</span>
        </div>
        <dl class="ui-kv pf__kv">
          <dt>登录账号</dt>
          <dd>{{ userInfo.userName || '—' }}</dd>
          <dt>注册时间</dt>
          <dd>{{ userInfo.createTime || '—' }}</dd>
        </dl>

        <div class="ui-sec__head pf__head pf__head--gap">
          <h2 class="ui-sec__title">基本资料</h2>
          <span class="ui-sec__hint">带 * 为必填</span>
        </div>

        <!-- 表单组：每个字段一行，标签在左、控件在右，字段间用 1px 底边线分隔 -->
        <div class="ui-form">
          <label class="ui-field ui-field--inline">
            <span class="ui-label">用户昵称 <em>*</em></span>
            <el-input v-model="form.nickName" maxlength="30" show-word-limit placeholder="给自己起个好听的名字" />
          </label>
          <label class="ui-field ui-field--inline">
            <span class="ui-label">手机号码</span>
            <el-input v-model="form.phonenumber" maxlength="11" placeholder="选填，用于接收预约与订单通知" />
          </label>
          <label class="ui-field ui-field--inline">
            <span class="ui-label">电子邮箱</span>
            <el-input v-model="form.email" maxlength="50" placeholder="选填" />
          </label>
        </div>

        <p class="ui-help pf__help">手机号仅用于预约、订单与售后通知，不会在社区公开展示。</p>

        <div class="pf__actions">
          <button type="button" class="ui-btn ui-btn--solid" :disabled="saving" @click="save">
            {{ saving ? '保存中…' : '保存修改' }}
          </button>
          <button type="button" class="ui-linkbtn ui-linkbtn--muted" @click="loadProfile">重置为当前资料</button>
        </div>
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
const uploadHeaders = computed(() => ({ Authorization: 'Bearer ' + getToken() }))
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

<style scoped lang="scss">
// 页头、定义列表、表单组、按钮全部来自 .ui-* 基元；
// 这里只写「两栏 + 竖分割线」和头像本身的样式。

.pf {
  display: grid;
  grid-template-columns: 232px minmax(0, 1fr);
  margin-top: 6px;
}

/* ---------- 左栏 ---------- */
.pf__aside {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 28px 32px 0 0;
  // 一条 1px 竖线把身份区与表单区分开，替代左右两块容器
  border-right: 1px solid var(--border-1);
}
.avatar {
  position: relative;
  width: 104px;
  height: 104px;
  border-radius: 50%;
  overflow: hidden;
  display: grid;
  place-items: center;
  border: 1px solid var(--border-1);
  background: var(--bg-sunken);
  cursor: pointer;
}
.avatar__img { width: 100%; height: 100%; object-fit: cover; display: block; }
.avatar__text {
  font-size: 38px;
  font-weight: 700;
  color: var(--brand-700);
}
.avatar__mask {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: rgba(22, 33, 29, .52);
  color: #fff;
  font-size: 12px;
  opacity: 0;
  transition: opacity .2s ease;
}
.avatar:hover .avatar__mask,
.avatar.uploading .avatar__mask { opacity: 1; }

.pf__name {
  margin: 16px 0 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--text-1);
  text-align: center;
  word-break: break-all;
}
.pf__account {
  margin: 4px 0 0;
  font-size: 12.5px;
  color: var(--text-4);
  font-variant-numeric: tabular-nums;
}
.pf__tip {
  margin: 16px 0 0;
  padding-top: 14px;
  border-top: 1px solid var(--border-2);
  font-size: 12px;
  line-height: 1.7;
  color: var(--text-3);
  text-align: center;
}

/* ---------- 右栏 ---------- */
.pf__main { padding: 28px 0 0 40px; }
.pf__head { padding-top: 0; }
.pf__head--gap { margin-top: 32px; }
.pf__kv { margin-top: 4px; }
.pf__help { margin: 14px 0 0; }
.pf__actions {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-top: 26px;
}

/* ---------- 手机端：改成上下两段 ---------- */
@media (max-width: 768px) {
  .pf { grid-template-columns: minmax(0, 1fr); }
  .pf__aside {
    padding: 20px 0 24px;
    border-right: 0;
    border-bottom: 1px solid var(--border-1);
  }
  .avatar { width: 88px; height: 88px; }
  .avatar__text { font-size: 28px; }
  // 触屏没有 hover，改为右下角常驻相机小标（不遮挡头像主体与首字母）
  .avatar__mask {
    background: transparent;
    opacity: 1;
    font-size: 0;
    .el-icon {
      position: absolute;
      right: 2px;
      bottom: 2px;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      font-size: 13px;
      color: #fff;
      background: rgba(22, 33, 29, .72);
      border: 2px solid var(--bg-sunken);
      box-sizing: content-box;
    }
  }
  .avatar.uploading .avatar__mask {
    background: rgba(22, 33, 29, .52);
    font-size: 12px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    .el-icon {
      position: static;
      width: auto;
      height: auto;
      border: 0;
      background: transparent;
      font-size: 16px;
      box-sizing: border-box;
    }
  }
  .pf__main { padding: 24px 0 0; }
  .pf__head--gap { margin-top: 26px; }
  .pf__actions { gap: 16px; }
}
</style>
