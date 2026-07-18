import { expect, test } from '@playwright/test'

test('homepage presents the ten-machine collection', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('machine-card')).toHaveCount(10)
  await expect(page.locator('.machine-era')).toHaveCount(10)
  await expect(page.locator('.machine-principle')).toHaveCount(10)
  await expect(page.locator('.machine-thumbnail')).toHaveCount(10)
})

test('demo exposes operable ratio, inspection, and explosion hooks', async ({ page }) => {
  await page.goto('/#/m/demo')

  await expect
    .poll(() =>
      page.evaluate(
        () =>
          Boolean(window.__mech) &&
          typeof window.__mechSelect === 'function' &&
          typeof window.__mechExplodeSpread === 'function',
      ),
    )
    .toBe(true)

  await page.getByRole('button', { name: /暂停|Pause/ }).click()
  const angles = await page.evaluate(() => {
    const graph = window.__mech?.graph
    if (!graph) throw new Error('Mechanica graph hook is unavailable')
    graph.setInput('small-gear', 0)
    graph.drive('small-gear', Math.PI / 9)
    const state = graph.state()
    return { large: state['large-gear'], small: state['small-gear'] }
  })
  expect(angles.small).toBeCloseTo(Math.PI / 9, 8)
  expect(angles.large).toBeCloseTo(-Math.PI / 18, 8)

  const inspectorMs = await page.evaluate(async () => {
    const startedAt = performance.now()
    window.__mechSelect?.('large-gear')
    while (performance.now() - startedAt < 1000) {
      const text = document.querySelector('[data-testid="part-inspector"]')?.textContent
      if (text?.includes('Large driven gear')) return performance.now() - startedAt
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    }
    return Number.POSITIVE_INFINITY
  })
  expect(inspectorMs).toBeLessThanOrEqual(300)
  await expect(page.getByTestId('part-inspector')).toContainText(
    /从动大齿轮|Large driven gear/,
  )

  await page.getByTestId('explode-slider').fill('1')
  const spread = await page.evaluate(() => window.__mechExplodeSpread?.() ?? 0)
  expect(spread).toBeGreaterThan(0.1)

  await page.getByTestId('spotlight-play').click()
  await expect(page.locator('.viewer-canvas')).toHaveAttribute(
    'data-spotlight-active',
    'true',
  )
  await expect(page.getByTestId('event-captions')).toContainText(
    'spotlight:highlight · large-gear',
  )
  await expect(page.locator('.spotlight-done')).toHaveCount(0)
  await expect(page.locator('.spotlight-done')).toBeVisible({ timeout: 10_000 })
  await expect(page.locator('.viewer-canvas')).toHaveAttribute(
    'data-spotlight-active',
    'false',
  )
})

test('demo animation sustains fifty frames per second', async ({ page }) => {
  await page.goto('/#/m/demo')
  const fps = await page.evaluate(
    () => new Promise<number>((resolve) => {
      let frames = 0
      let startedAt: number | undefined
      const sample = (timestamp: number) => {
        startedAt ??= timestamp
        frames += 1
        const seconds = (timestamp - startedAt) / 1000
        if (seconds >= 10) resolve((frames - 1) / seconds)
        else requestAnimationFrame(sample)
      }
      requestAnimationFrame(sample)
    }),
  )
  expect(fps).toBeGreaterThanOrEqual(50)
})
