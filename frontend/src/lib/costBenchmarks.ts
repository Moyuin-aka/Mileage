import type { ExpenseType, ItemWithStats } from '@/types'

export type CostBenchmarkProfile =
  | 'smartphone'
  | 'computer'
  | 'entertainment'
  | 'wearable'
  | 'gamepad'
  | 'mouse'
  | 'keyboard'

export type BenchmarkPosition = 'above' | 'within' | 'below'
export type CostBenchmarkKeywords = Record<CostBenchmarkProfile, string[]>

/** Whether a profile represents a peripheral / semi-consumable device */
export function isPeripheralProfile(profile: CostBenchmarkProfile): boolean {
  return profile === 'gamepad' || profile === 'mouse' || profile === 'keyboard'
}

export interface CostBenchmark {
  profile: CostBenchmarkProfile
  minDaily: number
  maxDaily: number
}

export interface UpgradeSignals {
  benchmark: CostBenchmark
  position: BenchmarkPosition
  drop30: number
  drop90: number
  daysToMax: number | null
  daysToMin: number | null
  latestRepair?: {
    type: ExpenseType
    amount: number
    date: string
    overResidual: boolean
  }
  /** For peripherals: whether the item has outlived its expected lifespan */
  isOverService?: boolean
  /** Days past the expected lifespan (positive = bonus days) */
  overServiceDays?: number
  /** Physical fault signals detected from recent expenses/notes */
  physicalFaults?: PhysicalFaultSignal[]
}

export interface PhysicalFaultSignal {
  keyword: string
  source: 'expense' | 'notes'
  detail?: string
}

export const COST_BENCHMARKS: Record<CostBenchmarkProfile, CostBenchmark> = {
  smartphone: { profile: 'smartphone', minDaily: 3, maxDaily: 5 },
  computer: { profile: 'computer', minDaily: 2, maxDaily: 5 },
  entertainment: { profile: 'entertainment', minDaily: 0.5, maxDaily: 1.5 },
  wearable: { profile: 'wearable', minDaily: 1, maxDaily: 2 },
  gamepad: { profile: 'gamepad', minDaily: 0.3, maxDaily: 0.8 },
  mouse: { profile: 'mouse', minDaily: 0.1, maxDaily: 0.5 },
  keyboard: { profile: 'keyboard', minDaily: 0.1, maxDaily: 0.3 },
}

export const COST_BENCHMARK_PROFILES: CostBenchmarkProfile[] = [
  'smartphone',
  'computer',
  'entertainment',
  'wearable',
  'gamepad',
  'mouse',
  'keyboard',
]

/** Profiles that belong to the "main device" group (non-peripheral) */
export const MAIN_DEVICE_PROFILES: CostBenchmarkProfile[] = [
  'smartphone',
  'computer',
  'entertainment',
  'wearable',
]

/** Profiles that belong to the "peripheral / semi-consumable" group */
export const PERIPHERAL_PROFILES: CostBenchmarkProfile[] = [
  'gamepad',
  'mouse',
  'keyboard',
]

export const DEFAULT_COST_BENCHMARK_KEYWORDS: CostBenchmarkKeywords = {
  smartphone: [
    'iPhone',
    'Pixel',
    'Galaxy',
    'Redmi',
    'Huawei',
    'Honor',
    'OnePlus',
    'OPPO',
    'Vivo',
    'Xiaomi',
    '手机',
    '小米',
    '华为',
    '荣耀',
    '一加',
  ],
  computer: [
    'MacBook',
    'iMac',
    'Mac mini',
    'ThinkPad',
    'Surface',
    'laptop',
    'desktop',
    'notebook',
    '电脑',
    '笔记本',
    '台式',
    '主机',
    '工作站',
    'PC',
  ],
  entertainment: [
    'Switch',
    'PlayStation',
    'PS5',
    'PS4',
    'Xbox',
    'Steam Deck',
    '游戏机',
    '掌机',
    'iPad',
    '平板',
    'tablet',
    'Kindle',
  ],
  wearable: [
    'AirPods',
    'earbuds',
    'buds',
    'FreeBuds',
    'LinkBuds',
    'WH-1000XM',
    'WF-1000XM',
    'Bose',
    'Beats',
    'Jabra',
    'Shokz',
    'Nothing Ear',
    'Galaxy Buds',
    '耳机',
    '耳塞',
    '耳麦',
    '头戴式',
    '降噪耳机',
    '索尼',
    '森海塞尔',
    '漫步者',
    '万魔',
    'Watch',
    '手表',
    '手环',
    'Fitbit',
    'wearable',
    'Garmin',
  ],
  gamepad: [
    'Pro Controller',
    'DualSense',
    'DualShock',
    'Xbox Controller',
    'Joy-Con',
    '手柄',
    '游戏手柄',
    'controller',
    'gamepad',
    '摇杆',
    '八位堂',
    '8BitDo',
    'Gulikit',
    'Switch Pro',
    'PS5手柄',
    'PS4手柄',
    'Xbox手柄',
    '北通',
    '飞智',
    '良值',
  ],
  mouse: [
    'MX Master',
    'MX Anywhere',
    'Magic Mouse',
    'Magic Trackpad',
    'DeathAdder',
    'Viper',
    'Basilisk',
    'Orochi',
    'Superlight',
    'G Pro',
    'G502',
    'G304',
    '鼠标',
    '罗技',
    'Logitech',
    'Razer',
    'mouse',
    '雷蛇',
    '达尔优',
    '双飞燕',
    '卓威',
    'ZOWIE',
    'Pulsar',
    'Lamzu',
    'Lethal Gaming',
    '狼蛛',
    '触控板',
    'trackpad',
  ],
  keyboard: [
    '键盘',
    'keyboard',
    'mechanical keyboard',
    '机械键盘',
    'HHKB',
    'Keychron',
    'Leopold',
    'Filco',
    'Realforce',
    'NuPhy',
    'Tofu',
    'GMMK',
    'Ducky',
    'Varmilo',
    '阿米洛',
    'Cherry',
    'MX Keys',
    'Magic Keyboard',
    '客制化键盘',
    '达尔优',
    'RK',
    '狼蛛',
    '黑爵',
    'Akko',
    '矮轴',
    '红轴',
    '茶轴',
    '青轴',
    '佳达隆',
  ],
}

/**
 * Physical fault keywords for peripherals.
 * When these appear in expense descriptions or item notes, they are
 * flagged as physical fault signals suggesting imminent replacement.
 */
const PERIPHERAL_FAULT_KEYWORDS: Record<
  'gamepad' | 'mouse' | 'keyboard',
  { keyword: string; label: string }[]
> = {
  gamepad: [
    { keyword: '漂移', label: '摇杆漂移' },
    { keyword: 'drift', label: 'Stick drift' },
    { keyword: '断触', label: '按键断触' },
    { keyword: '回弹', label: '按键回弹无力' },
    { keyword: '失灵', label: '按键失灵' },
    { keyword: '摇杆', label: '摇杆故障' },
    { keyword: 'WD40', label: '尝试修复摇杆' },
  ],
  mouse: [
    { keyword: '双击', label: '微动双击' },
    { keyword: 'double click', label: 'Double click issue' },
    { keyword: '连击', label: '微动连击' },
    { keyword: '断联', label: '拖拽断联' },
    { keyword: '发粘', label: '橡胶发粘' },
    { keyword: '脱皮', label: '表面脱皮' },
    { keyword: '微动', label: '微动老化' },
    { keyword: '滚轮', label: '滚轮故障' },
    { keyword: '蒙皮', label: '蒙皮破损' },
  ],
  keyboard: [
    { keyword: '轴体', label: '轴体更换' },
    { keyword: '卫星轴', label: '卫星轴异响' },
    { keyword: '连击', label: '按键连击' },
    { keyword: '失灵', label: '按键失灵' },
    { keyword: 'chatter', label: 'Key chatter' },
    { keyword: 'switch', label: 'Switch issue' },
    { keyword: '灯', label: 'LED故障' },
  ],
}

const COST_BENCHMARK_KEYWORDS_STORAGE_KEY = 'mileage.costBenchmarkKeywords.v1'
const REPAIR_TYPES = new Set<ExpenseType>(['repair', 'battery', 'maintenance'])

export function loadCostBenchmarkKeywords(): CostBenchmarkKeywords {
  if (typeof window === 'undefined') return DEFAULT_COST_BENCHMARK_KEYWORDS

  try {
    const saved = window.localStorage.getItem(COST_BENCHMARK_KEYWORDS_STORAGE_KEY)
    if (!saved) return DEFAULT_COST_BENCHMARK_KEYWORDS
    return normalizeCostBenchmarkKeywords(JSON.parse(saved))
  } catch {
    return DEFAULT_COST_BENCHMARK_KEYWORDS
  }
}

export function saveCostBenchmarkKeywords(keywords: CostBenchmarkKeywords) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(
    COST_BENCHMARK_KEYWORDS_STORAGE_KEY,
    JSON.stringify(normalizeCostBenchmarkKeywords(keywords)),
  )
}

export function normalizeCostBenchmarkKeywords(value: unknown): CostBenchmarkKeywords {
  const source = isRecord(value) ? value : {}

  return COST_BENCHMARK_PROFILES.reduce((result, profile) => {
    const hasSavedProfile = Object.prototype.hasOwnProperty.call(source, profile)
    const fallback = DEFAULT_COST_BENCHMARK_KEYWORDS[profile]
    const raw = hasSavedProfile ? source[profile] : fallback
    result[profile] = normalizeKeywordList(raw, fallback)
    return result
  }, {} as CostBenchmarkKeywords)
}

export function inferCostBenchmark(
  item: ItemWithStats,
  keywords: CostBenchmarkKeywords = DEFAULT_COST_BENCHMARK_KEYWORDS,
): CostBenchmark | null {
  if (item.category !== 'electronics') return null

  const text = `${item.name} ${item.notes ?? ''}`.toLowerCase()

  // Peripheral profiles are checked first (more specific)
  if (matchesAnyKeyword(text, keywords.gamepad)) {
    return COST_BENCHMARKS.gamepad
  }
  if (matchesAnyKeyword(text, keywords.mouse)) {
    return COST_BENCHMARKS.mouse
  }
  if (matchesAnyKeyword(text, keywords.keyboard)) {
    return COST_BENCHMARKS.keyboard
  }

  // Then main device profiles
  if (matchesAnyKeyword(text, keywords.wearable)) {
    return COST_BENCHMARKS.wearable
  }
  if (matchesAnyKeyword(text, keywords.entertainment)) {
    return COST_BENCHMARKS.entertainment
  }
  if (matchesAnyKeyword(text, keywords.computer)) {
    return COST_BENCHMARKS.computer
  }
  if (matchesAnyKeyword(text, keywords.smartphone)) {
    return COST_BENCHMARKS.smartphone
  }

  return null
}

export function buildUpgradeSignals(
  item: ItemWithStats,
  keywords?: CostBenchmarkKeywords,
): UpgradeSignals | null {
  const benchmark = inferCostBenchmark(item, keywords)
  if (!benchmark || item.status !== 'active') return null

  const currentDaily = item.daily_cost
  const position: BenchmarkPosition =
    currentDaily > benchmark.maxDaily
      ? 'above'
      : currentDaily < benchmark.minDaily
      ? 'below'
      : 'within'

  const totalCost = Math.max(0, item.total_cost)
  const future30 = totalCost / (item.days_owned + 30)
  const future90 = totalCost / (item.days_owned + 90)
  const latestRepair = findLatestRepairSignal(item)

  const result: UpgradeSignals = {
    benchmark,
    position,
    drop30: Math.max(0, currentDaily - future30),
    drop90: Math.max(0, currentDaily - future90),
    daysToMax: daysUntilTarget(totalCost, item.days_owned, benchmark.maxDaily),
    daysToMin: daysUntilTarget(totalCost, item.days_owned, benchmark.minDaily),
    latestRepair,
  }

  // Peripheral-specific: over-service and physical fault detection
  if (isPeripheralProfile(benchmark.profile)) {
    const expectedDays = item.expected_years ? item.expected_years * 365 : null
    if (expectedDays != null) {
      result.isOverService = item.days_owned > expectedDays
      result.overServiceDays = Math.max(0, item.days_owned - expectedDays)
    }
    result.physicalFaults = detectPhysicalFaults(
      item,
      benchmark.profile as 'gamepad' | 'mouse' | 'keyboard',
    )
  }

  return result
}

/**
 * Detect physical fault signals from expense descriptions and item notes.
 * These are the "replacement red lines" for peripherals.
 */
function detectPhysicalFaults(
  item: ItemWithStats,
  profile: 'gamepad' | 'mouse' | 'keyboard',
): PhysicalFaultSignal[] {
  const faultDefs = PERIPHERAL_FAULT_KEYWORDS[profile]
  const signals: PhysicalFaultSignal[] = []
  const seen = new Set<string>()

  // Scan expense descriptions
  for (const expense of item.expenses ?? []) {
    const desc = (expense.description ?? '').toLowerCase()
    for (const def of faultDefs) {
      if (desc.includes(def.keyword.toLowerCase()) && !seen.has(def.keyword)) {
        seen.add(def.keyword)
        signals.push({
          keyword: def.label,
          source: 'expense',
          detail: expense.description,
        })
      }
    }
  }

  // Scan notes
  const notes = (item.notes ?? '').toLowerCase()
  for (const def of faultDefs) {
    if (notes.includes(def.keyword.toLowerCase()) && !seen.has(def.keyword)) {
      seen.add(def.keyword)
      signals.push({
        keyword: def.label,
        source: 'notes',
      })
    }
  }

  return signals
}

function daysUntilTarget(totalCost: number, daysOwned: number, targetDaily: number) {
  if (targetDaily <= 0) return null
  const targetDays = Math.ceil(totalCost / targetDaily)
  return Math.max(0, targetDays - daysOwned)
}

function findLatestRepairSignal(item: ItemWithStats): UpgradeSignals['latestRepair'] {
  const latestRepair = (item.expenses ?? [])
    .filter(expense => expense.counts_in_cost && REPAIR_TYPES.has(expense.type))
    .sort((a, b) => b.expense_date.localeCompare(a.expense_date))[0]

  if (!latestRepair) return undefined

  return {
    type: latestRepair.type,
    amount: latestRepair.amount,
    date: latestRepair.expense_date,
    overResidual: item.residual_value > 0 && latestRepair.amount > item.residual_value,
  }
}

function matchesAnyKeyword(text: string, keywords: string[]) {
  return keywords.some(keyword => keywordMatches(text, keyword))
}

function keywordMatches(text: string, keyword: string) {
  const normalized = keyword.trim().toLowerCase()
  if (!normalized) return false

  if (/^[a-z0-9]{1,3}$/.test(normalized)) {
    return new RegExp(`(^|[^a-z0-9])${escapeRegExp(normalized)}([^a-z0-9]|$)`).test(text)
  }

  return text.includes(normalized)
}

function normalizeKeywordList(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback

  const seen = new Set<string>()
  const result: string[] = []

  for (const keyword of value) {
    if (typeof keyword !== 'string') continue
    const trimmed = keyword.trim()
    const key = trimmed.toLowerCase()
    if (!trimmed || seen.has(key)) continue
    seen.add(key)
    result.push(trimmed)
  }

  return result
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
