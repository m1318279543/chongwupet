// 宠物粮专区数据（前端静态，覆盖网站内全部 7 类宠物）
// 每类 2 款主推粮；image 统一放 public/images/food/
// 字段：id 唯一标识 / cat 所属分类 / fid 后端评论/点赞业务ID(1001-1014) / name 名称 / spec 规格 / price 价格 / stage 适用阶段 / desc 简介
//      tags 卖点 / nutrition 营养指标 / feeding 喂食建议 / storage 储存方式

export const FOOD_CATEGORIES = [
  { id: 'cat', name: '猫咪', emoji: '🐱', color: '#ff8c42' },
  { id: 'dog', name: '狗狗', emoji: '🐶', color: '#5b8def' },
  { id: 'rabbit', name: '兔子', emoji: '🐰', color: '#a8d5a2' },
  { id: 'hamster', name: '仓鼠', emoji: '🐹', color: '#e6b980' },
  { id: 'bird', name: '鸟类', emoji: '🐦', color: '#7ec8c8' },
  { id: 'fish', name: '水族', emoji: '🐠', color: '#4db6c4' },
  { id: 'reptile', name: '爬行宠物', emoji: '🦎', color: '#8d9b6a' }
]

// 每款：id 唯一标识 / fid 后端业务ID / name 名称 / spec 规格 / price 价格 / stage 适用阶段 / desc 简介 / image 配图
export const FOOD_LIST = [
  // 猫咪
  {
    id: 'cat-1',
    fid: 1001,
    cat: 'cat',
    image: '/images/food/Professional_e_commerce_produc_2026-10-12T12-00-51.webp',
    name: '幼猫成长无谷猫粮', spec: '1.5kg / 袋', price: 128, stage: '离乳—12 月龄',
    desc: '高肉含量配方，添加 DHA 助脑眼发育，无谷低敏易吸收。',
    tags: ['无谷低敏', '高肉含量', '添加 DHA'],
    nutrition: '粗蛋白 ≥38% · 粗脂肪 ≥16% · 钙磷比 1.2:1',
    feeding: '幼猫每日 40-60g，分 3-4 次喂食；按 7 日过渡法逐步替换旧粮。',
    storage: '阴凉干燥处密封保存，开封后请于 4 周内用完。'
  },
  {
    id: 'cat-2',
    fid: 1002,
    cat: 'cat',
    image: '/images/food/Professional_e_commerce_produc_2026-10-12T12-00-51.webp',
    name: '全价成猫鲜肉猫粮', spec: '2kg / 袋', price: 158, stage: '成年猫',
    desc: '鲜鸡肉为主，低镁配方呵护泌尿系统，毛色亮泽。',
    tags: ['鲜鸡肉', '低镁护泌尿', '美毛亮泽'],
    nutrition: '粗蛋白 ≥32% · 粗脂肪 ≥15% · 牛磺酸 0.2%',
    feeding: '成猫每日 50-70g，自由采食或定时定量，保证充足饮水。',
    storage: '避光密封，置于干燥处，避免受潮结块。'
  },
  // 狗狗
  {
    id: 'dog-1',
    fid: 1003,
    cat: 'dog',
    image: '/images/food/Professional_e_commerce_produc_2026-10-12T12-00-48.webp',
    name: '小型犬幼犬粮', spec: '1.5kg / 袋', price: 119, stage: '幼犬',
    desc: '小颗粒易咀嚼，高能量密度满足小型犬成长需求。',
    tags: ['小颗粒', '高能量', '易消化'],
    nutrition: '粗蛋白 ≥30% · 粗脂肪 ≥18% · DHA 添加',
    feeding: '按体重 4-6%，每天分 3 次；泡软后喂食更佳。',
    storage: '密封防潮，常温保存，开封后尽快食用。'
  },
  {
    id: 'dog-2',
    fid: 1004,
    cat: 'dog',
    image: '/images/food/Professional_e_commerce_produc_2026-10-12T12-00-48.webp',
    name: '大型犬全价犬粮', spec: '10kg / 袋', price: 328, stage: '成年犬',
    desc: '添加氨糖与软骨素，呵护关节，均衡钙磷助骨骼。',
    tags: ['关节养护', '大包装', '均衡钙磷'],
    nutrition: '粗蛋白 ≥26% · 粗脂肪 ≥14% · 氨糖 + 软骨素',
    feeding: '按体重 2-3%，每天分 2 次，搭配充足运动与饮水。',
    storage: '阴凉通风处，避免阳光直射与高温。'
  },
  // 兔子
  {
    id: 'rabbit-1',
    fid: 1005,
    cat: 'rabbit',
    image: '/images/food/Professional_e_commerce_produc_2026-10-12T12-00-47.webp',
    name: '兔用提摩西草粒', spec: '1kg / 袋', price: 69, stage: '全龄',
    desc: '无限量主草，高纤维助消化磨牙，无添加蔗糖。',
    tags: ['高纤维', '磨牙', '无蔗糖'],
    nutrition: '粗纤维 ≥30% · 蛋白质 ≥14%',
    feeding: '作为主草无限量提供，搭配少量兔粮与新鲜蔬菜。',
    storage: '干燥通风处，防止霉变，切勿沾水。'
  },
  {
    id: 'rabbit-2',
    fid: 1006,
    cat: 'rabbit',
    image: '/images/food/Professional_e_commerce_produc_2026-10-12T12-00-47.webp',
    name: '兔用果蔬混合粮', spec: '800g / 袋', price: 59, stage: '全龄',
    desc: '冻干果蔬 + 维生素，补充营养，挑食兔也爱吃。',
    tags: ['冻干果蔬', '多维', '挑食友好'],
    nutrition: '粗纤维 ≥18% · 维生素 A/D/E 强化',
    feeding: '每日 30-50g 搭配主草，作为营养补充。',
    storage: '密封冷藏更佳，开封后 1 个月内用完。'
  },
  // 仓鼠
  {
    id: 'hamster-1',
    fid: 1007,
    cat: 'hamster',
    image: '/images/food/Professional_e_commerce_produc_2026-10-12T12-14-42.webp',
    name: '仓鼠综合营养粮', spec: '500g / 袋', price: 39, stage: '全龄',
    desc: '五谷 + 面包虫均衡配比，磨牙补钙一举两得。',
    tags: ['五谷均衡', '面包虫', '磨牙补钙'],
    nutrition: '蛋白质 ≥16% · 脂肪 ≥6%',
    feeding: '每日 10-15g，搭配磨牙石与清洁饮水。',
    storage: '阴凉干燥密封，防虫防潮。'
  },
  {
    id: 'hamster-2',
    fid: 1008,
    cat: 'hamster',
    image: '/images/food/Professional_e_commerce_produc_2026-10-12T12-14-42.webp',
    name: '金丝熊增艳粮', spec: '500g / 袋', price: 45, stage: '全龄',
    desc: '富含虾青素与亚麻酸，助毛色鲜亮、皮肤健康。',
    tags: ['虾青素', '美毛', '亚麻酸'],
    nutrition: '蛋白质 ≥17% · 富含不饱和脂肪酸',
    feeding: '每日 10-15g，可与主粮混合喂食。',
    storage: '密封避光，置于阴凉处。'
  },
  // 鸟类
  {
    id: 'bird-1',
    fid: 1009,
    cat: 'bird',
    image: '/images/food/Professional_e_commerce_produc_2026-10-12T12-13-19.webp',
    name: '鹦鹉滋养丸', spec: '500g / 罐', price: 79, stage: '全龄',
    desc: '全价均衡营养，替代单一种子粮，羽粉更少更健康。',
    tags: ['全价均衡', '替代种子粮', '少羽粉'],
    nutrition: '蛋白质 ≥14% · 维生素矿物质全谱',
    feeding: '每日 15-25g 为主食，搭配新鲜果蔬。',
    storage: '密封冷藏，避免受潮结块。'
  },
  {
    id: 'bird-2',
    fid: 1010,
    cat: 'bird',
    image: '/images/food/Professional_e_commerce_produc_2026-10-12T12-13-19.webp',
    name: '鸣禽种子混合粮', spec: '400g / 袋', price: 35, stage: '全龄',
    desc: '多种谷物 + 草籽搭配，丰富口感，满足啄食天性。',
    tags: ['多谷物', '草籽', '口感丰富'],
    nutrition: '蛋白质 ≥12% · 天然谷物',
    feeding: '每日 10-20g 自由取食，补充墨鱼骨补钙。',
    storage: '干燥处密封，防虫。'
  },
  // 水族
  {
    id: 'fish-1',
    fid: 1011,
    cat: 'fish',
    image: '/images/food/Professional_e_commerce_produc_2026-10-12T12-01-05.webp',
    name: '热带鱼缓沉颗粒', spec: '100g / 瓶', price: 29, stage: '小型鱼',
    desc: '缓沉不浑水，高蛋白易吸收，体色更鲜艳。',
    tags: ['缓沉不浑水', '高蛋白', '增色'],
    nutrition: '粗蛋白 ≥45% · 缓沉型',
    feeding: '每日 2-3 次，每次以 3 分钟内吃完为宜。',
    storage: '密封防潮，远离高温与阳光。'
  },
  {
    id: 'fish-2',
    fid: 1012,
    cat: 'fish',
    image: '/images/food/Professional_e_commerce_produc_2026-10-12T12-01-05.webp',
    name: '水龟全价龟粮', spec: '250g / 罐', price: 49, stage: '水龟',
    desc: '钙磷平衡配方，添加螺旋藻，龟壳坚硬有光泽。',
    tags: ['钙磷平衡', '螺旋藻', '硬壳'],
    nutrition: '粗蛋白 ≥40% · 钙 ≥2%',
    feeding: '幼龟每日、成龟隔日，投喂量以龟头部大小为宜。',
    storage: '阴凉干燥密封保存，避免受潮。'
  },
  // 爬行宠物
  {
    id: 'reptile-1',
    fid: 1013,
    cat: 'reptile',
    image: '/images/food/Professional_e_commerce_produc_2026-10-12T12-00-52.webp',
    name: '蜥蜴爬虫粮', spec: '200g / 袋', price: 55, stage: '蜥蜴',
    desc: '蟋蟀粉 + 脱水果蔬，高钙低磷，符合食虫习性。',
    tags: ['蟋蟀粉', '高钙低磷', '食虫配方'],
    nutrition: '粗蛋白 ≥42% · 钙磷比 2:1',
    feeding: '每日少量，搭配活体昆虫与 UVB 光照。',
    storage: '密封干燥，避免阳光直射。'
  },
  {
    id: 'reptile-2',
    fid: 1014,
    cat: 'reptile',
    image: '/images/food/Professional_e_commerce_produc_2026-10-12T12-00-52.webp',
    name: '守宫专用粮', spec: '150g / 罐', price: 52, stage: '守宫',
    desc: '细腻颗粒易吞咽，强化维生素 D3，助力钙吸收。',
    tags: ['细腻易咽', 'VD3 强化', '助钙吸收'],
    nutrition: '粗蛋白 ≥40% · 维生素 D3 强化',
    feeding: '隔日喂食，晚间投喂更符合其夜行习性。',
    storage: '阴凉密封，防潮。'
  }
]
