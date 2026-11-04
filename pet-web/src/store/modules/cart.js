import { defineStore } from 'pinia'
import {
  listCartItems, addCartItem, mergeCartItems, updateCartItem,
  checkAllCartItems, delCartItems, clearCartItems
} from '@/api/pet/petCart'
import { useUserStore } from '@/store/modules/user'

const STORAGE_KEY = 'pet_cart_items'

function loadItems() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr : []
  } catch (e) {
    return []
  }
}

// 服务端行 → 前端条目（id 仅作前端 key：宠物 pet-<petId>，商品 <goodsId>-<skuId|0>）
function mapServerItem(row) {
  return {
    id: row.itemType === '2' ? `pet-${row.petId}` : `${row.goodsId}-${row.skuId || 0}`,
    cartItemId: row.cartItemId,
    itemType: row.itemType,
    petId: row.petId,
    goodsId: row.goodsId,
    skuId: row.skuId,
    name: row.goodsName,
    image: row.goodsImage,
    spec: row.goodsSpec,
    price: Number(row.price || 0),
    qty: row.qty || 1,
    checked: row.checked !== '0'
  }
}

// 前端条目 → 服务端字段（本地 id 不上传）
function toServerItem(i) {
  return {
    itemType: i.itemType || '1',
    petId: i.petId || null,
    goodsId: i.goodsId || null,
    skuId: i.skuId || null,
    goodsName: i.name,
    goodsImage: i.image,
    goodsSpec: i.spec,
    price: i.price,
    qty: i.qty
  }
}

// 购物车 store：游客存 localStorage；登录后持久化到服务端（按账号绑定），登录时自动合并本地条目
export const useCartStore = defineStore('cart', {
  state: () => ({
    items: loadItems(),
    serverSynced: false, // 登录后是否已与服务器同步（同步过则本地存储不再使用）
    syncing: false       // 同步进行中（防重复请求，也让加购知道条目还没上传）
  }),  getters: {
    isEmpty: (s) => s.items.length === 0,
    totalCount: (s) => s.items.reduce((n, i) => n + i.qty, 0),
    totalPrice: (s) => s.items.reduce((sum, i) => sum + i.price * i.qty, 0),
    selectedCount: (s) => s.items.filter((i) => i.checked).reduce((n, i) => n + i.qty, 0),
    selectedPrice: (s) => s.items.filter((i) => i.checked).reduce((sum, i) => sum + i.price * i.qty, 0),
    allChecked: (s) => s.items.length > 0 && s.items.every((i) => i.checked)
  },
  actions: {
    persist() {
      if (this.serverSynced) return // 服务端模式以数据库为准，不回写本地
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items))
      } catch (e) {
        /* 忽略写入异常（隐私模式等） */
      }
    },
    // 登录后调用：把服务端购物车拉下来；本地还有条目则合并上传并清掉本地存储
    // 游客/登出时调用会重置回本地模式
    async sync() {
      const userStore = useUserStore()
      if (!userStore.token) {
        if (this.serverSynced) {
          // 已登出：回到本地模式，清掉服务端残留
          this.serverSynced = false
          this.items = loadItems()
        }
        return
      }
      if (this.serverSynced || this.syncing) return
      this.syncing = true
      try {
        const local = this.items
        const localIds = local.map((i) => i.id)
        let merged
        if (local.length) {
          const res = await mergeCartItems(local.map(toServerItem))
          merged = (res.data || []).map(mapServerItem)
          localStorage.removeItem(STORAGE_KEY)
        } else {
          const res = await listCartItems()
          merged = (res.data || []).map(mapServerItem)
        }
        // 同步期间用户可能又加购了（如详情页点「加入购物车」）：这批条目还没上传，
        // 若直接用服务端结果覆盖就会丢，所以补传一次再落地。
        const extra = this.items.filter((i) => !localIds.includes(i.id))
        if (extra.length) {
          const res2 = await mergeCartItems(extra.map(toServerItem))
          merged = (res2.data || []).map(mapServerItem)
        }
        this.items = merged
        this.serverSynced = true
      } catch (e) {
        // 同步失败保持本地模式，下次再试
      } finally {
        this.syncing = false
      }
    },
    // 加入购物车：同 id 累加数量并选中；宠物是活的，一只一条，重复加只改回选中不加量
    addItem(product) {
      const existing = this.items.find((i) => i.id === product.id)
      if (existing) {
        if (product.itemType !== '2') existing.qty += 1
        existing.checked = true
      } else {
        this.items.push({
          id: product.id,
          cartItemId: null,
          goodsId: product.goodsId,
          skuId: product.skuId,
          petId: product.petId,
          itemType: product.itemType || '1', // '1' 宠物粮等商品，'2' 宠物（与订单明细 itemType 同口径）
          cat: product.cat,
          name: product.name,
          image: product.image,
          spec: product.spec,
          price: product.price,
          qty: 1,
          checked: true
        })
      }
      this.persist()
      // 服务端模式：乐观更新后同步到账号，以服务端合并结果为准（失败不阻塞本地体验）
      if (this.serverSynced) {
        const item = this.items.find((i) => i.id === product.id)
        addCartItem(toServerItem(item))
          .then((res) => { this.items = (res.data || []).map(mapServerItem) })
          .catch(() => {})
      }
    },
    removeItem(id) {
      const item = this.items.find((i) => i.id === id)
      this.items = this.items.filter((i) => i.id !== id)
      this.persist()
      if (this.serverSynced && item && item.cartItemId) {
        delCartItems([item.cartItemId]).catch(() => {})
      }
    },
    updateQty(id, qty) {
      const item = this.items.find((i) => i.id === id)
      if (item) {
        // 宠物一单一只，数量恒为 1
        item.qty = item.itemType === '2' ? 1 : Math.max(1, Math.floor(qty) || 1)
        this.persist()
        if (this.serverSynced && item.cartItemId) {
          updateCartItem(item.cartItemId, { qty: item.qty }).catch(() => {})
        }
      }
    },
    setChecked(id, val) {
      const item = this.items.find((i) => i.id === id)
      if (item) {
        item.checked = val
        this.persist()
        if (this.serverSynced && item.cartItemId) {
          updateCartItem(item.cartItemId, { checked: val }).catch(() => {})
        }
      }
    },
    setAllChecked(val) {
      this.items.forEach((i) => (i.checked = val))
      this.persist()
      if (this.serverSynced) {
        checkAllCartItems(val).catch(() => {})
      }
    },
    clear() {
      this.items = []
      this.persist()
      if (this.serverSynced) {
        clearCartItems().catch(() => {})
      }
    },
    // 下单成功后由结算流程调用：服务端购物车已随订单结转，重新拉取（通常为空）
    reloadFromServer() {
      if (!this.serverSynced) return Promise.resolve()
      return listCartItems()
        .then((res) => { this.items = (res.data || []).map(mapServerItem) })
        .catch(() => {})
    },
    // 结算支付成功后清空购物车：只清已勾选（已购）条目，保留未勾选的；
    // 必须先等服务端删除完成再回填列表 —— 旧实现 clear() 不等待、随后立刻 GET，
    // GET 抢在 DELETE 前返回会把刚买掉的条目重新刷回购物车（bug：结算后购物车未清空）。
    async clearAfterCheckout() {
      const bought = this.items.filter((i) => i.checked)
      const rest = this.items.filter((i) => !i.checked)
      this.items = rest
      if (this.serverSynced) {
        const ids = bought.map((i) => i.cartItemId).filter(Boolean)
        try {
          if (ids.length) await delCartItems(ids)
        } catch (e) { /* 服务端已在成单时消费已购条目，这里失败不阻塞 */ }
        try {
          const res = await listCartItems()
          // 双保险：以服务端为准，再把本地已购同款过滤一遍，防时序残留
          const boughtKeys = new Set(bought.map((i) => i.id))
          this.items = (res.data || []).map(mapServerItem).filter((i) => !boughtKeys.has(i.id))
        } catch (e) { /* 网络异常时保留本地未勾选条目，下次 sync 对账 */ }
      } else {
        this.persist()
      }
    }
  }
})

export default useCartStore
