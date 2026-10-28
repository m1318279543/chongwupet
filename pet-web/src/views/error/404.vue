<template>
  <div class="nf">
    <div class="nf-card">
      <span class="nf-code">404</span>
      <h1>这个页面找不到了</h1>
      <p>地址可能已调整，或者链接输错了。可以从下面重新出发。</p>
      <div class="nf-actions">
        <el-button type="primary" size="large" round @click="router.push('/shop/home')">
          回商城首页
        </el-button>
        <el-button size="large" round @click="router.push('/admin/login')">
          进入管理后台
        </el-button>
      </div>
      <p class="nf-known">常用入口：<a @click="router.push('/shop/match')">智能选宠</a> · <a @click="router.push('/shop/food')">宠物粮</a> · <a @click="router.push('/shop/cart')">购物车</a></p>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
const router = useRouter()
</script>

<style scoped lang="scss">
// 以前未匹配的地址会被静默重定向到商城首页，用户以为"点错了"。
// 现在给一个明确的落点：告知 + 三个常用入口。
.nf {
  min-height: 100vh; display: flex; align-items: center; justify-content: center;
  padding: 24px; background: linear-gradient(160deg, var(--brand-50), var(--bg-page) 55%);
}
.nf-card {
  width: 100%; max-width: 520px; text-align: center;
  background: var(--bg-card); border-radius: var(--radius-lg);
  padding: 44px 32px 36px; box-shadow: var(--shadow-float);
  border: 1px solid var(--border-2);
}
.nf-code {
  display: inline-block; font-family: var(--font-num); font-size: 56px; font-weight: 500;
  letter-spacing: 4px; color: var(--brand-500); line-height: 1;
}
.nf-card h1 { margin: 14px 0 8px; font-size: 20px; font-weight: 500; color: var(--text-1); }
.nf-card p { margin: 0; font-size: 14px; color: var(--text-3); line-height: 1.7; }
.nf-actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin: 26px 0 20px; }
.nf-known { font-size: 13px; color: var(--text-3);
  a { color: var(--brand-700); cursor: pointer; &:hover { text-decoration: underline; } }
}
@media (max-width: 480px) {
  .nf-card { padding: 32px 20px 28px; }
  .nf-code { font-size: 44px; }
  .nf-actions :deep(.el-button) { width: 100%; margin-left: 0; }
}
</style>
