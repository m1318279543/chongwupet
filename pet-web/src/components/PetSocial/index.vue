<template>
  <div class="pet-social">
    <!-- 点赞区 -->
    <div class="like-bar">
      <button class="like-btn" :class="{ liked: liked, bounce: bouncing }" @click="toggleLike">
        <span class="icon">{{ liked ? '❤️' : '🤍' }}</span>
        <span class="txt">{{ liked ? '已点赞' : '点赞' }}</span>
        <span class="num">{{ likeCount }}</span>
      </button>
      <div class="like-users" v-if="likeCount > 0">
        <span class="tip">已有 {{ likeCount }} 人点赞</span>
      </div>
      <div class="hint">
        <template v-if="!userStore.token">
          <span>游客可浏览评论，</span>
          <el-link type="primary" underline="never" @click="emit('auth')">登录后</el-link>
          <span>参与互动</span>
        </template>
        <span v-else>喜欢就点个赞吧</span>
      </div>
    </div>

    <!-- 评分汇总 -->
    <div class="rating-summary">
      <div class="rs-score">
        <span class="big">{{ stat.avg || '—' }}</span>
        <div class="rs-right">
          <el-rate :model-value="Number(stat.avg) || 0" disabled allow-half size="small" />
          <span class="rs-count">{{ stat.commentCount || 0 }} 条评价</span>
        </div>
      </div>
      <div class="rs-bars">
        <div class="bar-row" v-for="n in [5, 4, 3, 2, 1]" :key="n">
          <span class="bar-label">{{ n }} 星</span>
          <div class="bar-track">
            <div class="bar-fill" :style="{ width: barPct(n) + '%' }"></div>
          </div>
          <span class="bar-num">{{ dist(n) }}</span>
        </div>
      </div>
    </div>

    <!-- 评论区 -->
    <div class="comment-area">
      <div class="area-head">
        <h3>评论 <span class="cnt">{{ commentTotal }}</span></h3>
        <div class="sort">
          <el-radio-group v-model="sort" size="small">
            <el-radio-button value="new">最新</el-radio-button>
            <el-radio-button value="old">最早</el-radio-button>
          </el-radio-group>
        </div>
      </div>

      <!-- 发表框 -->
      <div class="editor">
        <div class="reply-tip" v-if="replyTo">
          回复 <b>@{{ replyTo.userName }}</b>
          <el-link type="primary" underline="never" @click="cancelReply">取消</el-link>
        </div>
        <div class="score-pick" v-if="!replyTo">
          <span class="sp-label">给个评分</span>
          <el-rate v-model="draftScore" :texts="scoreTexts" show-text />
          <span class="sp-tip">{{ draftScore ? '感谢你的评价～' : '选填，帮助其他人了解' }}</span>
        </div>
        <el-input
          v-model="draft"
          type="textarea"
          :rows="3"
          maxlength="500"
          show-word-limit
          :placeholder="userStore.token ? '说点什么吧…（友善交流，请勿发布广告或不当言论）' : '登录后发表评论'"
          :disabled="!userStore.token"
        />
        <div class="editor-actions">
          <el-button v-if="!userStore.token" type="primary" round @click="emit('auth')">登录后再评论</el-button>
          <el-button v-else type="primary" round :loading="posting" :disabled="!draft.trim()" @click="submit">发表评论</el-button>
        </div>
      </div>

      <!-- 评论列表（楼中楼） -->
      <div class="list" v-loading="loading">
        <div class="item" v-for="c in commentTree" :key="c.commentId">
          <div class="avatar" :style="{ background: avatarBg(c.userName) }">{{ (c.userName || '客').charAt(0).toUpperCase() }}</div>
          <div class="body">
            <div class="meta">
              <span class="name">{{ c.userName || '匿名用户' }}</span>
              <el-tag size="small" type="danger" v-if="c.userId === 1">管理员</el-tag>
              <span class="time">{{ c.createTime }}</span>
            </div>
            <div class="c-score" v-if="c.score">
              <el-rate :model-value="Number(c.score)" disabled size="small" />
            </div>
            <div class="content">{{ c.content }}</div>
            <div class="ops">
              <el-link type="primary" underline="never" @click="startReply(c)">回复</el-link>
              <el-link type="danger" underline="never" v-if="canDelete(c)" @click="remove(c)">删除</el-link>
              <el-tag size="small" type="info" v-if="c.status === '1'">已隐藏</el-tag>
            </div>

            <!-- 回复列表 -->
            <div class="replies" v-if="c.children && c.children.length">
              <div class="reply" v-for="r in c.children" :key="r.commentId">
                <div class="r-avatar" :style="{ background: avatarBg(r.userName) }">{{ (r.userName || '客').charAt(0).toUpperCase() }}</div>
                <div class="r-body">
                  <div class="r-meta">
                    <span class="name">{{ r.userName || '匿名用户' }}</span>
                    <span class="reply-to" v-if="r.replyUser && r.replyUser !== c.userName">回复 @{{ r.replyUser }}</span>
                    <span class="time">{{ r.createTime }}</span>
                  </div>
                  <div class="content">{{ r.content }}</div>
                  <div class="ops">
                    <el-link type="primary" underline="never" @click="startReply({ ...r, parentComment: c })">回复</el-link>
                    <el-link type="danger" underline="never" v-if="canDelete(r)" @click="remove(r)">删除</el-link>
                    <el-tag size="small" type="info" v-if="r.status === '1'">已隐藏</el-tag>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="empty" v-if="!loading && commentTree.length === 0">
          <span class="e-icon">💬</span>
          <p>暂无评论，快来抢沙发～</p>
        </div>
        <div class="more" v-if="hasMore">
          <el-button link type="primary" :loading="loading" @click="loadMore">加载更多评论</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getLikeStatus, likePet, unlikePet } from '@/api/pet/petLike'
import { listPetComment, addPetComment, delPetComment, commentStat } from '@/api/pet/petComment'
import { useUserStore } from '@/store/modules/user'

const props = defineProps({
  petId: { type: [String, Number], required: true },
  targetType: { type: String, default: 'pet' }
})
const emit = defineEmits(['auth'])

const userStore = useUserStore()
const PAGE_SIZE = 20

// 点赞
const liked = ref(false)
const likeCount = ref(0)
const bouncing = ref(false)

// 评论
const comments = ref([])      // 平铺原始数据
const commentTotal = ref(0)
const pageNum = ref(1)
const hasMore = ref(false)
const loading = ref(false)
const posting = ref(false)
const draft = ref('')
const replyTo = ref(null)     // { commentId, userName }
const sort = ref('new')
const draftScore = ref(0)
const scoreTexts = ['很差', '较差', '一般', '满意', '超棒']
const stat = ref({ avg: 0, commentCount: 0, d1: 0, d2: 0, d3: 0, d4: 0, d5: 0 })

function dist(n) {
  return Number(stat.value['d' + n] || 0)
}
function barPct(n) {
  const total = Number(stat.value.count || 0)
  if (!total) return 0
  return Math.round((dist(n) / total) * 100)
}

async function loadStat() {
  try {
    const res = await commentStat(props.petId, props.targetType)
    stat.value = res.data || stat.value
  } catch (e) { /* 游客/异常静默 */ }
}

// 组装楼中楼：顶级评论 + 其下回复（本地排序，最新在前）
const commentTree = computed(() => {
  const tops = comments.value.filter(c => !c.parentId || Number(c.parentId) === 0)
  const replies = comments.value.filter(c => c.parentId && Number(c.parentId) > 0)
  const byTime = (a, b) => {
    const ta = new Date(String(a.createTime || '').replace(/-/g, '/')).getTime() || 0
    const tb = new Date(String(b.createTime || '').replace(/-/g, '/')).getTime() || 0
    return sort.value === 'old' ? ta - tb : tb - ta
  }
  return tops.slice().sort(byTime).map(t => ({
    ...t,
    children: replies.filter(r => Number(r.parentId) === Number(t.commentId)).sort(byTime)
  }))
})

const AVATAR_COLORS = [
  'linear-gradient(135deg,#ffd6a5,#ffb4a2)', 'linear-gradient(135deg,#a5d8ff,#74c0fc)',
  'linear-gradient(135deg,#b2f2bb,#8ce99a)', 'linear-gradient(135deg,#ffc9c9,#ffa8a8)',
  'linear-gradient(135deg,#d0bfff,#b197fc)', 'linear-gradient(135deg,#ffe066,#ffd43b)'
]
function avatarBg(name) {
  let h = 0
  for (const ch of (name || '客')) h = (h * 31 + ch.charCodeAt(0)) % 997
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

function canDelete(c) {
  if (!userStore.token) return false
  return userStore.isAdmin || Number(userStore.userId) === Number(c.userId)
}

async function loadLike() {
  try {
    const res = await getLikeStatus(props.petId, props.targetType)
    const d = res.data || {}
    liked.value = !!d.liked
    likeCount.value = d.count || 0
  } catch (e) {
    likeCount.value = likeCount.value || 0
  }
}

async function toggleLike() {
  if (!userStore.token) {
    ElMessage.info('登录后即可点赞')
    emit('auth')
    return
  }
  try {
    const res = liked.value ? await unlikePet(props.petId, props.targetType) : await likePet(props.petId, props.targetType)
    liked.value = !!res.liked
    likeCount.value = res.count || 0
    if (liked.value) {
      bouncing.value = true
      setTimeout(() => { bouncing.value = false }, 500)
    }
    ElMessage.success(liked.value ? `点赞成功，当前 ${likeCount.value} 赞` : '已取消点赞')
  } catch (e) {
    ElMessage.error(e?.message || '操作失败')
  }
}

async function loadComments(reset = true) {
  if (reset) { pageNum.value = 1; comments.value = [] }
  loading.value = true
  try {
    const res = await listPetComment({ petId: props.petId, targetType: props.targetType, pageNum: pageNum.value, pageSize: PAGE_SIZE })
    const rows = res.rows || []
    commentTotal.value = res.total || 0
    comments.value = reset ? rows : comments.value.concat(rows)
    hasMore.value = comments.value.length < commentTotal.value
  } catch (e) {
    // 游客或异常时静默降级
  } finally {
    loading.value = false
  }
}

function loadMore() {
  pageNum.value++
  loadComments(false)
}

function startReply(c) {
  if (!userStore.token) {
    ElMessage.info('登录后即可回复')
    emit('auth')
    return
  }
  // 回复楼中楼时挂到所属顶楼，避免层级过深
  replyTo.value = { commentId: c.parentComment ? c.parentComment.commentId : c.commentId, userName: c.userName }
  draft.value = ''
  draftScore.value = 0
}

function cancelReply() {
  replyTo.value = null
}

async function submit() {
  if (!userStore.token) {
    ElMessage.info('登录后即可评论')
    emit('auth')
    return
  }
  const text = draft.value.trim()
  if (!text) { ElMessage.warning('评论内容不能为空'); return }
  posting.value = true
  try {
    await addPetComment({
      petId: props.petId,
      targetType: props.targetType,
      content: text,
      parentId: replyTo.value ? replyTo.value.commentId : 0,
      replyUser: replyTo.value ? replyTo.value.userName : null,
      score: replyTo.value ? null : (draftScore.value || null)
    })
    ElMessage.success('评论发表成功')
    draft.value = ''
    draftScore.value = 0
    replyTo.value = null
    await Promise.all([loadComments(), loadStat()])
  } catch (e) {
    ElMessage.error(e?.message || '评论失败')
  } finally {
    posting.value = false
  }
}

async function remove(c) {
  try {
    await ElMessageBox.confirm('确定删除这条评论吗？', '提示', { type: 'warning' })
  } catch (e) { return }
  try {
    await delPetComment(c.commentId)
    ElMessage.success('已删除')
    await loadComments()
  } catch (e) {
    ElMessage.error(e?.message || '删除失败')
  }
}

onMounted(() => {
  loadLike()
  loadComments()
  loadStat()
})
// 详情页切换宠物时重新加载
watch(() => props.petId, () => { loadStat(); loadLike(); loadComments() })
</script>

<style scoped lang="scss">
.pet-social { background: #fff; border-radius: 16px; padding: 28px 32px; box-shadow: 0 4px 20px rgba(0,0,0,.06); margin-top: 24px; }

.like-bar { display: flex; align-items: center; gap: 16px; padding-bottom: 20px; border-bottom: 1px solid var(--border-2); flex-wrap: wrap;
  .like-btn { display: inline-flex; align-items: center; gap: 8px; border: 1px solid #ffd6e0; background: #fff5f7; color: #e91e63;
    border-radius: 24px; padding: 10px 22px; font-size: 15px; cursor: pointer; transition: all .2s;
    &:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(233,30,99,.18); }
    &.liked { background: linear-gradient(135deg, #ff8fab, #e91e63); color: #fff; border-color: transparent; }
    &.bounce .icon { animation: heartbeat .5s ease; }
    .num { font-weight: 700; }
  }
  .like-users .tip { color: var(--text-3); font-size: 13px; }
  .hint { color: var(--text-3); font-size: 13px; display: flex; gap: 4px; align-items: center; }
}
@keyframes heartbeat {
  0% { transform: scale(1); } 30% { transform: scale(1.35); }
  60% { transform: scale(.9); } 100% { transform: scale(1); }
}

.rating-summary {
  display: flex;
  align-items: center;
  gap: 28px;
  padding: 18px 0 4px;
  flex-wrap: wrap;
  .rs-score { display: flex; align-items: center; gap: 14px;
    .big { font-size: 44px; font-weight: 700; color: var(--brand-500); line-height: 1; }
    .rs-right { display: flex; flex-direction: column; gap: 4px; }
    .rs-count { font-size: 12.5px; color: var(--text-3); }
  }
  .rs-bars { flex: 1; min-width: 240px; display: flex; flex-direction: column; gap: 5px;
    .bar-row { display: flex; align-items: center; gap: 8px;
      .bar-label { width: 34px; font-size: 12px; color: var(--text-3); }
      .bar-track { flex: 1; height: 7px; border-radius: 4px; background: #f2f3f5; overflow: hidden; }
      .bar-fill { height: 100%; border-radius: 4px; background: linear-gradient(90deg, var(--brand-300), var(--brand-500)); transition: width .3s; }
      .bar-num { width: 26px; text-align: right; font-size: 12px; color: var(--text-3); }
    }
  }
}
.score-pick { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 10px;
  .sp-label { font-size: 13px; color: var(--text-2); }
  .sp-tip { font-size: 12px; color: var(--text-4); }
}
.c-score { margin: 2px 0 4px; }

.comment-area {
  .area-head { display: flex; align-items: center; justify-content: space-between; margin: 20px 0 14px; flex-wrap: wrap; gap: 10px;
    h3 { font-size: 17px; color: var(--text-1); margin: 0;
      .cnt { color: var(--text-3); font-weight: 400; font-size: 14px; }
    }
  }

  .editor { margin-bottom: 22px;
    .reply-tip { display: flex; gap: 10px; align-items: center; background: var(--bg-page); border-radius: 8px; padding: 6px 12px; margin-bottom: 8px; font-size: 13px; color: var(--text-2); }
    .editor-actions { display: flex; justify-content: flex-end; margin-top: 10px; }
  }

  .list { min-height: 80px;
    .item { display: flex; gap: 12px; padding: 14px 0; border-bottom: 1px dashed var(--border-2);
      &:last-of-type { border-bottom: none; }
      .avatar { flex: 0 0 40px; width: 40px; height: 40px; border-radius: 50%;
        color: #fff; font-weight: 700; display: flex; align-items: center; justify-content: center; font-size: 16px; }
      .body { flex: 1; min-width: 0;
        .meta { display: flex; gap: 10px; align-items: baseline; flex-wrap: wrap;
          .name { color: var(--text-1); font-weight: 600; font-size: 14px; }
          .time { color: var(--text-4); font-size: 12px; }
        }
        .content { color: var(--text-2); line-height: 1.7; margin: 4px 0 6px; word-break: break-all; white-space: pre-wrap; }
        .ops { display: flex; gap: 14px; align-items: center;
          .el-link { font-size: 12px; }
        }

        .replies { margin-top: 10px; background: var(--bg-page); border-radius: 10px; padding: 10px 14px;
          .reply { display: flex; gap: 10px; padding: 8px 0; border-bottom: 1px dashed #ebebeb;
            &:last-child { border-bottom: none; }
            .r-avatar { flex: 0 0 28px; width: 28px; height: 28px; border-radius: 50%; color: #fff; font-weight: 700;
              display: flex; align-items: center; justify-content: center; font-size: 13px; }
            .r-body { flex: 1; min-width: 0;
              .r-meta { display: flex; gap: 8px; align-items: baseline; flex-wrap: wrap;
                .name { color: var(--text-1); font-weight: 600; font-size: 13px; }
                .reply-to { color: var(--brand-500); font-size: 12px; }
                .time { color: var(--text-4); font-size: 12px; }
              }
              .content { font-size: 13px; }
              .ops { gap: 12px; }
            }
          }
        }
      }
    }
    .empty { text-align: center; color: var(--text-4); padding: 28px 0;
      .e-icon { font-size: 40px; display: block; margin-bottom: 8px; }
      p { margin: 0; }
    }
    .more { text-align: center; padding-top: 10px; }
  }
}
</style>
