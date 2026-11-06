// 宠物粮商品共享逻辑：静态目录元数据 + 后端商品行的前端适配
// 供 /shop/food 专区页与 FoodDetailDialog 详情弹窗共用，避免两处各维护一份字段映射
import { FOOD_CATEGORIES, FOOD_LIST } from './foodData.js'
import { listGoods } from '@/api/pet/petGoods'

export { FOOD_CATEGORIES, FOOD_LIST }

export const fidByCode = {}
FOOD_LIST.forEach((f) => { fidByCode[f.id] = f.fid })

// 后端 pet_goods 行 -> 前端粮对象（缺字段用静态目录兜底）
export function adaptGoods(g) {
  const fallback = FOOD_LIST.find((f) => f.id === g.goodsCode) || {}
  return {
    id: g.goodsCode,
    goodsId: g.goodsId,
    skuId: g.skus && g.skus.length ? g.skus[0].skuId : null,
    fid: fallback.fid || fidByCode[g.goodsCode],
    cat: g.cat,
    image: g.image,
    name: g.goodsName,
    spec: g.spec,
    price: Number(g.price),
    stock: g.stock == null ? 0 : Number(g.stock),
    stage: g.stage,
    desc: g.description,
    tags: g.tagList || [],
    nutrition: g.nutrition,
    feeding: g.feeding,
    storage: g.storage
  }
}

// 全量在售目录（后台上下架新品类前台自动跟随）；接口不可用退回静态数据
export async function loadAllGoods() {
  try {
    const res = await listGoods({ status: '0', pageNum: 1, pageSize: 200 })
    const rows = res.rows || []
    return rows.length ? rows.map(adaptGoods) : FOOD_LIST
  } catch (e) {
    return FOOD_LIST
  }
}
