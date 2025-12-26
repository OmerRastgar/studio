"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoginFlow, UpdateLoginFlowBody } from "@ory/client";
import { kratos } from "@/lib/kratos";
import { FlowNodes } from "@/components/auth/FlowNodes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { unflatten } from "@/lib/unflatten";
import { SocialSignIn } from "@/components/auth/SocialSignIn";

function LoginForm() {
    const [flow, setFlow] = useState<LoginFlow | null>(null);
    const router = useRouter();
    const searchParams = useSearchParams();
    const flowId = searchParams.get("flow");
    const returnTo = searchParams.get("return_to");
    const aal = searchParams.get("aal");
    const refresh = searchParams.get("refresh");
    const loginChallenge = searchParams.get("login_challenge");

    useEffect(() => {
        // If the flow is already set, we don't need to do anything
        if (flow) {
            return;
        }

        // If ?flow=... is in the URL, fetch it
        if (flowId) {
            kratos
                .getLoginFlow({ id: flowId })
                .then(({ data }) => setFlow(data))
                .catch((err) => {
                    // If flow is invalid/expired, restart
                    console.error(err);
                    startLoginFlow();
                });
            return;
        }

        // Otherwise, start a new flow
        startLoginFlow();
    }, [flowId, router, aal, refresh, returnTo, loginChallenge]);

    const startLoginFlow = () => {
        kratos
            .createBrowserLoginFlow({
                refresh: refresh === "true",
                aal: aal ? String(aal) : undefined,
                returnTo: returnTo ? String(returnTo) : undefined,
                loginChallenge: loginChallenge ? String(loginChallenge) : undefined,
            })
            .then(({ data }) => {
                setFlow(data);
            })
            .catch((err) => {
                console.error("Failed to start login flow", err);
                if (err.response) {
                    console.error("Error Response Data:", JSON.stringify(err.response.data, null, 2));
                    console.error("Error Status:", err.response.status);
                    console.error("Error Headers:", err.response.headers);
                }
                // If we are already logged in, redirect to dashboard
                if (err.response?.status === 400 && err.response?.data?.error?.id === "session_already_available") {
                    // Critical Fix: Before redirecting, check if user needs 2FA (AAL2)
                    console.log("[Login] Session exists (AAL1). Checking for AAL2 requirement...");

                    kratos.createBrowserLoginFlow({
                        aal: 'aal2',
                        returnTo: returnTo ? String(returnTo) : undefined
                    })
                        .then(({ data: aal2Flow }) => {
                            // Check if this flow actually asks for 2FA
                            const has2FA = aal2Flow.ui.nodes.some((node: any) =>
                                node.group === 'totp' || node.group === 'webauthn' || node.group === 'lookup_secret'
                            );

                            if (has2FA) {
                                console.log("[Login] AAL2 required. Switching to 2FA flow.");
                                setFlow(aal2Flow);
                                return;
                            }

                            // No 2FA needed, proceed to dashboard
                            console.log("[Login] No 2FA required. Redirecting.");
                            const dest = returnTo || "/dashboard";
                            window.location.href = dest;
                        })
                        .catch((aal2Err) => {
                            // AAL2 probe failed (likely no 2FA setup or error), safe to redirect
                            console.warn("[Login] AAL2 probe result: Redirecting.", aal2Err);
                            const dest = returnTo || "/dashboard";
                            window.location.href = dest;
                        });
                    return;
                }
            });
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.stopPropagation();
        e.preventDefault();

        if (!flow) return;

        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        const flatBody: any = Object.fromEntries(formData);

        // ... existing method logic ...
        if (!flatBody.method) {
            const nativeEvent = e.nativeEvent as SubmitEvent;
            if (nativeEvent.submitter && (nativeEvent.submitter as HTMLButtonElement).name === 'method') {
                flatBody.method = (nativeEvent.submitter as HTMLButtonElement).value;
            } else {
                flatBody.method = 'password';
            }
        }

        const body = unflatten(flatBody);

        kratos
            .updateLoginFlow({
                flow: flow.id,
                updateLoginFlowBody: body as UpdateLoginFlowBody,
            })
            .then((res) => {
                // If successful, Kratos usually returns a redirect URL or session
                // Depending on configuration, it might just return 200 OK
                const returnToParam = searchParams.get("return_to");
                if (flow.return_to || returnToParam) {
                    window.location.href = flow.return_to || returnToParam!;
                    return;
                }
                // Force hard reload to ensure fresh session check and prevent dashboard flash
                window.location.href = "/dashboard";
            })
            .catch((err) => {
                if (err.response?.status === 400) {
                    setFlow(err.response.data);
                    return;
                }
                // Flow expired or gone
                if (err.response?.status === 410 || err.response?.status === 404) {
                    setFlow(null);
                    window.location.href = "/login"; // Force full reload to get fresh flow
                    return;
                }
                console.error(err);
            });
    };

    const loginAs = (email: string, pass: string) => {
        if (!flow) return;

        // Find CSRF token
        const nodes = flow.ui.nodes;
        const csrfNode = nodes.find((n: any) => n.attributes.name === "csrf_token");
        const csrfToken = (csrfNode?.attributes as any)?.value;

        kratos.updateLoginFlow({
            flow: flow.id,
            updateLoginFlowBody: {
                method: "password",
                password: pass,
                identifier: email,
                csrf_token: csrfToken
            } as UpdateLoginFlowBody
        }).then(() => {
            window.location.href = "/dashboard";
        }).catch((err) => {
            console.error("Demo login failed", err);
            if (err.response?.status === 400) {
                setFlow(err.response.data);
                return;
            }
            if (err.response?.status === 410 || err.response?.status === 404) {
                window.location.href = "/login";
            }
        });
    };

    const handleCancel = () => {
        kratos.createBrowserLogoutFlow().then(({ data }) => {
            window.location.href = data.logout_url;
        }).catch(() => {
            window.location.href = "/login";
        });
    };

    if (!flow) return <div className="flex justify-center p-8">Loading...</div>;

    const is2FAStep = flow.ui.nodes.some((n: any) => n.group === "totp" || n.group === "lookup_secret" || n.attributes.name === "totp_code");
    const showExtras = !refresh && !is2FAStep;


    const handleSocialLogin = (provider: string) => {
        if (!flow) return;

        // Find CSRF token
        const nodes = flow.ui.nodes;
        const csrfNode = nodes.find((n: any) => n.attributes.name === "csrf_token");
        const csrfToken = (csrfNode?.attributes as any)?.value;

        kratos.updateLoginFlow({
            flow: flow.id,
            updateLoginFlowBody: {
                method: "oidc",
                provider: provider,
                csrf_token: csrfToken,
            } as UpdateLoginFlowBody
        }).then(({ data }: any) => {
            // Kratos returns a redirect URL for OIDC
            if (data.redirect_browser_to) {
                window.location.href = data.redirect_browser_to;
            } else if (data.redirect_to) {
                window.location.href = data.redirect_to;
            } else {
                // Should not happen for OIDC unless there's an error or we are already logged in
                window.location.href = "/dashboard";
            }
        }).catch((err) => {
            console.error("Social login failed", err);
            if (err.response?.data?.redirect_browser_to) {
                window.location.href = err.response.data.redirect_browser_to;
                return;
            }
            if (err.response?.status === 400 || err.response?.status === 422) {
                // 422 often contains the redirect for browser flows
                setFlow(err.response.data);
                return;
            }
            if (err.response?.status === 410 || err.response?.status === 404) {
                window.location.href = "/login";
            }
        });
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
            {/* Header */}
            <div className="mb-8 text-center">
                <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                    Audit Platform
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    Secure Compliance Management System
                </p>
            </div>

            <Card className="w-full max-w-md shadow-lg">
                <CardHeader>
                    <CardTitle>Sign In</CardTitle>
                    <CardDescription>Enter your credentials to access your account.</CardDescription>
                </CardHeader>
                <CardContent>
                    {flow.ui.messages && flow.ui.messages.length > 0 && (
                        <div className="mb-4 space-y-2">
                            {flow.ui.messages
                                .filter((msg: any, index: number, self: any[]) =>
                                    index === self.findIndex((t: any) => t.text === msg.text)
                                )
                                .map((msg: any) => (
                                    <Alert
                                        key={msg.id}
                                        variant="default"
                                        className={msg.type === 'error'
                                            ? "bg-red-950 border-red-900 text-red-200 [&>svg]:text-red-200"
                                            : "bg-blue-950/30 border-blue-900 text-blue-200 [&>svg]:text-blue-200"}
                                    >
                                        <AlertTitle>{msg.type === 'error' ? 'Error' : 'Info'}</AlertTitle>
                                        <AlertDescription>{msg.text}</AlertDescription>
                                    </Alert>
                                ))}
                        </div>
                    )}

                    <FlowNodes
                        nodes={flow.ui.nodes.filter((n: any) => n.group !== 'oidc' && n.attributes.name !== 'provider')}
                        isLoading={false}
                        onSubmit={onSubmit}
                    />
                    {!is2FAStep && (
                        <div className="mt-4">
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-background px-2 text-muted-foreground">
                                        Or continue with
                                    </span>
                                </div>
                            </div>

                            <div className="mt-4 grid grid-cols-1 gap-2">
                                <SocialSignIn
                                    provider="google"
                                    label="Sign in with Google"
                                    onLogin={() => handleSocialLogin("google")}
                                />
                            </div>
                        </div>
                    )}



                    {/* Cancel Button for 2FA */}
                    {is2FAStep && (
                        <div className="mt-4 text-center">
                            <Button variant="ghost" size="sm" onClick={handleCancel} className="text-muted-foreground hover:text-destructive">
                                Cancel and Sign Out
                            </Button>
                        </div>
                    )}
                    {showExtras && (
                        <>
                            {process.env.NODE_ENV !== 'production' && (
                                <div className="mt-6">
                                    <p className="text-xs text-center text-muted-foreground mb-3">
                                        Quick Demo Login (Dev Only)
                                    </p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            type="button"
                                            onClick={() => loginAs("admin@example.com", "password123")}
                                            className="text-xs"
                                        >
                                            🔐 Admin
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            type="button"
                                            onClick={() => loginAs("manager@example.com", "password123")}
                                            className="text-xs"
                                        >
                                            👔 Manager
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            type="button"
                                            onClick={() => loginAs("auditor@example.com", "password123")}
                                            className="text-xs"
                                        >
                                            📋 Auditor
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            type="button"
                                            onClick={() => loginAs("customer@example.com", "password123")}
                                            className="text-xs"
                                        >
                                            👤 Customer
                                        </Button>
                                    </div>
                                </div>
                            )}

                            <div className="mt-4 text-center text-sm">
                                <Link href="/register" className="underline">
                                    Don't have an account? Sign up
                                </Link>
                            </div>
                            <div className="mt-2 text-center text-sm">
                                <Link href="/recovery" className="text-muted-foreground hover:text-primary">
                                    Forgot your password?
                                </Link>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Footer */}
            <footer className="mt-8 text-center text-xs text-muted-foreground">
                <p>© {new Date().getFullYear()} All rights reserved to <span className="font-semibold text-foreground">Cybergaar</span></p>
                <p className="mt-1">Secure • Compliant • Trusted</p>
            </footer>
        </div >
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
            <LoginForm />
        </Suspense>
    );
}
