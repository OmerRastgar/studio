'use server';

/**
 * @fileOverview Generates a report section using AI based on provided evidence and observations.
 *
 * - generateReportSection - A function that triggers the report section generation flow.
 * - GenerateReportSectionInput - The input type for the generateReportSection function.
 * - GenerateReportSectionOutput - The return type for the generateReportSection function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateReportSectionInputSchema = z.object({
  evidence: z
    .string()
    .describe('A summary of the evidence to be included in the report section.'),
  observations: z
    .string()
    .describe('The auditor\'s observations related to the evidence.'),
  reportSectionTitle: z.string().optional().describe("The title of the report section, if one is desired."),
});

export type GenerateReportSectionInput = z.infer<
  typeof GenerateReportSectionInputSchema
>;

const GenerateReportSectionOutputSchema = z.object({
  reportSection: z
    .string()
    .describe('The generated report section text.'),
});

export type GenerateReportSectionOutput = z.infer<
  typeof GenerateReportSectionOutputSchema
>;

export async function generateReportSection(
  input: GenerateReportSectionInput
): Promise<GenerateReportSectionOutput> {
  return generateReportSectionFlow(input);
}

const generateReportSectionPrompt = ai.definePrompt({
  name: 'generateReportSectionPrompt',
  input: {schema: GenerateReportSectionInputSchema},
  output: {schema: GenerateReportSectionOutputSchema},
  prompt: `You are an expert audit report writer.

  Based on the evidence and observations provided, generate a comprehensive and well-written report section.
  Incorporate the key findings from the evidence and the auditor\'s insights from the observations.
  If a title is provided, use it as the heading for the report section. If no title is provided, generate one from the evidence and observations provided.

  Evidence: {{{evidence}}}
  Observations: {{{observations}}}
  {{#if reportSectionTitle}}Title: {{{reportSectionTitle}}}{{/if}}`,
});

const generateReportSectionFlow = ai.defineFlow(
  {
    name: 'generateReportSectionFlow',
    inputSchema: GenerateReportSectionInputSchema,
    outputSchema: GenerateReportSectionOutputSchema,
  },
  async input => {
    const {output} = await generateReportSectionPrompt(input);
    return output!;
  }
);
