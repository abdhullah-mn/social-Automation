import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, RefreshCw, Trash2 } from 'lucide-react'
import { PLATFORMS } from '../assets/assets'
import { api, type SocialAccount } from '../lib/api'

export default function Accounts() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([])
  const [busy, setBusy] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [params, setParams] = useSearchParams()
  const returned = params.has('connection') || params.has('connected')
  const denied = params.has('error')

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const data = await api<{ accounts: SocialAccount[] }>(returned ? '/accounts/sync' : '/accounts', { method: returned ? 'POST' : 'GET' })
        if (active) {
          setAccounts(data.accounts)
          if (denied) setError('The connection was not completed. Please try again.')
          if (returned || denied) setParams({}, { replace: true })
        }
      } catch (failure) { if (active) setError(failure instanceof Error ? failure.message : 'Unable to load accounts') }
      finally { if (active) setLoading(false) }
    }
    void load()
    return () => { active = false }
  }, [returned, denied, setParams])

  async function connect(platform: string) {
    setBusy(platform); setError('')
    try {
      const { authUrl } = await api<{ authUrl: string }>(`/accounts/connect/${platform}`, { method: 'POST' })
      window.location.assign(authUrl)
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to connect'); setBusy('') }
  }
  async function sync() {
    setBusy('sync'); setError('')
    try { setAccounts((await api<{ accounts: SocialAccount[] }>('/accounts/sync', { method: 'POST' })).accounts) }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to refresh accounts') }
    finally { setBusy(''); setLoading(false) }
  }
  async function disconnect(account: SocialAccount) {
    if (!window.confirm(`Disconnect ${account.username}? Scheduled posts using this account may fail until it is reconnected.`)) return
    setBusy(account.id); setError('')
    try {
      const data = await api<{ account: SocialAccount }>(`/accounts/${account.id}`, { method: 'DELETE' })
      setAccounts((current) => current.map((item) => item.id === account.id ? data.account : item))
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to disconnect') }
    finally { setBusy('') }
  }
  return <div className="max-w-5xl mx-auto space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-2xl font-semibold">Social accounts</h2><p className="text-slate-500 text-sm">{accounts.filter((a) => a.status === 'Connected').length} accounts connected</p></div>
      <button onClick={sync} disabled={!!busy} className="flex items-center gap-2 rounded-lg border px-4 py-2 disabled:opacity-50"><RefreshCw size={16} />Refresh connections</button>
    </div>
    {error && <p role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">{error}</p>}
    <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
      <h3 className="font-medium">Connect an account</h3>
      <p className="text-sm text-slate-500">You can connect several accounts on the same platform. Facebook requires a Page; Instagram requires a Business or Creator account.</p>
      <div className="grid sm:grid-cols-2 gap-3">{PLATFORMS.map((platform) => <button key={platform.id} onClick={() => connect(platform.id)} disabled={!!busy}
        className="flex items-center gap-3 border border-slate-200 rounded-xl p-4 hover:bg-red-50 disabled:opacity-50 text-left">
        <platform.icon className="size-5" /><span className="flex-1">{busy === platform.id ? 'Opening authorization…' : platform.name}</span><Plus size={16} />
      </button>)}</div>
    </section>
    {loading ? <p role="status">Loading accounts…</p> : !accounts.length ? <p className="text-center text-slate-500 py-10">No accounts connected yet. Choose a platform above to get started.</p> :
      <div className="grid sm:grid-cols-2 gap-4">{accounts.map((account) => {
        const platform = PLATFORMS.find((p) => p.id === account.platformId)
        return <article key={account.id} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <div className="flex gap-3 items-center">{platform && <platform.icon className="size-6" />}<div className="min-w-0 flex-1"><h3>{platform?.name || account.platformId}</h3><p className="truncate text-slate-500">{account.username}</p></div></div>
          <p className={account.status === 'Connected' ? 'text-green-700 text-sm' : 'text-amber-700 text-sm'}>{account.status === 'Connected' ? 'Connected' : 'Disconnected — reconnect to publish'}</p>
          {account.status === 'Connected' ? <button disabled={!!busy} onClick={() => disconnect(account)} className="flex gap-2 text-sm text-red-600 disabled:opacity-50"><Trash2 size={16} />Disconnect</button> :
            <button disabled={!!busy} onClick={() => connect(account.platformId)} className="text-sm underline disabled:opacity-50">Reconnect</button>}
        </article>
      })}</div>}
  </div>
}
