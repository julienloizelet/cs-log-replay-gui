import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';
import { flowToResults } from './helpers.js';

const LOG_FILE = join(import.meta.dirname, '..', 'dev', 'log-examples', 'CVE-2017-9841-for-nginx-type-test.log');
const logContent = readFileSync(LOG_FILE, 'utf-8');

test.describe('NGINX log replay (CVE-2017-9841)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('shows log input form on initial load', async ({ page }) => {
    await expect(page.locator('#logs')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Replay Logs' })).toBeDisabled();
  });

  test('replay button enables when logs and type are provided', async ({ page }) => {
    await page.fill('#logs', logContent);
    await expect(page.getByRole('button', { name: 'Replay Logs' })).toBeDisabled();

    await page.getByLabel('NGINX').check();
    await expect(page.getByRole('button', { name: 'Replay Logs' })).toBeEnabled();
  });

  test('shows executing step with real-time output', async ({ page }) => {
    await page.fill('#logs', logContent);
    await page.getByLabel('NGINX').check();
    await page.getByRole('button', { name: 'Replay Logs' }).click();

    await expect(page.getByText('Executing...')).toBeVisible();
  });

  test('full replay flow shows exactly 1 alert for CVE-2017-9841', async ({ page }) => {
    await flowToResults(page, logContent, 'nginx');

    // Should show exactly 1 alert
    await expect(page.getByText('Alerts (1)')).toBeVisible();
    // Alert message should mention the CVE scenario and the source IP
    await expect(page.getByText("Ip 1.2.3.4 performed 'crowdsecurity/CVE-2017-9841'", { exact: false })).toBeVisible();
  });

  test('results show source IP from log line', async ({ page }) => {
    await flowToResults(page, logContent, 'nginx');

    await expect(page.getByText('Source IP:')).toBeVisible();
    await expect(page.getByText('1.2.3.4', { exact: true })).toBeVisible();
  });

  test('results show explain output section', async ({ page }) => {
    await flowToResults(page, logContent, 'nginx');

    await expect(page.getByText('Explain Output')).toBeVisible();
    // Click "Show details" to reveal the explain content
    await page.getByRole('button', { name: 'Show details' }).click();
    // Explain output should contain a table or text about the log line
    const explainSection = page.locator('.card').filter({ hasText: 'Explain Output' });
    await expect(explainSection.locator('pre')).toBeVisible();
  });

  test('New Replay button returns to input form', async ({ page }) => {
    await flowToResults(page, logContent, 'nginx');

    await page.getByRole('button', { name: 'New Replay' }).click();
    await expect(page.locator('#logs')).toBeVisible();
  });
});
