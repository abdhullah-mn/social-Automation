export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message) }
}
export class ProviderError extends HttpError {
  constructor(public providerStatus: number, public code: string, public details: Record<string, unknown>) {
    const message = providerStatus === 401 || providerStatus === 403
      ? 'Social provider access is unavailable. Please contact the site administrator.'
      : providerStatus === 402 ? 'Social publishing is unavailable until the site administrator updates provider billing.'
      : providerStatus === 429 ? 'Social provider request limit reached. Please try again shortly.'
      : typeof details.error === 'string' ? details.error.slice(0, 500) : 'Social provider request failed. Please try again.'
    super(providerStatus >= 500 || providerStatus === 401 || providerStatus === 403 ? 502 : providerStatus, message)
  }
}

export interface ProviderAccount {
  _id: string; platform: string; username?: string; displayName?: string;
  profileId: string | { _id: string }; isActive: boolean; profilePicture?: string;
}
export interface ProviderPost {
  _id: string; status: string; scheduledFor?: string;
  platforms?: Array<{ platform: string; accountId: string | { _id: string }; status?: string;
    platformPostUrl?: string; publishedUrl?: string; errorMessage?: string }>;
}
export interface PostBody {
  content: string; platforms: Array<{ platform: string; accountId: string }>;
  mediaItems: Array<{ type: string; url: string }>; isDraft: boolean;
  publishNow?: boolean; scheduledFor?: string; timezone: string;
}

async function request<T>(path: string, method = 'GET', body?: unknown, key?: string): Promise<T> {
  const apiKey = process.env.ZERNIO_API_KEY || process.env.ZERNIO_API
  if (!apiKey?.trim()) throw new HttpError(503, 'Social connections are not configured yet.')
  let response: Response
  try {
    response = await fetch(`https://zernio.com/api/v1${path}`, {
      method, headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json',
        ...(key ? { 'Idempotency-Key': key } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(90000),
    })
  } catch { throw new HttpError(504, 'Social provider did not respond. Refresh status before retrying the same post.') }
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new ProviderError(response.status, data?.code || '', data || {})
  if (!data) throw new HttpError(502, 'Social provider returned an invalid response.')
  return data as T
}

// Small REST adapter uses the documented v1 API and never exposes the team key.
export const zernio = {
  profiles: () => request<{ profiles: Array<{ _id: string; name: string }> }>('/profiles'),
  createProfile: (name: string) => request<{ profile: { _id: string } }>('/profiles', 'POST', { name }),
  connect: (platform: string, profileId: string, redirect: string) => request<{ authUrl: string }>(
    `/connect/${platform}?${new URLSearchParams({ profileId, redirect_url: redirect })}`),
  accounts: (profileId: string) => request<{ accounts: ProviderAccount[] }>(`/accounts?${new URLSearchParams({ profileId })}`),
  disconnect: (id: string) => request(`/accounts/${encodeURIComponent(id)}`, 'DELETE'),
  createPost: (body: PostBody, key: string) => request<{ post: ProviderPost }>('/posts', 'POST', body, key),
  getPost: (id: string) => request<{ post: ProviderPost }>(`/posts/${encodeURIComponent(id)}`),
  reschedulePost: (id: string, scheduledFor: string, timezone: string) => request<{ post: ProviderPost }>(
    `/posts/${encodeURIComponent(id)}`, 'PUT', { isDraft: false, scheduledFor, timezone }),
  deletePost: (id: string) => request(`/posts/${encodeURIComponent(id)}`, 'DELETE'),
  presign: (body: { filename: string; contentType: string; size: number }) =>
    request<{ uploadUrl: string; publicUrl: string }>('/media/presign', 'POST', body),
}
