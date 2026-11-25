import { expect, test } from '@playwright/test';
import type { CDPSession, Page } from '@playwright/test';

async function swipeCard(page: Page, cdp: CDPSession, dx: number, dy = 0): Promise<void> {
  const box = await page.locator('.card img, .card .image-placeholder').boundingBox();
  if (!box) throw new Error('Card image is not visible');
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let step = 1; step <= 5; step++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: x + dx * step / 5, y: y + dy * step / 5 }],
    });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

test('displays the full description, swipes to browse and saves with the heart', async ({ page, context }) => {
  await page.goto('/adventure?location=in&duration=15');
  const card = page.locator('.card');
  await expect(card.locator('.card-front h2')).toHaveText('Bring the forest home');
  await expect(card.locator('.card-front p')).toContainText('Transform your home into a winter wonderland');

  const cdp = await context.newCDPSession(page);
  await swipeCard(page, cdp, -120);
  await expect(card.locator('.card-front h2')).toHaveText('Stars for our window');
  await swipeCard(page, cdp, 120);
  await expect(card.locator('.card-front h2')).toHaveText('Bring the forest home');
  // Swiping right on the first card does nothing.
  await swipeCard(page, cdp, 120);
  await expect(card.locator('.card-front h2')).toHaveText('Bring the forest home');

  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(card.locator('.card-front h2')).toHaveText('Bring the forest home');
  await expect(page.getByRole('button', { name: 'Remove from Saved' })).toHaveAttribute('aria-pressed', 'true');
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('advent_tram_task_state') ?? '{}'));
  expect(state.saved).toContain('task_001');
  await page.getByRole('button', { name: 'Remove from Saved' }).click();
  await expect(page.getByRole('button', { name: 'Save', exact: true })).toHaveAttribute('aria-pressed', 'false');
});

test('refreshes changed filters when returning to the deck', async ({ page }) => {
  await page.goto('/adventure?location=in&duration=15');
  await expect(page.locator('.card-front h2')).toHaveText('Bring the forest home');
  await page.getByRole('link', { name: 'Back to home' }).click();
  await page.getByRole('button', { name: 'Find Ideas' }).click();
  await page.getByText('Outdoors', { exact: true }).click();
  await page.getByRole('button', { name: 'Find Cards' }).click();
  await expect(page.locator('.card-front h2')).toHaveText('A walk among the lights');
  await page.getByRole('link', { name: 'Back to home' }).click();
  await page.getByRole('button', { name: 'Find Ideas' }).click();
  await page.getByText('At Home', { exact: true }).click();
  await page.getByRole('button', { name: 'Find Cards' }).click();
  await expect(page.locator('.card-front h2')).toHaveText('Bring the forest home');
});

test('allows vertical scrolling and ignores short drags', async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 600 });
  await page.goto('/adventure?location=in&duration=15');
  await expect(page.locator('.card-front h2')).toHaveText('Bring the forest home');
  const cdp = await context.newCDPSession(page);

  await swipeCard(page, cdp, 30);
  await expect(page.locator('.card-front h2')).toHaveText('Bring the forest home');
  await swipeCard(page, cdp, 0, -120);
  await expect(page.locator('.card-front h2')).toHaveText('Bring the forest home');
  const scrollTop = await page.locator('ion-content').evaluate((content) =>
    content.shadowRoot?.querySelector('.inner-scroll')?.scrollTop ?? 0,
  );
  expect(scrollTop).toBeGreaterThan(0);
  await expect(page.locator('.card-front p')).toContainText('enjoying time together');
});

test('cancelling a captured swipe does not advance or save the task', async ({ page, context }) => {
  await page.goto('/adventure?location=in&duration=15');
  await expect(page.locator('.card-front h2')).toHaveText('Bring the forest home');
  const box = await page.locator('.card img').boundingBox();
  if (!box) throw new Error('Card image is not visible');
  const cdp = await context.newCDPSession(page);
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 20, y }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 120, y }] });
  await expect(page.locator('.deck-shell')).toHaveClass(/dragging/);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await expect(page.locator('.card-front h2')).toHaveText('Bring the forest home');
  await expect(page.locator('.deck-shell')).not.toHaveClass(/dragging/);
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('advent_tram_task_state') ?? '{}'));
  expect(state.rejected ?? []).not.toContain('task_001');
});

test('moves the entire panel together during a swipe started on its background', async ({ page, context }) => {
  await page.goto('/adventure?location=in&duration=15');
  await expect(page.locator('.card-front h2')).toHaveText('Bring the forest home');
  const shell = page.locator('.deck-shell');
  const elements = [shell, page.locator('header'), page.locator('.card img'), page.locator('.card-front p'), page.locator('.pager')];
  const before = await Promise.all(elements.map((element) => element.boundingBox()));
  const shellBox = before[0];
  if (!shellBox) throw new Error('Deck panel is not visible');

  const cdp = await context.newCDPSession(page);
  const x = shellBox.x + 8;
  const y = shellBox.y + 120;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 25, y }] });
  await expect(shell).toHaveClass(/dragging/);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 75, y }] });
  await expect.poll(async () => (await shell.boundingBox())!.x - shellBox.x).toBeGreaterThan(30);
  const during = await Promise.all(elements.map((element) => element.boundingBox()));
  for (let i = 0; i < elements.length; i++) {
    expect(during[i]!.x - before[i]!.x).toBeGreaterThan(30);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page.locator('.card-front h2')).toHaveText('Bring the forest home');
  await expect(shell).not.toHaveClass(/dragging/);
});

test('supports reduced motion without blocking swipes', async ({ page, context }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/adventure?location=in&duration=15');
  await expect(page.locator('.card-front h2')).toHaveText('Bring the forest home');
  await swipeCard(page, await context.newCDPSession(page), -120);
  await expect(page.locator('.card-front h2')).toHaveText('Stars for our window');
});

test('flips by tap or keyboard, keeps the full description and resets on the next card', async ({ page, context }) => {
  await page.goto('/adventure?location=in&duration=15');
  const card = page.locator('.card');
  await expect(page.locator('.card-front p')).toContainText('enjoying time together');
  await card.tap();
  await expect(card).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.card-back p')).toContainText('enjoying time together');
  await card.press('Space');
  await expect(card).toHaveAttribute('aria-pressed', 'false');
  await card.press('Enter');
  await expect(card).toHaveAttribute('aria-pressed', 'true');

  const box = await card.boundingBox();
  if (!box) throw new Error('Card is not visible');
  const cdp = await context.newCDPSession(page);
  const x = box.x + box.width / 2;
  const y = box.y + 100;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let step = 1; step <= 5; step++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove', touchPoints: [{ x: x - 120 * step / 5, y }],
    });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page.locator('.card-front h2')).toHaveText('Stars for our window');
  await expect(card).toHaveAttribute('aria-pressed', 'false');
});

test('short drags on the card do not flip it', async ({ page, context }) => {
  await page.goto('/adventure?location=in&duration=15');
  await expect(page.locator('.card-front h2')).toHaveText('Bring the forest home');
  await swipeCard(page, await context.newCDPSession(page), 55);
  await expect(page.locator('.card')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.card-front h2')).toHaveText('Bring the forest home');
});

test('browses through every idea with the pager and stops at both ends', async ({ page }) => {
  await page.goto('/adventure?location=in&duration=15');
  const expected = ['Bring the forest home', 'Stars for our window', 'Paper snowflake window', 'A tiny gratitude garland'];
  const next = page.getByRole('button', { name: 'Next idea' });
  const previous = page.getByRole('button', { name: 'Previous idea' });
  await expect(previous).toBeDisabled();
  for (const [index, title] of expected.entries()) {
    await expect(page.locator('.card-front h2')).toHaveText(title);
    if (index < expected.length - 1) await next.click();
  }
  await expect(next).toBeDisabled();
  await previous.click();
  await expect(page.locator('.card-front h2')).toHaveText(expected[2]);
});
