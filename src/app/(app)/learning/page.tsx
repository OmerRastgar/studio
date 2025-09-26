'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LearningPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Learning Center</CardTitle>
        <CardDescription>
          Your hub for training materials, compliance guides, and best practices.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">Learning content coming soon...</p>
        </div>
      </CardContent>
    </Card>
  );
}
