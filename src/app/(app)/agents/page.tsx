'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot } from 'lucide-react';

export default function AgentsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Agents</CardTitle>
        <CardDescription>Manage and monitor your compliance agents.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center h-96 border-2 border-dashed rounded-lg">
          <Bot className="w-24 h-24 text-muted-foreground" />
          <h2 className="mt-6 text-xl font-semibold">Agents Page</h2>
          <p className="mt-2 text-muted-foreground">This section is under construction.</p>
        </div>
      </CardContent>
    </Card>
  );
}
