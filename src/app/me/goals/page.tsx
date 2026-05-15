'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const C = {
  bg: '#0C0920', bgSoft: '#120E2A', surface: 'rgba(255,255,255,0.03)',
  text: '#EDE5FF', text2: '#C4B8E0', mute: '#7D73A3',
  hair: 'rgba(255,255,255,0.08)', hairStrong: 'rgba(183,148,255,0.2)',
  primary: '#B794FF', primary2: '#FFD1E3', primarySoft: 'rgba(183,148,255,0.12)',
  glow1: 'rgba(183,148,255,0.3)',
}
const SHADOW_1 = '0 0 14px rgba(183,148,255,0.5)'
const FONT_DISPLAY = '"Fraunces", "Cormorant Garamond", Georgia, serif'
const FONT_BODY = '"Inter", sans-serif'

const GOALS = [
  { id: 'strength',     label: 'Build strength',    sub: 'Progressive overload focus' },
  { id: 'muscle',       label: 'Build muscle',       sub: 'Hypertrophy and volume' },
  { id: 'lose_weight',  label: 'Lose weight',        sub: 'Calorie deficit + training' },
  { id: 'fitness',      label: 'General fitness',    sub: 'Health and consistency' },
  { id: 'sport',        label: 'Sport performance',  sub: 'Athletic training' },
]

const FOCUS_AREAS = [
  'chest', 'back', 'arms', 'shoulders', 'legs', 'abs', 'glutes', 'cardio',
]

export default function GoalsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [weeklyGoal, setWeeklyGoal] = useState(4)
  const [goal, setGoal]             = useState('')
  const [focusAreas, setFocusAreas] = useState<string[]>([])
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [saved, setSaved]           = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace('/login'); return }
      supabase.from('profiles')
        .select('weekly_goal, goal, focus_areas')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setWeeklyGoal(data.weekly_goal ?? 4)
            setGoal(data.goal ?? '')
            setFocusAreas(data.focus_areas ?? [])
          }
          setLoading(false)
        })
    })
}, [])

  const toggleFocus = (area: string) =>
    setFocusAreas(f => f.includes(area) ? f.filter(x => x !== area) : [...f, area])

  const handleSave = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').update({
      weekly_goal: weeklyGoal,
      goal: goal || null,
      focus_areas: focusAreas,
      updated_at: new Date().toISOString(),
    }).eq('id', user.id)
    setSaving(false)
    setSaved(true)
    router.refresh()  // add this line
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: FONT_BODY, color: C.text, maxWidth: 430, margin: '0 auto', paddingBottom: 120, position: 'relative' }}>
      <div style={{ position: 'absolute', top: -100, right: -80, width: 300, height: 300, borderRadius: '50%', background: `radial-gradient(circle, ${C.glow1}, transparent 70%)`, filter: 'blur(40px)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1, padding: '20px 20px 0' }}>
        <button onClick={() => router.back()} style={{ width: 40, height: 40, borderRadius: 999, border: `1px solid ${C.hair}`, background: C.surface, display: 'grid', placeItems: 'center', cursor: 'pointer', color: C.text }}>
          <ChevronLeft size={20} />
        </button>
        <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: C.primary, marginTop: 10, fontWeight: 600, textShadow: SHADOW_1 }}>◆ Edit</div>
        <h1 style={{ fontFamily: FONT_DISPLAY, fontWeight: 400, fontSize: 38, lineHeight: 1.05, margin: '4px 0 24px' }}>
          Your <span style={{ fontStyle: 'italic', color: C.primary, textShadow: SHADOW_1 }}>goals.</span>
        </h1>

        {loading ? <div style={{ color: C.mute }}>Loading…</div> : (
          <div style={{ display: 'grid', gap: 28 }}>

            {/* Weekly goal */}
            <div>
              <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: C.mute, fontWeight: 600, marginBottom: 14 }}>Sessions per week</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <button onClick={() => setWeeklyGoal(g => Math.max(1, g - 1))} style={{ width: 44, height: 44, borderRadius: 999, border: `1px solid ${C.hairStrong}`, background: C.surface, color: C.text, fontSize: 22, cursor: 'pointer', display: 'grid', placeItems: 'center' }}>−</button>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontFamily: FONT_DISPLAY, fontSize: 48, color: C.primary, lineHeight: 1 }}>{weeklyGoal}</div>
                  <div style={{ fontSize: 12, color: C.mute, marginTop: 4 }}>days per week</div>
                </div>
                <button onClick={() => setWeeklyGoal(g => Math.min(7, g + 1))} style={{ width: 44, height: 44, borderRadius: 999, border: `1px solid ${C.hairStrong}`, background: C.surface, color: C.text, fontSize: 22, cursor: 'pointer', display: 'grid', placeItems: 'center' }}>+</button>
              </div>
            </div>

            {/* Primary goal */}
            <div>
              <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: C.mute, fontWeight: 600, marginBottom: 12 }}>Primary goal</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {GOALS.map(g => (
                  <button
                    key={g.id}
                    onClick={() => setGoal(g.id)}
                    style={{ textAlign: 'left', padding: '14px 16px', borderRadius: 14, border: `1px solid ${goal === g.id ? C.primary : C.hairStrong}`, background: goal === g.id ? C.primarySoft : C.surface, color: C.text, fontFamily: 'inherit', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: goal === g.id ? C.primary : C.text }}>{g.label}</div>
                      <div style={{ fontSize: 12, color: C.mute, marginTop: 2 }}>{g.sub}</div>
                    </div>
                    {goal === g.id && <div style={{ width: 8, height: 8, borderRadius: 999, background: C.primary }} />}
                  </button>
                ))}
              </div>
            </div>

            {/* Focus areas */}
            <div>
              <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: C.mute, fontWeight: 600, marginBottom: 12 }}>Focus areas</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {FOCUS_AREAS.map(area => {
                  const active = focusAreas.includes(area)
                  return (
                    <button
                      key={area}
                      onClick={() => toggleFocus(area)}
                      style={{ padding: '8px 16px', borderRadius: 999, border: `1px solid ${active ? C.primary : C.hairStrong}`, background: active ? C.primarySoft : 'transparent', color: active ? C.primary : C.mute, fontSize: 13, fontWeight: active ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize' }}
                    >
                      {area}
                    </button>
                  )
                })}
              </div>
            </div>

          </div>
        )}
      </div>

      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, padding: '12px 20px 32px', background: `linear-gradient(to top, ${C.bg} 60%, transparent)`, maxWidth: 430, margin: '0 auto', zIndex: 5 }}>
        <button onClick={handleSave} disabled={saving} style={{ width: '100%', padding: '18px', borderRadius: 16, border: 'none', background: saved ? `linear-gradient(135deg, #7EE8C8, #B794FF)` : `linear-gradient(135deg, ${C.primary}, ${C.primary2})`, color: '#0C0920', fontFamily: FONT_BODY, fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 24px rgba(183,148,255,0.35)' }}>
          {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}