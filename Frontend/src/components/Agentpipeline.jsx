import { Search, Target, BarChart2, Map, CheckCircle2, Loader2 } from 'lucide-react'
import clsx from 'clsx'

const AGENTS = [
  { name: 'Skill Extractor',   desc: 'Parsing your background & skills',          icon: Search    },
  { name: 'Job Matcher',       desc: 'Finding your top 3 best-fit roles',          icon: Target    },
  { name: 'Gap Analyzer',      desc: 'Mapping what you need to learn',             icon: BarChart2 },
  { name: 'Roadmap Architect', desc: 'Building your personalized learning plan',   icon: Map       },
]

export default function AgentPipeline({ activeStep = 0, phase = 'running' }) {
  return (
    <div className="space-y-2.5">
      {AGENTS.map((agent, i) => {
        const done    = phase === 'done' || i < activeStep
        const active  = i === activeStep && phase === 'running'
        const pending = !done && !active
        const Icon    = agent.icon

        return (
          <div key={agent.name}
            className={clsx(
              'flex items-center gap-3 rounded-xl border p-3 transition-all duration-300',
              done    && 'border-emerald-500/25 bg-emerald-500/[0.06]',
              active  && 'border-indigo-500/40 bg-indigo-500/[0.08] agent-pulse',
              pending && 'border-white/[0.05] opacity-45',
            )}>
            <div className={clsx(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
              done    && 'bg-emerald-500/15 text-emerald-400',
              active  && 'bg-indigo-500/15 text-indigo-400',
              pending && 'bg-white/[0.05] text-slate-500',
            )}>
              {done
                ? <CheckCircle2 size={16} />
                : active
                  ? <Loader2 size={16} className="animate-spin" />
                  : <Icon size={16} />}
            </div>

            <div className="min-w-0 flex-1">
              <p className={clsx('text-sm font-medium leading-tight',
                done ? 'text-emerald-400' : active ? 'text-white' : 'text-slate-500')}>
                Agent {i + 1} — {agent.name}
              </p>
              <p className={clsx('mt-0.5 text-xs',
                active ? 'text-slate-300' : 'text-slate-500')}>
                {agent.desc}
              </p>
            </div>

            <span className={clsx('shrink-0 text-xs font-medium',
              done ? 'text-emerald-400' : active ? 'text-indigo-400' : 'text-slate-600')}>
              {done ? 'Done' : active ? 'Running…' : 'Waiting'}
            </span>
          </div>
        )
      })}
    </div>
  )
}
