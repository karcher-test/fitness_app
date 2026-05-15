import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { plan, exercises } = await req.json()
    // plan: { mon: { type, focus, exerciseNames[] }, ... }
    // exercises: full library for suggestions

    // Fetch profile for context
    const { data: profile } = await supabase
      .from('profiles')
      .select('goal, weekly_goal, coach_mode')
      .eq('id', user.id)
      .single()

    // Fetch injuries
    const { data: injuries } = await supabase
      .from('injuries')
      .select('body_part, notes')
      .eq('user_id', user.id)

    const injuryContext = injuries && injuries.length > 0
      ? injuries.map((i: any) => `${i.body_part}${i.notes ? ` (${i.notes})` : ''}`).join(', ')
      : 'none'

    const toneInstructions: Record<string, string> = {
      gentle: 'Be warm and encouraging. Frame everything positively.',
      direct: 'Be clear and specific. Give concrete recommendations.',
      tough: 'Be direct and push them. High standards, no excuses.',
    }

    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
    const dayLabels: Record<string, string> = {
      mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
      fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
    }

    const planSummary = days.map(d => {
      const day = plan[d]
      if (!day || day.type === 'rest') return `${dayLabels[d]}: Rest`
      if (day.type === 'flexible') return `${dayLabels[d]}: Flexible`
      if (day.type === 'run') return `${dayLabels[d]}: Run`
      if (day.type === 'cardio') return `${dayLabels[d]}: Cardio class`
      if (day.type === 'gym') {
        const focus = day.focus ? `${day.focus} focus` : 'gym (no focus set)'
        const exList = day.exerciseNames && day.exerciseNames.length > 0
          ? `\n  Exercises: ${day.exerciseNames.join(', ')}`
          : '\n  Exercises: none selected yet'
        return `${dayLabels[d]}: Gym — ${focus}${exList}`
      }
      return `${dayLabels[d]}: ${day.type}`
    }).join('\n')

    const prompt = `You are an experienced personal trainer reviewing a client's weekly training plan. Give 2-3 specific, actionable suggestions to improve the programme.

USER PROFILE:
- Goal: ${profile?.goal ?? 'general fitness'}
- Target sessions per week: ${profile?.weekly_goal ?? 4}
- Coach tone: ${profile?.coach_mode ?? 'direct'} — ${toneInstructions[profile?.coach_mode ?? 'direct']}
- Known injuries: ${injuryContext}

WEEKLY PLAN:
${planSummary}

FULL EXERCISE LIBRARY (for specific suggestions):
${exercises.map((ex: any) => `- ${ex.name} (${ex.equipment}, ${ex.muscle_group})`).join('\n')}
WHAT TO LOOK FOR — think like a PT, not a checklist:

First, count how many gym sessions they have this week. Let that drive everything:
- 1-2 gym days: suggest full body sessions. Push/pull split is irrelevant at this frequency.
- 3 gym days: upper/lower/full body split makes sense, or push/pull/legs. Don't overthink it.
- 4+ gym days: now muscle group splits make sense. Flag imbalances.

RECOVERY — highest priority:
- Heavy leg work the day before a run or cardio class is a red flag. Flag it clearly and suggest making that gym session upper body instead, or swapping the days.
- Back to back hard sessions on the same muscle group is too much regardless of frequency.
- A rest day between hard sessions is smart, not lazy.

VOLUME — be realistic:
- 5+ sessions in a week is a lot for most people. 6+ is overtraining risk. Mention it if relevant.
- Too few sessions vs their stated weekly goal is worth noting.

PROGRAMME SENSE:
- If they're doing 3 gym days and planning 3 chest sessions, that's the problem — not that they lack pull work.
- If they're doing full body sessions across the week that's often perfectly fine.
- Cardio classes and runs count as real training volume — factor them in.
- Don't suggest adding more sessions if they already have 5+ days of training.

INJURY:
- Flag any planned exercises that load an injured area.

TONE: Sound like an encouraging PT who knows this person, not a textbook. Be specific about days and exercises. One or two suggestions is often better than three.

RESPONSE FORMAT — JSON only:
{
  "overall": "one encouraging sentence summarising the week overall",
  "suggestions": [
    {
      "day": "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun" | null,
      "type": "add_exercise" | "swap_day" | "rest_day" | "reorder" | "add_to_session",
      "message": "specific warm coaching suggestion",
      "exercise": "exact exercise name from library if suggesting a specific one, otherwise null"
    }
  ]
}

RULES:
- 2-3 suggestions maximum
- Be specific — name exercises, name days
- Only suggest exercises that exist in the library
- If you see a leg/lower body gym session the day before a run or cardio class, this is your TOP priority to flag — it will compromise the run and risk injury
- Be direct about day ordering — "swap Saturday to upper body" is better than "consider recovery"
- Consider the whole week as a programme, not individual sessions
- No markdown, no preamble, JSON only`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = response.content[0].type === 'text' ? response.content[0].text : '{}'
    const clean = raw.replace(/```json|```/g, '').trim()
    const result = JSON.parse(clean)

    return NextResponse.json({
      overall: result.overall ?? "Solid week planned.",
      suggestions: result.suggestions ?? [],
    })
  } catch (err) {
    console.error('Week review error:', err)
    return NextResponse.json({
      overall: "Good start — here are a few things to consider.",
      suggestions: [],
    })
  }
}