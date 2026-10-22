// 首页静态数据：卡片配色、分类 emoji、服务特色、品牌承诺
// 与 shop/food/foodData.js、shop/service/serviceData.js 保持一致的组织方式
export const EMOJI_POOL = ['🐶', '🐱', '🐰', '🐹', '🐦', '🐢', '🐟', '🦎']

export const CAT_EMOJI = {
  猫咪: '🐱', 狗狗: '🐶', 兔子: '🐰', 仓鼠: '🐹', 鸟类: '🐦', 水族: '🐠',
  猫: '🐱', 狗: '🐶', 兔: '🐰', 仓: '🐹', 鸟: '🐦', 鱼: '🐠'
}

// 无图宠物卡片的占位渐变（按 petId 取模）
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

export const FEATURES = [
  { icon: '🩺', title: '健康筛查', desc: '每只宠物入站前完成体检' },
  { icon: '📸', title: '真实信息', desc: '实物拍摄，所见即所得' },
  { icon: '📋', title: '专业养护', desc: '科学喂养，记录完整' },
  { icon: '🤝', title: '售后无忧', desc: '领养后持续指导陪伴' }
]

export const PROMISES = [
  { icon: '✅', title: '来源透明', desc: '每只宠物可追溯来源，拒绝来路不明' },
  { icon: '💉', title: '疫苗齐全', desc: '基础疫苗接种完成，健康有保障' },
  { icon: '🏠', title: '温馨过渡', desc: '到家的过渡期，我们全程协助' },
  { icon: '❤️', title: '终身咨询', desc: '领养只是开始，养护问题随时咨询' }
]
