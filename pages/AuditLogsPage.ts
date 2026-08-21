import { type Page, type Locator, expect } from '@playwright/test';
import { DEFAULT_FILTER_LABEL } from '../test-data/auditlogsData';

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

    // ---------------------------------------------------------------------
    // New locators (Login / Search / Export / Filter / Pagination). Added
    // below the existing upload-file-related code, which is left untouched
    // above. All locators below were confirmed against a real recorded
    // Playwright trace of the app (not guessed from the screenshot alone).
    // ---------------------------------------------------------------------

    // -- Sidebar navigation --
    this.auditLogsSidebarLink = page.getByRole('link', { name: 'Audit Logs', exact: true });

    // -- Search --
    // Confirmed locator (accessible name is the placeholder text, matched
    // as a non-exact/substring match by default so the truncated string works).
    this.searchInput = page.getByRole('textbox', { name: 'Search by Action, Entity,' });

    // -- Export --
    this.exportButton = page.getByRole('button', { name: 'Export' });

    // -- Pagination --
    // FIX: the previous locators used `.or()`, which in Playwright means
    // "match either" (a union of both locators), NOT "try this, then fall
    // back to that". That caused a strict-mode violation because the
    // regex /previous|prev/i and the generic `button:has(svg)` locator
    // BOTH matched real buttons on the page (e.g. "Collapse sidebar" also
    // has an svg icon), returning 2+ elements for a single locator.
    // Confirmed via a real failure trace: the actual buttons have
    // aria-label="Previous page" / "Next page", so we match on those
    // exact accessible names instead.
    this.prevPageButton = page.getByRole('button', { name: 'Previous page', exact: true });
    this.nextPageButton = page.getByRole('button', { name: 'Next page', exact: true });
    this.pageIndicatorText = page.getByText(/^\d+\s*\/\s*\d+$/);
    this.resultsCountText = page.getByText(/^Audit logs: /);

    // -- Table headers --
    // Confirmed from the recorded trace: headers expose an accessible
    // `columnheader` role (e.g. getByRole('columnheader', { name: 'Action' })).
    this.tableColumnHeaders = page.getByRole('columnheader');
  }

  // -------------------------------------------------------------------
  // New locator declarations
  // -------------------------------------------------------------------
  readonly auditLogsSidebarLink: Locator;
  readonly searchInput: Locator;
  readonly exportButton: Locator;
  readonly prevPageButton: Locator;
  readonly nextPageButton: Locator;
  readonly pageIndicatorText: Locator;
  readonly resultsCountText: Locator;
  readonly tableColumnHeaders: Locator;

  /**
   * The filter dropdown is implemented as a plain `button` whose accessible
   * name equals whichever label is currently selected — "All Actions" by
   * default, or the Title-Case action name (e.g. "Assign") once a filter is
   * applied. Because the trigger's own name changes, we track the currently
   * selected label internally rather than relying on one fixed locator.
   */
  private currentFilterLabel: string = DEFAULT_FILTER_LABEL;

  async goto() {
    await this.page.goto('/audit-logs');
  }

  async reload() {
    await this.page.reload();
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

  // =====================================================================
  // NEW CODE — Login / Search / Export / Filter dropdown / Pagination /
  // row data. Everything below is new; nothing above this line was modified.
  // =====================================================================

  /** Column order in the table, left to right. */
  private static readonly COLUMNS = [
    'time',
    'actor',
    'role',
    'action',
    'entity',
    'description',
  ] as const;

  /** Column order in the EXPORTED .xlsx file, left to right. Confirmed
   * against a real downloaded file: the export omits the "Role" column
   * entirely. */
  private static readonly EXPORT_COLUMNS = [
    'time',
    'actor',
    'action',
    'entity',
    'description',
  ] as const;

  // -------------------------- Row data ------------------------------------

  /** Returns a specific column cell locator for a given row index. */
  private rowCell(rowIndex: number, columnIndex: number): Locator {
    return this.tableRows.nth(rowIndex).locator('td').nth(columnIndex);
  }

  /** Returns all column values for a single row as a plain object. */
  async getRowData(rowIndex: number): Promise<Record<(typeof AuditLogsPage.COLUMNS)[number], string>> {
    const row = this.tableRows.nth(rowIndex);
    await expect(row).toBeVisible();

    const cells = row.locator('td');
    const values = await cells.allTextContents();

    const data = {} as Record<(typeof AuditLogsPage.COLUMNS)[number], string>;
    AuditLogsPage.COLUMNS.forEach((col, i) => {
      data[col] = (values[i] ?? '').trim();
    });
    return data;
  }

  /** Returns row data for every currently rendered row (i.e. current page / current filter result). */
  async getAllVisibleRowsData() {
    const count = await this.tableRows.count();
    const rows = [];
    for (let i = 0; i < count; i++) {
      rows.push(await this.getRowData(i));
    }
    return rows;
  }

  async getVisibleRowCount(): Promise<number> {
    return this.tableRows.count();
  }

  /** Maps a raw exported row (array of cell strings) to a plain object,
   * using EXPORT_COLUMNS — NOT the on-screen COLUMNS — since the export
   * has one fewer column (no Role). */
  mapExportedRow(row: string[]): Record<(typeof AuditLogsPage.EXPORT_COLUMNS)[number], string> {
    const data = {} as Record<(typeof AuditLogsPage.EXPORT_COLUMNS)[number], string>;
    AuditLogsPage.EXPORT_COLUMNS.forEach((col, i) => {
      data[col] = (row[i] ?? '').toString().trim();
    });
    return data;
  }

  // ---------------------------- Search --------------------------------

  /**
   * Fills the search box and presses Enter to apply — confirmed required by
   * the recorded trace. Also waits briefly for the filtered result set to
   * settle: the app appears to debounce/fetch after Enter, and reading the
   * table immediately can return the previous (stale) result set.
   */
  async search(term: string) {
    await this.searchInput.fill(term);
    await this.searchInput.press('Enter');
    await this.page.waitForTimeout(600);
  }

  async clearSearch() {
    await this.searchInput.fill('');
    await this.searchInput.press('Enter');
    await this.page.waitForTimeout(600);
  }

  /** Returns the search box's current value — used to confirm typed text persists until cleared. */
  async getSearchInputValue(): Promise<string> {
    return this.searchInput.inputValue();
  }

  /** Returns the placeholder attribute — used to assert the exact placeholder copy. */
  async getSearchPlaceholder(): Promise<string | null> {
    return this.searchInput.getAttribute('placeholder');
  }

  /** Presses Enter while the search box is already empty (distinct from clearSearch, which first fills ''). */
  async pressEnterOnEmptySearch() {
    await this.searchInput.fill('');
    await this.searchInput.press('Enter');
    await this.page.waitForTimeout(600);
  }

  // ---------------------------- Results count --------------------------

  /** Returns the raw "Audit logs: X-Y of Z" text. */
  async getResultsCountText(): Promise<string> {
    return (await this.resultsCountText.textContent())?.trim() ?? '';
  }

  /** Parses "Audit logs: X-Y of Z" into numeric parts. Returns null if the
   * results-count text isn't present at all (e.g. genuinely empty state
   * where the app hides the footer instead of showing "0"). */
  async getResultsCountParts(): Promise<{ from: number; to: number; total: number } | null> {
    const text = await this.getResultsCountText();
    const match = text.match(/Audit logs:\s*(\d+)-(\d+)\s*of\s*(\d+)/i);
    if (!match) return null;
    return { from: Number(match[1]), to: Number(match[2]), total: Number(match[3]) };
  }

  // ---------------------------- Table headers ---------------------------

  /** Returns the visible text of every column header, in DOM order. */
  async getColumnHeaderTexts(): Promise<string[]> {
    return (await this.tableColumnHeaders.allTextContents()).map((t) => t.trim());
  }

  // ---------------------------- Filter dropdown -------------------------

  /**
   * The dropdown trigger is a `button` whose accessible name equals the
   * currently selected label — "All Actions" or a Title-Case action name.
   */
  private filterTrigger(): Locator {
    return this.page.getByRole('button', { name: this.currentFilterLabel, exact: true });
  }

  async openFilterDropdown() {
    await this.filterTrigger().click();
  }

  /**
   * Selects a filter option. Pass the Title-Case label as shown in
   * FILTER_OPTIONS (e.g. "Assign", "Login", "All Actions").
   *
   * Confirmed from the recorded trace: list items render their text
   * lowercased (CSS text-transform), so we match on the lowercased string.
   * "All Actions" is the one exception — it is not an action value, so it
   * keeps its original casing both as the default trigger label and as the
   * "reset" option in the list.
   */
  async selectFilter(label: string) {
    await this.openFilterDropdown();

    const optionName = label === DEFAULT_FILTER_LABEL ? label : label.toLowerCase();
    await this.page.getByRole('button', { name: optionName, exact: true }).click();

    this.currentFilterLabel = label;
    // Confirms the trigger now reflects the new selection.
    await expect(this.filterTrigger()).toBeVisible();
    // Give the filtered table data a moment to settle before it's read.
    await this.page.waitForTimeout(400);
  }

  getSelectedFilterLabel(): string {
    return this.currentFilterLabel;
  }

  /** Checks whether a given option is present in the currently OPEN dropdown list. */
  async isFilterOptionVisible(label: string): Promise<boolean> {
    const optionName = label === DEFAULT_FILTER_LABEL ? label : label.toLowerCase();
    const matches = this.page.getByRole('button', { name: optionName, exact: true });
    // Bug fixed here: when the currently selected filter's label equals the
    // option being checked (e.g. checking "All Actions" while "All Actions"
    // is still selected), this matches BOTH the trigger button AND the
    // highlighted "currently selected" item in the open list - confirmed by
    // a real failure trace showing exactly these two elements. The trigger
    // always renders before the popover content in the DOM, so .last()
    // reliably targets the actual list option, not the trigger. For options
    // that don't equal the current selection there's only one match anyway,
    // so .last() is a safe no-op in that case.
    return matches.last().isVisible();
  }

  // ---------------------------- Export ----------------------------------

  /** Clicks Export and waits for the download to start; returns the Download object. */
  async exportAndGetDownload() {
    const [download] = await Promise.all([
      this.page.waitForEvent('download'),
      this.exportButton.click(),
    ]);
    return download;
  }

  // ---------------------------- Pagination --------------------------------

  async goToNextPage() {
    await this.nextPageButton.click();
    await this.page.waitForTimeout(300);
  }

  async goToPreviousPage() {
    await this.prevPageButton.click();
    await this.page.waitForTimeout(300);
  }

  async isNextPageDisabled(): Promise<boolean> {
    return this.nextPageButton.isDisabled();
  }

  async isPreviousPageDisabled(): Promise<boolean> {
    return this.prevPageButton.isDisabled();
  }

  async getPageIndicatorText(): Promise<string> {
    return (await this.pageIndicatorText.textContent())?.trim() ?? '';
  }
}