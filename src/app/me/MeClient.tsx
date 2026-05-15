'use client'

import { useRouter } from 'next/navigation'
import { User, Target, Brain, AlertTriangle, LogOut, ChevronRight, Home as HomeIcon, BarChart3 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const C = {
  bg: '#0C0920', bgSoft: '#120E2A', surface: 'rgba(255,255,255,0.03)',
  text: '#EDE5FF', text2: '#C4B8E0', mute: '#7D73A3',
  hair: 'rgba(255,255,255,0.08)', hairStrong: 'rgba(183,148,255,0.2)',
  primary: '#B794FF', primary2: '#FFD1E3', primarySoft: 'rgba(183,148,255,0.12)',
  danger: '#FF5E8A', good: '#7EE8C8',
  glow1: 'rgba(183,148,255,0.3)',
}
const SHADOW_1 = '0 0 14px rgba(183,148,255,0.5)'
const FONT_DISPLAY = '"Fraunces", "Cormorant Garamond", Georgia, serif'
const FONT_BODY = '"Inter", sans-serif'

interface Profile {
  name: string | null
  age: number | null
  height_cm: number | null
  weight_kg: number | null
  goal: string | null
  focus_areas: string[] | null
  coach_mode: string | null
  weekly_goal: number | null
  units_weight: string | null
  units_height: string | null
}

interface Injury {
  id: string
  body_part: string
  notes: string | null
  created_at: string
}

interface Props {
  profile: Profile
  injuries: Injury[]
  email: string
}

const COACH_LABELS: Record<string, string> = {
  gentle: 'Gentle', direct: 'Direct', tough: 'Tough love',
}

export default function MeClient({ profile, injuries, email }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const firstName = profile.name?.split(' ')[0] ?? 'You'
  const activeInjuries = injuries.length

  const navRows = [
    {
      icon: User,
      label: 'Profile',
      sub: profile.name ?? 'Set your name',
      href: '/me/profile',
    },
    {
      icon: Target,
      label: 'Goals',
      sub: `${profile.weekly_goal ?? 4} sessions/week · ${profile.goal ?? 'No goal set'}`,
      href: '/me/goals',
    },
    {
      icon: Brain,
      label: 'Coach tone',
      sub: COACH_LABELS[profile.coach_mode ?? 'direct'] ?? 'Direct',
      href: '/me/coach',
    },
    {
      icon: AlertTriangle,
      label: 'Injuries',
      sub: activeInjuries === 0 ? 'None logged' : `${activeInjuries} logged`,
      href: '/me/injuries',
      alert: activeInjuries > 0,
    },
  ]

  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: FONT_BODY, color: C.text, maxWidth: 430, margin: '0 auto', paddingBottom: 110, position: 'relative' }}>
      <div style={{ position: 'absolute', top: -100, right: -80, width: 300, height: 300, borderRadius: '50%', background: `radial-gradient(circle, ${C.glow1}, transparent 70%)`, filter: 'blur(40px)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ padding: '20px 20px 0' }}>
          <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: C.primary, fontWeight: 600, textShadow: SHADOW_1 }}>◆ Your space</div>
          <h1 style={{ fontFamily: FONT_DISPLAY, fontWeight: 400, fontSize: 38, lineHeight: 1.05, margin: '4px 0 0' }}>
            Hey,{' '}
            <span style={{ fontStyle: 'italic', color: C.primary, textShadow: SHADOW_1 }}>{firstName}.</span>
          </h1>
          <div style={{ fontSize: 13, color: C.mute, marginTop: 6 }}>{email}</div>
        </div>

        {/* Avatar */}
        <div style={{ padding: '20px 20px 0', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 64, height: 64, borderRadius: 999, background: `linear-gradient(135deg, ${C.primary}, ${C.primary2})`, color: C.bg, display: 'grid', placeItems: 'center', fontSize: 24, fontWeight: 700, boxShadow: SHADOW_1, flexShrink: 0 }}>
            {firstName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{profile.name ?? 'Add your name'}</div>
            <div style={{ fontSize: 13, color: C.mute, marginTop: 2 }}>
              {profile.age ? `${profile.age} years` : 'Age not set'}
              {profile.weight_kg ? ` · ${profile.weight_kg}${profile.units_weight ?? 'kg'}` : ''}
            </div>
          </div>
        </div>

        {/* Nav rows */}
        <div style={{ padding: '24px 20px 0', display: 'grid', gap: 10 }}>
          {navRows.map(({ icon: Icon, label, sub, href, alert }) => (
            <button
              key={href}
              onClick={() => router.push(href)}
              style={{ width: '100%', textAlign: 'left', background: C.surface, border: `1px solid ${C.hairStrong}`, borderRadius: 16, padding: '16px 18px', cursor: 'pointer', color: C.text, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 14 }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 12, background: C.primarySoft, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                <Icon size={18} color={alert ? C.danger : C.primary} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{label}</div>
                <div style={{ fontSize: 12, color: C.mute, marginTop: 2 }}>{sub}</div>
              </div>
              <ChevronRight size={18} color={C.mute} />
            </button>
          ))}
        </div>

        {/* Sign out */}
        <div style={{ padding: '16px 20px 0' }}>
          <button
            onClick={handleSignOut}
            style={{ width: '100%', textAlign: 'left', background: 'transparent', border: `1px solid ${C.danger}30`, borderRadius: 16, padding: '16px 18px', cursor: 'pointer', color: C.danger, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 14 }}
          >
            <div style={{ width: 40, height: 40, borderRadius: 12, background: `${C.danger}15`, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <LogOut size={18} color={C.danger} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Sign out</div>
              <div style={{ fontSize: 12, color: C.mute, marginTop: 2 }}>{email}</div>
            </div>
          </button>
        </div>
      </div>

      <TabBar active="me" />
    </div>
  )
}

function TabBar({ active }: { active: 'home' | 'tracker' | 'me' }) {
  const router = useRouter()
  const tabs = [
    { id: 'home' as const,    label: 'Workout',  icon: HomeIcon, href: '/dashboard' },
    { id: 'tracker' as const, label: 'Progress', icon: BarChart3, href: '/tracker' },
    { id: 'me' as const,      label: 'You',      icon: User,     href: '/me' },
  ]
  return (
    <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, maxWidth: 430, margin: '0 auto', background: 'rgba(12,9,32,0.85)', backdropFilter: 'blur(18px)', borderTop: `1px solid rgba(183,148,255,0.2)`, padding: '10px 20px 22px', display: 'flex', justifyContent: 'space-around', zIndex: 10 }}>
      {tabs.map(({ id, label, icon: Icon, href }) => {
        const isActive = active === id
        return (
          <button key={id} onClick={() => router.push(href)} style={{ background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer', color: isActive ? C.primary : C.mute, padding: 4, filter: isActive ? `drop-shadow(${SHADOW_1})` : 'none' }}>
            <Icon size={21} strokeWidth={isActive ? 2.3 : 1.7} />
            <span style={{ fontSize: 10, letterSpacing: 0.6, fontWeight: isActive ? 700 : 500 }}>{label}</span>
          </button>
        )
      })}
    </div>
  )
}