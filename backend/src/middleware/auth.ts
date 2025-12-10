import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader } from '../lib/jwt';
import { prisma } from '../lib/prisma';
import { checkAuthorization } from '../lib/opa';

export interface AuthRequest extends Request {
    user?: {
        userId: string;
        email: string;
        role: string;
        name: string;
    };
}

/**
 * Authentication middleware that supports:
 * 1. Kong-injected headers (X-User-Id, X-User-Role, X-User-Email) - primary when Kong validates JWT
 * 2. Direct JWT validation - fallback for local development or backend-to-backend calls
 */
export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
        // Check for Kong-injected headers first (Kong has already validated JWT)
        const kongUserId = req.headers['x-user-id'] as string;
        const kongUserRole = req.headers['x-user-role'] as string;
        const kongUserEmail = req.headers['x-user-email'] as string;

        if (kongUserId && kongUserRole) {
            // Kong has validated the JWT and injected user info
            // Optionally fetch user name from database
            let userName = 'User';
            try {
                const user = await prisma.user.findUnique({
                    where: { id: kongUserId },
                    select: { name: true }
                });
                if (user) {
                    userName = user.name || 'User';
                }
            } catch (dbError) {
                // If DB lookup fails, continue with default name
                console.warn('Could not fetch user name:', dbError);
            }

            req.user = {
                userId: kongUserId,
                email: kongUserEmail || '',
                role: kongUserRole,
                name: userName,
            };
            return next();
        }

        // Fallback: Direct JWT validation (for local dev or backend-to-backend calls)
        let token = extractTokenFromHeader(req.headers.authorization || null);

        // If no header, check cookie (simple parsing)
        if (!token && req.headers.cookie) {
            const match = req.headers.cookie.match(/auth_token=([^;]+)/);
            if (match) {
                token = match[1];
            }
        }

        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const payload = verifyToken(token);

        if (!payload) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        req.user = {
            userId: payload.userId,
            email: payload.email,
            role: payload.role,
            name: payload.name,
        };

        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * OPA-based authorization middleware
 * Queries OPA to check if the user's role is allowed to access the requested path
 */
export function authorizeWithOPA() {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const isAuthorized = await checkAuthorization({
            path: req.path,
            method: req.method,
            user: {
                id: req.user.userId,
                role: req.user.role,
                email: req.user.email
            }
        });

        if (!isAuthorized) {
            return res.status(403).json({
                error: 'Access denied',
                message: `Role '${req.user.role}' is not authorized to access ${req.method} ${req.path}`
            });
        }

        next();
    };
}

/**
 * Role-based access control middleware (legacy)
 * Note: When using Kong + OPA, RBAC is handled at the gateway level.
 * This middleware serves as a secondary check for defense-in-depth.
 */
export function requireRole(roles: string[]) {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const normalizedUserRole = req.user.role.toLowerCase();
        const normalizedRequiredRoles = roles.map(r => r.toLowerCase());

        if (!normalizedRequiredRoles.includes(normalizedUserRole)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        next();
    };
}


