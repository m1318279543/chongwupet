/**
 * 后台商品行 → 前台宠粮卡片字段：全站唯一的适配口径。
 *
 * 宠物粮专区、购物车空态推荐、详情页加购共用这一份。
 * 以前两处各写一半（cart 版缺 fid/cat/详情字段，food 版才完整），
 * 导致同一接口的数据在两页形状不一致，加购时容易漏 skuId。
 *
 * @param {object} g 后端商品行（pet_goods，含 skus 数组）
 * @param {Record<string,string>} [fidByCode] goodsCode → fid 映射（评分/点赞按 fid 归类，
 *        仅宠粮专区需要；调用方从本地 FOOD_LIST 派生后传入，避免 utils 反向依赖 views）
 */
export function adaptGoods(g, fidByCode = {}) {
  return {
    id: g.goodsCode,
    goodsId: g.goodsId,
    skuId: g.skus && g.skus.length ? g.skus[0].skuId : null,
    fid: fidByCode[g.goodsCode] || g.fid || null,
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

export default adaptGoods
