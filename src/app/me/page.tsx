import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MeClient from './MeClient'

export const dynamic = 'force-dynamic'

export default async function MePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, age, height_cm, weight_kg, goal, focus_areas, coach_mode, weekly_goal, units_weight, units_height')
    .eq('id', user.id)
    .single()

  const { data: injuries } = await supabase
    .from('injuries')
    .select('id, body_part, notes, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <MeClient
      profile={profile ?? {
        name: null, age: null, height_cm: null, weight_kg: null,
        goal: null, focus_areas: [], coach_mode: 'direct',
        weekly_goal: 4, units_weight: 'kg', units_height: 'cm',
      }}
      injuries={injuries ?? []}
      email={user.email ?? ''}
    />
  )
}