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

  // The trigger button for the Type dropdown. Located the same way as
  // statusFilterButton: by CSS class + position, using a direct-child
  // combinator (div... > button).
  //
  // History: an earlier version anchored to "nearest preceding <button> of
  // Import" via xpath, intended to survive the trigger's label changing to
  // "N type(s) selected". That broke the moment the dropdown was OPEN:
  // Apply/Clear render inside the dropdown panel, which sits in the DOM
  // between the trigger and Import — so "nearest preceding button" matched
  // Apply instead of the trigger (confirmed via a real test failure, where
  // Apply's class was "text-xs text-primary", clearly not this trigger).
  // The direct-child selector below avoids that: Apply/Clear live inside a
  // nested dropdown-panel div, not as a *direct* child of the same
  // `div.relative.min-w-[...]` wrapper as the trigger button, so this
  // locator only ever matches the trigger itself — open or closed.
  readonly typeFilterButton: Locator;

  // Confirms the in-progress Type selection. Distinct from statusClearButton
  // below because Type is a multi-select with an explicit Apply step
  // (Status applies immediately on option click, no Apply button).
  readonly typeApplyButton: Locator;

  // The Type dropdown's own "Clear" control. Shares the same accessible
  // name ("Clear") as statusClearButton — kept as a separate named property
  // per feature area for readability, and safe because only one dropdown
  // (Status or Type) is ever open at a time.
  readonly typeClearButton: Locator;

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

    // Direct-child combinator ("> button") is the key detail: it matches
    // only a <button> that's an immediate child of the div.relative
    // wrapper — i.e. the trigger itself — and never a button nested deeper
    // inside the dropdown panel (Apply/Clear), regardless of whether the
    // dropdown is currently open or closed. nth(1) selects the second such
    // wrapper in the filter row (Status is nth(0)).
    this.typeFilterButton = page.locator('div.relative.min-w-\\[120px\\] > button').nth(1);

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
    this.typeApplyButton = page.getByRole('button', { name: 'Apply', exact: true });
    this.typeClearButton = page.getByRole('button', { name: 'Clear', exact: true });
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

  // ---------------------------------------------------------------------
  // Type Filter feature helpers
  // ---------------------------------------------------------------------

  /** Returns the <label> wrapping a given type's checkbox. Private helper —
   * not exposed directly since callers should use selectType()/getSelectedTypes(). */
  private typeCheckboxLabel(type: string): Locator {
    return this.page.locator('label').filter({ hasText: type });
  }

  private typeCheckboxInput(type: string): Locator {
    return this.typeCheckboxLabel(type).locator('input[type="checkbox"]');
  }

  /**
   * Opens the Type dropdown if it isn't already open. Idempotent — safe to
   * call even if the dropdown happens to already be open (detected via the
   * Apply button's visibility, which only renders while open).
   */
  async openAllTypesDropdown() {
    const alreadyOpen = await this.typeApplyButton.isVisible().catch(() => false);
    if (!alreadyOpen) {
      await this.typeFilterButton.click();
    }
  }

  /** Toggles a single type's checkbox. Does NOT click Apply — combine with
   * clickApply() or use filterByType()/filterByTypes() for the full flow. */
  async selectType(type: string) {
    await this.typeCheckboxLabel(type).click();
  }

  /** Toggles multiple checkboxes in sequence. Does NOT click Apply. */
  async selectMultipleTypes(types: string[]) {
    for (const type of types) {
      await this.selectType(type);
    }
  }

  /** Checks all six type checkboxes. Does NOT click Apply. Mirrors
   * assetsData.ts's allTypeOptions — keep in sync if the UI adds a new type. */
  async selectAllTypes() {
    await this.selectMultipleTypes(['Laptop', 'Monitor', 'Mobile phone', 'Mouse', 'Keyboard', 'Other Peripheral']);
  }

  /** Confirms the current checkbox selection and waits for the filtered
   * list to finish loading. */
  async clickApply() {
    await this.typeApplyButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  /** Clicks the Type dropdown's own "Clear" button (dropdown must already
   * be open). Resets all checkboxes and the trigger label, but does NOT by
   * itself commit the change to the table — combine with clickApply() for
   * that (confirmed via codegen: Clear is always followed by an explicit
   * Apply click). Distinct from clearStatusFilter(), which targets the
   * Status dropdown's Clear and IS immediately committing (Status has no
   * separate Apply step). */
  async clickClear() {
    await this.typeClearButton.click();
  }

  /** Returns the type labels whose checkboxes are currently checked
   * (dropdown must be open). Used to verify selection state, e.g. after
   * reopening the dropdown post-Apply. */
  async getSelectedTypes(): Promise<string[]> {
    const allTypes = ['Laptop', 'Monitor', 'Mobile phone', 'Mouse', 'Keyboard', 'Other Peripheral'];
    const selected: string[] = [];

    for (const type of allTypes) {
      const isChecked = await this.typeCheckboxInput(type).isChecked().catch(() => false);
      if (isChecked) {
        selected.push(type);
      }
    }

    return selected;
  }

  /** Asserts the currently checked types exactly match expectedTypes
   * (order-independent). */
  async verifySelectedTypes(expectedTypes: string[]) {
    const selected = await this.getSelectedTypes();
    expect([...selected].sort()).toEqual([...expectedTypes].sort());
  }

  /** Returns the Type column value (4th column: Code, Employee Name, Name,
   * Type, ...) for every currently visible row. */
  async getTableTypeValues(): Promise<string[]> {
    const rows = await this.assetRows.all();
    const values = await Promise.all(rows.map((row) => row.locator('td').nth(3).innerText()));
    return values.map((v) => v.trim());
  }

  /** Asserts every visible row's Type column value is one of the given
   * types — i.e. no unselected type leaked into the filtered results. */
  async verifyTableContainsOnlyTypes(types: string[]) {
    const values = await this.getTableTypeValues();
    expect(values.length).toBeGreaterThan(0);
    for (const value of values) {
      expect(types).toContain(value);
    }
  }

  /** Asserts the Type trigger button shows the given default label
   * ("All Types"). Takes the expected value as a parameter rather than
   * hardcoding it, so callers supply it from centralized test data. */
  async verifyDefaultAllTypes(expectedLabel: string) {
    await expect(this.typeFilterButton).toHaveText(expectedLabel);
  }

  /** Asserts the empty-state heading and subtext match exactly. Reusable
   * across any feature (Search, Status, Type) whose filter combination can
   * legitimately return zero results. */
  async verifyEmptyStateMessage(expectedHeading: string, expectedSubtext: string) {
    await expect(this.emptyStateHeading).toHaveText(expectedHeading);
    await expect(this.emptyStateSubtext).toHaveText(expectedSubtext);
  }

  /**
   * Opens the type dropdown, checks each given type's checkbox, then
   * confirms the selection via Apply — matches the real multi-select UI
   * confirmed via codegen/screenshot (Laptop + Monitor both checked, then
   * Apply). Options: 'Laptop', 'Monitor', 'Mobile phone', 'Mouse',
   * 'Keyboard', 'Other Peripheral'. Built on top of the granular helpers
   * above so there's a single source of truth for the interaction.
   */
  async filterByTypes(assetTypes: string[]) {
    await this.openAllTypesDropdown();
    await this.selectMultipleTypes(assetTypes);
    await this.clickApply();
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