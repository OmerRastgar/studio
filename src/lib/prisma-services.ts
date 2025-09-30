import { prisma } from './prisma';
import type { 
  Evidence, 
  AuditLog, 
  Project, 
  Auditor, 
  UserProfile, 
  Agent, 
  Course, 
  CustomerCourse 
} from '@/lib/types';

// Projects
export async function getProjects(): Promise<Project[]> {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: 'desc' }
  });
  
  return projects.map(project => ({
    id: project.id,
    name: project.name,
    customerName: project.customerName,
  }));
}

// Users
export async function getUsers(): Promise<UserProfile[]> {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' }
  });
  
  return users.map(user => ({
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl || '',
    role: user.role as 'admin' | 'auditor' | 'customer' | 'manager' | 'reviewer',
    status: user.status as 'Active' | 'Inactive',
    lastActive: user.lastActive?.toISOString(),
  }));
}

// Auditors
export async function getAuditors(): Promise<Auditor[]> {
  const auditors = await prisma.auditor.findMany({
    include: {
      user: true
    },
    orderBy: { createdAt: 'desc' }
  });
  
  return auditors.map(auditor => ({
    id: auditor.id,
    name: auditor.user.name,
    avatarUrl: auditor.user.avatarUrl || '',
    projects: [], // TODO: Add project mapping
    progress: auditor.progress,
    status: auditor.user.status === 'Inactive' ? 'On Hold' : 'Active',
    experience: auditor.experience || '',
    certifications: auditor.certifications,
  }));
}

// Agents
export async function getAgents(): Promise<Agent[]> {
  const agents = await prisma.agent.findMany({
    orderBy: { createdAt: 'desc' }
  });
  
  return agents.map(agent => ({
    id: agent.id,
    name: agent.name,
    platform: agent.platform as 'windows' | 'macos' | 'linux',
    status: agent.status as 'Active' | 'Inactive' | 'Pending',
    lastSync: agent.lastSync?.toISOString() || '',
    version: agent.version || '',
  }));
}

// Evidence
export async function getEvidence(): Promise<Evidence[]> {
  const evidence = await prisma.evidence.findMany({
    orderBy: { uploadedAt: 'desc' }
  });
  
  return evidence.map(item => ({
    id: item.id,
    projectId: item.projectId,
    agentId: item.agentId || undefined,
    name: item.name,
    type: item.type as 'document' | 'screenshot' | 'log' | 'network' | 'config',
    tags: item.tags,
    uploadedAt: item.uploadedAt.toISOString(),
    uploadedBy: item.uploadedBy,
    previewUrl: item.previewUrl || '',
    aiHint: item.aiHint || '',
  }));
}

// Audit Logs
export async function getAuditLogs(): Promise<AuditLog[]> {
  const logs = await prisma.auditLog.findMany({
    orderBy: { timestamp: 'desc' },
    take: 50
  });
  
  return logs.map(log => ({
    id: log.id,
    user: {
      name: log.userName,
      avatarUrl: log.userAvatarUrl || '',
    },
    action: log.action,
    details: log.details || '',
    timestamp: log.timestamp.toISOString(),
    severity: log.severity as 'Low' | 'Medium' | 'High',
  }));
}

// Courses
export async function getCourses(): Promise<Course[]> {
  const courses = await prisma.course.findMany({
    where: {
      id: {
        startsWith: 'course-'
      }
    },
    orderBy: { createdAt: 'desc' }
  });
  
  return courses.map(course => ({
    id: course.id,
    title: course.title,
    description: course.description || '',
    status: 'Not Started' as const,
    progress: 0,
    completionDate: null,
  }));
}

// Customer Courses
export async function getCustomerCourses(): Promise<CustomerCourse[]> {
  const courses = await prisma.course.findMany({
    where: {
      id: {
        startsWith: 'cust-course-'
      }
    },
    orderBy: { createdAt: 'desc' }
  });
  
  return courses.map(course => ({
    id: course.id,
    title: course.title,
    description: course.description || '',
    duration: course.duration || '',
    status: 'Not Started' as const,
    progress: 0,
    thumbnailUrl: course.thumbnailUrl || '',
    completionDate: null,
  }));
}

// Dashboard Stats
export async function getDashboardStats() {
  const [reportsCount, evidenceCount, auditsCount, findingsCount] = await Promise.all([
    prisma.auditLog.count({
      where: {
        action: {
          contains: 'Report'
        }
      }
    }),
    prisma.evidence.count(),
    prisma.project.count(),
    prisma.complianceActivity.count({
      where: {
        status: 'Accepted'
      }
    }),
  ]);

  return {
    reportsGenerated: {
      value: reportsCount,
      change: 12.5,
    },
    evidenceUploaded: {
      value: evidenceCount,
      change: 5.2,
    },
    activeAudits: {
      value: auditsCount,
      change: -2,
    },
    findingsResolved: {
      value: findingsCount,
      change: 20,
    },
  };
}

// Compliance Progress
export async function getComplianceProgress() {
  const [activities, acceptedCount, totalCount] = await Promise.all([
    prisma.complianceActivity.findMany({
      orderBy: { timestamp: 'desc' },
      take: 4
    }),
    prisma.complianceActivity.count({
      where: { status: 'Accepted' }
    }),
    prisma.complianceActivity.count()
  ]);

  const overall = totalCount > 0 ? Math.round((acceptedCount / totalCount) * 100) : 0;

  return {
    overall,
    acceptedEvidence: acceptedCount,
    totalEvidence: totalCount,
    categories: [
      { name: 'Access Control', progress: 90 },
      { name: 'Data Security', progress: 75 },
      { name: 'Infrastructure', progress: 85 },
      { name: 'Incident Response', progress: 60 },
    ],
    recentActivity: activities.map(activity => ({
      id: activity.id,
      evidenceName: activity.evidenceName,
      status: activity.status as 'Accepted' | 'Rejected' | 'Pending',
      timestamp: activity.timestamp.toISOString(),
    })),
  };
}

// Activity Chart Data (mock for now, can be enhanced with real data)
export async function getActivityChartData() {
  return [
    { date: 'Mon', reports: 4, evidence: 10 },
    { date: 'Tue', reports: 6, evidence: 15 },
    { date: 'Wed', reports: 3, evidence: 8 },
    { date: 'Thu', reports: 8, evidence: 20 },
    { date: 'Fri', reports: 7, evidence: 18 },
    { date: 'Sat', reports: 5, evidence: 12 },
    { date: 'Sun', reports: 9, evidence: 25 },
  ];
}