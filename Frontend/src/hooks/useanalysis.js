/**
 * useAnalysis — manages the full lifecycle of one pipeline run.
 * submit() → polls /status → fetches /result when done.
 */
import { useState, useRef, useCallback } from 'react'
import { api, getSessionId } from '../utils/api'

const POLL_MS   = 5000   // 5 seconds between polls
const MAX_POLLS = 180    // 15 minutes max (180 × 5s)

export function useAnalysis() {
  const [state, setState] = useState({
    phase:       'idle',      // idle | submitting | running | done | error
    analysisId:  null,
    agentStep:   0,           // 0–3 — which agent card glows
    result:      null,
    error:       null,
    durationSecs: null,
  })

  const pollRef  = useRef(null)
  const countRef = useRef(0)

  const _stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  const _startPolling = useCallback((analysisId) => {
    countRef.current = 0

    pollRef.current = setInterval(async () => {
      countRef.current += 1

      // Rotate agent step indicator every 3 polls (~15s)
      setState(s => ({ ...s, agentStep: Math.min(3, Math.floor(countRef.current / 3)) }))

      // Hard timeout guard
      if (countRef.current >= MAX_POLLS) {
        _stopPolling()
        setState(s => ({
          ...s, phase: 'error',
          error: 'Analysis timed out after 15 minutes. Please try again.',
        }))
        return
      }

      try {
        const status = await api.getStatus(analysisId)

        if (status.status === 'done') {
          _stopPolling()
          const result = await api.getResult(analysisId)
          setState(s => ({
            ...s, phase: 'done', result,
            durationSecs: result.duration_secs,
          }))
        } else if (status.status === 'failed') {
          _stopPolling()
          setState(s => ({
            ...s, phase: 'error',
            error: status.error_message || 'Analysis failed. Please try again.',
          }))
        }
        // 'pending' / 'running' — keep polling
      } catch (err) {
        // Network blip — don't stop, just log and continue
        console.warn('Poll error (will retry):', err.message)
      }
    }, POLL_MS)
  }, [])

  const submit = useCallback(async (userInput) => {
    _stopPolling()
    setState({ phase: 'submitting', analysisId: null, agentStep: 0,
               result: null, error: null, durationSecs: null })

    try {
      const { analysis_id } = await api.startAnalysis(userInput, getSessionId())
      setState(s => ({ ...s, phase: 'running', analysisId: analysis_id }))
      _startPolling(analysis_id)
    } catch (err) {
      setState(s => ({ ...s, phase: 'error', error: err.message }))
    }
  }, [_startPolling])

  const reset = useCallback(() => {
    _stopPolling()
    setState({ phase: 'idle', analysisId: null, agentStep: 0,
               result: null, error: null, durationSecs: null })
  }, [])

  return { ...state, submit, reset }
}
