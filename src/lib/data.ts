import type { Evidence, AuditLog } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const userAvatar1 = PlaceHolderImages.find(img => img.id === 'user-avatar-1')?.imageUrl || '';
const userAvatar2 = PlaceHolderImages.find(img => img.id === 'user-avatar-2')?.imageUrl || '';

const evidenceThumb1 = PlaceHolderImages.find(img => img.id === 'evidence-thumb-1');
const evidenceThumb2 = PlaceHolderImages.find(img => img.id === 'evidence-thumb-2');
const evidenceThumb3 = PlaceHolderImages.find(img => img.id === 'evidence-thumb-3');
const evidenceThumb4 = PlaceHolderImages.find(img => img.id === 'evidence-thumb-4');
const evidenceThumb5 = PlaceHolderImages.find(img => img.id === 'evidence-thumb-5');


export const mockEvidence: Evidence[] = [
  {
    id: 'EV001',
    name: 'Firewall Configuration Review Q2',
    type: 'document',
    tags: ['networking', 'security', 'q2-review'],
    uploadedAt: '2023-06-15T10:30:00Z',
    uploadedBy: 'Jane Doe',
    previewUrl: evidenceThumb1?.imageUrl || '',
    aiHint: evidenceThumb1?.imageHint || 'document',
  },
  {
    id: 'EV002',
    name: 'Admin Panel Login Attempt Screenshot',
    type: 'screenshot',
    tags: ['access-control', 'security-incident'],
    uploadedAt: '2023-06-14T15:05:00Z',
    uploadedBy: 'John Smith',
    previewUrl: evidenceThumb2?.imageUrl || '',
    aiHint: evidenceThumb2?.imageHint || 'screen',
  },
  {
    id: 'EV003',
    name: 'Production Server Auth Logs (June)',
    type: 'log',
    tags: ['server-logs', 'authentication'],
    uploadedAt: '2023-06-12T09:00:00Z',
    uploadedBy: 'Jane Doe',
    previewUrl: evidenceThumb3?.imageUrl || '',
    aiHint: evidenceThumb3?.imageHint || 'code',
  },
  {
    id: 'EV004',
    name: 'VPC Network Diagram',
    type: 'network',
    tags: ['architecture', 'networking'],
    uploadedAt: '2023-06-11T11:45:00Z',
    uploadedBy: 'Admin',
    previewUrl: evidenceThumb4?.imageUrl || '',
    aiHint: evidenceThumb4?.imageHint || 'diagram',
  },
  {
    id: 'EV005',
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
    user: { name: 'Jane Doe', avatarUrl: userAvatar1 },
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
