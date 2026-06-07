import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SessionClient from './SessionClient'

export default async function SessionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch all exercises for the add sheet
  const { data: allExercises } = await supabase
  .from('exercises')
  .select('id, name, equipment, muscle_group, setup_notes, log_type')
  .or(`user_id.is.null,user_id.eq.${user.id}`)
  .order('muscle_group')
  .order('name')

  // Fetch user's exercise notes
  const { data: notes } = await supabase
    .from('exercise_notes')
    .select('exercise_id, note')
    .eq('user_id', user.id)

  const noteMap: Record<string, string> = {}
  for (const n of notes ?? []) {
    noteMap[n.exercise_id] = n.note
  }

  return (
    <SessionClient
      userId={user.id}
      allExercises={(allExercises ?? []).map(ex => ({
        ...ex,
        setup_notes: ex.setup_notes ?? null,
        lastPerformance: null,
        starterWeight: getStarterWeight(ex.equipment),
        log_type: ex.log_type ?? 'weight_reps',
      }))}
      initialNotes={noteMap}
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