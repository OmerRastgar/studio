
'use client';

import { Suspense, useEffect, useState } from "react";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plug, Server, KeyRound, Bot, Trash2, Shield, Smartphone, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { useRouter, useSearchParams } from 'next/navigation';
import { UiNode, SettingsFlow } from '@ory/client';
import { kratos } from '@/lib/kratos';
import { FlowNodes } from '@/components/auth/FlowNodes';
import { useAuth } from '@/components/auth/kratos-auth-provider';

function ProfileSettings() {
  const [certifications, setCertifications] = useState(['CISA', 'CISSP']);
  const [newCert, setNewCert] = useState('');

  const handleAddCert = () => {
    if (newCert && !certifications.includes(newCert)) {
      setCertifications([...certifications, newCert]);
      setNewCert('');
    }
  };

  const handleRemoveCert = (certToRemove: string) => {
    setCertifications(certifications.filter(cert => cert !== certToRemove));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Profile</CardTitle>
        <CardDescription>Manage your public profile and professional information.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <Input id="name" defaultValue="Admin Auditor" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" defaultValue="admin@cybergaar.com" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea id="bio" placeholder="Tell us a little about yourself" defaultValue="Experienced lead auditor with a decade of experience in cybersecurity and compliance for SaaS companies." />
        </div>
        <div className="space-y-2">
          <Label htmlFor="previous-career">Previous Career</Label>
          <Textarea id="previous-career" placeholder="Describe your previous roles and experience" defaultValue="Senior Security Engineer at TechCorp, focusing on infrastructure security and threat modeling." />
        </div>
        <div className="space-y-4">
          <Label>Certifications</Label>
          <div className="flex flex-wrap gap-2">
            {certifications.map(cert => (
              <Badge key={cert} variant="secondary" className="flex items-center gap-2">
                {cert}
                <button onClick={() => handleRemoveCert(cert)} className="rounded-full hover:bg-muted-foreground/20 p-0.5">
                  <Trash2 className="h-3 w-3" />
                  <span className="sr-only">Remove {cert}</span>
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newCert}
              onChange={(e) => setNewCert(e.target.value)}
              placeholder="e.g., CISM"
            />
            <Button onClick={handleAddCert} variant="outline">Add</Button>
          </div>
        </div>
        <Button>Save Changes</Button>
      </CardContent>
    </Card>
  );
}


function IntegrationsSettings() {
  const [aiProvider, setAiProvider] = useState('gemini');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Integrations</CardTitle>
        <CardDescription>Connect and configure external services for your organization.</CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" defaultValue={['minio']} className="w-full">
          {/* MinIO Storage Section */}
          <AccordionItem value="minio">
            <AccordionTrigger>
              <div className='flex items-center gap-2'>
                <Server />
                <span className='font-semibold'>MinIO Storage</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 p-2">
              <div className="space-y-2">
                <Label htmlFor="minio-url">MinIO URL</Label>
                <Input id="minio-url" placeholder="https://minio.example.com:9000" aria-label="MinIO URL input" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minio-access-key">Access Key</Label>
                <Input id="minio-access-key" placeholder="YourMinioAccessKey" aria-label="MinIO Access Key input" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minio-secret-key">Secret Key</Label>
                <Input id="minio-secret-key" type="password" placeholder="••••••••••••••••" aria-label="MinIO Secret Key input" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minio-bucket">Bucket Name</Label>
                <Input id="minio-bucket" defaultValue="cybergaar-evidence" aria-label="MinIO Bucket Name input" />
              </div>
              <div className='flex justify-between items-center'>
                <Button variant="outline">Test Connection</Button>
                <Button>Save MinIO Settings</Button>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Kong API Gateway Section */}
          <AccordionItem value="kong">
            <AccordionTrigger>
              <div className='flex items-center gap-2'>
                <KeyRound />
                <span className='font-semibold'>Kong API Gateway</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 p-2">
              <div className='flex justify-end'>
                <Badge variant="destructive">Not Connected</Badge>
              </div>
              <div className="space-y-2">
                <Label htmlFor="kong-admin-url">Admin URL</Label>
                <Input id="kong-admin-url" placeholder="https://kong-admin.example.com:8001" aria-label="Kong Admin URL input" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="kong-proxy-url">Proxy URL (Optional)</Label>
                <Input id="kong-proxy-url" placeholder="" aria-label="Kong Proxy URL input" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="kong-admin-token">Admin Token (Optional)</Label>
                <Input id="kong-admin-token" type="password" placeholder="••••••••••••••••" aria-label="Kong Admin Token input" />
              </div>
              <div className='flex justify-between items-center'>
                <Button variant="outline">Test Connection</Button>
                <Button>Save Kong Settings</Button>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* AI Providers Section */}
          <AccordionItem value="ai-providers">
            <AccordionTrigger>
              <div className='flex items-center gap-2'>
                <Bot />
                <span className='font-semibold'>AI Providers</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 p-2">
              <div className="space-y-2">
                <Label htmlFor="ai-provider-select">AI Provider</Label>
                <Select value={aiProvider} onValueChange={setAiProvider}>
                  <SelectTrigger id="ai-provider-select" aria-label="Select AI Provider">
                    <SelectValue placeholder="Select an AI Provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gemini">Google Gemini</SelectItem>
                    <SelectItem value="openai">OpenAI GPT</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {aiProvider === 'gemini' && (
                <div className='space-y-4'>
                  <div className="space-y-2">
                    <Label htmlFor="gemini-api-key">API Key</Label>
                    <Input id="gemini-api-key" type="password" placeholder="AIzaSy..." aria-label="Gemini API Key input" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gemini-custom-url">Custom URL (Optional)</Label>
                    <Input id="gemini-custom-url" placeholder="https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro" aria-label="Gemini Custom URL input" />
                  </div>
                </div>
              )}

              {aiProvider === 'openai' && (
                <div className='space-y-4'>
                  <div className="space-y-2">
                    <Label htmlFor="openai-api-key">API Key</Label>
                    <Input id="openai-api-key" type="password" placeholder="sk-..." aria-label="OpenAI API Key input" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="openai-model">Model</Label>
                    <Select defaultValue="gpt-4o">
                      <SelectTrigger id="openai-model" aria-label="Select OpenAI Model">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gpt-4o">gpt-4o</SelectItem>
                        <SelectItem value="gpt-4-turbo">gpt-4-turbo</SelectItem>
                        <SelectItem value="gpt-3.5-turbo">gpt-3.5-turbo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="openai-custom-url">Custom URL (Optional)</Label>
                    <Input id="openai-custom-url" placeholder="https://api.openai.com/v1" aria-label="OpenAI Custom URL input" />
                  </div>
                </div>
              )}

              {aiProvider === 'custom' && (
                <div className='space-y-4'>
                  <div className="space-y-2">
                    <Label htmlFor="custom-provider-name">Provider Name</Label>
                    <Input id="custom-provider-name" placeholder="My AI Provider" aria-label="Custom AI Provider Name input" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="custom-api-key">API Key</Label>
                    <Input id="custom-api-key" type="password" placeholder="••••••••••••••••" aria-label="Custom AI API Key input" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="custom-base-url">Base URL</Label>
                    <Input id="custom-base-url" placeholder="https://my-ai-provider.com/api" aria-label="Custom AI Base URL input" />
                  </div>
                </div>
              )}

              <div className='flex justify-between items-center'>
                <Button variant="outline">Test Connection</Button>
                <Button>Save AI Settings</Button>
              </div>

              <Alert>
                <Bot className="h-4 w-4" />
                <AlertTitle>Auto-Classify Evidence</AlertTitle>
                <AlertDescription>
                  Configure your AI to auto-classify diverse evidence (PDFs, images, logs, spreadsheets) for instant control matching.
                  <Button variant="link" className="p-0 h-auto ml-1">Learn More</Button>
                </AlertDescription>
              </Alert>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}

function SecuritySettings() {
  const [flow, setFlow] = useState<SettingsFlow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();


  // Initialize Settings Flow
  useEffect(() => {
    async function initFlow() {
      try {
        const { data } = await kratos.createBrowserSettingsFlow();
        setFlow(data);
      } catch (err: any) {
        if (err.response?.status === 401) {
          // Instead of auto-redirect, show session expired
          setFlow(null); // Clear flow
          console.warn("SecuritySettings: 401 Unauthorized during init.");
        } else if (err.response?.status === 403) {
          // Privileged session required.
          setFlow(null);
          console.warn("SecuritySettings: 403 Privileged Session Required.");
        } else {
          console.error("Failed to init settings flow", err);
        }
      } finally {
        setIsLoading(false);
      }
    }
    initFlow();
  }, [router]);

  // Render Session Error / Privilege Error State
  if (!isLoading && !flow) {
    return (
      <div className="p-6 text-center border rounded-lg bg-muted/50">
        <h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
        <p className="text-muted-foreground mb-4">
          To change your security settings, you need to verify your identity again.
        </p>
        <Button
          onClick={() => {
            // Force re-auth flow
            const returnTo = encodeURIComponent('/settings?tab=security');
            window.location.href = "/login?refresh=true&return_to=" + returnTo;
          }}
        >
          <Lock className="w-4 h-4 mr-2" />
          Verify Identity
        </Button>
      </div>
    );
  }

  // Force Change Alert
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const isForceChange = searchParams?.get('reason') === 'force_change' || user?.forcePasswordChange;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flow) return;

    setIsLoading(true);
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const body = Object.fromEntries(formData);
    const submitter = (e.nativeEvent as any).submitter as HTMLButtonElement;
    if (submitter && submitter.name) {
      body[submitter.name] = submitter.value;
    }

    try {
      const { data } = await kratos.updateSettingsFlow({
        flow: flow.id,
        updateSettingsFlowBody: body as any
      });
      setFlow(data);

      // Check if password change was successful (no error messages and state is success-like or just check flow messages)
      // Usually Kratos returns 'success' message.
      const hasSuccess = data.ui.messages?.some(m => m.type === 'success');
      if (hasSuccess) {
        // If we were in force change mode, ack it
        if (isForceChange) {
          await fetch('/api/users/ack-password-change', { method: 'POST' });
          // Redirect to dashboard to clear params and re-check
          router.push('/dashboard');
        }
      }

    } catch (err: any) {
      if (err.response?.status === 400) {
        setFlow(err.response.data);
      } else {
        console.error("Settings update failed", err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !flow) {
    return <div className="p-4">Loading security settings...</div>;
  }

  // Filter Nodes
  const nodes = flow.ui.nodes;
  const csrfNode = nodes.find((n: UiNode) => (n.attributes as any).name === 'csrf_token');

  // Create safe node sets containing CSRF for each independent form
  const safePasswordNodes = [...nodes.filter((n: UiNode) => n.group === 'password')];
  const safeTotpNodes = [...nodes.filter((n: UiNode) => n.group === 'totp')];
  if (csrfNode) {
    if (!safePasswordNodes.find(n => (n.attributes as any).name === 'csrf_token')) safePasswordNodes.push(csrfNode);
    if (!safeTotpNodes.find(n => (n.attributes as any).name === 'csrf_token')) safeTotpNodes.push(csrfNode);
  }

  return (
    <div className="space-y-6">
      {/* Password Change Section */}
      <Card>
        <CardHeader>
          <CardTitle className="font-headline flex items-center gap-2">
            <Lock className="w-5 h-5" /> Change Password
          </CardTitle>
          <CardDescription>Update your password to keep your account secure.</CardDescription>
        </CardHeader>
        <CardContent>
          {isForceChange && (
            <Alert variant="destructive" className="mb-6">
              <AlertTitle>Action Required</AlertTitle>
              <AlertDescription>
                You must change your password before you can continue using the platform.
              </AlertDescription>
            </Alert>
          )}
          {/* Success/Error Messages for flow */}
          {flow.ui.messages?.map(msg => (
            <Alert key={msg.id} variant={msg.type === 'error' ? 'destructive' : 'default'} className="mb-4">
              <AlertTitle>{msg.type === 'error' ? 'Error' : 'Success'}</AlertTitle>
              <AlertDescription>{msg.text}</AlertDescription>
            </Alert>
          ))}

          <FlowNodes
            nodes={safePasswordNodes}
            isLoading={isLoading}
            onSubmit={handleSubmit}
          />
        </CardContent>
      </Card>

      {/* 2FA Section */}
      <Card>
        <CardHeader>
          <CardTitle className="font-headline flex items-center gap-2">
            <Smartphone className="w-5 h-5" /> Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            Add an extra layer of security to your account using an authenticator app.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* If no TOTP nodes found, show message (maybe enabled already? Kratos flow usually shows lookup secrets/disable options if enabled) */}
          {safeTotpNodes.length === 0 ? <p>TOTP is not configured or available.</p> :
            <FlowNodes
              nodes={safeTotpNodes}
              isLoading={isLoading}
              onSubmit={handleSubmit}
            />
          }
        </CardContent>
      </Card>
    </div>
  );
}


function SettingsContent() {
  const searchParams = useSearchParams();
  const { user } = useAuth();

  // Compliance users default to security, others to profile
  const defaultTab = user?.role === 'compliance' ? 'security' : (searchParams.get('tab') || 'profile');

  // If compliance, only show security tab (password reset)
  if (user?.role === 'compliance') {
    return (
      <div className="w-full">
        <h2 className="text-2xl font-bold mb-4 font-headline">Security Settings</h2>
        <SecuritySettings />
      </div>
    );
  }

  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="integrations">
          <Plug className="mr-2 h-4 w-4" />
          Integrations
        </TabsTrigger>
        <TabsTrigger value="security">
          <Shield className="mr-2 h-4 w-4" />
          Security
        </TabsTrigger>
      </TabsList>
      <TabsContent value="profile">
        <ProfileSettings />
      </TabsContent>
      <TabsContent value="integrations">
        <IntegrationsSettings />
      </TabsContent>
      <TabsContent value="security">
        <SecuritySettings />
      </TabsContent>
    </Tabs>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <SettingsContent />
    </Suspense>
  );
}
