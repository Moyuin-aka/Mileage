import type { ItemCategory } from './types.js'

export interface OcrLine {
  text: string
  score?: number | null
  box?: number[][] | null
}

export interface OcrImageInfo {
  width: number
  height: number
}

export interface OcrCandidate<T> {
  value: T
  confidence: number
  source: string
  label?: string
}

export interface OcrParseResult {
  fields: {
    name?: string
    category?: ItemCategory
    purchase_price?: number
    purchase_date?: string
    purchase_channel?: string
  }
  candidates: {
    name: OcrCandidate<string>[]
    purchase_price: OcrCandidate<number>[]
    purchase_date: OcrCandidate<string>[]
    purchase_channel: OcrCandidate<string>[]
  }
  raw_text: string
  lines: OcrLine[]
}

interface ScoredLine extends OcrLine {
  normalized: string
  centerY?: number
  centerX?: number
}

const PRICE_RULES = [
  { label: '实付款', pattern: '实付款|实付金额|实际付款|实付', confidence: 0.98 },
  { label: '支付金额', pattern: '支付金额|付款金额|已付款|应付金额|应付款|实际支付', confidence: 0.94 },
  { label: '合计', pattern: '合计|订单总额|订单金额|共计|总计|共减后', confidence: 0.86 },
]

const DATE_RULES = [
  { label: '付款时间', pattern: '付款时间|支付时间|拼单时间', confidence: 0.98 },
  { label: '成交时间', pattern: '成交时间|交易时间', confidence: 0.9 },
  { label: '下单时间', pattern: '下单时间|创建时间|订单创建时间', confidence: 0.78 },
]

const CHANNEL_RULES: Array<[string, RegExp]> = [
  ['京东', /京东|JD/i],
  ['淘宝', /淘宝|Taobao/i],
  ['天猫', /天猫|Tmall/i],
  ['拼多多', /拼多多|PDD/i],
  ['Apple Store', /Apple\s*Store|苹果官网|Apple官方/i],
  ['闲鱼', /闲鱼/i],
  ['苏宁', /苏宁/i],
]

const DATE_PATTERN =
  /((?:20\d{2}|19\d{2})[年/\-.]\s*\d{1,2}[月/\-.]\s*\d{1,2}(?:日)?(?:\s+\d{1,2}:\d{1,2}(?::\d{1,2})?)?)/u

const MONEY_PATTERN = /(?:[¥￥]\s*)?([0-9][0-9,]*(?:\.\d{1,2})?)/u
const PRODUCT_BLOCKLIST =
  /订单|交易|支付|付款|实付|合计|总计|金额|时间|物流|快递|店铺|商家|客服|收货|地址|电话|发票|优惠|红包|折扣|减|退款|单号|编号|复制|完成|成功|待评价|售后|运费|数量|规格|颜色|尺码|配送|保障|服务|¥|￥/u

export function parseOcrLines(lines: OcrLine[], image?: OcrImageInfo | null): OcrParseResult {
  const scoredLines = normalizeLines(lines)
  const rawText = scoredLines.map(line => line.text).join('\n')
  const priceCandidates = uniqueCandidates(extractPriceCandidates(scoredLines), numberKey)
  const dateCandidates = uniqueCandidates(extractDateCandidates(scoredLines), candidate => candidate.value)
  const channelCandidates = uniqueCandidates(
    extractChannelCandidates(scoredLines),
    candidate => candidate.value,
  )
  const nameCandidates = uniqueCandidates(
    extractNameCandidates(scoredLines, image ?? undefined),
    candidate => candidate.value,
  )

  return {
    fields: {
      name: nameCandidates[0]?.value,
      category: nameCandidates[0] ? guessCategory(nameCandidates[0].value) : undefined,
      purchase_price: priceCandidates[0]?.value,
      purchase_date: dateCandidates[0]?.value,
      purchase_channel: channelCandidates[0]?.value,
    },
    candidates: {
      name: nameCandidates.slice(0, 5),
      purchase_price: priceCandidates.slice(0, 5),
      purchase_date: dateCandidates.slice(0, 5),
      purchase_channel: channelCandidates.slice(0, 5),
    },
    raw_text: rawText,
    lines: scoredLines.map(({ normalized, centerY, centerX, ...line }) => line),
  }
}

function normalizeLines(lines: OcrLine[]): ScoredLine[] {
  return lines
    .map(line => {
      const boxInfo = getBoxInfo(line.box)
      return {
        ...line,
        text: line.text.trim(),
        normalized: normalizeText(line.text),
        centerY: boxInfo?.centerY,
        centerX: boxInfo?.centerX,
      }
    })
    .filter(line => line.text)
    .sort((a, b) => {
      if (a.centerY != null && b.centerY != null && Math.abs(a.centerY - b.centerY) > 8) {
        return a.centerY - b.centerY
      }
      return (a.centerX ?? 0) - (b.centerX ?? 0)
    })
}

function extractPriceCandidates(lines: ScoredLine[]): Array<OcrCandidate<number>> {
  const candidates: Array<OcrCandidate<number>> = []

  for (let index = 0; index < lines.length; index += 1) {
    const windowText = windowFor(lines, index, 3)
    const compactWindow = normalizeText(windowText).replace(/\s+/g, '')

    for (const rule of PRICE_RULES) {
      const keyword = new RegExp(`(${rule.pattern})`, 'iu')
      const keywordMatch = compactWindow.match(keyword)
      if (!keywordMatch) continue

      const afterKeyword = compactWindow.slice((keywordMatch.index ?? 0) + keywordMatch[0].length)
      const amount = extractMoney(afterKeyword)
      if (amount == null) continue
      if (isDiscountContext(compactWindow)) continue

      candidates.push({
        value: amount,
        confidence: rule.confidence,
        source: windowText,
        label: rule.label,
      })
    }
  }

  // Last-resort fallback: choose the largest plausible money value on the image.
  const fallbackAmounts = lines
    .filter(line => !isDiscountContext(line.normalized))
    .flatMap(line => extractAllMoney(line.normalized).map(value => ({ value, source: line.text })))
    .filter(item => item.value >= 1)
    .sort((a, b) => b.value - a.value)

  if (fallbackAmounts[0]) {
    candidates.push({
      value: fallbackAmounts[0].value,
      confidence: 0.45,
      source: fallbackAmounts[0].source,
      label: '金额候选',
    })
  }

  return candidates.sort(sortCandidates)
}

function extractDateCandidates(lines: ScoredLine[]): Array<OcrCandidate<string>> {
  const candidates: Array<OcrCandidate<string>> = []

  for (let index = 0; index < lines.length; index += 1) {
    const windowText = windowFor(lines, index, 3)
    const compactWindow = normalizeText(windowText)

    for (const rule of DATE_RULES) {
      const keyword = new RegExp(`(${rule.pattern})`, 'iu')
      const keywordMatch = compactWindow.match(keyword)
      if (!keywordMatch) continue

      const date = extractDate(compactWindow.slice(keywordMatch.index ?? 0))
      if (!date) continue

      candidates.push({
        value: date,
        confidence: rule.confidence,
        source: windowText,
        label: rule.label,
      })
    }
  }

  const fallbackDate = lines.map(line => extractDate(line.normalized)).find(Boolean)
  if (fallbackDate) {
    candidates.push({
      value: fallbackDate,
      confidence: 0.42,
      source: fallbackDate,
      label: '日期候选',
    })
  }

  return candidates.sort(sortCandidates)
}

function extractChannelCandidates(lines: ScoredLine[]): Array<OcrCandidate<string>> {
  const rawText = lines.map(line => line.text).join('\n')
  return CHANNEL_RULES
    .filter(([, pattern]) => pattern.test(rawText))
    .map(([value]) => ({
      value,
      confidence: 0.8,
      source: value,
      label: '平台',
    }))
}

function extractNameCandidates(
  lines: ScoredLine[],
  image?: OcrImageInfo,
): Array<OcrCandidate<string>> {
  const imageHeight = image?.height
  const productLines = lines
    .filter(line => {
      const compact = line.normalized.replace(/\s+/g, '')
      if (compact.length < 4) return false
      if (PRODUCT_BLOCKLIST.test(compact)) return false
      if (/^\d+$/.test(compact)) return false
      if (imageHeight && line.centerY != null && line.centerY > imageHeight * 0.72) return false
      return /[\p{Script=Han}A-Za-z0-9]/u.test(compact)
    })
    .map((line, index) => ({ line, index }))

  const candidates: Array<OcrCandidate<string>> = []
  for (let index = 0; index < productLines.length; index += 1) {
    const current = productLines[index].line
    const next = productLines[index + 1]?.line
    const joined = shouldJoinProductLines(current, next)
      ? `${current.text} ${next?.text}`.trim()
      : current.text

    candidates.push({
      value: cleanProductName(joined),
      confidence: scoreProductName(current, imageHeight),
      source: joined,
      label: '商品名',
    })
  }

  return candidates
    .filter(candidate => candidate.value.length >= 4)
    .sort((a, b) => {
      const scoreDiff = b.confidence - a.confidence
      if (Math.abs(scoreDiff) > 0.001) return scoreDiff
      return b.value.length - a.value.length
    })
}

function windowFor(lines: ScoredLine[], start: number, count: number) {
  return lines.slice(start, start + count).map(line => line.text).join(' ')
}

function normalizeText(text: string) {
  return text
    .normalize('NFKC')
    .replace(/[：]/g, ':')
    .replace(/[，]/g, ',')
    .replace(/[。]/g, '.')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractMoney(text: string) {
  const match = text.match(MONEY_PATTERN)
  if (!match) return null
  return toMoney(match[1])
}

function extractAllMoney(text: string) {
  return Array.from(text.matchAll(/[¥￥]?\s*([0-9][0-9,]*(?:\.\d{1,2})?)/gu))
    .map(match => toMoney(match[1]))
    .filter((value): value is number => value != null)
}

function toMoney(value: string) {
  const amount = Number.parseFloat(value.replace(/,/g, ''))
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10_000_000) return null
  return Math.round(amount * 100) / 100
}

function extractDate(text: string) {
  const match = text.match(DATE_PATTERN)
  if (!match) return null

  const parts = match[1]
    .replace(/[年月/.]/g, '-')
    .replace(/日/g, '')
    .split(/\s+/)[0]
    .split('-')
    .filter(Boolean)

  if (parts.length < 3) return null
  const [year, month, day] = parts.map(part => Number.parseInt(part, 10))
  if (!isValidDate(year, month, day)) return null
  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day
    .toString()
    .padStart(2, '0')}`
}

function isValidDate(year: number, month: number, day: number) {
  if (year < 2000 || year > new Date().getFullYear() + 1) return false
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

function isDiscountContext(text: string) {
  return /优惠|红包|折扣|立减|已减|减免|返现|退款|退回|运费险/u.test(text)
}

function getBoxInfo(box?: number[][] | null) {
  if (!box?.length) return null
  const xs = box.map(point => point[0]).filter(Number.isFinite)
  const ys = box.map(point => point[1]).filter(Number.isFinite)
  if (!xs.length || !ys.length) return null
  return {
    centerX: xs.reduce((sum, value) => sum + value, 0) / xs.length,
    centerY: ys.reduce((sum, value) => sum + value, 0) / ys.length,
  }
}

function shouldJoinProductLines(current: ScoredLine, next?: ScoredLine) {
  if (!next || current.centerY == null || next.centerY == null) return false
  if (Math.abs(next.centerY - current.centerY) > 80) return false
  return `${current.text} ${next.text}`.length <= 96
}

function cleanProductName(name: string) {
  return name
    .replace(/^\s*(商品|标题|名称)[:：]\s*/u, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function scoreProductName(line: ScoredLine, imageHeight?: number) {
  const lengthScore = Math.min(line.normalized.length / 40, 1) * 0.35
  const confidenceScore = Math.min(Math.max(line.score ?? 0.8, 0), 1) * 0.35
  const positionScore =
    imageHeight && line.centerY != null
      ? Math.max(0, 1 - Math.abs(line.centerY / imageHeight - 0.38)) * 0.3
      : 0.18
  return Math.round((lengthScore + confidenceScore + positionScore) * 100) / 100
}

function guessCategory(name: string): ItemCategory {
  if (
    /手机|电脑|MacBook|iPad|iPhone|耳机|相机|镜头|键盘|鼠标|Watch|Switch|DJI|电视|平板|小米|Redmi|华为|HUAWEI|OPPO|vivo|索尼|Sony/i.test(
      name,
    )
  ) {
    return 'electronics'
  }
  if (/冰箱|洗衣机|空调|烤箱|微波炉|吸尘器|洗碗机|电饭煲/u.test(name)) {
    return 'appliances'
  }
  if (/椅|桌|床|柜|沙发|Aeron|Herman Miller/i.test(name)) {
    return 'furniture'
  }
  if (/车|自行车|电动车|摩托|滑板/u.test(name)) {
    return 'transportation'
  }
  return 'other'
}

function uniqueCandidates<T>(
  candidates: Array<OcrCandidate<T>>,
  keyFn: (candidate: OcrCandidate<T>) => string,
) {
  const seen = new Set<string>()
  return candidates.filter(candidate => {
    const key = keyFn(candidate)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function numberKey(candidate: OcrCandidate<number>) {
  return candidate.value.toFixed(2)
}

function sortCandidates<T>(a: OcrCandidate<T>, b: OcrCandidate<T>) {
  return b.confidence - a.confidence
}
