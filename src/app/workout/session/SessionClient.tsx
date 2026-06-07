'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronDown, ChevronUp, Check, Flag, X, Pencil } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useWorkout } from '../context'

const C = {
  bg: '#0C0920', bgSoft: '#120E2A', surface: 'rgba(255,255,255,0.03)',
  surfaceSolid: '#1A1438',
  text: '#EDE5FF', text2: '#C4B8E0', mute: '#7D73A3',
  hair: 'rgba(255,255,255,0.08)', hairStrong: 'rgba(183,148,255,0.2)',
  primary: '#B794FF', primary2: '#FFD1E3', primarySoft: 'rgba(183,148,255,0.12)',
  accent: '#FF8FD1', danger: '#FF5E8A', good: '#7EE8C8',
  glow1: 'rgba(183,148,255,0.3)',
}
const SHADOW_1 = '0 0 14px rgba(183,148,255,0.5)'
const FONT_DISPLAY = '"Fraunces", "Cormorant Garamond", Georgia, serif'
const FONT_BODY = '"Inter", sans-serif'

type LogType = 'weight_reps' | 'distance_time' | 'time_level' | 'time_reps'

interface Props {
  userId: string
  allExercises: import('../context').Exercise[]
  initialNotes: Record<string, string>
}

export default function SessionClient({ userId, allExercises, initialNotes }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const {
    workoutExercises, checkin, group,
    updateSet, setRpe, markExerciseComplete, undoComplete,
    setSessionId, sessionId, reset,
    addSet, addExerciseToSession,
    removeSet, removeExercise,
    exerciseNotes, setExerciseNote,
  } = useWorkout()

  const [expandedIdx, setExpandedIdx] = useState(0)
  const [rpeSheetIdx, setRpeSheetIdx] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [showAddSheet, setShowAddSheet] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editingNoteText, setEditingNoteText] = useState('')

  const sessionExerciseIds = useRef<Record<number, string>>({})
  const sessionCreated = useRef(false)

  useEffect(() => {
    for (const [exerciseId, note] of Object.entries(initialNotes)) {
      setExerciseNote(exerciseId, note)
    }
  }, [])

  useEffect(() => {
    if (workoutExercises.length === 0) router.replace('/dashboard')
  }, [workoutExercises, router])

  useEffect(() => {
    if (!checkin || sessionId || workoutExercises.length === 0 || sessionCreated.current) return
    sessionCreated.current = true

    const createSession = async () => {
      const { data, error } = await supabase
        .from('workout_sessions')
        .insert({
          user_id: userId,
          focus: group ?? 'general',
          energy_level: checkin.energy_level,
          time_planned: checkin.time_planned,
          pain_status: checkin.pain_status,
          started_at: new Date().toISOString(),
        })
        .select('id')
        .single()

      if (error) { console.error('Failed to create session:', error); return }
      setSessionId(data.id)
    }

    createSession()
  }, [checkin, workoutExercises])

  const logSet = useCallback(async (exIdx: number, setIdx: number) => {
    if (!sessionId) return
    const we = workoutExercises[exIdx]
    const set = we.sets[setIdx]

    let seId = sessionExerciseIds.current[exIdx]
    if (!seId) {
      const { data, error } = await supabase
        .from('session_exercises')
        .insert({
          session_id: sessionId,
          exercise_id: we.exercise.id,
          position: exIdx + 1,
        })
        .select('id')
        .single()

      if (error) { console.error('Failed to create session_exercise:', error); return }
      seId = data.id
      sessionExerciseIds.current[exIdx] = seId
    }

    const { error: setError } = await supabase
      .from('exercise_sets')
      .insert({
        session_exercise_id: seId,
        position: setIdx + 1,
        weight_kg: set.weight_kg,
        reps: set.reps,
        logged: true,
      })

    if (setError) { console.error('Failed to log set:', setError); return }

    updateSet(exIdx, setIdx, { logged: true })

    const allLogged = we.sets.every((s, i) => i === setIdx ? true : s.logged)
    if (allLogged) setRpeSheetIdx(exIdx)
  }, [sessionId, workoutExercises, supabase, updateSet])

  const confirmRpe = useCallback(async (exIdx: number, rpe: number) => {
    const seId = sessionExerciseIds.current[exIdx]
    if (seId) {
      await supabase
        .from('session_exercises')
        .update({ rpe, complete: true })
        .eq('id', seId)
    }
    setRpe(exIdx, rpe)
    markExerciseComplete(exIdx)
    setRpeSheetIdx(null)

    const nextIdx = workoutExercises.findIndex((we, i) => i > exIdx && !we.complete)
    if (nextIdx !== -1) setExpandedIdx(nextIdx)
  }, [sessionExerciseIds, supabase, setRpe, markExerciseComplete, workoutExercises])

  const finishWorkout = async () => {
    if (!sessionId) return
    setSaving(true)
    const now = new Date().toISOString()
    const lockedAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    await supabase
      .from('workout_sessions')
      .update({ finished_at: now, locked_at: lockedAt })
      .eq('id', sessionId)

    router.push('/workout/recap')
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

  if (workoutExercises.length === 0) return null

  const anyComplete = workoutExercises.some(we => we.complete)
  const allComplete = workoutExercises.every(we => we.complete)

  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: FONT_BODY, color: C.text, maxWidth: 430, margin: '0 auto', paddingBottom: 140, position: 'relative' }}>
      <div style={{ position: 'absolute', top: -100, right: -80, width: 300, height: 300, borderRadius: '50%', background: `radial-gradient(circle, ${C.glow1}, transparent 70%)`, filter: 'blur(40px)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Top bar */}
        <div style={{ padding: '20px 20px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', minHeight: 28 }}>
            <button
              onClick={() => { if (confirm('Leave this workout? Progress will still be saved.')) router.push('/dashboard') }}
              style={{ width: 40, height: 40, borderRadius: 999, border: `1px solid ${C.hair}`, background: C.surface, display: 'grid', placeItems: 'center', cursor: 'pointer', color: C.text }}
            >
              <ChevronLeft size={20} />
            </button>
          </div>
          <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: C.primary, marginTop: 10, fontWeight: 600, textShadow: SHADOW_1 }}>◆ In session</div>
          <h1 style={{ fontFamily: FONT_DISPLAY, fontWeight: 400, fontSize: 38, lineHeight: 1.05, margin: '4px 0 0' }}>
            Let's<br />
            <span style={{ fontStyle: 'italic', color: C.primary, textShadow: SHADOW_1 }}>work.</span>
          </h1>
        </div>

        {/* Progress bar */}
        <div style={{ padding: '12px 20px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.mute, marginBottom: 6 }}>
            <span>{workoutExercises.filter(we => we.complete).length} / {workoutExercises.length} exercises</span>
            <span>{Math.round(workoutExercises.filter(we => we.complete).length / workoutExercises.length * 100)}%</span>
          </div>
          <div style={{ height: 4, background: C.hairStrong, borderRadius: 99 }}>
            <div style={{ height: '100%', borderRadius: 99, background: `linear-gradient(to right, ${C.primary}, ${C.primary2})`, width: `${workoutExercises.filter(we => we.complete).length / workoutExercises.length * 100}%`, transition: 'width 0.4s ease' }} />
          </div>
        </div>

        {/* Exercise cards */}
        <div style={{ padding: '16px 20px 0', display: 'grid', gap: 10 }}>
          {workoutExercises.map((we, exIdx) => {
            const isExpanded = expandedIdx === exIdx
            const loggedSets = we.sets.filter(s => s.logged).length
            const currentNote = exerciseNotes[we.exercise.id] ?? ''
            const isEditingNote = editingNoteId === we.exercise.id
            const logType: LogType = (we.exercise.log_type ?? 'weight_reps') as LogType

            const col1Header = { weight_reps: 'Weight', distance_time: 'Distance', time_level: 'Time', time_reps: 'Time' }[logType]
            const col2Header = { weight_reps: 'Reps', distance_time: 'Time', time_level: 'Level', time_reps: 'Rounds' }[logType]

            return (
              <div
                key={we.exercise.id}
                style={{
                  background: we.complete
                    ? `linear-gradient(135deg, rgba(126,232,200,0.06), rgba(183,148,255,0.04))`
                    : C.surface,
                  border: `1px solid ${we.complete ? C.good + '50' : isExpanded ? C.primary + '60' : C.hairStrong}`,
                  borderRadius: 18, overflow: 'hidden',
                }}
              >
                {/* Card header */}
                <div style={{ display: 'flex', alignItems: 'center', padding: '16px 18px', gap: 8 }}>
                  <button
                    onClick={() => setExpandedIdx(isExpanded ? -1 : exIdx)}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'transparent', border: 'none', cursor: 'pointer', color: C.text, fontFamily: 'inherit', textAlign: 'left', gap: 12, padding: 0 }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {we.complete && <Check size={14} color={C.good} />}
                        <span style={{ fontSize: 15, fontWeight: 700, color: we.complete ? C.good : C.text }}>{we.exercise.name}</span>
                      </div>
                      <div style={{ fontSize: 12, color: C.mute, marginTop: 2 }}>
                        {we.complete
                          ? `Done · RPE ${we.rpe ?? '—'}`
                          : `${loggedSets}/${we.sets.length} sets · ${we.exercise.equipment}`
                        }
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp size={18} color={C.mute} /> : <ChevronDown size={18} color={C.mute} />}
                  </button>

                  {/* Undo complete */}
                  {we.complete && (
                    <button
                      onClick={async e => {
                        e.stopPropagation()
                        undoComplete(exIdx)
                        const seId = sessionExerciseIds.current[exIdx]
                        if (seId) {
                          await supabase.from('exercise_sets').delete().eq('session_exercise_id', seId)
                          await supabase.from('session_exercises').update({ complete: false, rpe: null }).eq('id', seId)
                        }
                        setExpandedIdx(exIdx)
                      }}
                      style={{ flexShrink: 0, fontSize: 11, color: C.mute, background: 'transparent', border: `1px solid ${C.hair}`, borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      Undo
                    </button>
                  )}

                  {/* Remove exercise */}
                  {!we.complete && (
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        if (confirm(`Remove ${we.exercise.name}?`)) removeExercise(exIdx)
                      }}
                      style={{ width: 32, height: 32, borderRadius: 999, border: `1px solid ${C.danger}40`, background: 'transparent', color: C.danger, display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0 }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Expanded content */}
                {isExpanded && !we.complete && (
                  <div style={{ padding: '0 18px 18px', borderTop: `1px solid ${C.hair}` }}>
                    {/* Setup notes */}
                    {we.exercise.setup_notes && (
                      <div style={{ padding: '10px 0', fontSize: 12, color: C.text2, lineHeight: 1.5, borderBottom: `1px solid ${C.hair}` }}>
                        {we.exercise.setup_notes}
                      </div>
                    )}

                    {/* Personal note */}
                    <div style={{ marginTop: 10, background: 'rgba(183,148,255,0.05)', border: `1px solid ${isEditingNote ? C.primary + '60' : C.hair}`, borderRadius: 10, padding: '10px 12px', marginBottom: 8, transition: 'border-color 0.2s' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isEditingNote || currentNote ? 6 : 0 }}>
                        <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: C.primary, fontWeight: 700 }}>My note</div>
                        {!isEditingNote && (
                          <button
                            onClick={() => { setEditingNoteId(we.exercise.id); setEditingNoteText(currentNote) }}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'transparent', border: 'none', color: C.mute, cursor: 'pointer', fontSize: 11, padding: 0, fontFamily: 'inherit' }}
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
                            placeholder="e.g. Seat height 4 · use far cable machine"
                            rows={2}
                            style={{ width: '100%', background: 'transparent', border: 'none', color: C.text, fontSize: 13, fontFamily: FONT_BODY, resize: 'none', outline: 'none', lineHeight: 1.5, boxSizing: 'border-box' }}
                          />
                          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                            <button
                              onClick={async () => { await saveNote(we.exercise.id, editingNoteText); setEditingNoteId(null) }}
                              style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', background: `linear-gradient(135deg, ${C.primary}, ${C.primary2})`, color: C.bg, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                            >
                              Save
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
                        <div style={{ fontSize: 13, color: C.mute, fontStyle: 'italic' }}>Tap to add a note</div>
                      )}
                    </div>

                    {/* Set rows */}
                    <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr 1fr 44px 32px', gap: 8, padding: '0 4px' }}>
                        {['Set', col1Header, col2Header, '', ''].map((h, i) => (
                          <div key={i} style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: C.mute, fontWeight: 600 }}>{h}</div>
                        ))}
                      </div>

                      {we.sets.map((set, setIdx) => (
                        <SetRow
                          key={setIdx}
                          setNum={setIdx + 1}
                          set={set}
                          disabled={set.logged || (setIdx > 0 && !we.sets[setIdx - 1].logged)}
                          onWeightChange={v => updateSet(exIdx, setIdx, { weight_kg: v })}
                          onRepsChange={v => updateSet(exIdx, setIdx, { reps: v })}
                          onLog={() => logSet(exIdx, setIdx)}
                          onRemove={() => {
                            removeSet(exIdx, setIdx)
                            const remainingSets = we.sets.filter((_, j) => j !== setIdx)
                            const allNowLogged = remainingSets.every(s => s.logged)
                            if (allNowLogged && remainingSets.length > 0) setRpeSheetIdx(exIdx)
                          }}
                          canRemove={!set.logged && we.sets.length > 1}
                          logType={logType}
                        />
                      ))}

                      <button
                        onClick={() => addSet(exIdx)}
                        style={{ marginTop: 4, fontSize: 13, color: C.primary, background: 'transparent', border: `1px dashed ${C.primary}40`, borderRadius: 10, padding: '10px', cursor: 'pointer', fontFamily: 'inherit', width: '100%' }}
                      >
                        + Add set
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Fixed bottom */}
      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, padding: '12px 20px 32px', background: `linear-gradient(to top, ${C.bg} 70%, transparent)`, maxWidth: 430, margin: '0 auto', zIndex: 5, display: 'grid', gap: 8 }}>
        {anyComplete && (
          <button
            onClick={finishWorkout}
            disabled={saving}
            style={{ width: '100%', padding: '18px 20px', borderRadius: 16, border: 'none', background: allComplete ? `linear-gradient(135deg, ${C.good}, ${C.primary})` : `linear-gradient(135deg, ${C.primary}, ${C.primary2})`, color: '#0C0920', fontFamily: FONT_BODY, fontSize: 16, fontWeight: 700, cursor: saving ? 'default' : 'pointer', boxShadow: '0 8px 24px rgba(183,148,255,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
          >
            <Flag size={18} />
            {saving ? 'Saving…' : allComplete ? 'Finish workout' : 'Finish early'}
          </button>
        )}
        <button
          onClick={() => setShowAddSheet(true)}
          style={{ width: '100%', padding: '14px', borderRadius: 14, border: `1px dashed ${C.primary}40`, background: C.primarySoft, color: C.primary, fontFamily: FONT_BODY, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
        >
          + Add exercise
        </button>
      </div>

      {/* RPE sheet */}
      {rpeSheetIdx !== null && (
        <RpeSheet
          exerciseName={workoutExercises[rpeSheetIdx].exercise.name}
          onSelect={rpe => confirmRpe(rpeSheetIdx, rpe)}
          onSkip={() => confirmRpe(rpeSheetIdx, 5)}
        />
      )}

      {/* Add exercise sheet */}
      {showAddSheet && (
        <AddExerciseSheet
          allExercises={allExercises}
          currentIds={workoutExercises.map(we => we.exercise.id)}
          onAdd={exercise => {
            const newIdx = workoutExercises.length
            addExerciseToSession(exercise)
            setExpandedIdx(newIdx)
            setShowAddSheet(false)
          }}
          onClose={() => setShowAddSheet(false)}
        />
      )}
    </div>
  )
}

// ─── Set row ──────────────────────────────────────────────────────────────

interface SetRowProps {
  setNum: number
  set: { weight_kg: number; reps: number; logged: boolean }
  disabled: boolean
  onWeightChange: (v: number) => void
  onRepsChange: (v: number) => void
  onLog: () => void
  onRemove: () => void
  canRemove: boolean
  logType: LogType
}

function SetRow({ setNum, set, disabled, onWeightChange, onRepsChange, onLog, onRemove, canRemove, logType }: SetRowProps) {
  const inputStyle = (active: boolean): React.CSSProperties => ({
    width: '100%', padding: '10px 8px', borderRadius: 10,
    border: `1px solid ${active ? C.primary + '60' : C.hair}`,
    background: set.logged ? 'transparent' : C.bgSoft,
    color: set.logged ? C.mute : C.text,
    fontSize: 15, fontWeight: 600, textAlign: 'center',
    fontFamily: FONT_BODY, outline: 'none',
  })

  const col1Label = { weight_reps: 'kg', distance_time: 'km', time_level: 'mins', time_reps: 'mins' }[logType]
  const col2Label = { weight_reps: 'reps', distance_time: 'mins', time_level: 'level', time_reps: 'rounds' }[logType]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr 1fr 44px 32px', gap: 8, alignItems: 'center', opacity: disabled ? 0.4 : 1 }}>
      <div style={{ fontSize: 12, color: set.logged ? C.good : C.mute, fontWeight: 700, textAlign: 'center' }}>
        {set.logged ? <Check size={14} color={C.good} /> : setNum}
      </div>
      <div>
        <input
          type="number"
          value={set.weight_kg || ''}
          onChange={e => onWeightChange(parseFloat(e.target.value) || 0)}
          disabled={set.logged || disabled}
          style={inputStyle(!set.logged && !disabled)}
          inputMode="decimal"
          placeholder={col1Label}
        />
        <div style={{ fontSize: 9, color: C.mute, textAlign: 'center', marginTop: 2 }}>{col1Label}</div>
      </div>
      <div>
        <input
          type="number"
          value={set.reps || ''}
          onChange={e => onRepsChange(parseInt(e.target.value) || 0)}
          disabled={set.logged || disabled}
          style={inputStyle(!set.logged && !disabled)}
          inputMode="numeric"
          placeholder={col2Label}
        />
        <div style={{ fontSize: 9, color: C.mute, textAlign: 'center', marginTop: 2 }}>{col2Label}</div>
      </div>
      <button
        onClick={onLog}
        disabled={set.logged || disabled}
        style={{ width: 44, height: 44, borderRadius: 12, border: 'none', background: set.logged ? C.good + '20' : disabled ? C.hair : C.primary, color: set.logged ? C.good : '#0C0920', display: 'grid', placeItems: 'center', cursor: set.logged || disabled ? 'default' : 'pointer', flexShrink: 0 }}
      >
        <Check size={16} />
      </button>
      <button
        onClick={onRemove}
        disabled={!canRemove}
        style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${canRemove ? C.danger + '40' : 'transparent'}`, background: 'transparent', color: canRemove ? C.danger : 'transparent', display: 'grid', placeItems: 'center', cursor: canRemove ? 'pointer' : 'default' }}
      >
        <X size={14} />
      </button>
    </div>
  )
}

// ─── RPE sheet ────────────────────────────────────────────────────────────

interface RpeSheetProps {
  exerciseName: string
  onSelect: (rpe: number) => void
  onSkip: () => void
}

const RPE_OPTIONS = [
  { value: 1,  label: 'Too easy',   sub: 'Could have done much more',   color: '#7EE8C8' },
  { value: 3,  label: 'Good',       sub: 'Challenging but comfortable',  color: '#B794FF' },
  { value: 5,  label: 'Hard',       sub: 'Pushed myself',               color: '#FFD1E3' },
  { value: 7,  label: 'Very hard',  sub: 'Near my limit',               color: '#FF8FD1' },
  { value: 10, label: 'Max effort', sub: "Couldn't do another rep",     color: '#FF5E8A' },
]

function RpeSheet({ exerciseName, onSelect, onSkip }: RpeSheetProps) {
  return (
    <>
      <div onClick={onSkip} style={{ position: 'fixed', inset: 0, background: 'rgba(12,9,32,0.7)', backdropFilter: 'blur(4px)', zIndex: 20 }} />
      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, maxWidth: 430, margin: '0 auto', background: C.bgSoft, borderTop: `1px solid ${C.hairStrong}`, borderRadius: '24px 24px 0 0', padding: '24px 20px 40px', zIndex: 21 }}>
        <div style={{ width: 40, height: 4, borderRadius: 99, background: C.hair, margin: '0 auto 20px' }} />
        <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: C.primary, fontWeight: 600 }}>How was that?</div>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, margin: '6px 0 4px' }}>{exerciseName}</div>
        <div style={{ fontSize: 13, color: C.text2, marginBottom: 20 }}>How hard was that last set?</div>
        <div style={{ display: 'grid', gap: 8 }}>
          {RPE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => onSelect(opt.value)}
              style={{ textAlign: 'left', padding: '14px 16px', borderRadius: 14, border: `1px solid ${opt.color}40`, background: `${opt.color}12`, color: C.text, fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: opt.color }}>{opt.label}</div>
                <div style={{ fontSize: 12, color: C.mute, marginTop: 2 }}>{opt.sub}</div>
              </div>
              <div style={{ width: 8, height: 8, borderRadius: 999, background: opt.color, flexShrink: 0 }} />
            </button>
          ))}
        </div>
        <button
          onClick={onSkip}
          style={{ marginTop: 14, width: '100%', padding: '14px', border: `1px solid ${C.hair}`, background: 'transparent', color: C.mute, borderRadius: 12, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Skip
        </button>
      </div>
    </>
  )
}

// ─── Add exercise sheet ───────────────────────────────────────────────────

interface AddExerciseSheetProps {
  allExercises: import('../context').Exercise[]
  currentIds: string[]
  onAdd: (exercise: import('../context').Exercise) => void
  onClose: () => void
}

const GROUP_LABELS: Record<string, string> = {
  chest: 'Chest', back: 'Back', arms: 'Arms', shoulders: 'Shoulders',
  legs: 'Legs', abs: 'Abs', glutes: 'Glutes', cardio: 'Cardio',
}

function AddExerciseSheet({ allExercises, currentIds, onAdd, onClose }: AddExerciseSheetProps) {
  const [search, setSearch] = useState('')

  const filtered = allExercises.filter(ex => {
    if (currentIds.includes(ex.id)) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      ex.name.toLowerCase().includes(q) ||
      ex.muscle_group.toLowerCase().includes(q) ||
      ex.equipment.toLowerCase().includes(q)
    )
  })

  const grouped = filtered.reduce<Record<string, typeof filtered>>((acc, ex) => {
    const g = ex.muscle_group
    if (!acc[g]) acc[g] = []
    acc[g].push(ex)
    return acc
  }, {})

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(12,9,32,0.7)', backdropFilter: 'blur(4px)', zIndex: 20 }} />
      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, maxWidth: 430, margin: '0 auto', background: C.bgSoft, borderTop: `1px solid ${C.hairStrong}`, borderRadius: '24px 24px 0 0', zIndex: 21, display: 'flex', flexDirection: 'column', maxHeight: '80vh' }}>
        <div style={{ padding: '20px 20px 12px', flexShrink: 0 }}>
          <div style={{ width: 40, height: 4, borderRadius: 99, background: C.hair, margin: '0 auto 16px' }} />
          <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: C.primary, fontWeight: 600 }}>Mid-session</div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, margin: '4px 0 14px' }}>Add an exercise</div>
          <input
            autoFocus
            type="text"
            placeholder="Search exercises…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: `1px solid ${C.primary}40`, background: C.surface, color: C.text, fontSize: 14, fontFamily: FONT_BODY, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ overflowY: 'auto', padding: '0 20px 32px', flex: 1 }}>
          {Object.keys(grouped).sort().map(group => (
            <div key={group}>
              <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: C.mute, fontWeight: 700, padding: '14px 0 8px' }}>
                {GROUP_LABELS[group] ?? group}
              </div>
              {grouped[group].map(ex => (
                <button
                  key={ex.id}
                  onClick={() => onAdd(ex)}
                  style={{ width: '100%', textAlign: 'left', padding: '14px 16px', borderRadius: 14, border: `1px solid ${C.hairStrong}`, background: C.surface, color: C.text, fontFamily: 'inherit', cursor: 'pointer', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{ex.name}</div>
                    <div style={{ fontSize: 12, color: C.mute, marginTop: 2 }}>{ex.equipment}</div>
                  </div>
                  <div style={{ fontSize: 13, color: C.primary, fontWeight: 600, flexShrink: 0, marginLeft: 12 }}>+ Add</div>
                </button>
              ))}
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: C.mute, fontSize: 14 }}>
              No exercises match "{search}"
            </div>
          )}
        </div>
      </div>
    </>
  )
}

import { useState } from 'react'