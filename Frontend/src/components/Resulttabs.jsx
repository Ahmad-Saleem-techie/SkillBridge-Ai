import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { FileText, Target, BarChart2, Map, DollarSign, Code2, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react'
import clsx from 'clsx'

const TABS = [
  { id: 'report',  label: 'Full report',  icon: FileText  },
  { id: 'jobs',    label: 'Job matches',  icon: Target    },
  { id: 'skills',  label: 'Skill gaps',   icon: BarChart2 },
  { id: 'roadmap', label: 'Roadmap',      icon: Map       },
]

const DEMAND = {
  High:      'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Growing:   'bg-teal-500/10 text-teal-400 border-teal-500/20',
  Stable:    'bg-white/[0.06] text-slate-400 border-white/10',
  Declining: 'bg-red-500/10 text-red-400 border-red-500/20',
}
const RANK = { 1: '⭐ Primary', 2: '🥈 Alt 1', 3: '🥉 Alt 2' }

function MatchBar({ score }) {
  const fill = score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="mt-2.5">
      <div className="mb-1 flex justify-between text-xs text-slate-400">
        <span>Skill match</span>
        <span className="font-medium text-white">{score}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.07]">
        <div className={clsx('h-full rounded-full transition-all duration-700', fill)}
             style={{ width: `${score}%` }} />
      </div>
    </div>
  )
}

function JobsTab({ jobs }) {
  const [expanded, setExpanded] = useState(null)
  if (!jobs?.length)
    return <p className="text-sm text-slate-400">No job match data extracted yet.</p>

  return (
    <div className="space-y-3">
      {jobs.map(j => {
        const isOpen = expanded === j.id
        return (
          <div key={j.id}
            className={clsx('rounded-xl border p-4 cursor-pointer transition-colors',
              isOpen ? 'border-white/20' : 'border-white/[0.06] hover:border-white/[0.12]')}
            onClick={() => setExpanded(isOpen ? null : j.id)}>

            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="badge mb-2 border border-indigo-500/30 bg-indigo-500/10 text-indigo-400">
                  {RANK[j.rank] || `Rank ${j.rank}`}
                </span>
                <h3 className="font-medium text-white">{j.title}</h3>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {j.demand_level && (
                  <span className={clsx('badge border', DEMAND[j.demand_level] || DEMAND.Stable)}>
                    {j.demand_level}
                  </span>
                )}
                {isOpen ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
              </div>
            </div>

            <MatchBar score={j.match_score ?? 0} />

            {(j.salary_usd_low || j.tech_stack?.length > 0) && (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                {j.salary_usd_low && (
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <DollarSign size={11} />
                    ${j.salary_usd_low.toLocaleString()}–${j.salary_usd_high?.toLocaleString()}/yr
                  </span>
                )}
              </div>
            )}

            {j.tech_stack?.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {j.tech_stack.map(t => (
                  <span key={t} className="flex items-center gap-1 rounded-md bg-white/[0.05] px-2 py-0.5 text-xs text-slate-300">
                    <Code2 size={9} />{t}
                  </span>
                ))}
              </div>
            )}

            {isOpen && j.rationale && (
              <p className="mt-3 border-t border-white/[0.06] pt-3 text-sm leading-relaxed text-slate-300 animate-fadeSlide">
                {j.rationale}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

function SkillsTab({ skills }) {
  if (!skills?.length)
    return <p className="text-sm text-slate-400">No skills extracted yet.</p>

  const LEVELS = ['Advanced', 'Intermediate', 'Beginner']
  const STYLE = {
    Advanced:     'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    Intermediate: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20',
    Beginner:     'bg-amber-500/10 text-amber-300 border-amber-500/20',
  }
  const LABEL = {
    Advanced:     'Advanced — already strong',
    Intermediate: 'Intermediate — working knowledge',
    Beginner:     'Beginner — foundation level',
  }

  return (
    <div className="space-y-5">
      {LEVELS.map(lvl => {
        const group = skills.filter(s => s.skill_level === lvl)
        if (!group.length) return null
        return (
          <div key={lvl}>
            <h4 className="mb-2.5 text-xs font-medium uppercase tracking-wider text-slate-500">
              {LABEL[lvl]}
            </h4>
            <div className="flex flex-wrap gap-2">
              {group.map(s => (
                <span key={s.id}
                  className={clsx('rounded-lg border px-3 py-1 text-sm',
                    STYLE[lvl], s.is_implied && 'border-dashed opacity-70')}>
                  {s.skill_name}
                  {s.is_implied && <span className="ml-1 text-xs opacity-60">(implied)</span>}
                </span>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function RoadmapTab({ phases }) {
  if (!phases?.length)
    return <p className="text-sm text-slate-400">No roadmap phases available.</p>

  return (
    <div className="relative pl-5">
      <div className="absolute left-1.5 top-0 h-full w-px bg-white/[0.06]" />
      {phases.map(p => (
        <div key={p.id} className="relative mb-5 last:mb-0">
          <div className="absolute -left-3.5 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-indigo-500 bg-[#0f0f11]" />
          <div className="rounded-xl border border-white/[0.06] bg-[#1a1a22] p-4">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div>
                <span className="text-xs font-medium text-indigo-400">Phase {p.phase_number}</span>
                <h3 className="mt-0.5 font-medium text-white">{p.phase_name}</h3>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {p.duration_weeks && (
                  <span className="badge border border-white/[0.08] bg-white/[0.05] text-slate-400">~{p.duration_weeks}w</span>
                )}
                {p.hrs_per_week && (
                  <span className="badge border border-white/[0.08] bg-white/[0.05] text-slate-400">{p.hrs_per_week} hrs/wk</span>
                )}
              </div>
            </div>

            {p.skills_covered?.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {p.skills_covered.map(s => (
                  <span key={s} className="badge border border-indigo-500/20 bg-indigo-500/10 text-indigo-400">{s}</span>
                ))}
              </div>
            )}

            {p.project_desc && (
              <div className="mb-3 rounded-lg bg-white/[0.04] p-3">
                <p className="mb-1 text-xs font-medium text-slate-500">🔨 Project</p>
                <p className="text-sm text-slate-200">{p.project_desc}</p>
              </div>
            )}

            {p.checkpoint && (
              <div className="flex items-start gap-2 text-sm text-slate-300">
                <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-400" />
                <span>{p.checkpoint}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function ResultTabs({ result }) {
  const [active, setActive] = useState('report')
  if (!result) return null

  return (
    <div className="flex h-full flex-col">
      <div className="flex overflow-x-auto border-b border-white/[0.06]">
        {TABS.map(t => (
          <button key={t.id}
            className={clsx('result-tab shrink-0 flex items-center gap-1.5',
              active === t.id && 'result-tab-active')}
            onClick={() => setActive(t.id)}>
            <t.icon size={13} />{t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-5 animate-fadeSlide">
        {active === 'report' && (
          <div className="md max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {result.full_result || '*No report text returned.*'}
            </ReactMarkdown>
          </div>
        )}
        {active === 'jobs'    && <JobsTab    jobs={result.job_matches}      />}
        {active === 'skills'  && <SkillsTab  skills={result.skills}         />}
        {active === 'roadmap' && <RoadmapTab phases={result.roadmap_phases} />}
      </div>
    </div>
  )
}
