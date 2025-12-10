import fetch from 'node-fetch';

const OPA_URL = process.env.OPA_URL || 'http://studio-opa:8181';
const OPA_POLICY = 'studio/authz/allow';

interface OpaInput {
    path: string;
    method: string;
    user: {
        id?: string;
        role?: string;
        email?: string;
    };
}

interface OpaResponse {
    result?: boolean;
}

/**
 * Query OPA for authorization decision
 * @param input - The input object containing path, method, and user info
 * @returns true if authorized, false otherwise
 */
export async function checkAuthorization(input: OpaInput): Promise<boolean> {
    try {
        const response = await fetch(`${OPA_URL}/v1/data/${OPA_POLICY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ input }),
        });

        if (!response.ok) {
            console.error('OPA request failed:', response.status, response.statusText);
            return false; // Fail closed
        }

        const data = await response.json() as OpaResponse;
        return data.result === true;
    } catch (error) {
        console.error('OPA authorization error:', error);
        // Fail closed - if OPA is unavailable, deny access
        return false;
    }
}

/**
 * Check if a user with a specific role can access a given path
 * This is a convenience wrapper around checkAuthorization
 */
export async function canAccess(
    role: string,
    path: string,
    method: string = 'GET',
    userId?: string,
    email?: string
): Promise<boolean> {
    return checkAuthorization({
        path,
        method,
        user: { id: userId, role, email }
    });
}
