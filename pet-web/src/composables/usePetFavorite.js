import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/store/modules/user'
import { listMyFavoriteIds, listPetFavorite, addPetFavorite, delPetFavorite } from '@/api/pet/petFavorite'

/**
 * 宠物收藏：全站共用一份「已收藏 petId 集合」与切换动作。
 * 首页 / 在售 / 购物车空态 / 详情 / 选宠 5 个页面过去各写了一份同一逻辑，统一到这里。
 * @param openAuth 布局 provide 的登录弹窗唤起函数（未登录收藏时引导登录）
 */
export function usePetFavorite(openAuth) {
  const userStore = useUserStore()
  // 统一按数字比较：路由参数是字符串、接口返回是数字，混用会让 includes 静默失配
  const ids = ref([])

  const isFav = (petId) => ids.value.some((id) => Number(id) === Number(petId))

  // 登录后拉已收藏 ID 集合；游客态或接口异常时静默置空，不阻塞页面
  async function load() {
    if (!userStore.token) { ids.value = []; return }
    try {
      const res = await listMyFavoriteIds()
      ids.value = (res.data || []).map(Number)
    } catch (e) { /* 静默 */ }
  }

  /**
   * 切换收藏。addedMessage 可覆盖「收藏成功」提示（如选宠页说明会影响协同推荐）。
   * 只加不取消的场景（选宠页）也走 toggle：已收藏时给出相同反馈，不会重复添加。
   */
  async function toggle(petId, addedMessage) {
    if (!userStore.token) {
      ElMessage.info('请先登录后再收藏')
      if (openAuth) openAuth('login')
      return
    }
    if (isFav(petId)) {
      try {
        const res = await listPetFavorite({ userId: userStore.userId, petId })
        const fid = res.rows && res.rows[0] ? res.rows[0].favoriteId : null
        if (fid) await delPetFavorite(fid)
        ids.value = ids.value.filter((id) => id !== petId)
        ElMessage.success('已取消收藏')
      } catch (e) { ElMessage.error(e?.message || '取消失败') }
    } else {
      try {
        await addPetFavorite({ petId, userId: userStore.userId })
        ids.value.push(Number(petId))
        ElMessage.success(addedMessage || '收藏成功')
      } catch (e) { ElMessage.error(e?.message || '收藏失败') }
    }
  }

  return { ids, isFav, load, toggle }
}
