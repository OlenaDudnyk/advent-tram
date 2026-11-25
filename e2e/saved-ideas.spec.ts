import { expect, test } from '@playwright/test';

test('opens saved ideas, persists a saved card and restores it after reload', async ({ page }) => {
  await page.goto('/home');
  await page.locator('.header-saved').click();
  await expect(page.getByText('Ideas you save will appear here.')).toBeVisible();
  await page.getByRole('link', { name: 'Back', exact: true }).click();
  await page.getByRole('button', { name: 'Find Ideas' }).click();
  await page.getByRole('button', { name: 'Find Cards' }).click();
  await expect(page.locator('.card-front h2')).toHaveText('Bring the forest home');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('link', { name: 'Back to home' }).click();
  await expect(page.locator('.header-saved span')).toHaveText('1');
  await page.locator('.header-saved').click();
  await expect(page.locator('article h2')).toHaveText('Bring the forest home');
  await expect(page.locator('article p')).toContainText('Transform your home');
  await page.reload();
  await expect(page.locator('article h2')).toHaveText('Bring the forest home');
});

test('refreshes an already visited saved-ideas screen after saving another idea', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('advent_tram_task_state', JSON.stringify({
      saved: ['task_001'], rejected: [], postponed: [], completed: [],
    }));
  });

  await page.goto('/home');
  await page.locator('.header-saved').click();
  await expect(page.locator('article h2')).toHaveText(['Bring the forest home']);
  await page.getByRole('link', { name: 'Back', exact: true }).click();
  await page.getByRole('button', { name: 'Find Ideas' }).click();
  await page.getByRole('button', { name: 'Find Cards' }).click();
  await expect(page.locator('.card-front h2')).toHaveText('Stars for our window');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('link', { name: 'Back to home' }).click();
  await expect(page.locator('.header-saved span')).toHaveText('2');
  await page.locator('.header-saved').click();
  await expect(page.locator('article h2')).toHaveText(['Bring the forest home', 'Stars for our window']);
});

test('completes a saved idea with a photo, keeps it saved, then removes it back into rotation', async ({ page }) => {
  await page.goto('/home');
  await page.evaluate(() => localStorage.setItem('advent_tram_task_state', JSON.stringify({
    saved: ['task_001'], rejected: [], postponed: [], completed: [],
  })));
  await page.reload();
  await page.locator('.header-saved').click();
  await page.getByRole('button', { name: 'Complete Now' }).click();
  await page.locator('input[type=file]').setInputFiles({
    name: 'memory.png', mimeType: 'image/png',
    buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lE8AAAAASUVORK5CYII=', 'base64'),
  });
  await page.getByLabel('A little note (optional)').fill('A lovely day');
  await page.getByRole('button', { name: 'Save memory' }).click();
  await expect(page.locator('article h2')).toHaveText('Bring the forest home');
  await page.getByRole('button', { name: 'Remove from Saved' }).click();
  await expect(page.getByText('Ideas you save will appear here.')).toBeVisible();
  await page.getByRole('link', { name: 'Back', exact: true }).click();
  await expect(page.locator('.memory-note')).toHaveText('A lovely day');
  await page.getByRole('button', { name: 'Find Ideas' }).click();
  await page.getByRole('button', { name: 'Find Cards' }).click();
  await expect(page.locator('.card-front h2')).toHaveText('Bring the forest home');
});
