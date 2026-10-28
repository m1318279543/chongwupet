<template>
  <div class="admin-login">
    <div class="login-shell">
      <!-- 桌面端品牌栏：只有字、一条细线，不做插画与色块 -->
      <aside class="brand-panel">
        <span class="mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7.2 10.2c1.2-1.5 1.6-3.4.9-4.3-.7-.9-2.1-.5-3.1.9s-1.2 3.2-.3 4c.6.5 1.6.3 2.5-.6zM16.8 10.2c-1.2-1.5-1.6-3.4-.9-4.3.7-.9 2.1-.5 3.1.9s1.2 3.2.3 4c-.6.5-1.6.3-2.5-.6zM12 10.6c1.6 0 3-.9 3.6-2 .7-1.3.2-2.9-1.1-3.5-1.5-.7-3.5-.7-5 0-1.3.6-1.8 2.2-1.1 3.5.6 1.1 2 2 3.6 2zM5.3 13.6c1.4-.5 2.3-1.6 2-2.6-.3-1-1.7-1.4-3.1-.9-1.4.5-2.3 1.6-2 2.6.3 1 1.7 1.4 3.1.9zM18.7 13.6c-1.4-.5-2.3-1.6-2-2.6.3-1 1.7-1.4 3.1-.9 1.4.5 2.3 1.6 2 2.6-.3 1-1.7 1.4-3.1.9zM12 12c-2.6 0-5.6 2.2-5.6 5 0 1.9 1.3 3.2 3 3.2 1 0 1.8-.5 2.6-.5s1.6.5 2.6.5c1.7 0 3-1.3 3-3.2 0-2.8-3-5-5.6-5z"/></svg></span>
        <p class="eyebrow">Chongwu Home · Admin</p>
        <h1>宠物之家<br />管理后台</h1>
        <p class="lede">订单、宠物档案、健康记录与经营数据，在同一处闭环。</p>
        <p class="meta">重庆 · 直营门店</p>
      </aside>

      <div class="login-card" role="main">
        <div class="card-head">
          <span class="mark mark--sm" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7.2 10.2c1.2-1.5 1.6-3.4.9-4.3-.7-.9-2.1-.5-3.1.9s-1.2 3.2-.3 4c.6.5 1.6.3 2.5-.6zM16.8 10.2c-1.2-1.5-1.6-3.4-.9-4.3.7-.9 2.1-.5 3.1.9s1.2 3.2.3 4c-.6.5-1.6.3-2.5-.6zM12 10.6c1.6 0 3-.9 3.6-2 .7-1.3.2-2.9-1.1-3.5-1.5-.7-3.5-.7-5 0-1.3.6-1.8 2.2-1.1 3.5.6 1.1 2 2 3.6 2zM5.3 13.6c1.4-.5 2.3-1.6 2-2.6-.3-1-1.7-1.4-3.1-.9-1.4.5-2.3 1.6-2 2.6.3 1 1.7 1.4 3.1.9zM18.7 13.6c-1.4-.5-2.3-1.6-2-2.6.3-1 1.7-1.4 3.1-.9 1.4.5 2.3 1.6 2 2.6-.3 1-1.7 1.4-3.1.9zM12 12c-2.6 0-5.6 2.2-5.6 5 0 1.9 1.3 3.2 3 3.2 1 0 1.8-.5 2.6-.5s1.6.5 2.6.5c1.7 0 3-1.3 3-3.2 0-2.8-3-5-5.6-5z"/></svg></span>
          <div class="card-title">
            <h2>登录后台</h2>
            <p>仅限管理员与店长账号登录</p>
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
/* 登录页：与商城同一套扁平语言——大字号 + 1px 细线，不堆装饰 */
.admin-login {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  background:
    radial-gradient(720px 360px at 84% -10%, var(--brand-50) 0%, rgba(255, 255, 255, 0) 70%),
    var(--bg-page);
}

/* 桌面：左品牌栏 + 右表单；窄屏只剩表单 */
.login-shell {
  width: 100%;
  max-width: 920px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 384px;
  align-items: center;
  gap: 72px;
}

.brand-panel .mark {
  width: 44px; height: 44px;
  display: grid; place-items: center;
  border-radius: var(--radius-sm);
  background: var(--grad-brand);
}
.brand-panel .mark svg { width: 24px; height: 24px; fill: #fff; }
.brand-panel .eyebrow {
  margin: 22px 0 0;
  font-size: 11px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase;
  color: var(--text-3);
}
.brand-panel h1 {
  margin: 10px 0 0;
  font-size: 34px; line-height: 1.24; font-weight: 700;
  letter-spacing: -.02em; color: var(--text-1);
}
.brand-panel .lede {
  margin: 16px 0 0; max-width: 20em;
  font-size: 14px; line-height: 1.8; color: var(--text-2);
}
.brand-panel .meta {
  margin: 28px 0 0; padding-top: 14px;
  border-top: 1px solid var(--border-1);
  font-size: 12.5px; color: var(--text-3);
}

.login-card {
  width: 100%;
  background: var(--bg-card);
  border: 1px solid var(--border-1);
  border-radius: var(--radius-md);
  padding: 30px 28px 20px;
}

.card-head { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
/* 桌面端品牌栏已承担标识，卡片内不重复 */
.card-head .mark--sm {
  display: none;
  width: 36px; height: 36px; flex: none;
}
.card-title h2 { margin: 0; font-size: 20px; font-weight: 700; color: var(--text-1); letter-spacing: -.01em; }
.card-title p { margin: 4px 0 0; font-size: 12.5px; color: var(--text-3); line-height: 1.5; }

:deep(.el-form-item__label) { font-size: 13px; font-weight: 700; color: var(--text-1); padding-bottom: 6px; }
:deep(.el-form-item) { margin-bottom: 18px; }

.code-row { display: flex; gap: 10px; width: 100%; }
.code-row .el-input { flex: 1; }
.code-img {
  width: 108px; height: 40px; flex: none;
  border-radius: var(--radius-sm); cursor: pointer; object-fit: cover;
  border: 1px solid var(--border-1); background: var(--bg-sunken);
}
.code-loading {
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; color: var(--text-3);
}

.submit {
  width: 100%; height: 44px; margin-top: 4px;
  font-size: 15px; font-weight: 700; letter-spacing: .04em;
}

.foot {
  display: flex; align-items: center; justify-content: space-between;
  margin-top: 20px; padding-top: 14px; border-top: 1px solid var(--border-2);
  font-size: 12px; color: var(--text-3);
}
.foot .link { color: var(--brand-700); font-weight: 700; cursor: pointer; }
.foot .link:hover { text-decoration: underline; text-underline-offset: 3px; }
.foot .current { max-width: 52%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* 平板及以下：品牌栏收起，卡片内的爪印标补位 */
@media (max-width: 1000px) {
  .login-shell {
    grid-template-columns: minmax(0, 1fr);
    max-width: 400px;
    gap: 0;
  }
  .brand-panel { display: none; }
  .card-head .mark--sm { display: grid; place-items: center; background: var(--grad-brand); border-radius: var(--radius-sm); }
  .card-head .mark--sm svg { width: 20px; height: 20px; fill: #fff; }
}

@media (max-width: 480px) {
  .admin-login { padding: 24px 16px; }
  .login-card { padding: 26px 20px 18px; }
  .card-title h2 { font-size: 18px; }
}
</style>
