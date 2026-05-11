import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Search, Target, BarChart2, Map, ArrowRight, Zap, Users, Clock } from 'lucide-react'
import { api } from '../utils/api'

const AGENTS = [
  { icon: Search,    n: 1, name: 'Skill Extractor',   desc: 'Parses your natural language into a structured skill profile, normalizing abbreviations and inferring implied skills.' },
  { icon: Target,    n: 2, name: 'Job Matcher',        desc: 'Maps your skills to the top 3 most realistic roles with salary data, market demand, and match scores.' },
  { icon: BarChart2, n: 3, name: 'Gap Analyzer',       desc: 'Identifies critical vs. important vs. nice-to-have gaps with realistic time estimates at 10–15 hrs/week.' },
  { icon: Map,       n: 4, name: 'Roadmap Architect',  desc: 'Designs a phased learning plan with specific free resources, hands-on projects, and a precise job-hunt trigger.' },
]

const STEPS = [
  { n: '01', title: 'Describe yourself',     desc: 'Tell us your current skills, background, and career goals in plain English. No resume needed.' },
  { n: '02', title: '4 agents collaborate',  desc: 'Each specialized agent handles one part of your profile — sequentially, each building on the last.' },
  { n: '03', title: 'Get your analysis',     desc: 'Receive job matches, a skill gap breakdown, and a complete personalized learning roadmap.' },
  { n: '04', title: 'Start learning',        desc: 'Follow your roadmap with specific free resources, projects, and a clear job-hunt trigger point.' },
]

export default function Home() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    api.stats().then(setStats).catch(() => {})
  }, [])

  return (
    <div className="min-h-screen">

      {/* ── Hero ── */}
      <section className="relative overflow-hidden px-4 pb-20 pt-16 text-center sm:px-6">
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 -translate-y-1/2
                          rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="absolute right-1/4 top-20 h-56 w-56
                          rounded-full bg-violet-500/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-2xl">
          {/* Pill badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border
                          border-indigo-500/25 bg-indigo-500/10 px-4 py-1.5 text-xs text-indigo-400">
            <Zap size={12} />
            4 specialized AI agents · Fireworks AI × CrewAI
          </div>

          <h1 className="text-4xl font-medium leading-tight text-white sm:text-5xl">
            Bridge the gap between your{' '}
            <span className="text-indigo-400">skills</span>{' '}
            and your dream career
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-base text-slate-400">
            Describe your background in plain English. Four AI agents collaborate to analyze
            your skills, match you to real roles, identify gaps, and build your personalized
            learning roadmap — in under 10 minutes.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/analyze"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-6 py-2.5
                         text-sm font-medium text-white transition-all hover:bg-indigo-400
                         active:scale-[0.98]">
              Start my analysis <ArrowRight size={15} />
            </Link>
            <Link to="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08]
                         px-6 py-2.5 text-sm text-slate-400 transition-all
                         hover:border-white/[0.16] hover:text-white">
              View stats
            </Link>
          </div>

          {/* Live stats */}
          {stats && (
            <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <Zap size={12} className="text-indigo-400" />
                {stats.total_analyses.toLocaleString()} analyses run
              </span>
              <span className="flex items-center gap-1.5">
                <Users size={12} className="text-indigo-400" />
                {stats.total_users.toLocaleString()} users
              </span>
              <span className="flex items-center gap-1.5">
                <Clock size={12} className="text-indigo-400" />
                ~{Math.round(stats.avg_duration_secs / 60)}m avg
              </span>
            </div>
          )}
        </div>
      </section>

      {/* ── Agent cards ── */}
      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-8 text-center text-lg font-medium text-white">
            How the pipeline works
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {AGENTS.map(a => (
              <div key={a.name}
                className="rounded-xl border border-white/[0.06] bg-[#1a1a22] p-5 text-center
                           transition-colors hover:border-white/[0.12]">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center
                                rounded-xl bg-indigo-500/15">
                  <a.icon size={18} className="text-indigo-400" />
                </div>
                <p className="mb-1 text-xs text-slate-500">Agent {a.n}</p>
                <h3 className="mb-2 text-sm font-medium text-white">{a.name}</h3>
                <p className="text-xs leading-relaxed text-slate-400">{a.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Steps ── */}
      <section className="border-t border-white/[0.05] px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-lg">
          <h2 className="mb-10 text-center text-lg font-medium text-white">
            From confusion to clarity in 4 steps
          </h2>
          <div className="space-y-5">
            {STEPS.map(s => (
              <div key={s.n} className="flex gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg
                                border border-indigo-500/20 bg-indigo-500/10 font-mono text-xs
                                font-medium text-indigo-400">
                  {s.n}
                </div>
                <div>
                  <h3 className="text-sm font-medium text-white">{s.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link to="/analyze"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-8 py-3
                         text-sm font-medium text-white transition-all hover:bg-indigo-400
                         active:scale-[0.98]">
              Try it free <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
