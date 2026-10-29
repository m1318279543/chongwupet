<template>
  <div class="kb" :class="'kb--' + block.type" @click="go">
    <!-- 宠物 / 商品：图 + 文 -->
    <template v-if="block.type === 'pet' || block.type === 'goods'">
      <div class="kb-thumb">
        <img v-if="data.image" :src="data.image" :alt="data.petName || data.goodsName" loading="lazy" />
        <span v-else class="kb-noimg">{{ block.type === 'pet' ? '宠物' : '商品' }}</span>
      </div>
      <div class="kb-body">
        <div class="kb-title">
          {{ data.petName || data.goodsName }}
          <em v-if="block.type === 'pet' && data.score" class="kb-score">{{ data.score }}%</em>
        </div>
        <div class="kb-sub">
          <template v-if="block.type === 'pet'">
            {{ data.breed || '品种待补' }}<i v-if="data.age"> · {{ data.age }}</i>
          </template>
          <template v-else>
            {{ data.spec || '规格待补' }}<i v-if="data.stage"> · {{ data.stage }}</i>
          </template>
        </div>
        <div class="kb-meta">
          <span class="kb-price">¥{{ data.price }}</span>
          <span v-if="block.type === 'pet' && data.monthlyCost" class="kb-extra">月均 ¥{{ data.monthlyCost }}</span>
          <span v-else-if="block.type === 'goods'" class="kb-extra">{{ data.stock > 0 ? '有货' : '缺货' }}</span>
        </div>
      </div>
      <span class="kb-arrow">›</span>
    </template>

    <!-- 我的宠物：图 + 名字 + 疫苗提醒 -->
    <template v-else-if="block.type === 'mypet'">
      <div class="kb-thumb">
        <img v-if="data.image" :src="data.image" :alt="data.petName" loading="lazy" />
        <span v-else class="kb-noimg">宠物</span>
      </div>
      <div class="kb-body">
        <div class="kb-title">
          {{ data.petName }}
          <em v-if="data.healthLevel" class="kb-score">{{ data.healthLevel }}</em>
        </div>
        <div class="kb-sub">
          {{ data.breed || '品种待补' }}<i v-if="data.age"> · {{ data.age }}</i>
        </div>
        <div class="kb-meta">
          <span class="kb-extra">{{ data.reminder || '档案暂无疫苗和驱虫记录' }}</span>
        </div>
      </div>
      <span class="kb-arrow">›</span>
    </template>

    <!-- 养护档案 -->
    <template v-else-if="block.type === 'care'">
      <div class="kb-line">
        <span class="kb-title">{{ data.petName }}</span>
        <span class="kb-chip kb-chip--kb">{{ data.breed || '宠物档案' }}</span>
      </div>
      <div class="kb-sub">
        {{ data.age || '年龄待补' }}<i v-if="data.reminder"> · {{ data.reminder }}</i>
      </div>
      <div class="kb-meta">
        <span v-if="health.vaccine" class="kb-extra">疫苗 {{ health.vaccine }}</span>
        <span v-if="health.deworm" class="kb-extra">驱虫 {{ health.deworm }}</span>
      </div>
    </template>

    <!-- 经营指标 -->
    <template v-else-if="block.type === 'stat'">
      <div class="kb-line">
        <span class="kb-title">{{ data.title }}</span>
        <span class="kb-chip kb-chip--kb">{{ data.range }}</span>
      </div>
      <div class="kb-stats">
        <div v-for="item in data.items || []" :key="item.label" class="kb-stat">
          <em>{{ item.value }}</em>
          <span>{{ item.label }}</span>
          <i v-if="item.hint">{{ item.hint }}</i>
        </div>
      </div>
    </template>

    <!-- 订单 -->
    <template v-else-if="block.type === 'order'">
      <div class="kb-line">
        <span class="kb-no">{{ data.orderNo }}</span>
        <span class="kb-chip" :class="orderChipClass">{{ orderStatus }}</span>
      </div>
      <div class="kb-sub">{{ data.firstItem || (data.items && data.items[0] && data.items[0].name) || '订单' }}</div>
      <div class="kb-meta">
        <span class="kb-price">¥{{ data.payAmount }}</span>
        <span class="kb-extra">{{ data.createTime || '' }}</span>
      </div>
    </template>

    <!-- 预约 -->
    <template v-else-if="block.type === 'appointment'">
      <div class="kb-line">
        <span class="kb-title">{{ data.petName || '看宠预约' }}</span>
        <span class="kb-chip" :class="appointmentChipClass">{{ appointmentStatus }}</span>
      </div>
      <div class="kb-sub">{{ data.appointmentDate }}</div>
    </template>

    <!-- 门店 -->
    <template v-else-if="block.type === 'store'">
      <div class="kb-title">{{ data.storeName }}</div>
      <div class="kb-sub">{{ data.address }}</div>
      <div class="kb-meta">
        <span class="kb-extra">{{ data.businessHours }}</span>
        <a v-if="data.phone" class="kb-tel" :href="'tel:' + data.phone" @click.stop>{{ data.phone }}</a>
      </div>
    </template>

    <!-- 知识 -->
    <template v-else-if="block.type === 'knowledge'">
      <div class="kb-line">
        <span class="kb-title">{{ data.title }}</span>
        <span class="kb-chip kb-chip--kb">知识库</span>
      </div>
      <p class="kb-text">{{ data.content }}</p>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps({
  block: { type: Object, required: true }
})
const router = useRouter()
const data = computed(() => props.block?.data || {})
const health = computed(() => data.value.health || {})

const ORDER = ['待付款', '待发货/待自提', '已完成', '已取消']
const APPOINTMENT = ['待处理', '已确认', '已完成', '已取消']

const orderStatus = computed(() => ORDER[Number(data.value.status)] || '未知')
const orderChipClass = computed(() => ({
  'is-warn': String(data.value.status) === '0',
  'is-ok': String(data.value.status) === '2',
  'is-muted': String(data.value.status) === '3'
}))
const appointmentStatus = computed(() => APPOINTMENT[Number(data.value.status)] || '未知')
const appointmentChipClass = computed(() => ({
  'is-warn': String(data.value.status) === '0',
  'is-ok': String(data.value.status) === '1' || String(data.value.status) === '2',
  'is-muted': String(data.value.status) === '3'
}))

function go() {
  if (props.block.type === 'pet' && data.value.petId) {
    router.push('/shop/pet/' + data.value.petId)
  } else if (props.block.type === 'mypet' || props.block.type === 'care') {
    router.push('/shop/mypet')
  } else if (props.block.type === 'goods') {
    router.push('/shop/food')
  } else if (props.block.type === 'order') {
    router.push('/shop/cart')
  } else if (props.block.type === 'appointment') {
    router.push('/shop/appointment')
  }
}
</script>

<style scoped lang="scss">
.kb {
  display: flex;
  gap: 10px;
  padding: 10px;
  border: 1px solid var(--border-1);
  border-radius: var(--radius-md);
  background: var(--bg-card);
  cursor: pointer;
  transition: border-color .16s, box-shadow .16s;
  &:hover { border-color: var(--brand-200); box-shadow: 0 4px 14px -8px rgba(20, 97, 78, .45); }
  &--order, &--appointment, &--store, &--knowledge, &--care, &--stat { display: block; cursor: default; }
}
.kb-thumb {
  width: 58px; height: 58px; border-radius: var(--radius-md); overflow: hidden; flex-shrink: 0;
  background: var(--brand-50); display: grid; place-items: center;
  img { width: 100%; height: 100%; object-fit: cover; }
}
.kb-noimg { font-size: var(--fs-1); color: var(--brand-700); }
.kb-body { flex: 1; min-width: 0; }
.kb-title {
  font-size: var(--fs-5); font-weight: 700; color: var(--text-1);
  display: flex; align-items: center; gap: 6px; line-height: 1.4;
}
.kb-score {
  font-style: normal; font-size: var(--fs-1); font-weight: 500; color: var(--brand-700);
  background: var(--brand-50); border-radius: var(--radius-md); padding: 1px 6px;
}
.kb-sub {
  margin-top: 2px; font-size: var(--fs-2); color: var(--text-3); line-height: 1.5;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  i { font-style: normal; }
}
.kb-meta { margin-top: 4px; display: flex; align-items: baseline; gap: 8px; }
.kb-price { font-size: var(--fs-5); font-weight: 700; color: var(--danger-500); }
.kb-extra { font-size: var(--fs-2); color: var(--text-3); }
.kb-arrow { align-self: center; color: var(--text-4); font-size: var(--fs-8); }
.kb-line { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.kb-no { font-size: var(--fs-2); color: var(--text-2); font-variant-numeric: tabular-nums; }
.kb-chip {
  flex-shrink: 0; font-size: var(--fs-1); padding: 2px 8px; border-radius: var(--radius-md);
  background: var(--bg-sunken); color: var(--text-2);
  &.is-warn { background: var(--warning-50); color: var(--warning-500); }
  &.is-ok { background: var(--success-50); color: var(--success-500); }
  &.is-muted { background: var(--bg-sunken); color: var(--text-3); }
  &--kb { background: var(--brand-50); color: var(--brand-700); }
}
.kb-text {
  margin: 6px 0 0; font-size: var(--fs-3); line-height: 1.7; color: var(--text-2);
  white-space: pre-wrap;
}
.kb-tel { font-size: var(--fs-2); color: var(--brand-700); text-decoration: none; }
.kb-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 9px;
}
.kb-stat {
  padding: 7px 9px;
  border-radius: var(--radius-sm);
  background: var(--bg-sunken);
  em {
    display: block;
    font-style: normal;
    font-size: var(--fs-6);
    font-weight: 700;
    color: var(--text-1);
    line-height: 1.3;
  }
  span {
    font-size: var(--fs-2);
    color: var(--text-3);
  }
  i {
    display: block;
    margin-top: 2px;
    font-style: normal;
    font-size: var(--fs-1);
    color: var(--brand-700);
  }
}
</style>
