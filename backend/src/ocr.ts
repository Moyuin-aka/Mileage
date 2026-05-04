import { spawn } from 'node:child_process'
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
const OCR_SCRIPT_PATH =
  process.env.OCR_SCRIPT_PATH ?? path.resolve(process.cwd(), 'ocr/rapidocr_runner.py')
const OCR_TIMEOUT_MS = Number.parseInt(process.env.OCR_TIMEOUT_MS ?? '90000', 10)
const OCR_MAX_UPLOAD_BYTES = Number.parseInt(
  process.env.OCR_MAX_UPLOAD_BYTES ?? String(8 * 1024 * 1024),
  10,
)

export async function parseOrderImage(file: UploadedImage): Promise<OcrParseResult> {
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
  return parseOcrLines(ocrOutput.lines, ocrOutput.image)
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
    const output = await runPython(imagePath)
    return parseRunnerOutput(output)
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => undefined)
  }
}

function runPython(imagePath: string) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(OCR_PYTHON_BIN, [OCR_SCRIPT_PATH, imagePath], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        OMP_NUM_THREADS: process.env.OCR_OMP_NUM_THREADS ?? process.env.OMP_NUM_THREADS ?? '1',
      },
    })

    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      reject(new Error(`OCR timed out after ${OCR_TIMEOUT_MS}ms`))
    }, OCR_TIMEOUT_MS)

    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', chunk => {
      stdout += chunk
    })
    child.stderr.on('data', chunk => {
      stderr += chunk
    })
    child.on('error', error => {
      clearTimeout(timer)
      reject(error)
    })
    child.on('close', code => {
      clearTimeout(timer)
      if (code === 0) {
        resolve(stdout)
        return
      }

      reject(new Error(stderr.trim() || `OCR process exited with code ${code}`))
    })
  })
}

function parseRunnerOutput(output: string): RapidOcrOutput {
  const parsed = JSON.parse(output) as RapidOcrOutput
  return {
    lines: Array.isArray(parsed.lines) ? parsed.lines : [],
    image: parsed.image,
    elapsed: parsed.elapsed,
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
