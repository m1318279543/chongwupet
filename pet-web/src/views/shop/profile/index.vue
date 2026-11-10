<template>
  <div class="ui-page">
    <header class="ui-head pf-head">
      <div class="ui-head__main">
        <h1 class="ui-title">个人资料</h1>
        <p class="ui-sub">头像与昵称仅用于账号展示，请保证信息准确一致。</p>
      </div>
    </header>

    <div class="pf" v-loading="loading">
      <!-- 左栏：头像 + 昵称 + 格式提示 -->
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
          <div class="avatar-wrap">
            <div class="avatar" :class="{ 'is-uploading': uploading }">
              <img v-if="avatarUrl && !avatarBroken" :src="avatarUrl" class="avatar__img" alt="头像" @error="avatarBroken = true" />
              <span v-else class="avatar__text">{{ initial }}</span>
              <!-- 悬浮遮罩：黑色半透明 + 相机图标 + “更换头像”，提示可点击上传 -->
              <span class="avatar__mask">
                <el-icon class="avatar__cam"><Camera /></el-icon>
                <span class="avatar__hint">{{ uploading ? '上传中…' : '更换头像' }}</span>
              </span>
            </div>
            <!-- 触屏常驻相机小标：放在裁切容器之外，避免被圆形 overflow 切掉 -->
            <span class="avatar__badge" aria-hidden="true"><el-icon><Camera /></el-icon></span>
          </div>
        </el-upload>

        <p class="pf__name">{{ form.nickName || userInfo.userName || '宠物之家用户' }}</p>
        <p class="pf__tip">头像支持 JPG、PNG 格式<br />建议尺寸 200×200 以上</p>
      </aside>

      <!-- 右栏：两张独立白卡 -->
      <div class="pf__col">
        <section class="pf__card">
          <h2 class="pf__card-title">账号信息</h2>
          <dl class="pf__rows">
            <div class="pf__row">
              <dt>登录账号：</dt>
              <dd>{{ userInfo.userName || '—' }}</dd>
            </div>
            <div class="pf__row">
              <dt>注册时间：</dt>
              <dd>{{ userInfo.createTime || '—' }}</dd>
            </div>
          </dl>
        </section>

        <section class="pf__card">
          <h2 class="pf__card-title">基本资料</h2>

          <div class="pf__form">
            <div class="pf__field">
              <label class="pf__label" for="pf-nickname">昵称/姓名 <em aria-hidden="true">*</em></label>
              <div class="pf__ctrl">
                <el-input
                  id="pf-nickname"
                  v-model="form.nickName"
                  maxlength="20"
                  placeholder="给自己起个好听的名字"
                  :class="{ 'is-error': errors.nickName }"
                  @input="recheck('nickName')"
                  @blur="checkField('nickName')"
                >
                  <template #suffix>
                    <span class="pf__count">{{ form.nickName.length }}/20</span>
                  </template>
                </el-input>
                <p class="pf__err" v-if="errors.nickName">{{ errors.nickName }}</p>
              </div>
            </div>

            <div class="pf__field">
              <label class="pf__label" for="pf-phone">手机号码 <em class="pf__opt">(选填)</em></label>
              <div class="pf__ctrl">
                <el-input
                  id="pf-phone"
                  v-model="form.phonenumber"
                  maxlength="11"
                  inputmode="numeric"
                  placeholder="用于接收预约与订单通知"
                  :class="{ 'is-error': errors.phonenumber }"
                  @input="onPhoneInput"
                  @blur="checkField('phonenumber')"
                />
                <p class="pf__err" v-if="errors.phonenumber">{{ errors.phonenumber }}</p>
                <p class="pf__help" v-else>仅用于预约、订单与售后通知，不会在社区公开展示。</p>
              </div>
            </div>

            <div class="pf__field">
              <label class="pf__label" for="pf-email">电子邮箱 <em class="pf__opt">(选填)</em></label>
              <div class="pf__ctrl">
                <el-input
                  id="pf-email"
                  v-model="form.email"
                  maxlength="50"
                  placeholder="用于接收订单与售后邮件"
                  :class="{ 'is-error': errors.email }"
                  @input="recheck('email')"
                  @blur="checkField('email')"
                />
                <p class="pf__err" v-if="errors.email">{{ errors.email }}</p>
              </div>
            </div>
          </div>

          <div class="pf__actions">
            <button type="button" class="ui-btn ui-btn--solid pf__save" :disabled="saving || !dirty" @click="save">
              {{ saving ? '保存中…' : '保存修改' }}
            </button>
            <button type="button" class="ui-btn ui-btn--outline pf__reset" :disabled="saving || !dirty" @click="resetForm">重置</button>
          </div>
        </section>
      </div>
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
// 基准值：最近一次「已保存」的资料，用于脏检查与重置
const origin = reactive({ nickName: '', phonenumber: '', email: '' })
const errors = reactive({ nickName: '', phonenumber: '', email: '' })

const apiBase = import.meta.env.VITE_APP_BASE_API || '/dev-api'
const avatarAction = apiBase + '/system/user/profile/avatar'
const uploadHeaders = computed(() => ({ Authorization: 'Bearer ' + getToken() }))
const avatarUrl = computed(() => resolveImg(userStore.avatar))
const initial = computed(() => (form.nickName || userInfo.userName || 'U').charAt(0).toUpperCase())

// 未修改任何字段时，「保存修改」保持禁用
const dirty = computed(
  () =>
    form.nickName !== origin.nickName ||
    form.phonenumber !== origin.phonenumber ||
    form.email !== origin.email
)

/* ---------- 校验：昵称必填，手机号与邮箱选填但格式需正确 ---------- */
const PHONE_RE = /^1[3-9]\d{9}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function nickNameMsg() {
  return form.nickName && form.nickName.trim() ? '' : '请填写昵称'
}
function phoneMsg() {
  const v = (form.phonenumber || '').trim()
  if (!v) return ''
  return PHONE_RE.test(v) ? '' : '请输入 11 位手机号，1 开头、第二位为 3-9'
}
function emailMsg() {
  const v = (form.email || '').trim()
  if (!v) return ''
  return EMAIL_RE.test(v) ? '' : '邮箱格式不正确，例如 name@example.com'
}

const RULES = { nickName: nickNameMsg, phonenumber: phoneMsg, email: emailMsg }

function checkField(key) {
  errors[key] = RULES[key]()
}
// 输入过程中只「消除已有错误」，不主动报新错，避免边输边红
function recheck(key) {
  if (errors[key]) checkField(key)
}
function onPhoneInput(val) {
  const digits = (val || '').replace(/\D/g, '').slice(0, 11)
  if (digits !== form.phonenumber) form.phonenumber = digits
  recheck('phonenumber')
}
function checkAll() {
  Object.keys(RULES).forEach((key) => {
    errors[key] = RULES[key]()
  })
  return !errors.nickName && !errors.phonenumber && !errors.email
}
function clearErrors() {
  Object.keys(errors).forEach((key) => {
    errors[key] = ''
  })
}

function snapshot() {
  origin.nickName = form.nickName
  origin.phonenumber = form.phonenumber
  origin.email = form.email
}

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
    snapshot()
    clearErrors()
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

function resetForm() {
  if (saving.value || !dirty.value) return
  form.nickName = origin.nickName
  form.phonenumber = origin.phonenumber
  form.email = origin.email
  clearErrors()
}

async function save() {
  if (!checkAll()) {
    ElMessage.warning(errors.nickName || errors.phonenumber || errors.email)
    return
  }
  saving.value = true
  try {
    await updateUserProfile({
      nickName: form.nickName.trim(),
      phonenumber: form.phonenumber,
      email: form.email
    })
    form.nickName = form.nickName.trim()
    userStore.nickName = form.nickName
    // 保存成功后以当前值为新基准：按钮回到禁用态
    snapshot()
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
// 页头沿用 .ui-head / .ui-title / .ui-sub；这里写两栏、两张白卡、头像与字段样式。

.pf-head { padding-bottom: 18px; }

.pf {
  display: grid;
  grid-template-columns: 1fr 2fr; // 左 1/3、右 2/3
  gap: 40px;
  align-items: start;
  margin-top: 20px;
}

/* ---------- 左栏：头像 + 昵称 + 提示 ---------- */
.pf__aside {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 10px;
}
.avatar-wrap {
  position: relative;
  display: inline-flex;
}
.avatar {
  position: relative;
  width: 110px;
  height: 110px;
  border-radius: 50%;
  overflow: hidden;
  display: grid;
  place-items: center;
  border: 1px solid var(--border-1);
  background: var(--bg-card);
  cursor: pointer;
}
.avatar__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform .24s ease;
}
.avatar:hover .avatar__img { transform: scale(1.04); }
.avatar__text {
  font-size: 38px;
  font-weight: 700;
  color: var(--brand-700);
}
// 悬浮遮罩：黑色半透明 + 轻模糊，压住底层首字母/头像，图标与文案才清晰
.avatar__mask {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: rgba(0, 0, 0, .58);
  backdrop-filter: blur(3px);
  color: #fff;
  opacity: 0;
  transition: opacity .2s ease;
}
.avatar__cam { font-size: 22px; }
.avatar__hint {
  font-size: 12px;
  line-height: 1.2;
  letter-spacing: .2px;
}
.avatar:hover .avatar__mask,
.avatar.is-uploading .avatar__mask { opacity: 1; }

// 触屏相机小标：默认隐藏，窄屏常驻显示
.avatar__badge {
  display: none;
  position: absolute;
  right: 0;
  bottom: 0;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  place-items: center;
  font-size: 14px;
  color: #fff;
  background: rgba(0, 0, 0, .72);
  border: 2px solid var(--bg-page);
  box-sizing: content-box;
  pointer-events: none;
}

.pf__name {
  margin: 16px 0 0;
  max-width: 100%;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.4;
  color: var(--text-1);
  text-align: center;
  overflow-wrap: anywhere;
}
.pf__tip {
  margin: 8px 0 0;
  font-size: 12px;
  line-height: 1.7;
  color: var(--text-3);
  text-align: center;
}

/* ---------- 右栏：两张白卡 ---------- */
.pf__col {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}
.pf__card {
  padding: 20px 24px 22px;
  background: var(--bg-card);
  border: 1px solid var(--border-2);
  border-radius: 14px;
  box-shadow: var(--shadow-card);
}
.pf__card-title {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.5;
  color: var(--text-1);
}

/* 账号信息：标签 + 纯文本值，行间 1px 细线 */
.pf__rows { margin: 0; }
.pf__row {
  display: grid;
  grid-template-columns: 128px minmax(0, 1fr);
  gap: 4px 16px;
  align-items: baseline;
  padding: 14px 0;
  border-bottom: 1px solid var(--border-2);
}
.pf__row:last-child { border-bottom: 0; padding-bottom: 2px; }
.pf__row dt {
  font-size: 14px;
  color: var(--text-3);
}
.pf__row dd {
  margin: 0;
  font-size: 14px;
  color: var(--text-2);
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}

/* ---------- 表单：标签在左、输入框在右 ---------- */
.pf__field {
  display: grid;
  grid-template-columns: 128px minmax(0, 1fr);
  gap: 4px 16px;
  align-items: start;
  padding: 10px 0;
  border-bottom: 1px solid var(--border-2);
}
.pf__field:last-child { border-bottom: 0; }
.pf__label {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-top: 9px;
  font-size: 14px;
  line-height: 1.4;
  color: var(--text-2);
}
.pf__label em:not(.pf__opt) {
  font-style: normal;
  color: var(--danger-500);
}
.pf__opt {
  font-style: normal;
  font-size: 12px;
  color: var(--text-4);
}
.pf__ctrl { min-width: 0; }

// 输入框：36px 高、6px 圆角、聚焦时主题色描边 + 柔光环
.pf__form :deep(.el-input__wrapper) {
  min-height: 36px;
  border-radius: 6px;
  box-shadow: 0 0 0 1px var(--border-1) inset;
  transition: box-shadow .16s ease;
}
.pf__form :deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px var(--border-1) inset, 0 0 0 3px rgba(20, 97, 78, .06);
}
.pf__form :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px var(--brand-600) inset, 0 0 0 3px rgba(20, 97, 78, .12);
}
.pf__form :deep(.el-input__inner) { font-size: 14px; }

.pf__count {
  font-size: 12px;
  color: var(--text-4);
  font-variant-numeric: tabular-nums;
}

// 校验态：边框转红 + 下方错误文案
.pf__ctrl .is-error :deep(.el-input__wrapper),
.pf__ctrl .is-error :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px var(--danger-500) inset, 0 0 0 3px rgba(220, 38, 38, .1);
}
.pf__err {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.45;
  color: var(--danger-500);
}
.pf__help {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-4);
}

/* ---------- 操作区：居中，主按钮药丸形 ---------- */
.pf__actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 22px;
  padding-bottom: 2px;
}
.pf__save,
.pf__reset {
  border-radius: var(--radius-pill);
  padding: 0 34px;
  min-width: 132px;
}

/* ---------- 窄屏：单列堆叠 ---------- */
@media (max-width: 900px) {
  .pf {
    grid-template-columns: minmax(0, 1fr);
    gap: 24px;
    margin-top: 20px;
  }
  .pf__aside { padding-top: 0; }
  .avatar { width: 96px; height: 96px; }
  .avatar__text { font-size: 34px; }
  // 触屏没有 hover：遮罩只留上传中状态，常驻入口交给容器外的相机小标
  .avatar__mask {
    background: transparent;
    backdrop-filter: none;
    opacity: 1;
  }
  .avatar__hint { display: none; }
  .avatar__mask .avatar__cam { display: none; }
  .avatar__badge { display: grid; }
  .avatar.is-uploading .avatar__mask {
    background: rgba(0, 0, 0, .58);
    flex-direction: column;
    justify-content: center;
  }
  .avatar.is-uploading .avatar__mask .avatar__cam { display: block; }
  .avatar.is-uploading .avatar__hint { display: inline; }
  .pf__name { margin-top: 12px; }
  .pf__card { padding: 18px 16px 20px; border-radius: 12px; }
  .pf__actions { gap: 12px; }
  .pf__save,
  .pf__reset { flex: 1; min-width: 0; padding: 0 20px; }
}

@media (max-width: 640px) {
  // 窄屏下只有表单字段换行；账号信息仍保持「标签 + 值」同行
  .pf__field { grid-template-columns: minmax(0, 1fr); }
  .pf__label { padding-top: 0; }
  .pf__field { padding: 14px 0; }
}
</style>
