// 宠物展示共用工具：图片判定、无图占位渐变。
// 这些一行函数过去在 10 个页面各写一份（前台 7 处 + 后台 3 处），统一收编到这里。

// 无图宠物卡片的占位渐变（按 petId 取模）——全站唯一权威定义
export const PET_GRADIENTS = [
  ['#fff4e6', '#ffe0b3'],
  ['#e8f5e9', '#c8e6c9'],
  ['#e3f2fd', '#bbdefb'],
  ['#fce4ec', '#f8bbd0'],
  ['#f3e5f5', '#e1bee7'],
  ['#fff8e1', '#ffecb3'],
  ['#e0f7fa', '#b2ebf2'],
  ['#fce4ec', '#f8bbd0']
]

// image 字段可能是图片 URL（/images/... 或 http...），也可能是 emoji 兜底
export function isImage(s) {
  return !!s && (s.indexOf('/') === 0 || s.indexOf('http') === 0)
}

// 无图占位渐变：同一数组同一取法，保证同一只宠物在各页面配色一致
export function petGradient(id) {
  const c = PET_GRADIENTS[(id || 0) % PET_GRADIENTS.length]
  return `linear-gradient(135deg, ${c[0]}, ${c[1]})`
}
