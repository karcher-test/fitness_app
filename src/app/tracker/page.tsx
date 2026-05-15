import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TrackerClient from './TrackerClient'

export const dynamic = 'force-dynamic'

export default async function TrackerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // ── 1. All completed sessions ──────────────────────────────────────────
  const { data: sessions } = await supabase
    .from('workout_sessions')
    .select(`
      id, focus, energy_level, started_at, finished_at,
      session_exercises (
        id, rpe, complete,
        exercises ( name, muscle_group ),
        exercise_sets ( weight_kg, reps, logged )
      )
    `)
    .eq('user_id', user.id)
    .not('finished_at', 'is', null)
    .order('started_at', { ascending: false })

  // ── 2. PBs: best set per exercise (highest weight, then reps as tiebreak) 
  // We fetch all logged sets joined to exercise name/group
  const { data: allSets } = await supabase
    .from('exercise_sets')
    .select(`
      weight_kg, reps,
      session_exercises (
        exercises ( id, name, muscle_group, equipment )
      )
    `)
    .eq('logged', true)

  // Build PB map: exercise_id → { name, muscle_group, equipment, weight_kg, reps }
  type PbEntry = {
    id: string
    name: string
    muscle_group: string
    equipment: string
    weight_kg: number
    reps: number
  }
  const pbMap: Record<string, PbEntry> = {}

  for (const set of allSets ?? []) {
    const ex = (set.session_exercises as any)?.exercises
    if (!ex) continue
    const existing = pbMap[ex.id]
    const isBetter = !existing
      || set.weight_kg > existing.weight_kg
      || (set.weight_kg === existing.weight_kg && set.reps > existing.reps)
    if (isBetter) {
      pbMap[ex.id] = {
        id: ex.id,
        name: ex.name,
        muscle_group: ex.muscle_group,
        equipment: ex.equipment,
        weight_kg: set.weight_kg,
        reps: set.reps,
      }
    }
  }

  const pbs = Object.values(pbMap)

  return (
    <TrackerClient
      sessions={sessions ?? []}
      pbs={pbs}
    />
  )
}