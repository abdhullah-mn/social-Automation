import assert from 'node:assert/strict'
import { after, before, beforeEach, mock, test } from 'node:test'
import { createHmac, randomUUID } from 'node:crypto'
import mongoose, { Document, Query, type Model } from 'mongoose'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { createApp } from '../app.js'
import { createAccessToken } from '../config/auth.js'
import { HttpError, zernio, type PostBody, type ProviderAccount, type ProviderPost } from '../config/zernio.js'
import User from '../models/User.js'
import { Account } from '../models/Account.js'
import { Post } from '../models/Post.js'
import { Media } from '../models/Media.js'

process.env.JWT_ACCESS_SECRET = 'test-access'
process.env.JWT_REFRESH_SECRET = 'test-refresh'
process.env.FRONTEND_URL = 'http://localhost:5173'
process.env.NODE_ENV = 'test'
process.env.ZERNIO_WEBHOOK_SECRET = 'test-webhook-secret'

// HTTP integration tests use real Mongoose documents/validation, with in-memory
// persistence and a fake provider. No live accounts or developer data are modified.
const db = new Map<string, Map<string, Document>>()
const liveDatabase = process.env.SOCIAL_TEST_MONGO_URI
const testDatabaseName = `sa_test_${randomUUID().replace(/-/g, '').slice(0, 24)}`
const profiles: Array<{ _id: string; name: string }> = []
const remoteAccounts: ProviderAccount[] = []
const remotePosts = new Map<string, ProviderPost>()
const submissions: Array<{ body: PostBody; key: string }> = []
const publishedByKey = new Map<string, ProviderPost>()
let disconnects = 0
let simulateTimeout = false
let mismatchAccounts = false
let partial = false
let server: Server
let base: string
let userA: string
let userB: string
const table = (name: string) => { if (!db.has(name)) db.set(name, new Map()); return db.get(name)! }
const equal = (a: unknown, b: unknown) => String(a) === String(b)
function matches(doc: Document, filter: Record<string, unknown>): boolean {
  return Object.entries(filter).every(([key, value]) => {
    if (key === '$or') return (value as Record<string, unknown>[]).some((f) => matches(doc, f))
    const actual: unknown = doc.get(key)
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date) && !('_bsontype' in value)) {
      const ops = value as Record<string, unknown>
      if ('$exists' in ops) return (actual !== undefined && actual !== null) === ops.$exists
      if ('$in' in ops) return (ops.$in as unknown[]).some((v) => equal(actual, v))
      if ('$nin' in ops) return !(ops.$nin as unknown[]).some((v) => equal(actual, v))
      if ('$lt' in ops) return actual instanceof Date && actual.getTime() < (ops.$lt as Date).getTime()
    }
    return equal(actual, value)
  })
}
function update(doc: Document, changes: Record<string, Record<string, unknown>>) {
  for (const [key, value] of Object.entries(changes.$set || {})) doc.set(key, value)
  for (const key of Object.keys(changes.$unset || {})) doc.set(key, undefined)
}
before(async () => {
  if (liveDatabase) {
    try { await mongoose.connect(liveDatabase, { dbName: testDatabaseName, serverSelectionTimeoutMS: 15000 }) }
    catch { throw new Error('Isolated MongoDB test database could not be reached') }
    await Promise.all([User.init(), Account.init(), Post.init(), Media.init()])
  } else {
  for (const model of [User, Account, Post, Media]) {
    const name = model.modelName
    mock.method(model, 'create', async function (this: Model<unknown>, data: Record<string, unknown>) {
      return new this(data).save()
    })
    mock.method(model.prototype, 'save', async function (this: Document) {
      if (!this.get('createdAt')) this.set('createdAt', new Date())
      this.set('updatedAt', new Date())
      await this.validate()
      table(name).set(String(this._id), this)
      return this
    })
  }
  mock.method(Query.prototype, 'exec', async function (this: {
    op: string; model: Model<unknown>; getFilter(): Record<string, unknown>;
    getUpdate(): unknown; getOptions(): { upsert?: boolean }
  }) {
    const records = table(this.model.modelName)
    const found = [...records.values()].filter((doc) => matches(doc, this.getFilter()))
    if (this.op === 'find') return found
    if (this.op === 'findOne') return found[0] || null
    const changes = this.getUpdate() as Record<string, Record<string, unknown>>
    let doc = found[0]
    if (!doc && this.getOptions().upsert) {
      doc = new this.model(this.getFilter())
      doc.set('createdAt', new Date())
      records.set(String(doc._id), doc)
    }
    if (this.op === 'updateMany') found.forEach((item) => update(item, changes))
    else if (doc) update(doc, changes)
    if (doc) await doc.validate()
    if (this.op === 'findOneAndUpdate') return doc || null
    if (['updateOne', 'updateMany'].includes(this.op)) return { acknowledged: true, matchedCount: found.length }
    throw new Error(`Unstubbed ${this.op}`)
  })
  }
  mock.method(zernio, 'profiles', async () => ({ profiles: [...profiles] }))
  mock.method(zernio, 'createProfile', async (name: string) => {
    const profile = { _id: `profile_${profiles.length}`, name }; profiles.push(profile); return { profile }
  })
  mock.method(zernio, 'connect', async (platform: string, profileId: string, redirect: string) =>
    ({ authUrl: `https://provider.example/connect?${new URLSearchParams({ platform, profileId, redirect })}` }))
  mock.method(zernio, 'accounts', async (profileId: string) => ({ accounts: remoteAccounts.filter((a) => mismatchAccounts || a.profileId === profileId) }))
  mock.method(zernio, 'disconnect', async () => { disconnects++; return {} })
  mock.method(zernio, 'createPost', async (body: PostBody, key: string) => {
    submissions.push({ body, key })
    let post = publishedByKey.get(key)
    if (!post) {
      post = { _id: `remote_${publishedByKey.size}`, status: body.publishNow ? (partial ? 'partial' : 'published') : 'scheduled',
        platforms: body.platforms.map((p, i) => ({ ...p, status: partial && i ? 'failed' : 'published',
          ...(partial && i ? { errorMessage: 'Reconnect this account' } : { platformPostUrl: 'https://example.com/post' }) })) }
      publishedByKey.set(key, post); remotePosts.set(post._id, post)
    }
    if (simulateTimeout) { simulateTimeout = false; throw new HttpError(504, 'Provider timed out') }
    return { post }
  })
  mock.method(zernio, 'getPost', async (id: string) => ({ post: remotePosts.get(id)! }))
  mock.method(zernio, 'reschedulePost', async (id: string, scheduledFor: string) => {
    const post = remotePosts.get(id)!; post.scheduledFor = scheduledFor; return { post }
  })
  mock.method(zernio, 'deletePost', async (id: string) => { remotePosts.delete(id); return {} })
  server = createApp().listen(0, '127.0.0.1')
  await new Promise<void>((resolve) => server.once('listening', resolve))
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`
})
beforeEach(async () => {
  if (liveDatabase) await Promise.all([User.deleteMany({}), Account.deleteMany({}), Post.deleteMany({}), Media.deleteMany({})])
  db.clear(); profiles.length = 0; remoteAccounts.length = 0; submissions.length = 0
  remotePosts.clear(); publishedByKey.clear(); disconnects = 0; simulateTimeout = false; mismatchAccounts = false; partial = false
  profiles.push({ _id: 'default_shared', name: 'Default' })
  userA = String((await User.create({ name: 'A', email: 'a@example.com', passwordHash: 'fixture', zernioProfileId: 'default_shared' }))._id)
  userB = String((await User.create({ name: 'B', email: 'b@example.com', passwordHash: 'fixture', zernioProfileId: 'default_shared' }))._id)
})
after(async () => {
  if (server) await new Promise<void>((resolve) => server.close(() => resolve()))
  mock.restoreAll()
  if (liveDatabase && mongoose.connection.readyState === 1) {
    // Never drop the application database: only this run's generated test database.
    assert.match(testDatabaseName, /^sa_test_[a-f\d]{24}$/)
    assert.equal(mongoose.connection.db!.databaseName, testDatabaseName)
    try { await mongoose.connection.db!.dropDatabase() }
    finally { await mongoose.disconnect() }
  }
})

async function request(user: string, path: string, method = 'GET', body?: unknown) {
  return fetch(base + path, { method, headers: { Authorization: `Bearer ${createAccessToken(user)}`, 'Content-Type': 'application/json', Origin: process.env.FRONTEND_URL! },
    body: body === undefined ? undefined : JSON.stringify(body) })
}
async function connect(user: string, platform = 'linkedin') {
  const response = await request(user, `/accounts/connect/${platform}`, 'POST')
  assert.equal(response.status, 200)
  const url = new URL((await response.json()).authUrl)
  const profileId = url.searchParams.get('profileId')!
  assert.equal(url.searchParams.get('redirect'), 'http://localhost:5173/accounts?connection=returned')
  const account = { _id: `account_${remoteAccounts.length}`, platform, profileId, username: `user_${remoteAccounts.length}`, isActive: true }
  remoteAccounts.push(account)
  const synced = await request(user, '/accounts/sync', 'POST')
  assert.equal(synced.status, 200)
  return (await synced.json()).accounts.find((a: { username: string }) => a.username === account.username).id as string
}
const body = (ids: string[], overrides: Record<string, unknown> = {}) => ({ requestId: randomUUID(), content: 'A real post', accountIds: ids, mediaIds: [], mode: 'now', timezone: 'UTC', ...overrides })

test('two users receive distinct profiles; multiple accounts on one platform remain distinct', async () => {
  await connect(userA); await connect(userA); await connect(userB)
  assert.equal(profiles.length, 3)
  assert.notEqual((await User.findById(userA))!.zernioProfileId, (await User.findById(userB))!.zernioProfileId)
  assert.equal((await (await request(userA, '/accounts')).json()).accounts.length, 2)
  assert.equal((await (await request(userB, '/accounts')).json()).accounts.length, 1)
})

test('cross-user publishing, disconnection and post access are denied', async () => {
  const a = await connect(userA); const b = await connect(userB)
  assert.equal((await request(userA, '/posts', 'POST', body([b]))).status, 403)
  assert.equal(submissions.length, 0)
  assert.equal((await request(userA, `/accounts/${b}`, 'DELETE')).status, 404)
  assert.equal(disconnects, 0)
  const created = await request(userB, '/posts', 'POST', body([b]))
  assert.equal(created.status, 201)
  const id = (await created.json()).post.id
  assert.equal((await request(userA, `/posts/${id}/refresh`, 'POST')).status, 404)
  assert.equal((await request(userA, `/posts/${id}`, 'DELETE')).status, 404)
  assert.equal((await (await request(userA, '/posts')).json()).posts.length, 0)
  assert.equal((await request(userA, '/posts', 'POST', body([a]))).status, 201)
})

test('provider responses with another profile are rejected before persistence or publishing', async () => {
  const a = await connect(userA); await connect(userB); mismatchAccounts = true
  assert.equal((await request(userA, '/accounts/sync', 'POST')).status, 502)
  assert.equal((await request(userA, '/posts', 'POST', body([a]))).status, 502)
  assert.equal(submissions.length, 0)
})

test('a timed-out publish is retried with the same namespaced idempotency key', async () => {
  const account = await connect(userA)
  const payload = body([account])
  simulateTimeout = true
  assert.equal((await request(userA, '/posts', 'POST', payload)).status, 504)
  const retry = await request(userA, '/posts', 'POST', payload)
  assert.equal(retry.status, 201)
  assert.equal((await retry.json()).post.status, 'published')
  assert.equal(publishedByKey.size, 1)
  assert.equal(submissions[0].key, `${userA}:${payload.requestId}`)
  assert.equal(submissions[0].key, submissions[1].key)
  assert.equal((await request(userA, '/posts', 'POST', { ...payload, content: 'changed' })).status, 409)
})

test('partial publishing preserves individual results instead of reporting success', async () => {
  const first = await connect(userA); const second = await connect(userA, 'facebook'); partial = true
  const response = await request(userA, '/posts', 'POST', body([first, second]))
  assert.equal(response.status, 201)
  const post = (await response.json()).post
  assert.equal(post.status, 'partial')
  assert.equal(post.results[1].status, 'failed')
  assert.equal(post.results[1].error, 'Reconnect this account')
})

test('past schedules, disconnected accounts and Instagram without media cannot publish', async () => {
  const linkedin = await connect(userA)
  assert.equal((await request(userA, '/posts', 'POST', body([linkedin], { mode: 'schedule', scheduledFor: '2020-01-01T00:00:00Z' }))).status, 400)
  remoteAccounts[0].isActive = false
  assert.equal((await request(userA, '/posts', 'POST', body([linkedin]))).status, 403)
  const instagram = await connect(userA, 'instagram')
  assert.equal((await request(userA, '/posts', 'POST', body([instagram]))).status, 400)
  assert.equal(submissions.length, 0)
})

test('media ownership is checked and drafts remain local without publishing', async () => {
  const a = await connect(userA)
  const media = await Media.create({ user: userB, filename: 'test.jpg', contentType: 'image/jpeg', size: 100, url: 'https://example.com/image.jpg', ready: true })
  assert.equal((await request(userA, '/posts', 'POST', body([a], { mediaIds: [String(media._id)] }))).status, 403)
  assert.equal((await request(userA, `/posts/media/${media._id}/confirm`, 'POST')).status, 404)
  const draft = await request(userA, '/posts', 'POST', body([], { mode: 'draft' }))
  assert.equal(draft.status, 201)
  assert.equal((await draft.json()).post.status, 'draft')
  assert.equal(submissions.length, 0)
})

test('scheduled posts can be cancelled while published posts cannot', async () => {
  const a = await connect(userA)
  const scheduled = await request(userA, '/posts', 'POST', body([a], { mode: 'schedule', scheduledFor: new Date(Date.now() + 3600000).toISOString() }))
  const id = (await scheduled.json()).post.id
  const changedTime = new Date(Date.now() + 7200000).toISOString()
  assert.equal((await request(userB, `/posts/${id}/schedule`, 'PATCH', { scheduledFor: changedTime, timezone: 'UTC' })).status, 404)
  const changed = await request(userA, `/posts/${id}/schedule`, 'PATCH', { scheduledFor: changedTime, timezone: 'UTC' })
  assert.equal(changed.status, 200)
  assert.equal((await changed.json()).post.scheduledFor, changedTime)
  const cancelled = await request(userA, `/posts/${id}`, 'DELETE')
  assert.equal(cancelled.status, 200)
  assert.equal((await cancelled.json()).post.status, 'cancelled')
  const published = (await (await request(userA, '/posts', 'POST', body([a]))).json()).post
  assert.equal((await request(userA, `/posts/${published.id}`, 'DELETE')).status, 409)
})

test('webhooks require signatures and reconcile only the known post owner', async () => {
  const a = await connect(userA)
  const created = await request(userA, '/posts', 'POST', body([a], { mode: 'schedule', scheduledFor: new Date(Date.now() + 3600000).toISOString() }))
  const localId = (await created.json()).post.id
  const remote = [...remotePosts.values()][0]; remote.status = 'published'
  const payload = JSON.stringify({ event: 'post.published', post: { id: remote._id } })
  const headers = { 'Content-Type': 'application/json' }
  assert.equal((await fetch(base + '/webhooks/zernio', { method: 'POST', headers, body: payload })).status, 401)
  const signature = createHmac('sha256', process.env.ZERNIO_WEBHOOK_SECRET!).update(payload).digest('hex')
  const good = await fetch(base + '/webhooks/zernio', { method: 'POST', headers: { ...headers, 'X-Zernio-Signature': signature }, body: payload })
  assert.equal(good.status, 200)
  assert.equal((await Post.findById(localId))!.status, 'published')
  assert.equal((await (await request(userB, '/posts')).json()).posts.length, 0)
})
