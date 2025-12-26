'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SettingsFlow } from '@ory/client';
import { kratos } from '@/lib/kratos';
import { FlowNodes } from '@/components/auth/FlowNodes';
import { Lock, CheckCircle } from 'lucide-react';

export default function ComplianceResetPasswordPage() {
    const [flow, setFlow] = useState<SettingsFlow | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const router = useRouter();

    console.log("[ComplianceResetPassword] Component mounted");

    // Initialize Settings Flow
    useEffect(() => {
        console.log("[ComplianceResetPassword] useEffect triggered");
        async function initFlow() {
            try {
                console.log("[ComplianceResetPassword] Initializing settings flow...");
                const { data } = await kratos.createBrowserSettingsFlow();
                console.log("[ComplianceResetPassword] Flow created successfully:", data.id);
                setFlow(data);
                setError(null);
            } catch (err: any) {
                console.error("[ComplianceResetPassword] Failed to init password reset flow", err);
                setError("Unable to load password reset form. Please try again or contact support.");
            } finally {
                setIsLoading(false);
            }
        }
        initFlow();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!flow) return;

        setIsLoading(true);
        setError(null);

        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        const body = Object.fromEntries(formData);

        const submitter = (e.nativeEvent as any).submitter as HTMLButtonElement;
        if (submitter && submitter.name) {
            body[submitter.name] = submitter.value;
        }

        console.log("[ComplianceResetPassword] Submitting password update:", { flowId: flow.id, body });

        try {
            const { data } = await kratos.updateSettingsFlow({
                flow: flow.id,
                updateSettingsFlowBody: body as any
            });

            console.log("[ComplianceResetPassword] Kratos response:", data);
            console.log("[ComplianceResetPassword] UI messages:", data.ui.messages);
            console.log("[ComplianceResetPassword] UI nodes:", data.ui.nodes);
            console.log("[ComplianceResetPassword] Flow state:", data.state);

            // Check if password was successfully updated
            // Kratos sets state to "success" when settings update succeeds
            const isSuccess = data.state === 'success';
            const hasSuccessMessage = data.ui.messages?.some(msg =>
                (msg.type === 'info' || msg.type === 'success') &&
                (msg.text.toLowerCase().includes('password') || msg.text.toLowerCase().includes('settings') || msg.text.toLowerCase().includes('saved'))
            );

            console.log("[ComplianceResetPassword] Is success state:", isSuccess);
            console.log("[ComplianceResetPassword] Has success message:", hasSuccessMessage);

            if (isSuccess || hasSuccessMessage) {
                console.log("[ComplianceResetPassword] Password updated successfully!");
                setSuccess(true);

                // Force JWT token refresh before redirecting
                console.log("[ComplianceResetPassword] Refreshing JWT token...");
                try {
                    const tokenRes = await fetch('/api/auth/token', {
                        method: 'POST',
                        credentials: 'include'
                    });

                    if (tokenRes.ok) {
                        const tokenData = await tokenRes.json();
                        localStorage.setItem('auth_token', tokenData.token);
                        console.log("[ComplianceResetPassword] JWT token refreshed successfully");
                    } else {
                        console.warn("[ComplianceResetPassword] Failed to refresh token, clearing old token");
                        localStorage.removeItem('auth_token');
                    }
                } catch (tokenErr) {
                    console.error("[ComplianceResetPassword] Token refresh error:", tokenErr);
                    localStorage.removeItem('auth_token');
                }

                // Redirect to dashboard after token refresh
                setTimeout(() => {
                    router.push('/dashboard');
                }, 2000);
            } else {
                console.log("[ComplianceResetPassword] No success detected, updating flow");
                setFlow(data);
            }
        } catch (err: any) {
            console.error("[ComplianceResetPassword] Error during password update:", err);
            console.error("[ComplianceResetPassword] Error response:", err.response);
            if (err.response?.status === 400) {
                console.log("[ComplianceResetPassword] 400 error, updating flow with:", err.response.data);
                setFlow(err.response.data);
            } else {
                console.error("[ComplianceResetPassword] Password update failed", err);
                setError("Failed to update password. Please try again.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
                <Card className="w-full max-w-md">
                    <CardContent className="pt-6 text-center">
                        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold mb-2">Password Updated!</h2>
                        <p className="text-muted-foreground mb-4">
                            Your password has been successfully changed. Redirecting to dashboard...
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Lock className="w-5 h-5" />
                        Reset Your Password
                    </CardTitle>
                    <CardDescription>
                        Create a new password for your compliance account.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {error && (
                        <Alert variant="destructive" className="mb-4">
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {isLoading && !flow ? (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                            <p className="mt-4 text-muted-foreground">Loading password reset form...</p>
                        </div>
                    ) : flow ? (
                        <>
                            {/* Display Kratos flow messages */}
                            {flow.ui.messages?.map(msg => (
                                <Alert key={msg.id} variant={msg.type === 'error' ? 'destructive' : 'default'} className="mb-4">
                                    <AlertTitle>{msg.type === 'error' ? 'Error' : 'Info'}</AlertTitle>
                                    <AlertDescription>{msg.text}</AlertDescription>
                                </Alert>
                            ))}

                            {/* Only show password-related nodes */}
                            <FlowNodes
                                nodes={flow.ui.nodes.filter((n: any) =>
                                    n.group === 'password' || (n.attributes as any).name === 'csrf_token'
                                )}
                                isLoading={isLoading}
                                onSubmit={handleSubmit}
                            />
                        </>
                    ) : null}
                </CardContent>
            </Card>
        </div>
    );
}
