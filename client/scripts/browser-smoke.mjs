import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { readFile, mkdtemp, rm, mkdir, writeFile, access } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve, join, extname, sep } from 'node:path'
import { once } from 'node:events'

// Native Chrome DevTools smoke test of the built frontend, with a fake API.
// No external social API or developer database is used.
const dist = resolve('dist')
const candidates = [process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean)
let executable
for (const path of candidates) { try { await access(path); executable = path; break } catch {} }
if (!executable) throw new Error('Set CHROME_PATH to a Chrome/Edge executable')
await access(join(dist, 'index.html'))
const profileRoot = resolve(tmpdir())
const profile = await mkdtemp(join(profileRoot, 'social-browser-test-'))
const user = { id: 'a'.repeat(24), name: 'Browser Test', email: 'browser@example.com' }
const accounts = [0, 1].map((i) => ({ id: String(i + 1).repeat(24), username: `My account ${i + 1}`, platformId: 'linkedin', status: 'Connected', connectedAt: new Date().toISOString() }))
const posts = []
let refreshes = 0
let currentToken = 'initial-token'
let connectedPlatform = ''
const errors = []
let origin
const server = createServer(async (req, res) => {
  try {
    const path = new URL(req.url, 'http://localhost').pathname
    const reply = (status, body, headers = {}) => { res.writeHead(status, { 'Content-Type': 'application/json', ...headers }); res.end(JSON.stringify(body)) }
    if (path === '/api/auth/refresh') {
      refreshes++
      return req.headers.cookie?.includes('test-session=yes') ? reply(200, { user, accessToken: currentToken }) : reply(401, { message: 'No session' })
    }
    if (path === '/api/auth/login') return reply(200, { user, accessToken: currentToken }, { 'Set-Cookie': 'test-session=yes; Path=/; HttpOnly; SameSite=Lax' })
    if (path === '/api/auth/logout') return reply(200, { message: 'Logged out' }, { 'Set-Cookie': 'test-session=; Path=/; Max-Age=0; HttpOnly' })
    if (path.startsWith('/api/')) {
      if (req.headers.authorization !== `Bearer ${currentToken}`) return reply(401, { message: 'Token expired' })
      if (path === '/api/accounts') return reply(200, { accounts })
      if (path === '/api/accounts/sync') return reply(200, { accounts })
      if (path.startsWith('/api/accounts/connect/')) {
        connectedPlatform = path.split('/').at(-1)
        return reply(200, { authUrl: `${origin}/oauth-placeholder` })
      }
      if (path === '/api/posts' && req.method === 'POST') {
        const chunks = []; for await (const chunk of req) chunks.push(chunk)
        const payload = JSON.parse(Buffer.concat(chunks).toString())
        assert.deepEqual(payload.accountIds, [accounts[0].id])
        const post = { ...payload, id: 'f'.repeat(24), mediaItems: [], status: 'published', createdAt: new Date().toISOString(), results: [{ platform: 'linkedin', accountId: 'provider-account', status: 'published', url: 'https://example.com/test-post' }] }
        posts.push(post); return reply(201, { post })
      }
      if (path === '/api/posts') return reply(200, { posts })
      return reply(404, { message: 'No fixture route' })
    }
    if (path === '/oauth-placeholder') { res.end('OAuth redirect reached'); return }
    let file = resolve(dist, `.${decodeURIComponent(path)}`)
    if (!file.startsWith(dist + sep) || !extname(file)) file = join(dist, 'index.html')
    const bytes = await readFile(file)
    res.setHeader('Content-Type', ({ '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg' })[extname(file)] || 'text/html')
    res.end(bytes)
  } catch (error) {
    if (error.code === 'ENOENT') { res.writeHead(404); res.end('Not found'); return }
    errors.push(error); res.writeHead(500); res.end('Smoke fixture error')
  }
})
server.listen(0, '127.0.0.1'); await once(server, 'listening')
origin = `http://127.0.0.1:${server.address().port}`
const browser = spawn(executable, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] })
let socket
try {
  const endpoint = await new Promise((resolveEndpoint, reject) => {
    const timer = setTimeout(() => reject(new Error('Chrome did not start')), 20000)
    browser.once('error', reject)
    browser.stderr.on('data', (chunk) => { const match = chunk.toString().match(/DevTools listening on (ws:\/\/\S+)/); if (match) { clearTimeout(timer); resolveEndpoint(match[1]) } })
  })
  socket = new WebSocket(endpoint)
  await new Promise((r, reject) => { socket.addEventListener('open', r, { once: true }); socket.addEventListener('error', reject, { once: true }) })
  let sequence = 0
  const pending = new Map()
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data)
    if (message.id && pending.has(message.id)) {
      const { resolve: accept, reject } = pending.get(message.id); pending.delete(message.id)
      if (message.error) reject(new Error(message.error.message)); else accept(message.result)
    }
  })
  const send = (method, params = {}, sessionId) => new Promise((accept, reject) => {
    const id = ++sequence; pending.set(id, { resolve: accept, reject }); socket.send(JSON.stringify({ id, method, params, sessionId }))
  })
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
  const command = (method, params = {}) => send(method, params, sessionId)
  await command('Page.enable')
  await command('Network.enable')
  await command('Network.setBlockedURLs', { urls: ['*fonts.googleapis.com*', '*fonts.gstatic.com*'] })
  const evaluate = async (expression) => {
    const result = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text)
    return result.result.value
  }
  const waitFor = async (expression) => {
    for (let attempt = 0; attempt < 100; attempt++) { if (await evaluate(expression)) return; await new Promise((r) => setTimeout(r, 100)) }
    throw new Error(`Browser assertion timed out: ${expression}`)
  }
  const click = (text) => evaluate(`Array.from(document.querySelectorAll('button,a')).find(e => e.textContent.trim() === ${JSON.stringify(text)}).click()`)
  const fill = (selector, value, textarea = false) => evaluate(`(() => { const input = document.querySelector(${JSON.stringify(selector)}); Object.getOwnPropertyDescriptor(${textarea ? 'HTMLTextAreaElement' : 'HTMLInputElement'}.prototype, 'value').set.call(input, ${JSON.stringify(value)}); input.dispatchEvent(new Event('input', { bubbles: true })); })()`)
  await command('Page.navigate', { url: origin + '/scheduler' })
  await waitFor(`location.pathname === '/login' && !!document.querySelector('input[type=email]')`)
  await fill('input[type=email]', user.email); await fill('input[type=password]', 'test-password')
  await evaluate(`document.querySelector('form button[type=submit]').click()`)
  await waitFor(`location.pathname === '/scheduler' && document.querySelectorAll('input[type=checkbox]').length === 2`)
  await fill('textarea', 'Browser smoke post', true)
  await evaluate(`document.querySelector('input[type=checkbox]').click()`)
  await click('Publish now')
  await waitFor(`document.body.innerText.includes('View published post')`)
  assert.equal(posts.length, 1)
  await mkdir('artifacts', { recursive: true })
  const screenshot = await command('Page.captureScreenshot', { format: 'png' })
  await writeFile('artifacts/browser-smoke.png', Buffer.from(screenshot.data, 'base64'))
  const beforeRefresh = refreshes
  currentToken = 'rotated-token'
  await click('Refresh list')
  await waitFor(`!document.querySelector('button').disabled`)
  for (let attempt = 0; attempt < 50 && refreshes === beforeRefresh; attempt++) await new Promise((r) => setTimeout(r, 100))
  assert.equal(refreshes, beforeRefresh + 1, 'concurrent API 401s should share one refresh')
  await command('Page.reload')
  await waitFor(`location.pathname === '/scheduler' && document.body.innerText.includes('View published post')`)
  await click('Social Accounts')
  await waitFor(`document.body.innerText.includes('Connect an account')`)
  await click('LinkedIn')
  await waitFor(`document.body.innerText.includes('OAuth redirect reached')`)
  assert.equal(connectedPlatform, 'linkedin')
  await command('Page.navigate', { url: origin + '/scheduler' })
  await waitFor(`document.body.innerText.includes('Sign Out')`)
  await click('Sign Out')
  await waitFor(`location.pathname === '/'`)
  await command('Page.navigate', { url: origin + '/scheduler' })
  await waitFor(`location.pathname === '/login'`)
  assert.equal(errors.length, 0, errors.map((error) => error.message).join('\n'))
  console.log('PASS: protected routes, login, selected-account publishing, shared refresh, reload restoration, OAuth redirect, logout.')
} finally {
  socket?.close(); browser.kill()
  server.closeAllConnections(); await new Promise((r) => server.close(r))
  await new Promise((r) => setTimeout(r, 1000))
  assert.ok(resolve(profile).startsWith(profileRoot + sep + 'social-browser-test-'))
  await rm(profile, { recursive: true, force: true, maxRetries: 4, retryDelay: 500 })
}
