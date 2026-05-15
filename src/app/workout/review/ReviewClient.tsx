'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Sparkles, Battery, Clock, AlertCircle, Loader, Pencil, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
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

interface AiSuggestion {
  tag: string
  headline: string
  detail: string
  weight: number
}

interface Props {
  sessionCounts: Record<string, number>
  initialNotes: Record<string, string>
}

function getFallbackSuggestion(
  count: number, starterWeight: number, equipment: string,
  energy: string, time: string, pain: string,
) {
  const setsTarget = time === 'short' ? '2 sets' : '3 sets'
  if (pain === 'real') return {
    tag: 'Take it easy', tagColor: C.danger,
    headline: starterWeight > 0 ? `Drop to ${Math.round(starterWeight * 0.6 * 2) / 2}kg · focus on form` : 'Light effort only · focus on form',
    detail: 'You flagged real pain today. Keep intensity low.',
    weight: starterWeight > 0 ? Math.round(starterWeight * 0.6 * 2) / 2 : 0,
  }
  if (energy === 'low') return {
    tag: 'Easy session', tagColor: C.accent,
    headline: starterWeight > 0 ? `Try ${Math.round(starterWeight * 0.8 * 2) / 2}kg · ${setsTarget}` : `Bodyweight · take it steady`,
    detail: 'Energy is low. A lighter session still counts.',
    weight: starterWeight > 0 ? Math.round(starterWeight * 0.8 * 2) / 2 : 0,
  }
  if (count >= 3 && energy === 'high') {
    const bumped = nudgeWeight(starterWeight, equipment)
    return { tag: 'Progress', tagColor: C.good, headline: `Try ${bumped > 0 ? `${bumped}kg` : 'bodyweight'} · ${setsTarget} × 10`, detail: `${count} sessions logged and energy is high. Time to push.`, weight: bumped }
  }
  if (count >= 3) return { tag: 'Consolidate', tagColor: C.primary, headline: `Hold ${starterWeight > 0 ? `${starterWeight}kg` : 'bodyweight'} · ${setsTarget} × 10`, detail: 'Lock in clean reps before adding weight.', weight: starterWeight }
  if (count === 0) return { tag: 'First session', tagColor: C.primary, headline: `Start at ${starterWeight > 0 ? `${starterWeight}kg` : 'bodyweight'} · ${setsTarget}`, detail: 'First session is about learning the movement.', weight: starterWeight }
  return { tag: 'Building', tagColor: C.primary, headline: `${starterWeight > 0 ? `${starterWeight}kg` : 'Bodyweight'} · ${setsTarget} × 10`, detail: `${count} session${count === 1 ? '' : 's'} logged. Keep building.`, weight: starterWeight }
}

function nudgeWeight(current: number, equipment: string): number {
  if (current === 0) return 0
  switch (equipment.toLowerCase()) {
    case 'barbell': return current + 2.5
    case 'dumbbell': return current + 2
    case 'cable': return current + 2.5
    case 'machine': return current + 5
    default: return current + 2.5
  }
}

function tagColor(tag: string): string {
  const t = tag.toLowerCase()
  if (t.includes('progress') || t.includes('push')) return C.good
  if (t.includes('easy') || t.includes('deload') || t.includes('rest')) return C.accent
  if (t.includes('pain') || t.includes('careful')) return C.danger
  return C.primary
}

export default function ReviewClient({ sessionCounts, initialNotes }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const { selectedExercises, checkin, initWorkoutExercises, exerciseNotes, setExerciseNote } = useWorkout()

  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestion[] | null>(null)
  const [aiLoading, setAiLoading]         = useState(true)
  const [aiError, setAiError]             = useState(false)

  // Which exercise is currently being edited (note)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editingNoteText, setEditingNoteText] = useState('')

  // Accepted suggestions — exercise_id → true
  const [accepted, setAccepted] = useState<Record<string, boolean>>({})

  // Load initial notes into context on mount
  useEffect(() => {
    for (const [exerciseId, note] of Object.entries(initialNotes)) {
      setExerciseNote(exerciseId, note)
    }
  }, [])

  useEffect(() => {
    if (selectedExercises.length === 0 || !checkin) router.replace('/dashboard')
  }, [selectedExercises, checkin, router])

  useEffect(() => {
    if (selectedExercises.length === 0 || !checkin) return
    fetchSuggestions()
  }, [selectedExercises, checkin, sessionCounts])

  const fetchSuggestions = async () => {
    setAiLoading(true)
    setAiError(false)
    try {
      const res = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkin,
          exercises: selectedExercises.map(ex => ({
            name: ex.name,
            equipment: ex.equipment,
            sessionCount: sessionCounts[ex.id] ?? 0,
            lastPerformance: ex.lastPerformance,
            starterWeight: ex.starterWeight,
          })),
        }),
      })
      if (!res.ok) throw new Error('API failed')
      const { suggestions } = await res.json()
      setAiSuggestions(suggestions)
    } catch {
      setAiError(true)
    } finally {
      setAiLoading(false)
    }
  }

  const saveNote = async (exerciseId: string, note: string) => {
    setExerciseNote(exerciseId, note)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('exercise_notes').upsert({
      user_id: user.id,
      exercise_id: exerciseId,
      note: note.trim(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,exercise_id' })
  }

  const startEditNote = (exerciseId: string) => {
    setEditingNoteId(exerciseId)
    setEditingNoteText(exerciseNotes[exerciseId] ?? '')
  }

  const finishEditNote = async (exerciseId: string) => {
    await saveNote(exerciseId, editingNoteText)
    setEditingNoteId(null)
  }

  if (selectedExercises.length === 0 || !checkin) return null

  const { energy_level, time_planned, pain_status } = checkin

  const handleStart = () => {
    const progressTags = ['progress', 'push', 'increase', 'bump']
  
    const exercisesWithSuggestion = selectedExercises.map((ex, i) => {
      const aiS = aiSuggestions?.[i]
      const fallback = getFallbackSuggestion(
        sessionCounts[ex.id] ?? 0, ex.starterWeight, ex.equipment,
        energy_level, time_planned, pain_status
      )
  
      const isProgressSuggestion = aiS
        ? progressTags.some(t => aiS.tag.toLowerCase().includes(t))
        : false
  
      const isAccepted = accepted[ex.id]
  
      // For progress suggestions: only apply AI weight if explicitly accepted
      // For all other suggestions: apply AI weight automatically
      let weight: number
      if (aiS) {
        if (isProgressSuggestion && !isAccepted) {
          weight = ex.starterWeight // keep their current weight
        } else {
          weight = aiS.weight // apply AI weight
        }
      } else {
        weight = fallback.weight
      }
  
      return { ...ex, starterWeight: weight }
    })
  
    initWorkoutExercises(exercisesWithSuggestion)
    router.push('/workout/session')
  }

  const checkinSummary = [
    { icon: Battery, label: energy_level === 'low' ? 'Low energy' : energy_level === 'high' ? 'High energy' : 'Normal energy', color: energy_level === 'low' ? C.danger : energy_level === 'high' ? C.good : C.primary },
    { icon: Clock, label: time_planned === 'short' ? '~30 min' : time_planned === 'long' ? '60 min+' : '~45–60 min', color: C.primary },
    { icon: AlertCircle, label: pain_status === 'none' ? 'No pain' : pain_status === 'mild' ? 'Mild soreness' : 'Real pain', color: pain_status === 'none' ? C.good : pain_status === 'real' ? C.danger : C.accent },
  ]

  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: FONT_BODY, color: C.text, maxWidth: 430, margin: '0 auto', paddingBottom: 120, position: 'relative' }}>
      <div style={{ position: 'absolute', top: -100, right: -80, width: 300, height: 300, borderRadius: '50%', background: `radial-gradient(circle, ${C.glow1}, transparent 70%)`, filter: 'blur(40px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: 400, left: -80, width: 240, height: 240, borderRadius: '50%', background: `radial-gradient(circle, ${C.glow2}, transparent 70%)`, filter: 'blur(50px)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ padding: '20px 20px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', minHeight: 28 }}>
            <button onClick={() => router.back()} style={{ width: 40, height: 40, borderRadius: 999, border: `1px solid ${C.hair}`, background: C.surface, display: 'grid', placeItems: 'center', cursor: 'pointer', color: C.text }}>
              <ChevronLeft size={20} />
            </button>
          </div>
          <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: C.primary, marginTop: 10, fontWeight: 600, textShadow: SHADOW_1 }}>◆ Today's session</div>
          <h1 style={{ fontFamily: FONT_DISPLAY, fontWeight: 400, fontSize: 38, lineHeight: 1.05, margin: '4px 0 0' }}>
            Review<br />
            <span style={{ fontStyle: 'italic', color: C.primary, textShadow: SHADOW_1 }}>&amp; decide.</span>
          </h1>

          {/* Checkin pills */}
          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            {checkinSummary.map(({ icon: Icon, label, color }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 999, background: `${color}15`, border: `1px solid ${color}40` }}>
                <Icon size={11} color={color} />
                <span style={{ fontSize: 11, color, fontWeight: 600 }}>{label}</span>
              </div>
            ))}
          </div>

          {/* AI status */}
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            {aiLoading && (
              <>
                <Loader size={12} color={C.primary} style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: 12, color: C.primary }}>Claude is reviewing your session…</span>
              </>
            )}
            {!aiLoading && !aiError && aiSuggestions && (
              <>
                <Sparkles size={12} color={C.good} />
                <span style={{ fontSize: 12, color: C.good }}>AI suggestions ready</span>
              </>
            )}
            {!aiLoading && aiError && (
              <span style={{ fontSize: 12, color: C.mute }}>Using smart defaults</span>
            )}
          </div>
        </div>

        {/* Exercise cards */}
        <div style={{ padding: '14px 20px 0', display: 'grid', gap: 12 }}>
          {selectedExercises.map((ex, i) => {
            const count = sessionCounts[ex.id] ?? 0
            const fallback = getFallbackSuggestion(count, ex.starterWeight, ex.equipment, energy_level, time_planned, pain_status)
            const aiS = aiSuggestions?.[i]
            const isAccepted = accepted[ex.id]

            const tag      = aiLoading ? fallback.tag      : (aiS?.tag      ?? fallback.tag)
            const headline = aiLoading ? fallback.headline  : (aiS?.headline ?? fallback.headline)
            const detail   = aiLoading ? fallback.detail    : (aiS?.detail   ?? fallback.detail)
            const color    = aiLoading ? (fallback as any).tagColor : tagColor(tag)

            const currentNote = exerciseNotes[ex.id] ?? ''
            const isEditingNote = editingNoteId === ex.id

            return (
              <div key={ex.id} style={{ background: C.surface, border: `1px solid ${C.hairStrong}`, borderRadius: 18, padding: 18, opacity: aiLoading ? 0.7 : 1, transition: 'opacity 0.3s' }}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{ex.name}</div>
                    <div style={{ fontSize: 12, color: C.mute, marginTop: 2 }}>{ex.equipment}</div>
                  </div>
                  <div style={{ fontFamily: FONT_DISPLAY, fontSize: 15, fontStyle: 'italic', color: C.text2, textAlign: 'right', flexShrink: 0 }}>
                    {ex.lastPerformance ?? 'First time'}
                  </div>
                </div>

                {/* AI Suggestion card */}
                <div style={{ marginTop: 14, background: `${color}12`, border: `1px solid ${isAccepted ? C.good + '60' : color + '40'}`, borderRadius: 12, padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    {aiLoading
                      ? <Loader size={14} color={color} style={{ animation: 'spin 1s linear infinite' }} />
                      : <Sparkles size={14} color={isAccepted ? C.good : color} />
                    }
                    <span style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: isAccepted ? C.good : color, fontWeight: 700 }}>
                      {isAccepted ? '✓ Accepted' : tag}
                    </span>
                    {!aiLoading && !aiError && aiS && (
                      <span style={{ fontSize: 9, color: C.mute, marginLeft: 'auto', letterSpacing: 1 }}>AI</span>
                    )}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{headline}</div>
                  <div style={{ fontSize: 13, color: C.text2, marginTop: 6, lineHeight: 1.5 }}>{detail}</div>

                    {/* Accept button — only shown for progress suggestions */}
                    {(() => {
                    const progressTags = ['progress', 'push', 'increase', 'bump']
                    const isProgressSuggestion = aiS
                        ? progressTags.some(t => aiS.tag.toLowerCase().includes(t))
                        : false

                    if (!aiLoading && aiS && isProgressSuggestion && !isAccepted) {
                        return (
                        <button
                            onClick={() => setAccepted(a => ({ ...a, [ex.id]: true }))}
                            style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: `1px solid ${C.good}40`, background: `${C.good}15`, color: C.good, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                            <Check size={13} />
                            Accept — try {aiS.weight > 0 ? `${aiS.weight}kg` : 'this'}
                        </button>
                        )
                    }
                    if (!aiLoading && aiS && isProgressSuggestion && isAccepted) {
                        return (
                        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.good, fontWeight: 700 }}>
                            <Check size={13} />
                            Accepted — sets pre-filled at {aiS.weight > 0 ? `${aiS.weight}kg` : 'new target'}
                        </div>
                        )
                    }
                    return null
                    })()}               
                     </div>


                {/* Setup notes */}
                {ex.setup_notes && (
                  <div style={{ marginTop: 10, background: C.bgSoft, border: `1px solid ${C.hair}`, borderRadius: 10, padding: '10px 12px' }}>
                    <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: C.primary, fontWeight: 700, marginBottom: 3 }}>Setup</div>
                    <div style={{ fontSize: 13, color: C.text2, lineHeight: 1.4 }}>{ex.setup_notes}</div>
                  </div>
                )}

                {/* Personal note */}
                <div style={{ marginTop: 10, background: C.bgSoft, border: `1px solid ${isEditingNote ? C.primary + '60' : C.hair}`, borderRadius: 10, padding: '10px 12px', transition: 'border-color 0.2s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isEditingNote || currentNote ? 6 : 0 }}>
                    <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: C.primary, fontWeight: 700 }}>My note</div>
                    {!isEditingNote && (
                      <button
                        onClick={() => startEditNote(ex.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'transparent', border: 'none', color: C.mute, cursor: 'pointer', fontSize: 11, padding: 0 }}
                      >
                        <Pencil size={11} />
                        {currentNote ? 'Edit' : 'Add note'}
                      </button>
                    )}
                  </div>

                  {isEditingNote ? (
                    <div>
                      <textarea
                        autoFocus
                        value={editingNoteText}
                        onChange={e => setEditingNoteText(e.target.value)}
                        placeholder="e.g. Seat height 4 · use far cable machine · grip just inside rings"
                        rows={3}
                        style={{ width: '100%', background: 'transparent', border: 'none', color: C.text, fontSize: 13, fontFamily: FONT_BODY, resize: 'none', outline: 'none', lineHeight: 1.5, boxSizing: 'border-box' }}
                      />
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <button
                          onClick={() => finishEditNote(ex.id)}
                          style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', background: `linear-gradient(135deg, ${C.primary}, ${C.primary2})`, color: C.bg, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                          Save note
                        </button>
                        <button
                          onClick={() => setEditingNoteId(null)}
                          style={{ padding: '8px 14px', borderRadius: 8, border: `1px solid ${C.hair}`, background: 'transparent', color: C.mute, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : currentNote ? (
                    <div style={{ fontSize: 13, color: C.text2, lineHeight: 1.5 }}>{currentNote}</div>
                  ) : (
                    <div style={{ fontSize: 13, color: C.mute, fontStyle: 'italic' }}>No note yet — tap to add one</div>
                  )}
                </div>

              </div>
            )
          })}
        </div>
      </div>

      {/* CTA */}
      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, padding: '12px 20px 32px', background: `linear-gradient(to top, ${C.bg} 60%, transparent)`, maxWidth: 430, margin: '0 auto', zIndex: 5 }}>
        <button
          onClick={handleStart}
          style={{ width: '100%', padding: '18px 20px', borderRadius: 16, border: 'none', background: `linear-gradient(135deg, ${C.primary}, ${C.primary2})`, color: '#0C0920', fontFamily: FONT_BODY, fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 24px rgba(183,148,255,0.35)' }}
        >
          {aiLoading ? 'Getting suggestions…' : 'Let\'s go →'}
        </button>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}