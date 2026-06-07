import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get('name')
  if (!name) return NextResponse.json({ error: 'No name' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let { data } = await supabase
    .from('exercises')
    .select('id, name, equipment, muscle_group, setup_notes, log_type')
    .ilike('name', name)
    .limit(1)
    .maybeSingle()

  if (!data) {
    const { data: fuzzy } = await supabase
      .from('exercises')
      .select('id, name, equipment, muscle_group, setup_notes, log_type')
      .ilike('name', `%${name}%`)
      .limit(1)
      .maybeSingle()
    data = fuzzy
  }

  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    ...data,
    setup_notes: data.setup_notes ?? null,
    lastPerformance: null,
    starterWeight: getStarterWeight(data.equipment),
    log_type: data.log_type ?? 'weight_reps',
  })
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