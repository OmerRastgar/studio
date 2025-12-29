
'use client';

import { Suspense, useEffect, useState } from "react";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plug, Server, KeyRound, Bot, Trash2, Shield, Smartphone, Lock, User, Calendar, MessageSquare, Briefcase } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { useRouter, useSearchParams } from 'next/navigation';
import { UiNode, SettingsFlow } from '@ory/client';
import { kratos } from '@/lib/kratos';
import { FlowNodes } from '@/components/auth/FlowNodes';
import { useAuth } from '@/components/auth/kratos-auth-provider';
import { toast } from 'sonner';

interface Integration {
  provider: string;
  config: any;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  bio?: string;
  role: string;
  avatarUrl?: string;
  integrations: Integration[];
  experience?: string;
  certifications?: string[];
}

function ProfileSettings() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form States
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [experience, setExperience] = useState('');
  const [certifications, setCertifications] = useState<string[]>([]);
  const [newCert, setNewCert] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/profile');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setProfile(data.user);
          setName(data.user.name);
          setBio(data.user.bio || '');
          setExperience(data.user.experience || '');
          setCertifications(data.user.certifications || []);
        }
      }
    } catch (error) {
      console.error("Failed to fetch profile", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          bio,
          experience,
          certifications
        })
      });

      if (res.ok) {
        toast.success("Profile updated successfully");
        fetchProfile(); // Refresh
      } else {
        toast.error("Failed to update profile");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleAddCert = () => {
    if (newCert && !certifications.includes(newCert)) {
      setCertifications([...certifications, newCert]);
      setNewCert('');
    }
  };

  const handleRemoveCert = (certToRemove: string) => {
    setCertifications(certifications.filter(cert => cert !== certToRemove));
  };

  if (loading) return <div>Loading profile...</div>;

  const isAuditor = user?.role === 'auditor';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Profile</CardTitle>
        <CardDescription>Manage your public profile and professional information.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={profile?.email || ''} disabled className="bg-muted" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            placeholder="Tell us a little about yourself"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
        </div>

        {isAuditor && (
          <>
            <div className="space-y-2">
              <Label htmlFor="experience">Experience</Label>
              <Textarea
                id="experience"
                placeholder="Describe your previous roles and experience"
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
              />
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
          </>
        )}

        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </CardContent>
    </Card>
  );
}


function IntegrationsSettings() {
  const { user } = useAuth();
  const [integrations, setIntegrations] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      const res = await fetch('/api/profile');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user.integrations) {
          const map: Record<string, any> = {};
          data.user.integrations.forEach((i: Integration) => {
            map[i.provider] = i.config;
          });
          setIntegrations(map);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const saveIntegration = async (provider: string, config: any) => {
    try {
      const res = await fetch('/api/profile/integrations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, config })
      });
      if (res.ok) {
        toast.success(`${provider} settings saved`);
        fetchIntegrations();
      } else {
        toast.error(`Failed to save ${provider} settings`);
      }
    } catch (e) {
      toast.error('Error saving settings');
    }
  };

  const isAdmin = user?.role === 'admin';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Integrations</CardTitle>
        <CardDescription>Connect and configure external services.</CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" defaultValue={isAdmin ? ['minio'] : ['google']} className="w-full">

          {/* ADMIN ONLY INTEGRATIONS */}
          {isAdmin && (
            <>
              <AccordionItem value="minio">
                <AccordionTrigger>
                  <div className='flex items-center gap-2'>
                    <Server className="w-4 h-4" />
                    <span className='font-semibold'>MinIO Storage</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-2 space-y-4">
                  <IntegrationForm
                    provider="minio"
                    initialConfig={integrations['minio']}
                    videoUrl="https://minio.example.com"
                    fields={[
                      { key: 'url', label: 'MinIO URL', placeholder: 'https://minio.example.com:9000' },
                      { key: 'accessKey', label: 'Access Key', placeholder: 'Access Key' },
                      { key: 'secretKey', label: 'Secret Key', type: 'password', placeholder: ' Secret Key' },
                      { key: 'bucket', label: 'Bucket Name', placeholder: 'evidence' },
                    ]}
                    onSave={saveIntegration}
                  />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="kong">
                <AccordionTrigger>
                  <div className='flex items-center gap-2'>
                    <KeyRound className="w-4 h-4" />
                    <span className='font-semibold'>Kong API Gateway</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-2 space-y-4">
                  <IntegrationForm
                    provider="kong"
                    initialConfig={integrations['kong']}
                    fields={[
                      { key: 'adminUrl', label: 'Admin URL', placeholder: 'https://kong-admin:8001' },
                      { key: 'token', label: 'Admin Token', type: 'password', placeholder: 'Optional' },
                    ]}
                    onSave={saveIntegration}
                  />
                </AccordionContent>
              </AccordionItem>
            </>
          )}

          {/* USER INTEGRATIONS (Everyone) */}
          <AccordionItem value="google">
            <AccordionTrigger>
              <div className='flex items-center gap-2'>
                <Calendar className="w-4 h-4" />
                <span className='font-semibold'>Google Calendar</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-2 space-y-4">
              <div className="text-sm text-muted-foreground mb-2">Connect your Google Calendar to sync meeting events seamlessly.</div>
              <IntegrationForm
                provider="google"
                initialConfig={integrations['google']}
                fields={[
                  { key: 'clientId', label: 'Client ID', placeholder: 'Google OAuth Client ID' },
                  { key: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: 'Google OAuth Client Secret' },
                ]}
                onSave={saveIntegration}
              />
              <Button variant="outline" className="w-full mt-2">
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-4 h-4 mr-2" />
                Sign in with Google
              </Button>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="jira">
            <AccordionTrigger>
              <div className='flex items-center gap-2'>
                <Briefcase className="w-4 h-4" />
                <span className='font-semibold'>Jira</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-2 space-y-4">
              <div className="text-sm text-muted-foreground mb-2">Sync findings and issues to your Jira project.</div>
              <IntegrationForm
                provider="jira"
                initialConfig={integrations['jira']}
                fields={[
                  { key: 'domain', label: 'Jira Domain', placeholder: 'your-company.atlassian.net' },
                  { key: 'email', label: 'Email', placeholder: 'email@example.com' },
                  { key: 'apiToken', label: 'API Token', type: 'password', placeholder: 'Atlassian API Token' },
                ]}
                onSave={saveIntegration}
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="slack">
            <AccordionTrigger>
              <div className='flex items-center gap-2'>
                <MessageSquare className="w-4 h-4" />
                <span className='font-semibold'>Slack</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-2 space-y-4">
              <div className="text-sm text-muted-foreground mb-2">Receive notifications and alerts in Slack channels.</div>
              <IntegrationForm
                provider="slack"
                initialConfig={integrations['slack']}
                fields={[
                  { key: 'webhookUrl', label: 'Webhook URL', placeholder: 'https://hooks.slack.com/services/...' },
                ]}
                onSave={saveIntegration}
              />
            </AccordionContent>
          </AccordionItem>

        </Accordion>
      </CardContent>
    </Card>
  );
}

function IntegrationForm({ provider, initialConfig, fields, onSave, videoUrl }: any) {
  const [config, setConfig] = useState(initialConfig || {});

  useEffect(() => {
    if (initialConfig) setConfig(initialConfig);
  }, [initialConfig]);

  const handleChange = (key: string, value: string) => {
    setConfig({ ...config, [key]: value });
  };

  return (
    <div className="space-y-3">
      {fields.map((f: any) => (
        <div key={f.key} className="space-y-1">
          <Label>{f.label}</Label>
          <Input
            type={f.type || 'text'}
            placeholder={f.placeholder}
            value={config[f.key] || ''}
            onChange={(e) => handleChange(f.key, e.target.value)}
          />
        </div>
      ))}
      <div className="flex justify-between pt-2">
        <Button variant="ghost" size="sm">Test Connection</Button>
        <Button size="sm" onClick={() => onSave(provider, config)}>Save</Button>
      </div>
    </div>
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
  const { user, refreshSession } = useAuth();
  const isForceChange = searchParams?.get('reason') === 'force_change' || user?.forcePasswordChange;

  // Auto-switch to security tab if force change is required
  useEffect(() => {
    if (isForceChange) {
      // Ensure we are on the security tab if forced
      const currentTab = searchParams?.get('tab');
      if (currentTab !== 'security') {
        // Logic handled by Tab defaultValue mostly, but if user navigates manually...
        // We can let them be.
      }
    }
  }, [isForceChange, searchParams]);

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

      // Check if password change was successful
      const hasSuccess = data.ui.messages?.some(m => m.type === 'success');
      if (hasSuccess) {
        // If we were in force change mode, ack it
        if (isForceChange) {
          await fetch('/api/auth/ack-password-change', { method: 'POST' });
          await refreshSession(); // Update local user state immediately
          toast.success("Password updated successfully");
          // Redirect to dashboard to clear params and re-check
          setTimeout(() => {
            router.push('/dashboard');
          }, 1000); // Small delay to let user see the toast and success state
        } else {
          toast.success("Settings updated successfully");
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

  // Inject Confirm Password Node
  const passwordNodeIndex = safePasswordNodes.findIndex(n => (n.attributes as any).name === 'password');
  if (passwordNodeIndex !== -1) {
    const confirmNode: any = {
      type: 'input',
      group: 'password',
      attributes: {
        name: 'confirm_password',
        type: 'password',
        node_type: 'input',
        required: true,
        disabled: false,
        value: ''
      },
      meta: {
        label: {
          text: 'Confirm Password',
          type: 'info'
        }
      },
      messages: []
    };
    safePasswordNodes.splice(passwordNodeIndex + 1, 0, confirmNode);
  }

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
            <Alert variant="destructive" className="mb-6 border-red-600 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-100">
              <AlertTitle className="text-red-900 dark:text-red-100 font-bold">Action Required</AlertTitle>
              <AlertDescription className="text-red-900 dark:text-red-100">
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
            onSubmit={(e) => {
              // Custom validation for confirm password logic
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const formData = new FormData(form);
              const password = formData.get('password') as string;
              const confirmPassword = formData.get('confirm_password') as string;

              if (password && password !== confirmPassword) {
                toast.error("Passwords do not match");
                return;
              }
              // Remove confirm_password before submission to Kratos so it doesn't complain
              // Wait, we can't easily remove it from FormData in the submit event passed down. 
              // We should handle submission here or let handleSubmit handle it but we need to intercept.
              // We are calling handleSubmit directly, so we can check here.
              handleSubmit(e);
            }}
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
    <Tabs defaultValue={searchParams?.get('tab') || 'profile'} className="w-full">
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
