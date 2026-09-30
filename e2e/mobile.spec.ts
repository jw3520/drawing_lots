import { expect, test } from '@playwright/test'

test('serves a built application without browser errors', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  const response = await page.goto('/')
  const html = await response!.text()

  expect(html).not.toContain('/src/main.tsx')
  const modulePath = await page.locator('script[type="module"]').first().getAttribute('src')
  expect(modulePath).toMatch(/^\.?\/assets\/[^/]+\.js$/)
  const moduleResponse = await page.request.get(new URL(modulePath!, response!.url()).href)
  expect(moduleResponse.ok()).toBe(true)
  expect(moduleResponse.headers()['content-type']).toMatch(/(?:application|text)\/(?:javascript|ecmascript)/)
  await expect(page.getByTestId('draw-board')).toBeVisible()
  await expect(page.getByTestId('group-number')).toHaveCount(6)
  expect(errors).toEqual([])
})

test('supports phone taps through the real three-second draw', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Touch interaction is exercised on the phone projects.')
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  const firstCard = page.getByTestId('draw-card-0')
  await expect(firstCard.locator('.card-back')).toBeHidden()

  for (const label of ['조 개수 줄이기', '조 개수 늘리기', '사용 방법']) {
    const control = page.getByRole('button', { name: label, exact: true })
    const bounds = await control.boundingBox()
    expect(bounds!.height).toBeGreaterThanOrEqual(44)
    expect(bounds!.width).toBeGreaterThanOrEqual(44)
  }
  await page.getByRole('button', { name: '조 개수 늘리기' }).tap()
  await expect(page.getByTestId('group-count')).toHaveValue('7')
  await page.getByRole('button', { name: '조 개수 줄이기' }).tap()
  await expect(page.getByTestId('group-count')).toHaveValue('6')

  const started = Date.now()
  await page.getByTestId('shuffle-button').tap()
  await expect(page.getByTestId('draw-board')).toHaveAttribute('data-phase', 'mixing')
  await expect(page.getByTestId('group-number')).toHaveCount(0)
  await expect(page.getByTestId('draw-card-0')).toBeDisabled()
  await expect(page.getByTestId('draw-board')).toHaveAttribute('data-phase', 'hidden', { timeout: 5_000 })
  expect(Date.now() - started).toBeGreaterThanOrEqual(2_900)
  await expect(firstCard.locator('.card-front')).toBeHidden()

  await firstCard.tap()
  await expect(page.getByTestId('group-number')).toHaveCount(1)
  await expect(firstCard.locator('.card-back')).toBeHidden()
  const toolbar = page.locator('.mobile-actions')
  await toolbar.getByRole('button', { name: '전체 공개', exact: true }).tap()
  await expect(page.getByTestId('draw-board')).toHaveAttribute('data-phase', 'complete')
  const groups = await page.getByTestId('group-number').allTextContents()
  expect(groups.map(group => Number.parseInt(group, 10)).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6])
  await page.getByTestId('reset-button').tap()
  await expect(page.getByTestId('draw-board')).toHaveAttribute('data-phase', 'ready')
  await expect(toolbar).toHaveCount(0)
  expect(errors).toEqual([])
})

test('keeps help scrollable and its close button reachable in phone landscape', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Landscape phone layout is exercised on the phone projects.')
  await page.setViewportSize({ width: 844, height: 390 })
  await page.goto('/')
  for (const label of ['조 개수 줄이기', '조 개수 늘리기', '사용 방법', '처음으로']) {
    const controlBounds = await page.getByRole('button', { name: label, exact: true }).boundingBox()
    expect(controlBounds!.height).toBeGreaterThanOrEqual(44)
    expect(controlBounds!.width).toBeGreaterThanOrEqual(44)
  }
  await page.getByRole('button', { name: '사용 방법', exact: true }).tap()

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  const close = dialog.getByRole('button', { name: '닫기', exact: true })
  // Measure after the dialog's opening scale animation has finished.
  await expect.poll(async () => (await close.boundingBox())!.height).toBeGreaterThanOrEqual(44)
  await expect.poll(async () => (await close.boundingBox())!.width).toBeGreaterThanOrEqual(44)
  const bounds = await dialog.boundingBox()
  expect(bounds!.y).toBeGreaterThanOrEqual(0)
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(390)
  await close.tap()
  await expect(dialog).not.toBeVisible()
})
