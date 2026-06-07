'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Check, Dumbbell, BookmarkPlus, Bookmark, Pencil, Trash2, Plus, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useWorkout } from '../context'
import type { Exercise } from '../context'

const C = {
  bg: '#0C0920', bgSoft: '#120E2A', surface: 'rgba(255,255,255,0.03)',
  text: '#EDE5FF', text2: '#C4B8E0', mute: '#7D73A3',
  hair: 'rgba(255,255,255,0.08)', hairStrong: 'rgba(183,148,255,0.2)',
  primary: '#B794FF', primary2: '#FFD1E3', primarySoft: 'rgba(183,148,255,0.12)',
  accent: '#FF8FD1', danger: '#FF5E8A',
  glow1: 'rgba(183,148,255,0.3)',
}
const SHADOW_1 = '0 0 14px rgba(183,148,255,0.5)'
const FONT_DISPLAY = '"Fraunces", "Cormorant Garamond", Georgia, serif'
const FONT_BODY = '"Inter", sans-serif'

const ALL_GROUPS = [
  { id: 'chest', label: 'Chest' }, { id: 'back', label: 'Back' },
  { id: 'arms', label: 'Arms' }, { id: 'shoulders', label: 'Shoulders' },
  { id: 'legs', label: 'Legs' }, { id: 'abs', label: 'Abs' },
  { id: 'glutes', label: 'Glutes' }, { id: 'cardio', label: 'Cardio' },
]

const EQUIPMENT_OPTIONS = [
  'Barbell', 'Dumbbell', 'Cable', 'Machine', 'Bodyweight', 'Other',
]

interface Template {
  id: string
  name: string
  exercise_ids: string[]
}

interface Props {
  group: string
  exercises: Exercise[]
}

export default function SelectClient({ group, exercises: initialExercises }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const { setGroup, setSelectedExercises } = useWorkout()

  const [activeGroup, setActiveGroup]   = useState(group)
  const [selected, setSelected]         = useState<string[]>([])
  const [exercises, setExercises]       = useState<Exercise[]>(initialExercises)

  // Templates
  const [templates, setTemplates]               = useState<Template[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(true)

  // Save template sheet
  const [showSaveSheet, setShowSaveSheet] = useState(false)
  const [templateName, setTemplateName]   = useState('')
  const [saving, setSaving]               = useState(false)

  // Edit template sheet
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [editName, setEditName]               = useState('')

  // Custom exercise sheet
  const [showCustomSheet, setShowCustomSheet] = useState(false)
  const [customName, setCustomName]           = useState('')
  const [customGroup, setCustomGroup]         = useState(group)
  const [customEquipment, setCustomEquipment] = useState('')
  const [savingCustom, setSavingCustom]       = useState(false)

  // Load templates on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('workout_templates')
        .select('id, name, exercise_ids')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          setTemplates(data ?? [])
          setTemplatesLoading(false)
        })
    })
  }, [])

  const toggle = (id: string) =>
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])

  const visible = exercises.filter(ex => ex.muscle_group === activeGroup)

  const countForGroup = (gid: string) =>
    exercises.filter(ex => ex.muscle_group === gid && selected.includes(ex.id)).length

  const loadTemplate = (template: Template) => setSelected(template.exercise_ids)

  const saveTemplate = async () => {
    if (!templateName.trim() || selected.length === 0) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('workout_templates')
      .insert({ user_id: user.id, name: templateName.trim(), exercise_ids: selected })
      .select('id, name, exercise_ids')
      .single()
    if (data) setTemplates(prev => [data, ...prev])
    setTemplateName('')
    setShowSaveSheet(false)
    setSaving(false)
  }

  const renameTemplate = async () => {
    if (!editingTemplate || !editName.trim()) return
    await supabase.from('workout_templates')
      .update({ name: editName.trim(), updated_at: new Date().toISOString() })
      .eq('id', editingTemplate.id)
    setTemplates(prev => prev.map(t =>
      t.id === editingTemplate.id ? { ...t, name: editName.trim() } : t
    ))
    setEditingTemplate(null)
  }

  const deleteTemplate = async (id: string) => {
    if (!confirm('Delete this template?')) return
    await supabase.from('workout_templates').delete().eq('id', id)
    setTemplates(prev => prev.filter(t => t.id !== id))
  }

  // Save a custom exercise to Supabase and add to local list
  const saveCustomExercise = async () => {
    if (!customName.trim() || !customEquipment) return
    setSavingCustom(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
    .from('exercises')
    .insert({
      name: customName.trim(),
      muscle_group: customGroup,
      equipment: customEquipment,
      user_id: user.id,
      log_type: 'weight_reps',
    })
    .select('id, name, equipment, muscle_group, setup_notes, log_type')
    .single()

    if (!error && data) {
        const newExercise: Exercise = {
            id: data.id,
            name: data.name,
            equipment: data.equipment,
            muscle_group: data.muscle_group,
            setup_notes: data.setup_notes ?? null,
            lastPerformance: null,
            starterWeight: getStarterWeight(data.equipment),
            log_type: data.log_type ?? 'weight_reps',
          }
      setExercises(prev => [...prev, newExercise])
      setSelected(prev => [...prev, data.id])
      setActiveGroup(customGroup)
    }

    setCustomName('')
    setCustomEquipment('')
    setShowCustomSheet(false)
    setSavingCustom(false)
  }

  const handleNext = () => {
    const picked = exercises.filter(e => selected.includes(e.id))
    setGroup(activeGroup)
    setSelectedExercises(picked)
    router.push('/workout/checkin')
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '14px 16px', borderRadius: 12,
    border: `1px solid ${C.hairStrong}`, background: C.bgSoft,
    color: C.text, fontSize: 15, fontFamily: FONT_BODY,
    outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: FONT_BODY, color: C.text, maxWidth: 430, margin: '0 auto', paddingBottom: 180, position: 'relative' }}>
      <div style={{ position: 'absolute', top: -100, right: -80, width: 300, height: 300, borderRadius: '50%', background: `radial-gradient(circle, ${C.glow1}, transparent 70%)`, filter: 'blur(40px)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Top bar */}
        <div style={{ padding: '20px 20px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', minHeight: 28 }}>
            <button onClick={() => router.back()} style={{ width: 40, height: 40, borderRadius: 999, border: `1px solid ${C.hair}`, background: C.surface, display: 'grid', placeItems: 'center', cursor: 'pointer', color: C.text }}>
              <ChevronLeft size={20} />
            </button>
          </div>
          <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: C.primary, marginTop: 10, fontWeight: 600, textShadow: SHADOW_1 }}>◆ Tap to add</div>
          <h1 style={{ fontFamily: FONT_DISPLAY, fontWeight: 400, fontSize: 38, lineHeight: 1.05, margin: '4px 0 0' }}>
            Build your<br />
            <span style={{ fontStyle: 'italic', color: C.primary, textShadow: SHADOW_1 }}>workout.</span>
          </h1>
        </div>

        {/* Templates strip */}
        {!templatesLoading && templates.length > 0 && (
          <div style={{ padding: '12px 20px 0' }}>
            <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: C.mute, fontWeight: 600, marginBottom: 8 }}>Your templates</div>
            <div style={{ overflowX: 'auto', display: 'flex', gap: 8, scrollbarWidth: 'none', paddingBottom: 4 }}>
              {templates.map(t => {
                const isLoaded = t.exercise_ids.every(id => selected.includes(id)) && t.exercise_ids.length === selected.length
                return (
                  <div key={t.id} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 999, border: `1px solid ${isLoaded ? C.primary : C.hairStrong}`, background: isLoaded ? C.primarySoft : 'transparent' }}>
                    <Bookmark size={12} color={isLoaded ? C.primary : C.mute} />
                    <span onClick={() => loadTemplate(t)} style={{ fontSize: 13, fontWeight: isLoaded ? 700 : 500, color: isLoaded ? C.primary : C.text2, whiteSpace: 'nowrap', cursor: 'pointer' }}>
                      {t.name}
                    </span>
                    <span style={{ fontSize: 11, color: C.mute }}>·{t.exercise_ids.length}</span>
                    <button onClick={e => { e.stopPropagation(); setEditingTemplate(t); setEditName(t.name) }} style={{ width: 20, height: 20, borderRadius: 999, border: 'none', background: 'transparent', color: C.mute, display: 'grid', placeItems: 'center', cursor: 'pointer', padding: 0 }}>
                      <Pencil size={11} />
                    </button>
                    <button onClick={e => { e.stopPropagation(); deleteTemplate(t.id) }} style={{ width: 20, height: 20, borderRadius: 999, border: 'none', background: 'transparent', color: C.mute, display: 'grid', placeItems: 'center', cursor: 'pointer', padding: 0 }}>
                      <Trash2 size={11} />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Group filter strip */}
        <div style={{ overflowX: 'auto', padding: '12px 20px 4px', display: 'flex', gap: 8, scrollbarWidth: 'none' }}>
          {ALL_GROUPS.map(g => {
            const isActive = activeGroup === g.id
            const count = countForGroup(g.id)
            return (
              <button
                key={g.id}
                onClick={() => setActiveGroup(g.id)}
                style={{ flexShrink: 0, padding: '8px 16px', borderRadius: 999, border: `1px solid ${isActive ? C.primary : C.hairStrong}`, background: isActive ? C.primarySoft : 'transparent', color: isActive ? C.primary : C.mute, fontSize: 13, fontWeight: isActive ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit', boxShadow: isActive ? SHADOW_1 : 'none', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {g.label}
                {count > 0 && (
                  <span style={{ background: C.primary, color: C.bg, borderRadius: 999, fontSize: 11, fontWeight: 700, padding: '1px 7px', lineHeight: 1.6 }}>{count}</span>
                )}
              </button>
            )
          })}
        </div>

        {/* Exercise grid */}
        <div style={{ padding: '12px 20px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {visible.map(ex => {
            const active = selected.includes(ex.id)
            return (
              <button
                key={ex.id}
                onClick={() => toggle(ex.id)}
                style={{ textAlign: 'left', background: active ? `linear-gradient(135deg, ${C.primary}, ${C.primary2})` : C.surface, color: active ? '#0C0920' : C.text, border: active ? 'none' : `1px solid ${C.hairStrong}`, borderRadius: 16, padding: 14, cursor: 'pointer', position: 'relative', minHeight: 138, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: active ? SHADOW_1 : 'none', fontFamily: 'inherit' }}
              >
                <div style={{ width: '100%', height: 50, borderRadius: 10, background: active ? 'rgba(255,255,255,0.15)' : C.primarySoft, display: 'grid', placeItems: 'center', color: active ? '#0C0920' : C.primary }}>
                  <Dumbbell size={18} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.2 }}>{ex.name}</div>
                  <div style={{ fontSize: 11, marginTop: 4, color: active ? 'rgba(12,9,32,0.65)' : C.mute }}>
                    {ex.equipment}
                    {ex.lastPerformance ? ` · ${ex.lastPerformance}` : ` · try ${ex.starterWeight > 0 ? `${ex.starterWeight}kg` : 'bodyweight'}`}
                  </div>
                </div>
                {active && (
                  <div style={{ position: 'absolute', top: 10, right: 10, width: 22, height: 22, borderRadius: 999, background: '#0C0920', color: C.primary, display: 'grid', placeItems: 'center' }}>
                    <Check size={14} />
                  </div>
                )}
              </button>
            )
          })}

          {/* Add custom exercise tile */}
          <button
            onClick={() => { setCustomGroup(activeGroup); setShowCustomSheet(true) }}
            style={{ textAlign: 'left', background: 'transparent', border: `1px dashed ${C.primary}40`, borderRadius: 16, padding: 14, cursor: 'pointer', minHeight: 138, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: C.primary, fontFamily: 'inherit' }}
          >
            <div style={{ width: 40, height: 40, borderRadius: 10, background: C.primarySoft, display: 'grid', placeItems: 'center' }}>
              <Plus size={18} color={C.primary} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, textAlign: 'center', lineHeight: 1.3 }}>Add custom exercise</div>
          </button>
        </div>
      </div>

      {/* Sticky CTAs */}
      {selected.length > 0 && (
        <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, padding: '12px 20px 32px', background: `linear-gradient(to top, ${C.bg} 60%, transparent)`, maxWidth: 430, margin: '0 auto', zIndex: 5, display: 'grid', gap: 8 }}>
          <button
            onClick={() => setShowSaveSheet(true)}
            style={{ width: '100%', padding: '13px', borderRadius: 14, border: `1px solid ${C.primary}40`, background: C.primarySoft, color: C.primary, fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <BookmarkPlus size={15} />
            Save as template
          </button>
          <button
            onClick={handleNext}
            style={{ width: '100%', padding: '18px 20px', borderRadius: 16, border: 'none', background: `linear-gradient(135deg, ${C.primary}, ${C.primary2})`, color: '#0C0920', fontFamily: FONT_BODY, fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 24px rgba(183,148,255,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}
          >
            Continue
            <span style={{ background: '#0C0920', color: C.primary, borderRadius: 999, padding: '2px 10px', fontSize: 13, fontWeight: 700 }}>{selected.length}</span>
          </button>
        </div>
      )}

      {/* Save template sheet */}
      {showSaveSheet && (
        <>
          <div onClick={() => setShowSaveSheet(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(12,9,32,0.7)', backdropFilter: 'blur(4px)', zIndex: 20 }} />
          <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, maxWidth: 430, margin: '0 auto', background: C.bgSoft, borderTop: `1px solid ${C.hairStrong}`, borderRadius: '24px 24px 0 0', padding: '24px 20px 40px', zIndex: 21 }}>
            <div style={{ width: 40, height: 4, borderRadius: 99, background: C.hair, margin: '0 auto 20px' }} />
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, marginBottom: 6 }}>Save template</div>
            <div style={{ fontSize: 13, color: C.mute, marginBottom: 20 }}>{selected.length} exercises selected</div>
            <input
              autoFocus
              type="text"
              placeholder="e.g. Upper Push, Leg Day A, Full Body"
              value={templateName}
              onChange={e => setTemplateName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveTemplate()}
              style={{ ...inputStyle, marginBottom: 14 }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowSaveSheet(false)} style={{ flex: 1, padding: '14px', borderRadius: 12, border: `1px solid ${C.hair}`, background: 'transparent', color: C.mute, fontFamily: 'inherit', fontSize: 14, cursor: 'pointer' }}>Cancel</button>
              <button onClick={saveTemplate} disabled={!templateName.trim() || saving} style={{ flex: 2, padding: '14px', borderRadius: 12, border: 'none', background: templateName.trim() ? `linear-gradient(135deg, ${C.primary}, ${C.primary2})` : C.bgSoft, color: templateName.trim() ? '#0C0920' : C.mute, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: templateName.trim() ? 'pointer' : 'default' }}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Edit template sheet */}
      {editingTemplate && (
        <>
          <div onClick={() => setEditingTemplate(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(12,9,32,0.7)', backdropFilter: 'blur(4px)', zIndex: 20 }} />
          <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, maxWidth: 430, margin: '0 auto', background: C.bgSoft, borderTop: `1px solid ${C.hairStrong}`, borderRadius: '24px 24px 0 0', padding: '24px 20px 40px', zIndex: 21 }}>
            <div style={{ width: 40, height: 4, borderRadius: 99, background: C.hair, margin: '0 auto 20px' }} />
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, marginBottom: 20 }}>Rename template</div>
            <input
              autoFocus
              type="text"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && renameTemplate()}
              style={{ ...inputStyle, marginBottom: 14 }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setEditingTemplate(null)} style={{ flex: 1, padding: '14px', borderRadius: 12, border: `1px solid ${C.hair}`, background: 'transparent', color: C.mute, fontFamily: 'inherit', fontSize: 14, cursor: 'pointer' }}>Cancel</button>
              <button onClick={renameTemplate} disabled={!editName.trim()} style={{ flex: 2, padding: '14px', borderRadius: 12, border: 'none', background: editName.trim() ? `linear-gradient(135deg, ${C.primary}, ${C.primary2})` : C.bgSoft, color: editName.trim() ? '#0C0920' : C.mute, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: editName.trim() ? 'pointer' : 'default' }}>Save</button>
            </div>
          </div>
        </>
      )}

      {/* Custom exercise sheet */}
      {showCustomSheet && (
        <>
          <div onClick={() => setShowCustomSheet(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(12,9,32,0.7)', backdropFilter: 'blur(4px)', zIndex: 20 }} />
          <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, maxWidth: 430, margin: '0 auto', background: C.bgSoft, borderTop: `1px solid ${C.hairStrong}`, borderRadius: '24px 24px 0 0', padding: '24px 20px 40px', zIndex: 21, maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ width: 40, height: 4, borderRadius: 99, background: C.hair, margin: '0 auto 20px' }} />
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, marginBottom: 6 }}>Custom exercise</div>
            <div style={{ fontSize: 13, color: C.mute, marginBottom: 20 }}>Add an exercise that's not in the library</div>

            {/* Name */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: C.mute, fontWeight: 600, marginBottom: 8 }}>Exercise name</div>
              <input
                autoFocus
                type="text"
                placeholder="e.g. Smith Machine Hip Thrust"
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* Muscle group */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: C.mute, fontWeight: 600, marginBottom: 10 }}>Muscle group</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {ALL_GROUPS.map(g => (
                  <button
                    key={g.id}
                    onClick={() => setCustomGroup(g.id)}
                    style={{ padding: '8px 16px', borderRadius: 999, border: `1px solid ${customGroup === g.id ? C.primary : C.hairStrong}`, background: customGroup === g.id ? C.primarySoft : 'transparent', color: customGroup === g.id ? C.primary : C.mute, fontSize: 13, fontWeight: customGroup === g.id ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Equipment */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: C.mute, fontWeight: 600, marginBottom: 10 }}>Equipment</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {EQUIPMENT_OPTIONS.map(eq => (
                  <button
                    key={eq}
                    onClick={() => setCustomEquipment(eq)}
                    style={{ padding: '8px 16px', borderRadius: 999, border: `1px solid ${customEquipment === eq ? C.primary : C.hairStrong}`, background: customEquipment === eq ? C.primarySoft : 'transparent', color: customEquipment === eq ? C.primary : C.mute, fontSize: 13, fontWeight: customEquipment === eq ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    {eq}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowCustomSheet(false)} style={{ flex: 1, padding: '14px', borderRadius: 12, border: `1px solid ${C.hair}`, background: 'transparent', color: C.mute, fontFamily: 'inherit', fontSize: 14, cursor: 'pointer' }}>Cancel</button>
              <button
                onClick={saveCustomExercise}
                disabled={!customName.trim() || !customEquipment || savingCustom}
                style={{ flex: 2, padding: '14px', borderRadius: 12, border: 'none', background: customName.trim() && customEquipment ? `linear-gradient(135deg, ${C.primary}, ${C.primary2})` : C.bgSoft, color: customName.trim() && customEquipment ? '#0C0920' : C.mute, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: customName.trim() && customEquipment ? 'pointer' : 'default' }}
              >
                {savingCustom ? 'Adding…' : 'Add exercise'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
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