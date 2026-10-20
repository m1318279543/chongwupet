import { defineStore } from 'pinia'

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

// 购物车 store（前端演示，localStorage 持久化，刷新不丢）
export const useCartStore = defineStore('cart', {
  state: () => ({
    items: loadItems() // 每项: { id, cat, name, image, spec, price, qty, checked }
  }),
  getters: {
    isEmpty: (s) => s.items.length === 0,
    totalCount: (s) => s.items.reduce((n, i) => n + i.qty, 0),
    totalPrice: (s) => s.items.reduce((sum, i) => sum + i.price * i.qty, 0),
    selectedCount: (s) => s.items.filter((i) => i.checked).reduce((n, i) => n + i.qty, 0),
    selectedPrice: (s) => s.items.filter((i) => i.checked).reduce((sum, i) => sum + i.price * i.qty, 0),
    allChecked: (s) => s.items.length > 0 && s.items.every((i) => i.checked)
  },
  actions: {
    persist() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items))
      } catch (e) {
        /* 忽略写入异常（隐私模式等） */
      }
    },
    // 加入购物车：同 id 累加数量并选中
    addItem(product) {
      const existing = this.items.find((i) => i.id === product.id)
      if (existing) {
        existing.qty += 1
        existing.checked = true
      } else {
        this.items.push({
          id: product.id,
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
    },
    removeItem(id) {
      this.items = this.items.filter((i) => i.id !== id)
      this.persist()
    },
    updateQty(id, qty) {
      const item = this.items.find((i) => i.id === id)
      if (item) {
        item.qty = Math.max(1, Math.floor(qty) || 1)
        this.persist()
      }
    },
    setChecked(id, val) {
      const item = this.items.find((i) => i.id === id)
      if (item) {
        item.checked = val
        this.persist()
      }
    },
    setAllChecked(val) {
      this.items.forEach((i) => (i.checked = val))
      this.persist()
    },
    clear() {
      this.items = []
      this.persist()
    }
  }
})

export default useCartStore
