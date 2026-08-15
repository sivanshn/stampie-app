import { Platform } from 'react-native'

/**
 * API-Client für die Stampie-Betriebs-App.
 *
 * - Web-Vorschau (am selben PC): localhost:3000.
 * - Handy: die LAN-IP deines PCs (Handy erreicht "localhost" NICHT). Der Dev-Server zeigt
 *   sie beim Start als "Network: http://X.X.X.X:3000" an. Handy + PC im gleichen WLAN.
 */
// Öffentliche Backend-Adresse (Vercel) — wird im ECHTEN App-Build (TestFlight/Store) genutzt.
const PROD_URL = 'https://stemply-xi.vercel.app'
// Nur für lokale Entwicklung (Expo Go am Handy): die LAN-IP deines PCs im gleichen WLAN.
const DEV_LAN_IP = 'http://10.18.95.25:3000'

// __DEV__ ist true beim `expo start`/Expo Go, und automatisch false im gebauten Release.
export const API_BASE_URL = __DEV__
  ? Platform.OS === 'web'
    ? 'http://localhost:3000'
    : DEV_LAN_IP
  : PROD_URL

export interface ApiResult<T> {
  ok: boolean
  status: number
  data: T | null
  error: string | null
}

async function request<T>(
  path: string,
  method: 'GET' | 'POST',
  body?: unknown,
  token?: string | null,
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    let json: any = null
    try {
      json = await res.json()
    } catch {
      json = null
    }
    return {
      ok: res.ok,
      status: res.status,
      data: res.ok ? (json as T) : null,
      error: res.ok ? null : (json?.error ?? `Fehler ${res.status}`),
    }
  } catch {
    return { ok: false, status: 0, data: null, error: 'Keine Verbindung zum Server.' }
  }
}

export interface LoginResponse {
  token: string
  mustChangePassword: boolean
}
export interface MeResponse {
  username: string | null
  name: string | null
  org: { id: string; name: string }
  role: string
  mustChangePassword: boolean
}
export interface StampResponse {
  ok: boolean
  serial: string
  stamps: number
  stampGoal: number
  completesCard: boolean
}
export interface CardOption {
  id: string
  name: string
  programName: string
  stampGoal: number
  isPublished: boolean
}
export interface IssueResponse {
  serial: string
  url: string
  stampGoal: number
}

export const api = {
  login: (username: string, password: string) =>
    request<LoginResponse>('/api/app/login', 'POST', { username, password }),
  me: (token: string) => request<MeResponse>('/api/app/me', 'GET', undefined, token),
  changePassword: (token: string, newPassword: string) =>
    request<{ ok: boolean }>('/api/app/change-password', 'POST', { newPassword }, token),
  stamp: (token: string, scanned: string) =>
    request<StampResponse>('/api/app/stamp', 'POST', { scanned }, token),
  listCards: (token: string) =>
    request<{ cards: CardOption[] }>('/api/app/cards', 'GET', undefined, token),
  issueCard: (token: string, cardId: string) =>
    request<IssueResponse>('/api/app/cards/issue', 'POST', { cardId }, token),
}
