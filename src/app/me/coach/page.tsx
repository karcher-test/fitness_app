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
  accent: '#FF8FD1', danger: '#FF5E8A',
  glow1: 'rgba(183,148,255,0.3)',
}
const SHADOW_1 = '0 0 14px rgba(183,148,255,0.5)'
const FONT_DISPLAY = '"Fraunces", "Cormorant Garamond", Georgia, serif'
const FONT_BODY = '"Inter", sans-serif'

const TONES = [
  {
    id: 'gentle',
    label: 'Gentle',
    sub: 'Encouraging and supportive',
    example: '"Great effort today. You\'re making real progress — let\'s keep building on this."',
    color: '#7EE8C8',
  },
  {
    id: 'direct',
    label: 'Direct',
    sub: 'Clear and no-nonsense',
    example: '"You\'ve hit this weight 3 times. Time to go up. Add 2.5kg next session."',
    color: '#B794FF',
  },
  {
    id: 'tough',
    label: 'Tough love',
    sub: 'Pushes you harder',
    example: '"You\'ve been at this weight for 4 weeks. Stop playing it safe. Load the bar."',
    color: '#FF5E8A',
  },
]

export default function CoachPage() {
  const router = useRouter()
  const supabase = createClient()

  const [tone, setTone]     = useState('direct')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace('/login'); return }
      supabase.from('profiles')
        .select('coach_mode')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data) setTone(data.coach_mode ?? 'direct')
          setLoading(false)
        })
    })
}, [])

  const handleSave = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').update({
      coach_mode: tone,
      updated_at: new Date().toISOString(),
    }).eq('id', user.id)
    setSaving(false)
    setSaved(true)
    router.refresh()  // add this line
    setTimeout(() => {
        setSaved(false)
        router.refresh()  // add this line
        router.back()
      }, 1200)  }

  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: FONT_BODY, color: C.text, maxWidth: 430, margin: '0 auto', paddingBottom: 120, position: 'relative' }}>
      <div style={{ position: 'absolute', top: -100, right: -80, width: 300, height: 300, borderRadius: '50%', background: `radial-gradient(circle, ${C.glow1}, transparent 70%)`, filter: 'blur(40px)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1, padding: '20px 20px 0' }}>
        <button onClick={() => router.back()} style={{ width: 40, height: 40, borderRadius: 999, border: `1px solid ${C.hair}`, background: C.surface, display: 'grid', placeItems: 'center', cursor: 'pointer', color: C.text }}>
          <ChevronLeft size={20} />
        </button>
        <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: C.primary, marginTop: 10, fontWeight: 600, textShadow: SHADOW_1 }}>◆ Personalise</div>
        <h1 style={{ fontFamily: FONT_DISPLAY, fontWeight: 400, fontSize: 38, lineHeight: 1.05, margin: '4px 0 8px' }}>
          Coach <span style={{ fontStyle: 'italic', color: C.primary, textShadow: SHADOW_1 }}>tone.</span>
        </h1>
        <p style={{ fontSize: 14, color: C.text2, marginBottom: 24, lineHeight: 1.5 }}>
          How should the AI talk to you? This shapes all suggestions and feedback.
        </p>

        {loading ? <div style={{ color: C.mute }}>Loading…</div> : (
          <div style={{ display: 'grid', gap: 12 }}>
            {TONES.map(t => {
              const active = tone === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => setTone(t.id)}
                  style={{ textAlign: 'left', padding: '18px', borderRadius: 18, border: `1px solid ${active ? t.color : C.hairStrong}`, background: active ? `${t.color}12` : C.surface, color: C.text, fontFamily: 'inherit', cursor: 'pointer', boxShadow: active ? `0 0 20px ${t.color}25` : 'none' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: active ? t.color : C.text }}>{t.label}</div>
                    {active && <div style={{ width: 8, height: 8, borderRadius: 999, background: t.color }} />}
                  </div>
                  <div style={{ fontSize: 13, color: C.mute, marginBottom: 12 }}>{t.sub}</div>
                  <div style={{ fontSize: 13, color: C.text2, fontStyle: 'italic', lineHeight: 1.5, borderLeft: `2px solid ${active ? t.color : C.hair}`, paddingLeft: 12 }}>
                    {t.example}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, padding: '12px 20px 32px', background: `linear-gradient(to top, ${C.bg} 60%, transparent)`, maxWidth: 430, margin: '0 auto', zIndex: 5 }}>
        <button onClick={handleSave} disabled={saving} style={{ width: '100%', padding: '18px', borderRadius: 16, border: 'none', background: saved ? `linear-gradient(135deg, #7EE8C8, #B794FF)` : `linear-gradient(135deg, ${C.primary}, ${C.primary2})`, color: '#0C0920', fontFamily: FONT_BODY, fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 24px rgba(183,148,255,0.35)' }}>
          {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save tone'}
        </button>
      </div>
    </div>
  )
}