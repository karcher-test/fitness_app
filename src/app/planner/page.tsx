import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PlannerClient from './PlannerClient'

function getThisMonday(): string {
    const d = new Date()
    const day = d.getDay()
    const diff = day === 0 ? 6 : day - 1
    d.setDate(d.getDate() - diff)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const date = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${date}`
  }

export const dynamic = 'force-dynamic'

export default async function PlannerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const weekStart = getThisMonday()

  // Fetch existing plan for this week
  const { data: existingPlan } = await supabase
    .from('weekly_plans')
    .select('id, plan')
    .eq('user_id', user.id)
    .eq('week_start', weekStart)
    .single()

  // Fetch all exercises (including custom)
  const { data: exercises } = await supabase
    .from('exercises')
    .select('id, name, equipment, muscle_group, setup_notes')
    .or(`user_id.is.null,user_id.eq.${user.id}`)
    .order('muscle_group')
    .order('name')

  // Fetch user's templates
  const { data: templates } = await supabase
    .from('workout_templates')
    .select('id, name, exercise_ids')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <PlannerClient
      weekStart={weekStart}
      existingPlan={existingPlan?.plan ?? null}
      planId={existingPlan?.id ?? null}
      exercises={exercises ?? []}
      templates={templates ?? []}
      userId={user.id}
    />
  )
}