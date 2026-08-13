import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
export type AuthUser = { sub: string; role: string; tenantId?: string };
export type AuthRequest = Request & { user?: AuthUser };
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'development-secret') as AuthUser;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
export function allowRoles(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) =>
    req.user && roles.includes(req.user.role)
      ? next()
      : res.status(403).json({ error: 'Insufficient permission' });
}
export function requireTenant(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user?.tenantId && req.user?.role !== 'admin')
    return res.status(403).json({ error: 'Seller tenant required' });
  next();
}
