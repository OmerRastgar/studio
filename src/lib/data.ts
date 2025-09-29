import type { Evidence, AuditLog, Project, Auditor, UserProfile, Agent, Course, CustomerCourse } from '@/lib/types';
import { 
  getProjects,
  getUsers,
  getAuditors,
  getAgents,
  getEvidence,
  getAuditLogs,
  getCourses,
  getCustomerCourses,
  getDashboardStats,
  getComplianceProgress,
  getActivityChartData
} from '@/lib/db-services';


// Database-backed data exports
export const mockProjects = getProjects();
export const mockUsers = getUsers();
export const mockAuditors = getAuditors();
export const mockAgents = getAgents();
export const mockEvidence = getEvidence();
export const mockAuditLogs = getAuditLogs();

export const dashboardStats = getDashboardStats();
export const activityChartData = getActivityChartData();
export const complianceProgress = getComplianceProgress();

export const mockLearningData = {
  performanceStats: {
    issuesFlagged: 24,
    resolutionRate: 82,
    avgTimeToResolution: '2.5 days',
    overdueFlags: 3,
  },
  commonErrors: [
    { error: 'Vague Observation', count: 8 },
    { error: 'Missing Evidence', count: 6 },
    { error: 'Evidence Mismatch', count: 4 },
    { error: 'Policy Misinterpretation', count: 3 },
    { error: 'Other', count: 3 },
  ],
  learningInsights: [
    {
      title: 'Writing Clearer Observations',
      explanation: 'Observations that are too general make it difficult to verify compliance. They should be specific and directly reference the control requirements.',
      example: 'Vague: "Access controls are in place." Better: "User access to the production database is restricted to authorized personnel, as verified by a review of IAM roles on 2023-10-26."',
      suggestion: 'When writing an observation, ask yourself if another auditor could understand the exact state of the control without any additional context. Always link to the specific evidence that supports your finding.',
    },
    {
      title: 'Ensuring Evidence Sufficiency',
      explanation: 'An observation must be backed by sufficient evidence. Claiming a control is met without providing proof is a common gap.',
      example: 'Observation: "All employees completed security training." Evidence: (None provided).',
      suggestion: 'Before finalizing a report row, double-check that at least one piece of relevant evidence is linked. If evidence is missing, flag the row and request it through the evidence management system.',
    },
    {
      title: 'Aligning Evidence with Observations',
      explanation: 'The linked evidence must directly support the claim made in the observation. Mismatched evidence can invalidate a finding.',
      example: 'Observation: "Databases are encrypted." Evidence: "Screenshot of a firewall configuration."',
      suggestion: 'Use the AI QA tool to check for mismatches. The tool analyzes evidence tags and content to suggest more relevant files from the evidence locker.',
    },
  ],
  recommendedCourses: getCourses()
};

export const mockCustomerCourses = getCustomerCourses();
