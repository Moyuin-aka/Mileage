import {
  CostTrendPoint,
  DashboardStats,
  ExpenseFormData,
  Item,
  ItemExpense,
  ItemFormData,
  ItemWithStats,
} from '@/types'
import { getAuthToken, logout } from '@/lib/auth'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

function headers(): HeadersInit {
  const token = getAuthToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

function authHeader(): HeadersInit {
  const token = getAuthToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const isFormData = init?.body instanceof FormData
  const requestHeaders = isFormData
    ? { ...authHeader(), ...init?.headers }
    : { ...headers(), ...init?.headers }

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: requestHeaders,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    if (res.status === 401) {
      logout()
    }
    throw new Error(`API ${res.status}: ${text || res.statusText}`)
  }
  // 204 No Content
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  // ── Auth ──────────────────────────────────────────────────────────────────
  login: (password: string) =>
    request<{ token: string; expires_at: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),

  getSession: () =>
    request<{ ok: boolean }>('/api/auth/session'),

  // ── Items ─────────────────────────────────────────────────────────────────
  getItems: (status?: string) =>
    request<Item[]>(`/api/items${status ? `?status=${status}` : ''}`),

  getItem: (id: string) =>
    request<ItemWithStats>(`/api/items/${id}`),

  createItem: (data: ItemFormData) =>
    request<Item>('/api/items', { method: 'POST', body: JSON.stringify(data) }),

  updateItem: (id: string, data: Partial<ItemFormData>) =>
    request<Item>(`/api/items/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteItem: (id: string) =>
    request<void>(`/api/items/${id}`, { method: 'DELETE' }),

  retireItem: (id: string, retired_at: string) =>
    request<Item>(`/api/items/${id}/retire`, {
      method: 'PATCH',
      body: JSON.stringify({ retired_at }),
    }),

  sellItem: (id: string, sold_price: number) =>
    request<Item>(`/api/items/${id}/sell`, {
      method: 'PATCH',
      body: JSON.stringify({ sold_price }),
    }),

  getExpenses: (id: string) =>
    request<ItemExpense[]>(`/api/items/${id}/expenses`),

  createExpense: (id: string, data: ExpenseFormData) =>
    request<ItemExpense>(`/api/items/${id}/expenses`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteExpense: (id: string, expenseId: string) =>
    request<void>(`/api/items/${id}/expenses/${expenseId}`, { method: 'DELETE' }),

  // ── Stats ──────────────────────────────────────────────────────────────────
  getDashboard: () =>
    request<DashboardStats>('/api/stats/dashboard'),

  getCostTrend: (id: string) =>
    request<CostTrendPoint[]>(`/api/stats/cost-trend/${id}`),

  // ── OCR (Phase 2 placeholder) ──────────────────────────────────────────────
  parseOcr: (file: File) => {
    const form = new FormData()
    form.append('image', file)
    return request<Partial<ItemFormData>>('/api/ocr/parse', {
      method: 'POST',
      body: form,
      headers: authHeader(),
    })
  },
}
