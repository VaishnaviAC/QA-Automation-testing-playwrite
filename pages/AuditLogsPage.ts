import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Page Object Model class for the AssetIQ Audit Logs module.
 *
 * The table's "Description" column (last column) contains text like
 * "Admin logged in" — the same wording used in the Dashboard's
 * Recent Activity section. This lets us compare the two directly.
 */
export class AuditLogsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly tableRows: Locator;

  constructor(page: Page) {
    this.page = page;

    this.heading = page.getByRole('heading', { name: 'Audit Logs', exact: true });

    // Each row in the audit log table body. The table always shows the
    // most recent logs first, matching the Dashboard's Recent Activity order.
    this.tableRows = page.locator('table tbody tr');
  }

  async goto() {
    await this.page.goto('/audit-logs');
  }

  /**
   * Returns the "Description" cell locator for a specific row by index
   * (0 = most recent). Description is the last column in the table,
   * so .last() is used instead of a fixed column index — this stays
   * correct even if a column is added or removed in the middle later.
   */
  rowDescription(index: number): Locator {
    return this.tableRows.nth(index).locator('td').last();
  }

  /**
   * Returns the Description text of the first N rows as plain strings.
   * Used to compare against the Dashboard's Recent Activity list.
   *
   * This app appears to stream table data in progressively (rows can
   * render with empty cells briefly before their text arrives), so we
   * combine two layers of waiting:
   *   1. expect().not.toHaveText('') on each cell — Playwright's
   *      built-in auto-retrying assertion, which waits specifically for
   *      that cell's content.
   *   2. An outer retry loop that re-reads the whole set if any cell
   *      still came back empty after its own wait, in case the row
   *      itself gets replaced/re-rendered during streaming.
   */
  async getFirstNDescriptions(count: number): Promise<string[]> {
    const maxOuterAttempts = 3;

    for (let outerAttempt = 0; outerAttempt < maxOuterAttempts; outerAttempt++) {
      const descriptions: string[] = [];

      for (let i = 0; i < count; i++) {
        const cell = this.rowDescription(i);

        try {
          await expect(cell).not.toHaveText('', { timeout: 10000 });
        } catch {
          // Didn't settle in time this round — leave as-is, the outer
          // loop below will try the whole set again.
        }

        const text = await cell.textContent();
        descriptions.push(text?.trim() ?? '');
      }

      const hasEmptyEntry = descriptions.some((desc) => desc === '');

      if (!hasEmptyEntry || outerAttempt === maxOuterAttempts - 1) {
        return descriptions;
      }

      await this.page.waitForTimeout(1000);
    }

    return [];
  }
}