import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as XLSX from 'xlsx'; // npm i -D xlsx  (used only to verify exported file content)
import { AuditLogsPage } from '../pages/AuditLogsPage';
import {
  DEFAULT_FILTER_LABEL,
  FILTER_OPTIONS,
  SPECIFIC_FILTER_OPTIONS,
  TABLE_COLUMN_HEADERS,
  EXPORT_COLUMN_HEADERS,
  SEARCH_TEST_CASES,
  ACTION_KEYWORD_SEARCH_TERMS,
  NO_MATCH_SEARCH_TERM,
  EXPECTED_EXPORT_FILE_EXTENSION,
  SEARCH_PLACEHOLDER_SUBSTRING,
} from '../test-data/auditlogsData';

/** Reads a downloaded .xlsx Download object and returns rows as arrays of cell strings (header row included). */
async function readXlsxRows(downloadPath: string): Promise<string[][]> {
  const buffer = fs.readFileSync(downloadPath);
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json<string[]>(firstSheet, { header: 1, defval: '' });
}

test.describe('Audit Logs page', () => {
  let auditLogsPage: AuditLogsPage;

  // Auth happens ONCE, outside this file, via auth.setup.ts (a Playwright
  // "setup" project — see playwright.config.ts). Its saved storageState is
  // reused for every test's browser context, so we land here already
  // logged in and just need to open the page.
  test.beforeEach(async ({ page }) => {
    auditLogsPage = new AuditLogsPage(page);
    await auditLogsPage.goto();
    await expect(auditLogsPage.heading).toBeVisible();
  });

  // ===================================================================
  // 1. SEARCH BAR
  // ===================================================================
  test.describe('Search bar', () => {
    for (const tc of SEARCH_TEST_CASES) {
      test(`${tc.id} - search by ${tc.fieldLabel} filters rows correctly`, async () => {
        await auditLogsPage.search(tc.term);

        const rows = await auditLogsPage.getAllVisibleRowsData();
        expect(rows.length).toBeGreaterThan(0);

        for (const row of rows) {
          expect(row[tc.expectedColumn].toLowerCase()).toContain(tc.term.toLowerCase());
        }
      });
    }

    // NOTE: 'login' appears both here and as SR-01's term. Not a duplicate -
    // SR-01 asserts the term appears specifically in the Action column;
    // this loop asserts the app's search is a GLOBAL match across all
    // columns (a real, previously-confirmed behavior of this app - see
    // SR docstring above). Same input, deliberately different claims.
    for (const term of ACTION_KEYWORD_SEARCH_TERMS) {
      test(`SR - search action keyword "${term}" returns rows matching somewhere in the row`, async () => {
        await auditLogsPage.search(term);

        const rows = await auditLogsPage.getAllVisibleRowsData();
        expect(rows.length).toBeGreaterThan(0);

        // The search box is confirmed to be a GLOBAL search across Action,
        // Entity, Description, Actor, and Role together — NOT an
        // Action-only filter. A result can legitimately match on a
        // different column (e.g. term "import" matching an Entity name)
        // while its Action is something else entirely. So every returned
        // row must match the term SOMEWHERE, not specifically in Action.
        const lowerTerm = term.toLowerCase();
        for (const row of rows) {
          const matchesAnyColumn =
            row.action.toLowerCase().includes(lowerTerm) ||
            row.entity.toLowerCase().includes(lowerTerm) ||
            row.description.toLowerCase().includes(lowerTerm) ||
            row.actor.toLowerCase().includes(lowerTerm) ||
            row.role.toLowerCase().includes(lowerTerm);

          expect(matchesAnyColumn).toBe(true);
        }
      });
    }

    test('SR-07 - search is case-insensitive', async () => {
      await auditLogsPage.search('login');
      const lower = await auditLogsPage.getAllVisibleRowsData();

      await auditLogsPage.clearSearch();

      await auditLogsPage.search('LOGIN');
      const upper = await auditLogsPage.getAllVisibleRowsData();

      expect(upper.map((r) => r.description)).toEqual(lower.map((r) => r.description));
    });

    test('SR-08 - search with no matches shows empty state', async () => {
      await auditLogsPage.search(NO_MATCH_SEARCH_TERM);

      // The table can render a single "no results" placeholder <tr> for the
      // empty state, which would still count as 1 raw row — so the
      // results-count footer text ("Audit logs: X-Y of Z") is the
      // authoritative source of the actual total. If it's absent entirely
      // (app hides the footer on empty state), that's also a valid zero signal.
      const counts = await auditLogsPage.getResultsCountParts();
      expect(counts === null || counts.total === 0).toBe(true);
    });

    test('SR-09 - leading/trailing whitespace is ignored', async () => {
      await auditLogsPage.search('login');
      const trimmed = await auditLogsPage.getAllVisibleRowsData();

      await auditLogsPage.clearSearch();

      await auditLogsPage.search('   login   ');
      const padded = await auditLogsPage.getAllVisibleRowsData();

      expect(padded.map((r) => r.description)).toEqual(trimmed.map((r) => r.description));
    });

    test('SR-10 - searching a full description string returns the exact matching row', async () => {
      const firstRow = await auditLogsPage.getRowData(0);
      await auditLogsPage.search(firstRow.description);

      const rows = await auditLogsPage.getAllVisibleRowsData();
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.some((r) => r.description === firstRow.description)).toBe(true);
    });

    // NOTE: SR-11 and SR-21 look similar (both end up comparing a total
    // count back to baseline) but exercise different starting states -
    // SR-11 clears an ACTIVE search, SR-21 presses Enter when the box was
    // NEVER touched. Kept separate: SR-21 is really testing that a no-op
    // Enter-press doesn't accidentally break/reset anything, which SR-11's
    // "clear an active filter" scenario doesn't exercise at all.
    test('SR-11 - clearing the search restores the full list', async () => {
      const before = await auditLogsPage.getResultsCountParts();

      await auditLogsPage.search('login');
      await auditLogsPage.clearSearch();

      const after = await auditLogsPage.getResultsCountParts();
      expect(after?.total).toBe(before?.total);
    });

    test('SR-13 - search combined with a dropdown filter applies both conditions', async () => {
      await auditLogsPage.selectFilter('Returned');
      await auditLogsPage.search('Dell Latitude');

      const rows = await auditLogsPage.getAllVisibleRowsData();
      expect(rows.length).toBeGreaterThan(0);

      for (const row of rows) {
        // The table's Action cell renders lowercase ("returned"), not
        // Title Case like the dropdown trigger ("Returned") — compare
        // case-insensitively.
        expect(row.action.toLowerCase()).toBe('returned');
        expect(row.description.toLowerCase()).toContain('dell latitude');
      }
    });

    test('SR-14 - results count text updates to reflect the filtered total', async () => {
      const full = await auditLogsPage.getResultsCountParts();

      await auditLogsPage.search('login');
      const filtered = await auditLogsPage.getResultsCountParts();

      expect(filtered?.total).toBeLessThan(full!.total);
    });

    test('SR-20 - search box placeholder text is correct', async () => {
      const placeholder = await auditLogsPage.getSearchPlaceholder();
      expect(placeholder ?? '').toContain(SEARCH_PLACEHOLDER_SUBSTRING);
    });

    test('SR-21 - pressing Enter on an already-empty search box shows all records', async () => {
      const before = await auditLogsPage.getResultsCountParts();

      await auditLogsPage.pressEnterOnEmptySearch();

      const after = await auditLogsPage.getResultsCountParts();
      expect(after?.total).toBe(before?.total);
    });

    test('SR-22 - typed search text persists in the input until explicitly cleared', async () => {
      await auditLogsPage.search('login');
      expect(await auditLogsPage.getSearchInputValue()).toBe('login');

      await auditLogsPage.clearSearch();
      expect(await auditLogsPage.getSearchInputValue()).toBe('');
    });

    test('SR-24 - applying a search resets pagination to page 1', async () => {
      await auditLogsPage.goToNextPage(); // move off page 1 first

      await auditLogsPage.search('login');

      const counts = await auditLogsPage.getResultsCountParts();
      expect(counts?.from).toBe(1);
    });
  });

  // ===================================================================
  // 2. EXPORT
  // ===================================================================
  test.describe('Export', () => {
    test('EX-01 / EX-02 / EX-03 - export with no filters downloads a well-formed .xlsx file matching the on-screen total', async () => {
      // Merged from two separate tests that each triggered an identical
      // unfiltered export just to check a different property of the same
      // file - same setup, same real download, redundant. Combined here so
      // the export only runs once while still covering both properties.
      const counts = await auditLogsPage.getResultsCountParts();
      const download = await auditLogsPage.exportAndGetDownload();

      expect(download.suggestedFilename().toLowerCase()).toContain(
        EXPECTED_EXPORT_FILE_EXTENSION
      );

      const path = await download.path();
      expect(path).toBeTruthy();

      const rows = await readXlsxRows(path!);
      expect(rows.length).toBeGreaterThan(1); // header + at least 1 data row
      // The exported file has NO "Role" column — use EXPORT_COLUMN_HEADERS,
      // not the on-screen TABLE_COLUMN_HEADERS, which includes Role.
      expect(rows[0].map((h) => h.toString().trim())).toEqual(
        expect.arrayContaining([...EXPORT_COLUMN_HEADERS])
      );

      const dataRowCount = rows.length - 1; // minus header
      expect(dataRowCount).toBe(counts?.total);
    });

    test('EX-04 - export after a search only contains matching rows', async () => {
      await auditLogsPage.search('login');

      const download = await auditLogsPage.exportAndGetDownload();
      const path = await download.path();
      const exportedRows = (await readXlsxRows(path!))
        .slice(1) // drop header
        .map((r) => auditLogsPage.mapExportedRow(r));

      const counts = await auditLogsPage.getResultsCountParts();
      expect(exportedRows.length).toBe(counts?.total);

      for (const row of exportedRows) {
        expect(row.action.toLowerCase()).toContain('login');
      }
    });

    test('EX-05 - export after a dropdown filter only contains matching rows', async () => {
      await auditLogsPage.selectFilter('Assigned');

      const download = await auditLogsPage.exportAndGetDownload();
      const path = await download.path();
      const exportedRows = (await readXlsxRows(path!))
        .slice(1)
        .map((r) => auditLogsPage.mapExportedRow(r));

      const counts = await auditLogsPage.getResultsCountParts();
      expect(exportedRows.length).toBe(counts?.total);

      for (const row of exportedRows) {
        expect(row.action.toLowerCase()).toBe('assigned');
      }
    });

    test('EX-06 - export after combined search + dropdown filter', async () => {
      await auditLogsPage.selectFilter('Returned');
      await auditLogsPage.search('Dell Latitude');

      const download = await auditLogsPage.exportAndGetDownload();
      const path = await download.path();
      const exportedRows = (await readXlsxRows(path!))
        .slice(1)
        .map((r) => auditLogsPage.mapExportedRow(r));

      expect(exportedRows.length).toBeGreaterThan(0);
      for (const row of exportedRows) {
        expect(row.action.toLowerCase()).toBe('returned');
        expect(row.description.toLowerCase()).toContain('dell latitude');
      }
    });

    test('EX-08 - exported row data matches the on-screen row (excluding Role and time format)', async () => {
      const firstRowOnScreen = await auditLogsPage.getRowData(0);

      const download = await auditLogsPage.exportAndGetDownload();
      const path = await download.path();
      const exportedRows = await readXlsxRows(path!);
      // The export has no Role column, so that field can't be compared.
      // The export's Time cell uses a different format entirely
      // ("8/20/2026, 10:44:59 AM" vs on-screen "Aug 20, 16:14"), so an
      // exact string match on time will never hold — only assert on
      // fields represented identically in both.
      const firstExportedRow = auditLogsPage.mapExportedRow(exportedRows[1]); // row 0 is the header

      expect(firstExportedRow.actor).toBe(firstRowOnScreen.actor);
      expect(firstExportedRow.action.toLowerCase()).toBe(firstRowOnScreen.action.toLowerCase());
      expect(firstExportedRow.entity).toBe(firstRowOnScreen.entity);
      expect(firstExportedRow.description).toBe(firstRowOnScreen.description);
      // Time is present and non-empty, even though the format differs.
      expect(firstExportedRow.time.length).toBeGreaterThan(0);
    });

    test('EX-09 - Export button is visible and enabled by default', async () => {
      await expect(auditLogsPage.exportButton).toBeVisible();
      await expect(auditLogsPage.exportButton).toBeEnabled();
    });

    test('EX-10 - repeated exports each trigger an independent successful download', async () => {
      const first = await auditLogsPage.exportAndGetDownload();
      expect(await first.path()).toBeTruthy();

      const second = await auditLogsPage.exportAndGetDownload();
      expect(await second.path()).toBeTruthy();
    });

    test('EX-11 - export on a zero-result search either exports header-only or disables Export', async () => {
      await auditLogsPage.search(NO_MATCH_SEARCH_TERM);

      const isEnabled = await auditLogsPage.exportButton.isEnabled();

      if (!isEnabled) {
        // Acceptable app behavior: Export is disabled when there's nothing to export.
        expect(isEnabled).toBe(false);
        return;
      }

      const download = await auditLogsPage.exportAndGetDownload();
      const path = await download.path();
      const rows = await readXlsxRows(path!);

      // Acceptable app behavior: file downloads with header row only, no data rows.
      expect(rows.length).toBeLessThanOrEqual(1);
    });
  });

  // ===================================================================
  // 3. FILTER DROPDOWN
  // ===================================================================
  test.describe('Filter dropdown', () => {
    test('FD-01 - defaults to "All Actions" and shows all records', async () => {
      expect(auditLogsPage.getSelectedFilterLabel()).toBe(DEFAULT_FILTER_LABEL);

      const counts = await auditLogsPage.getResultsCountParts();
      expect(counts?.total).toBeGreaterThan(0);
    });

    for (const option of SPECIFIC_FILTER_OPTIONS) {
      test(`FD - selecting "${option}" shows only rows with Action = "${option}"`, async () => {
        await auditLogsPage.selectFilter(option);

        const rows = await auditLogsPage.getAllVisibleRowsData();

        // Either there is at least one row matching, or the result set is
        // legitimately empty for this action type — both are valid outcomes,
        // but every returned row must match the selected action.
        //
        // The table cell's Action text renders lowercase (e.g. "assign"),
        // while `option` is the Title-Case dropdown label (e.g. "Assign") —
        // compare case-insensitively rather than assuming matching casing.
        for (const row of rows) {
          expect(row.action.toLowerCase()).toBe(option.toLowerCase());
        }
      });
    }

    test('FD-13 - dropdown lists every expected filter option', async () => {
      await auditLogsPage.openFilterDropdown();

      for (const option of FILTER_OPTIONS) {
        expect(await auditLogsPage.isFilterOptionVisible(option)).toBe(true);
      }
    });

    test('FD-11 - reverting to "All Actions" restores the full list', async () => {
      const before = await auditLogsPage.getResultsCountParts();

      await auditLogsPage.selectFilter('Login');
      await auditLogsPage.selectFilter(DEFAULT_FILTER_LABEL);

      const after = await auditLogsPage.getResultsCountParts();
      expect(after?.total).toBe(before?.total);
    });

    test('FD-12 - results count reflects the filtered total for a specific action', async () => {
      const full = await auditLogsPage.getResultsCountParts();

      await auditLogsPage.selectFilter('Login');
      const filtered = await auditLogsPage.getResultsCountParts();

      expect(filtered?.total).toBeLessThanOrEqual(full!.total);
    });

    test('FD-14 - selecting the same filter twice is idempotent', async () => {
      await auditLogsPage.selectFilter('Login');
      const first = await auditLogsPage.getResultsCountParts();

      await auditLogsPage.selectFilter('Login');
      const second = await auditLogsPage.getResultsCountParts();

      expect(second?.total).toBe(first?.total);
    });

    test('FD-15 - selecting a new filter replaces the previous one (single-select)', async () => {
      await auditLogsPage.selectFilter('Login');
      expect(auditLogsPage.getSelectedFilterLabel()).toBe('Login');

      await auditLogsPage.selectFilter('Returned');
      expect(auditLogsPage.getSelectedFilterLabel()).toBe('Returned');
    });
  });

  // ===================================================================
  // 4. OTHER PAGE-LEVEL TEST CASES
  // ===================================================================
  test.describe('Other page-level behavior', () => {
    test('OT-01 - "Audit Logs" heading is visible', async () => {
      await expect(auditLogsPage.heading).toBeVisible();
    });

    test('OT-02 - table column headers match the expected set and order', async () => {
      const headers = await auditLogsPage.getColumnHeaderTexts();
      expect(headers).toEqual([...TABLE_COLUMN_HEADERS]);
    });

    test('OT-03 - records are sorted by time, most recent first', async () => {
      const rows = await auditLogsPage.getAllVisibleRowsData();
      expect(rows.length).toBeGreaterThan(1);

      const parseTime = (t: string) => new Date(`${t} 2026`).getTime();
      for (let i = 0; i < rows.length - 1; i++) {
        expect(parseTime(rows[i].time)).toBeGreaterThanOrEqual(parseTime(rows[i + 1].time));
      }
    });

    test('OT-05 / OT-07 - pagination: previous is disabled on page 1, next advances to page 2', async () => {
      expect(await auditLogsPage.isPreviousPageDisabled()).toBe(true);

      const firstPageRows = await auditLogsPage.getAllVisibleRowsData();

      await auditLogsPage.goToNextPage();

      const secondPageRows = await auditLogsPage.getAllVisibleRowsData();
      // Bug fixed here: comparing description alone failed because two
      // distinct log entries can legitimately share identical wording (e.g.
      // "Vaishnavi Patil logged in" happening more than once) - that's not
      // proof pagination is broken, just a false negative from too weak a
      // check. Combining time + description makes a collision far less
      // likely while still not depending on a specific unique ID column.
      const firstRowKey = `${firstPageRows[0].time}|${firstPageRows[0].description}`;
      const secondRowKey = `${secondPageRows[0].time}|${secondPageRows[0].description}`;
      expect(secondRowKey).not.toBe(firstRowKey);
      expect(await auditLogsPage.isPreviousPageDisabled()).toBe(false);
    });

    test('OT-06 - pagination: previous returns to the prior page with the same data', async () => {
      const firstPageRows = await auditLogsPage.getAllVisibleRowsData();

      await auditLogsPage.goToNextPage();
      await auditLogsPage.goToPreviousPage();

      const backOnFirstPage = await auditLogsPage.getAllVisibleRowsData();
      expect(backOnFirstPage.map((r) => r.description)).toEqual(
        firstPageRows.map((r) => r.description)
      );
    });

    test('OT-09 - footer row count matches number of rendered rows', async () => {
      const counts = await auditLogsPage.getResultsCountParts();
      const renderedCount = await auditLogsPage.getVisibleRowCount();

      expect(renderedCount).toBe((counts?.to ?? 0) - (counts?.from ?? 0) + 1);
    });

    test('OT-10 - page indicator text updates when paginating', async () => {
      const before = await auditLogsPage.getPageIndicatorText();

      await auditLogsPage.goToNextPage();

      const after = await auditLogsPage.getPageIndicatorText();
      expect(after).not.toBe(before);
    });

    test('OT-13 - a specific filter combined with pagination resets to page 1', async () => {
      await auditLogsPage.goToNextPage(); // move off page 1 first

      await auditLogsPage.selectFilter('Assigned');

      const counts = await auditLogsPage.getResultsCountParts();
      expect(counts?.from).toBe(1);
    });

    test('OT-15 - navigating via the sidebar "Audit Logs" link lands on the page', async ({ page }) => {
      // Already navigated once during login; go elsewhere and back to confirm the link itself works.
      await page.goto('/dashboard');
      await auditLogsPage.auditLogsSidebarLink.click();
      await expect(auditLogsPage.heading).toBeVisible();
    });

    test('OT-16 - refreshing the page resets filters and search to default', async () => {
      await auditLogsPage.selectFilter('Login');
      await auditLogsPage.search('login');

      await auditLogsPage.reload();
      await expect(auditLogsPage.heading).toBeVisible();

      expect(await auditLogsPage.getSearchInputValue()).toBe('');
      await expect(
        auditLogsPage.page.getByRole('button', { name: DEFAULT_FILTER_LABEL, exact: true })
      ).toBeVisible();
    });

    test('OT-17 - Description wording matches the Dashboard "Recent Activity" wording', async ({ page }) => {
      const auditDescriptions = await auditLogsPage.getFirstNDescriptions(3);

      await page.goto('/dashboard');
      await expect(page.locator('text=/Recent Activity/i').first()).toBeVisible();

      // Spot-check: at least one of the first 3 Audit Log descriptions should
      // also appear somewhere in the Dashboard's Recent Activity section text.
      const dashboardBodyText = (await page.locator('body').innerText()).toLowerCase();
      const anyMatch = auditDescriptions.some(
        (d) => d.length > 0 && dashboardBodyText.includes(d.toLowerCase())
      );
      expect(anyMatch).toBe(true);
    });
  });
});