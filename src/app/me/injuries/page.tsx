'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Plus, Trash2, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const C = {
  bg: '#0C0920', bgSoft: '#120E2A', surface: 'rgba(255,255,255,0.03)',
  text: '#EDE5FF', text2: '#C4B8E0', mute: '#7D73A3',
  hair: 'rgba(255,255,255,0.08)', hairStrong: 'rgba(183,148,255,0.2)',
  primary: '#B794FF', primary2: '#FFD1E3', primarySoft: 'rgba(183,148,255,0.12)',
  danger: '#FF5E8A', accent: '#FF8FD1',
  glow1: 'rgba(183,148,255,0.3)',
}
const SHADOW_1 = '0 0 14px rgba(183,148,255,0.5)'
const FONT_DISPLAY = '"Fraunces", "Cormorant Garamond", Georgia, serif'
const FONT_BODY = '"Inter", sans-serif'

const BODY_PARTS = [
  'Lower back', 'Upper back', 'Left knee', 'Right knee',
  'Left shoulder', 'Right shoulder', 'Left hip', 'Right hip',
  'Left elbow', 'Right elbow', 'Left wrist', 'Right wrist',
  'Neck', 'Left ankle', 'Right ankle', 'Hamstring', 'Quad', 'Other',
]

interface Injury {
  id: string
  body_part: string
  notes: string | null
  created_at: string
}

export default function InjuriesPage() {
  const router = useRouter()
  const supabase = createClient()

  const [injuries, setInjuries]   = useState<Injury[]>([])
  const [loading, setLoading]     = useState(true)
  const [userId, setUserId]       = useState<string | null>(null)

  // Add form state
  const [showForm, setShowForm]   = useState(false)
  const [bodyPart, setBodyPart]   = useState('')
  const [notes, setNotes]         = useState('')
  const [adding, setAdding]       = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace('/login'); return }
      setUserId(user.id)
      supabase.from('injuries')
        .select('id, body_part, notes, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          setInjuries(data ?? [])
          setLoading(false)
        })
    })
  }, [])

  const handleAdd = async () => {
    if (!bodyPart || !userId) return
    setAdding(true)
    const { data, error } = await supabase
      .from('injuries')
      .insert({ user_id: userId, body_part: bodyPart, notes: notes.trim() || null })
      .select('id, body_part, notes, created_at')
      .single()
    if (!error && data) {
      setInjuries(prev => [data, ...prev])
      setBodyPart('')
      setNotes('')
      setShowForm(false)
    }
    setAdding(false)
  }

  const handleRemove = async (id: string) => {
    if (!confirm('Remove this injury?')) return
    await supabase.from('injuries').delete().eq('id', id)
    setInjuries(prev => prev.filter(i => i.id !== id))
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '14px 16px', borderRadius: 12,
    border: `1px solid ${C.hairStrong}`, background: C.bgSoft,
    color: C.text, fontSize: 15, fontFamily: FONT_BODY,
    outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: FONT_BODY, color: C.text, maxWidth: 430, margin: '0 auto', paddingBottom: 40, position: 'relative' }}>
      <div style={{ position: 'absolute', top: -100, right: -80, width: 300, height: 300, borderRadius: '50%', background: `radial-gradient(circle, ${C.glow1}, transparent 70%)`, filter: 'blur(40px)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1, padding: '20px 20px 0' }}>
        <button onClick={() => router.back()} style={{ width: 40, height: 40, borderRadius: 999, border: `1px solid ${C.hair}`, background: C.surface, display: 'grid', placeItems: 'center', cursor: 'pointer', color: C.text }}>
          <ChevronLeft size={20} />
        </button>
        <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: C.primary, marginTop: 10, fontWeight: 600, textShadow: SHADOW_1 }}>◆ Health</div>
        <h1 style={{ fontFamily: FONT_DISPLAY, fontWeight: 400, fontSize: 38, lineHeight: 1.05, margin: '4px 0 8px' }}>
          Injuries &amp;<br />
          <span style={{ fontStyle: 'italic', color: C.primary, textShadow: SHADOW_1 }}>limitations.</span>
        </h1>
        <p style={{ fontSize: 14, color: C.text2, marginBottom: 24, lineHeight: 1.5 }}>
          The AI uses this to avoid aggravating injuries and adjust suggestions.
        </p>

        {loading ? <div style={{ color: C.mute }}>Loading…</div> : (
          <>
            {/* Injury list */}
            {injuries.length === 0 && !showForm ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: C.mute }}>
                <AlertTriangle size={28} color={C.mute} style={{ marginBottom: 10 }} />
                <div style={{ fontSize: 14 }}>No injuries logged</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
                {injuries.map(injury => (
                  <div key={injury.id} style={{ background: C.surface, border: `1px solid ${C.danger}30`, borderRadius: 16, padding: '16px 18px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <AlertTriangle size={16} color={C.danger} style={{ marginTop: 2, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>{injury.body_part}</div>
                      {injury.notes && (
                        <div style={{ fontSize: 13, color: C.text2, marginTop: 4, lineHeight: 1.4 }}>{injury.notes}</div>
                      )}
                      <div style={{ fontSize: 11, color: C.mute, marginTop: 6 }}>
                        Added {new Date(injury.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                    <button onClick={() => handleRemove(injury.id)} style={{ width: 32, height: 32, borderRadius: 999, border: `1px solid ${C.danger}30`, background: 'transparent', color: C.danger, display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add form */}
            {showForm ? (
              <div style={{ background: C.surface, border: `1px solid ${C.hairStrong}`, borderRadius: 18, padding: 18, marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Add injury</div>

                {/* Body part selector */}
                <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: C.mute, fontWeight: 600, marginBottom: 10 }}>Body part</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                  {BODY_PARTS.map(part => (
                    <button
                      key={part}
                      onClick={() => setBodyPart(part)}
                      style={{ padding: '6px 14px', borderRadius: 999, border: `1px solid ${bodyPart === part ? C.danger : C.hairStrong}`, background: bodyPart === part ? `${C.danger}15` : 'transparent', color: bodyPart === part ? C.danger : C.mute, fontSize: 12, fontWeight: bodyPart === part ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      {part}
                    </button>
                  ))}
                </div>

                <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: C.mute, fontWeight: 600, marginBottom: 8 }}>Notes (optional)</div>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="e.g. Avoid heavy loading for now, physio cleared light work"
                  rows={3}
                  style={{ ...inputStyle, resize: 'none', marginBottom: 14 }}
                />

                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { setShowForm(false); setBodyPart(''); setNotes('') }} style={{ flex: 1, padding: '12px', borderRadius: 12, border: `1px solid ${C.hair}`, background: 'transparent', color: C.mute, fontFamily: 'inherit', fontSize: 14, cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button onClick={handleAdd} disabled={!bodyPart || adding} style={{ flex: 2, padding: '12px', borderRadius: 12, border: 'none', background: bodyPart ? `linear-gradient(135deg, ${C.primary}, ${C.primary2})` : C.bgSoft, color: bodyPart ? '#0C0920' : C.mute, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: bodyPart ? 'pointer' : 'default' }}>
                    {adding ? 'Adding…' : 'Add injury'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowForm(true)}
                style={{ width: '100%', padding: '16px', borderRadius: 14, border: `1px dashed ${C.primary}40`, background: C.primarySoft, color: C.primary, fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                <Plus size={16} />
                Add injury or limitation
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}