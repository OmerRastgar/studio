// Re-export from build-time data for static imports
export * from './data-build';

// Server-side data functions using Prisma
export async function getServerData() {
  // Only use database on server side and when DATABASE_URL is available
  if (typeof window === 'undefined' && process.env.DATABASE_URL) {
    try {
      const { 
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
      } = await import('@/lib/prisma-services');

      return {
        projects: await getProjects(),
        users: await getUsers(),
        auditors: await getAuditors(),
        agents: await getAgents(),
        evidence: await getEvidence(),
        auditLogs: await getAuditLogs(),
        courses: await getCourses(),
        customerCourses: await getCustomerCourses(),
        dashboardStats: await getDashboardStats(),
        complianceProgress: await getComplianceProgress(),
        activityChartData: await getActivityChartData(),
      };
    } catch (error) {
      console.error('Database error, falling back to mock data:', error);
      return getFallbackData();
    }
  }
  
  return getFallbackData();
}

function getFallbackData() {
  const {
    mockProjects,
    mockUsers,
    mockAuditors,
    mockAgents,
    mockEvidence,
    mockAuditLogs,
    dashboardStats,
    complianceProgress,
    activityChartData,
    mockLearningData
  } = require('./data-build');

  return {
    projects: mockProjects,
    users: mockUsers,
    auditors: mockAuditors,
    agents: mockAgents,
    evidence: mockEvidence,
    auditLogs: mockAuditLogs,
    courses: mockLearningData.recommendedCourses,
    customerCourses: [],
    dashboardStats,
    complianceProgress,
    activityChartData,
  };
}