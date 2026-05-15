import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardClient from './DashboardClient'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, weekly_goal, coach_mode, focus_areas')
    .eq('id', user.id)
    .single()

  const sixtyDaysAgo = new Date()
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

  const { data: recentSessions } = await supabase
    .from('workout_sessions')
    .select('id, started_at, focus')
    .eq('user_id', user.id)
    .gte('started_at', sixtyDaysAgo.toISOString())
    .order('started_at', { ascending: false })

  // This week's plan
  const weekStart = getThisMondayString()

  const { data: weeklyPlanRows } = await supabase
  .from('weekly_plans')
  .select('plan')
  .eq('user_id', user.id)
  .eq('week_start', weekStart)
  .limit(1)

    const weeklyPlan = weeklyPlanRows?.[0] ?? null
    const hasPlan = !!weeklyPlan?.plan

    console.log('weekStart:', weekStart)
console.log('weeklyPlan:', weeklyPlan)

  const sessions = recentSessions ?? []
  const streak = calculateStreak(sessions)
  const monday = getThisMonday()
  const sessionsThisWeek = sessions.filter(
    s => new Date(s.started_at) >= monday
  ).length

  // If there's a plan for today, use that as the suggestion
  const todayKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()]
  const todayPlan = weeklyPlan?.plan?.[todayKey]
  const suggestedGroup = (todayPlan?.type === 'gym' && todayPlan?.focus?.length > 0)
    ? todayPlan.focus[0]
    : getSuggestedGroup(sessions)

  const shouldSuggestDeload = checkDeload(sessions)

  return (
    <DashboardClient
      profile={profile ?? { name: null, weekly_goal: 4, coach_mode: 'direct', focus_areas: [] }}
      streak={streak}
      sessionsThisWeek={sessionsThisWeek}
      suggestedGroup={suggestedGroup}
      shouldSuggestDeload={shouldSuggestDeload}
      weeklyPlan={weeklyPlan?.plan ?? null}
      hasPlan={hasPlan}
      weekStart={weekStart}
    />
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function getThisMonday(): Date {
    const d = new Date()
    const day = d.getDay()
    const diff = day === 0 ? 6 : day - 1
    d.setDate(d.getDate() - diff)
    d.setHours(0, 0, 0, 0)
    return d
  }
  
  function getThisMondayString(): string {
    const d = getThisMonday()
    // Use local date parts instead of toISOString() which converts to UTC
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
function calculateStreak(sessions: { started_at: string }[]): number {
  if (sessions.length === 0) return 0
  const sessionDays = new Set(sessions.map(s => s.started_at.slice(0, 10)))
  let streak = 0
  const today = new Date()
  for (let i = 0; i <= 60; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    if (sessionDays.has(key)) {
      streak++
    } else {
      if (i > 0) break
    }
  }
  return streak
}

const GROUP_KEYWORDS: Record<string, string[]> = {
  chest:     ['chest', 'pec'],
  back:      ['back', 'lat', 'row'],
  arms:      ['arm', 'bicep', 'tricep', 'curl'],
  shoulders: ['shoulder', 'delt', 'press'],
  legs:      ['leg', 'squat', 'quad', 'hamstring', 'calf'],
  abs:       ['ab', 'core', 'plank', 'crunch'],
  glutes:    ['glute', 'hip', 'rdl', 'deadlift'],
  cardio:    ['cardio', 'run', 'cycle', 'bike'],
}

function getSuggestedGroup(sessions: { started_at: string; focus: string | null }[]): string {
  const lastTrained: Record<string, Date | null> = {}
  for (const group of Object.keys(GROUP_KEYWORDS)) {
    const keywords = GROUP_KEYWORDS[group]
    const match = sessions.find(s =>
      s.focus && keywords.some(kw => s.focus!.toLowerCase().includes(kw))
    )
    lastTrained[group] = match ? new Date(match.started_at) : null
  }
  const sorted = Object.entries(lastTrained).sort(([, a], [, b]) => {
    if (a === null) return -1
    if (b === null) return 1
    return a.getTime() - b.getTime()
  })
  return sorted[0][0]
}

function checkDeload(sessions: { started_at: string }[]): boolean {
  const weekCounts = [1, 2, 3].map(weeksAgo => {
    const start = new Date()
    start.setDate(start.getDate() - (weeksAgo * 7))
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(start.getDate() + 7)
    return sessions.filter(s => {
      const d = new Date(s.started_at)
      return d >= start && d < end
    }).length
  })
  return weekCounts.every(count => count >= 4)
}