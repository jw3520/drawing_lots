import { expect, test, type Page } from '@playwright/test'

const cards = (page: Page) => page.getByTestId(/^draw-card-\d+$/)
const board = (page: Page) => page.getByTestId('draw-board')

async function expectOrderedGroups(page: Page, count: number) {
  await expect(cards(page)).toHaveCount(count)
  for (let index = 0; index < count; index += 1) {
    const card = page.getByTestId(`draw-card-${index}`)
    await expect(card).toHaveAttribute('data-state', 'visible')
    await expect(card).toHaveAccessibleName(`${index + 1}번째 카드, ${index + 1}조`)
  }
}

async function shuffleAndWait(page: Page) {
  await page.getByTestId('shuffle-button').click()
  await expect(board(page)).toHaveAttribute('data-phase', 'mixing')
  await page.clock.runFor(3_000)
  await expect(board(page)).toHaveAttribute('data-phase', 'hidden')
}

async function setGroupCount(page: Page, count: number) {
  const input = page.getByTestId('group-count')
  await input.fill(String(count))
  await input.press('Enter')
  await input.blur()
}

test.beforeEach(async ({ page }) => {
  // Let the app load normally, then control the full three-second draw precisely.
  await page.clock.install({ time: new Date('2030-01-01T11:59:00Z') })
  await page.goto('/')
  await expect(board(page)).toBeVisible()
  await page.clock.pauseAt(new Date('2030-01-01T12:00:00Z'))
})

test('starts with six ordered groups and accepts the supported group counts', async ({ page }) => {
  await expect(page.getByTestId('group-count')).toHaveValue('6')
  await expect(board(page)).toHaveAttribute('data-phase', 'ready')
  await expectOrderedGroups(page, 6)

  for (const count of [2, 20, 6]) {
    await setGroupCount(page, count)
    await expectOrderedGroups(page, count)
    await expect(board(page)).toHaveAttribute('data-phase', 'ready')
  }
})

test('rejects empty, fractional, and out-of-range group counts', async ({ page }) => {
  const input = page.getByTestId('group-count')

  for (const invalidCount of ['', '1', '21', '2.5']) {
    await input.fill(invalidCount)
    await expect(input).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByTestId('shuffle-button')).toBeDisabled()
    await expectOrderedGroups(page, 6)
    await input.blur()
    await expect(input).toHaveValue('6')
    await expect(page.getByTestId('shuffle-button')).toBeEnabled()
  }
})

test('hides numbers immediately and locks the draw for all three seconds', async ({ page }) => {
  await page.getByTestId('shuffle-button').click()

  await expect(board(page)).toHaveAttribute('data-phase', 'mixing')
  await expect(page.getByTestId('group-number')).toHaveCount(0)
  await expect(page.getByTestId('shuffle-button')).toBeDisabled()
  await expect(page.getByTestId('reveal-all-button')).toBeDisabled()
  await expect(page.getByTestId('group-count')).toBeDisabled()
  await expect(page.getByTestId('reset-button')).toBeDisabled()
  for (const card of await cards(page).all()) {
    await expect(card).toHaveAttribute('data-state', 'mixing')
    await expect(card).toBeDisabled()
  }

  await page.clock.runFor(2_999)
  await expect(board(page)).toHaveAttribute('data-phase', 'mixing')
  await expect(page.getByTestId('group-number')).toHaveCount(0)
  await expect(page.getByTestId('reveal-all-button')).toBeDisabled()

  await page.clock.runFor(1)
  await expect(board(page)).toHaveAttribute('data-phase', 'hidden')
  await expect(page.getByTestId('group-number')).toHaveCount(0)
  await expect(page.getByTestId('reveal-all-button')).toBeEnabled()
  await expect(page.getByTestId('shuffle-button')).toBeEnabled()
  for (const card of await cards(page).all()) {
    await expect(card).toHaveAttribute('data-state', 'hidden')
    await expect(card).toBeEnabled()
  }
})

test('reveals one card, then all cards without duplicates or missing groups', async ({ page }) => {
  await shuffleAndWait(page)

  const firstCard = page.getByTestId('draw-card-0')
  await firstCard.click()
  await expect(firstCard).toHaveAttribute('data-state', 'visible')
  await expect(page.getByTestId('group-number')).toHaveCount(1)
  await expect(page.getByTestId('draw-card-1')).toHaveAttribute('data-state', 'hidden')
  const firstResult = await firstCard.getByTestId('group-number').textContent()

  await page.getByTestId('reveal-all-button').click()
  await expect(board(page)).toHaveAttribute('data-phase', 'complete')
  await expect(page.getByTestId('group-number')).toHaveCount(6)
  await expect(firstCard.getByTestId('group-number')).toHaveText(firstResult ?? '')
  const results = await page.getByTestId('group-number').allTextContents()
  expect(results.map((result) => Number.parseInt(result, 10)).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6])
})

test('supports keyboard reveals and completes after the last individual card', async ({ page }) => {
  await shuffleAndWait(page)

  for (let index = 0; index < 6; index += 1) {
    const card = page.getByTestId(`draw-card-${index}`)
    await card.focus()
    await card.press(index % 2 === 0 ? 'Enter' : 'Space')
    await expect(card).toHaveAttribute('data-state', 'visible')
    await expect(page.getByTestId('group-number')).toHaveCount(index + 1)
  }

  await expect(board(page)).toHaveAttribute('data-phase', 'complete')
  await expect(page.getByTestId('reveal-all-button')).toBeDisabled()
})

test('reshuffling clears revealed cards and resetting restores the original order', async ({ page }) => {
  await shuffleAndWait(page)
  await page.getByTestId('draw-card-0').click()
  await expect(page.getByTestId('group-number')).toHaveCount(1)

  await shuffleAndWait(page)
  await expect(page.getByTestId('group-number')).toHaveCount(0)
  await page.getByTestId('reveal-all-button').click()
  await expect(board(page)).toHaveAttribute('data-phase', 'complete')

  await page.getByTestId('reset-button').click()
  await expect(board(page)).toHaveAttribute('data-phase', 'ready')
  await expectOrderedGroups(page, 6)
})

test('changing the group count starts a fresh ordered round', async ({ page }) => {
  await shuffleAndWait(page)
  await page.getByTestId('draw-card-0').click()

  await setGroupCount(page, 8)
  await expect(board(page)).toHaveAttribute('data-phase', 'ready')
  await expectOrderedGroups(page, 8)

  await shuffleAndWait(page)
  await page.getByTestId('reveal-all-button').click()
  const results = await page.getByTestId('group-number').allTextContents()
  expect(results.map((result) => Number.parseInt(result, 10)).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
})

for (const width of [320, 390, 1_440]) {
  test(`keeps the page within a ${width}px viewport with twenty groups`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await setGroupCount(page, 20)
    await expect(cards(page)).toHaveCount(20)

    const expectNoHorizontalOverflow = async () => {
      const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        document: document.documentElement.scrollWidth,
        body: document.body.scrollWidth,
      }))
      expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport)
      expect(dimensions.body).toBeLessThanOrEqual(dimensions.viewport)
    }

    await expectNoHorizontalOverflow()
    await shuffleAndWait(page)
    await expectNoHorizontalOverflow()
    await page.getByTestId('reveal-all-button').click()
    await expect(board(page)).toHaveAttribute('data-phase', 'complete')
    await expectNoHorizontalOverflow()
  })
}
