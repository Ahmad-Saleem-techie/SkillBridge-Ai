import { useEffect, useState, useCallback } from 'react'
import { api } from '../utils/api'
import { CheckCircle2, XCircle, Loader2, Clock, Trash2, Eye, RefreshCw, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import ResultTabs from '../components/ResultTabs'
import clsx from 'clsx'

const STATUS = {
  done:    { icon: CheckCircle2, dot: 'bg-emerald-500',  badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  failed:  { icon: XCircle,      dot: 'bg-red-500',      badge: 'bg-red-500/10 text-red-400 border-red-500/20'            },
  running: { icon: Loader2,      dot: 'bg-indigo-500 animate-pulse', badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
  pending: { icon: Clock,        dot: 'bg-slate-500',    badge: 'bg-white/[0.05] text-slate-400 border-white/10'           },
}

function fmtDur(secs) {
  if (!secs) return null
  return `${Math.floor(secs / 60)}m ${Math.round(secs % 60)}s`
}

export default function History() {
  const [items, setItems]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [loadingId, setLoadingId] = useState(null)
  const [selected, setSelected] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.history(30)
      setItems(data.history || [])
    } catch (e) {
      toast.error(`Failed to load history: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function openResult(id) {
    setLoadingId(id)
    try {
      const result = await api.getResult(id)
      setSelected(result)
    } catch (e) {
      toast.error(`Could not load result: ${e.message}`)
    } finally {
      setLoadingId(null)
    }
  }

  async function deleteItem(id, e) {
    e.stopPropagation()
    if (!confirm('Delete this analysis? This cannot be undone.')) return
    try {
      await api.deleteAnalysis(id)
      setItems(prev => prev.filter(i => i.id !== id))
      if (selected?.analysis_id === id) setSelected(null)
      toast.success('Analysis deleted')
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-7 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium text-white">Analysis history</h1>
          <p className="mt-1 text-sm text-slate-400">Your past career analyses</p>
        </div>
        <button onClick={load}
          className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08]
                     px-4 py-2 text-sm text-slate-400 transition-all
                     hover:border-white/[0.16] hover:text-white">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Skeleton */}
      {loading && (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-[#1a1a22]" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-slate-500">
          <AlertCircle size={36} className="mb-4 opacity-25" />
          <p className="font-medium text-slate-400">No analyses yet</p>
          <p className="mt-1 text-sm">Run your first one on the Analyze page</p>
        </div>
      )}

      {/* List */}
      {!loading && items.length > 0 && (
        <div className="space-y-2">
          {items.map(item => {
            const s   = STATUS[item.status] || STATUS.pending
            const dur = fmtDur(item.duration_secs)
            const canView = item.status === 'done'
            return (
              <div key={item.id}
                className={clsx(
                  'group flex items-center gap-3 rounded-xl border border-white/[0.06]',
                  'bg-[#1a1a22] px-4 py-3 transition-colors',
                  canView && 'cursor-pointer hover:border-white/[0.12]'
                )}
                onClick={() => canView && openResult(item.id)}>

                {/* Status dot */}
                <div className={clsx('h-2 w-2 shrink-0 rounded-full', s.dot)} />

                {/* Input preview */}
                <p className="min-w-0 flex-1 truncate text-sm text-white">
                  {item.user_raw_input?.slice(0, 90)}
                  {item.user_raw_input?.length > 90 && '…'}
                </p>

                {/* Meta */}
                <div className="hidden shrink-0 items-center gap-3 text-xs text-slate-500 sm:flex">
                  <span>#{item.id}</span>
                  {dur && <span>{dur}</span>}
                  <span>{item.started_at?.slice(0, 10)}</span>
                </div>

                {/* Status badge */}
                <span className={clsx('shrink-0 rounded-full border px-2.5 py-0.5 text-xs', s.badge)}>
                  {item.status}
                </span>

                {/* Actions — visible on hover */}
                <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  {canView && (
                    <button
                      className="flex h-7 w-7 items-center justify-center rounded-lg
                                 text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-white"
                      onClick={e => { e.stopPropagation(); openResult(item.id) }}
                      title="View result">
                      {loadingId === item.id
                        ? <Loader2 size={13} className="animate-spin" />
                        : <Eye size={13} />}
                    </button>
                  )}
                  <button
                    className="flex h-7 w-7 items-center justify-center rounded-lg
                               text-slate-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                    onClick={e => deleteItem(item.id, e)}
                    title="Delete">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Slide-over */}
      {selected && (
        <div className="fixed inset-0 z-50 flex animate-fadeSlide">
          <div className="flex-1 bg-black/50 backdrop-blur-sm"
               onClick={() => setSelected(null)} />
          <div className="flex w-full max-w-2xl flex-col border-l border-white/[0.08]
                          bg-[#0f0f11] shadow-2xl">
            {/* Slide header */}
            <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
              <div>
                <h2 className="text-sm font-medium text-white">
                  Analysis #{selected.analysis_id}
                </h2>
                <p className="mt-0.5 max-w-xs truncate text-xs text-slate-400">
                  {selected.user_input}
                </p>
              </div>
              <button
                className="flex h-7 w-7 items-center justify-center rounded-lg
                           text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-white"
                onClick={() => setSelected(null)}>
                ✕
              </button>
            </div>
            {/* Slide body — reuse result tabs */}
            <div className="flex flex-1 flex-col overflow-hidden">
              <ResultTabs result={selected} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
