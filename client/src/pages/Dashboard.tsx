import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type SocialAccount, type SocialPost } from '../lib/api'
import { useSession } from '../hooks/useSession'
export default function Dashboard() {
  const { user } = useSession()
  const [data, setData] = useState<{ accounts: SocialAccount[]; posts: SocialPost[] } | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    Promise.all([api<{ accounts: SocialAccount[] }>('/accounts'), api<{ posts: SocialPost[] }>('/posts')])
      .then(([a, p]) => { if (active) setData({ accounts: a.accounts, posts: p.posts }) })
      .catch((failure: Error) => { if (active) setError(failure.message) })
    return () => { active = false }
  }, [])
  return <div className="max-w-6xl mx-auto space-y-6">
    <div><h2 className="text-2xl font-semibold">Welcome, {user?.name}</h2><p className="text-slate-500">Connect your accounts and share your next post.</p></div>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {!data && !error && <p role="status">Loading your dashboard…</p>}
    {data && <>
      <div className="grid sm:grid-cols-3 gap-4">{[
        ['Connected accounts', data.accounts.filter((a) => a.status === 'Connected').length],
        ['Scheduled posts (latest 100)', data.posts.filter((p) => p.status === 'scheduled').length],
        ['Published posts (latest 100)', data.posts.filter((p) => p.status === 'published').length],
      ].map(([label, count]) => <div key={label} className="bg-white border border-slate-200 p-6 rounded-2xl"><p className="text-3xl font-semibold">{count}</p><p className="text-slate-500 text-sm">{label}</p></div>)}</div>
      <div className="flex gap-3"><Link to="/accounts" className="border border-slate-200 rounded-lg p-3">Connect accounts</Link><Link to="/scheduler" className="bg-red-500 text-white rounded-lg p-3">Create a post</Link></div>
      <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4"><h3 className="font-semibold">Recent posts</h3>
        {!data.posts.length && <p className="text-slate-500">No posts yet.</p>}
        {data.posts.slice(0, 8).map((post) => <Link key={post.id} to="/scheduler" className="block border-t border-slate-100 pt-3"><span className="capitalize text-xs text-slate-500">{post.status}</span><p className="truncate">{post.content || 'Media post'}</p></Link>)}
      </section>
    </>}
  </div>
}
