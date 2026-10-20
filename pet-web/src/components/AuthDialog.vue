<template>
  <el-dialog v-model="visible" :width="420" :title="mode === 'login' ? '登录宠物之家' : '注册新账号'" align-center @close="handleClose">
    <el-tabs v-model="mode" class="auth-tabs" @tab-change="onTabChange">
      <el-tab-pane label="登录" name="login" />
      <el-tab-pane label="注册" name="register" />
    </el-tabs>

    <el-form ref="formRef" :model="form" :rules="rules" size="large" @keyup.enter="handleSubmit">
      <el-form-item prop="username">
        <el-input v-model="form.username" placeholder="请输入用户名" :prefix-icon="User" />
      </el-form-item>
      <el-form-item prop="password">
        <el-input v-model="form.password" type="password" placeholder="请输入密码" :prefix-icon="Lock" show-password />
      </el-form-item>
      <template v-if="mode === 'register'">
        <el-form-item prop="confirmPassword">
          <el-input v-model="form.confirmPassword" type="password" placeholder="请确认密码" :prefix-icon="Lock" show-password />
        </el-form-item>
      </template>
      <el-form-item prop="code" v-if="captchaEnabled">
        <div class="code-row">
          <el-input v-model="form.code" placeholder="验证码" :prefix-icon="Picture" />
          <img :src="codeUrl" class="code-img" @click="getCode" alt="验证码" />
        </div>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" class="submit-btn" :loading="loading" @click="handleSubmit">
          {{ mode === 'login' ? '登 录' : '注 册' }}
        </el-button>
      </el-form-item>
    </el-form>

    <div class="quick-tip" v-if="mode === 'login'">
      <span>没有账号？</span>
      <el-link type="primary" @click="mode = 'register'">立即注册</el-link>
      <el-divider direction="vertical" />
      <el-tag type="warning" size="small" @click="fillAdmin" style="cursor:pointer">admin/admin123 体验</el-tag>
    </div>
    <div class="quick-tip" v-else>
      <span>已有账号？</span>
      <el-link type="primary" @click="mode = 'login'">去登录</el-link>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
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
const formRef = ref()
const visible = ref(props.modelValue)
const mode = ref(props.initMode)
const loading = ref(false)
const codeUrl = ref('')
const captchaEnabled = ref(true)

const form = reactive({
  username: '',
  password: '',
  confirmPassword: '',
  code: '',
  uuid: ''
})

const validateConfirm = (rule, value, callback) => {
  if (value !== form.password) callback(new Error('两次输入的密码不一致'))
  else callback()
}

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }, { min: 2, max: 20, message: '长度 2-20', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }, { min: 5, max: 20, message: '长度 5-20', trigger: 'blur' }],
  confirmPassword: [{ required: true, message: '请确认密码', trigger: 'blur' }, { validator: validateConfirm, trigger: 'blur' }],
  code: [{ required: true, message: '请输入验证码', trigger: 'blur' }]
}

watch(() => props.modelValue, (v) => {
  visible.value = v
  if (v) {
    mode.value = props.initMode
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
    }
  })
}

function onTabChange() {
  formRef.value?.clearValidate()
  getCode()
}

function fillAdmin() {
  form.username = 'admin'
  form.password = 'admin123'
}

function handleClose() {
  formRef.value?.resetFields()
}

async function handleSubmit() {
  await formRef.value.validate(async valid => {
    if (!valid) return
    loading.value = true
    try {
      if (mode.value === 'login') {
        await userStore.login({ username: form.username, password: form.password, code: form.code, uuid: form.uuid })
        await userStore.getInfo()
        ElMessage.success('登录成功，欢迎回来！')
        visible.value = false
        emit('success', { type: 'login' })
      } else {
        await register({ username: form.username, password: form.password, code: form.code, uuid: form.uuid })
        ElMessage.success('注册成功，请使用新账号登录')
        mode.value = 'login'
      }
    } catch (e) {
      if (captchaEnabled.value) getCode()
    } finally {
      loading.value = false
    }
  })
}

// 暴露给父组件：打开对话框
function open(m = 'login') {
  mode.value = m
  visible.value = true
  getCode()
}

defineExpose({ open, visible, mode })
</script>

<style scoped lang="scss">
.auth-tabs { margin-bottom: 8px; }
.code-row { display: flex; gap: 10px; width: 100%; }
.code-img { width: 120px; height: 40px; border-radius: 4px; cursor: pointer; border: 1px solid #dcdfe6; }
.submit-btn { width: 100%; background: #ff8c42; border-color: #ff8c42; }
.submit-btn:hover { background: #f0742e; border-color: #f0742e; }
.quick-tip { text-align: center; font-size: 13px; color: #909399;
  .el-link { vertical-align: baseline; }
}
</style>
