import { type Page, type Locator } from '@playwright/test';

/**
 * Page Object Model class for the AssetIQ Assets module.
 */
export class AssetsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly searchInput: Locator;

  // The trigger button for the status dropdown (shows "All Status",
  // or the currently selected status like "Available").
  readonly statusFilterButton: Locator;

  // The text showing the current result count, e.g. "Assets: 1-12 of 79".
  // This is the key element we read from instead of clicking through
  // pagination — much faster and more reliable.
  readonly totalCountText: Locator;

  constructor(page: Page) {
    this.page = page;

    this.heading = page.getByRole('heading', { name: 'Assets', exact: true });
    this.searchInput = page.getByPlaceholder('Search by Asset Name, Employee Name, Asset Code, or Serial Number');

    // We locate this by position (first dropdown button in the filter row)
    // rather than by its visible label, because the label text itself
    // changes depending on which status is currently selected
    // (e.g. "All Status" → "Available"). A label-based locator would
    // break as soon as a filter was applied.
    this.statusFilterButton = page.locator('div.relative.min-w-\\[120px\\] > button').first();

    // A regex locator: matches any text starting with "Assets:" and
    // containing "of <number>", regardless of what the current page
    // range (1-12, 13-24, etc.) happens to be.
    this.totalCountText = page.getByText(/Assets:.*of\s+\d+/);
  }

  async goto() {
    await this.page.goto('/assets');
    // Wait for the initial asset list to finish loading before reading
    // anything from this page, so we don't accidentally read a
    // transient "0 of 0" loading state.
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Opens the status dropdown and selects the given status.
   * Options seen so far: 'All Status', 'Available', 'Assigned', 'Maintenance'.
   */
  async filterByStatus(status: string) {
    await this.statusFilterButton.click();
    await this.page.getByRole('button', { name: status, exact: true }).click();

    // After selecting a filter, the app makes a fresh API call to fetch
    // the filtered list. If we read the count immediately, we can catch
    // the UI mid-update (briefly showing "0 of 0" before the real filtered
    // count arrives) — this is a race condition, not a real bug in the app.
    // Waiting for the network to go idle ensures the filtered data has
    // actually finished loading before we read the count.
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Reads the "Assets: X-Y of Z" text and returns just the total (Z) as a number.
   * This works whether the list is unfiltered (total assets) or filtered by
   * status (e.g. total available assets), since the text updates either way.
   *
   * This app fetches data client-side after navigation/filtering (a
   * Next.js pattern), so reading the text immediately can catch a
   * transient "0 of 0" loading state before the real data arrives.
   * waitForLoadState('networkidle') doesn't reliably catch this kind of
   * client-side update, so instead we retry reading the text a few times,
   * accepting 0 only on the very last attempt (in case it's a genuinely
   * empty result, like Maintenance). This is similar in spirit to
   * Cypress's automatic retry-until-true behavior, but here we have to
   * do it manually since we're extracting a number, not just asserting
   * visibility.
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

    throw new Error('Could not read a stable asset count after multiple attempts');
  }
}
