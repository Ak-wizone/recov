import type { Request, Response, NextFunction } from "express";

// Extend Express Request type to include tenantId
declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
    }
  }
}

// Public routes that don't require tenant context
// Note: These paths are without /api prefix since middleware is mounted at /api
const PUBLIC_ROUTES = [
  '/register-tenant',
  '/registration-status',
  '/tenant-by-email',
  '/auth/login',
  '/auth/logout',
  '/auth/me',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/validate-reset-token',
];

// Check if a route is public
function isPublicRoute(path: string): boolean {
  return PUBLIC_ROUTES.some(route => path.startsWith(route));
}

// Middleware to extract tenantId from session and attach to request
export function tenantMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip tenant validation for public routes
  if (isPublicRoute(req.path)) {
    return next();
  }

  // Extract user from session
  const sessionUser = (req.session as any).user;

  if (!sessionUser) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  // Extract tenantId from session
  const tenantId = sessionUser.tenantId;

  // Platform admins (no tenantId) can access admin routes but need special handling
  // Regular users must have a tenantId
  if (!tenantId && !req.path.startsWith('/admin') && !req.path.includes('registration-request') && !req.path.startsWith('/tenants') && !req.path.startsWith('/email-config') && !req.path.startsWith('/auth/google')) {
    return res.status(403).json({ message: "No tenant associated with your account" });
  }

  // Attach tenantId to request for use in route handlers (may be undefined for platform admins)
  req.tenantId = tenantId;

  next();
}

// Middleware to check if user is a platform super-admin
// Super-admins are identified by having no tenantId (platform-level access)
export function adminOnlyMiddleware(req: Request, res: Response, next: NextFunction) {
  const sessionUser = (req.session as any).user;

  if (!sessionUser) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  // Check if user is a platform super-admin (has no tenantId - platform level access)
  // Regular tenant admins have a tenantId and should not access platform admin functions
  if (sessionUser.tenantId) {
    return res.status(403).json({ message: "Platform admin access required" });
  }

  next();
}

// Middleware to check if user has manager/admin role within their tenant
// Used for daily engagement features that require elevated permissions
export function managerOnlyMiddleware(req: Request, res: Response, next: NextFunction) {
  const sessionUser = (req.session as any).user;

  if (!sessionUser) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  // Check if user has manager or admin role
  const roleName = (sessionUser.roleName || "").toLowerCase();
  const isManager = roleName.includes("manager") || roleName.includes("admin") || roleName.includes("supervisor");

  if (!isManager) {
    return res.status(403).json({ message: "Manager access required for this action" });
  }

  next();
}
