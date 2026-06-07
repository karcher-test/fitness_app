import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SelectClient from './SelectClient'

interface Props {
  searchParams: Promise<{ group?: string }>
}

export default async function SelectPage({ searchParams }: Props) {
  const { group } = await searchParams
  if (!group) redirect('/dashboard')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch ALL exercises across all groups (user browses via the filter strip)
// Fetch ALL exercises including user's custom ones
const { data: exercises } = await supabase
  .from('exercises')
  .select('id, name, equipment, muscle_group, setup_notes, log_type')
  .or(`user_id.is.null,user_id.eq.${user.id}`)
  .order('muscle_group')
  .order('name')

  const exerciseIds = (exercises ?? []).map(e => e.id)

  // Fetch history for all exercises
  const { data: history } = await supabase
    .from('session_exercises')
    .select(`
      exercise_id,
      exercise_sets ( weight_kg, reps, position, logged ),
      workout_sessions!inner ( user_id, started_at )
    `)
    .eq('workout_sessions.user_id', user.id)
    .in('exercise_id', exerciseIds)
    .order('workout_sessions(started_at)', { ascending: false })

  const historyMap: Record<string, { lastPerformance: string; starterWeight: number }> = {}
  if (history) {
    const seen = new Set<string>()
    for (const row of history) {
      if (seen.has(row.exercise_id)) continue
      seen.add(row.exercise_id)
      const sets = (row.exercise_sets ?? [])
        .filter((s: any) => s.logged)
        .sort((a: any, b: any) => a.position - b.position)
      if (sets.length === 0) continue
      const weight = sets[0].weight_kg
      const repsStr = sets.map((s: any) => s.reps).join(',')
      historyMap[row.exercise_id] = {
        lastPerformance: `${weight}kg × ${repsStr}`,
        starterWeight: weight,
      }
    }
  }

  return (
    <SelectClient
      group={group}
      exercises={(exercises ?? []).map(ex => ({
        ...ex,
        setup_notes: ex.setup_notes ?? null,
        lastPerformance: historyMap[ex.id]?.lastPerformance ?? null,
        starterWeight: historyMap[ex.id]?.starterWeight ?? getStarterWeight(ex.equipment),
        log_type: ex.log_type ?? 'weight_reps',
      }))}
    />
  )
}

function getStarterWeight(equipment: string): number {
  switch (equipment.toLowerCase()) {
    case 'barbell':    return 20
    case 'dumbbell':   return 8
    case 'cable':      return 10
    case 'machine':    return 20
    case 'bodyweight': return 0
    default:           return 10
  }
}