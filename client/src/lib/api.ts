export interface SessionUser { id: string; name: string; email: string }
interface Session { user: SessionUser | null; status: 'loading' | 'ready' | 'error'; error?: string }
const base = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')
let token: string | null = null
let session: Session = { user: null, status: 'loading' }
let epoch = 0
let refreshPromise: Promise<void> | null = null
let initialized = false
const listeners = new Set<() => void>()
export const sessionSnapshot = () => session
export const subscribeSession = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
function setSession(value: Session) { session = value; listeners.forEach((listener) => listener()) }
export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) { super(message); this.status = status }
}
async function json<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new ApiError(response.status, body?.message || `Request failed (${response.status})`)
  if (!body) throw new Error('The server returned an invalid response.')
  return body as T
}
export function refreshSession(): Promise<void> {
  if (refreshPromise) return refreshPromise
  const currentEpoch = epoch
  const refresh = async () => {
    try {
      const response = await fetch(`${base}/auth/refresh`, { method: 'POST', credentials: 'include' })
      if (currentEpoch !== epoch) return
      if (response.status === 401) {
        token = null; setSession({ user: null, status: 'ready' }); return
      }
      const body = await json<{ user: SessionUser; accessToken: string }>(response)
      if (currentEpoch !== epoch) return
      token = body.accessToken; setSession({ user: body.user, status: 'ready' })
    } catch (error) {
      if (currentEpoch === epoch) setSession({ user: null, status: 'error', error: error instanceof Error ? error.message : 'Unable to restore session' })
      throw error
    }
  }
  // Coordinate rotating cookies across tabs when Web Locks are available.
  refreshPromise = (navigator.locks ? navigator.locks.request('social-session-refresh', refresh) : refresh())
    .finally(() => { refreshPromise = null })
  return refreshPromise
}
export function initializeSession() {
  if (!initialized) { initialized = true; void refreshSession().catch(() => {}) }
}
export async function signIn(mode: 'login' | 'register', body: { name?: string; email: string; password: string }) {
  if (refreshPromise) await refreshPromise.catch(() => {})
  const response = await fetch(`${base}/auth/${mode}`, { method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const result = await json<{ user: SessionUser; accessToken: string }>(response)
  epoch++; initialized = true; token = result.accessToken; setSession({ user: result.user, status: 'ready' })
}
export async function signOut() {
  if (refreshPromise) await refreshPromise.catch(() => {})
  await json(await fetch(`${base}/auth/logout`, { method: 'POST', credentials: 'include' }))
  epoch++; token = null; setSession({ user: null, status: 'ready' })
}
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const request = () => fetch(`${base}${path}`, { ...init, credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init.headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) } })
  const usedToken = token
  let response = await request()
  if (response.status === 401) {
    if (usedToken === token) await refreshSession()
    if (!token) throw new ApiError(401, 'Please sign in to continue.')
    response = await request()
  }
  return json<T>(response)
}

export interface SocialAccount { id: string; platformId: string; username: string; connectedAt: string; status: 'Connected' | 'Disconnected' }
export interface UploadedMedia { id: string; filename: string; url: string; type: 'image' | 'video' }
export interface SocialPost {
  id: string; requestId: string; content: string; accountIds: string[]; mediaIds: string[];
  mediaItems: Array<{ filename: string; url: string; type: string }>;
  mode: 'draft' | 'now' | 'schedule'; scheduledFor?: string; timezone: string; status: string; error?: string; createdAt: string;
  results: Array<{ platform: string; accountId: string; status: string; url?: string; error?: string }>;
}
export async function uploadMedia(file: File): Promise<UploadedMedia> {
  const signed = await api<{ id: string; uploadUrl: string }>('/posts/media/presign', { method: 'POST',
    body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size }) })
  const response = await fetch(signed.uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file })
  if (!response.ok) throw new Error(`Upload failed for ${file.name}. Please try again.`)
  return (await api<{ media: UploadedMedia }>(`/posts/media/${signed.id}/confirm`, { method: 'POST' })).media
}
