/**
 * 商品图归一化表
 * ------------------------------------------------------------
 * 卡片与详情页会把照片裁成 4:3（cover），而原片的主体占比差异很大：
 * 同一个网格里，有的主体只占四成、留一大片白，有的特写占满九成。
 * 这里按 petId 给出「焦点 + 缩放」，把主体拉回同一观感。
 *
 *   x / y  主体中心在画面中的位置，百分比（对应 CSS object-position）
 *   zoom   > 1 放大（主体太小）、< 1 收一点（主体过满），1 为不处理
 *
 * 用法：新图先按默认值渲染，明显偏了再补一条；不要为了「看起来热闹」乱加。
 * 缺省：主体居中偏上（50% 45%），不缩放。
 */

export const DEFAULT_IMAGE_VARS = { x: 50, y: 45, zoom: 1 }

/** petId → 调参。只登记肉眼可见偏差的图，其余走默认。 */
export const PET_IMAGE_TUNING = {
  // 三色柯基：全身远景，主体只占画面四成，四周大块白
  9: { x: 50, y: 42, zoom: 1.55 },
  // 金毛寻回幼犬：白底棚拍，留白过多
  7: { x: 50, y: 45, zoom: 1.32 }
}

/** 生成可直接绑到 <img> 上的 CSS 变量（仍由样式表决定 hover 等状态） */
export function imageVars(petId) {
  const t = PET_IMAGE_TUNING[petId] || {}
  const x = t.x ?? DEFAULT_IMAGE_VARS.x
  const y = t.y ?? DEFAULT_IMAGE_VARS.y
  const zoom = t.zoom ?? DEFAULT_IMAGE_VARS.zoom
  return {
    '--img-pos': `${x}% ${y}%`,
    '--img-zoom': String(zoom)
  }
}
