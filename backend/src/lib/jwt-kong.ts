import jwt from 'jsonwebtoken';

// JWT configuration for Kong
// We default to HS256 to allow easy scaling without managing key files on disk
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not defined');
}

export interface KongJWTPayload {
    sub: string;      // User ID
    email: string;
    role: string;
    name: string;
    iss?: string;     // Issuer
    aud?: string;     // Audience
    iat?: number;     // Issued at
    exp?: number;     // Expires at
}

/**
 * Generate JWT for Kong gateway verification
 * Uses HS256 with the shared secret
 */
export function generateKongJWT(payload: Omit<KongJWTPayload, 'iss' | 'aud' | 'iat' | 'exp'>): string {
    const now = Math.floor(Date.now() / 1000);

    const fullPayload: KongJWTPayload = {
        ...payload,
        iss: 'studio-idp', // Matches Kong consumer key
        aud: 'studio-api',
        iat: now,
        exp: now + 3600  // 1 hour
    };

    return jwt.sign(fullPayload, JWT_SECRET!, {
        algorithm: 'HS256'
    });
}

/**
 * Verify JWT token
 */
export function verifyKongJWT(token: string): KongJWTPayload | null {
    try {
        return jwt.verify(token, JWT_SECRET!, {
            algorithms: ['HS256']
        }) as KongJWTPayload;
    } catch (error) {
        console.error('[JWT] Verification failed:', error);
        return null;
    }
}

/**
 * Get public key for Kong configuration
 * (Not applicable for HS256, but keeping signature for compatibility if needed)
 */
export function getPublicKey(): string {
    return ''; // HS256 doesn't use a public key
}

