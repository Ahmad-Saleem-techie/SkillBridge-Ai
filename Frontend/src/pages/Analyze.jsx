import { useState, useRef } from 'react'
import { Send, RotateCcw, AlertTriangle } from 'lucide-react'
import { useAnalysis } from '../hooks/useAnalysis'
import AgentPipeline from '../components/AgentPipeline'
import ResultTabs from '../components/ResultTabs'
import clsx from 'clsx'

const PLACEHOLDER = `e.g. I know Python and basic SQL. I completed a 3-month data analysis bootcamp and want to become a junior Data Analyst. I have a business degree and no prior tech experience.`

const HINTS = [
  'Include specific tools and languages (Python, SQL, React, etc.)',
  'Mention years of experience or education background',
  'State your target role or industry if you have one in mind',
]

export default function Analyze() {
  const [input, setInput] = useState('')
  const ref = useRef(null)
  const { phase, agentStep, result, error, submit, reset } = useAnalysis()

  const isRunning = phase === 'running' || phase === 'submitting'
  const isDone    = phase === 'done'
  const isError   = phase === 'error'
  const canSubmit = input.trim().length >= 15 && !isRunning

  function handleReset() { reset(); setInput(''); ref.current?.focus() }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-7">
        <h1 className="text-xl font-medium text-white">Analyze my career</h1>
        <p className="mt-1 text-sm text-slate-400">Describe yourself in plain English — the 4 AI agents handle the rest</p>
      </div>

      <div className={clsx('grid gap-5', isDone ? 'lg:grid-cols-[380px,1fr]' : 'lg:grid-cols-[420px,1fr]')}>

        {/* LEFT */}
        <div className="flex flex-col gap-4">
          <form className="card flex flex-col gap-4"
            onSubmit={e => { e.preventDefault(); if (canSubmit) submit(input.trim()) }}>
            <label className="text-sm font-medium text-white">Tell me about yourself</label>
            <textarea ref={ref} value={input} onChange={e => setInput(e.target.value)}
              placeholder={PLACEHOLDER} disabled={isRunning} rows={7} maxLength={6000}
              className="w-full resize-none rounded-lg border border-white/[0.08] bg-white/[0.04]
                         px-3.5 py-3 text-sm text-slate-200 placeholder-slate-600 outline-none
                         transition-colors focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20
                         disabled:opacity-50 leading-relaxed" />

            <div className={clsx('text-right text-xs', input.length >= 5800 ? 'text-amber-400' : 'text-slate-500')}>
              {input.length.toLocaleString()} / 6,000
            </div>

            <button type="submit" disabled={!canSubmit} className="btn-primary w-full justify-center">
              {isRunning
                ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/25 border-t-white" />Analyzing…</>
                : <><Send size={15} />Analyze my career</>}
            </button>

            {(isDone || isError) && (
              <button type="button" onClick={handleReset}
                className="btn-ghost w-full justify-center text-slate-500 hover:text-slate-300">
                <RotateCcw size={13} />Start new analysis
              </button>
            )}
          </form>

          {phase === 'idle' && (
            <div className="card space-y-2.5">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Tips for better results</p>
              {HINTS.map(h => (
                <p key={h} className="text-xs text-slate-400">
                  <span className="mr-1.5 text-indigo-400">→</span>{h}
                </p>
              ))}
            </div>
          )}

          {(isRunning || isDone) && (
            <div className="card">
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-500">Pipeline progress</p>
              <AgentPipeline activeStep={agentStep} phase={phase} />
              {isDone && (
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-2">
                  <span className="text-emerald-400 text-sm">✓</span>
                  <p className="text-xs text-emerald-400">All 4 agents completed — see your results →</p>
                </div>
              )}
            </div>
          )}

          {isError && (
            <div className="card border-red-500/25 bg-red-500/[0.06]">
              <div className="flex gap-2.5">
                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-400" />
                <div>
                  <p className="text-sm font-medium text-red-400">Analysis failed</p>
                  <p className="mt-1 text-xs text-slate-400">{error}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT */}
        <div className="min-h-[500px]">
          {phase === 'idle' && (
            <div className="flex h-full min-h-[400px] items-center justify-center rounded-xl border border-dashed border-white/[0.08]">
              <div className="text-center text-slate-500">
                <Send size={28} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm">Your analysis will appear here</p>
                <p className="mt-1 text-xs">Submit your career description to get started</p>
              </div>
            </div>
          )}

          {isRunning && (
            <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-4 rounded-xl border border-indigo-500/20 bg-indigo-500/[0.04]">
              <div className="h-9 w-9 animate-spin rounded-full border-2 border-indigo-500/30 border-t-indigo-500" />
              <div className="text-center">
                <p className="text-sm font-medium text-white">Agents are working…</p>
                <p className="mt-1 text-xs text-slate-400">Takes 4–10 minutes · polling every 5 seconds</p>
              </div>
            </div>
          )}

          {isDone && result && (
            <div className="card flex h-full min-h-[600px] flex-col overflow-hidden p-0 animate-fadeSlide">
              <ResultTabs result={result} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
