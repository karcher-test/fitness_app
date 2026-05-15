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

// This is a client component that fetches its own data on mount.
// Profile edits are low-stakes and don't need SSR.
export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()

  const [name, setName]           = useState('')
  const [age, setAge]             = useState('')
  const [heightCm, setHeightCm]   = useState('')
  const [weightKg, setWeightKg]   = useState('')
  const [unitsWeight, setUnitsWeight] = useState<'kg' | 'lbs'>('kg')
  const [unitsHeight, setUnitsHeight] = useState<'cm' | 'ft'>('cm')
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)

  // Fetch on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace('/login'); return }
      supabase.from('profiles')
        .select('name, age, height_cm, weight_kg, units_weight, units_height')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setName(data.name ?? '')
            setAge(data.age?.toString() ?? '')
            setHeightCm(data.height_cm?.toString() ?? '')
            setWeightKg(data.weight_kg?.toString() ?? '')
            setUnitsWeight((data.units_weight as 'kg' | 'lbs') ?? 'kg')
            setUnitsHeight((data.units_height as 'cm' | 'ft') ?? 'cm')
          }
          setLoading(false)
        })
    })
}, [])

  const handleSave = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').update({
      name: name.trim() || null,
      age: age ? parseInt(age) : null,
      height_cm: heightCm ? parseInt(heightCm) : null,
      weight_kg: weightKg ? parseFloat(weightKg) : null,
      units_weight: unitsWeight,
      units_height: unitsHeight,
      updated_at: new Date().toISOString(),
    }).eq('id', user.id)
    setSaving(false)
    setSaved(true)
    router.refresh()  // add this line
    setTimeout(() => setSaved(false), 2000)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '14px 16px', borderRadius: 12,
    border: `1px solid ${C.hairStrong}`, background: C.bgSoft,
    color: C.text, fontSize: 15, fontFamily: FONT_BODY,
    outline: 'none', boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase',
    color: C.mute, fontWeight: 600, marginBottom: 8, display: 'block',
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
          Your <span style={{ fontStyle: 'italic', color: C.primary, textShadow: SHADOW_1 }}>profile.</span>
        </h1>

        {loading ? (
          <div style={{ color: C.mute, fontSize: 14 }}>Loading…</div>
        ) : (
          <div style={{ display: 'grid', gap: 20 }}>
            <div>
              <label style={labelStyle}>Name</label>
              <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
            </div>

            <div>
              <label style={labelStyle}>Age</label>
              <input style={inputStyle} type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="e.g. 28" inputMode="numeric" />
            </div>

            {/* Units toggles */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Weight unit</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['kg', 'lbs'] as const).map(u => (
                    <button key={u} onClick={() => setUnitsWeight(u)} style={{ flex: 1, padding: '12px', borderRadius: 10, border: `1px solid ${unitsWeight === u ? C.primary : C.hairStrong}`, background: unitsWeight === u ? C.primarySoft : 'transparent', color: unitsWeight === u ? C.primary : C.mute, fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                      {u}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Height unit</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['cm', 'ft'] as const).map(u => (
                    <button key={u} onClick={() => setUnitsHeight(u)} style={{ flex: 1, padding: '12px', borderRadius: 10, border: `1px solid ${unitsHeight === u ? C.primary : C.hairStrong}`, background: unitsHeight === u ? C.primarySoft : 'transparent', color: unitsHeight === u ? C.primary : C.mute, fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                      {u}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label style={labelStyle}>Weight ({unitsWeight})</label>
              <input style={inputStyle} type="number" value={weightKg} onChange={e => setWeightKg(e.target.value)} placeholder={`e.g. ${unitsWeight === 'kg' ? '75' : '165'}`} inputMode="decimal" />
            </div>

            <div>
              <label style={labelStyle}>Height ({unitsHeight})</label>
              <input style={inputStyle} type="number" value={heightCm} onChange={e => setHeightCm(e.target.value)} placeholder={`e.g. ${unitsHeight === 'cm' ? '175' : '69'}`} inputMode="numeric" />
            </div>
          </div>
        )}
      </div>

      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, padding: '12px 20px 32px', background: `linear-gradient(to top, ${C.bg} 60%, transparent)`, maxWidth: 430, margin: '0 auto', zIndex: 5 }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{ width: '100%', padding: '18px', borderRadius: 16, border: 'none', background: saved ? `linear-gradient(135deg, #7EE8C8, #B794FF)` : `linear-gradient(135deg, ${C.primary}, ${C.primary2})`, color: '#0C0920', fontFamily: FONT_BODY, fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 24px rgba(183,148,255,0.35)' }}
        >
          {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}