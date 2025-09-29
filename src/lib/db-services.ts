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

// Dynamic import to avoid bundling pg on client side
async function getQuery() {
  const { query } = await import('./db');
  return query;
}

// Projects
export async function getProjects(): Promise<Project[]> {
  const query = await getQuery();
  const result = await query('SELECT * FROM projects ORDER BY created_at DESC');
  return result.rows.map((row: any) => ({
    id: row.id,
    name: row.name,
    customerName: row.customer_name,
  }));
}

// Users
export async function getUsers(): Promise<UserProfile[]> {
  const query = await getQuery();
  const result = await query(`
    SELECT name, email, avatar_url, role, status, last_active 
    FROM users 
    ORDER BY created_at DESC
  `);
  
  return result.rows.map((row: any) => ({
    name: row.name,
    email: row.email,
    avatarUrl: row.avatar_url,
    role: row.role,
    status: row.status,
    lastActive: row.last_active?.toISOString(),
  }));
}

// Auditors
export async function getAuditors(): Promise<Auditor[]> {
  const query = await getQuery();
  const result = await query(`
    SELECT a.id, u.name, u.avatar_url, a.experience, a.certifications, a.progress, u.status
    FROM auditors a
    JOIN users u ON a.user_id = u.id
    ORDER BY a.created_at DESC
  `);
  
  return result.rows.map((row: any) => ({
    id: row.id,
    name: row.name,
    avatarUrl: row.avatar_url,
    projects: [], // TODO: Add project mapping
    progress: row.progress,
    status: row.status,
    experience: row.experience,
    certifications: row.certifications || [],
  }));
}

// Agents
export async function getAgents(): Promise<Agent[]> {
  const query = await getQuery();
  const result = await query(`
    SELECT id, name, platform, status, last_sync, version
    FROM agents 
    ORDER BY created_at DESC
  `);
  
  return result.rows.map((row: any) => ({
    id: row.id,
    name: row.name,
    platform: row.platform,
    status: row.status,
    lastSync: row.last_sync?.toISOString(),
    version: row.version,
  }));
}

// Evidence
export async function getEvidence(): Promise<Evidence[]> {
  const query = await getQuery();
  const result = await query(`
    SELECT id, project_id, agent_id, name, type, tags, uploaded_at, uploaded_by, preview_url, ai_hint
    FROM evidence 
    ORDER BY uploaded_at DESC
  `);
  
  return result.rows.map((row: any) => ({
    id: row.id,
    projectId: row.project_id,
    agentId: row.agent_id,
    name: row.name,
    type: row.type,
    tags: row.tags || [],
    uploadedAt: row.uploaded_at?.toISOString(),
    uploadedBy: row.uploaded_by,
    previewUrl: row.preview_url,
    aiHint: row.ai_hint,
  }));
}

// Audit Logs
export async function getAuditLogs(): Promise<AuditLog[]> {
  const query = await getQuery();
  const result = await query(`
    SELECT id, user_name, user_avatar_url, action, details, timestamp, severity
    FROM audit_logs 
    ORDER BY timestamp DESC
    LIMIT 50
  `);
  
  return result.rows.map((row: any) => ({
    id: row.id,
    user: {
      name: row.user_name,
      avatarUrl: row.user_avatar_url,
    },
    action: row.action,
    details: row.details,
    timestamp: row.timestamp?.toISOString(),
    severity: row.severity,
  }));
}

// Courses
export async function getCourses(): Promise<Course[]> {
  const query = await getQuery();
  const result = await query(`
    SELECT id, title, description, duration, thumbnail_url
    FROM courses 
    WHERE id LIKE 'course-%'
    ORDER BY created_at DESC
  `);
  
  return result.rows.map((row: any) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    status: 'Not Started' as const, // Default status
    progress: 0,
    completionDate: null,
  }));
}

// Customer Courses
export async function getCustomerCourses(): Promise<CustomerCourse[]> {
  const query = await getQuery();
  const result = await query(`
    SELECT id, title, description, duration, thumbnail_url
    FROM courses 
    WHERE id LIKE 'cust-course-%'
    ORDER BY created_at DESC
  `);
  
  return result.rows.map((row: any) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    duration: row.duration,
    status: 'Not Started' as const,
    progress: 0,
    thumbnailUrl: row.thumbnail_url,
    completionDate: null,
  }));
}

// Dashboard Stats
export async function getDashboardStats() {
  const query = await getQuery();
  const [reportsResult, evidenceResult, auditsResult, findingsResult] = await Promise.all([
    query('SELECT COUNT(*) as count FROM audit_logs WHERE action LIKE \'%Report%\''),
    query('SELECT COUNT(*) as count FROM evidence'),
    query('SELECT COUNT(*) as count FROM projects'),
    query('SELECT COUNT(*) as count FROM compliance_activities WHERE status = \'Accepted\''),
  ]);

  return {
    reportsGenerated: {
      value: parseInt(reportsResult.rows[0].count),
      change: 12.5,
    },
    evidenceUploaded: {
      value: parseInt(evidenceResult.rows[0].count),
      change: 5.2,
    },
    activeAudits: {
      value: parseInt(auditsResult.rows[0].count),
      change: -2,
    },
    findingsResolved: {
      value: parseInt(findingsResult.rows[0].count),
      change: 20,
    },
  };
}

// Compliance Progress
export async function getComplianceProgress() {
  const query = await getQuery();
  const activitiesResult = await query(`
    SELECT evidence_name, status, timestamp
    FROM compliance_activities 
    ORDER BY timestamp DESC
    LIMIT 4
  `);
  
  const acceptedCount = await query(`
    SELECT COUNT(*) as count 
    FROM compliance_activities 
    WHERE status = 'Accepted'
  `);
  
  const totalCount = await query(`
    SELECT COUNT(*) as count 
    FROM compliance_activities
  `);

  const accepted = parseInt(acceptedCount.rows[0].count);
  const total = parseInt(totalCount.rows[0].count);
  const overall = total > 0 ? Math.round((accepted / total) * 100) : 0;

  return {
    overall,
    acceptedEvidence: accepted,
    totalEvidence: total,
    categories: [
      { name: 'Access Control', progress: 90 },
      { name: 'Data Security', progress: 75 },
      { name: 'Infrastructure', progress: 85 },
      { name: 'Incident Response', progress: 60 },
    ],
    recentActivity: activitiesResult.rows.map((row: any) => ({
      id: `act-${Date.now()}-${Math.random()}`,
      evidenceName: row.evidence_name,
      status: row.status,
      timestamp: row.timestamp?.toISOString(),
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