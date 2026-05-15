'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const C = {
  bg: '#0C0920', bgSoft: '#120E2A', surface: 'rgba(255,255,255,0.03)',
  text: '#EDE5FF', text2: '#C4B8E0', mute: '#7D73A3',
  hair: 'rgba(255,255,255,0.08)', hairStrong: 'rgba(183,148,255,0.2)',
  primary: '#B794FF', primary2: '#FFD1E3', primarySoft: 'rgba(183,148,255,0.12)',
  accent: '#FF8FD1', good: '#7EE8C8', danger: '#FF5E8A',
}
const SHADOW_1 = '0 0 14px rgba(183,148,255,0.5)'
const SHADOW_2 = '0 0 20px rgba(255,209,227,0.4)'
const FONT_DISPLAY = '"Fraunces", Georgia, serif'
const FONT_BODY = '"Inter", system-ui, sans-serif'

type Profile = {
  name: string
  age: string
  height: string
  weight: string
  goal: string
  focus: string[]
  injuries: string[]
  coachMode: 'gentle' | 'direct' | 'tough' | ''
}

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile>({
    name: '', age: '', height: '', weight: '',
    goal: '', focus: [], injuries: [], coachMode: '',
  })


  async function finishOnboarding() {
    console.log('finishOnboarding called')
    setSaving(true)
    setError(null)

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    console.log('getUser result:', { user, userError })

    if (!user) {
      setError(`Not logged in. Debug: ${userError?.message || 'no user returned'}`)
      setSaving(false)
      return
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        name: profile.name,
        age: profile.age ? parseInt(profile.age) : null,
        height_cm: profile.height ? parseInt(profile.height) : null,
        weight_kg: profile.weight ? parseFloat(profile.weight) : null,
        goal: profile.goal || null,
        weekly_goal: 4,
        focus_areas: profile.focus,
        coach_mode: profile.coachMode || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (profileError) {
      setError(profileError.message)
      setSaving(false)
      return
    }

    if (profile.injuries.length > 0) {
      const injuryRows = profile.injuries.map((body_part) => ({
        user_id: user.id,
        body_part,
      }))
      const { error: injuryError } = await supabase
        .from('injuries')
        .insert(injuryRows)

      if (injuryError) {
        setError(injuryError.message)
        setSaving(false)
        return
      }
    }

    router.push('/dashboard')
    router.refresh()
  }

  const container = { maxWidth: 430, margin: '0 auto', minHeight: '100vh', background: C.bg, position: 'relative' as const, fontFamily: FONT_BODY, color: C.text }

  if (step === 0) return <div style={container}><Welcome onNext={() => setStep(1)} /></div>
  if (step === 1) return <div style={container}><AboutYou data={profile} setData={setProfile} onBack={() => setStep(0)} onNext={() => setStep(2)} /></div>
  if (step === 2) return <div style={container}><Goals data={profile} setData={setProfile} onBack={() => setStep(1)} onNext={() => setStep(3)} /></div>
  if (step === 3) return <div style={container}><Coach data={profile} setData={setProfile} onBack={() => setStep(2)} onDone={finishOnboarding} saving={saving} error={error} /></div>

  return null
}


// ─── Welcome ───
function Welcome({ onNext }: { onNext: () => void }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '60px 24px 40px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -100, right: -80, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(183,148,255,0.3), transparent 70%)', filter: 'blur(40px)' }} />
      <div style={{ position: 'absolute', top: 400, left: -80, width: 240, height: 240, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,143,209,0.25), transparent 70%)', filter: 'blur(50px)' }} />

      <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: C.primary, fontWeight: 700, textShadow: SHADOW_1 }}>◆ A gym app that listens</div>
        <h1 style={{ fontFamily: FONT_DISPLAY, fontWeight: 400, fontSize: 56, lineHeight: 0.98, letterSpacing: -1, margin: '16px 0 0' }}>
          Train <span style={{ fontStyle: 'italic', color: C.primary, textShadow: SHADOW_1 }}>smart.</span><br />
          Get <span style={{ fontStyle: 'italic', color: C.primary2, textShadow: SHADOW_2 }}>stronger.</span>
        </h1>
        <p style={{ fontSize: 16, color: C.text2, marginTop: 20, lineHeight: 1.5, maxWidth: 320 }}>
          Your own coach in your pocket. Science-backed progression, personalised to your body and goals.
        </p>
      </div>

      <div style={{ position: 'relative' }}>
        <PrimaryBtn onClick={onNext}>Let's set you up</PrimaryBtn>
        <div style={{ fontSize: 12, color: C.mute, textAlign: 'center', marginTop: 14 }}>Takes about 90 seconds</div>
      </div>
    </div>
  )
}

// ─── Step 1: About You ───
function AboutYou({ data, setData, onBack, onNext }: { data: Profile, setData: (p: Profile) => void, onBack: () => void, onNext: () => void }) {
  const canContinue = data.name && data.age

  return (
    <div style={{ paddingBottom: 110 }}>
      <TopBar eyebrow="Step 1 of 3" titleHtml={<>About<br /><span style={{ fontStyle: 'italic', color: C.primary, textShadow: SHADOW_1 }}>you.</span></>} onBack={onBack} />
      <Progress step={1} />

      <div style={{ padding: '0 20px', display: 'grid', gap: 16 }}>
        <TextField label="Your name" value={data.name} onChange={(v) => setData({ ...data, name: v })} placeholder="Alex" />
        <TextField label="Age" value={data.age} onChange={(v) => setData({ ...data, age: v.replace(/\D/g, '') })} placeholder="28" type="tel" suffix="years" />
        <TextField label="Height" value={data.height} onChange={(v) => setData({ ...data, height: v.replace(/\D/g, '') })} placeholder="172" suffix="cm" type="tel" />
        <div>
          <TextField label={<>Weight <span style={{ color: C.mute, fontWeight: 400 }}>· optional</span></>} value={data.weight} onChange={(v) => setData({ ...data, weight: v.replace(/[^\d.]/g, '') })} placeholder="68" suffix="kg" type="tel" />
          <div style={{ fontSize: 12, color: C.mute, marginTop: 6, lineHeight: 1.4 }}>
            Used only for tailoring safe progression. Skip if you'd rather not share.
          </div>
        </div>
      </div>

      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, padding: '12px 20px 28px', maxWidth: 430, margin: '0 auto', background: `linear-gradient(to top, ${C.bg} 60%, transparent)` }}>
        <PrimaryBtn onClick={onNext} disabled={!canContinue}>Continue</PrimaryBtn>
      </div>
    </div>
  )
}

// ─── Shared atoms ───
function TopBar({ eyebrow, titleHtml, onBack }: { eyebrow: string, titleHtml: React.ReactNode, onBack?: () => void }) {
  return (
    <div style={{ padding: '20px 20px 8px' }}>
      <div style={{ minHeight: 40 }}>
        {onBack && (
          <button onClick={onBack} style={{ width: 40, height: 40, borderRadius: 999, border: `1px solid ${C.hair}`, background: C.surface, display: 'grid', placeItems: 'center', cursor: 'pointer', color: C.text }}>‹</button>
        )}
      </div>
      <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: C.primary, marginTop: 10, fontWeight: 600, textShadow: SHADOW_1 }}>◆ {eyebrow}</div>
      <h1 style={{ fontFamily: FONT_DISPLAY, fontWeight: 400, fontSize: 38, lineHeight: 1.05, letterSpacing: -0.5, margin: '4px 0 0' }}>{titleHtml}</h1>
    </div>
  )
}

function Progress({ step }: { step: number }) {
  return (
    <div style={{ padding: '4px 20px 20px', display: 'flex', gap: 6 }}>
      {[1, 2, 3].map((i) => (
        <div key={i} style={{ flex: 1, height: 4, borderRadius: 999, background: i <= step ? C.primary : C.hair, boxShadow: i <= step ? SHADOW_1 : 'none' }} />
      ))}
    </div>
  )
}

function TextField({ label, value, onChange, placeholder, suffix, type = 'text' }: { label?: React.ReactNode, value: string, onChange: (v: string) => void, placeholder?: string, suffix?: string, type?: string }) {
  return (
    <label style={{ display: 'block' }}>
      {label && <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: C.mute, marginBottom: 8, fontWeight: 600 }}>{label}</div>}
      <div style={{ background: C.surface, border: `1px solid ${C.hair}`, borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={{ flex: 1, border: 'none', outline: 'none', fontSize: 16, background: 'transparent', fontFamily: FONT_BODY, color: C.text }} />
        {suffix && <span style={{ color: C.mute, fontSize: 14 }}>{suffix}</span>}
      </div>
    </label>
  )
}

function PrimaryBtn({ children, onClick, disabled }: { children: React.ReactNode, onClick?: () => void, disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ width: '100%', padding: '18px 20px', borderRadius: 16, border: 'none', background: disabled ? '#1A1438' : `linear-gradient(135deg, ${C.primary}, ${C.primary2})`, color: disabled ? C.mute : C.bg, fontFamily: FONT_BODY, fontSize: 16, fontWeight: 700, letterSpacing: 0.3, cursor: disabled ? 'default' : 'pointer', boxShadow: disabled ? 'none' : '0 8px 24px rgba(183,148,255,0.35)' }}>
      {children}
    </button>
  )
}

// ─── Step 2: Goals ───
function Goals({ data, setData, onBack, onNext }: { data: Profile, setData: (p: Profile) => void, onBack: () => void, onNext: () => void }) {
    const injuryOptions = ['Lower back', 'Knees', 'Shoulders', 'Wrists', 'Elbows', 'Ankles', 'Hips']
    const focusOptions = [
      { id: 'upper', label: 'Upper body', emoji: '💪' },
      { id: 'core', label: 'Core & abs', emoji: '🔥' },
      { id: 'lower', label: 'Legs & glutes', emoji: '🦵' },
      { id: 'cardio', label: 'Cardio', emoji: '❤️' },
      { id: 'mobility', label: 'Mobility', emoji: '🧘' },
      { id: 'posture', label: 'Posture', emoji: '🎯' },
    ]
  
    const toggleInjury = (i: string) => {
      setData({ ...data, injuries: data.injuries.includes(i) ? data.injuries.filter((x) => x !== i) : [...data.injuries, i] })
    }
    const toggleFocus = (f: string) => {
      setData({ ...data, focus: data.focus.includes(f) ? data.focus.filter((x) => x !== f) : [...data.focus, f] })
    }
  
    return (
      <div style={{ paddingBottom: 110 }}>
        <TopBar eyebrow="Step 2 of 3" titleHtml={<>What are<br /><span style={{ fontStyle: 'italic', color: C.primary, textShadow: SHADOW_1 }}>you after?</span></>} onBack={onBack} />
        <Progress step={2} />
  
        <div style={{ padding: '0 20px', display: 'grid', gap: 22 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: C.mute, marginBottom: 8, fontWeight: 600 }}>Your goal, in your words</div>
            <div style={{ background: C.surface, border: `1px solid ${C.hair}`, borderRadius: 16, padding: 14 }}>
              <textarea
                value={data.goal}
                onChange={(e) => setData({ ...data, goal: e.target.value })}
                placeholder="e.g. Build muscle in my upper body without looking too masculine."
                rows={3}
                style={{ width: '100%', border: 'none', outline: 'none', resize: 'none', fontSize: 15, fontFamily: FONT_BODY, color: C.text, background: 'transparent', lineHeight: 1.5 }}
              />
            </div>
            <div style={{ fontSize: 12, color: C.mute, marginTop: 6, lineHeight: 1.4 }}>The more specific, the better the AI's plan will fit you.</div>
          </div>
  
          <div>
            <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: C.mute, marginBottom: 10, fontWeight: 600 }}>Focus areas · pick any</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {focusOptions.map((f) => {
                const active = data.focus.includes(f.id)
                return (
                  <button
                    key={f.id}
                    onClick={() => toggleFocus(f.id)}
                    style={{ padding: '10px 14px', borderRadius: 999, border: active ? 'none' : `1px solid ${C.hair}`, background: active ? C.primary : C.surface, color: active ? C.bg : C.text, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, boxShadow: active ? SHADOW_1 : 'none', fontFamily: FONT_BODY }}
                  >
                    <span>{f.emoji}</span>{f.label}
                  </button>
                )
              })}
            </div>
          </div>
  
          <div>
            <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: C.mute, marginBottom: 4, fontWeight: 600 }}>Any injuries or sore spots?</div>
            <div style={{ fontSize: 12, color: C.mute, marginBottom: 10, lineHeight: 1.4 }}>The AI will work around these. You can update anytime.</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {injuryOptions.map((i) => {
                const active = data.injuries.includes(i)
                return (
                  <button
                    key={i}
                    onClick={() => toggleInjury(i)}
                    style={{ padding: '10px 14px', borderRadius: 999, border: active ? 'none' : `1px solid ${C.hair}`, background: active ? C.accent : C.surface, color: active ? C.bg : C.text, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, boxShadow: active ? SHADOW_2 : 'none', fontFamily: FONT_BODY }}
                  >
                    {active && '✓ '}{i}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
  
        <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, padding: '12px 20px 28px', maxWidth: 430, margin: '0 auto', background: `linear-gradient(to top, ${C.bg} 60%, transparent)` }}>
          <PrimaryBtn onClick={onNext}>Continue</PrimaryBtn>
        </div>
      </div>
    )
  }
  
  // ─── Step 3: Coach Mode ───
  function Coach({ data, setData, onBack, onDone, saving, error }: { data: Profile, setData: (p: Profile) => void, onBack: () => void, onDone: () => void, saving: boolean, error: string | null }) {
    const modes = [
      { id: 'gentle' as const, label: 'Encouraging', eyebrow: 'Celebrate every win', body: 'Warm, supportive, never judgemental. Perfect if you\'re easing back in or want a cheerleader in your pocket.' },
      { id: 'direct' as const, label: 'Direct & honest', eyebrow: 'Straight talk, no fluff', body: 'Matter-of-fact feedback. Calls out missed sessions without drama. Great if you want clarity over comfort.' },
      { id: 'tough' as const, label: 'Tough love', eyebrow: 'Firm but fair', body: 'Challenging messages when you skip. Still respectful — never insults, never tells you to push through real pain.' },
    ]
  
    return (
      <div style={{ paddingBottom: 110 }}>
        <TopBar eyebrow="Step 3 of 3" titleHtml={<>How should<br /><span style={{ fontStyle: 'italic', color: C.primary, textShadow: SHADOW_1 }}>I talk to you?</span></>} onBack={onBack} />
        <Progress step={3} />
  
        <div style={{ padding: '0 20px', display: 'grid', gap: 12 }}>
          {modes.map((m) => {
            const active = data.coachMode === m.id
            return (
              <button
                key={m.id}
                onClick={() => setData({ ...data, coachMode: m.id })}
                style={{ textAlign: 'left', background: active ? `linear-gradient(135deg, ${C.primarySoft}, rgba(255,209,227,0.06))` : C.surface, color: C.text, border: active ? `1px solid ${C.primary}` : `1px solid ${C.hair}`, borderRadius: 20, padding: 18, cursor: 'pointer', position: 'relative', boxShadow: active ? SHADOW_1 : 'none', fontFamily: FONT_BODY }}
              >
                <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: C.primary, fontWeight: 700 }}>{m.eyebrow}</div>
                <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, marginTop: 2, lineHeight: 1.1 }}>{m.label}</div>
                <div style={{ fontSize: 13, color: C.text2, marginTop: 8, lineHeight: 1.5 }}>{m.body}</div>
                {active && (
                  <div style={{ position: 'absolute', top: 16, right: 16, width: 22, height: 22, borderRadius: 999, background: C.primary, color: C.bg, display: 'grid', placeItems: 'center', fontWeight: 700 }}>✓</div>
                )}
              </button>
            )
          })}
  
          {error && <div style={{ color: C.danger, fontSize: 13, textAlign: 'center', marginTop: 8 }}>{error}</div>}
        </div>
  
        <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, padding: '12px 20px 28px', maxWidth: 430, margin: '0 auto', background: `linear-gradient(to top, ${C.bg} 60%, transparent)` }}>
          <PrimaryBtn onClick={onDone} disabled={!data.coachMode || saving}>
            {saving ? 'Saving...' : 'Finish & enter the gym'}
          </PrimaryBtn>
        </div>
      </div>
    )
  }