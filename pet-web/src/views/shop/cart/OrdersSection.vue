<template>
  <section class="orders-sec">
    <!-- 空态 -->
    <div class="ui-empty" v-if="shownGroups.length === 0">
      <p class="ui-empty__title">{{ emptyTitle }}</p>
      <p class="ui-empty__desc">{{ emptyDesc }}</p>
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
import { ref, computed, inject } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { applyRefund } from '@/api/pet/petRefund'
import Pagination from '@/components/Pagination/index.vue'
import { useClientPaging } from '@/composables/usePagedList'
import { money } from '@/utils/money'

// 已支付订单归档列表：父组件已按「已支付且未取消」筛好传入；
// 待支付订单不再展示（立即购买靠 ?pay=orderNo 直接唤起收银台，不经此列表）。
const props = defineProps({
  groups: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false }
})
const emit = defineEmits(['refresh'])

const openAuth = inject('openAuth', () => {})
const refundingNo = ref(null)

const shownGroups = computed(() => props.groups)
const emptyTitle = computed(() => '还没有已支付的订单')
const emptyDesc = computed(() => '付款完成的订单会自动归档到这里。')

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
const { page, paged: pagedGroups, rangeStart, rangeEnd } = useClientPaging(shownGroups, PAGE_SIZE)

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
// 只服务订单卡列表（待支付 / 已支付），筛选归父组件。

/* ---------- 订单区块：撑满定高面板，翻页条压到面板最底 ---------- */
// 与「购物车」标签同一套路：面板是 flex 列，列表区随内容自然生长、装不下才收缩内滚，
// 翻页条靠 margin-top:auto 吸到面板底部，不再悬在页面中间
.orders-sec {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}
.orders-sec .order-box {
  margin-top: 0;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}
// 桌面端一页 3 单放得下，不会出现内部滚动条；只有短视口/手机端才收缩出滚动
.orders-sec .order-box .ui-box__body {
  flex: 0 1 auto;
  min-height: 0;
  overflow-y: auto;
}
// 计数 + 翻页：吸到面板最底（对应购物车标签的结算条位置）
.orders-sec .order-box .ui-box__foot {
  margin-top: auto;
  flex-shrink: 0;
}
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
  font-size: var(--fs-5);
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
  font-size: var(--fs-3);
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
  font-size: var(--fs-5);
  font-weight: 700;
  color: var(--text-1);
  line-height: 1.45;
}
.item__spec {
  margin-top: 4px;
  font-size: var(--fs-3);
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
  font-size: var(--fs-4);
  color: var(--text-3);
}
.order__total {
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  b { font-size: var(--fs-8); }
}

/* ---------- 手机端 ---------- */
@media (max-width: 768px) {
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
  .item__sum { font-size: var(--fs-6); }

  .order__foot { gap: 12px; }
}
</style>
