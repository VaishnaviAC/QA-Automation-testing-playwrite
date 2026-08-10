import { type Page, type Locator } from '@playwright/test';

/**
 * Page Object Model class for the AssetIQ Assignments module.
 *
 * Same "Label: X-Y of Z" count pattern as Assets and Employees.
 * Note: this page doesn't have a status filter (Assets does), so
 * this class only needs the total count — which represents
 * "Active Assignments" (the module only lists currently active
 * assignments; returned assets no longer appear here).
 */
export class AssignmentsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly searchInput: Locator;

  // Text like "Assignments: 1-12 of 68"
  readonly totalCountText: Locator;

  constructor(page: Page) {
    this.page = page;

    this.heading = page.getByRole('heading', { name: 'Assignments', exact: true });
    this.searchInput = page.getByPlaceholder('Search by Employee Name, Employee ID, Asset Name, Asset Code, or Serial Number');
    this.totalCountText = page.getByText(/Assignments:.*of\s+\d+/);
  }

  async goto() {
    await this.page.goto('/assignments');
    // Wait for the assignment list to finish loading before reading
    // the total count, avoiding a race with the initial data fetch.
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Reads the "Assignments: X-Y of Z" text and returns just the total (Z).
   *
   * Retries a few times before accepting a 0, since this app fetches
   * data client-side and can briefly show a "0 of 0" loading state.
   * See AssetsPage.getTotalCount() for a fuller explanation.
   */
  async getTotalCount(): Promise<number> {
    const maxAttempts = 10;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const text = await this.totalCountText.textContent();
      const match = text?.match(/of\s+(\d+)/);

      if (match) {
        const count = parseInt(match[1], 10);
        if (count !== 0 || attempt === maxAttempts - 1) {
          return count;
        }
      }

      await this.page.waitForTimeout(300);
    }

    throw new Error('Could not read a stable assignment count after multiple attempts');
  }
}
