import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createGroups,
  DEFAULT_GROUP_COUNT,
  MAX_GROUP_COUNT,
  MIN_GROUP_COUNT,
  SHUFFLE_DURATION_MS,
  shuffleGroups,
} from './draw'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('createGroups', () => {
  it('starts with six groups in numerical order', () => {
    expect(DEFAULT_GROUP_COUNT).toBe(6)
    expect(createGroups()).toEqual([1, 2, 3, 4, 5, 6])
    expect(SHUFFLE_DURATION_MS).toBe(3_000)
  })

  it.each([MIN_GROUP_COUNT, MAX_GROUP_COUNT])(
    'accepts the boundary count %i with unique consecutive groups',
    (count) => {
      const groups = createGroups(count)

      expect(groups).toHaveLength(count)
      expect(new Set(groups).size).toBe(count)
      expect(groups[0]).toBe(1)
      expect(groups.at(-1)).toBe(count)
    },
  )

  it.each([0, 1, 21, -1, 2.5, NaN, Infinity])(
    'rejects invalid count %s',
    (count) => {
      expect(() => createGroups(count)).toThrow(RangeError)
    },
  )
})

describe('shuffleGroups', () => {
  it('shuffles every group once without mutating the original array', () => {
    const groups = Object.freeze(createGroups())
    const requestedRanges: number[] = []
    const shuffled = shuffleGroups(groups, (upperBoundExclusive) => {
      requestedRanges.push(upperBoundExclusive)
      return 0
    })

    expect(shuffled).toEqual([2, 3, 4, 5, 6, 1])
    expect([...shuffled].sort((a, b) => a - b)).toEqual(groups)
    expect(groups).toEqual([1, 2, 3, 4, 5, 6])
    expect(shuffled).not.toBe(groups)
    expect(requestedRanges).toEqual([6, 5, 4, 3, 2])
  })

  it('allows the original order as a legitimate random outcome', () => {
    const groups = createGroups()

    expect(shuffleGroups(groups, (upperBoundExclusive) => upperBoundExclusive - 1))
      .toEqual(groups)
  })

  it('gives each three-group permutation exactly one Fisher–Yates path', () => {
    const outcomes = new Set<string>()

    for (let first = 0; first < 3; first += 1) {
      for (let second = 0; second < 2; second += 1) {
        const choices = [first, second]
        outcomes.add(shuffleGroups([1, 2, 3], () => choices.shift()!).join(','))
      }
    }

    expect(outcomes.size).toBe(6)
  })

  it('rejects the incomplete random bucket before applying modulo', () => {
    const samples = [2 ** 32 - 1, 2, 1]
    const getRandomValues = vi.fn((array: Uint32Array) => {
      array[0] = samples.shift()!
      return array
    })
    vi.stubGlobal('crypto', { getRandomValues })

    expect(shuffleGroups([1, 2, 3])).toEqual([1, 2, 3])
    expect(getRandomValues).toHaveBeenCalledTimes(3)
    expect(samples).toHaveLength(0)
  })

  it.each([-1, 3, 0.5, NaN])('rejects an invalid injected index %s', (index) => {
    expect(() => shuffleGroups([1, 2, 3], () => index)).toThrow(RangeError)
  })

  it.each([{ groups: [] }, { groups: [1] }])('copies trivial arrays without requesting randomness', ({ groups }) => {
    const randomIndex = vi.fn()
    const shuffled = shuffleGroups(groups, randomIndex)

    expect(shuffled).toEqual(groups)
    expect(shuffled).not.toBe(groups)
    expect(randomIndex).not.toHaveBeenCalled()
  })
})
