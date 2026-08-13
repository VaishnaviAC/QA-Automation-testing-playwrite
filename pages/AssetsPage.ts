import { type Page, type Locator, expect } from '@playwright/test';

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

  // The trigger button for the type dropdown (shows "All Types",
  // or the currently selected type like "Laptop"). Located by its own
  // label text rather than DOM position: unlike the Status dropdown,
  // Type's wrapper did not reliably sit at the expected sibling position
  // in the filter row, so a position-based locator (nth(1)) proved
  // unreliable in practice. Text-based matching is safe here because the
  // Type labels ('All Types', 'Laptop', 'Monitor', 'Keyboard', ...) never
  // overlap with the Status labels ('All Status', 'Available', 'Assigned',
  // 'Maintenance').
  readonly typeFilterButton: Locator;

  // The text showing the current result count, e.g. "Assets: 1-12 of 79".
  // This is the key element we read from instead of clicking through
  // pagination — much faster and more reliable.
  readonly totalCountText: Locator;

  // Data rows in the assets table (excludes the header row).
  readonly assetRows: Locator;

  // Empty-state elements shown when a search/filter returns zero results.
  readonly emptyStateHeading: Locator;
  readonly emptyStateSubtext: Locator;

  // The "Clear" action inside the Status dropdown, which resets the
  // selection back to unfiltered. Located by text rather than role, since
  // it may not render as a semantic <button> element. Safe to match without
  // scoping to the dropdown container because the Type filter's own
  // "Clear"/"Apply" controls are only present in the DOM while that
  // dropdown is open — the two never coexist in practice.
  readonly statusClearButton: Locator;

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

    // Same reasoning as statusFilterButton in spirit, but matched by label
    // text instead of position — see the property comment above for why.
    this.typeFilterButton = page.getByRole('button', {
      name: /^(All Types|Laptop|Monitor|Keyboard)$/,
    });

    // A regex locator: matches any text starting with "Assets:" and
    // containing "of <number>", regardless of what the current page
    // range (1-12, 13-24, etc.) happens to be.
    this.totalCountText = page.getByText(/Assets:.*of\s+\d+/);

    // Data rows only — header row lives in <thead>, so scoping to <tbody>
    // keeps this locator from ever matching the header. The empty-state
    // ("No assets found") message is also rendered as its own <tr> inside
    // <tbody> (a full-width placeholder row), so it's explicitly excluded
    // here — otherwise a genuinely empty result would report 1 row instead
    // of 0.
    this.assetRows = page
      .locator('table tbody tr')
      .filter({ hasNotText: 'No assets found' });

    this.emptyStateHeading = page.getByText('No assets found', { exact: true });
    this.emptyStateSubtext = page.getByText('Try another filter or add your first asset.', { exact: true });

    this.statusClearButton = page.getByRole('button', { name: 'Clear', exact: true });
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
   * Options seen so far: 'All', 'Available', 'Assigned', 'Maintenance', 'Retired'.
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
   * Opens the status dropdown (if not already open) and clicks "Clear",
   * which resets the filter back to the default "All Status" state and
   * restores the full unfiltered list. Confirmed via codegen.
   */
  async clearStatusFilter() {
    await this.statusFilterButton.click();
    await this.statusClearButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Returns true if the status dropdown menu is currently open, detected
   * via visibility of its "Clear" button (only rendered while the menu is
   * open). Used to verify the dropdown auto-closes after selecting an
   * option.
   */
  async isStatusDropdownOpen(): Promise<boolean> {
    return this.statusClearButton.isVisible();
  }

  /**
   * Opens the type dropdown, checks each given type's checkbox, then
   * confirms the selection via Apply — matches the real multi-select UI
   * confirmed via codegen/screenshot (Laptop + Monitor both checked, then
   * Apply). Options seen so far: 'Laptop', 'Monitor', 'Mobile phone',
   * 'Mouse', 'Keyboard', 'Other Peripheral'.
   */
  async filterByTypes(assetTypes: string[]) {
    await this.typeFilterButton.click();
    for (const type of assetTypes) {
      await this.page.locator('label').filter({ hasText: type }).click();
    }
    await this.page.getByRole('button', { name: 'Apply', exact: true }).click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Convenience wrapper around filterByTypes() for the common single-type
   * case, kept for backward compatibility with existing call sites.
   */
  async filterByType(assetType: string) {
    await this.filterByTypes([assetType]);
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

  // ---------------------------------------------------------------------
  // Search Bar feature helpers
  // ---------------------------------------------------------------------

  /**
   * Types the given term into the search box (clearing any existing value
   * first) and lets the app's own debounce/live-search handle filtering.
   * Does NOT press Enter — use searchAndSubmit() for that scenario.
   */
  async search(term: string) {
    await this.searchInput.click();
    await this.searchInput.fill(term);
  }

  /**
   * Types the given term and presses Enter, for the "search triggered via
   * Enter key" scenario (TC_SRCH_33).
   */
  async searchAndSubmit(term: string) {
    await this.searchInput.click();
    await this.searchInput.fill(term);
    await this.searchInput.press('Enter');
  }

  /**
   * Clears the search box back to empty, covering both the "clear button"
   * and "manual clear" style interactions (TC_SRCH_16, TC_SRCH_29).
   */
  async clearSearch() {
    await this.searchInput.fill('');
  }

  /**
   * Returns true once the empty-state ("No assets found") UI is visible.
   * Used for invalid/non-existing search terms and special-character input.
   */
  async isEmptyStateVisible(): Promise<boolean> {
    return this.emptyStateHeading.isVisible();
  }

  /**
   * Returns the number of asset rows currently rendered in the table body.
   * Retries briefly to avoid reading a transient "0 rows" state while the
   * client-side fetch triggered by typing/filtering is still in flight —
   * mirrors the retry strategy already used in getTotalCount().
   */
  async getVisibleRowCount(): Promise<number> {
    const maxAttempts = 10;
    let lastCount = 0;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      lastCount = await this.assetRows.count();
      const emptyStateShown = await this.emptyStateHeading.isVisible().catch(() => false);

      // Either real rows have arrived, or the empty state has explicitly
      // rendered (a legitimate zero-result outcome) — both are stable.
      if (lastCount > 0 || emptyStateShown) {
        return lastCount;
      }

      await this.page.waitForTimeout(300);
    }

    return lastCount;
  }

  /**
   * Returns the trimmed text content of every currently visible asset row,
   * for validating that only relevant rows are shown after a search.
   */
  async getRowTexts(): Promise<string[]> {
    const rows = await this.assetRows.all();
    const texts = await Promise.all(rows.map((row) => row.innerText()));
    return texts.map((t) => t.trim());
  }

  /**
   * Asserts that every visible row contains the given term (case-insensitive),
   * i.e. no unrelated records leaked into the results.
   */
  async expectAllRowsToContain(term: string) {
    const rowTexts = await this.getRowTexts();
    expect(rowTexts.length).toBeGreaterThan(0);
    for (const text of rowTexts) {
      expect(text.toLowerCase()).toContain(term.toLowerCase());
    }
  }
}