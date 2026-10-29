import { ref, computed, watch } from 'vue'

/**
 * 定高列表分页：每页固定条数、超出翻页。6 个页面过去各写了一份，统一到这里。
 *
 * useClientPaging：对本地数组切片（购物车 / 订单归档 / 我的预约 / 我的宠物），
 *   总数变少时自动回到第 1 页，避免停在空页。
 * useServerPaging：总数来自后端（在售宠物 / 我的收藏），翻页与总数变化时
 *   回调重新取数；总数变少时回退一页，避免空白页。
 */

export function useClientPaging(source, pageSize) {
  const page = ref(1)
  const total = computed(() => source.value.length)
  const paged = computed(() => source.value.slice((page.value - 1) * pageSize, page.value * pageSize))
  const rangeStart = computed(() => (total.value ? (page.value - 1) * pageSize + 1 : 0))
  const rangeEnd = computed(() => Math.min(page.value * pageSize, total.value))
  watch(total, (n) => {
    if ((page.value - 1) * pageSize >= n) page.value = 1
  })
  return { page, total, paged, rangeStart, rangeEnd }
}

export function useServerPaging(totalRef, pageSize, onChange) {
  const page = ref(1)
  const rangeStart = computed(() => (totalRef.value ? (page.value - 1) * pageSize + 1 : 0))
  const rangeEnd = computed(() => Math.min(page.value * pageSize, totalRef.value))
  watch(page, () => { if (onChange) onChange() })
  // 删除/取消后总数变少，回退一页避免空白页
  watch(totalRef, (n) => {
    if (n > 0 && (page.value - 1) * pageSize >= n) page.value = Math.max(1, page.value - 1)
  })
  return { page, rangeStart, rangeEnd }
}
