"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RecoveryFlow, UpdateRecoveryFlowBody, UiNodeInputAttributes } from "@ory/client";
import { kratos } from "@/lib/kratos";
import { FlowNodes } from "@/components/auth/FlowNodes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";
import { unflatten } from "@/lib/unflatten";

function RecoveryForm() {
    const [flow, setFlow] = useState<RecoveryFlow | null>(null);
    const router = useRouter();
    const searchParams = useSearchParams();
    const flowId = searchParams.get("flow");
    const returnTo = searchParams.get("return_to");

    useEffect(() => {
        if (flow) {
            return;
        }

        if (flowId) {
            kratos
                .getRecoveryFlow({ id: flowId })
                .then(({ data }) => setFlow(data))
                .catch((err) => {
                    console.error(err);
                    startRecoveryFlow();
                });
            return;
        }

        startRecoveryFlow();
    }, [flowId, router, returnTo]);

    const startRecoveryFlow = () => {
        kratos
            .createBrowserRecoveryFlow({
                returnTo: returnTo ? String(returnTo) : undefined,
            })
            .then(({ data }) => {
                setFlow(data);
            })
            .catch((err) => {
                console.error("Failed to start recovery flow", err);
                if (err.response?.status === 400 && err.response?.data?.error?.id === "session_already_available") {
                    const destination = returnTo || "/compliance/reset-password";
                    window.location.href = destination;
                    return;
                }
                if (err.response?.status === 410 || err.response?.status === 422 || err.response?.status === 403) {
                    window.location.href = "/recovery";
                    return;
                }
            });
    };

    const handleResend = async () => {
        if (!flow) return;

        // 1. Extract Email from current nodes
        console.log("[Recovery] HandleResend triggered.");
        const emailNode = flow.ui.nodes.find(n =>
            (n.attributes as UiNodeInputAttributes).name === "email"
        );
        const email = (emailNode?.attributes as UiNodeInputAttributes)?.value;

        if (!email) {
            console.error("[Recovery] Could not find email to resend to.");
            return;
        }

        try {
            // 2. Start a FRESH recovery flow context
            console.log("[Recovery] Starting separate flow for resend...");
            const { data: newFlow } = await kratos.createBrowserRecoveryFlow({
                returnTo: returnTo ? String(returnTo) : undefined,
            });

            // 3. Submit the email to this fresh flow
            console.log("[Recovery] Submitting email to new flow:", email);
            const { data: updatedFlow } = await kratos.updateRecoveryFlow({
                flow: newFlow.id,
                updateRecoveryFlowBody: {
                    method: "email",
                    email: String(email)
                }
            });

            // 4. Update UI with the result (should show "email sent" message)
            setFlow(updatedFlow);
            console.log("[Recovery] Resend successful, UI updated.");

        } catch (err: any) {
            console.error("[Recovery] Resend failed:", err.response?.data || err);
            if (err.response?.data) {
                setFlow(err.response.data);
            }
        }
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.stopPropagation();
        e.preventDefault();

        if (!flow) return;

        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        const flatBody: any = Object.fromEntries(formData);

        // Standard submission for CODE verification
        // (Resend is handled by handleResend now)

        // Ensure method is 'code' if we are here (likely Verify button clicked)
        // If the server sent no method, default to code.
        if (!flatBody.method) {
            flatBody.method = 'code';
        }

        console.log("[Recovery] Submit Payload:", flatBody);

        const body = unflatten(flatBody);

        kratos
            .updateRecoveryFlow({
                flow: flow.id,
                updateRecoveryFlowBody: body as UpdateRecoveryFlowBody,
            })
            .then(({ data }) => {
                if (data.ui.messages && data.ui.messages.length > 0) {
                    setFlow(data);
                    return;
                }
                router.push("/login");
            })
            .catch((err) => {
                if (err.response?.status === 400) {
                    setFlow(err.response.data);
                    return;
                }
                if (err.response?.status === 410 || err.response?.status === 422 || err.response?.status === 403) {
                    setFlow(null);
                    window.location.href = "/recovery";
                    return;
                }
                console.error(err);
            });
    };

    if (!flow) return <div className="flex justify-center p-8">Loading...</div>;

    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
            {/* Header */}
            <div className="mb-8 text-center">
                <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                    Audit Platform
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    Account Recovery
                </p>
            </div>

            <Card className="w-full max-w-md shadow-lg">
                <CardHeader>
                    <CardTitle>Recover Account</CardTitle>
                    <CardDescription>Enter your email to reset your password.</CardDescription>
                </CardHeader>
                <CardContent>
                    {flow.ui.messages && flow.ui.messages.length > 0 && (
                        <div className="mb-4 space-y-2">
                            {flow.ui.messages.map(msg => (
                                <Alert key={msg.id} variant={msg.type === 'error' ? 'destructive' : 'default'}>
                                    <AlertTitle>{msg.type === 'error' ? 'Error' : 'Info'}</AlertTitle>
                                    <AlertDescription>{msg.text}</AlertDescription>
                                </Alert>
                            ))}
                        </div>
                    )}

                    <FlowNodes
                        nodes={flow.ui.nodes}
                        isLoading={false}
                        onSubmit={onSubmit}
                        onResend={handleResend}
                    />

                    <div className="mt-4 text-center text-sm">
                        <Link href="/login" className="underline">
                            Back to Sign In
                        </Link>
                    </div>
                </CardContent>
            </Card>

            {/* Footer */}
            <footer className="mt-8 text-center text-xs text-muted-foreground">
                <p>© {new Date().getFullYear()} All rights reserved to <span className="font-semibold text-foreground">Cybergaar</span></p>
                <p className="mt-1">Secure • Compliant • Trusted</p>
            </footer>
        </div>
    );
}

export default function RecoveryPage() {
    return (
        <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
            <RecoveryForm />
        </Suspense>
    );
}
