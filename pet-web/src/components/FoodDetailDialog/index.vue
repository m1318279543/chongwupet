<template>
  <el-dialog :model-value="modelValue" width="760px" top="6vh" class="food-detail-dialog" :show-close="true" @update:model-value="v => emit('update:modelValue', v)">
    <div class="food-detail-scroll" v-if="detail">
      <div class="detail">
        <div class="detail-left">
          <img :src="detail.image" :alt="detail.name" />
        </div>
        <div class="detail-right">
          <div class="detail-cat">
            <span class="emoji">{{ currentCat.emoji }}</span>{{ currentCat.name }}专区
          </div>
          <h2 class="detail-name">{{ detail.name }}</h2>
          <div class="detail-price">¥{{ detail.price }}<span class="unit">起</span></div>
          <div class="detail-tags">
            <el-tag v-for="t in detail.tags" :key="t" size="small" type="warning" effect="plain">{{ t }}</el-tag>
          </div>
          <ul class="detail-list">
            <li><span class="k">规格</span><span class="v">{{ detail.spec }}</span></li>
            <li><span class="k">适用阶段</span><span class="v">{{ detail.stage }}</span></li>
            <li><span class="k">营养指标</span><span class="v">{{ detail.nutrition }}</span></li>
            <li><span class="k">商品简介</span><span class="v">{{ detail.desc }}</span></li>
            <li><span class="k">喂食建议</span><span class="v">{{ detail.feeding }}</span></li>
            <li><span class="k">储存方式</span><span class="v">{{ detail.storage }}</span></li>
          </ul>
          <div class="detail-actions">
            <el-button type="primary" size="large" round :disabled="detail.stock === 0" @click="addToCart(detail)">
              {{ detail.stock === 0 ? '暂时缺货' : '加入购物车' }}
            </el-button>
            <el-button size="large" round :disabled="detail.stock === 0" @click="buyNow(detail)">立即购买</el-button>
            <span class="stock-hint">
              {{ detail.stock > 0 ? '现货 ' + detail.stock + ' 件' : '补货中，可先咨询客服' }}
            </span>
          </div>
        </div>
      </div>
      <!-- 点赞 + 评论区：fid 未补齐前不渲染，避免 petId=undefined 的坏参请求 -->
      <div class="food-social" v-if="detail.fid">
        <PetSocial :pet-id="detail.fid" target-type="food" @auth="emit('auth', $event)" />
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, computed, inject, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { FOOD_CATEGORIES } from '@/views/shop/food/foodData.js'
import { loadAllGoods } from '@/views/shop/food/foodShared.js'
import { useCartStore } from '@/store/modules/cart'
import PetSocial from '@/components/PetSocial/index.vue'

const props = defineProps({
  // 弹窗可见性（v-model）
  modelValue: { type: Boolean, default: false },
  // 商品 goodsId（pet_goods.goods_id）
  goodsId: { type: [Number, String], default: null },
  // 列表卡片上已有的精简数据（先展示，完整信息随后补齐）
  fallback: { type: Object, default: null }
})
const emit = defineEmits(['update:modelValue', 'auth'])

const router = useRouter()
const cartStore = useCartStore()
const openAuth = inject('openAuth', () => {})

const detail = ref(null)

// 类目元数据（emoji / 名称）：随 detail.cat 派生
const currentCat = computed(() => {
  const cat = detail.value?.cat
  return FOOD_CATEGORIES.find(c => c.id === cat) || {}
})

// 打开时补齐完整商品信息：目录接口按 goodsId 精确匹配，失败则用卡片数据兜底
async function ensureDetail() {
  if (!props.goodsId && !props.fallback) return
  // 先用卡片数据立即渲染（首页只带 goodsId/name/price/spec/cat/image）
  if (props.fallback) detail.value = { ...props.fallback }
  try {
    // loadAllGoods 返回的是适配后的粮对象（含 fid/stock/desc 等），按 goodsId 命中后整体覆盖
    const rows = await loadAllGoods()
    const hit = rows.find((g) => String(g.goodsId) === String(props.goodsId))
    if (hit) detail.value = { ...props.fallback, ...hit }
  } catch (e) { /* 目录不可用时保持卡片兜底数据 */ }
}

watch(() => props.modelValue, (v) => {
  if (v) ensureDetail()
})
watch(() => props.goodsId, () => {
  if (props.modelValue) ensureDetail()
})

// 加入购物车：写入 store（持久化）
function addToCart(p) {
  if (p.stock === 0) {
    ElMessage.warning('该商品暂时缺货')
    return
  }
  cartStore.addItem(p)
  ElMessage.success(`已将「${p.name}」加入购物车`)
}

// 立即购买：加购后直接去购物车结算
function buyNow(p) {
  addToCart(p)
  router.push('/shop/cart')
}
</script>

<style scoped lang="scss">
.food-detail-dialog {
  :deep(.el-dialog__body) { padding: 0; }
  .food-detail-scroll { max-height: 86vh; overflow-y: auto; }
  .food-social { padding: 0 18px 20px;
    :deep(.pet-social) { margin-top: 0; }
  }
  .detail { display: flex; gap: 0; min-height: 360px;
    .detail-left { width: 320px; flex-shrink: 0; background: var(--bg-page);
      img { width: 100%; height: 100%; max-height: 420px; object-fit: cover; display: block; }
    }
    .detail-right { flex: 1; padding: 24px 28px; }
    .detail-cat { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--brand-700);
      background: var(--brand-50); padding: 3px 12px; border-radius: var(--radius-pill); margin-bottom: 12px;
      .emoji { font-size: 16px; }
    }
    .detail-name { font-size: 22px; color: var(--text-1); margin: 0 0 10px; }
    .detail-price { color: var(--price); font-size: 26px; font-weight: 700; margin-bottom: 12px;
      .unit { font-size: 13px; color: var(--text-3); font-weight: 400; margin-left: 3px; }
    }
    .detail-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 18px; }
    .detail-list { list-style: none; margin: 0 0 20px; padding: 0;
      li { display: flex; gap: 14px; padding: 10px 0; border-bottom: var(--rule-soft); font-size: 14px;
        .k { color: var(--text-3); width: 76px; flex-shrink: 0; }
        .v { color: var(--text-1); line-height: 1.6; flex: 1; }
      }
    }
    .detail-actions { display: flex; gap: 14px; flex-wrap: wrap; align-items: center;
      .el-button { flex: 1; min-width: 140px; font-weight: 600; }
      .stock-hint { font-size: 12.5px; color: var(--text-3); }
    }
  }
}
@media (max-width: 768px) {
  .food-detail-dialog .detail { flex-direction: column;
    .detail-left { width: 100%; img { max-height: min(240px, 30vh); } }
  }
}
</style>
