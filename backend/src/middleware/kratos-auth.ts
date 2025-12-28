import { Request, Response, NextFunction } from 'express';
import { Configuration, FrontendApi } from '@ory/client';
import { AuthRequest } from './auth';

// Initialize Kratos client
// Initialize Kratos client
const kratosUrl = process.env.KRATOS_PUBLIC_URL || 'http://kratos:4433';
const publicUrl = new URL(kratosUrl);

// Determine correct origin/scheme for spoofing the browser
// Ideally we'd use FRONTEND_URL env var, but deriving from Kratos URL is a decent fallback
// for the "same domain" assumption.
const isLocal = publicUrl.hostname === 'localhost' || publicUrl.hostname === '127.0.0.1';
const scheme = isLocal ? 'http' : 'https';
const origin = `${scheme}://${publicUrl.host}`; // e.g. https://demo.cybergaar.com

const kratos = new FrontendApi(
    new Configuration({
        basePath: kratosUrl,
        baseOptions: {
            headers: {
                'Origin': origin,
                'Referer': origin,
                'X-Forwarded-Host': publicUrl.host,
                'X-Forwarded-Proto': scheme
            },
            withCredentials: true
        }
    })
);

export interface KratosAuthRequest extends AuthRequest {
    kratosSession?: any;
}

/**
 * Middleware to authenticate requests using Ory Kratos
 * Validates the session cookie or token with Kratos public API
 */
export async function kratosAuthenticate(
    req: KratosAuthRequest,
    res: Response,
    next: NextFunction
) {
    try {
        // 1. Check for cookie or bearer token
        const cookie = req.headers.cookie;
        const authHeader = req.headers.authorization;
        const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined;

        if (!cookie && !token) {
            // If no credentials, move to next middleware (let dualAuthenticate handle failure)
            return next();
        }

        // 2. Validate session with Kratos
        // IMPORTANT: Only pass xSessionToken if it's NOT a JWT (which starts with 'eyJ')
        // Kratos will reject the request if an invalid x-session-token is provided, ignoring the valid cookie.
        const isJwt = token?.startsWith('eyJ');
        const sessionToken = isJwt ? undefined : token;

        const { data: session } = await kratos.toSession({
            cookie: cookie,
            xSessionToken: sessionToken,
        });

        if (!session.active) {
            // Session inactive, move to next
            return next();
        }

        // 3. Extract user identity traits and map to User object
        // Cast traits to any because they are dynamic based on schema
        const traits = session.identity?.traits as any;

        if (session.identity) {
            // Normalize name: Kratos schema update changed name from object {first, last} to flat string
            const nameTrait = traits?.name;
            let normalizedName = 'User';

            if (typeof nameTrait === 'string') {
                normalizedName = nameTrait;
            } else if (typeof nameTrait === 'object' && nameTrait !== null) {
                normalizedName = `${nameTrait.first || ''} ${nameTrait.last || ''}`.trim();
            }

            req.user = {
                userId: session.identity.id,
                email: traits?.email || '',
                name: normalizedName || 'User',
                role: traits?.role || 'customer',
            };
            req.kratosSession = session;
        }

        next();
    } catch (error) {
        // If Kratos check fails (e.g. 401), just continue. 
        // The main authenticate middleware or dualAuthenticate will handle the final rejection.
        // We log only if it's not a standard 401/no session error to avoid noise
        const err = error as any;
        if (err.response?.status !== 401) {
            console.error('Kratos auth check failed:', err.message);
            if (err.response) {
                console.error('Kratos response data:', JSON.stringify(err.response.data));
                console.error('Kratos response status:', err.response.status);
            }
        }
        next();
    }
}
