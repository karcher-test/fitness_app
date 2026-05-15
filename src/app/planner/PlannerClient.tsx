'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft, Dumbbell, Wind, Bike, Moon, HelpCircle,
  Sparkles, Check, Plus, X, ChevronRight, Loader
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

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

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
type Day = typeof DAYS[number]

const DAY_LABELS: Record<Day, string> = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu',
  fri: 'Fri', sat: 'Sat', sun: 'Sun',
}

const DAY_FULL: Record<Day, string> = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
  fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
}

type SessionType = 'gym' | 'run' | 'cardio' | 'rest' | 'flexible'

const SESSION_TYPES: { id: SessionType; label: string; sub: string; color: string; icon: any }[] = [
  { id: 'gym',      label: 'Gym',          sub: 'Weight training',   color: '#B794FF', icon: Dumbbell },
  { id: 'run',      label: 'Run',          sub: 'Outdoor cardio',    color: '#7EE8C8', icon: Wind },
  { id: 'cardio',   label: 'Cardio class', sub: 'Spin, HIIT etc',    color: '#FF8FD1', icon: Bike },
  { id: 'flexible', label: 'Flexible',     sub: 'Decide on the day', color: '#FFD1E3', icon: HelpCircle },
  { id: 'rest',     label: 'Rest',         sub: 'Recovery day',      color: '#7D73A3', icon: Moon },
]

const ALL_GROUPS = [
  { id: 'chest', label: 'Chest' }, { id: 'back', label: 'Back' },
  { id: 'arms', label: 'Arms' }, { id: 'shoulders', label: 'Shoulders' },
  { id: 'legs', label: 'Legs' }, { id: 'abs', label: 'Abs' },
  { id: 'glutes', label: 'Glutes' }, { id: 'cardio', label: 'Cardio' },
]

interface DayPlan {
  type: SessionType
  focus?: string[]
  exercise_ids?: string[]
  template_id?: string
}

interface Exercise {
  id: string
  name: string
  equipment: string
  muscle_group: string
  setup_notes: string | null
}

interface Template {
  id: string
  name: string
  exercise_ids: string[]
}

interface AiSuggestion {
  day: string | null
  type: string
  message: string
  exercise: string | null
}

interface Props {
  weekStart: string
  existingPlan: Record<string, DayPlan> | null
  planId: string | null
  exercises: Exercise[]
  templates: Template[]
  userId: string
}

function typeColor(type: SessionType): string {
  return SESSION_TYPES.find(t => t.id === type)?.color ?? C.mute
}

function TypeIcon({ type, size = 16 }: { type: SessionType; size?: number }) {
  const t = SESSION_TYPES.find(st => st.id === type)
  if (!t) return null
  const Icon = t.icon
  return <Icon size={size} color={typeColor(type)} />
}

export default function PlannerClient({
  weekStart, existingPlan, planId, exercises, templates, userId
}: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [plan, setPlan] = useState<Partial<Record<Day, DayPlan>>>(existingPlan ?? {})
  const [editingDay, setEditingDay] = useState<Day | null>(null)
  const [sheetStep, setSheetStep] = useState<'type' | 'detail'>('type')
  const [showExercisePicker, setShowExercisePicker] = useState(false)
  const [pickerGroup, setPickerGroup] = useState('chest')
  const [reviewing, setReviewing] = useState(false)
  const [aiResult, setAiResult] = useState<{ overall: string; suggestions: AiSuggestion[] } | null>(null)
  const [acceptedSuggestions, setAcceptedSuggestions] = useState<number[]>([])
  const [saving, setSaving] = useState(false)

  const openDay = (day: Day) => {
    setEditingDay(day)
    setSheetStep('type')
    setShowExercisePicker(false)
  }

  const closeSheet = () => {
    setEditingDay(null)
    setShowExercisePicker(false)
  }

  const setDayType = (type: SessionType) => {
    if (!editingDay) return
    setPlan(p => ({
      ...p,
      [editingDay]: { type, focus: [], exercise_ids: [], template_id: undefined }
    }))
    if (type === 'gym') {
      setSheetStep('detail')
    } else {
      closeSheet()
    }
  }

  const toggleDayFocus = (focus: string) => {
    if (!editingDay) return
    const current = plan[editingDay]?.focus ?? []
    const updated = current.includes(focus)
      ? current.filter(f => f !== focus)
      : [...current, focus]
    setPlan(p => ({ ...p, [editingDay]: { ...p[editingDay]!, focus: updated } }))
  }

  const loadTemplate = (template: Template) => {
    if (!editingDay) return
    setPlan(p => ({
      ...p,
      [editingDay]: {
        ...p[editingDay]!,
        template_id: template.id,
        exercise_ids: template.exercise_ids,
      }
    }))
  }

  const toggleExercise = (exerciseId: string) => {
    if (!editingDay) return
    const current = plan[editingDay]?.exercise_ids ?? []
    const updated = current.includes(exerciseId)
      ? current.filter(id => id !== exerciseId)
      : [...current, exerciseId]
    setPlan(p => ({ ...p, [editingDay]: { ...p[editingDay]!, exercise_ids: updated } }))
  }

  // Accept an AI suggestion and apply it to the plan
  const acceptSuggestion = async (suggestion: AiSuggestion, idx: number) => {
    const day = suggestion.day as Day | null
    if (!day || !DAYS.includes(day)) {
      // No specific day — just mark as accepted
      setAcceptedSuggestions(prev => [...prev, idx])
      return
    }

    const currentDay = plan[day] ?? { type: 'gym', focus: [], exercise_ids: [] }

    if (suggestion.type === 'rest_day') {
      // Change the day to rest
      setPlan(p => ({ ...p, [day]: { type: 'rest', focus: [], exercise_ids: [] } }))
    } else if (suggestion.type === 'add_exercise' && suggestion.exercise) {
      // Find the exercise and add it to that day
      const ex = exercises.find(e =>
        e.name.toLowerCase() === suggestion.exercise!.toLowerCase()
      )
      if (ex) {
        const currentIds = currentDay.exercise_ids ?? []
        if (!currentIds.includes(ex.id)) {
          setPlan(p => ({
            ...p,
            [day]: { ...currentDay, exercise_ids: [...currentIds, ex.id] }
          }))
        }
      }
    } else if (suggestion.type === 'swap_day' || suggestion.type === 'reorder') {
      // For swap/reorder: change focus to upper body (safe default when legs are the issue)
      // The message will explain what to do — we apply a sensible change
      const newFocus = currentDay.focus?.filter(f =>
        !['legs', 'glutes'].includes(f)
      ) ?? []
      if (newFocus.length === 0) newFocus.push('chest', 'back', 'arms')
      setPlan(p => ({
        ...p,
        [day]: { ...currentDay, focus: newFocus }
      }))
    } else if (suggestion.type === 'add_to_session' && suggestion.exercise) {
      // Add suggested exercise to the day
      const ex = exercises.find(e =>
        e.name.toLowerCase() === suggestion.exercise!.toLowerCase()
      )
      if (ex) {
        const currentIds = currentDay.exercise_ids ?? []
        if (!currentIds.includes(ex.id)) {
          setPlan(p => ({
            ...p,
            [day]: { ...currentDay, exercise_ids: [...currentIds, ex.id] }
          }))
        }
      }
    }

    setAcceptedSuggestions(prev => [...prev, idx])
  }

  const getAiReview = async () => {
    setReviewing(true)
    setAiResult(null)
    setAcceptedSuggestions([])
    try {
      const planWithNames: Record<string, any> = {}
      for (const day of DAYS) {
        const d = plan[day]
        if (!d) { planWithNames[day] = { type: 'rest' }; continue }
        planWithNames[day] = {
          ...d,
          exerciseNames: (d.exercise_ids ?? [])
            .map(id => exercises.find(e => e.id === id)?.name)
            .filter(Boolean),
        }
      }
      const res = await fetch('/api/week-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: planWithNames,
          exercises: exercises.map(e => ({
            name: e.name,
            equipment: e.equipment,
            muscle_group: e.muscle_group,
          })),
        }),
      })
      const data = await res.json()
      setAiResult(data)
    } catch {
      setAiResult({ overall: "Looks like a solid week.", suggestions: [] })
    } finally {
      setReviewing(false)
    }
  }

  const savePlan = async () => {
    setSaving(true)
    await supabase
      .from('weekly_plans')
      .upsert({
        user_id: userId,
        week_start: weekStart,
        plan,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,week_start' })
    setSaving(false)
    router.push('/dashboard')
  }

  const editingDayPlan = editingDay ? plan[editingDay] : null
  const selectedExercises = editingDayPlan?.exercise_ids ?? []
  const selectedFocus = editingDayPlan?.focus ?? []
  const visibleExercises = exercises.filter(e => e.muscle_group === pickerGroup)
  const gymDaysCount = DAYS.filter(d => plan[d]?.type === 'gym').length

  const weekStartDate = new Date(weekStart + 'T00:00:00')
  const weekLabel = weekStartDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })

  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: FONT_BODY, color: C.text, maxWidth: 430, margin: '0 auto', paddingBottom: 120, position: 'relative' }}>
      <div style={{ position: 'absolute', top: -100, right: -80, width: 300, height: 300, borderRadius: '50%', background: `radial-gradient(circle, ${C.glow1}, transparent 70%)`, filter: 'blur(40px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: 400, left: -80, width: 240, height: 240, borderRadius: '50%', background: `radial-gradient(circle, ${C.glow2}, transparent 70%)`, filter: 'blur(50px)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ padding: '20px 20px 0' }}>
          <button onClick={() => router.back()} style={{ width: 40, height: 40, borderRadius: 999, border: `1px solid ${C.hair}`, background: C.surface, display: 'grid', placeItems: 'center', cursor: 'pointer', color: C.text }}>
            <ChevronLeft size={20} />
          </button>
          <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: C.primary, marginTop: 14, fontWeight: 600, textShadow: SHADOW_1 }}>◆ Week of {weekLabel}</div>
          <h1 style={{ fontFamily: FONT_DISPLAY, fontWeight: 400, fontSize: 38, lineHeight: 1.05, margin: '4px 0 0' }}>
            Plan your<br />
            <span style={{ fontStyle: 'italic', color: C.primary, textShadow: SHADOW_1 }}>week.</span>
          </h1>
          <p style={{ fontSize: 14, color: C.text2, marginTop: 10, lineHeight: 1.5 }}>
            Tap each day to set your intention. Then get AI to review the whole week.
          </p>
        </div>

        {/* Day grid */}
        <div style={{ padding: '24px 20px 0', display: 'grid', gap: 10 }}>
          {DAYS.map(day => {
            const d = plan[day]
            const type = d?.type ?? 'rest'
            const color = typeColor(type)
            const exCount = d?.exercise_ids?.length ?? 0
            const focusLabel = d?.focus && d.focus.length > 0
              ? d.focus.map(f => f.charAt(0).toUpperCase() + f.slice(1)).join(' + ')
              : null

            return (
              <button
                key={day}
                onClick={() => openDay(day)}
                style={{ width: '100%', textAlign: 'left', background: type === 'rest' ? C.surface : `${color}12`, border: `1px solid ${type === 'rest' ? C.hairStrong : color + '50'}`, borderRadius: 16, padding: '14px 16px', cursor: 'pointer', color: C.text, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 14 }}
              >
                <div style={{ width: 36, flexShrink: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.mute, letterSpacing: 1 }}>{DAY_LABELS[day]}</div>
                </div>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: type === 'rest' ? C.hairStrong : `${color}25`, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <TypeIcon type={type} size={16} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: type === 'rest' ? C.mute : C.text }}>
                    {type === 'gym' && focusLabel ? focusLabel : SESSION_TYPES.find(t => t.id === type)?.label ?? 'Rest'}
                  </div>
                  {type === 'gym' && (
                    <div style={{ fontSize: 12, color: C.mute, marginTop: 2 }}>
                      {exCount > 0 ? `${exCount} exercise${exCount > 1 ? 's' : ''} planned` : 'Tap to add exercises'}
                    </div>
                  )}
                </div>
                <ChevronRight size={16} color={C.mute} />
              </button>
            )
          })}
        </div>

        {/* AI review result */}
        {aiResult && (
          <div style={{ padding: '20px 20px 0' }}>
            <div style={{ background: C.surface, border: `1px solid ${C.primary}40`, borderRadius: 18, padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Sparkles size={16} color={C.primary} />
                <span style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: C.primary, fontWeight: 700 }}>AI Week Review</span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>{aiResult.overall}</div>

              {aiResult.suggestions.map((s, i) => {
                const isAccepted = acceptedSuggestions.includes(i)
                return (
                  <div
                    key={i}
                    style={{ marginTop: i === 0 ? 0 : 10, background: isAccepted ? `${C.good}08` : C.bgSoft, border: `1px solid ${isAccepted ? C.good + '40' : C.hair}`, borderRadius: 12, padding: '12px 14px', opacity: isAccepted ? 0.7 : 1, transition: 'all 0.2s' }}
                  >
                    {s.day && (
                      <div style={{ fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: isAccepted ? C.good : C.accent, fontWeight: 700, marginBottom: 4 }}>
                        {isAccepted ? '✓ Applied' : DAY_FULL[s.day as Day] ?? s.day}
                      </div>
                    )}
                    <div style={{ fontSize: 13, color: C.text2, lineHeight: 1.5 }}>{s.message}</div>
                    {s.exercise && !isAccepted && (
                      <div style={{ marginTop: 6, fontSize: 12, color: C.primary, fontWeight: 600 }}>
                        💡 {s.exercise}
                      </div>
                    )}

                    {/* Accept button */}
                    {!isAccepted && (
                      <button
                        onClick={() => acceptSuggestion(s, i)}
                        style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: `1px solid ${C.good}40`, background: `${C.good}15`, color: C.good, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                      >
                        <Check size={13} />
                        Apply this change
                      </button>
                    )}
                  </div>
                )
              })}

              {/* Re-review after accepting suggestions */}
              {acceptedSuggestions.length > 0 && (
                <button
                  onClick={getAiReview}
                  style={{ marginTop: 14, width: '100%', padding: '12px', borderRadius: 12, border: `1px solid ${C.primary}40`, background: C.primarySoft, color: C.primary, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <Sparkles size={13} />
                  Re-review updated plan
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom CTAs */}
      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, padding: '12px 20px 32px', background: `linear-gradient(to top, ${C.bg} 60%, transparent)`, maxWidth: 430, margin: '0 auto', zIndex: 5, display: 'grid', gap: 8 }}>
        {gymDaysCount > 0 && !aiResult && (
          <button
            onClick={getAiReview}
            disabled={reviewing}
            style={{ width: '100%', padding: '14px', borderRadius: 14, border: `1px solid ${C.primary}40`, background: C.primarySoft, color: C.primary, fontFamily: FONT_BODY, fontSize: 14, fontWeight: 600, cursor: reviewing ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            {reviewing
              ? <Loader size={15} style={{ animation: 'spin 1s linear infinite' }} />
              : <Sparkles size={15} />
            }
            {reviewing ? 'Reviewing your week…' : 'Get AI review'}
          </button>
        )}
        <button
          onClick={savePlan}
          disabled={saving}
          style={{ width: '100%', padding: '18px', borderRadius: 16, border: 'none', background: `linear-gradient(135deg, ${C.primary}, ${C.primary2})`, color: '#0C0920', fontFamily: FONT_BODY, fontSize: 16, fontWeight: 700, cursor: saving ? 'default' : 'pointer', boxShadow: '0 8px 24px rgba(183,148,255,0.35)' }}
        >
          {saving ? 'Saving…' : 'Save plan'}
        </button>
      </div>

      {/* Day sheet */}
      {editingDay && (
        <>
          <div onClick={closeSheet} style={{ position: 'fixed', inset: 0, background: 'rgba(12,9,32,0.7)', backdropFilter: 'blur(4px)', zIndex: 20 }} />
          <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, maxWidth: 430, margin: '0 auto', background: C.bgSoft, borderTop: `1px solid ${C.hairStrong}`, borderRadius: '24px 24px 0 0', zIndex: 21, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px 20px 0', flexShrink: 0 }}>
              <div style={{ width: 40, height: 4, borderRadius: 99, background: C.hair, margin: '0 auto 16px' }} />
              <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: C.primary, fontWeight: 600 }}>{DAY_FULL[editingDay]}</div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 26, margin: '4px 0 16px' }}>
                {sheetStep === 'type' ? 'What are you doing?' : 'Set up your session'}
              </div>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, padding: '0 20px 32px' }}>

              {/* Step 1: Type */}
              {sheetStep === 'type' && (
                <div style={{ display: 'grid', gap: 8 }}>
                  {SESSION_TYPES.map(t => {
                    const active = editingDayPlan?.type === t.id
                    const Icon = t.icon
                    return (
                      <button
                        key={t.id}
                        onClick={() => setDayType(t.id)}
                        style={{ textAlign: 'left', padding: '14px 16px', borderRadius: 14, border: `1px solid ${active ? t.color : C.hairStrong}`, background: active ? `${t.color}15` : C.surface, color: C.text, fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
                      >
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${t.color}20`, display: 'grid', placeItems: 'center', color: t.color, flexShrink: 0 }}>
                          <Icon size={16} />
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: active ? t.color : C.text }}>{t.label}</div>
                          <div style={{ fontSize: 12, color: C.mute, marginTop: 2 }}>{t.sub}</div>
                        </div>
                        {active && <Check size={16} color={t.color} style={{ marginLeft: 'auto' }} />}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Step 2: Gym detail */}
              {sheetStep === 'detail' && editingDayPlan?.type === 'gym' && (
                <div>
                  {/* Focus — multi select */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: C.mute, fontWeight: 600, marginBottom: 6 }}>Focus areas</div>
                    <div style={{ fontSize: 12, color: C.mute, marginBottom: 10 }}>Tap all that apply</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {ALL_GROUPS.map(g => {
                        const active = selectedFocus.includes(g.id)
                        return (
                          <button
                            key={g.id}
                            onClick={() => toggleDayFocus(g.id)}
                            style={{ padding: '8px 16px', borderRadius: 999, border: `1px solid ${active ? C.primary : C.hairStrong}`, background: active ? C.primarySoft : 'transparent', color: active ? C.primary : C.mute, fontSize: 13, fontWeight: active ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit', boxShadow: active ? SHADOW_1 : 'none' }}
                          >
                            {g.label}
                          </button>
                        )
                      })}
                    </div>
                    {selectedFocus.length > 0 && (
                      <div style={{ marginTop: 10, fontSize: 12, color: C.primary, fontWeight: 600 }}>
                        {selectedFocus.map(f => f.charAt(0).toUpperCase() + f.slice(1)).join(' + ')}
                      </div>
                    )}
                  </div>

                  {/* Templates */}
                  {templates.length > 0 && (
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: C.mute, fontWeight: 600, marginBottom: 10 }}>Load a template</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {templates.map(t => {
                          const loaded = editingDayPlan?.template_id === t.id
                          return (
                            <button
                              key={t.id}
                              onClick={() => loadTemplate(t)}
                              style={{ padding: '8px 14px', borderRadius: 999, border: `1px solid ${loaded ? C.accent : C.hairStrong}`, background: loaded ? `${C.accent}15` : 'transparent', color: loaded ? C.accent : C.mute, fontSize: 12, fontWeight: loaded ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit' }}
                            >
                              {t.name} · {t.exercise_ids.length}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Exercise picker */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: C.mute, fontWeight: 600 }}>
                        Exercises {selectedExercises.length > 0 ? `· ${selectedExercises.length} selected` : ''}
                      </div>
                      <button
                        onClick={() => setShowExercisePicker(p => !p)}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'transparent', border: 'none', color: C.primary, fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
                      >
                        {showExercisePicker ? <X size={13} /> : <Plus size={13} />}
                        {showExercisePicker ? 'Close' : 'Add exercises'}
                      </button>
                    </div>

                    {selectedExercises.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: showExercisePicker ? 12 : 0 }}>
                        {selectedExercises.map(id => {
                          const ex = exercises.find(e => e.id === id)
                          if (!ex) return null
                          return (
                            <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 999, background: C.primarySoft, border: `1px solid ${C.primary}40` }}>
                              <span style={{ fontSize: 11, color: C.primary, fontWeight: 600 }}>{ex.name}</span>
                              <button onClick={() => toggleExercise(id)} style={{ background: 'transparent', border: 'none', color: C.mute, cursor: 'pointer', padding: 0, display: 'grid', placeItems: 'center' }}>
                                <X size={10} />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {showExercisePicker && (
                      <div>
                        <div style={{ overflowX: 'auto', display: 'flex', gap: 6, scrollbarWidth: 'none', marginBottom: 10 }}>
                          {ALL_GROUPS.map(g => (
                            <button
                              key={g.id}
                              onClick={() => setPickerGroup(g.id)}
                              style={{ flexShrink: 0, padding: '6px 12px', borderRadius: 999, border: `1px solid ${pickerGroup === g.id ? C.primary : C.hairStrong}`, background: pickerGroup === g.id ? C.primarySoft : 'transparent', color: pickerGroup === g.id ? C.primary : C.mute, fontSize: 12, fontWeight: pickerGroup === g.id ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit' }}
                            >
                              {g.label}
                            </button>
                          ))}
                        </div>
                        <div style={{ display: 'grid', gap: 6 }}>
                          {visibleExercises.map(ex => {
                            const isSelected = selectedExercises.includes(ex.id)
                            return (
                              <button
                                key={ex.id}
                                onClick={() => toggleExercise(ex.id)}
                                style={{ textAlign: 'left', padding: '10px 14px', borderRadius: 12, border: `1px solid ${isSelected ? C.primary : C.hair}`, background: isSelected ? C.primarySoft : 'transparent', color: C.text, fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                              >
                                <div>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: isSelected ? C.primary : C.text }}>{ex.name}</div>
                                  <div style={{ fontSize: 11, color: C.mute, marginTop: 1 }}>{ex.equipment}</div>
                                </div>
                                {isSelected && <Check size={14} color={C.primary} />}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={closeSheet}
                    style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: `linear-gradient(135deg, ${C.primary}, ${C.primary2})`, color: C.bg, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}