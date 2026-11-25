import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-18T12:00:00'));
});

test('calendar starts on the fourth Sunday before Christmas', async ({ page }) => {
  await page.goto('/home');
  await page.getByRole('link', { name: /Calendar/ }).click();
  const days = page.locator('.calendar .day');
  await expect(days).toHaveCount(33);
  await expect(page.locator('.calendar .sunday')).toHaveText(['29🕯️', '6🕯️', '13🕯️', '20🕯️']);
  const firstDayColumn = await page.getByRole('button', { name: 'TUESDAY 1 DECEMBER' }).evaluate((el) => {
    const grid = el.parentElement!;
    return Math.round((el.getBoundingClientRect().left - grid.getBoundingClientRect().left) /
      (grid.getBoundingClientRect().width / 7));
  });
  expect(firstDayColumn).toBe(1);
  await page.getByRole('button', { name: 'SUNDAY 29 NOVEMBER', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Light a little hope' })).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();
  await page.getByRole('button', { name: /SUNDAY 13 DECEMBER/i }).click();
  await expect(page.getByRole('heading', { name: 'Light a little hope' })).toBeVisible();
  await expect(page.getByText('In the darkest days', { exact: false })).toBeVisible();
});

test('schedules saved ideas, tracks each day separately and persists after reload', async ({ page }) => {
  await page.goto('/home');
  await page.evaluate(() => localStorage.setItem('advent_tram_task_state', JSON.stringify({
    saved: ['task_001', 'task_003'], rejected: [], postponed: [], completed: [],
  })));
  await page.reload();
  await page.getByRole('link', { name: /Saved Ideas/ }).click();
  await page.locator('article').filter({ hasText: 'Bring the forest home' }).getByRole('button', { name: 'Schedule to Day' }).click();
  await page.getByRole('button', { name: 'SUNDAY 6 DECEMBER', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Bring the forest home' })).toBeVisible();
  await page.getByRole('button', { name: 'Mark as Completed' }).click();
  await expect(page.getByRole('button', { name: 'Completed', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Schedule Task Here' }).click();
  await page.getByRole('button', { name: 'Stars for our window' }).click();
  await expect(page.getByRole('heading', { name: 'Stars for our window' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mark as Completed' })).toBeEnabled();
  await page.getByRole('button', { name: 'Close' }).click();
  await page.getByRole('button', { name: /MONDAY 7 DECEMBER/i }).click();
  await page.getByRole('button', { name: 'Schedule Task Here' }).click();
  await page.getByRole('button', { name: 'Bring the forest home' }).click();
  await expect(page.getByRole('button', { name: 'Mark as Completed' })).toBeEnabled();
  await page.getByRole('button', { name: 'Close' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'SUNDAY 6 DECEMBER', exact: true }).click();
  await expect(page.getByRole('button', { name: /Bring the forest home/ })).toBeVisible();
  await page.getByRole('button', { name: /Bring the forest home/ }).click();
  await expect(page.getByRole('button', { name: 'Completed', exact: true })).toBeDisabled();
});

test('saves a photo memory to the existing home feed', async ({ page }) => {
  await page.goto('/tram-route');
  await page.getByRole('button', { name: /SUNDAY 13 DECEMBER/i }).click();
  await page.getByRole('button', { name: 'Upload Photo Memory' }).click();
  await page.locator('input[type=file]').setInputFiles({
    name: 'memory.png',
    mimeType: 'image/png',
    buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lE8AAAAASUVORK5CYII=', 'base64'),
  });
  await page.getByLabel('A little note (optional)').fill('A quiet moment');
  await page.getByRole('button', { name: 'Save memory' }).click();
  await expect(page.getByRole('button', { name: 'Upload Photo Memory' })).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();
  await page.getByRole('link', { name: 'Back to home' }).click();
  await expect(page.locator('.memory-card h3')).toHaveText('Light a little hope');
  await expect(page.locator('.memory-note')).toHaveText('A quiet moment');
  await page.reload();
  await expect(page.locator('.memory-card h3')).toHaveText('Light a little hope');
});

test('shows localized Sunday content and reports invalid calendar data', async ({ page }) => {
  await page.goto('/home');
  await page.evaluate(() => {
    localStorage.setItem('advent_tram_settings', JSON.stringify({ language: 'ua', ageGroups: ['family'] }));
    localStorage.setItem('advent_tram_calendar', '{invalid');
  });

  await page.goto('/tram-route');
  await expect(page.getByRole('alert')).toContainText('Не вдалося завантажити маршрут');
  await page.evaluate(() => localStorage.removeItem('advent_tram_calendar'));
  await page.getByRole('button', { name: 'Спробувати ще раз' }).click();
  await page.locator('.calendar .sunday').nth(1).click();
  await expect(page.getByRole('heading', { name: 'Запаліть маленьку надію' })).toBeVisible();
  await expect(page.getByText('У найтемніші дні', { exact: false })).toBeVisible();
});

test('finds ideas for a chosen day and schedules every saved card', async ({ page }) => {
  await page.goto('/tram-route');
  await page.getByRole('button', { name: /TUESDAY 8 DECEMBER/i }).click();
  await page.getByRole('button', { name: 'Schedule Task Here' }).click();
  await page.getByRole('button', { name: 'Find New Ideas for This Day' }).click();
  await page.getByRole('button', { name: 'Find Cards' }).click();
  await expect(page.locator('.card-front h2')).toHaveText('Bring the forest home');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('button', { name: 'Next idea' }).click();
  await expect(page.locator('.card-front h2')).toHaveText('Stars for our window');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  const calendar = await page.evaluate(() => JSON.parse(localStorage.getItem('advent_tram_calendar') ?? '{}'));
  expect(calendar.scheduled['2026-12-08']).toEqual(['task_001', 'task_003']);
  await expect(page.locator('.deck-shell .saved-pill')).toContainText('(2)');
  await page.locator('.deck-shell .saved-pill').click();
  await expect(page.locator('.saved-shell article h2')).toHaveText(['Bring the forest home', 'Stars for our window']);
  await page.getByRole('link', { name: 'Back', exact: true }).click();
  await expect(page.locator('.card-front h2')).toHaveText('Paper snowflake window');
});

test('cancelling the date-specific filter clears the scheduling context', async ({ page }) => {
  await page.goto('/tram-route');
  await page.getByRole('button', { name: /TUESDAY 8 DECEMBER/i }).click();
  await page.getByRole('button', { name: 'Schedule Task Here' }).click();
  await page.getByRole('button', { name: 'Find New Ideas for This Day' }).click();
  await expect(page.getByText('Ideas saved here will be scheduled for', { exact: false })).toBeVisible();
  await page.locator('ion-modal.filter-modal').getByRole('button', { name: 'Close' }).click();
  await expect(page).toHaveURL(/\/home$/);
  await page.getByRole('button', { name: 'Find Ideas' }).click();
  await page.getByRole('button', { name: 'Find Cards' }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  const calendar = await page.evaluate(() => JSON.parse(localStorage.getItem('advent_tram_calendar') ?? '{}'));
  expect(calendar.scheduled?.['2026-12-08'] ?? []).toEqual([]);
});

test('passes a November date through filters and preserves migrated December plans', async ({ page }) => {
  await page.goto('/home');
  await page.evaluate(() => localStorage.setItem('advent_tram_calendar_2026_12', JSON.stringify({
    scheduled: { 29: ['task_003'] }, completed: { 29: ['task_003'] },
  })));
  await page.goto('/tram-route');
  await page.getByRole('button', { name: 'SUNDAY 29 NOVEMBER', exact: true }).click();
  await page.getByRole('button', { name: 'Schedule Task Here' }).click();
  await page.getByRole('button', { name: 'Find New Ideas for This Day' }).click();
  await expect(page.getByText('29 November 2026', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Find Cards' }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('advent_tram_calendar') ?? '{}'));
  expect(state.scheduled['2026-11-29']).toEqual(['task_001']);
  expect(state.scheduled['2026-12-29']).toEqual(['task_003']);
  expect(state.completed['2026-12-29']).toEqual(['task_003']);
});

test('shows the correct Advent Sundays when Christmas is a Sunday', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2022-11-20T12:00:00'));
  await page.goto('/tram-route');
  await expect(page.locator('.calendar .sunday')).toHaveText(['27🕯️', '4🕯️', '11🕯️', '18🕯️']);
  await expect(page.getByRole('button', { name: 'SUNDAY 25 DECEMBER' })).not.toHaveClass(/sunday/);
});
