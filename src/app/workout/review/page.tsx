import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ReviewClient from './ReviewClient'

export default async function ReviewPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Count sessions per exercise for progression logic
  const { data: counts } = await supabase
    .from('session_exercises')
    .select(`
      exercise_id,
      workout_sessions!inner ( user_id )
    `)
    .eq('workout_sessions.user_id', user.id)

  const sessionCounts: Record<string, number> = {}
  for (const row of counts ?? []) {
    sessionCounts[row.exercise_id] = (sessionCounts[row.exercise_id] ?? 0) + 1
  }

  // Fetch user's exercise notes
  const { data: notes } = await supabase
    .from('exercise_notes')
    .select('exercise_id, note')
    .eq('user_id', user.id)

  const noteMap: Record<string, string> = {}
  for (const n of notes ?? []) {
    noteMap[n.exercise_id] = n.note
  }

  return <ReviewClient sessionCounts={sessionCounts} initialNotes={noteMap} />
}