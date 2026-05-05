import { serve } from '@hono/node-server'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'
import type { Context } from 'hono'
import type { ExpenseInput, FxConversionInput, ItemInput } from './types.js'
import { mapExpense, mapItem, pool } from './db.js'
import { convertFx, normalizeFxInput } from './fx.js'
import { runMigrations } from './migrations.js'
import { isUploadedImage, parseOrderImage, shutdownOcrWorker, warmOcrWorker } from './ocr.js'
import { computeItemStats, generateCostTrend, todayDateOnly } from './stats.js'
import {
  normalizeExpenseInput,
  normalizeItemInput,
  type NormalizedExpenseInput,
  type NormalizedItemInput,
  ValidationError,
} from './validation.js'

const APP_PASSWORD = process.env.APP_PASSWORD
const SESSION_SECRET = process.env.SESSION_SECRET ?? process.env.API_TOKEN
const SESSION_TTL_SECONDS = Number.parseInt(process.env.SESSION_TTL_SECONDS ?? '2592000', 10)
const PORT = Number.parseInt(process.env.PORT ?? '8080', 10)
const DEFAULT_SECRETS = new Set([
  'change-this-token',
  'replace-with-a-long-random-token',
  'replace-with-a-login-password',
])

if (
  !APP_PASSWORD ||
  DEFAULT_SECRETS.has(APP_PASSWORD)
) {
  throw new Error('APP_PASSWORD is required and must not be the default value')
}

if (
  !SESSION_SECRET ||
  DEFAULT_SECRETS.has(SESSION_SECRET)
) {
  throw new Error('SESSION_SECRET or API_TOKEN is required and must not be the default value')
}

if (!Number.isFinite(SESSION_TTL_SECONDS) || SESSION_TTL_SECONDS <= 0) {
  throw new Error('SESSION_TTL_SECONDS must be a positive number')
}

const requiredAppPassword = APP_PASSWORD
const requiredSessionSecret = SESSION_SECRET

const app = new Hono()

app.use(
  '*',
  cors({
    origin: '*',
    allowHeaders: ['Authorization', 'Content-Type'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  }),
)

app.get('/health', async c => {
  const result = await pool.query('SELECT 1 AS ok')
  return c.json({ ok: result.rows[0]?.ok === 1 })
})

app.post('/api/auth/login', async c => {
  const body = await readJson<{ password?: unknown }>(c)
  const password = typeof body.password === 'string' ? body.password : ''

  if (!safeEqual(password, requiredAppPassword)) {
    return c.json({ error: 'Invalid password' }, 401)
  }

  const session = createSessionToken()
  return c.json(session)
})

app.use('/api/*', async (c, next) => {
  const header = c.req.header('Authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!verifySessionToken(token)) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  await next()
})

app.get('/api/auth/session', c => {
  return c.json({ ok: true })
})

app.get('/api/items', async c => {
  const status = c.req.query('status')
  const params: unknown[] = []
  let where = 'deleted_at IS NULL'

  if (status) {
    params.push(status)
    where += ` AND status = $${params.length}`
  }

  const result = await pool.query(
    itemSelectSql(where),
    params,
  )

  return c.json(result.rows.map(mapItem))
})

app.get('/api/items/:id', async c => {
  const item = await findItem(c.req.param('id'))
  if (!item) return c.json({ error: 'Item not found' }, 404)
  const expenses = await listExpenses(item.id)
  return c.json(computeItemStats({ ...item, expenses }))
})

app.post('/api/items', async c => {
  const body = await readJson<ItemInput>(c)
  const input = normalizeItemInput(body)
  const item = await insertItem(input)
  return c.json(item, 201)
})

app.put('/api/items/:id', async c => {
  const existing = await findItem(c.req.param('id'))
  if (!existing) return c.json({ error: 'Item not found' }, 404)

  const body = await readJson<ItemInput>(c)
  const input = normalizeItemInput(body, existing)
  const item = await updateItem(existing.id, input)
  return c.json(item)
})

app.delete('/api/items/:id', async c => {
  const result = await pool.query(
    `UPDATE items
     SET deleted_at = NOW()
     WHERE id = $1 AND deleted_at IS NULL`,
    [c.req.param('id')],
  )

  if (result.rowCount === 0) return c.json({ error: 'Item not found' }, 404)
  return c.body(null, 204)
})

app.get('/api/items/:id/expenses', async c => {
  const item = await findItem(c.req.param('id'))
  if (!item) return c.json({ error: 'Item not found' }, 404)
  return c.json(await listExpenses(item.id))
})

app.post('/api/items/:id/expenses', async c => {
  const item = await findItem(c.req.param('id'))
  if (!item) return c.json({ error: 'Item not found' }, 404)

  const body = await readJson<ExpenseInput>(c)
  const input = normalizeExpenseInput(body)
  if (input.expense_date < item.purchase_date) {
    throw new ValidationError(['expense_date cannot be before purchase_date'])
  }
  const expense = await insertExpense(item.id, input)
  return c.json(expense, 201)
})

app.delete('/api/items/:id/expenses/:expenseId', async c => {
  const item = await findItem(c.req.param('id'))
  if (!item) return c.json({ error: 'Item not found' }, 404)

  const result = await pool.query(
    `DELETE FROM item_expenses
     WHERE id = $1 AND item_id = $2`,
    [c.req.param('expenseId'), item.id],
  )

  if (result.rowCount === 0) return c.json({ error: 'Expense not found' }, 404)
  return c.body(null, 204)
})

app.patch('/api/items/:id/retire', async c => {
  const existing = await findItem(c.req.param('id'))
  if (!existing) return c.json({ error: 'Item not found' }, 404)

  const body = await readJson<ItemInput>(c)
  const input = normalizeItemInput(
    {
      ...existing,
      status: 'retired',
      retired_at: body.retired_at ?? todayDateOnly(),
    },
    existing,
  )
  const item = await updateItem(existing.id, input)
  return c.json(item)
})

app.patch('/api/items/:id/sell', async c => {
  const existing = await findItem(c.req.param('id'))
  if (!existing) return c.json({ error: 'Item not found' }, 404)

  const body = await readJson<ItemInput>(c)
  const input = normalizeItemInput(
    {
      ...existing,
      status: 'sold',
      sold_at: body.sold_at ?? todayDateOnly(),
      sold_price: body.sold_price,
    },
    existing,
  )
  const item = await updateItem(existing.id, input)
  return c.json(item)
})

app.get('/api/stats/dashboard', async c => {
  const result = await pool.query(
    itemSelectSql('i.deleted_at IS NULL'),
  )
  const items = result.rows.map(mapItem)
  const withStats = items.map(computeItemStats)
  const active = withStats.filter(item => item.status === 'active')

  return c.json({
    total_items: items.length,
    active_count: active.length,
    retired_count: items.filter(item => item.status === 'retired').length,
    sold_count: items.filter(item => item.status === 'sold').length,
    total_invested: items.reduce(
      (sum, item) => sum + item.purchase_price + (item.expense_total ?? 0),
      0,
    ),
    total_expenses: items.reduce((sum, item) => sum + (item.expense_total ?? 0), 0),
    avg_daily_cost: active.length
      ? active.reduce((sum, item) => sum + item.daily_cost, 0) / active.length
      : 0,
    items: withStats,
  })
})

app.get('/api/stats/cost-trend/:id', async c => {
  const item = await findItem(c.req.param('id'))
  if (!item) return c.json({ error: 'Item not found' }, 404)

  const futureDays = Number.parseInt(c.req.query('future_days') ?? '365', 10)
  const maxPoints = Number.parseInt(c.req.query('max_points') ?? '120', 10)

  return c.json(generateCostTrend(item, futureDays, maxPoints))
})

app.post('/api/ocr/parse', async c => {
  const body = await c.req.parseBody()
  const image = body.image
  if (!isUploadedImage(image)) {
    throw new ValidationError(['Field "image" is required'])
  }

  try {
    return c.json(await parseOrderImage(image))
  } catch (error) {
    if (error instanceof ValidationError) throw error
    console.error(error)
    return c.json({ error: 'OCR failed', detail: errorMessage(error) }, 503)
  }
})

app.post('/api/fx/convert', handleFxConvert)
app.post('/api/fx/mastercard/convert', handleFxConvert)

async function handleFxConvert(c: Context) {
  const body = await readJson<FxConversionInput>(c)
  const input = normalizeFxInput(body)

  try {
    return c.json(await convertFx(input))
  } catch (error) {
    return c.json(
      { error: 'FX conversion failed', detail: errorMessage(error) },
      502,
    )
  }
}

app.onError((error, c) => {
  if (error instanceof ValidationError) {
    return c.json({ error: 'Validation failed', issues: error.issues }, 400)
  }

  if (error instanceof HTTPException) {
    return error.getResponse()
  }

  console.error(error)
  return c.json({ error: 'Internal server error' }, 500)
})

await runMigrations()

void warmOcrWorker()
  .then(() => {
    console.log('OCR worker ready')
  })
  .catch(error => {
    console.error('OCR worker failed to warm up', error)
  })

serve({ fetch: app.fetch, port: PORT }, info => {
  console.log(`Mileage API listening on http://localhost:${info.port}`)
})

process.once('SIGINT', shutdown)
process.once('SIGTERM', shutdown)

function shutdown() {
  shutdownOcrWorker()
  process.exit(0)
}

async function readJson<T>(c: Context): Promise<T> {
  try {
    return await c.req.json<T>()
  } catch {
    throw new ValidationError(['Request body must be valid JSON'])
  }
}

function createSessionToken() {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
  const payload = Buffer.from(
    JSON.stringify({
      iat: Math.floor(Date.now() / 1000),
      exp: expiresAt,
    }),
  ).toString('base64url')
  const signature = signPayload(payload)

  return {
    token: `${payload}.${signature}`,
    expires_at: new Date(expiresAt * 1000).toISOString(),
  }
}

function verifySessionToken(token: string) {
  const [payload, signature, rest] = token.split('.')
  if (!payload || !signature || rest) return false

  const expectedSignature = signPayload(payload)
  if (!safeEqual(signature, expectedSignature)) return false

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      exp?: unknown
    }
    return typeof data.exp === 'number' && data.exp > Math.floor(Date.now() / 1000)
  } catch {
    return false
  }
}

function signPayload(payload: string) {
  return createHmac('sha256', requiredSessionSecret).update(payload).digest('base64url')
}

function safeEqual(a: string, b: string) {
  const aBuffer = Buffer.from(a)
  const bBuffer = Buffer.from(b)
  if (aBuffer.length !== bBuffer.length) return false
  return timingSafeEqual(aBuffer, bBuffer)
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown OCR error'
}

async function findItem(id: string) {
  const result = await pool.query(
    itemSelectSql('i.id = $1 AND i.deleted_at IS NULL'),
    [id],
  )
  return result.rows[0] ? mapItem(result.rows[0]) : null
}

function itemSelectSql(where: string) {
  return `SELECT i.*, COALESCE(expenses.expense_total, 0) AS expense_total
          FROM items i
          LEFT JOIN (
            SELECT item_id, SUM(amount) AS expense_total
            FROM item_expenses
            WHERE counts_in_cost = true
            GROUP BY item_id
          ) expenses ON expenses.item_id = i.id
          WHERE ${where}
          ORDER BY i.purchase_date DESC, i.created_at DESC`
}

async function insertItem(input: NormalizedItemInput) {
  const result = await pool.query(
    `INSERT INTO items (
       name,
       category,
       purchase_price,
       purchase_currency,
       purchase_original_amount,
       fx_rate,
       fx_rate_date,
       fx_bank_fee,
       fx_source,
       purchase_date,
       expected_years,
       residual_value,
       purchase_channel,
       status,
       retired_at,
       sold_at,
       sold_price,
       notes,
       image_url
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
     RETURNING *`,
    inputValues(input),
  )
  return mapItem(result.rows[0])
}

async function listExpenses(itemId: string) {
  const result = await pool.query(
    `SELECT *
     FROM item_expenses
     WHERE item_id = $1
     ORDER BY expense_date DESC, created_at DESC`,
    [itemId],
  )
  return result.rows.map(mapExpense)
}

async function insertExpense(itemId: string, input: NormalizedExpenseInput) {
  const result = await pool.query(
    `INSERT INTO item_expenses (
       item_id,
       type,
       amount,
       expense_date,
       description,
       counts_in_cost
     )
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      itemId,
      input.type,
      input.amount,
      input.expense_date,
      input.description,
      input.counts_in_cost,
    ],
  )
  return mapExpense(result.rows[0])
}

async function updateItem(id: string, input: NormalizedItemInput) {
  const result = await pool.query(
    `UPDATE items
     SET
       name = $2,
       category = $3,
       purchase_price = $4,
       purchase_currency = $5,
       purchase_original_amount = $6,
       fx_rate = $7,
       fx_rate_date = $8,
       fx_bank_fee = $9,
       fx_source = $10,
       purchase_date = $11,
       expected_years = $12,
       residual_value = $13,
       purchase_channel = $14,
       status = $15,
       retired_at = $16,
       sold_at = $17,
       sold_price = $18,
       notes = $19,
       image_url = $20
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING *`,
    [id, ...inputValues(input)],
  )
  return mapItem(result.rows[0])
}

function inputValues(input: NormalizedItemInput) {
  return [
    input.name,
    input.category,
    input.purchase_price,
    input.purchase_currency,
    input.purchase_original_amount,
    input.fx_rate,
    input.fx_rate_date,
    input.fx_bank_fee,
    input.fx_source,
    input.purchase_date,
    input.expected_years,
    input.residual_value,
    input.purchase_channel,
    input.status,
    input.retired_at,
    input.sold_at,
    input.sold_price,
    input.notes,
    input.image_url,
  ]
}
