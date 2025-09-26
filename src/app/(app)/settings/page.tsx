'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ThemeSwitcher } from '@/components/theme-toggle';

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
          <Input id="email" type="email" defaultValue="admin@auditgar.com" />
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

export default function SettingsPage() {
  return (
    <Tabs defaultValue="profile" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="appearance">Appearance</TabsTrigger>
        <TabsTrigger value="api-keys">API Keys</TabsTrigger>
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
    </Tabs>
  );
}
