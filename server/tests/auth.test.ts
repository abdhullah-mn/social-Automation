import assert from 'node:assert/strict'
import { after, before, beforeEach, mock, test } from 'node:test'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { Query } from 'mongoose'
import { createApp } from '../app.js'
import User from '../models/User.js'
import { authConfig, cookieOptions, tokenHash } from '../config/auth.js'

process.env.JWT_ACCESS_SECRET = 'test-only-access-secret'
process.env.JWT_REFRESH_SECRET = 'test-only-refresh-secret'
process.env.FRONTEND_URL = 'http://localhost:5173'
process.env.NODE_ENV = 'test'
process.env.COOKIE_SAME_SITE = 'lax'

type UserDocument = InstanceType<typeof User>
const users = new Map<string, UserDocument>()
let server: Server
let base: string
let duplicateOnSave = false

// Exercise real HTTP, middleware, schema validation, bcrypt and JWTs with
// database operations stubbed. No developer database is touched by these tests.
before(async () => {
  mock.method(User.prototype, 'save', async function (this: UserDocument) {
    await this.validate()
    if (duplicateOnSave) throw Object.assign(new Error('duplicate'), { code: 11000 })
    users.set(this._id.toString(), this)
    return this
  })
  mock.method(Query.prototype, 'exec', async function (this: {
    op: string; getFilter(): Record<string, unknown>; getUpdate(): unknown
  }) {
    const filter = this.getFilter()
    const user = [...users.values()].find((candidate) =>
      (!filter._id || candidate._id.toString() === String(filter._id)) &&
      (!filter.email || candidate.email === filter.email) &&
      (!filter.refreshTokens || candidate.refreshTokens.includes(String(filter.refreshTokens))))
    if (this.op === 'findOne') return user || null
    const update = this.getUpdate() as {
      $set?: { 'refreshTokens.$': string }
      $push?: { refreshTokens: { $each: string[]; $slice: number } }
      $pull?: { refreshTokens: string }
    }
    if (user && update.$set) {
      const index = user.refreshTokens.indexOf(String(filter.refreshTokens))
      user.refreshTokens[index] = update.$set['refreshTokens.$']
    }
    if (user && update.$push) {
      user.refreshTokens = [...user.refreshTokens, ...update.$push.refreshTokens.$each]
        .slice(update.$push.refreshTokens.$slice)
    }
    if (user && update.$pull) {
      user.refreshTokens = user.refreshTokens.filter((value) => value !== update.$pull!.refreshTokens)
    }
    if (this.op === 'findOneAndUpdate') return user || null
    if (this.op === 'updateOne') return { acknowledged: true, matchedCount: user ? 1 : 0 }
    throw new Error(`Unstubbed database operation: ${this.op}`)
  })
  server = createApp().listen(0, '127.0.0.1')
  await new Promise<void>((resolve) => server.once('listening', resolve))
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/auth`
})

beforeEach(() => { users.clear(); duplicateOnSave = false })
after(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  mock.restoreAll()
})

async function post(path: string, body: unknown = {}, cookie?: string) {
  return fetch(`${base}/${path}`, { method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: process.env.FRONTEND_URL!,
      ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify(body) })
}
function cookie(response: Response) {
  const value = response.headers.get('set-cookie')
  assert.ok(value)
  return value.split(';')[0]
}
const registration = { name: ' Test User ', email: 'TEST@Example.com ', password: 'valid-password' }

test('registration stores a password hash and token digest and returns a safe user', async () => {
  const response = await post('register', registration)
  assert.equal(response.status, 201)
  const body = await response.json()
  assert.deepEqual(body.user, { id: body.user.id, name: 'Test User', email: 'test@example.com' })
  assert.ok(body.accessToken)
  const saved = users.get(body.user.id)!
  assert.ok(await bcrypt.compare(registration.password, saved.passwordHash))
  assert.deepEqual(saved.refreshTokens, [tokenHash(cookie(response).split('=')[1])])
  assert.match(response.headers.get('set-cookie')!, /HttpOnly/)
  assert.match(response.headers.get('set-cookie')!, /SameSite=Lax/)
  assert.doesNotMatch(response.headers.get('set-cookie')!, /Secure/)
  assert.equal(response.headers.get('access-control-allow-credentials'), 'true')
  assert.equal(response.headers.get('cache-control'), 'no-store')
})

test('login, me, refresh rotation, replay rejection and logout work together', async () => {
  await post('register', registration)
  assert.equal((await post('login', { ...registration, password: 'wrong-password' })).status, 401)
  const login = await post('login', registration)
  assert.equal(login.status, 200)
  const body = await login.json()
  const me = await fetch(`${base}/me`, { headers: { Authorization: `Bearer ${body.accessToken}` } })
  assert.equal(me.status, 200)
  assert.deepEqual((await me.json()).user, body.user)
  const original = cookie(login)
  const refreshed = await post('refresh', {}, `unrelated=value; ${original}`)
  assert.equal(refreshed.status, 200)
  const rotated = cookie(refreshed)
  assert.notEqual(rotated, original)
  assert.equal((await post('refresh', {}, original)).status, 401)
  const logout = await post('logout', {}, rotated)
  assert.equal(logout.status, 200)
  assert.match(logout.headers.get('set-cookie')!, /Expires=Thu, 01 Jan 1970/)
  assert.equal((await post('refresh', {}, rotated)).status, 401)
  assert.equal((await post('logout')).status, 200)
})

test('invalid input, duplicate emails and duplicate-key races return JSON errors', async () => {
  for (const input of [null, {}, { ...registration, name: ' ' },
    { ...registration, email: { $ne: null } }, { ...registration, password: 'short' },
    { ...registration, password: 'é'.repeat(37) }]) {
    assert.equal((await post('register', input)).status, 400)
  }
  assert.equal((await post('register', registration)).status, 201)
  assert.equal((await post('register', registration)).status, 409)
  users.clear()
  duplicateOnSave = true
  assert.equal((await post('register', registration)).status, 409)
})

test('missing, malformed, expired and wrong-kind tokens are rejected', async () => {
  assert.equal((await fetch(`${base}/me`)).status, 401)
  assert.equal((await post('refresh')).status, 401)
  assert.equal((await post('refresh', {}, 'refreshToken=%broken')).status, 401)
  const registered = await post('register', registration)
  const body = await registered.json()
  for (const token of ['invalid', cookie(registered).split('=')[1],
    jwt.sign({ id: body.user.id, kind: 'access' }, process.env.JWT_ACCESS_SECRET!, { expiresIn: -1 }),
    jwt.sign({ id: 'bad-id', kind: 'access' }, process.env.JWT_ACCESS_SECRET!)]) {
    assert.equal((await fetch(`${base}/me`, { headers: { Authorization: `Bearer ${token}` } })).status, 401)
  }
  const expired = jwt.sign({ id: body.user.id, kind: 'refresh' }, process.env.JWT_REFRESH_SECRET!, { expiresIn: -1 })
  assert.equal((await post('refresh', {}, `refreshToken=${expired}`)).status, 401)
  users.clear()
  assert.equal((await fetch(`${base}/me`, { headers: { Authorization: `Bearer ${body.accessToken}` } })).status, 401)
})

test('unexpected origins and malformed JSON are rejected', async () => {
  const blocked = await fetch(`${base}/logout`, { method: 'POST', headers: { Origin: 'https://untrusted.example' } })
  assert.equal(blocked.status, 403)
  const malformed = await fetch(`${base}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' })
  assert.equal(malformed.status, 400)
  assert.deepEqual(await malformed.json(), { message: 'Invalid JSON body' })
})

test('configuration enforces separate secrets and production-only cross-site cookies', () => {
  const oldSecret = process.env.JWT_REFRESH_SECRET
  try {
    process.env.JWT_REFRESH_SECRET = process.env.JWT_ACCESS_SECRET
    assert.throws(authConfig, /distinct/)
    process.env.JWT_REFRESH_SECRET = oldSecret
    process.env.COOKIE_SAME_SITE = 'none'
    assert.throws(authConfig, /HTTPS/)
    process.env.NODE_ENV = 'production'
    assert.deepEqual(cookieOptions(), { httpOnly: true, secure: true, sameSite: 'none', path: '/' })
  } finally {
    process.env.JWT_REFRESH_SECRET = oldSecret
    process.env.NODE_ENV = 'test'
    process.env.COOKIE_SAME_SITE = 'lax'
  }
})
