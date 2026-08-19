/**
 * Test data for Employees page automation (employees.spec.ts).
 * Keep environment / credential values out of source control in real
 * projects — pull them from .env or a config file instead.
 */

export const loginCredentials = {
  baseUrl: 'http://192.168.10.45:4030/login',
  email: 'vaishnavi.patil@accurateic.in',
  password: 'Password@123',
};

export const employeeSearch = {
  validName: 'atharva dimble',
  partialName: 'aadi',
  validEmployeeId: '15453',
  invalidEmployeeId: '15455',
  divisionKeyword: 'AI',
  nonExistentName: 'zzzznotarealemployee',
  specialCharacters: '@#%&*',
  scriptInjection: '<script>alert(1)</script>',
  sqlInjection: "' OR 1=1--",
  emptyQuery: '',
};

export const filterOptions = {
  all: 'All Employees',
  active: 'Active Employees',
  inactive: 'Inactive Employees',
} as const;

export const messages = {
  fetchConfirmation: 'Fetched from Surveillance',
  noRecordsFound: 'No records found',
};

export const activeStatusValues = {
  active: 'Yes',
  inactive: 'No',
} as const;