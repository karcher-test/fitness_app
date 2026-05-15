'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Plus, ChevronRight, Loader, CheckCircle, X, ArrowLeftRight } from 'lucide-react'
import { useWorkout } from '../context'
import type { Exercise } from '../context'

const C = {
  bg: '#0C0920', bgSoft: '#120E2A', surface: 'rgba(255,255,255,0.03)',
  text: '#EDE5FF', text2: '#C4B8E0', mute: '#7D73A3',
  hair: 'rgba(255,255,255,0.08)', hairStrong: 'rgba(183,148,255,0.2)',
  primary: '#B794FF', primary2: '#FFD1E3', primarySoft: 'rgba(183,148,255,0.12)',
  accent: '#FF8FD1', danger: '#FF5E8A', good: '#7EE8C8',
  glow1: 'rgba(183,148,255,0.3)',
}
const SHADOW_1 = '0 0 14px rgba(183,148,255,0.5)'
const FONT_DISPLAY = '"Fraunces", "Cormorant Garamond", Georgia, serif'
const FONT_BODY = '"Inter", sans-serif'

interface CoachTipData {
  status: 'ready' | 'suggestion'
  message: string
  action: 'add' | 'trim' | 'swap' | 'recovery' | null
  exercises_to_add: string[]
  exercises_to_trim: string[]
  swap_in: string | null
  swap_out_options: string[]
}

export default function CoachTipPage() {
  const router = useRouter()
  const { selectedExercises, setSelectedExercises, checkin } = useWorkout()

  const [tipData, setTipData]     = useState<CoachTipData | null>(null)
  const [loading, setLoading]     = useState(true)
  const [added, setAdded]         = useState<string[]>([])
  const [removed, setRemoved]     = useState<string[]>([])
  const [swappedIn, setSwappedIn] = useState<string | null>(null)

  const goToReview = () => router.push('/workout/review')

  useEffect(() => {
    if (selectedExercises.length === 0 || !checkin) {
      router.replace('/dashboard')
      return
    }
    fetchTip()
  }, [])

  const fetchTip = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/coach-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkin,
          exercises: selectedExercises.map(ex => ({
            name: ex.name,
            equipment: ex.equipment,
            muscle_group: ex.muscle_group,
          })),
        }),
      })
      const data = await res.json()
      setTipData(data)
    } catch {
      setTipData({
        status: 'ready',
        message: "Looking good — you're all set.",
        action: null,
        exercises_to_add: [],
        exercises_to_trim: [],
        swap_in: null,
        swap_out_options: [],
      })
    } finally {
      setLoading(false)
    }
  }

  // ADD an exercise by name
  const handleAdd = async (name: string) => {
    try {
      const res = await fetch(`/api/find-exercise?name=${encodeURIComponent(name)}`)
      if (!res.ok) return
      const ex: Exercise = await res.json()
      if (!selectedExercises.some(e => e.id === ex.id)) {
        setSelectedExercises([...selectedExercises, ex])
      }
      setAdded(prev => [...prev, name])
    } catch {
      // silently fail
    }
  }

  // REMOVE an exercise by name
  const handleRemove = (name: string) => {
    setSelectedExercises(selectedExercises.filter(ex =>
      ex.name.toLowerCase() !== name.toLowerCase()
    ))
    setRemoved(prev => [...prev, name])
  }

  // SWAP: remove swapOut, add swap_in
  const handleSwap = async (swapOutName: string) => {
    if (!tipData?.swap_in) return
    try {
      const res = await fetch(`/api/find-exercise?name=${encodeURIComponent(tipData.swap_in)}`)
      if (!res.ok) return
      const newEx: Exercise = await res.json()
      const updated = selectedExercises
        .filter(ex => ex.name.toLowerCase() !== swapOutName.toLowerCase())
        .concat(selectedExercises.some(e => e.id === newEx.id) ? [] : [newEx])
      setSelectedExercises(updated)
      setRemoved(prev => [...prev, swapOutName])
      setSwappedIn(tipData.swap_in)
    } catch {
      // silently fail
    }
  }

  if (loading) {
    return (
      <div style={{ background: C.bg, minHeight: '100vh', display: 'grid', placeItems: 'center', fontFamily: FONT_BODY, color: C.text, maxWidth: 430, margin: '0 auto' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader size={24} color={C.primary} style={{ animation: 'spin 1s linear infinite', marginBottom: 16 }} />
          <div style={{ fontSize: 14, color: C.mute }}>Coach is thinking…</div>
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  const isReady = tipData?.status === 'ready'
  const isRecovery = tipData?.action === 'recovery'

  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: FONT_BODY, color: C.text, maxWidth: 430, margin: '0 auto', paddingBottom: 120, position: 'relative' }}>
      <div style={{ position: 'absolute', top: -100, right: -80, width: 300, height: 300, borderRadius: '50%', background: `radial-gradient(circle, ${C.glow1}, transparent 70%)`, filter: 'blur(40px)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1, padding: '48px 20px 0' }}>

        {/* Icon */}
        <div style={{ width: 56, height: 56, borderRadius: 16, background: isReady ? `linear-gradient(135deg, ${C.good}, ${C.primary})` : isRecovery ? `linear-gradient(135deg, ${C.danger}, ${C.accent})` : `linear-gradient(135deg, ${C.primary}, ${C.primary2})`, display: 'grid', placeItems: 'center', marginBottom: 20, boxShadow: SHADOW_1 }}>
          {isReady ? <CheckCircle size={24} color={C.bg} /> : <Sparkles size={24} color={C.bg} />}
        </div>

        {/* Label */}
        <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: isReady ? C.good : isRecovery ? C.danger : C.primary, fontWeight: 600, marginBottom: 8, textShadow: SHADOW_1 }}>
          {isReady ? '◆ Looking good' : isRecovery ? '◆ Recovery check' : '◆ Coach tip'}
        </div>

        {/* Message */}
        <h1 style={{ fontFamily: FONT_DISPLAY, fontWeight: 400, fontSize: 26, lineHeight: 1.4, margin: '0 0 28px', color: C.text }}>
          {tipData?.message}
        </h1>

        {/* ── ADD action ── */}
        {tipData?.action === 'add' && tipData.exercises_to_add.length > 0 && (
          <div style={{ background: C.surface, border: `1px solid ${C.good}40`, borderRadius: 18, padding: 18, marginBottom: 16 }}>
            <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: C.good, fontWeight: 700, marginBottom: 14 }}>
              Suggested additions
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {tipData.exercises_to_add.map(name => {
                const isAdded = added.includes(name)
                return (
                  <div
                    key={name}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 12, background: isAdded ? `${C.good}12` : C.bgSoft, border: `1px solid ${isAdded ? C.good + '50' : C.hair}` }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 600, color: isAdded ? C.good : C.text }}>{name}</span>
                    {isAdded ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: C.good, fontWeight: 700 }}>
                        <CheckCircle size={14} />
                        Added
                      </div>
                    ) : (
                      <button
                        onClick={() => handleAdd(name)}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, border: `1px solid ${C.good}40`, background: `${C.good}15`, color: C.good, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                      >
                        <Plus size={13} />
                        Add
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── TRIM or RECOVERY action ── */}
        {(tipData?.action === 'trim' || tipData?.action === 'recovery') && tipData.exercises_to_trim.length > 0 && (
          <div style={{ background: C.surface, border: `1px solid ${isRecovery ? C.danger + '40' : C.accent + '40'}`, borderRadius: 18, padding: 18, marginBottom: 16 }}>
            <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: isRecovery ? C.danger : C.accent, fontWeight: 700, marginBottom: 6 }}>
              {isRecovery ? 'Recovery conflict' : 'Consider dropping'}
            </div>
            <div style={{ fontSize: 12, color: C.mute, marginBottom: 14 }}>
              {isRecovery ? 'These muscles need more rest — tap to remove' : 'Tap to remove from today\'s session'}
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {tipData.exercises_to_trim.map(name => {
                const isRemoved = removed.includes(name)
                return (
                  <div
                    key={name}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 12, background: isRemoved ? `${C.good}08` : C.bgSoft, border: `1px solid ${isRemoved ? C.good + '30' : C.hair}`, opacity: isRemoved ? 0.5 : 1, transition: 'all 0.2s' }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 600, color: isRemoved ? C.mute : C.text, textDecoration: isRemoved ? 'line-through' : 'none' }}>{name}</span>
                    {isRemoved ? (
                      <span style={{ fontSize: 12, color: C.mute }}>Removed</span>
                    ) : (
                      <button
                        onClick={() => handleRemove(name)}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, border: `1px solid ${C.danger}40`, background: `${C.danger}15`, color: C.danger, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                      >
                        <X size={13} />
                        Remove
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── SWAP action ── */}
        {tipData?.action === 'swap' && tipData.swap_in && (
          <div style={{ background: C.surface, border: `1px solid ${C.accent}40`, borderRadius: 18, padding: 18, marginBottom: 16 }}>
            <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: C.accent, fontWeight: 700, marginBottom: 6 }}>
              Suggested swap
            </div>

            {/* Swap in */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 12, background: swappedIn ? `${C.good}12` : `${C.good}08`, border: `1px solid ${C.good}40`, marginBottom: 12 }}>
              <Plus size={16} color={C.good} />
              <span style={{ fontSize: 14, fontWeight: 700, color: C.good, flex: 1 }}>Add: {tipData.swap_in}</span>
              {swappedIn && <CheckCircle size={16} color={C.good} />}
            </div>

            {/* Swap out options */}
            {!swappedIn && tipData.swap_out_options.length > 0 && (
              <>
                <div style={{ fontSize: 12, color: C.mute, marginBottom: 10 }}>Choose which to replace:</div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {tipData.swap_out_options.map(name => (
                    <button
                      key={name}
                      onClick={() => handleSwap(name)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 12, background: C.bgSoft, border: `1px solid ${C.danger}30`, color: C.text, fontFamily: 'inherit', cursor: 'pointer', width: '100%', textAlign: 'left' }}
                    >
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.accent, fontSize: 12, fontWeight: 700 }}>
                        <ArrowLeftRight size={13} />
                        Swap out
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}

            {swappedIn && (
              <div style={{ fontSize: 13, color: C.good, textAlign: 'center', marginTop: 4 }}>
                ✓ Swap complete
              </div>
            )}
          </div>
        )}

        {/* Current selection summary */}
        <div style={{ background: C.surface, border: `1px solid ${C.hairStrong}`, borderRadius: 16, padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: C.mute, fontWeight: 600, marginBottom: 10 }}>
            Your session · {selectedExercises.length} exercises
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {selectedExercises.map(ex => (
              <div key={ex.id} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 999, background: C.primarySoft, color: C.primary, fontWeight: 600 }}>
                {ex.name}
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* CTA */}
      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, padding: '12px 20px 32px', background: `linear-gradient(to top, ${C.bg} 60%, transparent)`, maxWidth: 430, margin: '0 auto', zIndex: 5 }}>
        <button
          onClick={goToReview}
          style={{ width: '100%', padding: '18px', borderRadius: 16, border: 'none', background: `linear-gradient(135deg, ${C.primary}, ${C.primary2})`, color: C.bg, fontFamily: 'inherit', fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 24px rgba(183,148,255,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          Continue
          <ChevronRight size={18} />
        </button>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}