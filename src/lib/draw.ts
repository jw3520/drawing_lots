export const DEFAULT_GROUP_COUNT = 6
export const MIN_GROUP_COUNT = 2
export const MAX_GROUP_COUNT = 20
export const SHUFFLE_DURATION_MS = 3_000

export type RandomIndex = (upperBoundExclusive: number) => number

export function createGroups(count = DEFAULT_GROUP_COUNT): number[] {
  if (
    !Number.isInteger(count) ||
    count < MIN_GROUP_COUNT ||
    count > MAX_GROUP_COUNT
  ) {
    throw new RangeError(
      `Group count must be an integer between ${MIN_GROUP_COUNT} and ${MAX_GROUP_COUNT}.`,
    )
  }

  return Array.from({ length: count }, (_, index) => index + 1)
}

const secureRandomIndex: RandomIndex = (upperBoundExclusive) => {
  const range = 2 ** 32
  const limit = range - (range % upperBoundExclusive)
  const sample = new Uint32Array(1)

  // Discard the incomplete bucket so every index has equal probability.
  do {
    globalThis.crypto.getRandomValues(sample)
  } while (sample[0] >= limit)

  return sample[0] % upperBoundExclusive
}

export function shuffleGroups(
  groups: readonly number[],
  randomIndex: RandomIndex = secureRandomIndex,
): number[] {
  const shuffled = [...groups]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1)

    if (!Number.isInteger(swapIndex) || swapIndex < 0 || swapIndex > index) {
      throw new RangeError('Random index must be an integer within its requested range.')
    }

    ;[shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ]
  }

  return shuffled
}
