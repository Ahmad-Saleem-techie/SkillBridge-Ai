import { NavLink } from 'react-router-dom'
import { BrainCircuit, Zap, Clock, BarChart2, Github } from 'lucide-react'
import { useState } from 'react'
import clsx from 'clsx'

const LINKS = [
  { to: '/analyze',   label: 'Analyze',   icon: Zap       },
  { to: '/history',   label: 'History',   icon: Clock     },
  { to: '/dashboard', label: 'Dashboard', icon: BarChart2  },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  return (
    <nav className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#0f0f11]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <NavLink to="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 ring-1 ring-indigo-500/40">
            <BrainCircuit size={15} className="text-indigo-400" />
          </div>
          <span className="hidden text-sm font-medium sm:block">
            SkillBridge <span className="text-indigo-400">AI</span>
          </span>
        </NavLink>

        <div className="hidden items-center gap-0.5 sm:flex">
          {LINKS.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                clsx('nav-link flex items-center gap-1.5', isActive && 'nav-link-active')}>
              <Icon size={14} />{label}
            </NavLink>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <a href="https://github.com" target="_blank" rel="noopener noreferrer"
             className="btn-ghost hidden p-2 sm:flex"><Github size={15} /></a>
          <span className="hidden rounded-full border border-white/[0.08] px-2.5 py-1 text-xs text-slate-500 sm:block">v1.0.0</span>
          <button className="btn-ghost p-2 sm:hidden" onClick={() => setOpen(o => !o)}>
            <span className="flex flex-col gap-1">
              {[0,1,2].map(i => (
                <span key={i} className={clsx('block h-px w-4 bg-slate-400 transition-all',
                  open && i===0 && 'translate-y-1.5 rotate-45',
                  open && i===1 && 'opacity-0',
                  open && i===2 && '-translate-y-1.5 -rotate-45'
                )} />
              ))}
            </span>
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-white/[0.06] bg-[#1a1a22] px-4 py-2 sm:hidden animate-fadeSlide">
          {LINKS.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={() => setOpen(false)}
              className={({ isActive }) =>
                clsx('flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors',
                  isActive ? 'text-white bg-white/[0.06]' : 'text-slate-400 hover:text-white')}>
              <Icon size={15} />{label}
            </NavLink>
          ))}
        </div>
      )}
    </nav>
  )
}
