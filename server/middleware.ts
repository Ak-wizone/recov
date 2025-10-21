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
const PUBLIC_ROUTES = [
  '/api/register-tenant',
  '/api/registration-status',
  '/api/tenant-by-email',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/me',
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
  if (!tenantId && !req.path.startsWith('/api/admin') && !req.path.includes('registration-request')) {
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
