import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create projects
  await prisma.project.createMany({
    data: [
      { id: 'proj-001', name: 'SOC 2 Compliance Audit', customerName: 'Innovate Inc.' },
      { id: 'proj-002', name: 'ISO 27001 Certification', customerName: 'Tech Solutions LLC' },
      { id: 'proj-003', name: 'Internal Security Review', customerName: 'DataSafe Corp' },
    ]
  })

  // Create users
  const users = await prisma.user.createMany({
    data: [
      {
        id: 'user-admin',
        name: 'Admin Auditor',
        email: 'admin@auditace.com',
        avatarUrl: 'https://picsum.photos/seed/admin/100/100',
        role: 'admin',
        status: 'Active',
        lastActive: new Date(Date.now() - 6 * 60 * 1000), // 6 minutes ago
      },
      {
        id: 'user-jane',
        name: 'Jane Doe',
        email: 'jane.doe@example.com',
        avatarUrl: 'https://picsum.photos/seed/user1/100/100',
        role: 'auditor',
        status: 'Active',
        lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      },
      {
        id: 'user-john',
        name: 'John Smith',
        email: 'john.smith@example.com',
        avatarUrl: 'https://picsum.photos/seed/user2/100/100',
        role: 'auditor',
        status: 'Inactive',
        lastActive: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      },
      {
        id: 'user-client',
        name: 'Customer Client',
        email: 'client@customer.com',
        avatarUrl: 'https://picsum.photos/seed/user3/100/100',
        role: 'customer',
        status: 'Active',
        lastActive: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      }
    ]
  })

  // Create auditors
  await prisma.auditor.createMany({
    data: [
      {
        id: 'AUD001',
        userId: 'user-jane',
        experience: '5 years in cloud security auditing.',
        certifications: ['CISA', 'CISSP'],
        progress: 75,
      },
      {
        id: 'AUD002',
        userId: 'user-john',
        experience: '8 years in financial and tech audits.',
        certifications: ['CISM', 'CRISC'],
        progress: 40,
      },
    ]
  })

  // Create agents
  await prisma.agent.createMany({
    data: [
      {
        id: 'AGENT-001',
        name: 'Primary DC Server',
        platform: 'windows',
        status: 'Active',
        lastSync: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        version: '1.2.3',
      },
      {
        id: 'AGENT-002',
        name: 'Design Team iMac',
        platform: 'macos',
        status: 'Active',
        lastSync: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        version: '1.2.3',
      },
      {
        id: 'AGENT-003',
        name: 'Ubuntu Jenkins Runner',
        platform: 'linux',
        status: 'Inactive',
        lastSync: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        version: '1.1.0',
      },
      {
        id: 'AGENT-004',
        name: 'Staging Web Server',
        platform: 'linux',
        status: 'Pending',
        lastSync: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        version: '1.2.0',
      },
      {
        id: 'AGENT-005',
        name: 'Marketing Laptop',
        platform: 'windows',
        status: 'Active',
        lastSync: new Date(Date.now() - 60 * 1000), // 1 minute ago
        version: '1.2.3',
      },
    ]
  })

  // Create evidence
  await prisma.evidence.createMany({
    data: [
      {
        id: 'EV001',
        projectId: 'proj-001',
        agentId: 'AGENT-001',
        name: 'Firewall Configuration Review Q2',
        type: 'document',
        tags: ['networking', 'security', 'q2-review'],
        uploadedAt: new Date('2023-06-15T10:30:00Z'),
        uploadedBy: 'AGENT-001',
        previewUrl: 'https://picsum.photos/seed/doc1/200/150',
        aiHint: 'document',
      },
      {
        id: 'EV002',
        projectId: 'proj-001',
        agentId: 'AGENT-002',
        name: 'Admin Panel Login Attempt Screenshot',
        type: 'screenshot',
        tags: ['access-control', 'security-incident'],
        uploadedAt: new Date('2023-06-14T15:05:00Z'),
        uploadedBy: 'AGENT-002',
        previewUrl: 'https://picsum.photos/seed/screen1/200/150',
        aiHint: 'screen',
      },
      {
        id: 'EV003',
        projectId: 'proj-002',
        agentId: 'AGENT-003',
        name: 'Production Server Auth Logs (June)',
        type: 'log',
        tags: ['server-logs', 'authentication'],
        uploadedAt: new Date('2023-06-12T09:00:00Z'),
        uploadedBy: 'AGENT-003',
        previewUrl: 'https://picsum.photos/seed/log1/200/150',
        aiHint: 'code',
      },
      {
        id: 'EV004',
        projectId: 'proj-002',
        name: 'VPC Network Diagram',
        type: 'network',
        tags: ['architecture', 'networking'],
        uploadedAt: new Date('2023-06-11T11:45:00Z'),
        uploadedBy: 'Jane Doe',
        previewUrl: 'https://picsum.photos/seed/diagram1/200/150',
        aiHint: 'diagram',
      },
      {
        id: 'EV005',
        projectId: 'proj-003',
        name: 'Kubernetes Deployment YAML',
        type: 'config',
        tags: ['kubernetes', 'deployment', 'iac'],
        uploadedAt: new Date('2023-06-10T18:20:00Z'),
        uploadedBy: 'John Smith',
        previewUrl: 'https://picsum.photos/seed/code1/200/150',
        aiHint: 'code',
      },
    ]
  })

  // Create audit logs
  await prisma.auditLog.createMany({
    data: [
      {
        id: 'LOG001',
        userName: 'Jane Doe',
        userAvatarUrl: 'https://picsum.photos/seed/user1/100/100',
        action: 'Generated Report',
        details: 'Generated "Q2 Firewall Compliance" section',
        timestamp: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        severity: 'Low',
      },
      {
        id: 'LOG002',
        userName: 'John Smith',
        userAvatarUrl: 'https://picsum.photos/seed/user2/100/100',
        action: 'Uploaded Evidence',
        details: 'Uploaded "Admin Panel Login Attempt Screenshot"',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        severity: 'Medium',
      },
      {
        id: 'LOG003',
        userName: 'Jane Doe',
        userAvatarUrl: 'https://picsum.photos/seed/user1/100/100',
        action: 'Updated Profile',
        details: 'Changed profile email',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        severity: 'Medium',
      },
      {
        id: 'LOG004',
        userName: 'Admin',
        userAvatarUrl: 'https://picsum.photos/seed/admin/100/100',
        action: 'Changed Settings',
        details: 'Enabled dark mode globally',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        severity: 'Medium',
      },
      {
        id: 'LOG005',
        userName: 'John Smith',
        userAvatarUrl: 'https://picsum.photos/seed/user2/100/100',
        action: 'Logged In',
        details: 'Successfully authenticated',
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        severity: 'High',
      },
    ]
  })

  // Create courses
  await prisma.course.createMany({
    data: [
      {
        id: 'course-1',
        title: 'Advanced Compliance Documentation',
        description: 'Learn to write clear, concise, and defensible audit observations.',
        duration: 'Approx. 90 mins',
        thumbnailUrl: 'https://picsum.photos/seed/course1/300/200',
      },
      {
        id: 'course-2',
        title: 'Evidence Management Best Practices',
        description: 'Master the art of linking and managing evidence to support your audit findings.',
        duration: 'Approx. 75 mins',
        thumbnailUrl: 'https://picsum.photos/seed/course2/300/200',
      },
      {
        id: 'course-3',
        title: 'CISSP Certification Prep Course',
        description: 'Prepare for the industry-standard CISSP certification.',
        duration: 'Approx. 120 mins',
        thumbnailUrl: 'https://picsum.photos/seed/course3/300/200',
      },
      {
        id: 'cust-course-1',
        title: 'Data Security & Privacy Basics',
        description: 'An essential introduction to data protection principles and how they affect your daily work.',
        duration: 'Approx. 45 mins',
        thumbnailUrl: 'https://picsum.photos/seed/custcourse1/300/200',
      },
      {
        id: 'cust-course-2',
        title: 'SOC 2 Compliance Awareness',
        description: 'Understand the key principles of SOC 2 and your role in maintaining compliance.',
        duration: 'Approx. 60 mins',
        thumbnailUrl: 'https://picsum.photos/seed/custcourse2/300/200',
      },
      {
        id: 'cust-course-3',
        title: 'Phishing & Social Engineering',
        description: 'Learn how to identify and protect yourself and the company from malicious attacks.',
        duration: 'Approx. 30 mins',
        thumbnailUrl: 'https://picsum.photos/seed/custcourse3/300/200',
      },
    ]
  })

  // Create compliance activities
  await prisma.complianceActivity.createMany({
    data: [
      {
        id: 'act-1',
        evidenceName: 'Firewall Config Q2',
        status: 'Accepted',
        timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      },
      {
        id: 'act-2',
        evidenceName: 'User Access Review',
        status: 'Accepted',
        timestamp: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      },
      {
        id: 'act-3',
        evidenceName: 'Penetration Test Report',
        status: 'Rejected',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
      },
      {
        id: 'act-4',
        evidenceName: 'New Server Setup Log',
        status: 'Pending',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      },
    ]
  })

  console.log('✅ Database seeded successfully!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Seeding failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })