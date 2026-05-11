import { useEffect, useState } from 'react'
import { api } from '../utils/api'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import { Zap, CheckCircle2, XCircle, Users, Clock } from 'lucide-react'
import clsx from 'clsx'

const STAT_CARDS = [
  { key: 'total_analyses', label: 'Total analyses',  icon: Zap,          color: 'text-indigo-400 bg-indigo-500/10'  },
  { key: 'completed',      label: 'Completed',        icon: CheckCircle2, color: 'text-emerald-400 bg-emerald-500/10' },
  { key: 'failed',         label: 'Failed',           icon: XCircle,      color: 'text-red-400 bg-red-500/10'        },
  { key: 'total_users',    label: 'Total users',      icon: Users,        color: 'text-violet-400 bg-violet-500/10'  },
]

const TOOLTIP_STYLE = {
  background: '#1a1a22',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 8,
  color: '#f8fafc',
  fontSize: 12,
}

const BAR_COLORS = ['#4338ca','#4f46e5','#6366f1','#818cf8','#6366f1','#4f46e5','#4338ca']

// Build last-7-days chart data from history items
function buildChartData(history) {
  const counts = {}
  history.forEach(item => {
    const d = item.started_at?.slice(0, 10)
    if (d) counts[d] = (counts[d] || 0) + 1
  })
  const today = new Date()
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (6 - i))
    const key = d.toISOString().slice(0, 10)
    return { date: key.slice(5), count: counts[key] || 0 }
  })
}

export default function Dashboard() {
  const [stats, setStats]     = useState(null)
  const [chart, setChart]     = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.stats(), api.history(50)])
      .then(([s, h]) => {
        setStats(s)
        setChart(buildChartData(h.history || []))
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const rate = stats?.total_analyses
    ? Math.round((stats.completed / stats.total_analyses) * 100)
    : 0

  const avgMins = stats ? Math.floor(stats.avg_duration_secs / 60) : 0
  const avgSecs = stats ? Math.round(stats.avg_duration_secs % 60) : 0

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-7">
        <h1 className="text-xl font-medium text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-400">Platform-wide statistics</p>
      </div>

      {/* Stat cards skeleton */}
      {loading && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-[#1a1a22]" />
          ))}
        </div>
      )}

      {/* Stat cards */}
      {!loading && stats && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-5">
          {STAT_CARDS.map(({ key, label, icon: Icon, color }) => (
            <div key={key}
              className="rounded-xl border border-white/[0.06] bg-[#1a1a22] p-5">
              <div className={clsx('mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg', color)}>
                <Icon size={18} />
              </div>
              <p className="text-2xl font-medium text-white">
                {(stats[key] ?? 0).toLocaleString()}
              </p>
              <p className="mt-1 text-sm text-slate-400">{label}</p>
              {key === 'completed' && (
                <p className="mt-0.5 text-xs text-slate-500">{rate}% success rate</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Avg duration card */}
      {!loading && stats && (
        <div className="mb-5 flex items-center gap-4 rounded-xl border border-white/[0.06]
                        bg-[#1a1a22] p-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg
                          bg-indigo-500/10 text-indigo-400">
            <Clock size={18} />
          </div>
          <div>
            <p className="text-xs text-slate-500">Average pipeline duration</p>
            <p className="mt-0.5 text-lg font-medium text-white">
              {avgMins}m {avgSecs}s
            </p>
          </div>
          <p className="ml-auto text-xs text-slate-500">
            4 sequential agents · Fireworks AI
          </p>
        </div>
      )}

      {/* Bar chart */}
      <div className="rounded-xl border border-white/[0.06] bg-[#1a1a22] p-5">
        <h2 className="mb-5 text-sm font-medium text-white">Analyses — last 7 days</h2>

        {loading && <div className="h-48 animate-pulse rounded-lg bg-white/[0.04]" />}

        {!loading && (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chart} margin={{ top: 0, right: 0, bottom: 0, left: -24 }}>
              <XAxis
                dataKey="date"
                tick={{ fill: '#475569', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#475569', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                cursor={{ fill: 'rgba(99,102,241,0.06)' }}
                formatter={v => [v, 'Analyses']}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={48}>
                {chart.map((_, i) => (
                  <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
