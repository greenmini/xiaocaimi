/**
 * 分类体系 — 大类 + 子类
 * 小财迷 · Categories
 */

const SUBCATS = {
  expense: {
    '餐饮': ['groceries','restaurants','snacks','bakery'],
    '交通': ['fuel','parking','transit','taxi'],
    '购物': ['clothing','electronics','gifts'],
    '娱乐': ['travel','streaming','events','hobbies'],
    '医疗': ['pharmacy','insurance','fitness','beauty'],
    '教育': ['courses','supplies','languages'],
    '住房': ['rent','utilities','internet','maintenance','cleaning'],
    '通讯': [],
    '投资': ['investments','bank_fees','other_insurance','taxes'],
    '其他': [],
  },
  income: {
    '工资': [],
    '奖金': [],
    '投资': ['investments'],
    '退款': [],
    '其他': [],
  }
};

const SUBCAT_LABELS = {
  groceries:' groceries','restaurants':'餐厅酒吧','snacks':'小吃快餐','bakery':'面包烘焙',
  fuel:'加油','parking':'停车过路','transit':'公共交通','taxi':'打车',
  clothing:'服饰鞋包','electronics':'数码电子','gifts':'礼物',
  travel:'旅行','streaming':'订阅会员','events':'活动','hobbies':'兴趣爱好',
  pharmacy:'药品','insurance':'医保','fitness':'健身运动','beauty':'美容护肤',
  courses:'课程培训','supplies':'学习用品','languages':'语言学习',
  rent:'房租房贷','utilities':'水电煤','internet':'网费话费','maintenance':'装修维修','cleaning':'保洁',
  investments:'投资理财','bank_fees':'银行手续费','other_insurance':'其他保险','taxes':'税费',
};

function getSubcatLabel(key) { return SUBCAT_LABELS[key] || key; }
