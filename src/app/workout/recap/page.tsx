'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Flame, Home } from 'lucide-react'
import { useWorkout } from '../context'

const C = {
  bg: '#0C0920', bgSoft: '#120E2A', surface: 'rgba(255,255,255,0.03)',
  text: '#EDE5FF', text2: '#C4B8E0', mute: '#7D73A3',
  hair: 'rgba(255,255,255,0.08)', hairStrong: 'rgba(183,148,255,0.2)',
  primary: '#B794FF', primary2: '#FFD1E3', primarySoft: 'rgba(183,148,255,0.12)',
  accent: '#FF8FD1', danger: '#FF5E8A', good: '#7EE8C8',
  glow1: 'rgba(183,148,255,0.3)', glow2: 'rgba(255,143,209,0.25)',
}
const SHADOW_1 = '0 0 14px rgba(183,148,255,0.5)'
const FONT_DISPLAY = '"Fraunces", "Cormorant Garamond", Georgia, serif'
const FONT_BODY = '"Inter", sans-serif'

function rpeLabel(rpe: number): string {
  if (rpe <= 1) return 'Too easy'
  if (rpe <= 3) return 'Good'
  if (rpe <= 5) return 'Hard'
  if (rpe <= 7) return 'Very hard'
  return 'Max effort'
}

export default function RecapPage() {
  const router = useRouter()
  const { workoutExercises, sessionId, group, reset } = useWorkout()

  // Guard: if no session, send home
  useEffect(() => {
    if (!sessionId) router.replace('/dashboard')
  }, [sessionId, router])

  if (!sessionId) return null

  // ── Stats ──────────────────────────────────────────────────────────────
  const completedExercises = workoutExercises.filter(we => we.complete)
  const totalSets = workoutExercises.reduce(
    (acc, we) => acc + we.sets.filter(s => s.logged).length, 0
  )
  const totalReps = workoutExercises.reduce(
    (acc, we) => acc + we.sets.filter(s => s.logged).reduce((a, s) => a + s.reps, 0), 0
  )
  const totalVolume = workoutExercises.reduce(
    (acc, we) => acc + we.sets.filter(s => s.logged).reduce((a, s) => a + s.weight_kg * s.reps, 0), 0
  )
  const avgRpe = (() => {
    const rpes = completedExercises.map(we => we.rpe).filter(Boolean) as number[]
    if (rpes.length === 0) return null
    return Math.round(rpes.reduce((a, b) => a + b, 0) / rpes.length * 10) / 10
  })()

  const handleDone = () => {
    reset()
    router.push('/dashboard')
  }

  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: FONT_BODY, color: C.text, maxWidth: 430, margin: '0 auto', paddingBottom: 120, position: 'relative' }}>
      {/* Glow blobs */}
      <div style={{ position: 'absolute', top: -100, right: -80, width: 300, height: 300, borderRadius: '50%', background: `radial-gradient(circle, ${C.glow1}, transparent 70%)`, filter: 'blur(40px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: 300, left: -80, width: 240, height: 240, borderRadius: '50%', background: `radial-gradient(circle, ${C.glow2}, transparent 70%)`, filter: 'blur(50px)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* Hero */}
        <div style={{ padding: '48px 20px 24px', textAlign: 'center' }}>
          {/* Checkmark circle */}
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: `linear-gradient(135deg, ${C.good}, ${C.primary})`, display: 'grid', placeItems: 'center', margin: '0 auto 20px', boxShadow: `0 0 32px ${C.good}50` }}>
            <Check size={32} color={C.bg} strokeWidth={3} />
          </div>
          <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: C.primary, fontWeight: 600, textShadow: SHADOW_1 }}>◆ Session complete</div>
          <h1 style={{ fontFamily: FONT_DISPLAY, fontWeight: 400, fontSize: 42, lineHeight: 1.05, margin: '8px 0 0' }}>
            You <span style={{ fontStyle: 'italic', color: C.good, textShadow: `0 0 14px ${C.good}80` }}>crushed</span> it.
          </h1>
        </div>

        {/* Stat row */}
        <div style={{ padding: '0 20px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
          {[
            { label: 'Exercises', value: completedExercises.length },
            { label: 'Sets', value: totalSets },
            { label: 'Reps', value: totalReps },
            { label: 'Avg RPE', value: avgRpe ? rpeLabel(avgRpe) : '—' },
           ].map(stat => (
            <div key={stat.label} style={{ background: C.surface, border: `1px solid ${C.hairStrong}`, borderRadius: 14, padding: '12px 8px', textAlign: 'center' }}>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, lineHeight: 1, color: C.primary }}>{stat.value}</div>
              <div style={{ fontSize: 10, color: C.mute, marginTop: 4, letterSpacing: 0.5 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Volume callout */}
        {totalVolume > 0 && (
          <div style={{ margin: '12px 20px 0', background: C.primarySoft, border: `1px solid ${C.primary}30`, borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Flame size={18} color={C.accent} />
            <div>
              <div style={{ fontSize: 13, color: C.text2 }}>Total volume lifted</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: C.primary, marginTop: 2 }}>
                {totalVolume >= 1000
                  ? `${(totalVolume / 1000).toFixed(1)}t`
                  : `${Math.round(totalVolume)}kg`
                }
              </div>
            </div>
          </div>
        )}

        {/* Exercise breakdown */}
        <div style={{ padding: '24px 20px 0' }}>
          <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: C.mute, fontWeight: 700, marginBottom: 12 }}>Breakdown</div>
          <div style={{ display: 'grid', gap: 10 }}>
            {workoutExercises.map((we, i) => {
              const loggedSets = we.sets.filter(s => s.logged)
              if (loggedSets.length === 0) return null

              // Best set = highest weight × reps
              const bestSet = loggedSets.reduce((best, s) =>
                s.weight_kg * s.reps > best.weight_kg * best.reps ? s : best
              )

              return (
                <div
                  key={we.exercise.id}
                  style={{ background: C.surface, border: `1px solid ${we.complete ? C.good + '30' : C.hairStrong}`, borderRadius: 16, padding: 16 }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {we.complete && <Check size={12} color={C.good} />}
                        <span style={{ fontSize: 14, fontWeight: 700 }}>{we.exercise.name}</span>
                      </div>
                      <div style={{ fontSize: 12, color: C.mute, marginTop: 3 }}>
                        {loggedSets.length} sets · {loggedSets.reduce((a, s) => a + s.reps, 0)} reps
                        {we.rpe ? ` · RPE ${we.rpe}` : ''}
                      </div>
                    </div>
                    {bestSet.weight_kg > 0 && (
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 11, color: C.mute }}>Best set</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: C.primary, marginTop: 1 }}>
                          {bestSet.weight_kg}kg × {bestSet.reps}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Set pills */}
                  <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {loggedSets.map((s, j) => (
                      <div
                        key={j}
                        style={{ fontSize: 11, padding: '4px 10px', borderRadius: 999, background: C.primarySoft, color: C.primary, fontWeight: 600 }}
                      >
                        {s.weight_kg > 0 ? `${s.weight_kg}kg × ${s.reps}` : `${s.reps} reps`}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, padding: '12px 20px 32px', background: `linear-gradient(to top, ${C.bg} 60%, transparent)`, maxWidth: 430, margin: '0 auto', zIndex: 5 }}>
        <button
          onClick={handleDone}
          style={{ width: '100%', padding: '18px 20px', borderRadius: 16, border: 'none', background: `linear-gradient(135deg, ${C.primary}, ${C.primary2})`, color: '#0C0920', fontFamily: FONT_BODY, fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 24px rgba(183,148,255,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
        >
          <Home size={18} />
          Back to dashboard
        </button>
      </div>
    </div>
  )
}