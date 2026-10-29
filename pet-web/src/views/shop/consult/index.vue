<template>
  <div class="ui-page">
    <header class="ui-head">
      <div class="ui-head__main">
        <p class="ui-eyebrow">Support</p>
        <h1 class="ui-title">联系客服</h1>
        <p class="ui-sub">留下问题，客服会在后台回复，回复内容直接显示在下方记录里。</p>
      </div>
      <div class="ui-head__aside">
        <button type="button" class="ai-entry" @click="askAssistant">先问 AI，通常更快 ›</button>
        <span class="ui-count" v-if="isLogged"><b>{{ myList.length }}</b>条咨询</span>
      </div>
    </header>

    <!-- 未登录 -->
    <div class="ui-empty" v-if="!isLogged">
      <p class="ui-empty__title">登录后即可咨询</p>
      <p class="ui-empty__desc">咨询记录与回复都绑定在账号上，登录后可随时回看。</p>
      <div class="ui-empty__act">
        <button type="button" class="ui-btn ui-btn--solid" @click="openAuth('login')">去登录</button>
      </div>
    </div>

    <template v-else>
      <!-- 左：提交 + 记录；右：客服须知与门店电话，把原来两侧各空 200px 的窄栏用起来 -->
      <div class="consult-grid">
      <div class="consult-main">
      <!-- 提交区：两个字段平铺，字段之间只有留白与 1px 底线 -->
      <section class="ask">
        <div class="ui-sec__head">
          <h2 class="ui-sec__title">提交咨询</h2>
          <span class="ui-sec__hint">工作时间内会尽快回复</span>
        </div>

        <div class="ui-form">
          <label class="ui-field">
            <span class="ui-label">联系方式</span>
            <el-input v-model="form.contact" placeholder="手机号 / 微信（选填，方便客服联系你）" />
          </label>
          <label class="ui-field">
            <span class="ui-label">咨询内容 <em>*</em></span>
            <el-input
              v-model="form.question"
              type="textarea"
              :rows="4"
              maxlength="500"
              show-word-limit
              placeholder="请描述你想咨询的问题，例如：想了解金毛幼犬的喂养注意事项"
            />
          </label>
        </div>

        <div class="ask__actions">
          <button type="button" class="ui-btn ui-btn--solid" :disabled="submitting" @click="submit">
            {{ submitting ? '提交中…' : '提交咨询' }}
          </button>
        </div>
      </section>

      <!-- 记录区：一问一答成组，组与组之间用 1px 线切分 -->
      <section class="mine">
        <div class="ui-sec__head">
          <h2 class="ui-sec__title">我的咨询</h2>
          <span class="ui-sec__hint">{{ myList.length }} 条记录</span>
        </div>

        <div v-loading="loading">
          <ul class="ui-list" v-if="myList.length">
            <li class="ui-row qa" v-for="c in myList" :key="c.consultId">
              <div class="qa__body">
                <!-- 提问行 -->
                <div class="qa__line">
                  <span class="qa__tag">问</span>
                  <p class="qa__text">{{ c.question }}</p>
                  <span class="ui-chip" :class="c.status === '1' ? 'ui-chip--ok' : 'ui-chip--warn'">
                    {{ c.status === '1' ? '已回复' : '待回复' }}
                  </span>
                </div>
                <p class="qa__time">{{ fmt(c.createTime) }}</p>

                <!-- 回复行：左侧竖线表示从属关系 -->
                <div class="qa__answer">
                  <span class="qa__tag qa__tag--ans">答</span>
                  <div class="qa__ans-body">
                    <p class="qa__text" :class="{ 'qa__text--muted': !answered(c) }">
                      {{ answered(c) ? c.reply : '客服正在处理中，请耐心等待。' }}
                    </p>
                    <p class="qa__by" v-if="c.replyBy">—— {{ c.replyBy }} · {{ fmt(c.replyTime) }}</p>
                  </div>
                </div>
              </div>
            </li>
          </ul>

          <div class="ui-empty" v-else-if="!loading">
            <p class="ui-empty__title">还没有咨询记录</p>
            <p class="ui-empty__desc">在上面填写问题提交后，客服的回复会出现在这里。</p>
          </div>
        </div>
      </section>
      </div>

      <aside class="consult-side">
        <section class="side-card">
          <h2 class="side-title">回复时间</h2>
          <ul class="side-list">
            <li>工作日 09:00–21:00 在线，节假日顺延</li>
            <li>一般 2 小时内回复，复杂问题会安排门店回电</li>
            <li>回复会直接出现在左侧「我的咨询」里，可随时回看</li>
          </ul>
        </section>

        <section class="side-card" v-if="stores.length">
          <h2 class="side-title">直接打电话</h2>
          <ul class="tel-list">
            <li v-for="s in stores.slice(0, 3)" :key="s.storeId">
              <b>{{ s.storeName }}</b>
              <a v-if="s.phone" :href="'tel:' + s.phone">{{ s.phone }}</a>
              <span v-if="s.businessHours">{{ s.businessHours }}</span>
            </li>
          </ul>
        </section>
      </aside>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, inject, onMounted, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import { submitConsult, listMyConsult } from '@/api/pet/petConsult'
import { listStore } from '@/api/pet/petStore'
import { useUserStore } from '@/store/modules/user'

const userStore = useUserStore()
const openAuth = inject('openAuth', () => {})
const isLogged = computed(() => !!userStore.token)

// 右侧栏的门店电话；接口不可用时留空，对应那块自动不渲染
const stores = ref([])
async function loadStores() {
  try {
    const res = await listStore({})
    stores.value = res.rows || res.data || []
  } catch (e) { /* 静默 */ }
}

const form = reactive({ contact: '', question: '' })
const submitting = ref(false)
const loading = ref(false)
const myList = ref([])

function askAssistant() {
  window.dispatchEvent(new CustomEvent('pet-assistant-open', {
    detail: { scene: 'consult' }
  }))
}

function fmt(d) { return d ? String(d).replace('T', ' ').slice(0, 19) : '—' }
// 以状态为准：偶有「有回复内容但状态仍是待回复」的数据，避免出现「待回复」下面写着答复
function answered(c) { return c.status === '1' && !!c.reply }

async function submit() {
  if (!form.question.trim()) {
    ElMessage.warning('请填写咨询内容')
    return
  }
  submitting.value = true
  try {
    await submitConsult({ question: form.question.trim(), contact: form.contact.trim() })
    ElMessage.success('提交成功，客服会尽快回复！')
    form.question = ''
    form.contact = ''
    loadMine()
  } catch (e) {
    ElMessage.error(e?.message || '提交失败')
  } finally {
    submitting.value = false
  }
}

async function loadMine() {
  loading.value = true
  try {
    const res = await listMyConsult()
    myList.value = res.rows || []
  } catch (e) {
    myList.value = []
  } finally {
    loading.value = false
  }
}

// AI 助手「转人工」发生在本页时不再跳转，只关面板并广播刷新，避免 consult → AI → 转人工 → consult 循环
function onAssistantHandoff() {
  if (isLogged.value) loadMine()
}
onMounted(() => {
  loadStores()
  if (isLogged.value) loadMine()
  window.addEventListener('pet-consult-refresh', onAssistantHandoff)
})
onBeforeUnmount(() => {
  window.removeEventListener('pet-consult-refresh', onAssistantHandoff)
})
</script>

<style scoped lang="scss">
// 页头 / 表单组 / 行列表 / 空态来自 .ui-* 基元；本页只写「一问一答」的层级关系。

/* 左主右辅：表单与记录在左，客服须知 + 门店电话在右。
   原来是 640 窄栏居中，1440 下两侧各空 200px 以上。 */
.consult-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 48px;
  align-items: start;
}
.consult-main { min-width: 0; }

.consult-side {
  position: sticky;
  top: 96px;
  display: grid;
  gap: 28px;
}
.side-card { border-top: var(--rule); padding-top: 18px; }
.side-title { margin: 0 0 10px; font-size: var(--fs-5); font-weight: 700; color: var(--text-1); }
.side-list {
  margin: 0; padding-left: 16px;
  li { font-size: var(--fs-4); line-height: 1.8; color: var(--text-2); }
}
.tel-list {
  margin: 0; padding: 0; list-style: none;
  display: grid; gap: 14px;
  li {
    display: grid; gap: 3px;
    b { font-size: var(--fs-5); font-weight: 700; color: var(--text-1); }
    a {
      font-size: var(--fs-4); color: var(--brand-700); text-decoration: none;
      font-variant-numeric: tabular-nums;
      &:hover { text-decoration: underline; }
    }
    span { font-size: var(--fs-2); color: var(--text-3); }
  }
}
@media (max-width: 900px) {
  .consult-grid { grid-template-columns: minmax(0, 1fr); gap: 32px; }
  .consult-side { position: static; }
}

.ask { padding-top: 24px; }
.ask__actions {
  margin-top: 20px;
}

.mine { padding-top: 34px; }

.ai-entry {
  border: 1px solid var(--brand-200);
  background: var(--brand-50);
  color: var(--brand-700);
  font-family: inherit;
  font-size: var(--fs-3);
  font-weight: 700;
  padding: 6px 11px;
  border-radius: var(--radius-md);
  cursor: pointer;
  white-space: nowrap;
  &:hover { background: var(--bg-card); }
}

.qa {
  padding: 18px 12px;
  align-items: flex-start;
}
.qa__body { flex: 1; min-width: 0; }

// 提问行：问 / 正文 / 状态，三者一行；窄屏状态换行
.qa__line {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}
.qa__tag {
  flex-shrink: 0;
  width: 18px;
  font-size: var(--fs-2);
  font-weight: 700;
  line-height: 1.6;
  color: var(--brand-700);
  text-align: center;
}
.qa__tag--ans { color: var(--success-500); }
.qa__text {
  flex: 1;
  min-width: 0;
  margin: 0;
  font-size: var(--fs-5);
  line-height: 1.7;
  color: var(--text-1);
  overflow-wrap: anywhere;
}
.qa__text--muted { color: var(--text-3); }
// 答复正文比提问轻一档，形成「问题在前、回复在后」的阅读顺序
.qa__answer .qa__text { color: var(--text-2); }
.qa__answer .qa__text--muted { color: var(--text-3); }
.qa__time {
  margin: 4px 0 0 28px;
  font-size: var(--fs-2);
  color: var(--text-4);
  font-variant-numeric: tabular-nums;
}

// 回答块：与提问同构，但用左侧竖线 + 缩进表示「回复依附于这个问题」
.qa__answer {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-top: 12px;
  padding: 12px 0 0 0;
  border-top: 1px solid var(--border-2);
}
.qa__ans-body { flex: 1; min-width: 0; }
.qa__by {
  margin: 6px 0 0;
  font-size: var(--fs-2);
  color: var(--text-4);
}

@media (max-width: 768px) {
  .qa { padding: 16px 8px; }
  .qa__line { flex-wrap: wrap; }
  .qa__line .ui-chip { margin-left: 28px; }
  .qa__text { font-size: var(--fs-4); }
  .qa__time { margin-left: 28px; }
}
</style>
