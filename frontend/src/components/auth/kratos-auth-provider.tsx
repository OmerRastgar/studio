"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session } from "@ory/client";
import { kratos } from "@/lib/kratos";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { UserProfile as User } from '@/lib/types';

interface AuthContextType {
    user: User | null;
    token: string | null;
    loading: boolean;
    logout: () => void;
    // Extra Kratos specifics
    session: Session | null;
    refreshSession: () => Promise<void>;
}

const KratosAuthContext = createContext<AuthContextType>({
    user: null,
    token: null,
    loading: true,
    logout: () => { },
    session: null,
    refreshSession: async () => { },
});

export function KratosAuthProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setIsLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const fetchJWTToken = async () => {
        try {
            const response = await fetch('/api/auth/token', {
                method: 'POST',
                credentials: 'include', // Send Kratos session cookie
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data?.token) {
                    console.log("KratosAuthProvider: JWT token obtained");
                    localStorage.setItem('auth_token', data.data.token);
                    setToken(data.data.token);
                    return data.data.token;
                }
            }
            console.warn("KratosAuthProvider: Failed to fetch JWT token");
            setToken(null);
            return null;
        } catch (error) {
            console.error("KratosAuthProvider: Error fetching JWT token:", error);
            setToken(null);
            return null;
        }
    };

    const refreshSession = async () => {
        setIsLoading(true);
        try {
            // Revert to standard session check
            const { data } = await kratos.toSession();
            setSession(data);

            const identity = data.identity;
            const traits = identity?.traits as any;
            const metadata = identity?.metadata_public as any;

            if (identity) {
                const userRole = traits?.role || metadata?.role || "customer";
                const nameTrait = traits?.name;

                console.log("[KratosAuthProvider] Session AAL:", data.authenticator_assurance_level);
                const currentAal = data.authenticator_assurance_level;

                // Check if we need to upgrade to AAL2
                const credentials = (identity as any).credentials;
                const hasTotp = credentials && (credentials.totp || credentials.webauthn);

                if (currentAal === 'aal1') {
                    // Strategy 1: strict check on credentials if available
                    if (hasTotp) {
                        console.log("[KratosAuthProvider] User has 2FA credentials. Enforcing AAL2.");
                        // Directly redirect to AAL2 flow
                        router.replace("/login?aal=aal2");
                        return;
                    }

                    // Strategy 2: Probe (fallback)
                    try {
                        console.log("[KratosAuthProvider] Probing for AAL2 capability...");
                        const { data: flow } = await kratos.createBrowserLoginFlow({
                            aal: 'aal2',
                            refresh: true,
                            returnTo: pathname || "/dashboard"
                        });

                        const hasAal2Nodes = flow.ui.nodes.some((node: any) =>
                            node.group === 'totp' ||
                            node.group === 'lookup_secret' ||
                            node.group === 'webauthn' ||
                            node.attributes?.name === 'totp_code'
                        );

                        if (hasAal2Nodes) {
                            console.log("[KratosAuthProvider] AAL2 probe positive. Redirecting to 2FA flow:", flow.id);
                            // If we are already on login with this flow, don't loop
                            const currentFlow = searchParams.get("flow");
                            if (currentFlow !== flow.id) {
                                router.replace(`/login?flow=${flow.id}`);
                            }
                            // Keep loading
                            return;
                        } else {
                            console.log("[KratosAuthProvider] AAL2 probe: Flow created but no 2FA nodes found. User has no 2FA.");
                        }
                    } catch (probeErr: any) {
                        if (probeErr.response?.status === 400 || probeErr.response?.status === 422) {
                            console.log("[KratosAuthProvider] AAL2 probe negative (400/422). User likely has no 2FA.", probeErr.message);
                        } else {
                            console.error("[KratosAuthProvider] AAL2 probe failed with unexpected error. Blocking access.", probeErr);
                            return; // Block access
                        }
                    }
                }

                let normalizedName = "User";
                if (typeof nameTrait === 'string') {
                    normalizedName = nameTrait;
                } else if (typeof nameTrait === 'object' && nameTrait !== null) {
                    normalizedName = `${nameTrait.first || ''} ${nameTrait.last || ''}`.trim();
                }

                console.log("KratosAuthProvider: Session valid for", identity.id, "Role:", userRole);
                setUser({
                    id: identity.id,
                    email: traits?.email || "",
                    name: normalizedName,
                    role: userRole,
                    status: "Active",
                    avatarUrl: traits?.picture || undefined,
                    lastActive: data.expires_at ? new Date(data.expires_at).toISOString() : new Date().toISOString(),
                    createdAt: identity.created_at ? new Date(identity.created_at).toISOString() : new Date().toISOString(),
                    forcePasswordChange: (data.identity?.metadata_public as any)?.forcePasswordChange ?? false
                } as User);

                // Fetch JWT token after session is validated
                await fetchJWTToken();

                // If we are redirecting to AAL2, DO NOT stop loading to prevent render bypass
                if (currentAal === 'aal1' && hasTotp) {
                    console.log("[KratosAuthProvider] AAL1 detected but 2FA required. Keeping loading state...");
                    // Do NOT setIsLoading(false);
                } else {
                    setIsLoading(false);
                }
            } else {
                console.warn("KratosAuthProvider: Session exists but no identity?");
                setUser(null);
                setToken(null);
                setIsLoading(false);
            }

        } catch (error) {
            setSession(null);
            setUser(null);
            setToken(null);
            setIsLoading(false);
        }
    };

    const logout = () => {
        kratos.createBrowserLogoutFlow().then(({ data }) => {
            setToken(null);
            window.location.href = data.logout_url;
        }).catch(err => {
            console.error("Logout failed", err);
            setSession(null);
            setUser(null);
            setToken(null);
            router.push("/login"); // Fallback to login page
        });
    };

    useEffect(() => {
        refreshSession();
    }, []);

    // Protected Route Logic
    useEffect(() => {
        const publicRoutes = ["/login", "/register", "/recovery", "/compliance", "/auth-loading"];
        const isRefresh = searchParams?.get("refresh");

        console.log("[KratosAuthProvider] Route check:", {
            pathname,
            hasUser: !!user,
            loading,
            isPublicRoute: publicRoutes.includes(pathname) || pathname.startsWith('/compliance/'),
            userRole: user?.role,
            isRefresh
        });

        if (!loading && !user && !publicRoutes.includes(pathname) && !pathname.startsWith('/compliance/')) {
            console.log("[KratosAuthProvider] No user on protected route, redirecting to /login");
            router.replace("/login");
        }
        // Backward compatibility
        const isTransitPage = pathname === '/auth-loading';
        if (!loading && user && publicRoutes.includes(pathname) && !isRefresh && !pathname.startsWith('/compliance/') && !isTransitPage) {
            console.log("[KratosAuthProvider] User logged in on public route, redirecting to /dashboard");
            router.replace("/dashboard");
        }

        // Force Password Change Check
        if (!loading && user && (user as any).forcePasswordChange) {
            const isSettingsSecurity = pathname === '/settings' && searchParams?.get('tab') === 'security';
            if (!isSettingsSecurity) {
                console.log("[KratosAuthProvider] Force Password Change detected. Redirecting to settings.");
                router.replace("/settings?tab=security&reason=force_change");
            }
        }
    }, [user, loading, pathname, router, searchParams]);

    // console.log("[KratosAuthProvider] Rendering children with state:", { hasUser: !!user, loading, pathname });

    return (
        <KratosAuthContext.Provider value={{
            user,
            token,
            loading,
            logout,
            session,
            refreshSession
        }}>
            {children}
        </KratosAuthContext.Provider>
    );
}

// Export as useAuth to replace the legacy hook seamlessly
export const useAuth = () => {
    const context = useContext(KratosAuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within a KratosAuthProvider");
    }
    return context;
};
