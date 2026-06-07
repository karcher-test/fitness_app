'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────

export interface Exercise {
    id: string
    name: string
    equipment: string
    muscle_group: string
    setup_notes: string | null
    lastPerformance: string | null
    starterWeight: number
    log_type: 'weight_reps' | 'distance_time' | 'time_level' | 'time_reps'
  }
export interface WorkoutSet {
  position: number
  weight_kg: number
  reps: number
  logged: boolean
}

export interface WorkoutExercise {
  exercise: Exercise
  sets: WorkoutSet[]
  rpe: number | null
  complete: boolean
}

export interface CheckinData {
  energy_level: 'low' | 'med' | 'high'
  time_planned: 'short' | 'normal' | 'long'
  pain_status: 'none' | 'mild' | 'real'
  pain_locations: string[]
}

interface WorkoutState {
  group: string | null
  selectedExercises: Exercise[]
  workoutExercises: WorkoutExercise[]
  checkin: CheckinData | null
  sessionId: string | null
  coachReviewDone: boolean
  exerciseNotes: Record<string, string>
}

interface WorkoutContextValue extends WorkoutState {
  setGroup: (group: string) => void
  setSelectedExercises: (exercises: Exercise[]) => void
  initWorkoutExercises: (exercises: Exercise[]) => void
  updateSet: (exIdx: number, setIdx: number, updates: Partial<WorkoutSet>) => void
  setRpe: (exIdx: number, rpe: number) => void
  markExerciseComplete: (exIdx: number) => void
  undoComplete: (exIdx: number) => void
  setCheckin: (data: CheckinData) => void
  setSessionId: (id: string) => void
  reset: () => void
  addSet: (exIdx: number) => void
  addExerciseToSession: (exercise: Exercise) => void
  removeSet: (exIdx: number, setIdx: number) => void
  removeExercise: (exIdx: number) => void
  setCoachReviewDone: (done: boolean) => void
  setExerciseNote: (exerciseId: string, note: string) => void
}

// ─── Defaults ─────────────────────────────────────────────────────────────

const DEFAULT_STATE: WorkoutState = {
  group: null,
  selectedExercises: [],
  workoutExercises: [],
  checkin: null,
  sessionId: null,
  coachReviewDone: false,
  exerciseNotes: {},
}

// ─── Context ──────────────────────────────────────────────────────────────

const WorkoutContext = createContext<WorkoutContextValue | null>(null)

export function WorkoutProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WorkoutState>(DEFAULT_STATE)

  const setGroup = (group: string) =>
    setState(s => ({ ...s, group }))

  const setSelectedExercises = (exercises: Exercise[]) =>
    setState(s => ({ ...s, selectedExercises: exercises }))

  const initWorkoutExercises = (exercises: Exercise[]) => {
    const workoutExercises: WorkoutExercise[] = exercises.map(ex => ({
      exercise: ex,
      sets: [1, 2, 3].map(position => ({
        position,
        weight_kg: ex.starterWeight,
        reps: 10,
        logged: false,
      })),
      rpe: null,
      complete: false,
    }))
    setState(s => ({ ...s, workoutExercises }))
  }

  const updateSet = (exIdx: number, setIdx: number, updates: Partial<WorkoutSet>) =>
    setState(s => ({
      ...s,
      workoutExercises: s.workoutExercises.map((we, i) =>
        i !== exIdx ? we : {
          ...we,
          sets: we.sets.map((set, j) =>
            j !== setIdx ? set : { ...set, ...updates }
          )
        }
      )
    }))

  const setRpe = (exIdx: number, rpe: number) =>
    setState(s => ({
      ...s,
      workoutExercises: s.workoutExercises.map((we, i) =>
        i !== exIdx ? we : { ...we, rpe }
      )
    }))

  const markExerciseComplete = (exIdx: number) =>
    setState(s => ({
      ...s,
      workoutExercises: s.workoutExercises.map((we, i) =>
        i !== exIdx ? we : { ...we, complete: true }
      )
    }))

    const undoComplete = (exIdx: number) =>
        setState(s => ({
          ...s,
          workoutExercises: s.workoutExercises.map((we, i) =>
            i !== exIdx ? we : {
              ...we,
              complete: false,
              rpe: null,
              sets: we.sets.map(set => ({ ...set, logged: false }))
            }
          )
        }))

  const setCheckin = (data: CheckinData) =>
    setState(s => ({ ...s, checkin: data }))

  const setSessionId = (id: string) =>
    setState(s => ({ ...s, sessionId: id }))

  const reset = () => setState(DEFAULT_STATE)

  const addSet = (exIdx: number) =>
    setState(s => ({
      ...s,
      workoutExercises: s.workoutExercises.map((we, i) => {
        if (i !== exIdx) return we
        const lastSet = we.sets[we.sets.length - 1]
        return {
          ...we,
          sets: [
            ...we.sets,
            {
              position: we.sets.length + 1,
              weight_kg: lastSet.weight_kg,
              reps: lastSet.reps,
              logged: false,
            },
          ],
        }
      }),
    }))

  const addExerciseToSession = (exercise: Exercise) =>
    setState(s => ({
      ...s,
      workoutExercises: [
        ...s.workoutExercises,
        {
          exercise,
          sets: [1, 2, 3].map(position => ({
            position,
            weight_kg: exercise.starterWeight,
            reps: 10,
            logged: false,
          })),
          rpe: null,
          complete: false,
        },
      ],
    }))

  const removeSet = (exIdx: number, setIdx: number) =>
    setState(s => ({
      ...s,
      workoutExercises: s.workoutExercises.map((we, i) => {
        if (i !== exIdx) return we
        if (we.sets[setIdx].logged) return we
        if (we.sets.length <= 1) return we
        const newSets = we.sets
          .filter((_, j) => j !== setIdx)
          .map((s, j) => ({ ...s, position: j + 1 }))
        return { ...we, sets: newSets }
      }),
    }))

  const removeExercise = (exIdx: number) =>
    setState(s => ({
      ...s,
      workoutExercises: s.workoutExercises
        .filter((_, i) => i !== exIdx)
        .map((we, i) => ({ ...we, exercise: { ...we.exercise } })),
    }))

  const setCoachReviewDone = (done: boolean) =>
    setState(s => ({ ...s, coachReviewDone: done }))

  const setExerciseNote = (exerciseId: string, note: string) =>
    setState(s => ({
      ...s,
      exerciseNotes: { ...s.exerciseNotes, [exerciseId]: note },
    }))

  return (
    <WorkoutContext.Provider value={{
      ...state,
      setGroup, setSelectedExercises, initWorkoutExercises,
      updateSet, setRpe, markExerciseComplete, undoComplete,
      setCheckin, setSessionId, reset,
      addSet, addExerciseToSession,
      removeSet, removeExercise,
      setCoachReviewDone,
      setExerciseNote,
    }}>
      {children}
    </WorkoutContext.Provider>
  )
}

export function useWorkout() {
  const ctx = useContext(WorkoutContext)
  if (!ctx) throw new Error('useWorkout must be used inside WorkoutProvider')
  return ctx
}