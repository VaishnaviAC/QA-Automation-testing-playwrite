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

  // --- Import Assets modal ---
  readonly importButton: Locator;
  readonly importModalHeading: Locator;
  readonly downloadTemplateButton: Locator;
  readonly importFileSelectArea: Locator;
  readonly importFileInput: Locator;
  readonly importUploadButton: Locator;
  readonly importCancelButton: Locator;
  readonly importFailedMessage: Locator;

  // --- Add Asset modal ---
  readonly addAssetButton: Locator;
  readonly addAssetHeading: Locator;
  readonly assetTypeSelectButton: Locator;
  readonly nameInput: Locator;
  readonly serialNumberInput: Locator;
  readonly locationInput: Locator;
  readonly purchaseDateInput: Locator;
  readonly warrantyInput: Locator;
  readonly cpuInput: Locator;
  readonly gpuInput: Locator;
  readonly ramInput: Locator;
  readonly storageInput: Locator;
  readonly operatingSystemInput: Locator;
  readonly descriptionEditor: Locator;
  readonly statusFieldButton: Locator;
  readonly conditionFieldButton: Locator;
  readonly brandFieldButton: Locator;
  readonly createAssetButton: Locator;
  readonly cancelAssetButton: Locator;
  // Generic catch-all for any inline validation message the form renders.
  // Exact wording is unconfirmed against the real app, so this is kept
  // broad on purpose — hasVisibleValidationError() below only needs to
  // know that *some* error appeared, not its exact copy.
  readonly assetFormValidationError: Locator;

  // --- Recycle Bin modal ---
  readonly recycleBinButton: Locator;
  readonly recycleBinHeading: Locator;
  readonly recycleBinDialog: Locator;
  // Data rows only, matched by the presence of a "Restore" button inside
  // them — this naturally excludes any empty-state placeholder row
  // without needing to know that row's exact copy (mirrors the approach
  // used for assetRows above, which excludes by known text instead).
  readonly recycleBinRows: Locator;
  readonly recycleBinToast: Locator;
  // The nested "Delete Permanently" confirmation dialog, isolated by its
  // own heading so it's never confused with the outer Recycle Bin dialog
  // even while both are simultaneously in the DOM.
  readonly confirmDeleteDialog: Locator;
  readonly confirmDeleteDialogHeading: Locator;
  readonly confirmDeleteWarningText: Locator;
  readonly confirmDeleteCancelButton: Locator;
  // NOTE: confirmed via codegen — the row-level action button is labeled
  // "Permanent Delete" (Title Case), but the actual confirm button inside
  // the dialog is labeled "Delete permanently" (lowercase 'p'). Two
  // distinct strings, not a typo in this file.
  readonly confirmDeletePermanentlyButton: Locator;

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

    // --- Import Assets modal ---
    this.importButton = page.getByRole('button', { name: 'Import', exact: true });
    this.importModalHeading = page.getByRole('heading', { name: 'Import Assets', exact: true });
    this.downloadTemplateButton = page.getByRole('button', { name: 'Download Template', exact: true });
    // The clickable drop-zone's accessible name includes both the primary
    // label and its subtext in one string (confirmed via codegen), so this
    // matches on a stable substring rather than the full concatenated text.
    this.importFileSelectArea = page.getByRole('button', { name: /Click to select file/ });
    // The actual <input type="file"> is visually hidden behind the
    // drop-zone button above; Playwright's setInputFiles() can target it
    // directly regardless of visibility.
    this.importFileInput = page.locator('input[type="file"]');
    this.importUploadButton = page.getByRole('button', { name: 'Upload', exact: true });
    this.importCancelButton = page.getByRole('button', { name: 'Cancel', exact: true });
    // Non-exact: the app may append extra detail after "Import failed"
    // (e.g. a reason), so this matches the stable leading substring.
    this.importFailedMessage = page.getByText('Import failed');

    // --- Add Asset modal ---
    // The form itself is confirmed (via codegen) to live inside a container
    // with id="asset-form". Individual fields have visible label text, but
    // codegen fell back to `getByText(label)` + positional
    // `getByRole('textbox').nth(n)` rather than `getByLabel(label)` to
    // reach each input — meaning the labels are NOT programmatically
    // associated to their inputs (no `<label for>`/aria-labelledby). A raw
    // positional index breaks the moment a field is added, removed, or
    // reordered above it, so instead assetFormField() below scopes to each
    // field's own wrapper <div> (matched by its exact label text) and grabs
    // the input inside that wrapper specifically.
    //
    // NOTE FOR MAINTAINERS: if a field's wrapper isn't cleanly isolated by
    // label text against the real running app, replace that one field's
    // locator with a direct one you capture from it (e.g.
    // page.locator('#asset-form input[name="name"]')) once real
    // id/name attributes are visible — that's the recommended long-term fix.
    this.addAssetButton = page.getByRole('button', { name: 'Add Asset', exact: true });
    this.addAssetHeading = page.getByRole('heading', { name: 'Add Asset', exact: true });
    // NOTE: originally matched by the button's fixed accessible name
    // 'Select type...' — but a real run (TC_ADD_23) showed that name
    // changes to the selected value (e.g. 'Laptop') after first use, so a
    // name-anchored locator stops matching on any later re-selection.
    // Anchored to the field's own label wrapper instead, which stays
    // stable regardless of the button's current text — same pattern as
    // statusFieldButton/conditionFieldButton/brandFieldButton above.
    this.assetTypeSelectButton = page
      .locator('#asset-form')
      .locator('div')
      .filter({ hasText: /^Asset Type/ })
      .getByRole('button')
      .first();

    this.nameInput = this.assetFormField('Name');
    this.serialNumberInput = this.assetFormField('Serial Number');
    this.locationInput = this.assetFormField('Location');
    this.cpuInput = this.assetFormField('CPU');
    this.gpuInput = this.assetFormField('GPU');
    this.ramInput = this.assetFormField('RAM \\(GB\\)');
    this.storageInput = this.assetFormField('Storage \\(GB\\)');
    this.operatingSystemInput = this.assetFormField('Operating system');
    this.warrantyInput = this.assetFormField('Warranty \\(Years\\)');

    // Status/Condition/Brand are custom dropdowns (trigger button + option
    // list), the same interaction pattern already used by the page-level
    // Status/Type filters above — located as the button inside each field's
    // own labeled wrapper.
    this.statusFieldButton = page
      .locator('#asset-form')
      .locator('div')
      .filter({ hasText: /^Status/ })
      .getByRole('button')
      .first();
    this.conditionFieldButton = page
      .locator('#asset-form')
      .locator('div')
      .filter({ hasText: /^Condition/ })
      .getByRole('button')
      .first();
    this.brandFieldButton = page
      .locator('#asset-form')
      .locator('div')
      .filter({ hasText: /^Brand/ })
      .getByRole('button')
      .first();

    this.purchaseDateInput = page.locator('#asset-form input[type="date"]');

    // The rich-text Description editor renders as a contenteditable region
    // beneath its Bold/Italic/List toolbar (confirmed via codegen:
    // `.locator('.min-h-\\[120px\\]')`), not a plain <textarea>.
    this.descriptionEditor = page.locator('#asset-form .min-h-\\[120px\\]');

    this.createAssetButton = page.getByRole('button', { name: 'Create', exact: true });
    // NOTE: originally scoped to `#asset-form`, matching the assumption
    // that Cancel lives inside the same container as the fields. A real
    // test run (TC_ADD_21/22) showed that scope times out — Cancel is
    // rendered in the modal's footer, outside the <form id="asset-form">
    // element itself (only Create, the submit button, lives inside it,
    // which is why createAssetButton above was never scoped and still
    // worked). Matched page-wide instead.
    this.cancelAssetButton = page.getByRole('button', { name: 'Cancel', exact: true });

    this.assetFormValidationError = page
      .locator('#asset-form')
      .locator('[role="alert"], .text-red-500, .text-destructive, .error');

    // --- Recycle Bin modal ---
    this.recycleBinButton = page.getByRole('button', { name: 'Recycle Bin', exact: true });
    this.recycleBinHeading = page.getByRole('heading', { name: 'Recycle Bin', exact: true });
    // Isolated by `.filter({ has: heading })` rather than a bare
    // `getByRole('dialog')`, since the nested "Delete Permanently" dialog
    // is also role="dialog" and can be open at the same time.
    this.recycleBinDialog = page.getByRole('dialog').filter({ has: this.recycleBinHeading });
    this.recycleBinRows = this.recycleBinDialog
      .locator('table tbody tr')
      .filter({ has: page.getByRole('button', { name: 'Restore', exact: true }) });
    // Generic toast/status region.
    // Matches ALL currently-visible toasts, since the app can stack
    // several at once (confirmed via a real test run) — expectToast()
    // below filters this down to the specific one being asserted on.
    this.recycleBinToast = page.getByRole('status');

    this.confirmDeleteDialogHeading = page.getByRole('heading', { name: 'Delete Permanently', exact: true });
    this.confirmDeleteDialog = page.getByRole('dialog').filter({ has: this.confirmDeleteDialogHeading });
    this.confirmDeleteWarningText = page.getByText(/permanently remove/i);
    this.confirmDeleteCancelButton = this.confirmDeleteDialog.getByRole('button', { name: 'Cancel', exact: true });
    this.confirmDeletePermanentlyButton = this.confirmDeleteDialog.getByRole('button', {
      name: 'Delete permanently',
      exact: true,
    });
  }

  /**
   * Locates a labeled field's input inside the Add Asset form (#asset-form)
   * by its visible label text, instead of a global positional textbox
   * index (see the constructor comment above for why). Scopes to the
   * wrapper <div> whose own text is exactly the given label, then returns
   * the first text-entry control inside that wrapper.
   *
   * `labelText` may include regex-escaped parentheses (e.g. 'RAM \\(GB\\)')
   * since a couple of real labels contain literal parentheses.
   */
  private assetFormField(labelText: string): Locator {
    return this.page
      .locator('#asset-form')
      .locator('div')
      .filter({ hasText: new RegExp(`^${labelText}$`) })
      .locator('input, textarea')
      .first();
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

  // ---------------------------------------------------------------------
  // Import Assets feature helpers
  // ---------------------------------------------------------------------

  /** Opens the Import modal and waits for it to render. */
  async openImportModal() {
    await this.importButton.click();
    await expect(this.importModalHeading).toBeVisible();
  }

  /**
   * Clicks "Download Template" and returns the resulting Download object.
   * Caller decides what to assert about it (filename, save path, etc.).
   */
  async downloadTemplate() {
    const downloadPromise = this.page.waitForEvent('download');
    await this.downloadTemplateButton.click();
    return downloadPromise;
  }

  /**
   * Selects a file for import by setting it directly on the underlying
   * hidden <input type="file">.
   *
   * IMPORTANT: does NOT click the visible "Click to select file" drop-zone
   * first. An earlier version did, to mirror real user interaction — but
   * that click can trigger the browser's real native file-chooser dialog,
   * which races with the programmatic setInputFiles() call and leaves the
   * app's "file selected" state never properly updated (observed as Upload
   * staying permanently disabled — a 17s timeout, not a real app bug).
   * Targeting the hidden input directly is Playwright's own recommended
   * pattern for file inputs and avoids that race entirely.
   */
  async selectFileForImport(filePath: string) {
    await this.importFileInput.setInputFiles(filePath);
  }

  /** Clicks Upload. Callers should confirm the button is enabled first
   * (e.g. via `expect(assetsPage.importUploadButton).toBeEnabled()`) for a
   * fast, clear failure instead of a long actionability-timeout if a file
   * selection didn't take effect as expected. */
  async clickUpload() {
    await this.importUploadButton.click();
  }

  /** Closes the Import modal via Cancel, discarding any selected file. */
  async cancelImport() {
    await this.importCancelButton.click();
    await expect(this.importModalHeading).not.toBeVisible();
  }

  // ---------------------------------------------------------------------
  // Add Asset feature helpers
  // ---------------------------------------------------------------------

  /** Opens the Add Asset modal and waits for its heading to render. */
  async openAddAssetModal() {
    await this.addAssetButton.click();
    await expect(this.addAssetHeading).toBeVisible();
  }

  /** Opens the Asset Type dropdown and selects the given type
   * (e.g. 'Laptop'). Options confirmed via codegen/screenshot. */
  async selectAssetType(assetType: string) {
    await this.assetTypeSelectButton.click();
    await this.page.getByRole('option', { name: assetType, exact: true }).click();
  }

  /** Opens a custom-dropdown field (Status/Condition/Brand) inside the Add
   * Asset form and selects the given option — shares the button+option
   * interaction pattern already used by filterByStatus() above, scoped
   * here to whichever field's trigger button is passed in. */
  async selectAssetFormDropdown(fieldButton: Locator, optionName: string) {
    await fieldButton.click();
    await this.page.getByRole('option', { name: optionName, exact: true }).click();
  }

  /**
   * Fills the Laptop Add Asset form from a single data object. Any
   * property left `undefined` is simply skipped, so individual test cases
   * can populate only the fields relevant to that scenario (e.g. leaving
   * every optional field out for TC_ADD_12, the "optional fields empty"
   * case). Does NOT open the modal or select Asset Type — call
   * openAddAssetModal() and selectAssetType('Laptop') first.
   *
   * NOTE ON `location`: confirmed via a real test run to be a read-only,
   * system-populated field in the actual app (rendered as
   * `<input readonly class="... cursor-not-allowed">` with a pre-filled
   * value) — NOT a user-editable text field, despite earlier assumptions.
   * `data.location` is accepted here for interface/documentation
   * compatibility but is intentionally never filled; use
   * verifyLocationIsReadonly() to assert its pre-filled value instead.
   */
  async fillLaptopForm(data: {
    name?: string;
    serialNumber?: string;
    status?: string;
    condition?: string;
    location?: string;
    purchaseDate?: string; // 'YYYY-MM-DD'
    warrantyYears?: string;
    brand?: string;
    cpu?: string;
    gpu?: string;
    ramGb?: string;
    storageGb?: string;
    operatingSystem?: string;
    description?: string;
  }) {
    if (data.name !== undefined) await this.nameInput.fill(data.name);
    if (data.serialNumber !== undefined) await this.serialNumberInput.fill(data.serialNumber);
    if (data.status !== undefined) await this.selectAssetFormDropdown(this.statusFieldButton, data.status);
    if (data.condition !== undefined) await this.selectAssetFormDropdown(this.conditionFieldButton, data.condition);
    // data.location deliberately not filled — see note above.
    if (data.purchaseDate !== undefined) await this.purchaseDateInput.fill(data.purchaseDate);
    if (data.warrantyYears !== undefined) await this.warrantyInput.fill(data.warrantyYears);
    if (data.brand !== undefined) await this.selectAssetFormDropdown(this.brandFieldButton, data.brand);
    if (data.cpu !== undefined) await this.cpuInput.fill(data.cpu);
    if (data.gpu !== undefined) await this.gpuInput.fill(data.gpu);
    if (data.ramGb !== undefined) await this.ramInput.fill(data.ramGb);
    if (data.storageGb !== undefined) await this.storageInput.fill(data.storageGb);
    if (data.operatingSystem !== undefined) await this.operatingSystemInput.fill(data.operatingSystem);
    if (data.description !== undefined) await this.descriptionEditor.fill(data.description);
  }

  /**
   * Asserts the Location field is read-only and already holds a non-empty,
   * system-populated value (see fillLaptopForm's note on `location` above).
   * Pass an expectedValue to assert the exact pre-filled text; omit it to
   * just assert "read-only and non-empty".
   */
  async verifyLocationIsReadonly(expectedValue?: string) {
    await expect(this.locationInput).toHaveAttribute('readonly', /.*/);
    if (expectedValue !== undefined) {
      await expect(this.locationInput).toHaveValue(expectedValue);
    } else {
      const value = await this.locationInput.inputValue();
      expect(value.length).toBeGreaterThan(0);
    }
  }


  /** Clicks Create. Callers assert the outcome themselves (new row added
   * vs. validation error kept the modal open), since both are legitimate
   * outcomes depending on the data a given test supplied. */
  async submitAssetForm() {
    await this.createAssetButton.click();
  }

  /** Closes the Add Asset modal via Cancel, discarding any entered data. */
  async cancelAddAsset() {
    await this.cancelAssetButton.click();
    await expect(this.addAssetHeading).not.toBeVisible();
  }

  /**
   * Returns true if, after a submit attempt, the form is still open AND
   * showing at least one validation error. Used for required-field /
   * negative test cases without hardcoding exact error copy that hasn't
   * been confirmed against the real running app.
   */
  async hasVisibleValidationError(): Promise<boolean> {
    const modalStillOpen = await this.addAssetHeading.isVisible().catch(() => false);
    const errorVisible = await this.assetFormValidationError.first().isVisible().catch(() => false);
    return modalStillOpen && errorVisible;
  }

  /**
   * Waits for the Add Asset modal to close after a successful submit.
   * Distinct from cancelAddAsset()'s close-assertion since a successful
   * Create may take a moment (API round-trip) before the modal dismisses.
   */
  async waitForAddAssetModalToClose() {
    await expect(this.addAssetHeading).not.toBeVisible({ timeout: 10000 });
  }

  // ---------------------------------------------------------------------
  // Row delete (soft delete) — Assets table Action column
  // ---------------------------------------------------------------------

  /**
   * Soft-deletes an asset from the main Assets table via its row's delete
   * (trash) icon, moving it to the Recycle Bin.
   *
   * NOTE ON LOCATOR STRATEGY: the Action column's icon buttons (view/
   * edit/delete, confirmed via screenshot) render icon-only, with no
   * visible text — so this first tries an accessible name of "Delete"
   * (in case the app labels it for a11y), and falls back to position (the
   * 3rd icon button in the row, matching the view→edit→delete order seen
   * in the screenshot) if no such name exists. If the real app instead
   * confirms the soft-delete with a dialog (distinct from the Recycle
   * Bin's own "Delete Permanently" dialog), this confirms it too; if the
   * app deletes immediately with no confirmation, that check is a no-op.
   */
  async softDeleteAssetRow(row: Locator) {
    const byName = row.getByRole('button', { name: /delete/i });
    const deleteButton = (await byName.count()) > 0 ? byName.first() : row.getByRole('button').nth(2);
    await deleteButton.click();

    const possibleConfirm = this.page.getByRole('button', { name: /^delete$/i });
    if (await possibleConfirm.isVisible({ timeout: 2000 }).catch(() => false)) {
      await possibleConfirm.click();
    }
  }

  /** Searches for the given Serial Number and soft-deletes the single
   * matching row. Assumes the search returns exactly one row (true for
   * any unique Serial Number, per the app's own uniqueness rule). */
  async deleteAssetBySerialNumber(serialNumber: string) {
    await this.search(serialNumber);
    await this.softDeleteAssetRow(this.assetRows.first());
  }

  // ---------------------------------------------------------------------
  // Recycle Bin feature helpers
  // ---------------------------------------------------------------------

  /** Opens the Recycle Bin modal and waits for its heading to render. */
  async openRecycleBin() {
    await this.recycleBinButton.click();
    await expect(this.recycleBinHeading).toBeVisible();
  }

  /** Closes the Recycle Bin modal. Confirmed via codegen: the modal is
   * dismissed by clicking its backdrop overlay (`.absolute.inset-0`)
   * rather than a dedicated close/X button — falls back to Escape if
   * that overlay isn't present, since a CSS-class-based click-outside is
   * inherently more fragile than a semantic close control. */
  async closeRecycleBin() {
    const overlay = this.page.locator('.absolute.inset-0');
    if (await overlay.isVisible().catch(() => false)) {
      await overlay.click({ position: { x: 5, y: 5 } });
    } else {
      await this.page.keyboard.press('Escape');
    }
    await expect(this.recycleBinHeading).not.toBeVisible();
  }

  /** Returns the number of deleted-asset rows currently shown in the
   * Recycle Bin. */
  async getRecycleBinRowCount(): Promise<number> {
    return this.recycleBinRows.count();
  }

  /** Returns the trimmed text of every currently visible Recycle Bin row
   * — used to confirm a specific asset (by Name/Serial Number) is, or
   * is no longer, present. */
  async getRecycleBinRowTexts(): Promise<string[]> {
    const rows = await this.recycleBinRows.all();
    const texts = await Promise.all(rows.map((row) => row.innerText()));
    return texts.map((t) => t.trim());
  }

  /** Finds the Recycle Bin row containing the given text (Name or Serial
   * Number) and clicks its Restore button. */
  async restoreAssetByText(identifyingText: string) {
    const row = this.recycleBinRows.filter({ hasText: identifyingText }).first();
    await row.getByRole('button', { name: 'Restore', exact: true }).click();
  }

  /** Finds the Recycle Bin row containing the given text and clicks its
   * "Permanent Delete" action, opening the confirmation dialog. */
  async openPermanentDeleteConfirmByText(identifyingText: string) {
    const row = this.recycleBinRows.filter({ hasText: identifyingText }).first();
    await row.getByRole('button', { name: 'Permanent Delete', exact: true }).click();
    await expect(this.confirmDeleteDialogHeading).toBeVisible();
  }

  /** Confirms the permanent deletion in the already-open confirmation
   * dialog. Call openPermanentDeleteConfirmByText() first. */
  async confirmPermanentDelete() {
    await this.confirmDeletePermanentlyButton.click();
    await expect(this.confirmDeleteDialogHeading).not.toBeVisible();
  }

  /** Cancels the permanent deletion in the already-open confirmation
   * dialog, returning to the Recycle Bin modal with the asset intact. */
  async cancelPermanentDelete() {
    await this.confirmDeleteCancelButton.click();
    await expect(this.confirmDeleteDialogHeading).not.toBeVisible();
    await expect(this.recycleBinHeading).toBeVisible();
  }

  /**
   * Asserts a toast/status message matching the given pattern is visible.
   *
   * NOTE: confirmed via a real test run — the app stacks multiple toasts
   * at once (e.g. "Asset created...", "Asset moved to Recycle Bin...",
   * "Asset restored successfully" can all be on screen simultaneously),
   * so `recycleBinToast` (getByRole('status')) alone matches several
   * elements and violates Playwright's strict mode. Filtering by the
   * given pattern narrows it down to the one toast this call actually
   * cares about.
   */
  async expectToast(pattern: RegExp) {
    const toast = this.recycleBinToast.filter({ hasText: pattern }).first();
    await expect(toast).toBeVisible();
  }
}