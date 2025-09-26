
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ThemeSwitcher } from '@/components/theme-toggle';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plug, Server, KeyRound, Bot } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useState } from 'react';

function ProfileSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Profile</CardTitle>
        <CardDescription>Manage your public profile and account settings.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <Input id="name" defaultValue="Admin Auditor" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" defaultValue="admin@cybergaar.com" />
        </div>
        <Button>Save Changes</Button>
      </CardContent>
    </Card>
  );
}

function AppearanceSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Appearance</CardTitle>
        <CardDescription>Customize the look and feel of the application.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Theme</Label>
          <p className='text-sm text-muted-foreground'>Select the theme for the dashboard.</p>
        </div>
        <ThemeSwitcher />
      </CardContent>
    </Card>
  );
}

function ApiKeysSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">API Keys</CardTitle>
        <CardDescription>Manage your API keys for integrations.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center p-3 bg-muted/50 rounded-md">
          <div>
            <p className="font-mono text-sm">prod_************************1234</p>
            <p className="text-xs text-muted-foreground">Last used: 2 hours ago</p>
          </div>
          <Button variant="destructive" size="sm">
            Revoke
          </Button>
        </div>
        <Button>Generate New Key</Button>
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
                    <Input id="kong-proxy-url" placeholder="http://localhost:8000" aria-label="Kong Proxy URL input" />
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


export default function SettingsPage() {
  return (
    <Tabs defaultValue="profile" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="appearance">Appearance</TabsTrigger>
        <TabsTrigger value="api-keys">API Keys</TabsTrigger>
        <TabsTrigger value="integrations">
            <Plug className="mr-2 h-4 w-4"/>
            Integrations
        </TabsTrigger>
      </TabsList>
      <TabsContent value="profile">
        <ProfileSettings />
      </TabsContent>
      <TabsContent value="appearance">
        <AppearanceSettings />
      </TabsContent>
      <TabsContent value="api-keys">
        <ApiKeysSettings />
      </TabsContent>
      <TabsContent value="integrations">
        <IntegrationsSettings />
      </TabsContent>
    </Tabs>
  );
}

    