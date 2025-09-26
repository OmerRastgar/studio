'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { generateReportSection } from '@/ai/flows/generate-report-section';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Bot, Clipboard, Loader2, Sparkles, FileQuestion } from 'lucide-react';

const formSchema = z.object({
  evidence: z.string().min(10, 'Evidence must be at least 10 characters.'),
  observations: z.string().min(10, 'Observations must be at least 10 characters.'),
  reportSectionTitle: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

const sampleData: FormData = {
  evidence: "Log files from the production database server (db-prod-01) show that the 'audit_log' table has row-level security enabled, restricting access based on user roles. Specifically, only users with the 'auditor' role can view all logs, while application users can only see their own actions.",
  observations: "The implementation of RLS on the audit log table is a significant security control. This correctly enforces the principle of least privilege. The configuration appears correct and was validated by attempting to query the table with a non-auditor test user, which returned an empty result set as expected.",
  reportSectionTitle: "Database Audit Log Security"
};

export default function ReportsPage() {
  const [generatedReport, setGeneratedReport] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      evidence: '',
      observations: '',
      reportSectionTitle: '',
    },
  });

  const watchedFields = form.watch(['evidence', 'observations', 'reportSectionTitle']);
  useEffect(() => {
    setGeneratedReport('');
  }, [watchedFields]);

  const handleGenerateReport = async (data: FormData) => {
    setIsLoading(true);
    setGeneratedReport('');
    try {
      const result = await generateReportSection(data);
      setGeneratedReport(result.reportSection);
      toast({
        title: 'Report Section Generated',
        description: 'The AI has successfully generated the report section.',
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error Generating Report',
        description: 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyToClipboard = () => {
    if (!generatedReport) return;
    navigator.clipboard.writeText(generatedReport);
    toast({
      title: 'Copied to Clipboard',
      description: 'The generated report has been copied.',
    });
  };

  const loadSampleData = () => {
    form.reset(sampleData);
    toast({
      title: 'Sample Data Loaded',
      description: 'The input fields have been populated with sample data.',
    });
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
                <CardTitle className="font-headline">Input Data</CardTitle>
                <CardDescription>Provide evidence and observations for the AI.</CardDescription>
            </div>
            <Button variant="secondary" size="sm" onClick={loadSampleData}>
                <FileQuestion className="mr-2 h-4 w-4" />
                Load Sample
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleGenerateReport)} className="space-y-6">
               <FormField
                control={form.control}
                name="reportSectionTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Report Section Title (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Q2 Firewall Compliance Analysis"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="evidence"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Evidence Summary</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., Log files from server X show multiple failed login attempts from IP 192.168.1.100 between 2:00 AM and 3:00 AM..."
                        className="min-h-[150px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="observations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Auditor's Observations</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., The failed attempts appear to be a brute-force attack. The account targeted was 'admin'. Recommend immediate password rotation and IP block..."
                        className="min-h-[150px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Report Section
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle className="font-headline">AI-Generated Report Section</CardTitle>
          <CardDescription>Review, edit, and approve the generated content.</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col">
          {isLoading ? (
            <div className="flex-grow flex flex-col items-center justify-center text-muted-foreground space-y-4">
              <Bot className="h-12 w-12 animate-pulse" />
              <p className="font-medium">AI is generating your report...</p>
              <p className="text-sm text-center">This may take a few moments.</p>
            </div>
          ) : generatedReport ? (
            <div className="flex flex-col h-full">
                <div className="relative flex-grow">
                    <pre className="p-4 rounded-md bg-muted/50 whitespace-pre-wrap font-body text-sm h-full overflow-y-auto max-h-[340px]">
                        {generatedReport}
                    </pre>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={handleCopyToClipboard}
                    >
                        <Clipboard className="h-4 w-4" />
                    </Button>
                </div>
              <div className="flex gap-2 mt-4">
                <Button className="w-full">Approve & Save</Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={form.handleSubmit(handleGenerateReport)}
                >
                  Regenerate
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center text-muted-foreground bg-muted/20 rounded-lg border-2 border-dashed">
                <Bot className="h-12 w-12" />
                <p className="mt-4 font-medium">Your report will appear here.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
