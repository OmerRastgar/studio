/**
 * JWT Token Manager
 * Handles JWT token lifecycle for Kong gateway authorization
 */

const TOKEN_STORAGE_KEY = 'studio_jwt_token';
const TOKEN_EXPIRY_BUFFER = 60; // Refresh 60 seconds before expiry

interface TokenResponse {
    success: boolean;
    data?: {
        token: string;
        token_type: string;
        expires_in: number;
        user: {
            id: string;
            email: string;
            role: string;
            name: string;
        };
    };
    error?: string;
}

class JWTManager {
    private token: string | null = null;
    private expiresAt: number | null = null;

    constructor() {
        this.loadToken();
    }

    /**
     * Load token from localStorage
     */
    private loadToken(): void {
        if (typeof window === 'undefined') return;

        try {
            const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
            if (stored) {
                const { token, expiresAt } = JSON.parse(stored);
                if (expiresAt > Date.now()) {
                    this.token = token;
                    this.expiresAt = expiresAt;
                } else {
                    this.clearToken();
                }
            }
        } catch (error) {
            console.error('[JWT] Failed to load token:', error);
            this.clearToken();
        }
    }

    /**
     * Save token to localStorage
     */
    private saveToken(token: string, expiresIn: number): void {
        if (typeof window === 'undefined') return;

        this.token = token;
        this.expiresAt = Date.now() + (expiresIn * 1000);

        try {
            localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify({
                token,
                expiresAt: this.expiresAt
            }));
        } catch (error) {
            console.error('[JWT] Failed to save token:', error);
        }
    }

    /**
     * Clear stored token
     */
    clearToken(): void {
        this.token = null;
        this.expiresAt = null;
        if (typeof window !== 'undefined') {
            localStorage.removeItem(TOKEN_STORAGE_KEY);
        }
    }

    /**
     * Check if token is expired or about to expire
     */
    isTokenExpired(): boolean {
        if (!this.expiresAt) return true;
        return Date.now() >= (this.expiresAt - TOKEN_EXPIRY_BUFFER * 1000);
    }

    /**
     * Get current token (refreshes if needed)
     */
    async getToken(): Promise<string | null> {
        // If token exists and not expired, return it
        if (this.token && !this.isTokenExpired()) {
            return this.token;
        }

        // Token expired or missing, fetch new one
        return await this.fetchToken();
    }

    /**
     * Fetch new JWT from backend
     */
    async fetchToken(): Promise<string | null> {
        try {
            const response = await fetch('/api/auth/token', {
                method: 'POST',
                credentials: 'include', // Send Kratos session cookie
            });

            if (!response.ok) {
                console.error('[JWT] Token fetch failed:', response.status);
                this.clearToken();
                return null;
            }

            const data: TokenResponse = await response.json();

            if (data.success && data.data) {
                this.saveToken(data.data.token, data.data.expires_in);
                return data.data.token;
            }

            console.error('[JWT] Invalid token response:', data);
            this.clearToken();
            return null;

        } catch (error) {
            console.error('[JWT] Token fetch error:', error);
            this.clearToken();
            return null;
        }
    }

    /**
     * Make authenticated API call with JWT
     */
    async apiCall(url: string, options: RequestInit = {}): Promise<Response> {
        const token = await this.getToken();

        if (!token) {
            throw new Error('No valid JWT token available');
        }

        const headers = new Headers(options.headers);
        headers.set('Authorization', `Bearer ${token}`);

        return fetch(url, {
            ...options,
            headers,
        });
    }
}

// Export singleton instance
export const jwtManager = new JWTManager();

/**
 * Helper function for API calls with automatic JWT handling
 */
export async function apiCall(url: string, options: RequestInit = {}): Promise<Response> {
    return jwtManager.apiCall(url, options);
}

/**
 * Clear JWT token (call on logout)
 */
export function clearJWT(): void {
    jwtManager.clearToken();
}
