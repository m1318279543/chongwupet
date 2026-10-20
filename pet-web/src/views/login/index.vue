<template>
  <div class="login-wrap">
    <div class="login-left">
      <div class="brand">
        <div class="logo">🐾</div>
        <h1>宠物管理系统</h1>
        <p>管理宠物信息 · 处理预约订单 · 用户互动一站式平台</p>
        <ul class="feat">
          <li>🐕 宠物信息与分类管理</li>
          <li>📅 预约订单全流程处理</li>
          <li>❤️ 用户收藏与消息通知</li>
          <li>📊 数据统计与可视化</li>
        </ul>
      </div>
    </div>
    <div class="login-right">
      <div class="login-card">
        <h2>欢迎登录</h2>
        <p class="tip">Pet Management System</p>
        <el-form ref="loginRef" :model="loginForm" :rules="loginRules" size="large">
          <el-form-item prop="username">
            <el-input v-model="loginForm.username" placeholder="请输入用户名" :prefix-icon="User" />
          </el-form-item>
          <el-form-item prop="password">
            <el-input v-model="loginForm.password" type="password" placeholder="请输入密码" :prefix-icon="Lock" show-password @keyup.enter="handleLogin" />
          </el-form-item>
          <el-form-item prop="code" v-if="captcha.enabled">
            <div class="code-row">
              <el-input v-model="loginForm.code" placeholder="验证码" :prefix-icon="Picture" @keyup.enter="handleLogin" />
              <img :src="codeUrl" class="code-img" @click="getCode" alt="验证码" />
            </div>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" class="login-btn" :loading="loading" @click="handleLogin">
              登 录
            </el-button>
          </el-form-item>
        </el-form>
        <div class="quick">
          <span>测试账号：</span>
          <el-tag type="warning" @click="fillAdmin">admin / admin123（商家）</el-tag>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { User, Lock, Picture } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getCodeImg } from '@/api/login'
import { useUserStore } from '@/store/modules/user'

const router = useRouter()
const userStore = useUserStore()
const loginRef = ref()
const loading = ref(false)
const codeUrl = ref('')
const captcha = reactive({ enabled: true })

const loginForm = reactive({
  username: 'admin',
  password: 'admin123',
  code: '',
  uuid: ''
})

const loginRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  code: [{ required: true, message: '请输入验证码', trigger: 'blur' }]
}

function getCode() {
  getCodeImg().then(res => {
    captcha.enabled = res.captchaEnabled !== false
    if (captcha.enabled) {
      codeUrl.value = 'data:image/gif;base64,' + res.img
      loginForm.uuid = res.uuid
    }
  })
}

function handleLogin() {
  loginRef.value.validate(valid => {
    if (!valid) return
    loading.value = true
    userStore.login(loginForm).then(() => {
      ElMessage.success('登录成功')
      // 管理员直接进入自研后台，普通用户进入商城前台
      const isAdmin = Array.isArray(userStore.roles) && userStore.roles.includes('admin')
      router.push(isAdmin ? '/admin/dashboard' : '/shop/home')
    }).catch(() => {
      loading.value = false
      if (captcha.enabled) getCode()
    })
  })
}

function fillAdmin() {
  loginForm.username = 'admin'
  loginForm.password = 'admin123'
}

onMounted(() => {
  getCode()
})
</script>

<style scoped lang="scss">
.login-wrap {
  min-height: 100vh;
  display: flex;
}
.login-left {
  flex: 1.1;
  background: linear-gradient(135deg, #ff8c42 0%, #e67e22 50%, #d35400 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  padding: 40px;
  .brand {
    max-width: 420px;
    .logo { font-size: 64px; margin-bottom: 16px; }
    h1 { font-size: 36px; margin-bottom: 12px; }
    p { opacity: .9; margin-bottom: 32px; font-size: 15px; }
    .feat {
      list-style: none; padding: 0;
      li { padding: 10px 0; font-size: 15px; opacity: .95; }
    }
  }
}
.login-right {
  flex: 1;
  display: flex; align-items: center; justify-content: center;
  background: #f5f7fa;
  .login-card {
    width: 380px; background: #fff; border-radius: 12px;
    padding: 40px 36px; box-shadow: 0 8px 30px rgba(0,0,0,.08);
    h2 { margin: 0 0 4px; color: #303133; font-size: 26px; }
    .tip { color: #c0c4cc; margin: 0 0 28px; font-size: 12px; letter-spacing: 1px; }
    .code-row { display: flex; gap: 12px; width: 100%; }
    .code-img { width: 120px; height: 40px; border-radius: 4px; cursor: pointer; border: 1px solid #dcdfe6; }
    .login-btn { width: 100%; background: #ff8c42; border-color: #ff8c42; }
    .login-btn:hover { background: #f0742e; border-color: #f0742e; }
    .quick { margin-top: 20px; text-align: center; font-size: 12px; color: #909399;
      .el-tag { cursor: pointer; }
    }
  }
}
@media (max-width: 768px) {
  .login-left { display: none; }
  .login-right { flex: 1; }
}
</style>
