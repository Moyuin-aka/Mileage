import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { parseOcrLines, type OcrImageInfo, type OcrLine, type OcrParseResult } from './ocrParser.js'
import { ValidationError } from './validation.js'

export interface RapidOcrOutput {
  lines: OcrLine[]
  image?: OcrImageInfo | null
  elapsed?: number
}

const OCR_PYTHON_BIN = process.env.OCR_PYTHON_BIN ?? 'python3'
const OCR_WORKER_SCRIPT_PATH =
  process.env.OCR_WORKER_SCRIPT_PATH ?? path.resolve(process.cwd(), 'ocr/rapidocr_worker.py')
const OCR_TIMEOUT_MS = Number.parseInt(process.env.OCR_TIMEOUT_MS ?? '90000', 10)
const OCR_MAX_UPLOAD_BYTES = Number.parseInt(
  process.env.OCR_MAX_UPLOAD_BYTES ?? String(8 * 1024 * 1024),
  10,
)

export async function parseOrderImage(file: UploadedImage): Promise<OcrParseResult> {
  const startedAt = Date.now()
  if (!file.type.startsWith('image/')) {
    throw new ValidationError(['OCR only accepts image uploads'])
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  if (!buffer.byteLength) {
    throw new ValidationError(['OCR image cannot be empty'])
  }
  if (buffer.byteLength > OCR_MAX_UPLOAD_BYTES) {
    throw new ValidationError([`OCR image must be smaller than ${OCR_MAX_UPLOAD_BYTES} bytes`])
  }

  const ocrOutput = await runRapidOcr(buffer, extensionFor(file))
  const result = parseOcrLines(ocrOutput.lines, ocrOutput.image)
  console.info(
    `OCR completed in ${Date.now() - startedAt}ms, engine ${Math.round(
      (ocrOutput.elapsed ?? 0) * 1000,
    )}ms, lines ${ocrOutput.lines.length}`,
  )
  return result
}

export async function warmOcrWorker() {
  await waitForWorkerReady()
}

export function shutdownOcrWorker() {
  stopWorker(new Error('OCR worker stopped'))
}

export function isUploadedImage(value: unknown): value is UploadedImage {
  return (
    typeof value === 'object' &&
    value !== null &&
    'arrayBuffer' in value &&
    typeof (value as { arrayBuffer?: unknown }).arrayBuffer === 'function' &&
    'type' in value &&
    typeof (value as { type?: unknown }).type === 'string'
  )
}

async function runRapidOcr(buffer: Buffer, extension: string): Promise<RapidOcrOutput> {
  const workDir = path.join(tmpdir(), `mileage-ocr-${randomUUID()}`)
  const imagePath = path.join(workDir, `upload${extension}`)

  await mkdir(workDir, { recursive: true })

  try {
    await writeFile(imagePath, buffer)
    return await runPythonWorker(imagePath)
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => undefined)
  }
}

interface WorkerMessage extends RapidOcrOutput {
  id?: string | null
  ok?: boolean
  ready?: boolean
  error?: string
}

interface PendingRequest {
  resolve: (value: RapidOcrOutput) => void
  reject: (error: Error) => void
  timer: NodeJS.Timeout
}

let worker: ChildProcessWithoutNullStreams | null = null
let workerReady = false
let workerBuffer = ''
const pendingRequests = new Map<string, PendingRequest>()
const readyWaiters: Array<{ resolve: () => void; reject: (error: Error) => void }> = []

function runPythonWorker(imagePath: string) {
  return new Promise<RapidOcrOutput>((resolve, reject) => {
    const child = ensureWorker()
    const id = randomUUID()
    const timer = setTimeout(() => {
      pendingRequests.delete(id)
      restartWorker(new Error(`OCR timed out after ${OCR_TIMEOUT_MS}ms`))
      reject(new Error(`OCR timed out after ${OCR_TIMEOUT_MS}ms`))
    }, OCR_TIMEOUT_MS)

    pendingRequests.set(id, { resolve, reject, timer })
    child.stdin.write(`${JSON.stringify({ id, image_path: imagePath })}\n`, error => {
      if (!error) return
      clearTimeout(timer)
      pendingRequests.delete(id)
      reject(error)
    })
  })
}

function waitForWorkerReady() {
  if (workerReady) return Promise.resolve()

  ensureWorker()
  return new Promise<void>((resolve, reject) => {
    readyWaiters.push({ resolve, reject })
  })
}

function ensureWorker() {
  if (worker && !worker.killed) return worker

  workerReady = false
  workerBuffer = ''
  worker = spawn(OCR_PYTHON_BIN, [OCR_WORKER_SCRIPT_PATH], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      OMP_NUM_THREADS: process.env.OCR_OMP_NUM_THREADS ?? process.env.OMP_NUM_THREADS ?? '1',
    },
  })

  worker.stdout.setEncoding('utf8')
  worker.stderr.setEncoding('utf8')
  worker.stdout.on('data', chunk => {
    workerBuffer += chunk
    drainWorkerOutput()
  })
  worker.stderr.on('data', chunk => {
    console.error(`[ocr] ${chunk.trim()}`)
  })
  worker.on('error', error => {
    stopWorker(error)
  })
  worker.on('close', code => {
    stopWorker(new Error(`OCR worker exited with code ${code ?? 'unknown'}`))
  })

  return worker
}

function drainWorkerOutput() {
  let newlineIndex = workerBuffer.indexOf('\n')
  while (newlineIndex >= 0) {
    const rawLine = workerBuffer.slice(0, newlineIndex).trim()
    workerBuffer = workerBuffer.slice(newlineIndex + 1)
    if (rawLine) {
      try {
        handleWorkerMessage(JSON.parse(rawLine) as WorkerMessage)
      } catch (error) {
        console.error('[ocr] Invalid worker output', error)
      }
    }
    newlineIndex = workerBuffer.indexOf('\n')
  }
}

function handleWorkerMessage(message: WorkerMessage) {
  if (message.ready) {
    workerReady = true
    const waiters = readyWaiters.splice(0)
    for (const waiter of waiters) waiter.resolve()
    return
  }

  if (!message.id) return
  const pending = pendingRequests.get(message.id)
  if (!pending) return
  pendingRequests.delete(message.id)
  clearTimeout(pending.timer)

  if (message.ok) {
    pending.resolve({
      lines: Array.isArray(message.lines) ? message.lines : [],
      image: message.image,
      elapsed: message.elapsed,
    })
    return
  }

  pending.reject(new Error(message.error || 'OCR worker failed'))
}

function restartWorker(error: Error) {
  const currentWorker = worker
  stopWorker(error)
  currentWorker?.kill('SIGKILL')
}

function stopWorker(error: Error) {
  const currentWorker = worker
  worker = null
  workerReady = false
  workerBuffer = ''

  for (const request of pendingRequests.values()) {
    clearTimeout(request.timer)
    request.reject(error)
  }
  pendingRequests.clear()

  const waiters = readyWaiters.splice(0)
  for (const waiter of waiters) waiter.reject(error)

  if (currentWorker && !currentWorker.killed) {
    currentWorker.kill()
  }
}

function extensionFor(file: UploadedImage) {
  if (file.type === 'image/png') return '.png'
  if (file.type === 'image/webp') return '.webp'
  if (file.type === 'image/heic') return '.heic'
  return '.jpg'
}

interface UploadedImage {
  type: string
  arrayBuffer: () => Promise<ArrayBuffer>
}
