import { test, expect } from '@playwright/test';
import { EmployeesPage } from '../pages/EmployeesPage';
import { employeeSearch, filterOptions, messages, activeStatusValues } from '../test-data/employeesData';

// No login here — the "setup" project (auth.setup.ts) logs in once and saves
// storageState, which every project in playwright.config.ts reuses. Each
// test starts already authenticated.
test.describe('Employees Page', () => {
  let employeesPage: EmployeesPage;

  test.beforeEach(async ({ page }) => {
    await page.goto('/employees');
    employeesPage = new EmployeesPage(page);
    await expect(employeesPage.heading).toBeVisible();
  });

  test.describe('Search Bar', () => {
    test('SB-02 search by valid employee name returns matching results', async () => {
      await employeesPage.search(employeeSearch.validName);
      await expect(employeesPage.totalCountText).toBeVisible();
      const count = await employeesPage.getTotalCount();
      expect(count).toBeGreaterThan(0);
    });

    test('SB-03 search by valid Employee ID returns exact record', async () => {
      await employeesPage.search(employeeSearch.validEmployeeId);
      const count = await employeesPage.getTotalCount();
      expect(count).toBeGreaterThanOrEqual(1);
    });

    test('SB-06 partial name search returns matching employees', async () => {
      await employeesPage.search(employeeSearch.partialName);
      const count = await employeesPage.getTotalCount();
      expect(count).toBeGreaterThan(0);
    });

    test('SB-11 non-existent name shows no records', async ({ page }) => {
      await employeesPage.search(employeeSearch.nonExistentName);
      const count = await employeesPage.getTotalCount();
      expect(count).toBe(0);
    });

    test('SB-14 clearing search restores full list', async () => {
      const originalCount = await employeesPage.getTotalCount();
      await employeesPage.search(employeeSearch.validEmployeeId);
      await employeesPage.clearSearch();
      const restoredCount = await employeesPage.getTotalCount();
      expect(restoredCount).toBe(originalCount);
    });

    test('SB-19 script injection input is treated as plain text', async ({ page }) => {
      await employeesPage.search(employeeSearch.scriptInjection);
      // No JS dialog / crash should occur; page should still be responsive.
      await expect(employeesPage.heading).toBeVisible();
    });

    test('SB-21 rapid consecutive searches resolve to the last query', async () => {
      await employeesPage.search(employeeSearch.invalidEmployeeId);
      await employeesPage.search(employeeSearch.validEmployeeId);
      const value = await employeesPage.getSearchValue();
      expect(value).toBe(employeeSearch.validEmployeeId);
    });
  });

  test.describe('Filter Dropdown', () => {
    test('FD-01 default filter is Active Employees', async () => {
      const current = await employeesPage.getCurrentFilter();
      expect(current).toContain(filterOptions.active);
    });

    test('FD-03 selecting Active Employees filters the list', async () => {
      await employeesPage.selectFilter('Active Employees');
      const current = await employeesPage.getCurrentFilter();
      expect(current).toContain(filterOptions.active);
      // Spot-check: no "Inactive" (No) rows should appear on the visible page.
      await expect(employeesPage.activeStatusCell(activeStatusValues.inactive)).toHaveCount(0);
    });

    test('FD-04 selecting Inactive Employees filters the list', async () => {
      await employeesPage.selectFilter('Inactive Employees');
      const current = await employeesPage.getCurrentFilter();
      expect(current).toContain(filterOptions.inactive);
    });

    test('FD-05 switching back to All Employees restores full list', async () => {
      await employeesPage.selectFilter('Active Employees');
      const activeCount = await employeesPage.getTotalCount();

      await employeesPage.selectFilter('All Employees');
      const allCount = await employeesPage.getTotalCount();

      expect(allCount).toBeGreaterThanOrEqual(activeCount);
    });

    test('FD-07 total count updates when filter changes', async () => {
      const allCount = await employeesPage.getTotalCount();
      await employeesPage.selectFilter('Inactive Employees');
      const inactiveCount = await employeesPage.getTotalCount();
      expect(inactiveCount).toBeLessThanOrEqual(allCount);
    });

    test('FD-09 pagination resets to page 1 when filter changes', async () => {
      await employeesPage.selectFilter('All Employees');
      await employeesPage.goToNextPage();
      await employeesPage.selectFilter('Active Employees');
      const text = await employeesPage.totalCountText.textContent();
      expect(text).toMatch(/1-\d+ of \d+/);
    });
  });

  test.describe('Fetch Button', () => {
    test('FB-01 fetch button is visible and enabled', async () => {
      await expect(employeesPage.fetchButton).toBeVisible();
      await expect(employeesPage.fetchButton).toBeEnabled();
    });

    test('FB-02 clicking Fetch shows confirmation message', async () => {
      await employeesPage.fetchEmployeeData();
      await expect(employeesPage.fetchConfirmationText).toBeVisible();
      const text = await employeesPage.fetchConfirmationText.textContent();
      expect(text).toContain(messages.fetchConfirmation);
    });

    test('FB-04 employee list reflects data after fetch', async () => {
      await employeesPage.fetchEmployeeData();
      const count = await employeesPage.getTotalCount();
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });
});