/**
 * Shared permission constants for Admin role auto-provisioning
 * Centralized to avoid duplication and drift across codebase
 */

export const ALL_DASHBOARD_CARDS = [
  "Total Revenue",
  "Total Collections",
  "Total Outstanding",
  "Total Opening Balance",
  "Upcoming Invoices",
  "Due Today",
  "In Grace",
  "Overdue",
  "Tomorrow",
  "This Week",
  "This Month",
  "No Follow-Up",
  "Paid On Time",
  "Paid Late",
  "Outstanding by Category",
  "Top 5 Customers by Revenue",
  "Top 5 Customers by Outstanding",
  "Overdue Invoices",
  "Recent Invoices",
  "Recent Receipts",
  "Customer Analytics",
  "Alpha",
  "Beta",
  "Gamma",
  "Delta",
  "High Risk",
  "Medium Risk",
  "Low Risk",
  "Pending Tasks",
  "Overdue Tasks",
  "Priority Customers",
  "Collection Progress",
] as const;

export const ALL_ACTION_PERMISSIONS = {
  canViewGP: true,
  canSendEmail: true,
  canSendWhatsApp: true,
  canSendSMS: true,
  canTriggerCall: true,
  canSendReminder: true,
  canShareDocuments: true,
} as const;

/**
 * Helper function to get full Admin role permissions set
 */
export function getFullAdminPermissions() {
  return {
    allowedDashboardCards: [...ALL_DASHBOARD_CARDS],
    ...ALL_ACTION_PERMISSIONS,
  };
}
