<template>
  <div class="consult">
    <div class="consult-inner">
      <h1>💬 联系客服</h1>
      <p class="sub">遇到问题？留下您的问题，客服会在后台尽快回复，您可在此查看回复。</p>

      <!-- 未登录引导 -->
      <el-result v-if="!isLogged" icon="warning" title="请先登录" sub-title="登录后即可向客服咨询并查看回复">
        <template #extra>
          <el-button type="primary" round @click="openAuth('login')">去登录</el-button>
        </template>
      </el-result>

      <!-- 已登录：提交 + 我的咨询 -->
      <template v-else>
        <el-card shadow="never" class="form-card">
          <template #header><span>✍️ 提交咨询</span></template>
          <el-form :model="form" label-width="80px">
            <el-form-item label="联系方式" prop="contact">
              <el-input v-model="form.contact" placeholder="手机号 / 微信，方便客服联系（选填）" style="max-width: 320px" />
            </el-form-item>
            <el-form-item label="咨询内容" prop="question">
              <el-input v-model="form.question" type="textarea" :rows="4" maxlength="500" show-word-limit placeholder="请描述您想咨询的问题，例如：想了解金毛幼犬的喂养注意事项" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="submitting" @click="submit">提交咨询</el-button>
            </el-form-item>
          </el-form>
        </el-card>

        <el-card shadow="never" class="list-card">
          <template #header><span>📋 我的咨询（{{ myList.length }}）</span></template>
          <div v-loading="loading">
            <div class="consult-item" v-for="c in myList" :key="c.consultId">
              <div class="q">
                <span class="tag">问</span>
                <div>
                  <div class="q-text">{{ c.question }}</div>
                  <div class="q-time">{{ fmt(c.createTime) }}</div>
                </div>
                <el-tag size="small" :type="c.status === '1' ? 'success' : 'info'" effect="light">
                  {{ c.status === '1' ? '已回复' : '待回复' }}
                </el-tag>
              </div>
              <div class="a" v-if="c.reply">
                <span class="tag ans">答</span>
                <div>
                  <div class="a-text">{{ c.reply }}</div>
                  <div class="a-time" v-if="c.replyBy">—— {{ c.replyBy }} · {{ fmt(c.replyTime) }}</div>
                </div>
              </div>
              <div class="a pending" v-else>
                <span class="tag ans">答</span>
                <div class="a-text muted">客服正在处理中，请耐心等待～</div>
              </div>
            </div>
            <el-empty v-if="!loading && !myList.length" description="暂无咨询，快来提问吧" />
          </div>
        </el-card>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, inject, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { submitConsult, listMyConsult } from '@/api/pet/petConsult'
import { useUserStore } from '@/store/modules/user'

const userStore = useUserStore()
const openAuth = inject('openAuth', () => {})
const isLogged = computed(() => !!userStore.token)

const form = reactive({ contact: '', question: '' })
const submitting = ref(false)
const loading = ref(false)
const myList = ref([])

function fmt(d) { return d ? String(d).replace('T', ' ').slice(0, 19) : '—' }

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

onMounted(() => {
  if (isLogged.value) loadMine()
})
</script>

<style scoped lang="scss">
.consult { background: #f7f8fa; min-height: 100vh; padding: 28px 16px; }
.consult-inner { max-width: 760px; margin: 0 auto;
  h1 { font-size: 22px; color: #303133; margin: 0 0 6px; }
  .sub { color: #909399; font-size: 13px; margin: 0 0 20px; }
}
.form-card, .list-card { margin-bottom: 18px; border-radius: 14px; }
.consult-item { border: 1px solid #f0f0f0; border-radius: 12px; padding: 14px 16px; margin-bottom: 12px; background: #fcfcfd;
  .q { display: flex; align-items: flex-start; gap: 10px;
    .tag { flex-shrink: 0; width: 24px; height: 24px; border-radius: 50%; background: #ff8c42; color: #fff; font-size: 12px; display: flex; align-items: center; justify-content: center; font-weight: 600; }
    .tag.ans { background: #67c23a; }
    .q-text { font-size: 14px; color: #303133; line-height: 1.6; }
    .q-time { font-size: 12px; color: #c0c4cc; margin-top: 2px; }
  }
  .a { display: flex; align-items: flex-start; gap: 10px; margin-top: 10px; padding-top: 10px; border-top: 1px dashed #f0f0f0;
    .a-text { font-size: 14px; color: #606266; line-height: 1.7;
      &.muted { color: #c0c4cc; }
    }
    .a-time { font-size: 12px; color: #c0c4cc; margin-top: 2px; }
  }
}
</style>
