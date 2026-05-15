'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, BatteryLow, Battery, BatteryFull, Clock, AlertCircle } from 'lucide-react'
import { useWorkout } from '../context'
import type { CheckinData } from '../context'

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

const ENERGY_OPTIONS: { value: CheckinData['energy_level']; label: string; sub: string; icon: typeof Battery; color: string }[] = [
  { value: 'low',  label: 'Low',    sub: 'Tired or stressed',  icon: BatteryLow,  color: C.danger },
  { value: 'med',  label: 'Normal', sub: 'Feeling okay',       icon: Battery,     color: C.primary },
  { value: 'high', label: 'High',   sub: 'Fired up and ready', icon: BatteryFull, color: C.good },
]

const TIME_OPTIONS: { value: CheckinData['time_planned']; label: string; sub: string }[] = [
  { value: 'short',  label: 'Short',  sub: '~30 min' },
  { value: 'normal', label: 'Normal', sub: '~45–60 min' },
  { value: 'long',   label: 'Long',   sub: '60 min+' },
]

const PAIN_OPTIONS: { value: CheckinData['pain_status']; label: string; sub: string; color: string }[] = [
  { value: 'none', label: 'None',      sub: 'Feeling good',          color: C.good },
  { value: 'mild', label: 'Mild',      sub: 'A bit sore or tight',   color: C.accent },
  { value: 'real', label: 'Real pain', sub: 'Something hurts today', color: C.danger },
]

const BODY_PARTS = [
  'Neck', 'Left shoulder', 'Right shoulder',
  'Left elbow', 'Right elbow', 'Left wrist', 'Right wrist',
  'Upper back', 'Lower back',
  'Left hip', 'Right hip',
  'Left knee', 'Right knee',
  'Left ankle', 'Right ankle',
  'Left quad', 'Right quad',
  'Left hamstring', 'Right hamstring',
  'Left calf', 'Right calf',
  'Chest', 'Abs', 'Other',
]

export default function CheckinPage() {
  const router = useRouter()
  const { selectedExercises, setCheckin } = useWorkout()

  const [energy, setEnergy]               = useState<CheckinData['energy_level'] | null>(null)
  const [time, setTime]                   = useState<CheckinData['time_planned'] | null>(null)
  const [pain, setPain]                   = useState<CheckinData['pain_status'] | null>(null)
  const [painLocations, setPainLocations] = useState<string[]>([])

  useEffect(() => {
    if (selectedExercises.length === 0) router.replace('/dashboard')
  }, [selectedExercises, router])

  if (selectedExercises.length === 0) return null

  const showLocationPicker = pain === 'mild' || pain === 'real'
  const canContinue = energy !== null && time !== null && pain !== null &&
    (pain === 'none' || painLocations.length > 0)

  const toggleLocation = (part: string) =>
    setPainLocations(prev =>
      prev.includes(part) ? prev.filter(p => p !== part) : [...prev, part]
    )

  const handlePainChange = (value: CheckinData['pain_status']) => {
    setPain(value)
    if (value === 'none') setPainLocations([])
  }

  const handleContinue = () => {
    setCheckin({
      energy_level: energy!,
      time_planned: time!,
      pain_status: pain!,
      pain_locations: painLocations,
    })
    router.push('/workout/coach-tip')
  }

  const handleSkip = () => {
    setCheckin({
      energy_level: 'med',
      time_planned: 'normal',
      pain_status: 'none',
      pain_locations: [],
    })
    router.push('/workout/coach-tip')
  }

  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: FONT_BODY, color: C.text, maxWidth: 430, margin: '0 auto', paddingBottom: 120, position: 'relative' }}>
      <div style={{ position: 'absolute', top: -100, right: -80, width: 300, height: 300, borderRadius: '50%', background: `radial-gradient(circle, ${C.glow1}, transparent 70%)`, filter: 'blur(40px)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ padding: '20px 20px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', minHeight: 28 }}>
            <button
              onClick={() => router.back()}
              style={{ width: 40, height: 40, borderRadius: 999, border: `1px solid ${C.hair}`, background: C.surface, display: 'grid', placeItems: 'center', cursor: 'pointer', color: C.text }}
            >
              <ChevronLeft size={20} />
            </button>
          </div>
          <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: C.primary, marginTop: 10, fontWeight: 600, textShadow: SHADOW_1 }}>◆ Pre-workout</div>
          <h1 style={{ fontFamily: FONT_DISPLAY, fontWeight: 400, fontSize: 38, lineHeight: 1.05, margin: '4px 0 0' }}>
            How are you<br />
            <span style={{ fontStyle: 'italic', color: C.primary, textShadow: SHADOW_1 }}>feeling?</span>
          </h1>
          <p style={{ fontSize: 14, color: C.text2, marginTop: 10, lineHeight: 1.5 }}>
            Takes 10 seconds. Helps the coach tailor today's session.
          </p>
        </div>

        <div style={{ padding: '14px 20px 0', display: 'grid', gap: 24 }}>

          {/* Energy */}
          <div>
            <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: C.mute, fontWeight: 600, marginBottom: 10 }}>Energy today</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {ENERGY_OPTIONS.map(opt => {
                const active = energy === opt.value
                const Icon = opt.icon
                return (
                  <button
                    key={opt.value}
                    onClick={() => setEnergy(opt.value)}
                    style={{ background: active ? `${opt.color}20` : C.surface, border: `1px solid ${active ? opt.color : C.hairStrong}`, borderRadius: 14, padding: '14px 10px', cursor: 'pointer', color: C.text, fontFamily: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, boxShadow: active ? `0 0 14px ${opt.color}40` : 'none' }}
                  >
                    <Icon size={20} color={active ? opt.color : C.mute} />
                    <div style={{ fontSize: 13, fontWeight: 700, color: active ? opt.color : C.text }}>{opt.label}</div>
                    <div style={{ fontSize: 11, color: C.mute, textAlign: 'center', lineHeight: 1.3 }}>{opt.sub}</div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Time */}
          <div>
            <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: C.mute, fontWeight: 600, marginBottom: 10 }}>
              <Clock size={11} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
              Time available
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {TIME_OPTIONS.map(opt => {
                const active = time === opt.value
                return (
                  <button
                    key={opt.value}
                    onClick={() => setTime(opt.value)}
                    style={{ background: active ? C.primarySoft : C.surface, border: `1px solid ${active ? C.primary : C.hairStrong}`, borderRadius: 14, padding: '14px 10px', cursor: 'pointer', color: C.text, fontFamily: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, boxShadow: active ? SHADOW_1 : 'none' }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 700, color: active ? C.primary : C.text }}>{opt.label}</div>
                    <div style={{ fontSize: 11, color: C.mute }}>{opt.sub}</div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Pain */}
          <div>
            <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: C.mute, fontWeight: 600, marginBottom: 10 }}>
              <AlertCircle size={11} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
              Any pain or soreness?
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {PAIN_OPTIONS.map(opt => {
                const active = pain === opt.value
                return (
                  <button
                    key={opt.value}
                    onClick={() => handlePainChange(opt.value)}
                    style={{ background: active ? `${opt.color}18` : C.surface, border: `1px solid ${active ? opt.color : C.hairStrong}`, borderRadius: 14, padding: '14px 10px', cursor: 'pointer', color: C.text, fontFamily: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, boxShadow: active ? `0 0 14px ${opt.color}30` : 'none' }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 700, color: active ? opt.color : C.text }}>{opt.label}</div>
                    <div style={{ fontSize: 11, color: C.mute, textAlign: 'center', lineHeight: 1.3 }}>{opt.sub}</div>
                  </button>
                )
              })}
            </div>

            {/* Body part picker */}
            {showLocationPicker && (
              <div style={{ marginTop: 14, background: C.bgSoft, border: `1px solid ${pain === 'real' ? C.danger + '40' : C.accent + '40'}`, borderRadius: 16, padding: 16 }}>
                <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: pain === 'real' ? C.danger : C.accent, fontWeight: 700, marginBottom: 4 }}>
                  Where does it hurt?
                </div>
                <div style={{ fontSize: 12, color: C.mute, marginBottom: 12 }}>
                  Tap all that apply — the coach will work around these
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {BODY_PARTS.map(part => {
                    const active = painLocations.includes(part)
                    const color = pain === 'real' ? C.danger : C.accent
                    return (
                      <button
                        key={part}
                        onClick={() => toggleLocation(part)}
                        style={{ padding: '7px 14px', borderRadius: 999, border: `1px solid ${active ? color : C.hair}`, background: active ? `${color}20` : 'transparent', color: active ? color : C.mute, fontSize: 12, fontWeight: active ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit', boxShadow: active ? `0 0 8px ${color}30` : 'none' }}
                      >
                        {part}
                      </button>
                    )
                  })}
                </div>
                {painLocations.length > 0 && (
                  <div style={{ marginTop: 12, fontSize: 12, color: pain === 'real' ? C.danger : C.accent, fontWeight: 600 }}>
                    {painLocations.length} area{painLocations.length > 1 ? 's' : ''} flagged · coach will adjust suggestions
                  </div>
                )}
              </div>
            )}

            {pain === 'real' && painLocations.length > 0 && (
              <div style={{ marginTop: 10, background: `${C.danger}15`, border: `1px solid ${C.danger}40`, borderRadius: 12, padding: '12px 14px', fontSize: 13, color: C.text2, lineHeight: 1.5 }}>
                ⚠️ Take it easy today. Suggestions will be adjusted to keep you safe.
              </div>
            )}
          </div>

        </div>
      </div>

      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, padding: '12px 20px 32px', background: `linear-gradient(to top, ${C.bg} 60%, transparent)`, maxWidth: 430, margin: '0 auto', zIndex: 5, display: 'grid', gap: 8 }}>
        <button
          onClick={handleContinue}
          disabled={!canContinue}
          style={{ width: '100%', padding: '18px 20px', borderRadius: 16, border: 'none', background: canContinue ? `linear-gradient(135deg, ${C.primary}, ${C.primary2})` : C.bgSoft, color: canContinue ? '#0C0920' : C.mute, fontFamily: FONT_BODY, fontSize: 16, fontWeight: 700, cursor: canContinue ? 'pointer' : 'default', boxShadow: canContinue ? '0 8px 24px rgba(183,148,255,0.35)' : 'none' }}
        >
          Continue →
        </button>
        <button
          onClick={handleSkip}
          style={{ width: '100%', padding: '14px 20px', borderRadius: 16, border: `1px solid ${C.hair}`, background: 'transparent', color: C.text2, fontFamily: FONT_BODY, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
        >
          Skip check-in
        </button>
      </div>
    </div>
  )
}