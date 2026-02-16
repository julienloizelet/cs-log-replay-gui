import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// Helper: paste log content, select a log type, and submit
export async function submitLogs(page: Page, logContent: string, logType: 'nginx' | 'syslog') {
  await page.fill('#logs', logContent);
  await page.getByLabel(logType === 'nginx' ? 'NGINX' : 'Syslog (SSH/Linux)').check();
  await page.getByRole('button', { name: 'Replay Logs' }).click();
}

// Helper: full flow to results — submit logs and wait for the results view
export async function flowToResults(page: Page, logContent: string, logType: 'nginx' | 'syslog') {
  await submitLogs(page, logContent, logType);
  await expect(page.getByText('Replay Results')).toBeVisible({ timeout: 60_000 });
}
