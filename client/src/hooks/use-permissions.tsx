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
  | "Debtors"
  | "Masters - Customers"
  | "Masters - Items"
  | "Masters - Banks"
  | "Masters - Voucher Types"
  | "User Management"
  | "Roles Management"
  | "Company Profile"
  | "Credit Control"
  | "Ledger"
  | "Action Center"
  | "Team Performance"
  | "Settings";

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
