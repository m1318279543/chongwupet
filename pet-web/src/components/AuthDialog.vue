<template>
  <el-dialog v-model="visible" :width="420" title="登录宠物之家" align-center @close="handleClose">
    <el-form ref="formRef" :model="form" :rules="rules" size="large" @keyup.enter="handleSubmit">
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

    <div class="quick-tip">
      <!-- 注册入口暂不开放：账号由后台导入，开放前需先统一前后端加密口径（见 docs/上线前注意事项.md） -->
      还没有账号？<el-link type="primary" :underline="false" @click="goConsult">联系客服开通</el-link>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import { useRouter } from 'vue-router'
import { User, Lock, Picture } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getCodeImg, login } from '@/api/login'
import { useUserStore } from '@/store/modules/user'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  initMode: { type: String, default: 'login' }
})
const emit = defineEmits(['update:modelValue', 'success'])

const userStore = useUserStore()
const router = useRouter()
const formRef = ref()
const visible = ref(props.modelValue)
const loading = ref(false)
const codeUrl = ref('')
const captchaEnabled = ref(true)

const form = reactive({
  username: '',
  password: '',
  code: '',
  uuid: ''
})

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }, { min: 2, max: 20, message: '长度 2-20', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }, { min: 5, max: 20, message: '长度 5-20', trigger: 'blur' }],
  code: [{ required: true, message: '请输入验证码', trigger: 'blur' }]
}

watch(() => props.modelValue, (v) => {
  visible.value = v
  if (v) {
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

function goConsult() {
  visible.value = false
  router.push('/shop/consult')
}

function handleClose() {
  formRef.value?.resetFields()
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

// 兼容旧调用：open('register') 一律按登录处理（注册暂不开放）
function open(m = 'login') {
  visible.value = true
  getCode()
}

defineExpose({ open, visible, mode: 'login' })
</script>

<style scoped lang="scss">
.code-row { display: flex; gap: 10px; width: 100%; }
.code-img { width: 120px; height: 40px; border-radius: 4px; cursor: pointer; border: 1px solid #dcdfe6; }
.submit-btn { width: 100%; background: var(--brand-500); border-color: var(--brand-500); }
.submit-btn:hover { background: var(--brand-600); border-color: var(--brand-600); }
.quick-tip { text-align: center; font-size: 13px; color: var(--text-3);
  .el-link { vertical-align: baseline; }
}
</style>
