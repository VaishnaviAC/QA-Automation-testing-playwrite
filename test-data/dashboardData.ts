/// <reference types="node" />
/**
 * Test data specific to the Dashboard suite (used by tests/dashboard.spec.ts).
 *
 * Login credentials aren't duplicated here — the dashboard tests need to
 * log in only as a precondition, so they import the same validUser from
 * loginData.ts. This way, if the password ever changes, it only needs to
 * be updated in one place (loginData.ts), not in every file that logs in.
 */

import { loginData } from './loginData';

export const dashboardData = {
  // Reuse the same admin login used across the whole suite
  loginUser: loginData.validUser,

  // Card labels shown on the Dashboard, exactly as they appear in the UI —
  // used with DashboardPage.cardLabel() / cardCount()
  cardLabels: {
    totalAssets: 'Total Assets',
    available: 'Available',
    assigned: 'Assigned',
    maintenance: 'Maintenance',
    employees: 'Employees',
    activeAssignments: 'Active Assignments',
  },

  // Status filter option names on the Assets page,
  // used with AssetsPage.filterByStatus()
  assetStatusFilters: {
    available: 'Available',
    assigned: 'Assigned',
    maintenance: 'Maintenance',
  },

  // Number of entries shown in the "Recent Activity" section,
  // used in TC_DASH_007
  recentActivityEntryCount: 6,
};
