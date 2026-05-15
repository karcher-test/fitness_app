'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Flame, Target, Sparkles, Pause, X, ChevronRight,
  House as HomeIcon, BarChart3, User
} from 'lucide-react'

const C = {
  bg: '#0C0920', bgSoft: '#120E2A', surface: 'rgba(255,255,255,0.03)',
  surfaceSolid: '#1A1438', text: '#EDE5FF', text2: '#C4B8E0', mute: '#7D73A3',
  hair: 'rgba(255,255,255,0.08)', hairStrong: 'rgba(183,148,255,0.2)',
  primary: '#B794FF', primary2: '#FFD1E3', primarySoft: 'rgba(183,148,255,0.12)',
  accent: '#FF8FD1', danger: '#FF5E8A', good: '#7EE8C8',
  glow1: 'rgba(183,148,255,0.3)', glow2: 'rgba(255,143,209,0.25)',
}
const SHADOW_1 = '0 0 14px rgba(183,148,255,0.5)'
const FONT_DISPLAY = '"Fraunces", "Cormorant Garamond", Georgia, serif'
const FONT_BODY = '"Inter", "Söhne", -apple-system, BlinkMacSystemFont, sans-serif'

const MUSCLE_GROUPS = [
  { id: 'chest',     label: 'Chest',     count: 10 },
  { id: 'back',      label: 'Back',      count: 10 },
  { id: 'arms',      label: 'Arms',      count: 10 },
  { id: 'shoulders', label: 'Shoulders', count: 10 },
  { id: 'legs',      label: 'Legs',      count: 10 },
  { id: 'abs',       label: 'Abs',       count: 10 },
  { id: 'glutes',    label: 'Glutes',    count: 10 },
  { id: 'cardio',    label: 'Cardio',    count: 10 },
]

const GROUP_LABELS: Record<string, string> = {
  chest: 'Chest day', back: 'Back & lats', arms: 'Arms',
  shoulders: 'Shoulders', legs: 'Leg day', abs: 'Core & abs',
  glutes: 'Glutes & hips', cardio: 'Cardio',
}

interface Props {
  profile: {
    name: string | null
    weekly_goal: number | null
    coach_mode: string | null
    focus_areas: string[] | null
  }
  streak: number
  sessionsThisWeek: number
  suggestedGroup: string
  shouldSuggestDeload: boolean
  weeklyPlan: Record<string, any> | null
  hasPlan: boolean
  weekStart: string
}

export default function DashboardClient({
  profile, streak, sessionsThisWeek, suggestedGroup,
  shouldSuggestDeload, weeklyPlan, hasPlan, weekStart
}: Props) {
  const router = useRouter()
  const [deloadDismissed, setDeloadDismissed] = useState(false)

  const weeklyGoal = profile.weekly_goal ?? 4
  const firstName = profile.name?.split(' ')[0] ?? 'there'
  const showDeload = shouldSuggestDeload && !deloadDismissed
  const dayName = new Date().toLocaleDateString('en-GB', { weekday: 'long' })

  const handlePickGroup = (groupId: string) => {
    router.push(`/workout/select?group=${groupId}`)
  }

  const WEEK_COLORS: Record<string, string> = {
    gym: C.primary, run: C.good, cardio: C.accent,
    flexible: C.primary2, rest: C.hairStrong,
  }

  return (
    <div style={{
      background: C.bg, minHeight: '100vh', fontFamily: FONT_BODY,
      color: C.text, maxWidth: 430, margin: '0 auto',
      position: 'relative', paddingBottom: 110,
    }}>
      {/* Ambient glow */}
      <div style={{ position: 'absolute', top: -100, right: -80, width: 300, height: 300, borderRadius: '50%', background: `radial-gradient(circle, ${C.glow1}, transparent 70%)`, filter: 'blur(40px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: 400, left: -80, width: 240, height: 240, borderRadius: '50%', background: `radial-gradient(circle, ${C.glow2}, transparent 70%)`, filter: 'blur(50px)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* ── Top bar ── */}
        <div style={{ padding: '20px 20px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: C.primary, fontWeight: 600, textShadow: SHADOW_1 }}>◆ {dayName}</div>
            <h1 style={{ fontFamily: FONT_DISPLAY, fontWeight: 400, fontSize: 38, lineHeight: 1.05, letterSpacing: -0.5, margin: '4px 0 0', color: C.text }}>
              Hi <span style={{ fontStyle: 'italic', color: C.primary, textShadow: SHADOW_1 }}>{firstName},</span>
              <br />let's move.
            </h1>
          </div>
          <div style={{ width: 40, height: 40, borderRadius: 999, background: `linear-gradient(135deg, ${C.primary}, ${C.primary2})`, color: C.bg, display: 'grid', placeItems: 'center', fontSize: 15, fontWeight: 700, boxShadow: SHADOW_1, flexShrink: 0, marginTop: 20 }}>
            {firstName.charAt(0).toUpperCase()}
          </div>
        </div>

        {/* ── Stat cards ── */}
        <div style={{ padding: '18px 20px 0', display: 'flex', gap: 10 }}>
          <div style={{ flex: 1, background: C.surface, border: `1px solid ${C.hairStrong}`, borderRadius: 18, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Flame size={14} color={C.accent} />
              <span style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: C.mute, fontWeight: 600 }}>Streak</span>
            </div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 36, lineHeight: 1, color: streak > 0 ? C.accent : C.mute }}>{streak}</div>
            <div style={{ fontSize: 12, color: C.mute, marginTop: 4 }}>{streak === 1 ? 'day' : 'days'} in a row</div>
          </div>

          <div style={{ flex: 1, background: C.surface, border: `1px solid ${C.hairStrong}`, borderRadius: 18, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Target size={14} color={C.primary} />
              <span style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: C.mute, fontWeight: 600 }}>This week</span>
            </div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 36, lineHeight: 1, color: C.primary }}>
              {sessionsThisWeek}<span style={{ fontSize: 18, color: C.mute, fontStyle: 'italic' }}>/{weeklyGoal}</span>
            </div>
            <div style={{ fontSize: 12, color: C.mute, marginTop: 4 }}>sessions done</div>
          </div>
        </div>

        {/* ── Deload prompt ── */}
        {showDeload && (
          <div style={{ padding: '14px 20px 0' }}>
            <div style={{ background: `linear-gradient(135deg, ${C.accent}30, ${C.primary2}15)`, border: `1px solid ${C.accent}50`, borderRadius: 16, padding: 16, position: 'relative' }}>
              <button onClick={() => setDeloadDismissed(true)} style={{ position: 'absolute', top: 10, right: 10, width: 24, height: 24, borderRadius: 999, border: 'none', background: 'rgba(0,0,0,0.2)', color: C.text2, display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
                <X size={12} />
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Pause size={14} color={C.accent} />
                <span style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: C.accent, fontWeight: 700 }}>Time for a deload week?</span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4 }}>You've trained hard for 3+ weeks straight.</div>
              <div style={{ fontSize: 13, color: C.text2, marginTop: 6, lineHeight: 1.5 }}>
                A planned lighter week helps you come back stronger and lowers injury risk.
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button style={{ flex: 1, padding: '10px', border: 'none', background: C.accent, color: C.bg, borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Plan a deload
                </button>
                <button onClick={() => setDeloadDismissed(true)} style={{ flex: 1, padding: '10px', border: `1px solid ${C.hair}`, background: 'transparent', color: C.text2, borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Not yet
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Weekly plan card ── */}
        {!hasPlan ? (
          <div style={{ padding: '14px 20px 0' }}>
            <button
              onClick={() => router.push('/planner')}
              style={{ width: '100%', textAlign: 'left', background: C.primarySoft, border: `1px dashed ${C.primary}60`, borderRadius: 18, padding: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, fontFamily: 'inherit', color: C.text }}
            >
              <div style={{ width: 42, height: 42, borderRadius: 12, background: `linear-gradient(135deg, ${C.primary}, ${C.primary2})`, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                <Target size={18} color={C.bg} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: C.primary, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700 }}>No plan this week</div>
                <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>Plan your week →</div>
                <div style={{ fontSize: 12, color: C.text2, marginTop: 2 }}>Let AI help you structure your training</div>
              </div>
            </button>
          </div>
        ) : (
          <div style={{ padding: '14px 20px 0' }}>
            <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: C.mute, fontWeight: 700, marginBottom: 10 }}>This week</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['mon','tue','wed','thu','fri','sat','sun'] as const).map(day => {
                const d = weeklyPlan?.[day]
                const type = d?.type ?? 'rest'
                const color = WEEK_COLORS[type] ?? C.hairStrong
                const dayLabels: Record<string, string> = {
                  mon: 'M', tue: 'T', wed: 'W', thu: 'T', fri: 'F', sat: 'S', sun: 'S'
                }
                return (
                  <div
                    key={day}
                    onClick={() => type === 'gym' && d?.focus && handlePickGroup(d.focus)}
                    style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: type === 'gym' && d?.focus ? 'pointer' : 'default' }}
                  >
                    <div style={{ width: '100%', aspectRatio: '1', borderRadius: 8, background: `${color}25`, border: `1px solid ${color}60`, display: 'grid', placeItems: 'center' }}>
                      <div style={{ width: 6, height: 6, borderRadius: 999, background: color }} />
                    </div>
                    <div style={{ fontSize: 9, color: C.mute, fontWeight: 600 }}>{dayLabels[day]}</div>
                  </div>
                )
              })}
            </div>
            <button
              onClick={() => router.push('/planner')}
              style={{ marginTop: 10, fontSize: 12, color: C.mute, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
            >
              Edit plan →
            </button>
          </div>
        )}

{/* ── AI suggestion card ── */}
<div style={{ padding: '14px 20px 0' }}>
  {(() => {
    const todayKey = ['sun','mon','tue','wed','thu','fri','sat'][new Date().getDay()]
    const todayPlan = weeklyPlan?.[todayKey]
    const hasGymToday = todayPlan?.type === 'gym' && todayPlan?.focus?.length > 0
    const hasRunToday = todayPlan?.type === 'run'
    const hasCardioToday = todayPlan?.type === 'cardio'
    const hasRestToday = todayPlan?.type === 'rest'
    const hasFlexibleToday = todayPlan?.type === 'flexible'

    const typeConfig: Record<string, { label: string; sub: string; color: string }> = {
      run:      { label: 'Run day 🏃',        sub: 'You planned a run today',            color: C.good },
      cardio:   { label: 'Cardio class 🚴',   sub: 'You planned cardio today',           color: C.accent },
      rest:     { label: 'Rest day 😴',        sub: 'Recovery is part of the programme', color: C.mute },
      flexible: { label: 'Flexible day',      sub: 'No plan — do what feels right',      color: C.primary2 },
    }

    if (hasGymToday) {
      const focusLabel = todayPlan.focus
        .map((f: string) => f.charAt(0).toUpperCase() + f.slice(1))
        .join(' + ')
      return (
        <button
          onClick={() => handlePickGroup(suggestedGroup)}
          style={{ width: '100%', textAlign: 'left', background: C.primarySoft, border: `1px solid ${C.primary}40`, borderRadius: 18, padding: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, fontFamily: 'inherit', color: C.text }}
        >
          <div style={{ width: 42, height: 42, borderRadius: 12, background: `linear-gradient(135deg, ${C.primary}, ${C.primary2})`, display: 'grid', placeItems: 'center', flexShrink: 0, boxShadow: SHADOW_1 }}>
            <Sparkles size={18} color={C.bg} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: C.primary, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700 }}>Planned for today</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>{focusLabel}</div>
            <div style={{ fontSize: 12, color: C.text2, marginTop: 2 }}>Tap to start your planned session</div>
          </div>
          <ChevronRight size={18} color={C.primary} />
        </button>
      )
    }

    if (todayPlan && !hasGymToday && !hasFlexibleToday) {
      const config = typeConfig[todayPlan.type] ?? typeConfig.rest
      return (
        <div style={{ width: '100%', background: `${config.color}12`, border: `1px solid ${config.color}40`, borderRadius: 18, padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: `${config.color}25`, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            <Sparkles size={18} color={config.color} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: config.color, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700 }}>Today's plan</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2, color: C.text }}>{config.label}</div>
            <div style={{ fontSize: 12, color: C.text2, marginTop: 2 }}>{config.sub}</div>
          </div>
        </div>
      )
    }

    // No plan or flexible — fall back to AI suggestion
    return (
      <button
        onClick={() => handlePickGroup(suggestedGroup)}
        style={{ width: '100%', textAlign: 'left', background: C.primarySoft, border: `1px solid ${C.primary}40`, borderRadius: 18, padding: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, fontFamily: 'inherit', color: C.text }}
      >
        <div style={{ width: 42, height: 42, borderRadius: 12, background: `linear-gradient(135deg, ${C.primary}, ${C.primary2})`, display: 'grid', placeItems: 'center', flexShrink: 0, boxShadow: SHADOW_1 }}>
          <Sparkles size={18} color={C.bg} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: C.primary, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700 }}>Suggested · today</div>
          <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>{GROUP_LABELS[suggestedGroup] ?? suggestedGroup}</div>
          <div style={{ fontSize: 12, color: C.text2, marginTop: 2 }}>Least recently trained</div>
        </div>
        <ChevronRight size={18} color={C.primary} />
      </button>
    )
  })()}
</div>
        {/* ── Muscle group grid ── */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '26px 20px 12px' }}>
          <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: C.mute, fontWeight: 700 }}>Select target</div>
          <div style={{ fontSize: 12, color: C.mute }}>8 groups</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '0 20px' }}>
          {MUSCLE_GROUPS.map((g, i) => {
            const isSuggested = g.id === suggestedGroup
            return (
              <button
                key={g.id}
                onClick={() => handlePickGroup(g.id)}
                style={{
                  textAlign: 'left', aspectRatio: '1 / 1.05', cursor: 'pointer',
                  background: isSuggested
                    ? `linear-gradient(135deg, ${C.primarySoft}, rgba(255,209,227,0.03))`
                    : C.surface,
                  border: isSuggested ? `1px solid ${C.primary}` : `1px solid ${C.hairStrong}`,
                  borderRadius: 18, padding: 16,
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  boxShadow: isSuggested ? '0 0 20px rgba(183,148,255,0.15)' : 'none',
                  color: C.text, fontFamily: 'inherit', position: 'relative',
                }}
              >
                {isSuggested && (
                  <div style={{ position: 'absolute', top: 12, right: 12, fontSize: 9, letterSpacing: 1.4, textTransform: 'uppercase', background: C.primary, color: C.bg, padding: '3px 8px', borderRadius: 999, fontWeight: 700 }}>
                    Today
                  </div>
                )}
                <div>
                  <div style={{ fontSize: 10, letterSpacing: 1.5, color: C.primary, fontWeight: 700 }}>
                    / {String(i + 1).padStart(2, '0')}
                  </div>
                </div>
                <div>
                  <div style={{ fontFamily: FONT_DISPLAY, fontSize: 28, lineHeight: 1 }}>{g.label}</div>
                  <div style={{ fontSize: 12, color: C.mute, marginTop: 6 }}>{g.count} exercises</div>
                </div>
              </button>
            )
          })}
        </div>

      </div>

      {/* ── Tab bar ── */}
      <TabBar active="home" />
    </div>
  )
}

function TabBar({ active }: { active: 'home' | 'tracker' | 'me' }) {
  const router = useRouter()
  const tabs = [
    { id: 'home' as const,    label: 'Workout',  icon: HomeIcon, href: '/dashboard' },
    { id: 'tracker' as const, label: 'Progress', icon: BarChart3, href: '/tracker' },
    { id: 'me' as const,      label: 'You',      icon: User,     href: '/me' },
  ]
  return (
    <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, maxWidth: 430, margin: '0 auto', background: 'rgba(12,9,32,0.85)', backdropFilter: 'blur(18px)', borderTop: `1px solid rgba(183,148,255,0.2)`, padding: '10px 20px 22px', display: 'flex', justifyContent: 'space-around', zIndex: 10 }}>
      {tabs.map(({ id, label, icon: Icon, href }) => {
        const isActive = active === id
        return (
          <button
            key={id}
            onClick={() => router.push(href)}
            style={{ background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer', color: isActive ? C.primary : C.mute, padding: 4, filter: isActive ? `drop-shadow(${SHADOW_1})` : 'none' }}
          >
            <Icon size={21} strokeWidth={isActive ? 2.3 : 1.7} />
            <span style={{ fontSize: 10, letterSpacing: 0.6, fontWeight: isActive ? 700 : 500 }}>{label}</span>
          </button>
        )
      })}
    </div>
  )
}