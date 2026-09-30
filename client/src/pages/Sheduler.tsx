import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Calendar, Send, RefreshCw, X } from 'lucide-react'
import { api, uploadMedia, type SocialAccount, type SocialPost, type UploadedMedia } from '../lib/api'

const button = 'rounded-lg px-4 py-2 border border-slate-200 text-sm disabled:opacity-50 hover:bg-slate-50'
type Mode = 'draft' | 'now' | 'schedule'
interface Submission { requestId: string; content: string; accountIds: string[]; mediaIds: string[]; mode: Mode; scheduledFor?: string; timezone: string }

export default function Scheduler() {
  const location = useLocation()
  const [content, setContent] = useState(() => typeof location.state?.content === 'string' ? location.state.content : '')
  const [accounts, setAccounts] = useState<SocialAccount[]>([])
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [accountIds, setAccountIds] = useState<string[]>([])
  const [media, setMedia] = useState<UploadedMedia[]>([])
  const [schedule, setSchedule] = useState(() => typeof location.state?.schedule === 'string' ? location.state.schedule : '')
  const [busy, setBusy] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [pending, setPending] = useState<Submission | null>(null)
  const [reschedulingId, setReschedulingId] = useState('')
  const [rescheduleTime, setRescheduleTime] = useState('')
  const submitting = useRef(false)
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

  useEffect(() => {
    let active = true
    Promise.all([api<{ accounts: SocialAccount[] }>('/accounts'), api<{ posts: SocialPost[] }>('/posts')])
      .then(([a, p]) => { if (active) { setAccounts(a.accounts); setPosts(p.posts) } })
      .catch((failure: Error) => { if (active) setError(failure.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  function upsert(post: SocialPost) { setPosts((current) => [post, ...current.filter((p) => p.id !== post.id)]) }
  async function refreshList() {
    setBusy('refresh'); setError('')
    try {
      const [p, a] = await Promise.all([api<{ posts: SocialPost[] }>('/posts'), api<{ accounts: SocialAccount[] }>('/accounts')])
      setPosts(p.posts); setAccounts(a.accounts)
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to load posts') }
    finally { setBusy(''); setLoading(false) }
  }
  async function upload(files: FileList | null) {
    if (!files) return
    setBusy('upload'); setError('')
    try {
      if (media.length + files.length > 10) throw new Error('Attach at most 10 files.')
      for (const file of Array.from(files)) {
        const uploaded = await uploadMedia(file)
        setMedia((current) => [...current, uploaded])
      }
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Upload failed') }
    finally { setBusy('') }
  }
  async function send(submission: Submission) {
    if (submitting.current) return
    submitting.current = true; setBusy('submit'); setError(''); setNotice(''); setPending(submission)
    try {
      const { post } = await api<{ post: SocialPost }>('/posts', { method: 'POST', body: JSON.stringify(submission) })
      upsert(post); setPending(null); setContent(''); setAccountIds([]); setMedia([]); setSchedule('')
      setNotice(`Post status: ${post.status}. See account results below.`)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to submit post')
      // Retain this exact request for timeout recovery without double publishing.
      try { setPosts((await api<{ posts: SocialPost[] }>('/posts')).posts) } catch { /* original error remains visible */ }
    } finally { submitting.current = false; setBusy('') }
  }
  async function submit(mode: Mode) {
    if (mode !== 'draft' && !accountIds.length) { setError('Select at least one connected account.'); return }
    if (!content.trim() && !media.length) { setError('Write a post or attach media.'); return }
    if (mode === 'schedule' && (!schedule || new Date(schedule).getTime() < Date.now() + 60000)) { setError('Choose a time at least one minute in the future.'); return }
    await send({ requestId: crypto.randomUUID(), content, accountIds, mediaIds: media.map((m) => m.id), mode,
      ...(mode === 'schedule' ? { scheduledFor: new Date(schedule).toISOString() } : {}), timezone })
  }
  async function postAction(post: SocialPost, cancel = false) {
    if (cancel && !window.confirm('Cancel this draft or scheduled post?')) return
    setBusy(post.id); setError('')
    try { upsert((await api<{ post: SocialPost }>(`/posts/${post.id}${cancel ? '' : '/refresh'}`, { method: cancel ? 'DELETE' : 'POST' })).post) }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to update post') }
    finally { setBusy('') }
  }
  function loadDraft(post: SocialPost) {
    setContent(post.content); setAccountIds(post.accountIds); setPending(null); setSchedule('')
    setMedia(post.mediaItems.map((m, i) => ({ ...m, id: post.mediaIds[i], type: m.type === 'video' ? 'video' : 'image' })))
    setNotice('Draft loaded into the composer. Submitting creates a new post; the original draft remains available.')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  async function reschedulePost(post: SocialPost) {
    if (!rescheduleTime || new Date(rescheduleTime).getTime() < Date.now() + 60000) { setError('Choose a future time.'); return }
    setBusy(post.id); setError('')
    try {
      const result = await api<{ post: SocialPost }>(`/posts/${post.id}/schedule`, { method: 'PATCH',
        body: JSON.stringify({ scheduledFor: new Date(rescheduleTime).toISOString(), timezone }) })
      upsert(result.post); setReschedulingId(''); setRescheduleTime('')
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to reschedule. Refresh status before retrying.') }
    finally { setBusy('') }
  }
  return <div className="max-w-6xl mx-auto space-y-6">
    <div className="flex justify-between gap-3"><div><h2 className="text-2xl font-semibold">Create and schedule posts</h2><p className="text-sm text-slate-500">Times shown in {timezone}</p></div><button className={button} onClick={refreshList} disabled={!!busy}><RefreshCw size={16} className="inline mr-2" />Refresh list</button></div>
    {error && <p role="alert" className="bg-red-50 text-red-700 p-4 rounded-xl">{error}</p>}
    {notice && <p role="status" className="bg-blue-50 text-blue-800 p-4 rounded-xl">{notice}</p>}
    <div className="grid lg:grid-cols-2 gap-6">
      <section className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 h-fit">
        <fieldset disabled={!!busy || !!pending} className="space-y-5 disabled:opacity-60">
          <legend className="font-semibold mb-3">Compose a post</legend>
          <label className="block text-sm">Post content<textarea value={content} onChange={(e) => setContent(e.target.value)} rows={6} maxLength={60000} className="mt-2 w-full border border-slate-300 rounded-xl p-3" placeholder="What would you like to share?" /></label>
          <div><h3 className="text-sm font-medium mb-2">Publish to</h3>
            {!accounts.some((a) => a.status === 'Connected') && <p className="text-sm text-slate-500"><Link className="underline text-red-600" to="/accounts">Connect an account</Link> before publishing.</p>}
            <div className="space-y-2">{accounts.filter((a) => a.status === 'Connected').map((account) => <label key={account.id} className="flex gap-3 items-center rounded-lg border p-3 text-sm">
              <input type="checkbox" checked={accountIds.includes(account.id)} onChange={() => setAccountIds((ids) => ids.includes(account.id) ? ids.filter((id) => id !== account.id) : [...ids, account.id])} />
              <span>{account.username} <span className="text-slate-500">({account.platformId})</span></span>
            </label>)}</div>
          </div>
          <label className="block text-sm">Images or video<input type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4" onChange={(e) => { void upload(e.target.files); e.target.value = '' }} className="block mt-2 w-full text-sm" /></label>
          <p className="text-xs text-slate-500">Up to 10 files, 50 MB each. Instagram needs media. Each platform may impose additional format limits. Media posts can be scheduled within six days of upload.</p>
          <ul className="space-y-2">{media.map((item) => <li key={item.id} className="flex gap-2 text-sm items-center"><span className="truncate flex-1">{item.filename}</span><button type="button" aria-label={`Remove ${item.filename}`} onClick={() => setMedia((current) => current.filter((m) => m.id !== item.id))}><X size={16} /></button></li>)}</ul>
          <label className="block text-sm">Scheduled time ({timezone})<input type="datetime-local" value={schedule} onChange={(e) => setSchedule(e.target.value)} className="block border rounded-lg p-2 mt-2 w-full" /></label>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => submit('now')} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm"><Send size={16} className="inline mr-2" />Publish now</button>
            <button onClick={() => submit('schedule')} className={button}><Calendar size={16} className="inline mr-2" />Schedule</button>
            <button onClick={() => submit('draft')} className={button}>Save draft</button>
          </div>
        </fieldset>
        {busy === 'upload' && <p role="status">Uploading media…</p>}
        {busy === 'submit' && <p role="status">Submitting post. Publishing can take a moment…</p>}
        {pending && !busy && <div className="rounded-xl bg-amber-50 p-4 space-y-3 text-sm"><p>The submission did not complete in this browser. Retry the same request to avoid duplicates, or refresh the post status below.</p>
          <button className={button} onClick={() => send(pending)}>Retry same submission</button>
          <button className={`${button} ml-2`} onClick={() => { if (window.confirm('Starting a new submission can create a duplicate if the previous one was accepted. Have you checked its status?')) setPending(null) }}>Edit as new submission</button></div>}
      </section>
      <section className="space-y-4"><h3 className="font-semibold">Your posts</h3>
        {loading ? <p role="status">Loading posts…</p> : !posts.length && <p className="text-slate-500">Your drafts, scheduled posts, and published posts will appear here.</p>}
        {posts.map((post) => <article key={post.id} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <div className="flex justify-between gap-3"><span className="capitalize text-sm font-medium">{post.status}</span><time className="text-xs text-slate-500">{post.scheduledFor ? new Date(post.scheduledFor).toLocaleString() : new Date(post.createdAt).toLocaleString()}</time></div>
          <p className="whitespace-pre-wrap break-words text-sm">{post.content}</p>
          {post.mediaItems.length > 0 && <p className="text-xs text-slate-500">{post.mediaItems.length} media attachment(s)</p>}
          {post.error && <p className="text-sm text-red-700">{post.error}</p>}
          <ul className="space-y-2">{post.results.map((result, i) => <li key={`${result.accountId}-${i}`} className="text-sm border-t pt-2">
            <span className="capitalize">{result.platform}: {result.status}</span>{result.error && <p className="text-red-700">{result.error}</p>}
            {result.url?.startsWith('https://') && <a className="block underline text-red-600" href={result.url} target="_blank" rel="noreferrer">View published post</a>}
          </li>)}</ul>
          <div className="flex flex-wrap gap-2">
            {post.status !== 'cancelled' && <button disabled={!!busy} className={button} onClick={() => postAction(post)}>Refresh status</button>}
            {['draft', 'scheduled'].includes(post.status) && <button disabled={!!busy} className={button} onClick={() => postAction(post, true)}>Cancel</button>}
            {post.status === 'scheduled' && <button disabled={!!busy} className={button} onClick={() => { setReschedulingId(post.id); setRescheduleTime('') }}>Reschedule</button>}
            {post.status === 'draft' && <button disabled={!!busy || !!pending} className={button} onClick={() => loadDraft(post)}>Use draft</button>}
            {['unconfirmed', 'pending'].includes(post.status) && <button disabled={!!busy || !!pending} className={button} onClick={() => send({ requestId: post.requestId, content: post.content, accountIds: post.accountIds, mediaIds: post.mediaIds, mode: post.mode, timezone: post.timezone, ...(post.scheduledFor ? { scheduledFor: post.scheduledFor } : {}) })}>Retry same submission</button>}
          </div>
          {reschedulingId === post.id && <div className="flex flex-wrap gap-2 items-center"><label className="text-sm">New time ({timezone})<input type="datetime-local" value={rescheduleTime} onChange={(e) => setRescheduleTime(e.target.value)} className="block border rounded p-2" /></label>
            <button disabled={!!busy} className={button} onClick={() => reschedulePost(post)}>Save time</button><button disabled={!!busy} className={button} onClick={() => setReschedulingId('')}>Close</button></div>}
        </article>)}
      </section>
    </div>
  </div>
}
