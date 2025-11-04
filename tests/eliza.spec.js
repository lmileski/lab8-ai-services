// @ts-check
import { test, expect } from '@playwright/test';

// beginner-style E2E test for the Eliza behaviour in the app

test('eliza responds to a hello', async ({ page }) => {
  await page.goto('/');

  // ensure the input is present
  const input = page.locator('#chat-input');
  await expect(input).toBeVisible();

  // type a simple greeting and submit
  await input.fill('hello');
  await page.locator('#chat-form').getByRole('button', { name: 'Send' }).click();

  // there should be at least one bot message rendered
  const bot = page.locator('ul#messages li.bot');
  // Check that the last bot message is not empty and is not the greeting
  const botText = await bot.last().textContent();
  expect(botText && botText.trim().length).toBeGreaterThan(0);
  // Optionally, check that the last bot message is not the greeting
  expect(botText).not.toMatch(/eliza assistant/i);
});
