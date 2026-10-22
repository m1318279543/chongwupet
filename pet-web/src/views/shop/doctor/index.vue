<template>
  <div class="doctor">
    <div class="doc-inner">
      <header class="doc-hero">
        <div class="doc-avatar">🩺</div>
        <div>
          <h1>宠物医生智能问答</h1>
          <p>描述您家宠物的情况，我会从健康知识库为您匹配常见问题的症状、诱因与解决措施。<br/>小提示：紧急情况请尽快带宠物就医或联系上方在线客服。</p>
        </div>
      </header>

      <!-- 问答区 -->
      <section class="chat">
        <div class="ask-box">
          <el-input
            v-model="question"
            type="textarea"
            :rows="3"
            maxlength="200"
            show-word-limit
            placeholder="例如：猫咪软便怎么办？/ 狗狗一直挠痒是皮肤病吗？/ 兔子不吃东西"
            @keyup.ctrl.enter="ask"
          />
          <div class="ask-actions">
            <div class="chips">
              <span class="chip" v-for="q in quick" :key="q" @click="question = q; ask()">{{ q }}</span>
            </div>
            <el-button type="primary" :loading="loading" @click="ask">🚀 问问医生</el-button>
          </div>
          <p class="thinking" v-if="loading">☁️ 在线模型正在思考中，请稍候…</p>
        </div>

        <div class="answer" v-loading="loading" v-if="answered">
          <div class="bubble doc">
            <span class="who">🩺 宠物医生
              <span class="src-tag" :class="source === 'online' ? 'ai' : 'kb'" v-if="answered">
                {{ source === 'online' ? '☁️ 在线模型·' + (modelName || 'AI') + ' 生成' : '⚠️ 在线模型暂不可用' }}
              </span>
            </span>
            <p>{{ answer }}</p>
          </div>
          <div class="match-title" v-if="matchIssues.length">📚 相关知识库条目</div>
          <div class="issue-card" v-for="it in matchIssues" :key="it.issueId">
            <div class="issue-top">
              <span class="issue-name">🔹 {{ it.issueName }}</span>
              <el-tag size="small" :type="it.severity === '重' ? 'danger' : it.severity === '中' ? 'warning' : 'success'">{{ it.severity }}</el-tag>
              <el-tag size="small" type="info">{{ it.family }}</el-tag>
            </div>
            <div class="issue-row" v-if="it.symptoms"><b>症状</b><span>{{ it.symptoms }}</span></div>
            <div class="issue-row" v-if="it.cause"><b>诱因</b><span>{{ it.cause }}</span></div>
            <div class="issue-row" v-if="it.solution"><b>措施</b><span>{{ it.solution }}</span></div>
            <div class="issue-row" v-if="it.prevention"><b>预防</b><span>{{ it.prevention }}</span></div>
          </div>
        </div>
      </section>

      <!-- 健康百科浏览 -->
      <section class="wiki">
        <h2>📖 健康百科（按科系浏览）</h2>
        <el-collapse v-model="activeFamilies">
          <el-collapse-item v-for="g in familyGroups" :key="g.family" :name="g.family" :title="g.family + '（' + g.list.length + '）'">
            <div class="wiki-issue" v-for="it in g.list" :key="it.issueId">
              <div class="wiki-name"><b>{{ it.issueName }}</b>
                <el-tag size="small" :type="it.severity === '重' ? 'danger' : it.severity === '中' ? 'warning' : 'success'">{{ it.severity }}</el-tag>
              </div>
              <div class="wiki-row" v-if="it.symptoms"><span class="lbl">症状</span>{{ it.symptoms }}</div>
              <div class="wiki-row" v-if="it.solution"><span class="lbl">措施</span>{{ it.solution }}</div>
              <div class="wiki-row" v-if="it.prevention"><span class="lbl">预防</span>{{ it.prevention }}</div>
            </div>
          </el-collapse-item>
        </el-collapse>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { askDoctor, listIssueFront } from '@/api/pet/petHealthIssue'

const question = ref('')
const loading = ref(false)
const answered = ref(false)
const answer = ref('')
const matchIssues = ref([])
const source = ref('')
const modelName = ref('')
const allIssues = ref([])
const activeFamilies = ref([])

const quick = ['猫咪软便怎么办', '狗狗皮肤病一直挠', '兔子不吃东西', '仓鼠湿尾', '鹦鹉拉稀', '观赏鱼白点病', '龟腐皮腐甲']

const familyGroups = computed(() => {
  const map = {}
  for (const it of allIssues.value) {
    const f = it.family || '通用'
    if (!map[f]) map[f] = { family: f, list: [] }
    map[f].list.push(it)
  }
  return Object.values(map)
})

async function ask() {
  const q = question.value.trim()
  if (!q) {
    ElMessage.info('请先描述宠物的情况')
    return
  }
  loading.value = true
  try {
    const res = await askDoctor(q)
    const data = res.data || {}
    answer.value = data.answer || '暂无建议'
    matchIssues.value = data.issues || []
    source.value = data.source || 'online'
    modelName.value = data.model || ''
    answered.value = true
  } catch (e) {
    ElMessage.error(e?.message || '问答失败，请稍后再试')
  } finally {
    loading.value = false
  }
}

async function loadWiki() {
  try {
    const res = await listIssueFront({ pageSize: 200 })
    allIssues.value = res.data || []
    activeFamilies.value = familyGroups.value.length ? [familyGroups.value[0].family] : []
  } catch (e) {
    allIssues.value = []
  }
}

onMounted(loadWiki)
</script>

<style scoped lang="scss">
.doctor { background: var(--bg-page); padding: 28px 16px; }
.doc-inner { max-width: var(--container-sm); margin: 0 auto; }
.doc-hero { display: flex; gap: 18px; align-items: center; background: linear-gradient(135deg, var(--brand-600), var(--brand-500)); border-radius: 16px; padding: 24px 28px; color: #fff; margin-bottom: 20px;
  .doc-avatar { font-size: 52px; background: rgba(255,255,255,.2); width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  h1 { margin: 0 0 8px; font-size: 24px; }
  p { margin: 0; font-size: 13px; line-height: 1.7; opacity: .95; }
}

.chat { background: #fff; border-radius: 16px; padding: 22px; box-shadow: 0 4px 20px rgba(0,0,0,.05); margin-bottom: 20px;
  .ask-box { }
  .ask-actions { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 12px; flex-wrap: wrap;
    .chips { display: flex; gap: 8px; flex-wrap: wrap; flex: 1;
      .chip { font-size: 12px; color: var(--brand-500); background: var(--brand-50); border: 1px solid var(--brand-200); border-radius: 14px; padding: 4px 10px; cursor: pointer; transition: all .2s;
        &:hover { background: var(--brand-500); color: #fff; }
      }
    }
  }
  .thinking { margin: 10px 2px 0; font-size: 13px; color: var(--brand-500); opacity: .85; animation: blink 1.2s infinite; }
  @keyframes blink { 0%,100% { opacity: .4; } 50% { opacity: .9; } }
  .answer { margin-top: 20px;
      .bubble { background: var(--brand-50); border: 1px solid var(--brand-100); border-radius: 12px; padding: 14px 16px; margin-bottom: 16px;
        .who { font-size: 13px; color: var(--brand-500); font-weight: 600; display: block; margin-bottom: 6px;
          .src-tag { font-size: 11px; font-weight: 500; margin-left: 8px; padding: 1px 8px; border-radius: 10px; vertical-align: middle;
            &.ai { color: var(--brand-900); background: var(--brand-100); border: 1px solid var(--brand-200); }
            &.kb { color: #5a6b7a; background: #eef3f8; border: 1px solid #d6e2ec; }
          }
        }
        p { margin: 0; font-size: 14px; color: var(--text-1); line-height: 1.8; }
      }
    .match-title { font-size: 14px; color: var(--text-3); margin: 4px 0 10px; }
    .issue-card { border: 1px solid #eef0f3; border-radius: 12px; padding: 14px 16px; margin-bottom: 12px; background: var(--bg-page);
      .issue-top { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; flex-wrap: wrap;
        .issue-name { font-size: 15px; font-weight: 600; color: var(--text-1); flex: 1; min-width: 140px; }
      }
      .issue-row { font-size: 13px; line-height: 1.7; padding: 3px 0; border-bottom: 1px dashed var(--bg-sunken);
        &:last-child { border-bottom: none; }
        b { display: inline-block; width: 40px; color: var(--text-3); font-weight: 600; }
        span { color: var(--text-2); }
      }
    }
  }
}

.wiki { background: #fff; border-radius: 16px; padding: 22px; box-shadow: 0 4px 20px rgba(0,0,0,.05);
  h2 { margin: 0 0 16px; font-size: 18px; color: var(--text-1); }
  .wiki-issue { padding: 10px 0; border-bottom: 1px dashed var(--border-2);
    &:last-child { border-bottom: none; }
    .wiki-name { display: flex; align-items: center; gap: 8px; margin-bottom: 6px;
      b { font-size: 14px; color: var(--text-1); }
    }
    .wiki-row { font-size: 13px; color: var(--text-2); line-height: 1.7; padding: 2px 0;
      .lbl { display: inline-block; width: 40px; color: var(--text-3); font-weight: 600; }
    }
  }
}
</style>
