'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { kratos } from '@/lib/kratos';

function AuthLoadingContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const returnTo = searchParams.get('return_to') || '/dashboard';

    useEffect(() => {
        const verifyAuth = async () => {
            try {
                // Check session
                const { data: session } = await kratos.toSession();

                // Check AAL
                if (session.authenticator_assurance_level === 'aal1') {
                    // Check strict credentials
                    const credentials = (session.identity as any).credentials;
                    const hasTotp = credentials && (credentials.totp || credentials.webauthn);

                    if (hasTotp) {
                        // Needs Upgrade
                        router.replace('/login?aal=aal2');
                        return;
                    }

                    // Optional: Probe for AAL2 if not sure (skipping for speed/strictness as per earlier)
                    // If we assume strict credential check is enough:
                }

                // If we are here, we are good.
                // Set the verification cookie to bypass middleware next time
                document.cookie = "auth_verified=true; path=/; max-age=3600; SameSite=Lax";

                // Redirect to destination
                router.replace(returnTo);

            } catch (err: any) {
                // If 401, redirect to login
                if (err.response?.status === 401) {
                    router.replace('/login');
                } else {
                    console.error("Auth verification failed", err);
                    router.replace('/login');
                }
            }
        };

        verifyAuth();
    }, [router, returnTo]);

    return (
        <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
            <div className="flex flex-col items-center gap-4">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                <p className="text-lg font-medium animate-pulse">Verifying Security...</p>
            </div>
        </div>
    );
}

export default function AuthLoadingPage() {
    return (
        <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
            <AuthLoadingContent />
        </Suspense>
    );
}
