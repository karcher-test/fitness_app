'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Trophy, List, Home as HomeIcon, BarChart3, User, Clock, Zap } from 'lucide-react'

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

const ALL_GROUPS = [
  { id: 'chest', label: 'Chest' }, { id: 'back', label: 'Back' },
  { id: 'arms', label: 'Arms' }, { id: 'shoulders', label: 'Shoulders' },
  { id: 'legs', label: 'Legs' }, { id: 'abs', label: 'Abs' },
  { id: 'glutes', label: 'Glutes' }, { id: 'cardio', label: 'Cardio' },
]

function rpeLabel(rpe: number): string {
    if (rpe <= 1) return 'Too easy'
    if (rpe <= 3) return 'Good'
    if (rpe <= 5) return 'Hard'
    if (rpe <= 7) return 'Very hard'
    return 'Max effort'
  }

// ── Types ──────────────────────────────────────────────────────────────────
interface SessionExercise {
  id: string
  rpe: number | null
  complete: boolean
  exercises: { name: string; muscle_group: string } | null
  exercise_sets: { weight_kg: number; reps: number; logged: boolean }[]
}

interface Session {
  id: string
  focus: string | null
  energy_level: string | null
  started_at: string
  finished_at: string | null
  session_exercises: SessionExercise[]
}

interface PbEntry {
  id: string
  name: string
  muscle_group: string
  equipment: string
  weight_kg: number
  reps: number
}

interface Props {
  sessions: Session[]
  pbs: PbEntry[]
}

// ── Helpers ────────────────────────────────────────────────────────────────
function sessionVolume(session: Session): number {
  return session.session_exercises.reduce((acc, se) =>
    acc + se.exercise_sets
      .filter(s => s.logged)
      .reduce((a, s) => a + s.weight_kg * s.reps, 0)
  , 0)
}

function sessionDuration(session: Session): string {
  if (!session.finished_at) return '—'
  const mins = Math.round(
    (new Date(session.finished_at).getTime() - new Date(session.started_at).getTime()) / 60000
  )
  return mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

// ── Main component ─────────────────────────────────────────────────────────
export default function TrackerClient({ sessions, pbs }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<'sessions' | 'heatmap' | 'pbs'>('sessions')

  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: FONT_BODY, color: C.text, maxWidth: 430, margin: '0 auto', paddingBottom: 110, position: 'relative' }}>
      <div style={{ position: 'absolute', top: -100, right: -80, width: 300, height: 300, borderRadius: '50%', background: `radial-gradient(circle, ${C.glow1}, transparent 70%)`, filter: 'blur(40px)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ padding: '20px 20px 0' }}>
          <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: C.primary, fontWeight: 600, textShadow: SHADOW_1 }}>◆ Your history</div>
          <h1 style={{ fontFamily: FONT_DISPLAY, fontWeight: 400, fontSize: 38, lineHeight: 1.05, margin: '4px 0 0' }}>
            Progress &amp;<br />
            <span style={{ fontStyle: 'italic', color: C.primary, textShadow: SHADOW_1 }}>records.</span>
          </h1>
        </div>

        {/* Tab strip */}
        <div style={{ display: 'flex', gap: 8, padding: '18px 20px 0' }}>
          {([
            { id: 'sessions', label: 'Sessions', icon: List },
            { id: 'heatmap', label: 'Heatmap', icon: Calendar },
            { id: 'pbs', label: 'PBs', icon: Trophy },
          ] as const).map(({ id, label, icon: Icon }) => {
            const active = tab === id
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                style={{ flex: 1, padding: '10px 4px', borderRadius: 12, border: `1px solid ${active ? C.primary : C.hairStrong}`, background: active ? C.primarySoft : 'transparent', color: active ? C.primary : C.mute, fontSize: 12, fontWeight: active ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, boxShadow: active ? SHADOW_1 : 'none' }}
              >
                <Icon size={15} />
                {label}
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        <div style={{ padding: '16px 20px 0' }}>
          {tab === 'sessions' && <SessionsTab sessions={sessions} />}
          {tab === 'heatmap' && <HeatmapTab sessions={sessions} />}
          {tab === 'pbs' && <PbsTab pbs={pbs} />}
        </div>
      </div>

      <TabBar active="tracker" />
    </div>
  )
}

// ── Sessions tab ───────────────────────────────────────────────────────────
function SessionsTab({ sessions }: { sessions: Session[] }) {
  if (sessions.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: C.mute }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🏋️</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: C.text2 }}>No sessions yet</div>
        <div style={{ fontSize: 13, marginTop: 6 }}>Complete your first workout to see it here</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {sessions.map(session => {
        const volume = sessionVolume(session)
        const duration = sessionDuration(session)
        const exerciseCount = session.session_exercises.filter(se => se.complete).length
        const avgRpe = (() => {
          const rpes = session.session_exercises.map(se => se.rpe).filter(Boolean) as number[]
          if (!rpes.length) return null
          return Math.round(rpes.reduce((a, b) => a + b, 0) / rpes.length * 10) / 10
        })()

        return (
          <div
            key={session.id}
            style={{ background: C.surface, border: `1px solid ${C.hairStrong}`, borderRadius: 18, padding: 18 }}
          >
            {/* Date + focus */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 11, color: C.primary, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 700 }}>
                  {formatDate(session.started_at)}
                </div>
                <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, marginTop: 2, textTransform: 'capitalize' }}>
                  {session.focus ?? 'General'}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: C.mute, marginTop: 4 }}>
                <Clock size={12} />
                {duration}
              </div>
            </div>

            {/* Stats row */}
            <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
              {[
                { label: 'Exercises', value: exerciseCount },
                { label: 'Volume', value: volume >= 1000 ? `${(volume / 1000).toFixed(1)}t` : `${Math.round(volume)}kg` },
                { label: 'Avg RPE', value: avgRpe ? rpeLabel(avgRpe) : '—' },
                ].map(stat => (
                <div key={stat.label}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.primary }}>{stat.value}</div>
                  <div style={{ fontSize: 11, color: C.mute, marginTop: 1 }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Exercise name pills */}
            <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {session.session_exercises
                .filter(se => se.complete && se.exercises)
                .map(se => (
                  <div
                    key={se.id}
                    style={{ fontSize: 11, padding: '4px 10px', borderRadius: 999, background: C.primarySoft, color: C.primary, fontWeight: 600 }}
                  >
                    {se.exercises!.name}
                  </div>
                ))
              }
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Heatmap tab ────────────────────────────────────────────────────────────
function HeatmapTab({ sessions }: { sessions: Session[] }) {
    const sessionDays = new Set(sessions.map(s => s.started_at.slice(0, 10)))
  
    // ── Date boundaries ──────────────────────────────────────────────────────
    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0)
  
    // ── Sessions this month vs last ──────────────────────────────────────────
    const sessionsThisMonth = sessions.filter(s =>
      new Date(s.started_at) >= thisMonthStart
    ).length
    const sessionsLastMonth = sessions.filter(s => {
      const d = new Date(s.started_at)
      return d >= lastMonthStart && d <= lastMonthEnd
    }).length
    const sessionsPct = sessionsLastMonth === 0
      ? null
      : Math.round((sessionsThisMonth - sessionsLastMonth) / sessionsLastMonth * 100)
  
    // ── Volume this month vs last ────────────────────────────────────────────
    const volumeFor = (s: Session) =>
      s.session_exercises.reduce((acc, se) =>
        acc + se.exercise_sets.filter(x => x.logged).reduce((a, x) => a + x.weight_kg * x.reps, 0)
      , 0)
  
    const volumeThisMonth = sessions
      .filter(s => new Date(s.started_at) >= thisMonthStart)
      .reduce((acc, s) => acc + volumeFor(s), 0)
    const volumeLastMonth = sessions
      .filter(s => { const d = new Date(s.started_at); return d >= lastMonthStart && d <= lastMonthEnd })
      .reduce((acc, s) => acc + volumeFor(s), 0)
    const volumePct = volumeLastMonth === 0
      ? null
      : Math.round((volumeThisMonth - volumeLastMonth) / volumeLastMonth * 100)
  
    // ── Longest streak (all time) ────────────────────────────────────────────
    let longestStreak = 0
    let currentStreak = 0
    const allDays: string[] = []
    for (let i = 364; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      allDays.push(d.toISOString().slice(0, 10))
    }
    for (const day of allDays) {
      if (sessionDays.has(day)) {
        currentStreak++
        longestStreak = Math.max(longestStreak, currentStreak)
      } else {
        currentStreak = 0
      }
    }
  
    // ── Most trained group ───────────────────────────────────────────────────
    const groupCounts: Record<string, number> = {}
    for (const s of sessions) {
      if (s.focus) groupCounts[s.focus] = (groupCounts[s.focus] ?? 0) + 1
    }
    const mostTrainedGroup = Object.entries(groupCounts)
      .sort((a, b) => b[1] - a[1])[0]
  
    // ── Best week ────────────────────────────────────────────────────────────
    const weekCounts: Record<string, number> = {}
    for (const s of sessions) {
      const d = new Date(s.started_at)
      const day = d.getDay()
      const monday = new Date(d)
      monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
      const key = monday.toISOString().slice(0, 10)
      weekCounts[key] = (weekCounts[key] ?? 0) + 1
    }
    const bestWeek = Math.max(0, ...Object.values(weekCounts))
  
    // ── Heatmap grid ─────────────────────────────────────────────────────────
    const days: { date: string; hasSession: boolean }[] = []
    for (let i = 83; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      days.push({ date: key, hasSession: sessionDays.has(key) })
    }
    const weeks: typeof days[] = []
    for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7))
  
    const monthLabels = weeks.map(week => {
      const d = new Date(week[0].date)
      return d.toLocaleDateString('en-GB', { month: 'short' })
    })
  
    // ── Delta pill ───────────────────────────────────────────────────────────
    const DeltaPill = ({ pct }: { pct: number | null }) => {
      if (pct === null) return <span style={{ fontSize: 11, color: C.mute }}>no prev. data</span>
      const up = pct >= 0
      return (
        <span style={{ fontSize: 11, fontWeight: 700, color: up ? C.good : C.danger, background: up ? `${C.good}15` : `${C.danger}15`, padding: '2px 8px', borderRadius: 999 }}>
          {up ? '↑' : '↓'} {Math.abs(pct)}% vs last month
        </span>
      )
    }
  
    return (
      <div>
        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
  
          {/* Sessions this month */}
          <div style={{ background: C.surface, border: `1px solid ${C.hairStrong}`, borderRadius: 16, padding: '16px' }}>
            <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: C.mute, fontWeight: 600, marginBottom: 8 }}>This month</div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 32, color: C.primary, lineHeight: 1 }}>{sessionsThisMonth}</div>
            <div style={{ fontSize: 11, color: C.mute, marginTop: 4, marginBottom: 8 }}>sessions</div>
            <DeltaPill pct={sessionsPct} />
          </div>
  
          {/* Volume this month */}
          <div style={{ background: C.surface, border: `1px solid ${C.hairStrong}`, borderRadius: 16, padding: '16px' }}>
            <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: C.mute, fontWeight: 600, marginBottom: 8 }}>Volume</div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 32, color: C.primary, lineHeight: 1 }}>
              {volumeThisMonth >= 1000
                ? `${(volumeThisMonth / 1000).toFixed(1)}t`
                : `${Math.round(volumeThisMonth)}kg`}
            </div>
            <div style={{ fontSize: 11, color: C.mute, marginTop: 4, marginBottom: 8 }}>this month</div>
            <DeltaPill pct={volumePct} />
          </div>
  
          {/* Longest streak */}
          <div style={{ background: C.surface, border: `1px solid ${C.hairStrong}`, borderRadius: 16, padding: '16px' }}>
            <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: C.mute, fontWeight: 600, marginBottom: 8 }}>Longest streak</div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 32, color: C.accent, lineHeight: 1 }}>{longestStreak}</div>
            <div style={{ fontSize: 11, color: C.mute, marginTop: 4 }}>days in a row</div>
          </div>
  
          {/* Best week */}
          <div style={{ background: C.surface, border: `1px solid ${C.hairStrong}`, borderRadius: 16, padding: '16px' }}>
            <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: C.mute, fontWeight: 600, marginBottom: 8 }}>Best week</div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 32, color: C.accent, lineHeight: 1 }}>{bestWeek}</div>
            <div style={{ fontSize: 11, color: C.mute, marginTop: 4 }}>sessions in one week</div>
          </div>
  
          {/* Most trained group — full width */}
          {mostTrainedGroup && (
            <div style={{ gridColumn: '1 / -1', background: C.primarySoft, border: `1px solid ${C.primary}30`, borderRadius: 16, padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: C.primary, fontWeight: 600, marginBottom: 4 }}>Most trained</div>
                <div style={{ fontFamily: FONT_DISPLAY, fontSize: 26, textTransform: 'capitalize' }}>{mostTrainedGroup[0]}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: FONT_DISPLAY, fontSize: 32, color: C.primary, lineHeight: 1 }}>{mostTrainedGroup[1]}</div>
                <div style={{ fontSize: 11, color: C.mute, marginTop: 2 }}>sessions</div>
              </div>
            </div>
          )}
        </div>
  
        {/* Month labels */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 4, paddingLeft: 2 }}>
          {monthLabels.map((m, i) => (
            <div key={i} style={{ width: 28, fontSize: 9, color: C.mute, letterSpacing: 0.5, textAlign: 'center', flexShrink: 0 }}>
              {i === 0 || monthLabels[i] !== monthLabels[i - 1] ? m : ''}
            </div>
          ))}
        </div>
  
        {/* Heatmap grid */}
        <div style={{ display: 'flex', gap: 4 }}>
          {weeks.map((week, wi) => (
            <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {week.map((day, di) => (
                <div
                  key={di}
                  title={day.date}
                  style={{ width: 28, height: 28, borderRadius: 6, background: day.hasSession ? `linear-gradient(135deg, ${C.primary}, ${C.primary2})` : C.surface, border: `1px solid ${day.hasSession ? C.primary + '60' : C.hair}`, boxShadow: day.hasSession ? `0 0 8px ${C.primary}40` : 'none' }}
                />
              ))}
            </div>
          ))}
        </div>
  
        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14 }}>
          <div style={{ width: 14, height: 14, borderRadius: 4, background: C.surface, border: `1px solid ${C.hair}` }} />
          <span style={{ fontSize: 11, color: C.mute }}>Rest</span>
          <div style={{ width: 14, height: 14, borderRadius: 4, background: `linear-gradient(135deg, ${C.primary}, ${C.primary2})`, marginLeft: 8 }} />
          <span style={{ fontSize: 11, color: C.mute }}>Trained</span>
        </div>
      </div>
    )
  }

// ── PBs tab ────────────────────────────────────────────────────────────────
function PbsTab({ pbs }: { pbs: PbEntry[] }) {
  const [activeGroup, setActiveGroup] = useState('chest')

  // Only show groups the user has actually logged
  const loggedGroups = ALL_GROUPS.filter(g =>
    pbs.some(pb => pb.muscle_group === g.id)
  )

  // If active group has no PBs (e.g. on first load), default to first logged group
  const groupPbs = pbs.filter(pb => pb.muscle_group === activeGroup)
    .sort((a, b) => b.weight_kg - a.weight_kg)

  if (pbs.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: C.mute }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🏆</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: C.text2 }}>No PBs yet</div>
        <div style={{ fontSize: 13, marginTop: 6 }}>Complete a workout to set your first records</div>
      </div>
    )
  }

  return (
    <div>
      {/* Group filter strip */}
      <div style={{ overflowX: 'auto', display: 'flex', gap: 8, paddingBottom: 4, scrollbarWidth: 'none', marginBottom: 16 }}>
        {loggedGroups.map(g => {
          const active = activeGroup === g.id
          return (
            <button
              key={g.id}
              onClick={() => setActiveGroup(g.id)}
              style={{ flexShrink: 0, padding: '8px 16px', borderRadius: 999, border: `1px solid ${active ? C.primary : C.hairStrong}`, background: active ? C.primarySoft : 'transparent', color: active ? C.primary : C.mute, fontSize: 13, fontWeight: active ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit', boxShadow: active ? SHADOW_1 : 'none' }}
            >
              {g.label}
            </button>
          )
        })}
      </div>

      {/* PB cards */}
      {groupPbs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: C.mute, fontSize: 14 }}>
          No {activeGroup} PBs yet
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {groupPbs.map(pb => (
            <div
              key={pb.id}
              style={{ background: C.surface, border: `1px solid ${C.hairStrong}`, borderRadius: 16, padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{pb.name}</div>
                <div style={{ fontSize: 12, color: C.mute, marginTop: 2 }}>{pb.equipment}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                {pb.weight_kg > 0 ? (
                  <>
                    <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, color: C.primary, lineHeight: 1 }}>{pb.weight_kg}<span style={{ fontSize: 13, color: C.mute }}>kg</span></div>
                    <div style={{ fontSize: 12, color: C.mute, marginTop: 2 }}>× {pb.reps} reps</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, color: C.primary, lineHeight: 1 }}>{pb.reps}</div>
                    <div style={{ fontSize: 12, color: C.mute, marginTop: 2 }}>reps</div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Tab bar ────────────────────────────────────────────────────────────────
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
          <button key={id} onClick={() => router.push(href)} style={{ background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer', color: isActive ? C.primary : C.mute, padding: 4, filter: isActive ? `drop-shadow(${SHADOW_1})` : 'none' }}>
            <Icon size={21} strokeWidth={isActive ? 2.3 : 1.7} />
            <span style={{ fontSize: 10, letterSpacing: 0.6, fontWeight: isActive ? 700 : 500 }}>{label}</span>
          </button>
        )
      })}
    </div>
  )
}