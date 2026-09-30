import { useEffect, useReducer } from 'react'
import { createGroups, DEFAULT_GROUP_COUNT, SHUFFLE_DURATION_MS, shuffleGroups } from '@/lib/draw'

type Phase = 'ready' | 'mixing' | 'hidden' | 'complete'
type DrawState = { groups: number[]; revealed: number[]; phase: Phase; secondsLeft: number; round: number }
type Action =
  | { type: 'count'; count: number }
  | { type: 'shuffle'; groups: number[] }
  | { type: 'tick' }
  | { type: 'finish' }
  | { type: 'reveal'; index: number }
  | { type: 'reveal-all' }
  | { type: 'reset' }

function initialState(count: number, round = 0): DrawState {
  return { groups: createGroups(count), revealed: [], phase: 'ready', secondsLeft: 3, round }
}

function reducer(state: DrawState, action: Action): DrawState {
  if (state.phase === 'mixing' && !['tick', 'finish'].includes(action.type)) return state
  switch (action.type) {
    case 'count': return initialState(action.count)
    case 'reset': return initialState(state.groups.length)
    case 'shuffle': return { ...state, groups: action.groups, revealed: [], phase: 'mixing', secondsLeft: 3, round: state.round + 1 }
    case 'tick': return { ...state, secondsLeft: Math.max(1, state.secondsLeft - 1) }
    case 'finish': return state.phase === 'mixing' ? { ...state, phase: 'hidden' } : state
    case 'reveal': {
      if (state.phase !== 'hidden' || state.revealed.includes(action.index) || action.index < 0 || action.index >= state.groups.length) return state
      const revealed = [...state.revealed, action.index]
      return { ...state, revealed, phase: revealed.length === state.groups.length ? 'complete' : 'hidden' }
    }
    case 'reveal-all': return state.phase === 'hidden' ? { ...state, revealed: state.groups.map((_, i) => i), phase: 'complete' } : state
  }
}

export function useDraw() {
  const [state, dispatch] = useReducer(reducer, DEFAULT_GROUP_COUNT, initialState)
  useEffect(() => {
    if (state.phase !== 'mixing') return
    const interval = window.setInterval(() => dispatch({ type: 'tick' }), 1000)
    const timeout = window.setTimeout(() => dispatch({ type: 'finish' }), SHUFFLE_DURATION_MS)
    return () => { window.clearInterval(interval); window.clearTimeout(timeout) }
  }, [state.phase])

  return {
    ...state,
    count: state.groups.length,
    setCount: (count: number) => dispatch({ type: 'count', count }),
    shuffle: () => dispatch({ type: 'shuffle', groups: shuffleGroups(createGroups(state.groups.length)) }),
    reveal: (index: number) => dispatch({ type: 'reveal', index }),
    revealAll: () => dispatch({ type: 'reveal-all' }),
    reset: () => dispatch({ type: 'reset' }),
  }
}
