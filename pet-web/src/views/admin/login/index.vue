<template>
  <div class="admin-login">
    <div class="orb orb-a"></div>
    <div class="orb orb-b"></div>

    <div class="login-card">
      <div class="brand">
        <div class="logo">🐾</div>
        <div class="brand-text">
          <h1>宠物之家 · 管理后台</h1>
          <p>仅限管理员与店长账号登录，前台用户请从商城首页进入</p>
        </div>
      </div>

      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent>
        <el-form-item label="管理员账号" prop="username">
          <el-input
            v-model="form.username"
            size="large"
            placeholder="请输入管理员账号"
            autocomplete="username"
            @keyup.enter="handleLogin"
          />
        </el-form-item>

        <el-form-item label="登录密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            size="large"
            show-password
            placeholder="请输入登录密码"
            autocomplete="current-password"
            @keyup.enter="handleLogin"
          />
        </el-form-item>

        <el-form-item v-if="captcha.enabled" label="验证码" prop="code">
          <div class="code-row">
            <el-input
              v-model="form.code"
              size="large"
              maxlength="6"
              placeholder="请输入验证码"
              @keyup.enter="handleLogin"
            />
            <img
              v-if="codeUrl"
              :src="codeUrl"
              class="code-img"
              alt="验证码"
              title="点击刷新"
              @click="getCode"
            />
            <div v-else class="code-img code-loading" @click="getCode">点击加载</div>
          </div>
        </el-form-item>

        <el-button type="primary" size="large" class="submit" :loading="loading" @click="handleLogin">
          登录后台
        </el-button>
      </el-form>

      <div class="foot">
        <span class="link" @click="goShop">返回商城首页 →</span>
        <span v-if="currentUser" class="current">当前登录：{{ currentUser }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getCodeImg } from '@/api/login'
import { useUserStore } from '@/store/modules/user'

const router = useRouter()
const userStore = useUserStore()

const formRef = ref()
const loading = ref(false)
const codeUrl = ref('')
const captcha = reactive({ enabled: true })

const form = reactive({
  username: '',
  password: '',
  code: '',
  uuid: ''
})

// 用固定规则对象：computed 每次返回新引用会让 el-form 误触发一次校验
const rules = {
  username: [{ required: true, message: '请输入管理员账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入登录密码', trigger: 'blur' }],
  code: [{
    validator: (rule, value, callback) => {
      if (captcha.enabled && !value) {
        callback(new Error('请输入验证码'))
      } else {
        callback()
      }
    },
    trigger: 'blur'
  }]
}

const currentUser = computed(() => userStore.nickName || userStore.userName || '')

function getCode() {
  codeUrl.value = ''
  getCodeImg().then((res) => {
    // 后端 sys.account.captchaEnabled=false 时，登录页不再显示验证码
    captcha.enabled = res.captchaEnabled !== false
    if (!captcha.enabled) {
      form.uuid = ''
      form.code = ''
      return
    }
    codeUrl.value = 'data:image/gif;base64,' + res.img
    form.uuid = res.uuid
    form.code = ''
  }).catch(() => {
    ElMessage.error('验证码加载失败，请点击图片重试')
  })
}

function handleLogin() {
  if (loading.value) return
  formRef.value.validate((valid) => {
    if (!valid) return
    loading.value = true
    userStore.login({
      username: form.username,
      password: form.password,
      code: captcha.enabled ? form.code : '',
      uuid: captcha.enabled ? form.uuid : ''
    }).then(() => userStore.getInfo()).then(() => {
      const roles = Array.isArray(userStore.roles) ? userStore.roles : []
      const canEnter = roles.includes('admin') || roles.includes('store_manager')
      if (canEnter) {
        ElMessage.success('登录成功，正在进入控制台')
        router.replace(roles.includes('admin') ? '/admin/dashboard' : '/admin/store')
      } else {
        // 非后台角色：拒绝进入，并退出该账号，避免前台带着半登录态
        ElMessage.error('该账号不是管理员或店长，无法进入后台')
        userStore.logOut().finally(() => getCode())
      }
    }).catch((err) => {
      const msg = (err && (err.msg || err.message)) || '登录失败，请检查账号或密码'
      ElMessage.error(msg)
      getCode()
    }).finally(() => {
      loading.value = false
    })
  })
}

function goShop() {
  router.push('/shop/home')
}

onMounted(getCode)
</script>

<style scoped>
.admin-login {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  background: linear-gradient(160deg, #fdf7f2 0%, #f3f7fb 55%, #eef4ff 100%);
  overflow: hidden;
}

.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  opacity: 0.55;
  pointer-events: none;
}
.orb-a { width: 420px; height: 420px; background: var(--brand-200); top: -120px; right: -80px; }
.orb-b { width: 380px; height: 380px; background: #cfe2ff; bottom: -140px; left: -100px; }

.login-card {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 420px;
  background: #ffffff;
  border-radius: 18px;
  padding: 32px 32px 22px;
  box-shadow: 0 18px 50px rgba(31, 45, 61, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.8);
}

.brand { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 22px; }
.logo {
  width: 48px; height: 48px; flex: none;
  display: flex; align-items: center; justify-content: center;
  font-size: 24px; border-radius: 14px;
  background: linear-gradient(135deg, var(--brand-100), #ffd0e0);
}
.brand-text h1 { margin: 0 0 6px; font-size: 19px; font-weight: 700; color: #1f2d3d; letter-spacing: 0.3px; }
.brand-text p { margin: 0; font-size: 12px; color: #8a94a6; line-height: 1.5; }

:deep(.el-form-item__label) { font-size: 13px; color: #5b667a; padding-bottom: 4px; }

.code-row { display: flex; gap: 10px; width: 100%; }
.code-row .el-input { flex: 1; }
.code-img {
  width: 108px; height: 40px; flex: none;
  border-radius: 8px; cursor: pointer; object-fit: cover;
  border: 1px solid #e3e8f0; background: var(--bg-page);
}
.code-loading { display: flex; align-items: center; justify-content: center; font-size: 12px; color: #9aa4b5; }

.submit { width: 100%; margin-top: 6px; font-size: 15px; letter-spacing: 2px; }

.foot {
  display: flex; align-items: center; justify-content: space-between;
  margin-top: 18px; padding-top: 14px; border-top: 1px dashed #edf1f7;
  font-size: 12px; color: #9aa4b5;
}
.foot .link { color: var(--brand-700); cursor: pointer; }
.foot .link:hover { text-decoration: underline; }
.foot .current { max-width: 52%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

@media (max-width: 480px) {
  .login-card { padding: 24px 20px 18px; border-radius: 14px; }
  .brand-text h1 { font-size: 17px; }
}
</style>
