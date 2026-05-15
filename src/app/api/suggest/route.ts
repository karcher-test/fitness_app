import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    // Fetch profile + injuries for context
    const { data: profile } = await supabase
      .from('profiles')
      .select('name, goal, coach_mode, weekly_goal, focus_areas')
      .eq('id', user.id)
      .single()

    const { data: injuries } = await supabase
      .from('injuries')
      .select('body_part, notes')
      .eq('user_id', user.id)

    // Body contains: exercises (with history), checkin
    const { exercises, checkin } = await req.json()

    // Build the prompt
    const coachTone = profile?.coach_mode ?? 'direct'
    const injuryText = injuries && injuries.length > 0
      ? injuries.map((i: any) => `${i.body_part}${i.notes ? ` (${i.notes})` : ''}`).join(', ')
      : 'none'

    const toneInstructions: Record<string, string> = {
      gentle: 'Be warm, encouraging and supportive. Celebrate effort. Never make them feel bad.',
      direct: 'Be clear and concise. No fluff. Give a specific number and rationale.',
      tough: 'Push them. Be direct about when they\'re playing it safe. High expectations.',
    }

    const prompt = `You are a personal trainer AI inside a fitness app. Give workout suggestions for today's session.

USER CONTEXT:
- Goal: ${profile?.goal ?? 'general fitness'}
- Weekly target: ${profile?.weekly_goal ?? 4} sessions/week
- Coach tone: ${coachTone} — ${toneInstructions[coachTone]}
- Active injuries/limitations: ${injuryText}

TODAY'S CHECK-IN:
- Energy: ${checkin.energy_level} (low/med/high)
- Time available: ${checkin.time_planned} (short=30min, normal=45-60min, long=60min+)
- Pain today: ${checkin.pain_status} (none/mild/real)

EXERCISES PLANNED:
${exercises.map((ex: any, i: number) => `
${i + 1}. ${ex.name} (${ex.equipment})
   - Sessions logged: ${ex.sessionCount}
   - Last performance: ${ex.lastPerformance ?? 'first time'}
   - Current suggested weight: ${ex.starterWeight > 0 ? `${ex.starterWeight}kg` : 'bodyweight'}
`).join('')}

For each exercise, respond with a JSON array (one object per exercise, in the same order). Each object must have:
- "tag": short label (e.g. "Progress", "Consolidate", "Take it easy", "First session", "Deload")
- "headline": one specific actionable line (e.g. "Try 12.5kg · 3 × 10")
- "detail": 1-2 sentences of coaching rationale in the coach's tone
- "weight": suggested weight as a number in kg (0 for bodyweight)

IMPORTANT RULES:
- If pain_status is "real", always reduce intensity. Never suggest increases.
- If energy is "low", reduce weight by 10-20%. Be kind about it.
- If time is "short", suggest 2 sets instead of 3.
- If sessionCount >= 3 and energy is "high", suggest a small weight increase.
- If sessionCount < 3, focus on learning the movement, not pushing weight.
- Never suggest loading exercises that aggravate logged injuries.
- Weights must be realistic increments: barbells by 2.5kg, dumbbells by 2kg, machines by 5kg.
- Respond ONLY with the JSON array. No preamble, no markdown, no explanation.`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : ''

    // Parse — strip any accidental markdown fences
    const clean = raw.replace(/```json|```/g, '').trim()
    const suggestions = JSON.parse(clean)

    return NextResponse.json({ suggestions })
  } catch (err) {
    console.error('Suggest API error:', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}