<template>
  <!-- element-plus 改按需引入后，locale 由 ConfigProvider 提供（日期/分页等中文文案） -->
  <el-config-provider :locale="zhCn">
    <router-view />
  </el-config-provider>
</template>

<script setup>
import zhCn from 'element-plus/es/locale/lang/zh-cn'
</script>
