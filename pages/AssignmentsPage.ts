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

  // --- Everything below this point is new; nothing above was changed. ---
  // Added for assignments.spec.ts. Several of these (employee/asset dropdown
  // triggers and options in particular) are best-effort locators built from
  // a screenshot and one recorded script, not live DOM access — verify with
  // `npx playwright codegen` against /assignments and adjust if needed.

  readonly assignAssetButton: Locator;
  readonly assignAssetsModalHeading: Locator;

  // Shows placeholder text before a selection, the selected value(s) after -
  // matched loosely so one locator covers both states.
  readonly employeeDropdownTrigger: Locator;
  readonly assetsDropdownTrigger: Locator;
  // The open floating panel for whichever combobox is open (Employee or
  // Assets share the same component/styling) - class taken from a real
  // failure trace. Used both to scope option queries correctly (so we
  // never accidentally click the *other* field's trigger button) and to
  // confirm the dropdown has actually closed rather than assuming it.
  readonly dropdownPanel: Locator;

  readonly noAssetsSelectedText: Locator;
  readonly remarksInput: Locator;
  readonly assignSubmitButton: Locator;
  readonly assignCancelButton: Locator;
  // Confirmed by a real recorded run: the success toast reads "Assets assigned".
  readonly assignSuccessToast: Locator;
  readonly noResultsText: Locator;

  constructor(page: Page) {
    this.page = page;

    this.heading = page.getByRole('heading', { name: 'Assignments', exact: true });
    this.searchInput = page.getByPlaceholder('Search by Employee Name, Employee ID, Asset Name, Asset Code, or Serial Number');
    this.totalCountText = page.getByText(/Assignments:.*of\s+\d+/);

    // --- New assignments below; nothing above this point was changed. ---
    this.assignAssetButton = page.getByRole('button', { name: 'Assign Asset' });
    this.assignAssetsModalHeading = page.getByRole('heading', { name: 'Assign Assets' });

    this.employeeDropdownTrigger = page
      .getByRole('dialog')
      .getByRole('button', { name: /Select employee|\(\d+\)/ })
      .first();
    this.assetsDropdownTrigger = page
      .getByRole('dialog')
      .getByRole('button', { name: /Select assets|selected/i })
      .first();
    this.dropdownPanel = page.locator(
      'div.absolute.z-50.mt-1.w-full.rounded-md.border.border-border.bg-card.p-2.shadow-lg'
    );

    this.noAssetsSelectedText = page.getByText('No assets selected.');
    this.remarksInput = page.getByRole('dialog').locator('textarea');
    this.assignSubmitButton = page.getByRole('dialog').getByRole('button', { name: 'Assign', exact: true });
    this.assignCancelButton = page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true });
    this.assignSuccessToast = page.getByText('Assets assigned').last();
    // Assumed empty-state text for a search with zero matches — adjust to the
    // app's actual wording once confirmed.
    this.noResultsText = page.getByText(/no assignments found|no results/i);
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

  // ---------------------------------------------------------------------
  // New methods below, added for assignments.spec.ts. Nothing above this
  // line was changed from the original file.
  // ---------------------------------------------------------------------

  async search(term: string) {
    await this.searchInput.fill(term);
    await this.searchInput.press('Enter');
  }

  async clearSearch() {
    await this.searchInput.fill('');
    await this.searchInput.press('Enter');
  }

  async openAssignAssetForm() {
    await this.assignAssetButton.click();
  }

  async openEmployeeDropdown() {
    await this.employeeDropdownTrigger.click();
  }

  /** Opens the Employee dropdown and clicks the option matching this exact label. */
  async selectEmployee(employeeLabel: string) {
    await this.openEmployeeDropdown();
    await this.page.getByRole('button', { name: employeeLabel, exact: true }).click();
  }

  /**
   * Opens the Employee dropdown, clicks whichever option is listed first, and
   * returns its label text. Avoids depending on a specific employee that may
   * not exist in every environment. ASSUMPTION: the first button inside the
   * open dropdown *after* the trigger itself is the first selectable option
   * (index 0 = trigger, index 1 = first option) — verify with codegen.
   */
  /**
   * Opens the Employee dropdown, clicks whichever option is listed first, and
   * returns its label text. Avoids depending on a specific employee that may
   * not exist in every environment.
   *
   * Bug fixed here: this used to query `dialog.getByRole('button')`, which
   * includes the Assets trigger button too (dialog buttons in order were:
   * Employee trigger, Assets trigger, then options). Skipping only index 0
   * meant index 1 was the *Assets trigger*, not the first employee option -
   * clicking it just toggled the closed Assets dropdown, selected no
   * employee, and the weak old assertion downstream (checking for non-empty
   * text) happened to pass anyway on the wrong element. Scoping to
   * `dropdownPanel` (the actual open popover) fixes this for real.
   */
  async selectFirstAvailableEmployee(): Promise<string> {
    await this.openEmployeeDropdown();
    const firstOption = this.dropdownPanel.getByRole('button').first();
    const label = (await firstOption.textContent())?.trim() ?? '';
    await firstOption.click();
    return label;
  }

  async openAssetsDropdown() {
    await this.assetsDropdownTrigger.click();
  }

  /**
   * Closes the Assets popover by clicking somewhere clearly outside its
   * bounds (the dialog heading). Two earlier approaches both proved
   * unreliable in practice: re-clicking the trigger button, and pressing
   * Escape - your own recorded session also needed an extra "click
   * somewhere else" after the trigger click before the popover actually
   * closed, which is what this now does directly. Not swallowing the wait
   * error anymore: if this stops working, you want a clear failure here
   * rather than a confusing one three steps later.
   */
  async closeAssetsDropdown() {
    await this.assignAssetsModalHeading.click();
    await this.dropdownPanel.waitFor({ state: 'hidden', timeout: 5000 });
  }

  /** Opens the Assets dropdown and clicks each option matching the given exact labels. */
  async selectAssets(assetLabels: string[]) {
    await this.openAssetsDropdown();
    for (const label of assetLabels) {
      await this.page.getByRole('button', { name: label, exact: true }).click();
    }
    await this.closeAssetsDropdown();
  }

  /**
   * Opens the Assets dropdown, clicks the first `count` options listed, and
   * returns their label texts. Avoids depending on specific asset codes that
   * may already be assigned (and therefore unavailable) by the time a test
   * runs.
   *
   * Bug fixed here (same root cause as selectFirstAvailableEmployee): this
   * used to query all buttons in the dialog and skip only index 0, but the
   * Employee trigger AND the Assets trigger both precede the real options in
   * that list - so index 1 was the Assets trigger itself, not the first
   * asset. Clicking it just toggled the dropdown, selected nothing, and the
   * loop had no way to detect that. Scoping to `dropdownPanel` (the actual
   * open popover, which only ever contains real options) fixes this.
   */
  async selectFirstAvailableAssets(count: number): Promise<string[]> {
    await this.openAssetsDropdown();
    const labels: string[] = [];
    const options = this.dropdownPanel.getByRole('button');

    for (let i = 0; i < count; i++) {
      // Re-scan every iteration and skip anything already picked this
      // session, in case the app keeps selected options in the list
      // (marked selected) rather than removing them.
      const total = await options.count();
      let picked = false;
      for (let idx = 0; idx < total; idx++) {
        const candidate = options.nth(idx);
        const text = (await candidate.textContent())?.trim() ?? '';
        if (text && !labels.includes(text)) {
          labels.push(text);
          // Retried: seen intermittently hanging mid-click on Firefox only
          // (all actionability pre-checks passed, then the click itself
          // stalled) - looked like a one-off React re-render race, not a
          // wrong locator, so a retry rather than a longer fixed wait.
          try {
            await candidate.click({ timeout: 8000 });
          } catch {
            await candidate.click({ timeout: 8000 });
          }
          picked = true;
          break;
        }
      }
      if (!picked) {
        throw new Error(`Could not find ${count - i} more distinct, unselected asset option(s) to pick`);
      }
    }

    await this.closeAssetsDropdown();
    return labels;
  }

  /** Toggles a single already-selected asset off by clicking it again in the dropdown. */
  async deselectAsset(assetLabel: string) {
    await this.openAssetsDropdown();
    await this.page.getByRole('button', { name: assetLabel, exact: true }).click();
    await this.closeAssetsDropdown();
  }

  async fillRemarks(text: string) {
    await this.remarksInput.fill(text);
  }

  async submitAssign() {
    await this.assignSubmitButton.click();
  }

  async cancelAssignForm() {
    await this.assignCancelButton.click();
  }

  /**
   * Finds the assignment row for the given employee name and clicks its
   * "Return" (circular-arrow/undo) action - the last icon button in the
   * Actions column per the screenshot - to un-assign the asset. Cleanup for
   * tests that create a real assignment, so the asset becomes available
   * again for later runs instead of permanently leaving the pool.
   *
   * Bug fixed here: this used to scan whatever page of the (paginated) list
   * happened to be showing, so a freshly created assignment landing on any
   * page other than the current one meant the row locator waited forever
   * for a row that was real but off-screen. Searching first guarantees the
   * row is on the only/first page of results before we look for it.
   *
   * ASSUMPTION: no confirmation dialog appears on return; if your app shows
   * one, add a confirm click here.
   */
  async returnAssignmentByEmployee(employeeName: string) {
    // employeeName is the dropdown option's full label, e.g.
    // "Atharva Dimble (15454)". The search box and the row's own text
    // match against the name/ID as actually stored in the data, not this
    // combined "Name (ID)" display string - searching the literal string
    // with parentheses returned zero results, so the row never appeared
    // and this waited forever for a row that was never coming. Strip the
    // "(ID)" suffix and search/match on the name alone instead.
    const nameOnly = employeeName.replace(/\s*\(\d+\)\s*$/, '').trim();
    await this.search(nameOnly);
    const escaped = nameOnly.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const row = this.page.getByRole('row', { name: new RegExp(escaped) });
    await row.getByRole('button').last().click();

    // Bug fixed here: the click above was reported as succeeding, but the
    // assignment count never actually decreased - it compounded by +1 on
    // every run (84→85, 85→86, 86→87...), meaning the return action needs
    // a confirmation step we weren't handling, same pattern as the Delete
    // confirmation on the Asset Types module. Confirm one if it appears.
    // ASSUMPTION: button text is one of Return/Confirm/Yes - I don't know
    // the exact wording. Tell me the real text and I'll assert on it
    // directly instead of this guess-and-match regex.
    const confirmDialog = this.page.getByRole('dialog');
    if (await confirmDialog.isVisible({ timeout: 3000 }).catch(() => false)) {
      const confirmButton = confirmDialog.getByRole('button', { name: /return|confirm|yes/i }).last();
      await confirmButton.click();
    }

    await this.clearSearch();
  }
}