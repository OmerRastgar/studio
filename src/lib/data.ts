// Re-export from build-time data for static imports
export * from './data-build';

// Server-side data functions (will be called from API routes or server components)
export async function getServerData() {
  // Only import database services on server side and when not building
  if (typeof window === 'undefined' && process.env.NODE_ENV !== 'production') {
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
      } = await import('@/lib/db-services');

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