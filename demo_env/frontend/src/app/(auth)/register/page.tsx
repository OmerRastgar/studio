"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RegistrationFlow, UpdateRegistrationFlowBody } from "@ory/client";
import { kratos } from "@/lib/kratos";
import { FlowNodes } from "@/components/auth/FlowNodes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";
import { unflatten } from "@/lib/unflatten";

import { SocialSignIn } from "@/components/auth/SocialSignIn";

function RegisterForm() {
    const [flow, setFlow] = useState<RegistrationFlow | null>(null);
    const router = useRouter();
    const searchParams = useSearchParams();
    const flowId = searchParams.get("flow");
    const returnTo = searchParams.get("return_to");

    useEffect(() => {
        if (flow) return;

        if (flowId) {
            kratos
                .getRegistrationFlow({ id: flowId })
                .then(({ data }) => setFlow(data))
                .catch((err) => {
                    console.error(err);
                    startRegisterFlow();
                });
            return;
        }

        startRegisterFlow();
    }, [flowId, router, returnTo]);

    const startRegisterFlow = () => {
        kratos
            .createBrowserRegistrationFlow({
                returnTo: returnTo ? String(returnTo) : undefined,
            })
            .then(({ data }) => {
                setFlow(data);
            })
            .catch((err) => {
                console.error("Failed to start registration flow", err);
            });
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.stopPropagation();
        e.preventDefault();

        if (!flow) return;

        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        const flatBody: any = Object.fromEntries(formData);

        // Ensure 'method' is included (required by Kratos)
        if (!flatBody.method) {
            const nativeEvent = e.nativeEvent as SubmitEvent;
            if (nativeEvent.submitter && (nativeEvent.submitter as HTMLButtonElement).name === 'method') {
                flatBody.method = (nativeEvent.submitter as HTMLButtonElement).value;
            } else {
                flatBody.method = 'password';
            }
        }

        // Unflatten for Kratos JSON API
        const body = unflatten(flatBody);

        kratos
            .updateRegistrationFlow({
                flow: flow.id,
                updateRegistrationFlowBody: body as UpdateRegistrationFlowBody,
            })
            .then((res) => {
                // Continue flow (e.g. might require verification next)
                if (res.data.continue_with) {
                    // Handle next steps (not implemented fully for simple flow)
                    router.push("/dashboard");
                    return;
                }
                // Success
                router.push("/dashboard");
            })
            .catch((err) => {
                if (err.response?.status === 400) {
                    setFlow(err.response.data);
                    return;
                }
                console.error(err);
            });
    };

    const handleSocialRegister = (provider: string) => {
        if (!flow) return;

        // Find CSRF token
        const nodes = flow.ui.nodes;
        const csrfNode = nodes.find((n: any) => n.attributes.name === "csrf_token");
        const csrfToken = (csrfNode?.attributes as any)?.value;

        kratos.updateRegistrationFlow({
            flow: flow.id,
            updateRegistrationFlowBody: {
                method: "oidc",
                provider: provider,
                csrf_token: csrfToken,
            } as UpdateRegistrationFlowBody
        }).then(({ data }: any) => {
            if (data.redirect_browser_to) {
                window.location.href = data.redirect_browser_to;
            } else if (data.redirect_to) {
                window.location.href = data.redirect_to;
            } else {
                window.location.href = "/dashboard";
            }
        }).catch((err) => {
            console.error("Social registration failed", err);
            if (err.response?.data?.redirect_browser_to) {
                window.location.href = err.response.data.redirect_browser_to;
                return;
            }
            if (err.response?.status === 400 || err.response?.status === 422) {
                setFlow(err.response.data);
                return;
            }
            if (err.response?.status === 410 || err.response?.status === 404) {
                window.location.href = "/register";
            }
        });
    };

    if (!flow) return <div className="flex justify-center p-8">Loading...</div>;

    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Create an Account</CardTitle>
                    <CardDescription>Register to access the platform. You may need approval.</CardDescription>
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
                        nodes={flow.ui.nodes.filter((n: any) => n.group !== 'oidc' && n.attributes.name !== 'provider')}
                        isLoading={false}
                        onSubmit={onSubmit}
                    />

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
                                label="Sign up with Google"
                                onLogin={() => handleSocialRegister("google")}
                            />
                        </div>
                    </div>

                    <div className="mt-4 text-center text-sm">
                        <Link href="/login" className="underline">
                            Already have an account? Sign in
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default function RegisterPage() {
    return (
        <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
            <RegisterForm />
        </Suspense>
    );
}
