import { PermissionModule } from "@/hooks/use-permissions";

// Route configuration with permission requirements
interface RouteConfig {
  path: string;
  module: string;
  permissionModule?: PermissionModule;
}

// All available routes with their permission requirements
const ROUTE_CONFIGS: RouteConfig[] = [
  { path: "/dashboard", module: "Business Overview", permissionModule: "Business Overview" },
  { path: "/customer-analytics", module: "Customer Analytics", permissionModule: "Customer Analytics" },
  { path: "/leads", module: "Leads", permissionModule: "Leads" },
  { path: "/quotations", module: "Quotations", permissionModule: "Quotations" },
  { path: "/proforma-invoices", module: "Proforma Invoices", permissionModule: "Proforma Invoices" },
  { path: "/invoices", module: "Invoices", permissionModule: "Invoices" },
  { path: "/receipts", module: "Receipts", permissionModule: "Receipts" },
  { path: "/debtors", module: "Debtors", permissionModule: "Debtors" },
  { path: "/ledger", module: "Ledger", permissionModule: "Ledger" },
  { path: "/action-center/dashboard", module: "Action Center", permissionModule: "Action Center" },
  { path: "/team/leaderboard", module: "Team Performance", permissionModule: "Team Performance" },
  { path: "/credit-control/category-rules", module: "Credit Control", permissionModule: "Credit Control" },
  { path: "/masters/customers", module: "Masters - Customers", permissionModule: "Masters - Customers" },
  { path: "/masters/items", module: "Masters - Items", permissionModule: "Masters - Items" },
  { path: "/company-settings", module: "Company Profile", permissionModule: "Company Profile" },
  { path: "/settings/users", module: "User Management", permissionModule: "User Management" },
  { path: "/settings/roles", module: "Roles Management", permissionModule: "Roles Management" },
  { path: "/communication-schedules", module: "Smart Collection Scheduler", permissionModule: "Settings" },
];

/**
 * Gets the first accessible route based on user permissions
 * Returns the first route where user has VIEW permission
 * Falls back to /dashboard if no permissions found
 */
export function getFirstAccessibleRoute(permissions: string[]): string {
  // Check if user has Business Overview permission first
  if (permissions.includes("Business Overview - View")) {
    return "/dashboard";
  }

  // Find first route with VIEW permission
  for (const route of ROUTE_CONFIGS) {
    if (route.permissionModule) {
      const requiredPermission = `${route.permissionModule} - View`;
      if (permissions.includes(requiredPermission)) {
        return route.path;
      }
    }
  }

  // Fallback to dashboard
  return "/dashboard";
}

/**
 * Checks if user has access to Business Overview module
 */
export function hasBusinessOverviewAccess(permissions: string[]): boolean {
  return permissions.includes("Business Overview - View");
}
