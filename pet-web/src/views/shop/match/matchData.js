// 智能选宠的题库（原来 130 行题目直接写在组件里）
// 改题目/加选项只动这个文件，不用碰页面逻辑。
// 注意：分析过程的文案在 useMatchWizard.js 里（跟随实际算法步骤），不要在这里再放一份。

export const STEPS = [
  {
    key: 'life',
    title: '居住与家庭',
    sub: '先看看你家的环境',
    questions: [
      {
        key: 'home',
        title: '你现在的居住环境是？',
        hint: '决定宠物的活动空间',
        options: [
          { value: 'small', label: '小户型 / 合租', desc: '一室或合租，空间有限' },
          { value: 'apartment', label: '普通住宅', desc: '两室一厅，有阳台' },
          { value: 'house', label: '大房子 / 带院子', desc: '空间充裕，可自由活动' }
        ]
      },
      {
        key: 'kids',
        title: '家里有 12 岁以下的小朋友吗？',
        hint: '会优先排除不适合儿童的品种',
        options: [
          { value: 'yes', label: '有小朋友' },
          { value: 'no', label: '没有' }
        ]
      },
      {
        key: 'noise',
        title: '你对宠物叫声的容忍度？',
        hint: '公寓隔音差建议选安静型',
        options: [
          { value: 'low', label: '几乎不能接受', desc: '怕吵到邻居' },
          { value: 'mid', label: '偶尔叫可以' },
          { value: 'high', label: '完全无所谓' }
        ]
      }
    ]
  },
  {
    key: 'pace',
    title: '生活方式',
    sub: '你的日常节奏很重要',
    questions: [
      {
        key: 'activity',
        title: '你的日常活动量？',
        hint: '喜欢户外的人更适合高精力犬种',
        options: [
          { value: 'low', label: '宅家为主', desc: '很少出门运动' },
          { value: 'medium', label: '偶尔运动', desc: '周末会出门走走' },
          { value: 'high', label: '每天运动', desc: '常跑步、爬山、户外' }
        ]
      },
      {
        key: 'time',
        title: '每天能陪宠物多久？',
        hint: '决定它需要多高的照料投入',
        options: [
          { value: 'lt1', label: '不到 1 小时', desc: '工作忙，只有早晚' },
          { value: '1to3', label: '1 ~ 3 小时' },
          { value: 'gt3', label: '3 小时以上', desc: '时间充裕' }
        ]
      },
      {
        key: 'companion',
        title: '你期待的相处模式？',
        hint: '性格匹配比品种更重要',
        options: [
          { value: 'clingy', label: '粘人陪伴', desc: '希望它主动亲近我' },
          { value: 'independent', label: '独立省心', desc: '各过各的也很好' },
          { value: 'any', label: '都可以' }
        ]
      }
    ]
  },
  {
    key: 'budget',
    title: '经验与预算',
    sub: '最后一步，马上出结果',
    questions: [
      {
        key: 'experience',
        title: '你的养宠经验？',
        hint: '新手会优先推荐好养品种',
        options: [
          { value: 'none', label: '第一次养', desc: '需要省心的品种' },
          { value: 'some', label: '养过 1 ~ 2 只' },
          { value: 'pro', label: '多年经验', desc: '能驾驭高难度品种' }
        ]
      },
      {
        key: 'budget',
        title: '购宠预算大概是？',
        hint: '超出预算的宠物会被直接过滤',
        options: [
          { value: '1000', label: '1000 元以内' },
          { value: '3000', label: '1000 ~ 3000 元' },
          { value: '6000', label: '3000 ~ 6000 元' },
          { value: '99999', label: '6000 元以上 / 不限' }
        ]
      },
      {
        key: 'monthly',
        title: '每月养护预算？',
        hint: '含粮、用品、医疗等日常开销',
        options: [
          { value: '200', label: '200 元以内' },
          { value: '500', label: '200 ~ 500 元' },
          { value: '1000', label: '500 ~ 1000 元' },
          { value: '99999', label: '1000 元以上 / 不限' }
        ]
      },
      {
        key: 'prefer',
        title: '有偏好的宠物类型吗？',
        hint: '选择后只在对应类别中推荐',
        options: [
          { value: 'any', label: '不限，都可以' },
          { value: '1', label: '猫咪' },
          { value: '2', label: '狗狗' },
          { value: '3', label: '兔子' },
          { value: '4', label: '仓鼠' },
          { value: '5', label: '鸟类' },
          { value: '6', label: '水族' },
          { value: '7', label: '爬行宠物' }
        ]
      }
    ]
  }
]
