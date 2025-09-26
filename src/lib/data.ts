import type { Evidence, AuditLog, Project, Auditor, UserProfile, Agent, Course, CustomerCourse } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const userAvatar1 = PlaceHolderImages.find(img => img.id === 'user-avatar-1')?.imageUrl || '';
const userAvatar2 = PlaceHolderImages.find(img => img.id === 'user-avatar-2')?.imageUrl || '';
const userAvatar3 = PlaceHolderImages.find(img => img.id === 'user-avatar-3')?.imageUrl || '';

const evidenceThumb1 = PlaceHolderImages.find(img => img.id === 'evidence-thumb-1');
const evidenceThumb2 = PlaceHolderImages.find(img => img.id === 'evidence-thumb-2');
const evidenceThumb3 = PlaceHolderImages.find(img => img.id === 'evidence-thumb-3');
const evidenceThumb4 = PlaceHolderImages.find(img => img.id === 'evidence-thumb-4');
const evidenceThumb5 = PlaceHolderImages.find(img => img.id === 'evidence-thumb-5');
const courseThumbnail = PlaceHolderImages.find(img => img.id === 'course-thumbnail')?.imageUrl || '';


export const mockProjects: Project[] = [
    { id: 'proj-001', name: 'SOC 2 Compliance Audit', customerName: 'Innovate Inc.' },
    { id: 'proj-002', name: 'ISO 27001 Certification', customerName: 'Tech Solutions LLC' },
    { id: 'proj-003', name: 'Internal Security Review', customerName: 'DataSafe Corp' },
];

export const mockUsers: UserProfile[] = [
    {
        name: 'Admin Auditor',
        email: 'admin@auditace.com',
        avatarUrl: 'https://picsum.photos/seed/admin/100/100',
        role: 'admin',
        status: 'Active',
        lastActive: new Date(Date.now() - 3.6e+5).toISOString(), // 6 minutes ago
    },
    {
        name: 'Jane Doe',
        email: 'jane.doe@example.com',
        avatarUrl: userAvatar1,
        role: 'auditor',
        status: 'Active',
        lastActive: new Date(Date.now() - 7.2e+6).toISOString(), // 2 hours ago
    },
    {
        name: 'John Smith',
        email: 'john.smith@example.com',
        avatarUrl: userAvatar2,
        role: 'auditor',
        status: 'Inactive',
        lastActive: new Date(Date.now() - 2.592e+9).toISOString(), // 30 days ago
    },
    {
        name: 'Customer Client',
        email: 'client@customer.com',
        avatarUrl: userAvatar3,
        role: 'customer',
        status: 'Active',
        lastActive: new Date(Date.now() - 8.64e+7).toISOString(), // 1 day ago
    }
];

export const mockAuditors: Auditor[] = [
    {
      id: 'AUD001',
      name: 'Jane Doe',
      avatarUrl: userAvatar1,
      projects: ['SOC 2 Compliance Audit'],
      progress: 75,
      status: 'Active',
      experience: '5 years in cloud security auditing.',
      certifications: ['CISA', 'CISSP'],
    },
    {
      id: 'AUD002',
      name: 'John Smith',
      avatarUrl: userAvatar2,
      projects: ['ISO 27001 Certification', 'Internal Security Review'],
      progress: 40,
      status: 'Delayed',
      experience: '8 years in financial and tech audits.',
      certifications: ['CISM', ' CRISC'],
    },
    {
        id: 'AUD003',
        name: 'Alex Johnson',
        avatarUrl: 'https://picsum.photos/seed/user3/100/100',
        projects: ['SOC 2 Compliance Audit'],
        progress: 90,
        status: 'Active',
        experience: 'Lead auditor with 10+ years of experience.',
        certifications: ['CISA', 'CISM', 'CISSP'],
    },
];

export const mockAgents: Agent[] = [
  {
    id: 'AGENT-001',
    name: 'Primary DC Server',
    platform: 'windows',
    status: 'Active',
    lastSync: new Date(Date.now() - 1.8e+6).toISOString(),
    version: '1.2.3',
  },
  {
    id: 'AGENT-002',
    name: 'Design Team iMac',
    platform: 'macos',
    status: 'Active',
    lastSync: new Date(Date.now() - 3.6e+6).toISOString(),
    version: '1.2.3',
  },
  {
    id: 'AGENT-003',
    name: 'Ubuntu Jenkins Runner',
    platform: 'linux',
    status: 'Inactive',
    lastSync: new Date(Date.now() - 8.64e+7).toISOString(),
    version: '1.1.0',
  },
  {
    id: 'AGENT-004',
    name: 'Staging Web Server',
    platform: 'linux',
    status: 'Pending',
    lastSync: new Date(Date.now() - 6.048e+8).toISOString(),
    version: '1.2.0',
  },
  {
    id: 'AGENT-005',
    name: 'Marketing Laptop',
    platform: 'windows',
    status: 'Active',
    lastSync: new Date(Date.now() - 6e4).toISOString(),
    version: '1.2.3',
  },
];


export const mockEvidence: Evidence[] = [
  {
    id: 'EV001',
    projectId: 'proj-001',
    agentId: 'AGENT-001',
    name: 'Firewall Configuration Review Q2',
    type: 'document',
    tags: ['networking', 'security', 'q2-review'],
    uploadedAt: '2023-06-15T10:30:00Z',
    uploadedBy: 'AGENT-001',
    previewUrl: evidenceThumb1?.imageUrl || '',
    aiHint: evidenceThumb1?.imageHint || 'document',
  },
  {
    id: 'EV002',
    projectId: 'proj-001',
    agentId: 'AGENT-002',
    name: 'Admin Panel Login Attempt Screenshot',
    type: 'screenshot',
    tags: ['access-control', 'security-incident'],
    uploadedAt: '2023-06-14T15:05:00Z',
    uploadedBy: 'AGENT-002',
    previewUrl: evidenceThumb2?.imageUrl || '',
    aiHint: evidenceThumb2?.imageHint || 'screen',
  },
  {
    id: 'EV003',
    projectId: 'proj-002',
    agentId: 'AGENT-003',
    name: 'Production Server Auth Logs (June)',
    type: 'log',
    tags: ['server-logs', 'authentication'],
    uploadedAt: '2023-06-12T09:00:00Z',
    uploadedBy: 'AGENT-003',
    previewUrl: evidenceThumb3?.imageUrl || '',
    aiHint: evidenceThumb3?.imageHint || 'code',
  },
  {
    id: 'EV004',
    projectId: 'proj-002',
    name: 'VPC Network Diagram',
    type: 'network',
    tags: ['architecture', 'networking'],
    uploadedAt: '2023-06-11T11:45:00Z',
    uploadedBy: 'Jane Doe',
    previewUrl: evidenceThumb4?.imageUrl || '',
    aiHint: evidenceThumb4?.imageHint || 'diagram',
  },
  {
    id: 'EV005',
    projectId: 'proj-003',
    name: 'Kubernetes Deployment YAML',
    type: 'config',
    tags: ['kubernetes', 'deployment', 'iac'],
    uploadedAt: '2023-06-10T18:20:00Z',
    uploadedBy: 'John Smith',
    previewUrl: evidenceThumb5?.imageUrl || '',
    aiHint: evidenceThumb5?.imageHint || 'code',
  },
];

export const mockAuditLogs: AuditLog[] = [
  {
    id: 'LOG001',
    user: { name: 'Jane Doe', avatarUrl: userAvatar1 },
    action: 'Generated Report',
    details: 'Generated "Q2 Firewall Compliance" section',
    timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    severity: 'Low',
  },
  {
    id: 'LOG002',
    user: { name: 'John Smith', avatarUrl: userAvatar2 },
    action: 'Uploaded Evidence',
    details: 'Uploaded "Admin Panel Login Attempt Screenshot"',
    timestamp: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
    severity: 'Medium',
  },
  {
    id: 'LOG003',
    user: { name: 'Jane Doe', avatarUrl: userAvatar1 },
    action: 'Updated Profile',
    details: 'Changed profile email',
    timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    severity: 'Medium',
  },
  {
    id: 'LOG004',
    user: { name: 'Admin', avatarUrl: 'https://picsum.photos/seed/admin/100/100' },
    action: 'Changed Settings',
    details: 'Enabled dark mode globally',
    timestamp: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    severity: 'Medium',
  },
  {
    id: 'LOG005',
    user: { name: 'John Smith', avatarUrl: userAvatar2 },
    action: 'Logged In',
    details: 'Successfully authenticated',
    timestamp: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
    severity: 'High',
  },
  {
    id: 'LOG006',
    user: { name: 'AGENT-001', avatarUrl: '' },
    action: 'Uploaded Evidence',
    details: 'Uploaded "Firewall Configuration Review Q2"',
    timestamp: new Date(Date.now() - 345600000).toISOString(), // 4 days ago
    severity: 'Medium',
  },
  {
    id: 'LOG007',
    user: { name: 'Admin', avatarUrl: 'https://picsum.photos/seed/admin/100/100' },
    action: 'Permission Change',
    details: 'Granted "auditor" role to user test@example.com',
    timestamp: new Date(Date.now() - 432000000).toISOString(), // 5 days ago
    severity: 'High',
  },
  {
    id: 'LOG008',
    user: { name: 'Jane Doe', avatarUrl: userAvatar1 },
    action: 'Generated Report',
    details: 'Generated "User Access Review" section',
    timestamp: new Date(Date.now() - 518400000).toISOString(), // 6 days ago
    severity: 'Low',
  },
  {
    id: 'LOG009',
    user: { name: 'John Smith', avatarUrl: userAvatar2 },
    action: 'Deleted Evidence',
    details: 'Deleted "Old Financial Records Q1"',
    timestamp: new Date(Date.now() - 604800000).toISOString(), // 7 days ago
    severity: 'High',
  },
];

export const dashboardStats = {
  reportsGenerated: {
    value: 78,
    change: 12.5,
  },
  evidenceUploaded: {
    value: 342,
    change: 5.2,
  },
  activeAudits: {
    value: 12,
    change: -2,
  },
  findingsResolved: {
    value: 156,
    change: 20,
  },
};

export const activityChartData = [
  { date: 'Mon', reports: 4, evidence: 10 },
  { date: 'Tue', reports: 6, evidence: 15 },
  { date: 'Wed', reports: 3, evidence: 8 },
  { date: 'Thu', reports: 8, evidence: 20 },
  { date: 'Fri', reports: 7, evidence: 18 },
  { date: 'Sat', reports: 5, evidence: 12 },
  { date: 'Sun', reports: 9, evidence: 25 },
];

export const complianceProgress = {
    overall: 82,
    acceptedEvidence: 41,
    totalEvidence: 50,
    categories: [
        { name: 'Access Control', progress: 90 },
        { name: 'Data Security', progress: 75 },
        { name: 'Infrastructure', progress: 85 },
        { name: 'Incident Response', progress: 60 },
    ],
    recentActivity: [
        { id: 'act-1', evidenceName: 'Firewall Config Q2', status: 'Accepted' as const, timestamp: new Date(Date.now() - 1.8e+6).toISOString() },
        { id: 'act-2', evidenceName: 'User Access Review', status: 'Accepted' as const, timestamp: new Date(Date.now() - 3.6e+6).toISOString() },
        { id: 'act-3', evidenceName: 'Penetration Test Report', status: 'Rejected' as const, timestamp: new Date(Date.now() - 1.44e+7).toISOString() },
        { id: 'act-4', evidenceName: 'New Server Setup Log', status: 'Pending' as const, timestamp: new Date(Date.now() - 8.64e+7).toISOString() },
    ]
};

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
  recommendedCourses: [
    {
      id: 'course-1',
      title: 'Advanced Compliance Documentation',
      description: 'Learn to write clear, concise, and defensible audit observations.',
      status: 'In Progress' as const,
      progress: 60,
      completionDate: null,
    },
    {
      id: 'course-2',
      title: 'Evidence Management Best Practices',
      description: 'Master the art of linking and managing evidence to support your audit findings.',
      status: 'Not Started' as const,
      progress: 0,
      completionDate: null,
    },
    {
      id: 'course-3',
      title: 'CISSP Certification Prep Course',
      description: 'Prepare for the industry-standard CISSP certification.',
      status: 'Completed' as const,
      progress: 100,
      completionDate: '2023-08-20T10:00:00Z',
    },
  ]
};

export const mockCustomerCourses: CustomerCourse[] = [
  {
    id: 'cust-course-1',
    title: 'Data Security & Privacy Basics',
    description: 'An essential introduction to data protection principles and how they affect your daily work.',
    duration: 'Approx. 45 mins',
    status: 'In Progress' as const,
    progress: 75,
    thumbnailUrl: courseThumbnail,
    completionDate: null,
  },
  {
    id: 'cust-course-2',
    title: 'SOC 2 Compliance Awareness',
    description: 'Understand the key principles of SOC 2 and your role in maintaining compliance.',
    duration: 'Approx. 60 mins',
    status: 'Not Started' as const,
    progress: 0,
    thumbnailUrl: courseThumbnail,
    completionDate: null,
  },
  {
    id: 'cust-course-3',
    title: 'Phishing & Social Engineering',
    description: 'Learn how to identify and protect yourself and the company from malicious attacks.',
    duration: 'Approx. 30 mins',
    status: 'Completed' as const,
    progress: 100,
    thumbnailUrl: courseThumbnail,
    completionDate: '2023-10-15T14:30:00Z',
  },
];
