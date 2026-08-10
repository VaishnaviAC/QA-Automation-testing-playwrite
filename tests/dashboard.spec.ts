import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { AssetsPage } from '../pages/AssetsPage';
import { EmployeesPage } from '../pages/EmployeesPage';
import { AssignmentsPage } from '../pages/AssignmentsPage';
import { AuditLogsPage } from '../pages/AuditLogsPage';

test.describe('AssetIQ - Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login is only a precondition here, not a separate test case —
    // login itself is already covered by TC_LOGIN_002 in login.spec.ts.
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('admin@accurateic.in', '12345');
  });

  test('TC_DASH_001: Total Assets card matches the Assets module total', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    await expect(dashboardPage.cardLabel('Total Assets')).toBeVisible();

    const dashboardCountText = await dashboardPage.cardCount('Total Assets').textContent();
    const dashboardCount = parseInt(dashboardCountText ?? '0', 10);

    const assetsPage = new AssetsPage(page);
    await assetsPage.goto();
    const assetsTotal = await assetsPage.getTotalCount();

    expect(dashboardCount).toBe(assetsTotal);
  });

  test('TC_DASH_002: Available Assets card matches the Assets module (Available filter)', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    await expect(dashboardPage.cardLabel('Available')).toBeVisible();

    const dashboardCountText = await dashboardPage.cardCount('Available').textContent();
    const dashboardCount = parseInt(dashboardCountText ?? '0', 10);

    const assetsPage = new AssetsPage(page);
    await assetsPage.goto();
    await assetsPage.filterByStatus('Available');
    const availableTotal = await assetsPage.getTotalCount();

    expect(dashboardCount).toBe(availableTotal);
  });

  test('TC_DASH_003: Assigned Assets card matches the Assets module (Assigned filter)', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    await expect(dashboardPage.cardLabel('Assigned')).toBeVisible();

    const dashboardCountText = await dashboardPage.cardCount('Assigned').textContent();
    const dashboardCount = parseInt(dashboardCountText ?? '0', 10);

    const assetsPage = new AssetsPage(page);
    await assetsPage.goto();
    await assetsPage.filterByStatus('Assigned');
    const assignedTotal = await assetsPage.getTotalCount();

    expect(dashboardCount).toBe(assignedTotal);
  });

  test('TC_DASH_004: Maintenance Assets card matches the Assets module (Maintenance filter)', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    await expect(dashboardPage.cardLabel('Maintenance')).toBeVisible();

    const dashboardCountText = await dashboardPage.cardCount('Maintenance').textContent();
    const dashboardCount = parseInt(dashboardCountText ?? '0', 10);

    const assetsPage = new AssetsPage(page);
    await assetsPage.goto();
    await assetsPage.filterByStatus('Maintenance');
    const maintenanceTotal = await assetsPage.getTotalCount();

    expect(dashboardCount).toBe(maintenanceTotal);
  });

  test('TC_DASH_005: Total Employees card matches the Employees module total', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    await expect(dashboardPage.cardLabel('Employees')).toBeVisible();

    const dashboardCountText = await dashboardPage.cardCount('Employees').textContent();
    const dashboardCount = parseInt(dashboardCountText ?? '0', 10);

    const employeesPage = new EmployeesPage(page);
    await employeesPage.goto();
    const employeesTotal = await employeesPage.getTotalCount();

    expect(dashboardCount).toBe(employeesTotal);
  });

  test('TC_DASH_006: Active Assignments card matches the Assignments module total', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    await expect(dashboardPage.cardLabel('Active Assignments')).toBeVisible();

    const dashboardCountText = await dashboardPage.cardCount('Active Assignments').textContent();
    const dashboardCount = parseInt(dashboardCountText ?? '0', 10);

    const assignmentsPage = new AssignmentsPage(page);
    await assignmentsPage.goto();
    const assignmentsTotal = await assignmentsPage.getTotalCount();

    expect(dashboardCount).toBe(assignmentsTotal);
  });

test('TC_DASH_007: Recent Activity shows the same latest 6 entries as Audit Logs', async ({ page }) => {
  const dashboardPage = new DashboardPage(page);

  // beforeEach already logged in and landed directly on the dashboard —
  // no separate navigation needed here.
  await expect(dashboardPage.recentActivityHeading).toBeVisible();
  await expect(dashboardPage.recentActivityTitle(0)).toBeVisible();

  // Read the first 6 Recent Activity titles
  const dashboardTitles: string[] = [];

  for (let i = 0; i < 6; i++) {
    const text = await dashboardPage.recentActivityTitle(i).innerText();

    dashboardTitles.push(
      text.replace(/\s+/g, ' ').trim()
    );
  }

  // Navigate to Audit Logs
  const auditLogsPage = new AuditLogsPage(page);
  await auditLogsPage.goto();

  // Read the first 6 Description values
  const auditDescriptions = await auditLogsPage.getFirstNDescriptions(6);

  // Debug (optional)
  console.log('Dashboard:', dashboardTitles);
  console.log('Audit Logs:', auditDescriptions);

  // Compare both arrays
  expect(dashboardTitles).toEqual(auditDescriptions);

});
});
