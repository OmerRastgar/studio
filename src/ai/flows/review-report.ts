'use server';

/**
 * @fileOverview A flow for reviewing an entire audit report for quality and consistency.
 *
 * - reviewReport - A function that triggers the report review flow.
 * - ReviewReportInput - The input type for the reviewReport function.
 * - ReviewReportOutput - The return type for the reviewReport function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ReportRowSchema = z.object({
  id: z.string().describe('The unique identifier for the report row.'),
  control: z.string().describe('The security control being audited.'),
  observation: z
    .string()
    .describe("The auditor's observation for the control."),
  evidence: z.array(z.string()).describe('A list of evidence names linked to the observation.'),
});

const ReviewReportInputSchema = z.object({
  reportRows: z
    .array(ReportRowSchema)
    .describe('An array of rows from the audit report.'),
});

const ReportIssueSchema = z.object({
  rowId: z.string().describe('The ID of the report row where the issue was found.'),
  issue: z.string().describe('A description of the issue found.'),
  suggestion: z
    .string()
    .describe('A suggestion to fix the issue.'),
});

const ReviewReportOutputSchema = z.object({
  summary: z.string().describe('An overall summary of the report quality.'),
  issues: z
    .array(ReportIssueSchema)
    .describe('A list of issues found in the report.'),
});

export type ReviewReportInput = z.infer<typeof ReviewReportInputSchema>;
export type ReviewReportOutput = z.infer<typeof ReviewReportOutputSchema>;

export async function reviewReport(
  input: ReviewReportInput
): Promise<ReviewReportOutput> {
  return reviewReportFlow(input);
}

const reviewReportPrompt = ai.definePrompt({
  name: 'reviewReportPrompt',
  input: { schema: z.object({ reportJson: z.string() }) },
  output: { schema: ReviewReportOutputSchema },
  prompt: `You are an expert lead auditor responsible for quality assurance.
    Your task is to review the provided audit report data.

    Analyze each row of the report, which contains a control, an auditor's observation, and a list of linked evidence.

    Your review should focus on:
    1.  **Clarity and Specificity**: Are the observations clear, concise, and specific? Or are they vague and ambiguous?
    2.  **Consistency**: Do the observations logically align with the control they are meant to address?
    3.  **Evidence Support**: Does the provided evidence seem relevant and sufficient to support the observation? Flag any observations that lack evidence.
    4.  **Completeness**: Are there any obvious gaps in the report or observations that seem incomplete?

    For each issue you find, you must provide the 'rowId' of the problematic row, a clear 'issue' description, and a constructive 'suggestion' for how to improve it.

    Finally, provide a brief 'summary' of your overall findings on the report's quality.

    Here is the report data to review:
    \`\`\`json
    {{{reportJson}}}
    \`\`\`
    `,
});

const reviewReportFlow = ai.defineFlow(
  {
    name: 'reviewReportFlow',
    inputSchema: ReviewReportInputSchema,
    outputSchema: ReviewReportOutputSchema,
  },
  async (input) => {
    const reportJson = JSON.stringify(input.reportRows, null, 2);
    const { output } = await reviewReportPrompt({ reportJson });
    return output!;
  }
);
