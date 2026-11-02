<template>
  <el-dialog v-model="visible" :width="420" :title="mode === 'register' ? '注册宠物之家' : '登录宠物之家'" align-center @close="handleClose">
    <!-- 登录 -->
    <el-form v-if="mode === 'login'" ref="formRef" :model="form" :rules="rules" size="large" @keyup.enter="handleSubmit">
      <el-form-item prop="username">
        <el-input v-model="form.username" placeholder="请输入用户名" :prefix-icon="User" />
      </el-form-item>
      <el-form-item prop="password">
        <el-input v-model="form.password" type="password" placeholder="请输入密码" :prefix-icon="Lock" show-password />
      </el-form-item>
      <el-form-item prop="code" v-if="captchaEnabled">
        <div class="code-row">
          <el-input v-model="form.code" placeholder="验证码" :prefix-icon="Picture" />
          <img :src="codeUrl" class="code-img" @click="getCode" alt="验证码" />
        </div>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" class="submit-btn" :loading="loading" @click="handleSubmit">
          登 录
        </el-button>
      </el-form-item>
    </el-form>

    <!-- 注册 -->
    <el-form v-else ref="regFormRef" :model="regForm" :rules="regRules" size="large" @keyup.enter="handleRegister">
      <el-form-item prop="username">
        <el-input v-model="regForm.username" placeholder="用户名（2-20 个字符）" :prefix-icon="User" />
      </el-form-item>
      <el-form-item prop="password">
        <el-input v-model="regForm.password" type="password" placeholder="密码（5-20 位）" :prefix-icon="Lock" show-password />
      </el-form-item>
      <el-form-item prop="confirm">
        <el-input v-model="regForm.confirm" type="password" placeholder="确认密码" :prefix-icon="Lock" show-password />
      </el-form-item>
      <el-form-item prop="code" v-if="captchaEnabled">
        <div class="code-row">
          <el-input v-model="regForm.code" placeholder="验证码" :prefix-icon="Picture" />
          <img :src="codeUrl" class="code-img" @click="getCode" alt="验证码" />
        </div>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" class="submit-btn" :loading="regLoading" @click="handleRegister">
          注 册
        </el-button>
      </el-form-item>
    </el-form>

    <!-- 入口行 -->
    <div class="auth-foot">
      <template v-if="mode === 'login'">
        <button type="button" class="foot-link" @click="switchMode('register')">注册账号</button>
        <span class="foot-sep" aria-hidden="true"></span>
        <button type="button" class="foot-link foot-link--muted" @click="showNotice('forgot')">忘记密码</button>
      </template>
      <template v-else>
        <span class="foot-tip">已有账号？</span>
        <button type="button" class="foot-link" @click="switchMode('login')">返回登录</button>
      </template>
    </div>

    <!-- 忘记密码说明 -->
    <div class="auth-notice" v-if="notice" role="status">
      <p class="an-title">{{ noticeMeta.title }}</p>
      <p class="an-desc">{{ noticeMeta.desc }}</p>
      <div class="an-actions">
        <button type="button" class="ui-btn ui-btn--sm ui-btn--solid" @click="goConsult">去联系客服</button>
        <button type="button" class="ui-linkbtn ui-linkbtn--muted" @click="notice = ''">知道了</button>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { User, Lock, Picture } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getCodeImg, login, register } from '@/api/login'
import { useUserStore } from '@/store/modules/user'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  initMode: { type: String, default: 'login' }
})
const emit = defineEmits(['update:modelValue', 'success'])

const userStore = useUserStore()
const router = useRouter()
const formRef = ref()
const regFormRef = ref()
const visible = ref(props.modelValue)
const loading = ref(false)
const regLoading = ref(false)
const codeUrl = ref('')
const captchaEnabled = ref(true)
const mode = ref('login')

const form = reactive({
  username: '',
  password: '',
  code: '',
  uuid: ''
})

const regForm = reactive({
  username: '',
  password: '',
  confirm: '',
  code: '',
  uuid: ''
})

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }, { min: 2, max: 20, message: '长度 2-20', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }, { min: 5, max: 20, message: '长度 5-20', trigger: 'blur' }],
  code: [{ required: true, message: '请输入验证码', trigger: 'blur' }]
}

const regRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }, { min: 2, max: 20, message: '长度 2-20', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }, { min: 5, max: 20, message: '长度 5-20', trigger: 'blur' }],
  confirm: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== regForm.password) callback(new Error('两次输入的密码不一致'))
        else callback()
      },
      trigger: 'blur'
    }
  ],
  code: [{ required: true, message: '请输入验证码', trigger: 'blur' }]
}

watch(() => props.modelValue, (v) => {
  visible.value = v
  if (v) {
    // 关闭再打开时回到登录态，避免停留在上次的注册表单
    if (!mode.value) mode.value = 'login'
    getCode()
  }
})
watch(visible, (v) => emit('update:modelValue', v))

function getCode() {
  getCodeImg().then(res => {
    captchaEnabled.value = res.captchaEnabled !== false
    if (captchaEnabled.value) {
      codeUrl.value = 'data:image/gif;base64,' + res.img
      form.uuid = res.uuid
      regForm.uuid = res.uuid
    }
  })
}

const NOTICE = {
  forgot: {
    title: '忘记密码',
    desc: '密码重置需要核验身份：到店由店员办理，或在客服会话里提供登录账号与预留手机号，核实后帮你重置。'
  }
}
const notice = ref('')
const noticeMeta = computed(() => NOTICE[notice.value] || NOTICE.forgot)

function showNotice(kind) {
  notice.value = notice.value === kind ? '' : kind
}

function switchMode(m) {
  mode.value = m
  notice.value = ''
  // 验证码是一次性的，切换表单时刷新，避免 uuid 被上一个表单用掉
  getCode()
}

function goConsult() {
  visible.value = false
  notice.value = ''
  router.push('/shop/consult')
}

function handleClose() {
  formRef.value?.resetFields()
  regFormRef.value?.resetFields()
  notice.value = ''
  mode.value = 'login'
}

async function handleSubmit() {
  await formRef.value.validate(async valid => {
    if (!valid) return
    loading.value = true
    try {
      await userStore.login({ username: form.username, password: form.password, code: form.code, uuid: form.uuid })
      await userStore.getInfo()
      ElMessage.success('登录成功，欢迎回来！')
      visible.value = false
      emit('success', { type: 'login' })
    } catch (e) {
      if (captchaEnabled.value) getCode()
    } finally {
      loading.value = false
    }
  })
}

async function handleRegister() {
  await regFormRef.value.validate(async valid => {
    if (!valid) return
    regLoading.value = true
    try {
      await register({
        username: regForm.username.trim(),
        password: regForm.password,
        code: regForm.code,
        uuid: regForm.uuid
      })
      ElMessage.success('注册成功，请使用新账号登录')
      // 回填账号密码，用户只需再填一次验证码
      form.username = regForm.username.trim()
      form.password = regForm.password
      form.code = ''
      mode.value = 'login'
      getCode()
    } catch (e) {
      if (captchaEnabled.value) getCode()
    } finally {
      regLoading.value = false
    }
  })
}

// 兼容旧调用：open('register') 直接展开注册表单 / open('forgot') 展开找回说明
function open(m = 'login') {
  visible.value = true
  mode.value = m === 'register' ? 'register' : 'login'
  notice.value = m === 'forgot' ? 'forgot' : ''
  getCode()
}

defineExpose({ open, visible, mode })
</script>

<style scoped lang="scss">
.code-row { display: flex; gap: 10px; width: 100%; }
.code-img { width: 120px; height: 40px; border-radius: var(--radius-xs); cursor: pointer; border: 1px solid var(--border-1); }
.submit-btn { width: 100%; background: var(--brand-600); border-color: var(--brand-600); }
.submit-btn:hover { background: var(--brand-600); border-color: var(--brand-600); }
/* 入口行：一条极细分割线 + 两个文字链，不用按钮，避免与主行动抢层级 */
.auth-foot {
  display: flex; align-items: center; justify-content: center; gap: 14px;
  margin-top: 2px; padding-top: 14px;
  border-top: 1px solid var(--border-2);
  font-size: var(--fs-4);
}
.foot-link {
  border: 0; background: none; padding: 2px 0;
  font: inherit; font-size: var(--fs-4); font-weight: 700; color: var(--brand-700);
  cursor: pointer;
  &:hover { text-decoration: underline; text-underline-offset: 3px; }
}
.foot-link--muted { color: var(--text-3); font-weight: 500; }
.foot-tip { font-size: var(--fs-4); color: var(--text-3); }
.foot-sep { width: 1px; height: 12px; background: var(--border-1); }

/* 说明：切到「注册 / 忘记密码」时在框内展开，不再叠一层弹窗 */
.auth-notice {
  margin-top: 14px; padding: 12px 14px;
  background: var(--brand-50);
  border: 1px solid var(--brand-100);
  border-radius: var(--radius-sm);
  .an-title { font-size: var(--fs-4); font-weight: 700; color: var(--text-1); }
  .an-desc { margin-top: 4px; font-size: var(--fs-3); line-height: 1.65; color: var(--text-2); }
  .an-actions { display: flex; align-items: center; gap: 14px; margin-top: 10px; }
}
</style>
