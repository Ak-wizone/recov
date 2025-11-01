import { Request, Response, NextFunction } from "express";

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

export function formatPermission(module: PermissionModule, action: PermissionAction): string {
  return `${module} - ${action.charAt(0).toUpperCase() + action.slice(1)}`;
}

export function hasPermission(userPermissions: string[], module: PermissionModule, action: PermissionAction): boolean {
  const permissionString = formatPermission(module, action);
  return userPermissions.includes(permissionString);
}

export function requirePermission(module: PermissionModule, action: PermissionAction) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req.session as any)?.user;
    
    if (!user) {
      return res.status(401).json({ message: "Unauthorized - Please login" });
    }

    if (!user.permissions || !Array.isArray(user.permissions)) {
      return res.status(403).json({ 
        message: "Access denied - No permissions assigned to your role" 
      });
    }

    if (!hasPermission(user.permissions, module, action)) {
      return res.status(403).json({ 
        message: `Access denied - You don't have permission to ${action} ${module}` 
      });
    }

    next();
  };
}

export function requireAnyPermission(checks: Array<{ module: PermissionModule; action: PermissionAction }>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req.session as any)?.user;
    
    if (!user) {
      return res.status(401).json({ message: "Unauthorized - Please login" });
    }

    if (!user.permissions || !Array.isArray(user.permissions)) {
      return res.status(403).json({ 
        message: "Access denied - No permissions assigned to your role" 
      });
    }

    const hasAnyPermission = checks.some(({ module, action }) => 
      hasPermission(user.permissions, module, action)
    );

    if (!hasAnyPermission) {
      return res.status(403).json({ 
        message: "Access denied - You don't have the required permissions" 
      });
    }

    next();
  };
}
