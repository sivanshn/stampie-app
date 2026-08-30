import { Platform } from 'react-native'

/**
 * API-Client für die Stampie-Betriebs-App.
 *
 * - Web-Vorschau (am selben PC): localhost:3000.
 * - Handy: die LAN-IP deines PCs (Handy erreicht "localhost" NICHT). Der Dev-Server zeigt
 *   sie beim Start als "Network: http://X.X.X.X:3000" an. Handy + PC im gleichen WLAN.
 */
// Öffentliche Backend-Adresse (Vercel) — wird im ECHTEN App-Build (TestFlight/Store) genutzt.
const PROD_URL = 'https://stampie-backend.vercel.app'
// Für Expo Go/Emulator: nutze die erreichbare Backend-Adresse.
// Lokales Backend wäre im Android-Emulator z.B. http://10.0.2.2:3000.
const DEV_URL = PROD_URL

// __DEV__ ist true beim `expo start`/Expo Go, und automatisch false im gebauten Release.
export const API_BASE_URL = __DEV__
  ? Platform.OS === 'web'
    ? 'http://localhost:3000'
    : DEV_URL
  : PROD_URL

export interface ApiResult<T> {
  ok: boolean
  status: number
  data: T | null
  error: string | null
  /**
   * Maschinenlesbarer Grund einer Ablehnung, wie ihn das Backend mitschickt
   * ('card_deleted', 'not_found', 'forbidden', 'full', 'cooldown', 'rate_limited', …).
   *
   * Der Text allein reicht der Kasse nicht: „gelöscht" heißt „hör auf zu scannen", „gerade
   * eben gestempelt" heißt „warte kurz". Das darf die App nicht am Wortlaut festmachen.
   */
  code: string | null
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
      code: res.ok ? null : (typeof json?.code === 'string' ? json.code : null),
    }
  } catch {
    return {
      ok: false,
      status: 0,
      data: null,
      error: 'Keine Verbindung zum Server.',
      code: 'offline',
    }
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
  /** Wirklich gebuchte Stempel — am Kartenziel gedeckelt, kann unter der Anfrage liegen. */
  booked: number
  completesCard: boolean
}

/** Mehr als das ist an der Kasse ein Vertipper; der Server deckelt genauso. */
export const MAX_STAMPS_PER_BOOKING = 10
export interface CardOption {
  id: string
  name: string
  programName: string
  stampGoal: number
  isPublished: boolean
  /** Ob der Ausgabe-Link dieser Karte schon existiert; sonst entsteht er beim ersten Mal. */
  hasHandout: boolean
}

/**
 * Der Ausgabe-QR einer Karte.
 *
 * `url` zeigt auf `/k/<code>` — die Seite, die dem Telefon des Kunden seinen eigenen Pass
 * baut und Apple und Google Wallet anbietet. Derselbe Link steckt auf den NFC-Chips.
 */
export interface HandoutResponse {
  cardId: string
  cardName: string
  url: string
  stampGoal: number
}

export const api = {
  login: (username: string, password: string) =>
    request<LoginResponse>('/api/app/login', 'POST', { username, password }),
  me: (token: string) => request<MeResponse>('/api/app/me', 'GET', undefined, token),
  changePassword: (token: string, newPassword: string) =>
    request<{ ok: boolean }>('/api/app/change-password', 'POST', { newPassword }, token),
  stamp: (token: string, scanned: string, count = 1) =>
    request<StampResponse>('/api/app/stamp', 'POST', { scanned, count }, token),
  listCards: (token: string) =>
    request<{ cards: CardOption[] }>('/api/app/cards', 'GET', undefined, token),
  issueCard: (token: string, cardId: string) =>
    request<HandoutResponse>('/api/app/cards/issue', 'POST', { cardId }, token),
}
