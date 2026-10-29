import { ref } from 'vue'
import { commentStatGroup } from '@/api/pet/petComment'

/**
 * 评分角标：一个分组统计接口供全站使用（宠物卡片 / 宠粮卡片共用）。
 * 后端返回行的主键字段统一叫 petId；宠粮页面传入的 id 是 fid，形状相同。
 * @param target 'pet' | 'food'
 */
export function usePetRatings(target) {
  const map = ref({})

  async function load() {
    try {
      const res = await commentStatGroup(target)
      const m = {}
      for (const row of res.data || []) m[row.petId] = row
      map.value = m
    } catch (e) { /* 静默：评分缺失不阻塞页面 */ }
  }

  // 无评分返回 null，模板据此不渲染角标
  const rating = (id) => {
    const r = map.value[id]
    return r && Number(r.count) > 0 ? r : null
  }

  return { map, load, rating }
}
