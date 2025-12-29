"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session } from "@ory/client";
import { kratos } from "@/lib/kratos";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { UserProfile as User } from '@/lib/types';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
    const [showForceChangeAlert, setShowForceChangeAlert] = useState(false);

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

            if (identity) {
                console.log("[KratosAuthProvider] Session valid for", identity.id);

                // AAL Logic (Keep existing logic for 2FA redirection)
                const currentAal = data.authenticator_assurance_level;
                const credentials = (identity as any).credentials;
                const hasTotp = credentials && (credentials.totp || credentials.webauthn);

                if (currentAal === 'aal1') {
                    if (hasTotp) {
                        router.replace("/login?aal=aal2");
                        return;
                    }
                    // Strategy 2: Probe (fallback)
                    try {
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
                            const currentFlow = searchParams.get("flow");
                            if (currentFlow !== flow.id) {
                                router.replace(`/login?flow=${flow.id}`);
                            }
                            return;
                        }
                    } catch (probeErr: any) {
                        // Ignore probe errors
                    }
                }

                // FETCH FULL USER PROFILE FROM BACKEND
                // This ensures we get the 'forcePasswordChange' flag and the correct Role from local DB
                try {
                    const meResponse = await fetch('/api/auth/me', {
                        headers: { 'Content-Type': 'application/json' } // Cookies sent automatically
                    });

                    if (meResponse.ok) {
                        const meData = await meResponse.json();
                        if (meData.success && meData.user) {
                            console.log("[KratosAuthProvider] User profile loaded:", meData.user.role);
                            setUser(meData.user);
                        } else {
                            throw new Error("Failed to load user profile data");
                        }
                    } else {
                        throw new Error(`Failed to load user profile: ${meResponse.status}`);
                    }
                } catch (profileErr) {
                    console.error("[KratosAuthProvider] Failed to fetch user profile, falling back to session traits:", profileErr);
                    // Fallback to Kratos traits if API fails (graceful degradation)
                    const traits = identity.traits as any;
                    const nameTrait = traits?.name;
                    let normalizedName = "User";
                    if (typeof nameTrait === 'string') {
                        normalizedName = nameTrait;
                    } else if (typeof nameTrait === 'object' && nameTrait !== null) {
                        normalizedName = `${nameTrait.first || ''} ${nameTrait.last || ''}`.trim();
                    }

                    setUser({
                        id: identity.id,
                        email: traits?.email || "",
                        name: normalizedName,
                        role: traits?.role || "customer",
                        status: "Active",
                        avatarUrl: traits?.picture || undefined,
                        lastActive: new Date().toISOString(),
                        createdAt: new Date().toISOString(),
                        forcePasswordChange: false // Fallback assumption
                    } as User);
                }

                // Fetch JWT token after session is validated
                await fetchJWTToken();

                // If we are redirecting to AAL2, DO NOT stop loading to prevent render bypass
                if (currentAal === 'aal1' && hasTotp) {
                    // Keep loading
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
        const publicRoutes = ["/login", "/register", "/recovery", "/compliance", "/auth-loading", "/privacy", "/terms"];
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
            // Only redirect if NOT already on the settings page
            // We rely on the Settings page to handle the specific tab and alerts
            if (pathname !== '/settings') {
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
