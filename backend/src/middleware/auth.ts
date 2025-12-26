import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader } from '../lib/jwt';
import { prisma } from '../lib/prisma';
import { checkAuthorization } from '../lib/opa';
import { kratosAuthenticate } from './kratos-auth';
export interface AuthRequest extends Request {
    user?: {
        userId: string;
        email: string;
        role: string;
        name: string;
    };
}

export interface KratosAuthRequest extends AuthRequest {
    kratosSession?: any;
}

/**
 * Authentication middleware that supports:
 * 1. Kratos Session (Cookie/Token) - Native Kratos auth
 * 2. Kong-injected headers (X-User-Id, X-User-Role, X-User-Email) - primary when Kong validates JWT
 * 3. Direct JWT validation - fallback for local development or legacy tokens
 */
export async function authenticate(req: Request, res: Response, next: NextFunction) {
    const authReq = req as KratosAuthRequest;

    // 1. Try Kratos Authentication first
    await kratosAuthenticate(authReq, res, async () => {
        // Callback from kratosAuthenticate continues here

        // If Kratos successfully authenticated, proceed
        if (authReq.user) {
            return next();
        }

        try {
            // 2. Check for Kong-injected headers (Kong has already validated JWT)
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
                    console.warn('Could not fetch user name:', dbError);
                }

                authReq.user = {
                    userId: kongUserId,
                    email: kongUserEmail || '',
                    role: kongUserRole,
                    name: userName,
                };
                return next();
            }

            // 3. Fallback: Direct JWT validation (for local dev or backend-to-backend calls)
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

            // Support both userId (legacy) and sub (standard/Kong)
            const userId = payload.userId || (payload.sub as string);

            authReq.user = {
                userId: userId,
                email: payload.email,
                role: payload.role,
                name: payload.name,
            };

            next();
        } catch (error) {
            console.error('Auth middleware error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
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


