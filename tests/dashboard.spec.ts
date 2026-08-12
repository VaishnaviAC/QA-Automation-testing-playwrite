import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { AssetsPage } from '../pages/AssetsPage';
import { EmployeesPage } from '../pages/EmployeesPage';
import { AssignmentsPage } from '../pages/AssignmentsPage';
import { AuditLogsPage } from '../pages/AuditLogsPage';
import { dashboardData } from '../test-data/dashboardData';

test.describe('AssetIQ - Dashboard', () => {
  // This suite runs against a single shared admin login on a real,
  // local-network backend (not a stateless test environment). Running
  // these tests in parallel (multiple browser tabs filtering the Assets
  // list at the same time, under the same account) can cause one test's
  // filter selection to interfere with another's. Running them serially
  // avoids that cross-test interference.
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    // Login is only a precondition here, not a separate test case —
    // login itself is already covered by TC_LOGIN_002 in login.spec.ts.
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(dashboardData.loginUser.email, dashboardData.loginUser.password);
  });

  test('TC_DASH_001: Total Assets card matches the Assets module total', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    await expect(dashboardPage.cardLabel(dashboardData.cardLabels.totalAssets)).toBeVisible();

    const dashboardCountText = await dashboardPage.cardCount(dashboardData.cardLabels.totalAssets).textContent();
    const dashboardCount = parseInt(dashboardCountText ?? '0', 10);

    const assetsPage = new AssetsPage(page);
    await assetsPage.goto();

    // Always read the total from the "Assets: X-Y of Z" text via
    // getTotalCount() — never count visible rows with .count(), since
    // the list is paginated (only ~12 rows show per page) and counting
    // rows would give the page size, not the real total.
    const assetsTotal = await assetsPage.getTotalCount();

    expect(dashboardCount).toBe(assetsTotal);
  });

  test('TC_DASH_002: Available Assets card matches the Assets module (Available filter)', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    await expect(dashboardPage.cardLabel(dashboardData.cardLabels.available)).toBeVisible();

    const dashboardCountText = await dashboardPage.cardCount(dashboardData.cardLabels.available).textContent();
    const dashboardCount = parseInt(dashboardCountText ?? '0', 10);

    const assetsPage = new AssetsPage(page);
    await assetsPage.goto();
    await assetsPage.filterByStatus(dashboardData.assetStatusFilters.available);
    const availableTotal = await assetsPage.getTotalCount();

    expect(dashboardCount).toBe(availableTotal);
  });

  test('TC_DASH_003: Assigned Assets card matches the Assets module (Assigned filter)', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    await expect(dashboardPage.cardLabel(dashboardData.cardLabels.assigned)).toBeVisible();

    const dashboardCountText = await dashboardPage.cardCount(dashboardData.cardLabels.assigned).textContent();
    const dashboardCount = parseInt(dashboardCountText ?? '0', 10);

    const assetsPage = new AssetsPage(page);
    await assetsPage.goto();
    await assetsPage.filterByStatus(dashboardData.assetStatusFilters.assigned);
    const assignedTotal = await assetsPage.getTotalCount();

    expect(dashboardCount).toBe(assignedTotal);
  });

  test('TC_DASH_004: Maintenance Assets card matches the Assets module (Maintenance filter)', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    await expect(dashboardPage.cardLabel(dashboardData.cardLabels.maintenance)).toBeVisible();

    const dashboardCountText = await dashboardPage.cardCount(dashboardData.cardLabels.maintenance).textContent();
    const dashboardCount = parseInt(dashboardCountText ?? '0', 10);

    const assetsPage = new AssetsPage(page);
    await assetsPage.goto();
    await assetsPage.filterByStatus(dashboardData.assetStatusFilters.maintenance);
    const maintenanceTotal = await assetsPage.getTotalCount();

    expect(dashboardCount).toBe(maintenanceTotal);
  });

  test('TC_DASH_005: Total Employees card matches the Employees module total', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    await expect(dashboardPage.cardLabel(dashboardData.cardLabels.employees)).toBeVisible();

    const dashboardCountText = await dashboardPage.cardCount(dashboardData.cardLabels.employees).textContent();
    const dashboardCount = parseInt(dashboardCountText ?? '0', 10);

    const employeesPage = new EmployeesPage(page);
    await employeesPage.goto();
    const employeesTotal = await employeesPage.getTotalCount();

    expect(dashboardCount).toBe(employeesTotal);
  });

  test('TC_DASH_006: Active Assignments card matches the Assignments module total', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    await expect(dashboardPage.cardLabel(dashboardData.cardLabels.activeAssignments)).toBeVisible();

    const dashboardCountText = await dashboardPage.cardCount(dashboardData.cardLabels.activeAssignments).textContent();
    const dashboardCount = parseInt(dashboardCountText ?? '0', 10);

    const assignmentsPage = new AssignmentsPage(page);
    await assignmentsPage.goto();
    const assignmentsTotal = await assignmentsPage.getTotalCount();

    expect(dashboardCount).toBe(assignmentsTotal);
  });

  test('TC_DASH_007: Recent Activity shows the same latest 6 entries as Audit Logs', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);

    // No extra navigation here — beforeEach already logged in and landed
    // directly on the dashboard. Calling dashboardPage.goto() again would
    // force a full page reload, which redirected this app back to /login
    // (the session isn't preserved across a hard reload on this app).
    await expect(dashboardPage.recentActivityHeading).toBeVisible();
    await expect(dashboardPage.recentActivityTitle(0)).toBeVisible();

    // Read the title text of the first 6 Recent Activity entries on the dashboard
    const dashboardTitles = await dashboardPage.getRecentActivityTitles(dashboardData.recentActivityEntryCount);

    // Read the Description column of the first 6 rows on the Audit Logs page
    const auditLogsPage = new AuditLogsPage(page);
    await auditLogsPage.goto();
    const auditDescriptions = await auditLogsPage.getFirstNDescriptions(dashboardData.recentActivityEntryCount);

    // toEqual compares arrays element-by-element, in order — both lists
    // should read identically since both show the most recent entries first.
    expect(dashboardTitles).toEqual(auditDescriptions);
  });
});
