<template>
  <section class="orders-sec">
    <header class="sec-head" v-if="!fixedFilter">
      <h2>历史订单</h2>
      <span class="sec-n" v-if="groups.length"><b>{{ groups.length }}</b> 单</span>
    </header>

    <!-- 状态标签栏：独立使用时显示；被购物车页顶部标签固定筛选时隐藏 -->
    <nav class="tabs" v-if="!fixedFilter && groups.length" aria-label="历史订单筛选">
      <button
        v-for="t in tabs"
        :key="t.key"
        type="button"
        class="tab"
        :class="{ on: filter === t.key }"
        @click="filter = t.key"
      >
        {{ t.label }}<span class="tab__n">{{ t.count }}</span>
      </button>
    </nav>

    <!-- 空态 -->
    <div class="ui-empty" v-if="shownGroups.length === 0">
      <p class="ui-empty__title">{{ emptyTitle }}</p>
      <p class="ui-empty__desc">付款完成的订单会自动归档到这里。</p>
    </div>

    <!-- 订单列表：定高区（每页 3 单）底部翻页 -->
    <div class="ui-box order-box" v-else v-loading="loading">
      <div class="ui-box__body">
        <article class="order" v-for="g in pagedGroups" :key="g.orderNo" :class="{ 'is-muted': g.canceled }">
          <!-- 订单头：单号 + 状态在左，时间与操作在右 -->
          <header class="order__head">
            <div class="order__id">
              <span class="order__no">{{ g.orderNo }}</span>
              <span class="ui-chip" :class="chipClass(g)">{{ statusText(g) }}</span>
            </div>
            <div class="order__act">
              <span class="order__time">{{ g.createTime }}</span>
              <button type="button" class="ui-linkbtn" @click="askAssistant(g)">遇到问题</button>
              <button
                v-if="canRefund(g)"
                type="button"
                class="ui-linkbtn"
                :disabled="refundingNo === g.orderNo"
                @click="askRefund(g)"
              >{{ refundingNo === g.orderNo ? '提交中…' : '申请退款' }}</button>
            </div>
          </header>

          <!-- 商品明细：缩进在订单之下，逐行 1px 分割 -->
          <ul class="items">
            <li class="item" v-for="o in g.items" :key="o.itemId">
              <img v-if="o.goodsImage" :src="o.goodsImage" class="item__thumb" alt="" loading="lazy" @error="onImgErr" />
              <div class="item__main">
                <div class="item__name">
                  {{ o.goodsName }}
                  <span v-if="o.itemType === '2'" class="ui-chip ui-chip--brand">宠物</span>
                </div>
                <div class="item__spec">
                  {{ o.goodsSpec }}<span class="item__unit"> · ¥{{ money(o.price) }} ×{{ o.qty }}</span>
                </div>
              </div>
              <span class="item__sum ui-price ui-price--sm">¥{{ money(o.amount != null ? o.amount : o.price * o.qty) }}</span>
            </li>
          </ul>

          <footer class="order__foot" v-if="g.items.length > 1">
            <span class="order__count">共 {{ g.items.length }} 件</span>
            <span class="order__total">合计 <b class="ui-price">¥{{ money(g.total) }}</b></span>
          </footer>
        </article>
      </div>

      <!-- 翻页条：位置固定，翻页时页脚不动 -->
      <div class="ui-box__foot">
        <span class="ui-box__count">第 {{ rangeStart }}–{{ rangeEnd }} 单 / 共 {{ shownGroups.length }} 单</span>
        <Pagination
          v-if="shownGroups.length > PAGE_SIZE"
          :total="shownGroups.length"
          v-model:page="page"
          :limit="PAGE_SIZE"
          :page-sizes="[PAGE_SIZE]"
          :background="false"
          layout="prev, pager, next"
          :auto-scroll="false"
        />
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, inject, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { applyRefund } from '@/api/pet/petRefund'
import Pagination from '@/components/Pagination/index.vue'
import { money } from '@/utils/money'

// 归档区只接收父组件算好的「已支付/已取消」订单；待付款订单在「待支付」标签
const props = defineProps({
  groups: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  // 非空时由父级顶部标签固定筛选（'paid' / 'canceled'），隐藏自带标签栏
  fixedFilter: { type: String, default: '' }
})
const emit = defineEmits(['refresh'])

const openAuth = inject('openAuth', () => {})
const refundingNo = ref(null)

// 状态标签栏：计数从 groups 派生，不再多请求一次
const filter = ref(props.fixedFilter || 'all')
watch(() => props.fixedFilter, (v) => { if (v) filter.value = v })
const tabs = computed(() => [
  { key: 'all', label: '全部', count: props.groups.length },
  { key: 'paid', label: '已支付', count: props.groups.filter((g) => g.paid && !g.canceled).length },
  { key: 'canceled', label: '已取消', count: props.groups.filter((g) => g.canceled).length }
])
const shownGroups = computed(() => {
  if (filter.value === 'paid') return props.groups.filter((g) => g.paid && !g.canceled)
  if (filter.value === 'canceled') return props.groups.filter((g) => g.canceled)
  return props.groups
})
const emptyTitle = computed(() => {
  if (filter.value === 'canceled') return '还没有已取消的订单'
  if (filter.value === 'paid') return '还没有已支付的订单'
  return '还没有历史订单'
})

// 状态文案 / 样式：用 1px 描边标签代替实心 el-tag
function statusText(g) {
  if (g.refund && g.refund.status === '1') return '已退款'
  if (g.refund && g.refund.status === '0') return '退款审核中'
  if (g.canceled) return '已取消'
  if (g.shipped) return g.isPet ? '已支付 · 待接宠' : '已支付 · 待发货'
  return '已完成'
}
function chipClass(g) {
  if (g.refund && g.refund.status === '0') return 'ui-chip--warn'
  if (g.canceled || (g.refund && g.refund.status === '1')) return ''
  if (g.shipped) return 'ui-chip--brand'
  return 'ui-chip--ok'
}

// 定高列表分页：每页 3 单
const PAGE_SIZE = 3
const page = ref(1)
const pagedGroups = computed(() => shownGroups.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE))
const rangeStart = computed(() => (shownGroups.value.length ? (page.value - 1) * PAGE_SIZE + 1 : 0))
const rangeEnd = computed(() => Math.min(page.value * PAGE_SIZE, shownGroups.value.length))
watch(() => [props.groups.length, filter.value], () => {
  // 总数变少时避免停在空页
  if ((page.value - 1) * PAGE_SIZE >= shownGroups.value.length) page.value = 1
})

/** 带着订单号唤起助手，直接问当前状态 */
function askAssistant(g) {
  window.dispatchEvent(new CustomEvent('pet-assistant-open', {
    detail: {
      scene: 'order',
      bizId: g.orderNo,
      message: `订单 ${g.orderNo} 现在是什么状态？`
    }
  }))
}

/** 已支付、未取消，且没有进行中/已完成的退款，才允许申请 */
function canRefund(g) {
  if (!g.paid || g.canceled) return false
  if (g.refund && ['0', '1'].includes(g.refund.status)) return false
  return true
}

function askRefund(g) {
  ElMessageBox.prompt(
    `订单 ${g.orderNo}，退款金额 ¥${money(g.total)}。请填写退款原因：`,
    '申请退款',
    {
      confirmButtonText: '提交申请',
      cancelButtonText: '再想想',
      inputPlaceholder: '如：接宠时间冲突 / 临时有事（选填）',
      inputValue: '',
      type: 'warning'
    }
  ).then(async ({ value }) => {
    refundingNo.value = g.orderNo
    try {
      await applyRefund({ orderNo: g.orderNo, reason: value || '用户申请退款' })
      ElMessage.success('退款申请已提交，等待门店审核')
      emit('refresh')
    } catch (e) {
      ElMessage.error(e?.msg || e?.message || '申请失败')
    } finally {
      refundingNo.value = null
    }
  }).catch(() => {})
}

function onImgErr(e) {
  e.target.style.display = 'none'
}
</script>

<style scoped lang="scss">
// 原「我的订单」区块样式迁移；去掉收银台，加状态标签栏，只服务已支付/已取消归档。

/* ---------- 区块头 ---------- */
.sec-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-top: 40px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--text-1);
  h2 { font-size: 15px; font-weight: 700; color: var(--text-1); }
  .sec-n { font-size: 12.5px; color: var(--text-3); font-variant-numeric: tabular-nums;
    b { font-weight: 700; color: var(--text-1); } }
}

/* ---------- 状态标签栏：文本标签 + 计数，选中态 2px 下划线 ---------- */
.tabs {
  display: flex;
  gap: 26px;
  margin-top: 16px;
  border-bottom: 1px solid var(--border-1);
  overflow-x: auto;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
}
.tab {
  position: relative;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 0 12px;
  border: 0;
  background: none;
  font: inherit;
  font-size: 14px;
  color: var(--text-3);
  cursor: pointer;
  transition: color .16s ease;
  &:hover { color: var(--text-1); }
  &.on {
    color: var(--text-1);
    font-weight: 700;
    &::after {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      bottom: -1px;
      height: 2px;
      background: var(--text-1);
    }
  }
}
.tab__n {
  font-size: 12px;
  color: var(--text-4);
  font-variant-numeric: tabular-nums;
}
.tab.on .tab__n { color: var(--brand-600); }

/* ---------- 订单区块 ---------- */
.orders-sec .order-box { margin-top: 0; }
.order {
  padding: 22px 0;
  border-bottom: 1px solid var(--border-2);
}
// 已取消：整体降权，但不改变布局
.order.is-muted {
  .order__no { color: var(--text-3); }
  .item__thumb { filter: grayscale(1); opacity: .8; }
}

.order__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px 20px;
  flex-wrap: wrap;
}
.order__id {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.order__no {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: .01em;
  color: var(--text-1);
  font-variant-numeric: tabular-nums;
}
.order__act {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.order__time {
  font-size: 12.5px;
  color: var(--text-3);
  font-variant-numeric: tabular-nums;
}

/* ---------- 商品明细：挂在订单下的子行 ---------- */
.items {
  list-style: none;
  margin: 14px 0 0;
  padding: 0;
}
.item {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  padding: 12px 0;
  & + .item { border-top: 1px solid var(--border-2); }
}
.item__thumb {
  width: 56px;
  height: 56px;
  object-fit: cover;
  border: var(--rule);
  border-radius: var(--r-2);
  background: var(--bg-sunken);
}
.item__main { min-width: 0; }
.item__name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-1);
  line-height: 1.45;
}
.item__spec {
  margin-top: 4px;
  font-size: 12.5px;
  color: var(--text-3);
}
.item__unit { color: var(--text-3); font-variant-numeric: tabular-nums; }
.item__sum { text-align: right; }

/* ---------- 订单合计 ---------- */
.order__foot {
  display: flex;
  align-items: baseline;
  justify-content: flex-end;
  gap: 18px;
  margin-top: 8px;
  padding-top: 12px;
  border-top: 1px solid var(--border-2);
  font-size: 13px;
  color: var(--text-3);
}
.order__total {
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  b { font-size: 20px; }
}

/* ---------- 手机端 ---------- */
@media (max-width: 768px) {
  .tabs { gap: 18px; }
  .order { padding: 18px 0; }
  .order__act {
    width: 100%;
    gap: 14px;
    .order__time { margin-right: auto; }
  }

  .item {
    grid-template-columns: 48px minmax(0, 1fr) auto;
    gap: 12px;
    padding: 10px 0;
  }
  .item__thumb { width: 48px; height: 48px; }
  .item__sum { font-size: 16px; }

  .order__foot { gap: 12px; }
}
</style>
