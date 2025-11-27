import { createContext, useContext, ReactNode } from "react";

export type PermissionAction = "view" | "create" | "edit" | "delete" | "export" | "import" | "print";
export type PermissionModule = 
  | "Business Overview"
  | "Customer Analytics"
  | "Leads"
  | "Quotations"
  | "Proforma Invoices"
  | "Invoices"
  | "Receipts"
  | "Payment Tracking"
  | "Debtors"
  | "Ledger"
  | "Credit Management"
  | "Payment Analytics"
  | "Action Center"
  | "Daily Dashboard"
  | "Task Manager"
  | "Call Queue"
  | "Activity Logs"
  | "Team Performance"
  | "Leaderboard"
  | "Daily Targets"
  | "Notification Center"
  | "Risk & Recovery"
  | "Risk Management - Client Risk Thermometer"
  | "Risk Management - Payment Risk Forecaster"
  | "Risk Management - Recovery Health Test"
  | "Credit Control"
  | "Category Management"
  | "Follow-up Rules"
  | "Category Calculation"
  | "Urgent Actions"
  | "Follow-up Automation"
  | "Masters"
  | "Masters - Customers"
  | "Masters - Items"
  | "Masters - Banks"
  | "Masters - Voucher Types"
  | "Customers"
  | "Items"
  | "Banks"
  | "Voucher Types"
  | "Company Profile"
  | "Settings"
  | "User Management"
  | "Roles Management"
  | "Smart Collection Scheduler"
  | "Backup & Restore"
  | "Audit Logs"
  | "Email/WhatsApp/Call Integrations"
  | "Reports";

interface PermissionContextType {
  permissions: string[];
  hasPermission: (module: PermissionModule, action: PermissionAction) => boolean;
  hasAnyPermission: (checks: Array<{ module: PermissionModule; action: PermissionAction }>) => boolean;
}

const PermissionContext = createContext<PermissionContextType>({
  permissions: [],
  hasPermission: () => false,
  hasAnyPermission: () => false,
});

function formatPermission(module: PermissionModule, action: PermissionAction): string {
  return `${module} - ${action.charAt(0).toUpperCase() + action.slice(1)}`;
}

export function PermissionProvider({ 
  children, 
  permissions = [] 
}: { 
  children: ReactNode; 
  permissions: string[] 
}) {
  const hasPermission = (module: PermissionModule, action: PermissionAction): boolean => {
    const permissionString = formatPermission(module, action);
    return permissions.includes(permissionString);
  };

  const hasAnyPermission = (checks: Array<{ module: PermissionModule; action: PermissionAction }>): boolean => {
    return checks.some(({ module, action }) => hasPermission(module, action));
  };

  return (
    <PermissionContext.Provider value={{ permissions, hasPermission, hasAnyPermission }}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error("usePermissions must be used within a PermissionProvider");
  }
  return context;
}
