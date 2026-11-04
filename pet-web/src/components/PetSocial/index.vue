<template>
  <div class="pet-social">
    <!-- 点赞区 -->
    <div class="like-bar">
      <button class="like-btn" :class="{ liked: liked, bounce: bouncing }" @click="toggleLike">
        <span class="icon"><el-icon><StarFilled v-if="liked" /><Star v-else /></el-icon></span>
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
      <div class="rs-bars" v-if="visibleRatings.length">
        <div class="bar-row" v-for="n in visibleRatings" :key="n">
          <span class="bar-label">{{ n }} 星</span>
          <div class="bar-track">
            <div class="bar-fill" :style="{ width: barPct(n) + '%' }"></div>
          </div>
          <span class="bar-num">{{ dist(n) }}</span>
        </div>
      </div>
      <div class="rs-empty" v-else-if="!Number(stat.commentCount)">还没有评价，来发表第一条吧</div>
      <div class="rs-empty" v-else>评价未打星，暂无评分分布</div>
    </div>

    <!-- 评论区（B 站样式） -->
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

      <!-- 发表框：头像 + 圆角输入框 -->
      <div class="editor">
        <div class="editor__ava" :style="{ background: avatarBg(userStore.userName) }">{{ initial(userStore.userName) }}</div>
        <div class="editor__main">
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
            :autosize="{ minRows: 4, maxRows: 10 }"
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
      </div>

      <!-- 评论列表 -->
      <div class="list" v-loading="loading">
        <div class="cmt" v-for="c in commentTree" :key="c.commentId">
          <img v-if="c.avatar && !c._avaErr" class="cmt__ava" :src="avatarUrl(c.avatar)" @error="c._avaErr = true" alt="" />
          <div v-else class="cmt__ava cmt__ava--ph" :style="{ background: avatarBg(c.userName) }">{{ initial(c.userName) }}</div>

          <div class="cmt__main">
            <div class="cmt__head">
              <span class="cmt__name" :style="{ color: nameColor(c.userName) }">{{ c.userName || '匿名用户' }}</span>
              <span v-if="c.userId === 1" class="cmt__badge cmt__badge--admin">管理员</span>
              <span v-else class="cmt__badge" :class="'cmt__badge--lv' + lvOf(c.userId)">LV{{ lvOf(c.userId) }}</span>
              <el-rate v-if="c.score" :model-value="Number(c.score)" disabled size="small" class="cmt__stars" />
            </div>
            <div class="cmt__content">{{ c.content }}</div>
            <div class="cmt__foot">
              <span class="cmt__time">{{ fmtTime(c.createTime) }}</span>
              <button class="cmt__op" :class="{ on: likedSet.has(c.commentId) }" @click="toggleCommentLike(c)" :title="userStore.token ? '点赞' : '登录后点赞'">
                <svg class="thumb" viewBox="0 0 24 24" width="15" height="15"><path :d="THUMB_PATH" /></svg>
                <span v-if="c.likeCount > 0">{{ c.likeCount }}</span>
              </button>
              <button class="cmt__op" @click="startReply(c)">回复</button>
              <button class="cmt__op cmt__op--danger" v-if="canDelete(c)" @click="remove(c)">删除</button>
              <el-tag size="small" type="info" v-if="c.status === '1'">已隐藏</el-tag>
            </div>

            <!-- 楼中楼 -->
            <div class="cmt__replies" v-if="c.children && c.children.length">
              <div class="rcmt" v-for="r in visibleReplies(c)" :key="r.commentId">
                <img v-if="r.avatar && !r._avaErr" class="rcmt__ava" :src="avatarUrl(r.avatar)" @error="r._avaErr = true" alt="" />
                <div v-else class="rcmt__ava rcmt__ava--ph" :style="{ background: avatarBg(r.userName) }">{{ initial(r.userName) }}</div>
                <div class="rcmt__main">
                  <div class="cmt__head cmt__head--s">
                    <span class="cmt__name" :style="{ color: nameColor(r.userName) }">{{ r.userName || '匿名用户' }}</span>
                    <span v-if="r.userId === 1" class="cmt__badge cmt__badge--admin">管理员</span>
                    <span v-else class="cmt__badge" :class="'cmt__badge--lv' + lvOf(r.userId)">LV{{ lvOf(r.userId) }}</span>
                  </div>
                  <div class="cmt__content cmt__content--s">
                    <span v-if="r.replyUser && r.replyUser !== c.userName" class="rcmt__at">回复 @{{ r.replyUser }}：</span>{{ r.content }}
                  </div>
                  <div class="cmt__foot">
                    <span class="cmt__time">{{ fmtTime(r.createTime) }}</span>
                    <button class="cmt__op" :class="{ on: likedSet.has(r.commentId) }" @click="toggleCommentLike(r)">
                      <svg class="thumb" viewBox="0 0 24 24" width="14" height="14"><path :d="THUMB_PATH" /></svg>
                      <span v-if="r.likeCount > 0">{{ r.likeCount }}</span>
                    </button>
                    <button class="cmt__op" @click="startReply({ ...r, parentComment: c })">回复</button>
                    <button class="cmt__op cmt__op--danger" v-if="canDelete(r)" @click="remove(r)">删除</button>
                    <el-tag size="small" type="info" v-if="r.status === '1'">已隐藏</el-tag>
                  </div>
                </div>
              </div>
              <button class="cmt__expand" v-if="c.children.length > REPLY_PREVIEW" @click="toggleExpand(c)">
                {{ expandedSet.has(c.commentId) ? '收起回复' : `共 ${c.children.length} 条回复，点击查看` }}
                <i :class="expandedSet.has(c.commentId) ? 'up' : 'down'"></i>
              </button>
            </div>
          </div>
        </div>

        <div class="empty" v-if="!loading && commentTree.length === 0">
          <span class="e-icon"><el-icon><ChatDotRound /></el-icon></span>
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
import { listPetComment, addPetComment, delPetComment, commentStat, likeComment, listLikedCommentIds } from '@/api/pet/petComment'
import { useUserStore } from '@/store/modules/user'

const props = defineProps({
  petId: { type: [String, Number], required: true },
  targetType: { type: String, default: 'pet' }
})
const emit = defineEmits(['auth'])

const userStore = useUserStore()
const PAGE_SIZE = 20
const REPLY_PREVIEW = 2   // 楼中楼默认展示条数，超出折叠为「共 N 条回复」
const THUMB_PATH = 'M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z'

// 点赞（目标级）
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

// 评论点赞（按条）：已赞集合 + 楼中楼展开集合
const likedSet = ref(new Set())
const expandedSet = ref(new Set())

function dist(n) {
  return Number(stat.value['d' + n] || 0)
}
function barPct(n) {
  const total = Number(stat.value.commentCount || 0)
  if (!total) return 0
  return Math.round((dist(n) / total) * 100)
}
// 只列有评分的档位：1 条评价时不再摆 4 行 0 值长条（看着像渲染失败）
const visibleRatings = computed(() => [5, 4, 3, 2, 1].filter((n) => dist(n) > 0))

async function loadStat() {
  try {
    const res = await commentStat(props.petId, props.targetType)
    stat.value = res.data || stat.value
  } catch (e) { /* 游客/异常静默 */ }
}

async function loadLikedIds() {
  if (!userStore.token) { likedSet.value = new Set(); return }
  try {
    const res = await listLikedCommentIds(props.petId, props.targetType)
    likedSet.value = new Set((res.data || []).map(Number))
  } catch (e) { /* 静默 */ }
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

function visibleReplies(c) {
  return expandedSet.value.has(c.commentId) ? c.children : c.children.slice(0, REPLY_PREVIEW)
}
function toggleExpand(c) {
  const s = new Set(expandedSet.value)
  s.has(c.commentId) ? s.delete(c.commentId) : s.add(c.commentId)
  expandedSet.value = s
}

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
function hashOf(name) {
  let h = 0
  for (const ch of String(name || '')) h = (h * 131 + ch.charCodeAt(0)) % 99991
  return h
}
function initial(name) {
  return (name || '客').charAt(0).toUpperCase()
}

// B 站风：昵称按名字稳定取色（粉/蓝等），等级徽章按 userId 稳定分级（演示用装饰）
const NAME_COLORS = ['#fb7299', '#00a1d6', '#ff7f24', '#6bc46d', '#c08bff']
function nameColor(name) {
  return NAME_COLORS[hashOf(name) % NAME_COLORS.length]
}
function lvOf(userId) {
  const n = Number(userId)
  if (!n || n <= 0) return 2
  return 2 + (n % 5)
}

const AVA_BASE = import.meta.env.VITE_APP_BASE_API || ''
function avatarUrl(avatar) {
  const a = String(avatar || '')
  return /^https?:/.test(a) ? a : AVA_BASE + a
}

// 相对时间：刚刚 / N分钟前 / N小时前 / N天前 / 日期
function fmtTime(t) {
  if (!t) return ''
  const d = new Date(String(t).replace(/-/g, '/'))
  if (isNaN(d.getTime())) return String(t)
  const diff = Date.now() - d.getTime()
  const m = 60 * 1000, h = 60 * m, day = 24 * h
  if (diff < m) return '刚刚'
  if (diff < h) return Math.floor(diff / m) + '分钟前'
  if (diff < day) return Math.floor(diff / h) + '小时前'
  if (diff < 30 * day) return Math.floor(diff / day) + '天前'
  const p = (x) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
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

// 评论按条点赞
async function toggleCommentLike(c) {
  if (!userStore.token) {
    ElMessage.info('登录后即可点赞')
    emit('auth')
    return
  }
  try {
    const res = await likeComment(c.commentId)
    const d = res.data || {}
    c.likeCount = d.count || 0
    const s = new Set(likedSet.value)
    d.liked ? s.add(Number(c.commentId)) : s.delete(Number(c.commentId))
    likedSet.value = s
  } catch (e) {
    ElMessage.error(e?.message || '点赞失败')
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
  document.querySelector('.editor__main textarea')?.focus()
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
    // 删除同样影响均分与评价数，与发表后的刷新保持一致
    await Promise.all([loadComments(), loadStat()])
  } catch (e) {
    ElMessage.error(e?.message || '删除失败')
  }
}

onMounted(() => {
  loadLike()
  loadComments()
  loadStat()
  loadLikedIds()
})
// 详情页切换宠物时重新加载
watch(() => props.petId, () => { loadStat(); loadLike(); loadComments(); loadLikedIds() })
watch(() => userStore.token, () => { loadLikedIds() })
</script>

<style scoped lang="scss">
.pet-social { margin-top: 32px; padding: 26px 0 8px; border-top: 1px solid var(--border-1); }

.like-bar { display: flex; align-items: center; gap: 16px; padding-bottom: 20px; border-bottom: 1px solid var(--border-2); flex-wrap: wrap;
  .like-btn { display: inline-flex; align-items: center; gap: 8px; border: 1px solid var(--border-1); background: var(--bg-card); color: var(--price);
    border-radius: var(--radius-md); padding: 10px 22px; font-size: var(--fs-6); cursor: pointer; transition: all .2s;
    &:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgb(var(--price-rgb) / .18); }
    &.liked { background: var(--price); color: var(--on-accent); border-color: transparent; }
    &.bounce .icon { animation: heartbeat .5s ease; }
    .num { font-weight: 700; }
  }
  .like-users .tip { color: var(--text-3); font-size: var(--fs-4); }
  .hint { color: var(--text-3); font-size: var(--fs-4); display: flex; gap: 4px; align-items: center; }
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
    .big { font-size: var(--fs-11); font-weight: 700; color: var(--brand-500); line-height: 1; }
    .rs-right { display: flex; flex-direction: column; gap: 4px; }
    .rs-count { font-size: var(--fs-3); color: var(--text-3); }
  }
  .rs-empty { display: flex; align-items: center; min-height: 60px; font-size: var(--fs-4); color: var(--text-3); }
  .rs-bars { flex: 1; min-width: 240px; display: flex; flex-direction: column; gap: 5px;
    .bar-row { display: flex; align-items: center; gap: 8px;
      .bar-label { width: 34px; font-size: var(--fs-2); color: var(--text-3); }
      .bar-track { flex: 1; height: 7px; border-radius: var(--radius-xs); background: #f2f3f5; overflow: hidden; }
      .bar-fill { height: 100%; border-radius: var(--radius-xs); background: linear-gradient(90deg, var(--brand-300), var(--brand-500)); transition: width .3s; }
      .bar-num { width: 26px; text-align: right; font-size: var(--fs-2); color: var(--text-3); }
    }
  }
}

/* ---------- 评论区（B 站样式） ---------- */
.comment-area {
  .area-head { display: flex; align-items: center; justify-content: space-between; margin: 20px 0 14px; flex-wrap: wrap; gap: 10px;
    h3 { font-size: var(--fs-7); color: var(--text-1); margin: 0;
      .cnt { color: var(--text-3); font-weight: 400; font-size: var(--fs-5); }
    }
  }

  /* 发表框：头像 + 圆角输入 */
  .editor { display: flex; gap: 12px; margin-bottom: 8px;
    .editor__ava { flex: 0 0 40px; width: 40px; height: 40px; border-radius: 50%; color: #fff; font-weight: 700;
      display: flex; align-items: center; justify-content: center; font-size: 16px; }
    .editor__main { flex: 1; min-width: 0;
      .reply-tip { display: flex; gap: 10px; align-items: center; background: var(--bg-page); border-radius: var(--radius-md); padding: 6px 12px; margin-bottom: 8px; font-size: var(--fs-4); color: var(--text-2); }
      .score-pick { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 8px;
        .sp-label { font-size: var(--fs-4); color: var(--text-2); }
        .sp-tip { font-size: var(--fs-2); color: var(--text-3); }
      }
      .editor-actions { display: flex; justify-content: flex-end; margin-top: 10px; }
    }
  }

  .list { min-height: 80px; margin-top: 12px;
    .cmt { display: flex; gap: 12px; padding: 16px 0; border-bottom: 1px solid var(--border-2);
      &:last-of-type { border-bottom: none; }
      &:hover { .cmt__op { opacity: 1; } }

      .cmt__ava { flex: 0 0 42px; width: 42px; height: 42px; border-radius: 50%; object-fit: cover;
        &--ph { color: #fff; font-weight: 700; display: flex; align-items: center; justify-content: center; font-size: 17px; } }

      .cmt__main { flex: 1; min-width: 0; }

      .cmt__head { display: flex; gap: 8px; align-items: center; flex-wrap: wrap;
        .cmt__name { font-weight: 600; font-size: 13.5px; }
        .cmt__badge { font-size: 10.5px; font-weight: 700; line-height: 1; padding: 3px 5px; border-radius: 4px; color: #fff; letter-spacing: .3px; }
        .cmt__badge--admin { background: linear-gradient(135deg, #ff5c7c, #fb7299); }
        .cmt__badge--lv2 { background: #98c6a2; }
        .cmt__badge--lv3 { background: #58b3c9; }
        .cmt__badge--lv4 { background: #f0a450; }
        .cmt__badge--lv5 { background: linear-gradient(135deg, #ff6b6b, #fb7299); }
        .cmt__badge--lv6 { background: linear-gradient(135deg, #ff2e63, #ff6b6b); }
        .cmt__stars { margin-left: 2px; }
      }

      .cmt__content { color: var(--text-1); font-size: 14.5px; line-height: 1.7; margin: 5px 0 6px; word-break: break-all; white-space: pre-wrap; }

      .cmt__foot { display: flex; gap: 16px; align-items: center; flex-wrap: wrap;
        .cmt__time { color: #9499a0; font-size: 12px; }
        .cmt__op { display: inline-flex; align-items: center; gap: 4px; border: 0; background: none; padding: 2px 0;
          cursor: pointer; font-family: inherit; font-size: 12.5px; color: #9499a0; opacity: .85; transition: color .16s, opacity .16s;
          &:hover { color: var(--brand-500); opacity: 1; }
          &.on { color: var(--brand-500); opacity: 1; font-weight: 600; }
          &.cmt__op--danger:hover { color: #f56c6c; }
          .thumb { fill: currentColor; }
        }
      }

      /* 楼中楼 */
      .cmt__replies { margin-top: 10px; background: var(--bg-page); border-radius: 10px; padding: 12px 14px 10px;
        .rcmt { display: flex; gap: 10px; padding: 8px 0;
          .rcmt__ava { flex: 0 0 26px; width: 26px; height: 26px; border-radius: 50%; object-fit: cover;
            &--ph { color: #fff; font-weight: 700; display: flex; align-items: center; justify-content: center; font-size: 12px; } }
          .rcmt__main { flex: 1; min-width: 0;
            .cmt__head--s { gap: 6px;
              .cmt__name { font-size: 12.5px; }
            }
            .cmt__content--s { font-size: 13.5px; margin: 3px 0 4px;
              .rcmt__at { color: #00a1d6; }
            }
            .cmt__foot { gap: 12px; }
          }
        }
        .cmt__expand { display: inline-flex; align-items: center; gap: 4px; border: 0; background: none; padding: 4px 0 2px;
          cursor: pointer; font-family: inherit; font-size: 12.5px; font-weight: 600; color: var(--brand-500);
          &:hover { color: var(--brand-700); }
          i { width: 0; height: 0; border-left: 4px solid transparent; border-right: 4px solid transparent; transition: transform .16s;
            &.down { border-top: 5px solid currentColor; }
            &.up { border-bottom: 5px solid currentColor; } }
        }
      }
    }
    .empty { text-align: center; color: var(--text-3); padding: 28px 0;
      .e-icon { font-size: 40px; display: block; margin-bottom: 8px; }
      p { margin: 0; }
    }
    .more { text-align: center; padding-top: 10px; }
  }
}

/* 窄视口：操作行不挤破 */
@media (max-width: 640px) {
  .comment-area .editor { gap: 8px;
    .editor__ava { flex-basis: 34px; width: 34px; height: 34px; font-size: 14px; }
  }
  .list .cmt { gap: 10px;
    .cmt__ava { flex-basis: 36px; width: 36px; height: 36px; }
    .cmt__foot { gap: 12px; }
  }
}
</style>
