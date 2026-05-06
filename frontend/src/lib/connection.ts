const REMOTE_BASE_URL_KEY = 'mileage.remote_base_url'

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown
  }
}

export function isTauriRuntime() {
  return Boolean(
    import.meta.env.TAURI_ENV_PLATFORM ||
      (typeof window !== 'undefined' && window.__TAURI_INTERNALS__),
  )
}

export function requiresRemoteUrl() {
  return isTauriRuntime()
}

export function getRemoteBaseUrl() {
  return localStorage.getItem(REMOTE_BASE_URL_KEY) ?? ''
}

export function setRemoteBaseUrl(value: string) {
  const normalized = normalizeRemoteBaseUrl(value)
  localStorage.setItem(REMOTE_BASE_URL_KEY, normalized)
  return normalized
}

export function clearRemoteBaseUrl() {
  localStorage.removeItem(REMOTE_BASE_URL_KEY)
}

export function getRuntimeApiBaseUrl() {
  if (requiresRemoteUrl()) return getRemoteBaseUrl()
  return import.meta.env.VITE_API_BASE_URL ?? ''
}

export function hasRequiredConnectionConfig() {
  return !requiresRemoteUrl() || Boolean(getRemoteBaseUrl())
}

export function normalizeRemoteBaseUrl(value: string) {
  const trimmed = value.trim()
  if (!trimmed) throw new Error('Remote URL is required')

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`
  const url = new URL(withProtocol)

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Remote URL must start with http:// or https://')
  }

  url.hash = ''
  url.search = ''
  url.pathname = url.pathname.replace(/\/+$/, '')
  if (url.pathname === '/api') url.pathname = ''

  return url.toString().replace(/\/$/, '')
}
