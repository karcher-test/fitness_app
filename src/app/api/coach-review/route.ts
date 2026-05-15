import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { exercises, checkin } = await req.json()

    // ── Fetch full exercise library ──────────────────────────────────────
    const { data: allExercises } = await supabase
      .from('exercises')
      .select('name, equipment, muscle_group')
      .order('muscle_group')
      .order('name')

    // ── Fetch recent sessions (last 48 hours) ────────────────────────────
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()

    const { data: recentSessions } = await supabase
      .from('workout_sessions')
      .select(`
        id, focus, started_at,
        session_exercises (
          rpe, complete,
          exercises ( name, muscle_group )
        )
      `)
      .eq('user_id', user.id)
      .gte('started_at', cutoff)
      .not('finished_at', 'is', null)
      .order('started_at', { ascending: false })

    // ── Build recovery context ───────────────────────────────────────────
    const recoveryContext = (() => {
      if (!recentSessions || recentSessions.length === 0) {
        return 'No sessions in the last 48 hours — fully recovered.'
      }
      return recentSessions.map(session => {
        const sessionExercises = session.session_exercises ?? []
        const muscleGroups = [...new Set(
          sessionExercises
            .filter((se: any) => se.exercises)
            .map((se: any) => se.exercises.muscle_group)
        )]
        const rpes = sessionExercises
          .filter((se: any) => se.rpe !== null)
          .map((se: any) => se.rpe as number)
        const avgRpe = rpes.length > 0
          ? Math.round(rpes.reduce((a: number, b: number) => a + b, 0) / rpes.length * 10) / 10
          : null
        const hoursAgo = Math.round(
          (Date.now() - new Date(session.started_at).getTime()) / (1000 * 60 * 60)
        )
        return `- ${hoursAgo}h ago: trained ${muscleGroups.join(', ')}${avgRpe !== null ? ` at avg RPE ${avgRpe}/10` : ''}`
      }).join('\n')
    })()

    // ── Identify fatigued muscle groups ──────────────────────────────────
    const fatigued: { group: string; rpe: number; hoursAgo: number }[] = []
    for (const session of recentSessions ?? []) {
      const sessionExercises = session.session_exercises ?? []
      const hoursAgo = Math.round(
        (Date.now() - new Date(session.started_at).getTime()) / (1000 * 60 * 60)
      )
      const groupRpes: Record<string, number[]> = {}
      for (const se of sessionExercises as any[]) {
        if (!se.exercises || se.rpe === null) continue
        const group = se.exercises.muscle_group
        if (!groupRpes[group]) groupRpes[group] = []
        groupRpes[group].push(se.rpe)
      }
      for (const [group, rpes] of Object.entries(groupRpes)) {
        const avg = rpes.reduce((a, b) => a + b, 0) / rpes.length
        if (avg >= 7) fatigued.push({ group, rpe: Math.round(avg * 10) / 10, hoursAgo })
      }
    }

    const fatiguedGroups = fatigued.length > 0
      ? fatigued.map(f => `${f.group} (trained ${f.hoursAgo}h ago at avg RPE ${f.rpe})`).join(', ')
      : 'none'

    const todayGroups = [...new Set(exercises.map((ex: any) => ex.muscle_group))]
    const overlappingFatigued = fatigued.filter(f => todayGroups.includes(f.group))
    const recoveryWarning = overlappingFatigued.length > 0
      ? `WARNING: The user is about to train ${overlappingFatigued.map(f => `${f.group} (last trained ${f.hoursAgo}h ago at RPE ${f.rpe})`).join(', ')}. This may be too soon for adequate recovery.`
      : 'No recovery conflicts with today\'s selection.'

    const prompt = `You are an experienced, encouraging personal trainer reviewing a client's workout plan. Give ONE focused coaching tip — or genuine praise if everything looks great.

USER'S CHECK-IN:
- Energy: ${checkin.energy_level} (low/med/high)
- Time available: ${checkin.time_planned} (short=~30min, normal=~45-60min, long=60min+)
- Pain today: ${checkin.pain_status} (none/mild/real)
- Pain locations today: ${checkin.pain_locations && checkin.pain_locations.length > 0 ? checkin.pain_locations.join(', ') : 'none specified'}
- Number of exercises selected: ${exercises.length}

RECENT TRAINING HISTORY (last 48 hours):
${recoveryContext}

MUSCLE GROUPS NEEDING RECOVERY (trained at RPE 7+ recently):
${fatiguedGroups}

${recoveryWarning}

TODAY'S SELECTED EXERCISES:
${exercises.map((ex: any, i: number) => `${i + 1}. ${ex.name} (${ex.equipment}, ${ex.muscle_group})`).join('\n')}

FULL EXERCISE LIBRARY (only suggest from these):
${(allExercises ?? []).map((ex: any) => `- ${ex.name} (${ex.equipment}, ${ex.muscle_group})`).join('\n')}

YOUR JOB AS A PT:
Look at the whole picture. Consider recovery, volume, balance, energy and time. Think about what a great PT would actually say to this person right now.

RECOVERY RULES (highest priority):
- If they trained a muscle group at RPE 7+ in the last 48 hours and are about to train it again, flag this clearly but kindly
- High RPE (8-10) = needs more recovery, be more firm about it
- Moderate RPE (7) = worth mentioning but less urgent
- Suggest alternative muscle groups they haven't trained recently
- Frame it as "smart training" not criticism — recovery is where the gains happen

VOLUME SENSE:
- 2-3 exercises is usually too few — suggest specific additions
- 4-6 is the sweet spot for most sessions
- 7+ is a lot unless they have 60+ mins and good energy
- 8+ on one muscle group is almost always too much
- Low energy + many exercises = suggest which specific ones to trim
- High energy + very few exercises = suggest specific exercises to add

MUSCLE GROUP SENSE:
- Hitting every muscle group = flag it, too scattered
- Heavy push/pull imbalance = flag and suggest a specific pull exercise
- All isolation no compounds = suggest one compound
- Redundant exercises (same movement pattern) = flag and suggest a swap

ENERGY + TIME SENSE:
- High energy + long time + few exercises = suggest several specific additions
- High energy + short time = identify highest impact exercises
- Low energy + long time + reasonable count = encourage lighter effort
- Low energy + many exercises = suggest specific ones to drop
- Pain + exercises loading that area = flag those specifically

INJURY RULES (highest priority alongside recovery):
- Respect BOTH logged injuries (ongoing) AND today's pain locations (acute)
- Never suggest exercises that directly load a painful area
- Left/right shoulder pain: avoid overhead press, upright rows, lateral raises on that side
- Knee pain: avoid deep squats, lunges, leg press with full range
- Lower back pain: avoid heavy deadlifts, bent-over rows
- Elbow/wrist pain: avoid heavy curls, pressing movements
- If their selected exercises conflict with today's pain locations or logged injuries, flag under "recovery" action with those exercises in exercises_to_trim

PRIORITY ORDER:
1. Recovery conflicts (most important — flag these first)
2. Volume issues (too few or too many)
3. Balance/redundancy issues
4. Energy/time optimisation

TONE: Always warm and encouraging. Never critical. Recovery is smart, not weakness. Sound like a real person who cares about their progress.

RESPONSE FORMAT — return JSON only:
{
  "status": "ready" | "suggestion",
  "message": "one warm specific sentence — always fill this in",
  "action": "add" | "trim" | "swap" | "recovery" | null,
  "exercises_to_add": ["exact exercise name from library"],
  "exercises_to_trim": ["exact exercise name from selected list"],
  "swap_in": "exact exercise name from library or null",
  "swap_out_options": ["exercise names from selected list"]
}

ACTION GUIDE:
- "add": need more exercises — list all suggestions in exercises_to_add
- "trim": too many for energy/time — list ones to drop in exercises_to_trim
- "swap": replace one exercise with another — swap_in + swap_out_options
- "recovery": trained this muscle group too recently at high RPE — exercises_to_trim contains the exercises to reconsider
- null: status is "ready", no action needed
- Only return "ready" if recovery, volume, balance and energy/time all look genuinely good

No markdown, no preamble, JSON only.`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = response.content[0].type === 'text' ? response.content[0].text : '{}'
    const clean = raw.replace(/```json|```/g, '').trim()
    const result = JSON.parse(clean)

    const safeResult = {
      status: result.status === 'suggestion' ? 'suggestion' : 'ready',
      message: result.message ?? "Looking good — you're all set.",
      action: result.action ?? null,
      exercises_to_add: result.exercises_to_add ?? [],
      exercises_to_trim: result.exercises_to_trim ?? [],
      swap_in: result.swap_in ?? null,
      swap_out_options: result.swap_out_options ?? [],
    }

    console.log('Coach tip result:', JSON.stringify(safeResult, null, 2))
    return NextResponse.json(safeResult)
  } catch (err) {
    console.error('Coach review error:', err)
    return NextResponse.json({
      status: 'ready',
      message: "Looking good — you're all set.",
      action: null,
      exercises_to_add: [],
      exercises_to_trim: [],
      swap_in: null,
      swap_out_options: [],
    })
  }
}