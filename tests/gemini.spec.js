// @ts-check
import { test, expect } from '@playwright/test';

// This test mocks the Gemini network request so we don't call the real API.
// It then exercises a simple UI flow: switch to Gemini, enter a fake key,
// send a question, and assert the mocked response is shown.

test('gemini flow with mocked response', async ({ page }) => {
  await page.goto('/');

  // clear all messages so no Eliza greeting is present
  await page.locator('#clear-btn').click();

  // intercept any generateContent request and return a canned response
  await page.route('**/v1beta/models/*:generateContent?**', route => {
    const mocked = {
      candidates: [
        {
          content: {
            parts: [ { text: 'Mocked Gemini response for testing.' } ]
          }
        }
      ]
    };
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mocked) });
  });

  // stub prompt for API key
  await page.evaluate(() => {
    window.prompt = () => 'fake-gemini-key';
    window.alert = () => {};
  });

  // choose Gemini from the provider dropdown and trigger change
  await page.selectOption('#ai-select', 'gemini');
  await page.locator('#ai-select').dispatchEvent('change');

  // wait for the provider to be set to gemini
  await expect(page.locator('#ai-select')).toHaveValue('gemini');

  // now type a question and submit
  await page.locator('#chat-input').fill('What is MVC?');
  await page.locator('#chat-form').getByRole('button', { name: 'Send' }).click();

  // wait for the latest bot message (should be the mocked Gemini response)
  const bot = page.locator('ul#messages li.bot');
  await expect(bot.last()).toContainText('Mocked Gemini response for testing.');
});
