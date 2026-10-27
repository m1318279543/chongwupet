<template>
  <!-- 宠物卡：首页网格共用，首页只负责取数 -->
  <article class="pet-card" @click="$emit('open', pet.petId)">
    <div class="pet-media" :style="isImage(pet.image) ? null : { background: gradient }">
      <img v-if="isImage(pet.image)" :src="pet.image" :alt="pet.petName" class="pet-photo" loading="lazy" />
      <span v-else class="pet-emoji">暂无图片</span>

      <span class="pet-flag" :class="{ sold: pet.status === '1' }">
        <span class="d"></span>{{ pet.status === '1' ? '已售' : '可到店看' }}
      </span>

      <button
        type="button"
        class="fav"
        :aria-pressed="faved"
        :aria-label="faved ? '取消收藏' : '收藏'"
        @click.stop="$emit('fav', pet.petId)"
      >
        <svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-9a4 4 0 017-2.6A4 4 0 0119 11c0 4.6-7 9-7 9z"/></svg>
      </button>
    </div>

    <div class="pet-body">
      <h3 class="pet-name">{{ pet.petName }}</h3>
      <p class="pet-meta">
        {{ metaText }}<template v-if="rating"> · <el-icon class="star"><Star /></el-icon>{{ rating.avg }}</template>
      </p>
      <div class="pet-foot">
        <span class="pet-price num" v-if="pet.price > 0"><i>¥</i>{{ formatPrice(pet.price) }}</span>
        <span class="pet-price free" v-else>协商领养</span>
        <span class="pet-link">
          详情
          <svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>
        </span>
      </div>
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  pet: { type: Object, required: true },
  faved: { type: Boolean, default: false },
  rating: { type: Object, default: null },
  gradient: { type: String, default: '' },
})
defineEmits(['open', 'fav'])

function isImage(s) {
  return !!s && (s.indexOf('/') === 0 || s.indexOf('http') === 0)
}
function genderText(g) {
  return g === '0' ? '公' : g === '1' ? '母' : ''
}
// 价格加千分位，¥ 与数字分离便于分层字号
function formatPrice(p) {
  return Number(p).toLocaleString('zh-CN')
}
// 品种 · 性别 · 月龄 合并成一行，不再堆三枚灰色标签
const metaText = computed(() => {
  const p = props.pet
  return [p.breed, genderText(p.gender), p.age].filter(Boolean).join(' · ') || '信息待补充'
})
</script>

<style scoped lang="scss">
.pet-card {
  position: relative; display: block; width: 100%; text-align: left;
  background: none; border: 0; cursor: pointer;

  /* 扁平方向：不再用白卡+阴影，靠图片圆角与 hover 细描边承载可点性 */
  &:hover .pet-media { box-shadow: 0 0 0 1px var(--brand-200); }
}

.pet-media {
  position: relative; aspect-ratio: 4 / 3; overflow: hidden;
  background: var(--bg-sunken); border-radius: var(--radius-md);
  display: grid; place-items: center;
  transition: box-shadow .2s;

  /* 图片底部压一层极淡渐变，白底棚拍图也能与文字区分开 */
  &::after {
    content: ''; position: absolute; inset: auto 0 0 0; height: 38%; pointer-events: none;
    background: linear-gradient(to top, rgba(22, 33, 29, .07), rgba(22, 33, 29, 0));
  }

  .pet-emoji { font-size: 13px; color: var(--text-3); }
  .pet-photo {
    width: 100%; height: 100%; object-fit: cover; display: block;
    transition: transform .5s cubic-bezier(.2, .7, .3, 1);
  }
  .pet-card:hover & .pet-photo { transform: scale(1.05); }
}

.pet-flag {
  position: absolute; top: 10px; left: 10px; z-index: 2;
  display: inline-flex; align-items: center; gap: 5px;
  height: 24px; padding: 0 9px; border-radius: 7px;
  background: rgba(255, 255, 255, .94); backdrop-filter: blur(4px);
  font-size: 11.5px; font-weight: 600; color: var(--text-1);
  box-shadow: 0 1px 3px rgba(22, 25, 23, .12);

  .d { width: 5px; height: 5px; border-radius: 50%; background: var(--success-500); }
  &.sold { background: rgba(22, 25, 23, .72); color: #fff;
    .d { background: #a8a29e; } }
}

.fav {
  position: absolute; top: 9px; right: 9px; z-index: 2;
  width: 30px; height: 30px; border-radius: 50%; border: 0;
  background: rgba(255, 255, 255, .94); display: grid; place-items: center;
  box-shadow: 0 1px 3px rgba(22, 25, 23, .14); cursor: pointer;
  transition: transform .16s, background .16s;

  svg { width: 15px; height: 15px; stroke: var(--text-2); fill: none; stroke-width: 1.8; }
  &:hover { transform: scale(1.08); background: #fff; }
  &[aria-pressed="true"] svg { stroke: var(--brand-600); fill: var(--brand-600); }
}

.pet-body { padding: 12px 2px 0; }

.pet-name {
  font-size: 15px; font-weight: 600; line-height: 1.4; color: var(--text-1);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.pet-meta {
  margin-top: 3px; font-size: 12.5px; line-height: 1.5; color: var(--text-3);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.pet-foot {
  display: flex; align-items: flex-end; justify-content: space-between; gap: 8px;
  margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-2);
}
.pet-price {
  font-size: 20px; font-weight: 700; line-height: 1.1; letter-spacing: -.02em; color: var(--price);
  i { font-style: normal; font-size: 12.5px; font-weight: 600; margin-right: 1px; }
  &.free { font-size: 14px; font-weight: 600; color: var(--brand-700); }
}
.pet-link {
  display: inline-flex; align-items: center; gap: 3px; padding-bottom: 2px;
  font-size: 12.5px; font-weight: 600; color: var(--text-3); transition: color .16s;
  svg { width: 12px; height: 12px; stroke: currentColor; fill: none; stroke-width: 2; }
  .pet-card:hover & { color: var(--brand-700); }
}

@media (max-width: 768px) {
  .pet-media { aspect-ratio: 1 / 1; border-radius: var(--radius-sm);
    .pet-emoji { font-size: 12px; } }
  .pet-body { padding: 9px 1px 0; }
  .pet-name { font-size: 13.5px; }
  .pet-meta { font-size: 11.5px; }
  .pet-foot { margin-top: 9px; padding-top: 9px; }
  .pet-price { font-size: 17px;
    i { font-size: 11px; } }
  .pet-link { display: none; }
}
</style>
