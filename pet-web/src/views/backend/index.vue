<template>
  <div class="backend-showcase">
    <!-- Hero -->
    <section class="hero">
      <div class="hero-bg"></div>
      <div class="hero-inner">
        <span class="hero-badge">⚙️ 后端服务</span>
        <h1>RuoYi-Vue3<em>宠物管理系统</em></h1>
        <p>SpringBoot 3 + MyBatis Plus + MySQL 8 + Redis<br/>基于 RuoYi 3.9.2 二次开发，4 个宠物业务模块 + 完整 RBAC 权限体系</p>
        <div class="hero-stats">
          <div class="stat"><span class="num">8081</span><span class="lbl">服务端口</span></div>
          <div class="stat"><span class="num">{{ tableCount }}</span><span class="lbl">数据库表</span></div>
          <div class="stat"><span class="num">{{ apiCount }}</span><span class="lbl">API 接口</span></div>
        </div>
      </div>
    </section>

    <!-- 技术栈 -->
    <section class="tech-stack">
      <div class="section-inner">
        <h2 class="section-title">技术架构</h2>
        <div class="tech-grid">
          <div class="tech-item" v-for="t in techStack" :key="t.name">
            <span class="tech-icon">{{ t.icon }}</span>
            <div>
              <h3>{{ t.name }}</h3>
              <p>{{ t.desc }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 服务状态 -->
    <section class="status">
      <div class="section-inner">
        <h2 class="section-title">服务运行状态</h2>
        <div class="status-cards">
          <div class="status-card" v-for="s in services" :key="s.name" :class="{ok: s.ok, fail: !s.ok}">
            <span class="status-dot" :class="{ok: s.ok, fail: !s.ok}"></span>
            <div class="status-info">
              <h4>{{ s.name }}</h4>
              <p>{{ s.detail }}</p>
            </div>
            <span class="status-badge" :class="{ok: s.ok, fail: !s.ok}">{{ s.ok ? '正常' : '未响应' }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- API 接口列表 -->
    <section class="api-list">
      <div class="section-inner">
        <h2 class="section-title">宠物业务 API 接口</h2>
        <p class="section-sub">所有接口均需携带 Authorization: Bearer &lt;token&gt; 头，通过 Spring Security 权限校验</p>
        <div class="api-table">
          <div class="api-row api-head">
            <span class="api-method">方法</span>
            <span class="api-path">路径</span>
            <span class="api-desc">说明</span>
            <span class="api-perm">权限标识</span>
          </div>
          <div class="api-row" v-for="api in apiList" :key="api.path + api.method">
            <span class="api-method" :class="api.method.toLowerCase()">{{ api.method }}</span>
            <span class="api-path">{{ api.path }}</span>
            <span class="api-desc">{{ api.desc }}</span>
            <span class="api-perm">{{ api.perm }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 数据库表 -->
    <section class="db-tables">
      <div class="section-inner">
        <h2 class="section-title">数据库表结构（ry-pet）</h2>
        <div class="db-grid">
          <div class="db-group" v-for="g in dbGroups" :key="g.title">
            <h3 class="db-group-title">{{ g.icon }} {{ g.title }}</h3>
            <div class="db-list">
              <div class="db-item" v-for="t in g.tables" :key="t.name">
                <span class="db-name">{{ t.name }}</span>
                <span class="db-comment">{{ t.comment }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 业务模块 -->
    <section class="modules">
      <div class="section-inner">
        <h2 class="section-title">宠物业务模块</h2>
        <div class="module-grid">
          <div class="module-card" v-for="m in modules" :key="m.name">
            <span class="module-icon">{{ m.icon }}</span>
            <h3>{{ m.name }}</h3>
            <p>{{ m.desc }}</p>
            <div class="module-fields">
              <el-tag size="small" v-for="f in m.fields" :key="f">{{ f }}</el-tag>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'

const tableCount = ref(35)
const apiCount = ref(24)

const techStack = [
  { icon: '☕', name: 'JDK 17', desc: 'Temurin 17.0.20.1 LTS' },
  { icon: '🍃', name: 'SpringBoot 3.5', desc: 'Jakarta EE 9+, 主流框架' },
  { icon: '🔧', name: 'MyBatis Plus', desc: 'ORM 框架 + 代码生成器' },
  { icon: '🛢️', name: 'MySQL 8.0', desc: 'utf8mb4 编码, 35 张表' },
  { icon: '⚡', name: 'Redis', desc: 'Token 缓存 / 字典数据' },
  { icon: '🔐', name: 'Spring Security', desc: 'RBAC 权限 + JWT' },
  { icon: '📋', name: 'Quartz', desc: '定时任务调度' },
  { icon: '🐳', name: 'Druid', desc: '数据库连接池 + 监控' }
]

const services = ref([
  { name: '后端服务 (8081)', detail: 'SpringBoot Tomcat', ok: false },
  { name: 'MySQL 数据库', detail: 'ry-pet @ localhost:3306', ok: false },
  { name: 'Redis 缓存', detail: 'localhost:6379', ok: false },
  { name: 'Swagger API 文档', detail: '/swagger-ui.html', ok: false }
])

const apiList = [
  { method: 'GET', path: '/pet/category/list', desc: '宠物分类列表', perm: 'pet:category:list' },
  { method: 'POST', path: '/pet/category', desc: '新增宠物分类', perm: 'pet:category:add' },
  { method: 'PUT', path: '/pet/category', desc: '修改宠物分类', perm: 'pet:category:edit' },
  { method: 'DELETE', path: '/pet/category/{ids}', desc: '删除宠物分类', perm: 'pet:category:remove' },
  { method: 'GET', path: '/pet/info/list', desc: '宠物信息列表', perm: 'pet:info:list' },
  { method: 'POST', path: '/pet/info', desc: '新增宠物信息', perm: 'pet:info:add' },
  { method: 'PUT', path: '/pet/info', desc: '修改宠物信息', perm: 'pet:info:edit' },
  { method: 'DELETE', path: '/pet/info/{ids}', desc: '删除宠物信息', perm: 'pet:info:remove' },
  { method: 'GET', path: '/pet/appointment/list', desc: '预约列表', perm: 'pet:appointment:list' },
  { method: 'POST', path: '/pet/appointment', desc: '发起预约', perm: 'pet:appointment:add' },
  { method: 'PUT', path: '/pet/appointment', desc: '处理预约', perm: 'pet:appointment:edit' },
  { method: 'GET', path: '/pet/favorite/list', desc: '收藏列表', perm: 'pet:favorite:list' },
  { method: 'POST', path: '/pet/favorite', desc: '添加收藏', perm: 'pet:favorite:add' },
  { method: 'DELETE', path: '/pet/favorite/{ids}', desc: '取消收藏', perm: 'pet:favorite:remove' },
  { method: 'GET', path: '/captchaImage', desc: '获取验证码', perm: '匿名' },
  { method: 'POST', path: '/login', desc: '用户登录', perm: '匿名' },
  { method: 'POST', path: '/register', desc: '用户注册', perm: '匿名' },
  { method: 'GET', path: '/getInfo', desc: '获取用户信息', perm: '登录' },
  { method: 'GET', path: '/getRouters', desc: '获取路由菜单', perm: '登录' }
]

const dbGroups = [
  {
    title: 'RuoYi 系统表', icon: '⚙️',
    tables: [
      { name: 'sys_user', comment: '用户表' },
      { name: 'sys_role', comment: '角色表' },
      { name: 'sys_menu', comment: '菜单权限表' },
      { name: 'sys_dept', comment: '部门表' },
      { name: 'sys_config', comment: '参数配置表' },
      { name: 'sys_dict_type', comment: '字典类型表' },
      { name: 'sys_dict_data', comment: '字典数据表' },
      { name: 'sys_notice', comment: '通知公告表' },
      { name: 'sys_logininfor', comment: '登录日志表' },
      { name: 'sys_oper_log', comment: '操作日志表' },
      { name: 'sys_job', comment: '定时任务表' },
      { name: 'sys_post', comment: '岗位表' }
    ]
  },
  {
    title: '宠物业务表', icon: '🐾',
    tables: [
      { name: 'pet_category', comment: '宠物分类表' },
      { name: 'pet_info', comment: '宠物信息表' },
      { name: 'pet_appointment', comment: '预约记录表' },
      { name: 'pet_favorite', comment: '用户收藏表' }
    ]
  },
  {
    title: 'Quartz 定时任务表', icon: '⏰',
    tables: [
      { name: 'QRTZ_JOB_DETAILS', comment: '任务详情' },
      { name: 'QRTZ_TRIGGERS', comment: '触发器' },
      { name: 'QRTZ_CRON_TRIGGERS', comment: 'Cron触发器' },
      { name: 'QRTZ_SIMPLE_TRIGGERS', comment: '简单触发器' },
      { name: 'QRTZ_BLOB_TRIGGERS', comment: 'Blob触发器' },
      { name: 'QRTZ_FIRED_TRIGGERS', comment: '已触发的触发器' }
    ]
  }
]

const modules = [
  {
    icon: '🏷️', name: '宠物分类管理', desc: '管理宠物分类，支持树形结构',
    fields: ['分类名称', '排序', '状态', '备注']
  },
  {
    icon: '🐕', name: '宠物信息管理', desc: '宠物商品信息，含图片/价格/描述',
    fields: ['分类', '名称', '品种', '年龄', '性别', '价格', '图片', '状态', '描述']
  },
  {
    icon: '📅', name: '预约管理', desc: '用户预约看宠记录，商家可处理',
    fields: ['用户', '宠物', '预约日期', '联系电话', '状态']
  },
  {
    icon: '❤️', name: '收藏管理', desc: '用户收藏的宠物列表',
    fields: ['用户', '宠物']
  }
]

async function checkServices() {
  // 检查后端 8081
  try {
    const resp = await fetch('/dev-api/captchaImage')
    services.value[0].ok = resp.ok
  } catch { services.value[0].ok = false }

  // 检查 swagger
  try {
    const resp = await fetch('http://localhost:8081/swagger-ui.html', { mode: 'no-cors' })
    services.value[3].ok = true
  } catch { services.value[3].ok = false }

  // MySQL 和 Redis 通过后端间接判断
  if (services.value[0].ok) {
    services.value[1].ok = true
    services.value[2].ok = true
  }
}

onMounted(() => {
  checkServices()
})
</script>

<style scoped lang="scss">
.backend-showcase { background: #f5f7fa; }

/* Hero */
.hero { position: relative; min-height: 380px; display: flex; align-items: center; overflow: hidden; }
.hero-bg { position: absolute; inset: 0; background: linear-gradient(135deg, #1a237e 0%, #283593 40%, #3949ab 100%); }
.hero-bg::after { content: '⚙️'; position: absolute; font-size: 200px; opacity: .06; right: 5%; top: 10%; }
.hero-inner { position: relative; z-index: 2; max-width: 1200px; margin: 0 auto; padding: 56px 24px; width: 100%; }
.hero-text { max-width: 600px; color: #fff; }
.hero-badge { display: inline-block; background: rgba(255,255,255,.2); padding: 4px 14px; border-radius: 20px; font-size: 13px; margin-bottom: 16px; }
.hero h1 { font-size: 42px; margin: 0 0 16px; color: #fff; em { font-style: normal; color: #90caf9; } }
.hero p { font-size: 15px; opacity: .95; margin: 0 0 28px; line-height: 1.7; }
.hero-stats { display: flex; gap: 40px;
  .stat { .num { font-size: 28px; font-weight: 700; display: block; color: #90caf9; } .lbl { font-size: 13px; opacity: .85; } }
}

/* 通用 */
.section-inner { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
.section-title { font-size: 24px; color: #1a237e; margin: 0 0 8px; }
.section-sub { font-size: 13px; color: #909399; margin: 0 0 24px; }

/* 技术栈 */
.tech-stack { background: #fff; padding: 48px 0; }
.tech-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 20px; margin-top: 24px; }
.tech-item { display: flex; gap: 14px; align-items: center; padding: 16px; border-radius: 8px; background: #f5f7fa; transition: all .2s;
  &:hover { background: #e8eaf6; transform: translateY(-2px); }
  .tech-icon { font-size: 32px; flex-shrink: 0; }
  h3 { font-size: 16px; color: #303133; margin: 0 0 4px; }
  p { font-size: 12px; color: #909399; margin: 0; }
}

/* 服务状态 */
.status { background: #f5f7fa; padding: 48px 0; }
.status-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; margin-top: 24px; }
.status-card { display: flex; align-items: center; gap: 12px; padding: 16px 20px; border-radius: 8px; background: #fff; border-left: 4px solid;
  &.ok { border-color: #67c23a; } &.fail { border-color: #f56c6c; }
  .status-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;
    &.ok { background: #67c23a; box-shadow: 0 0 8px #67c23a; } &.fail { background: #f56c6c; }
  }
  .status-info { flex: 1;
    h4 { font-size: 15px; color: #303133; margin: 0 0 2px; }
    p { font-size: 12px; color: #909399; margin: 0; }
  }
  .status-badge { font-size: 12px; padding: 2px 10px; border-radius: 12px;
    &.ok { background: #f0f9eb; color: #67c23a; } &.fail { background: #fef0f0; color: #f56c6c; }
  }
}

/* API 列表 */
.api-list { background: #fff; padding: 48px 0; }
.api-table { margin-top: 24px; border: 1px solid #ebeef5; border-radius: 8px; overflow: hidden; }
.api-row { display: grid; grid-template-columns: 80px 1fr 1fr 180px; padding: 10px 16px; align-items: center; border-bottom: 1px solid #f5f5f5; font-size: 13px;
  &:last-child { border-bottom: none; }
  &.api-head { background: #f5f7fa; font-weight: 600; color: #606266; }
}
.api-method { font-weight: 600; font-size: 11px; padding: 2px 8px; border-radius: 3px; text-align: center; color: #fff;
  &.get { background: #409eff; } &.post { background: #67c23a; } &.put { background: #e6a23c; } &.delete { background: #f56c6c; }
}
.api-path { font-family: 'Consolas', monospace; color: #303133; }
.api-desc { color: #606266; }
.api-perm { font-family: 'Consolas', monospace; color: #909399; font-size: 12px; }

/* 数据库表 */
.db-tables { background: #f5f7fa; padding: 48px 0; }
.db-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px; margin-top: 24px; }
.db-group { background: #fff; border-radius: 8px; padding: 20px; }
.db-group-title { font-size: 16px; color: #1a237e; margin: 0 0 16px; }
.db-list { display: flex; flex-direction: column; gap: 8px; }
.db-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #f5f7fa; border-radius: 4px;
  .db-name { font-family: 'Consolas', monospace; font-size: 13px; color: #303133; font-weight: 500; }
  .db-comment { font-size: 12px; color: #909399; }
}

/* 模块 */
.modules { background: #fff; padding: 48px 0; }
.module-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; margin-top: 24px; }
.module-card { border: 1px solid #ebeef5; border-radius: 8px; padding: 20px; transition: all .2s;
  &:hover { box-shadow: 0 4px 16px rgba(26,35,126,.1); border-color: #c5cae9; }
  .module-icon { font-size: 36px; }
  h3 { font-size: 17px; color: #1a237e; margin: 8px 0 8px; }
  p { font-size: 13px; color: #606266; margin: 0 0 12px; line-height: 1.5; }
  .module-fields { display: flex; gap: 4px; flex-wrap: wrap; }
}

@media (max-width: 768px) {
  .api-row { grid-template-columns: 60px 1fr; .api-desc, .api-perm { display: none; } }
  .hero h1 { font-size: 28px; }
}
</style>
