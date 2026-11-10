/**
 * 预约列表 mock 数据
 *
 * 目的：把「旧版宠物预约」和「服务工单」两种来源的历史数据合到一个列表里验证新卡片。
 * 字段刻意保持后端原样（两种来源字段名不同、状态码含义不同），由 appointmentModel 适配。
 * 数据里保留了几条真实场景的脏数据，方便回归：
 *   - contactPhone = 'uygtfffffffffff'（乱码）
 *   - contactPhone = '12345'（位数不足）
 *   - contactPhone = ''（缺失）
 *   - contactPhone = '+86 133-4444-5555'（带国家码和分隔符，应能正常脱敏）
 * 时间按「今天 ± 天」生成，保证列表永远有未来单和已完成单。
 */

function at(dayOffset, hour, minute = 0) {
  const date = new Date()
  date.setDate(date.getDate() + dayOffset)
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(hour)}:${pad(minute)}:00`
}

export const MOCK_APPOINTMENTS = [
  /* ---------------- 服务工单（客户自助预约，不绑定宠物） ---------------- */
  {
    source: 'ORDER',
    serviceId: 9101,
    serviceNo: 'SV20261109001',
    petName: '奶糖',
    itemName: '全套美容（洗剪吹）',
    appointTime: at(1, 14, 0),
    storeName: '江北旗舰店',
    contactPhone: '13598765432',
    status: '0', // 待接单
    payStatus: '1',
    totalAmount: 268,
    qty: 1
  },
  {
    source: 'ORDER',
    serviceId: 9102,
    serviceNo: 'SV20261109002',
    petName: '布丁',
    itemName: '猫咪舒缓洗护',
    appointTime: at(1, 16, 30),
    storeName: '南坪协信店',
    contactPhone: 'uygtfffffffffff', // 脏数据：非手机号
    status: 0,
    payStatus: '1',
    totalAmount: 128,
    qty: 1
  },
  {
    source: 'ORDER',
    serviceId: 9103,
    serviceNo: 'SV20261108013',
    petName: '芝麻',
    itemName: '寄养（3 天）',
    appointTime: at(0, 18, 0),
    storeName: '江北旗舰店',
    contactPhone: '13787654321',
    status: 2, // 服务中
    payStatus: '1',
    totalAmount: 360,
    qty: 1
  },
  {
    source: 'ORDER',
    serviceId: 9104,
    serviceNo: 'SV20261105006',
    petName: '汤圆',
    itemName: '精致洗护套餐',
    appointTime: at(-5, 15, 0),
    storeName: '渝北龙湖店',
    contactPhone: '13912345678',
    status: 3, // 工单里 3 = 已完成（和旧版预约的 3 = 已取消不同）
    payStatus: '1',
    totalAmount: 158,
    qty: 1,
    score: 5
  },
  {
    source: 'ORDER',
    serviceId: 9105,
    serviceNo: 'SV20261028022',
    petName: '布偶',
    itemName: '上门喂养（单次）',
    appointTime: at(-10, 9, 30),
    storeName: '江北旗舰店',
    contactPhone: '13122223333',
    status: 4, // 已取消
    payStatus: '1',
    totalAmount: 88,
    qty: 1
  },
  {
    source: 'ORDER',
    serviceId: 9106,
    serviceNo: 'SV20261109003',
    petName: '豆豆',
    itemName: '洗护季卡（首次）',
    appointTime: at(4, 11, 0),
    storeName: '南坪协信店',
    contactPhone: '13233334444',
    status: 0, // 待接单且未支付
    payStatus: '0',
    totalAmount: 499,
    qty: 1
  },
  {
    source: 'ORDER',
    serviceId: 9107,
    serviceNo: 'SV20261106009',
    petName: '雪球',
    itemName: '精细美容',
    appointTime: at(5, 13, 0),
    storeName: '渝北龙湖店',
    contactPhone: '+86 133-4444-5555', // 带国家码与分隔符，应脱敏成 133****5555
    status: '1', // 已接单
    payStatus: '1',
    totalAmount: 298,
    qty: 1
  },

  /* ---- 已完成补充：正常评价 / 未评价 / 带特殊手机号格式的历史单 ---- */
  {
    source: 'ORDER',
    serviceId: 9108,
    serviceNo: 'SV20261104011',
    petName: '麻薯',
    itemName: '猫咪舒缓洗护',
    appointTime: at(-2, 14, 30),
    storeName: '南坪协信店',
    contactPhone: '13566667777',
    status: 3, // 已完成，已评价
    payStatus: '1',
    totalAmount: 128,
    qty: 1,
    score: 4
  },
  {
    source: 'ORDER',
    serviceId: 9109,
    serviceNo: 'SV20261102018',
    petName: '椰果',
    itemName: '精致洗护套餐',
    appointTime: at(-4, 10, 0),
    storeName: '江北旗舰店',
    contactPhone: '13677778888',
    status: 3, // 已完成，未评价（卡片上应出现「评价服务」）
    payStatus: '1',
    totalAmount: 158,
    qty: 1
  },
  {
    source: 'ORDER',
    serviceId: 9110,
    serviceNo: 'SV20261025009',
    petName: '布蕾',
    itemName: '全套美容（洗剪吹）',
    appointTime: at(-9, 16, 0),
    storeName: '渝北龙湖店',
    contactPhone: '+86 138-9999-0000', // 带国家码与分隔符
    status: 3,
    payStatus: '1',
    totalAmount: 268,
    qty: 1,
    score: 5
  },
  {
    source: 'ORDER',
    serviceId: 9111,
    serviceNo: 'SV20261018007',
    petName: '糯米',
    itemName: '寄养（3 天）',
    appointTime: at(-14, 9, 0),
    storeName: '南坪协信店',
    contactPhone: '13788889999',
    status: 3,
    payStatus: '1',
    totalAmount: 360,
    qty: 1
  },
  {
    source: 'ORDER',
    serviceId: 9112,
    serviceNo: 'SV20260930012',
    petName: '芋圆',
    itemName: '上门喂养（单次）',
    appointTime: at(-21, 18, 30),
    storeName: '江北旗舰店',
    contactPhone: '13811112222',
    status: 3,
    payStatus: '1',
    totalAmount: 88,
    qty: 1,
    score: 3
  },
  {
    source: 'ORDER',
    serviceId: 9113,
    serviceNo: 'SV20260920008',
    petName: '奶盖',
    itemName: '基础体检',
    appointTime: at(-28, 11, 0),
    storeName: '渝北龙湖店',
    contactPhone: '13922223333',
    status: 3,
    payStatus: '1',
    totalAmount: 98,
    qty: 1
  },

  /* ---------------- 旧版按宠物提交的预约 ---------------- */
  {
    source: 'LEGACY',
    appointmentId: 5201,
    petName: '豆豆',
    serviceName: '精致洗护',
    appointmentDate: at(2, 10, 30),
    storeName: '江北旗舰店',
    contactPhone: '13412341234',
    status: 0 // 旧版 0 = 待处理
  },
  {
    source: 'LEGACY',
    appointmentId: 5202,
    petName: '可乐',
    serviceName: '基础体检',
    appointmentDate: at(3, 9, 0),
    storeName: '南坪协信店',
    contactPhone: '13612345678',
    status: 1 // 已确认
  },
  {
    source: 'LEGACY',
    appointmentId: 5203,
    petName: '团子',
    serviceName: '猫咪洗澡',
    appointmentDate: at(-3, 11, 0),
    storeName: '江北旗舰店',
    contactPhone: '13800001111',
    status: 2 // 旧版 2 = 已完成
  },
  {
    source: 'LEGACY',
    appointmentId: 5204,
    petName: '花卷',
    serviceName: '美容修剪',
    appointmentDate: at(-8, 10, 0),
    storeName: '',
    contactPhone: '13011112222',
    status: 3 // 旧版 3 = 已取消
  },
  {
    source: 'LEGACY',
    appointmentId: 5205,
    petName: '小黑',
    serviceName: '洗澡',
    appointmentDate: at(2, 17, 0),
    storeName: '渝北龙湖店',
    contactPhone: '12345', // 脏数据：位数不足
    status: '待处理'
  },
  {
    source: 'LEGACY',
    appointmentId: 5206,
    petName: '年糕',
    serviceName: '上门接送',
    appointmentDate: at(-1, 19, 0),
    storeName: '渝北龙湖店',
    contactPhone: '', // 脏数据：缺失
    status: '已取消'
  },

  /* ---- 已完成补充（旧版来源）：正常单 / 空门店名 ---- */
  {
    source: 'LEGACY',
    appointmentId: 5207,
    petName: '焦糖',
    serviceName: '精细美容',
    appointmentDate: at(-2, 15, 30),
    storeName: '江北旗舰店',
    contactPhone: '13533334444',
    status: 2 // 旧版 2 = 已完成
  },
  {
    source: 'LEGACY',
    appointmentId: 5208,
    petName: '芝麻糊',
    serviceName: '猫咪洗澡',
    appointmentDate: at(-6, 10, 30),
    storeName: '南坪协信店',
    contactPhone: '13644445555',
    status: 2
  },
  {
    source: 'LEGACY',
    appointmentId: 5209,
    petName: '豆花儿',
    serviceName: '美容修剪',
    appointmentDate: at(-12, 14, 0),
    storeName: '',
    contactPhone: '13755556666',
    status: 2
  },
  {
    source: 'LEGACY',
    appointmentId: 5210,
    petName: '奶黄包',
    serviceName: '基础体检',
    appointmentDate: at(-18, 9, 30),
    storeName: '渝北龙湖店',
    contactPhone: '13866667777',
    status: 2
  },
  {
    source: 'LEGACY',
    appointmentId: 5211,
    petName: '汤圆儿',
    serviceName: '洗澡',
    appointmentDate: at(-25, 17, 0),
    storeName: '江北旗舰店',
    contactPhone: '13977778888',
    status: 2
  }
]
