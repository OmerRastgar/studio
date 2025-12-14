
import { Step } from 'react-joyride';

export const mainTourSteps: Step[] = [
  {
    target: '[data-tour-id="logo"]',
    content: "Welcome to CyberGaar! Let's take a quick look around.",
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: 'body',
    placement: 'center',
    content: 'Explore the dashboard to see your specific tools and reports.',
  },
];

export const dashboardTourSteps: Step[] = [
  {
    target: '[data-tour-id="compliance-progress"]',
    content: "This is the Compliance Progress widget. It gives you a real-time, high-level overview of your audit's status.",
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour-id="stat-cards"]',
    content: "These cards show key metrics about your audit activities at a glance.",
    placement: 'bottom',
  },
  {
    target: '[data-tour-id="progress-breakdown"]',
    content: "Here you can see a detailed breakdown of your compliance progress by category and view the most recent evidence-related activities.",
    placement: 'left',
  },
];

export const reportGenerationTourSteps: Step[] = [
  {
    target: '[data-tour-id="report-table"]',
    content: 'This is the main report-building area. Each row represents a control. Fill in your observations and link the relevant evidence.',
    placement: 'top',
    disableBeacon: true,
  },
  {
    target: '[data-tour-id="report-evidence-selector"]',
    content: 'Click here to search and select one or more pieces of evidence from the Evidence Locker that support your observation for this control.',
    placement: 'bottom',
  },
  {
    target: '[data-tour-id="report-generate-button"]',
    content: 'After providing your observation and evidence, click "Generate" to have the AI write a detailed analysis in this column.',
    placement: 'left',
  },
  {
    target: '[data-tour-id="report-flag-button"]',
    content: 'If you find an issue with a row or need a peer to review it, use the flag button. You can add comments and track its resolution.',
    placement: 'left',
  },
  {
    target: '[data-tour-id="report-ai-qa-button"]',
    content: 'Use the AI QA button to have our AI automatically review the entire report for clarity, consistency, and evidence sufficiency. It will flag potential issues for you.',
    placement: 'bottom',
  },
  {
    target: '[data-tour-id="report-chat-button"]',
    content: 'Need help or want to collaborate? Open the AI Report Assistant to ask questions, get suggestions, or chat with your team in real-time.',
    placement: 'bottom',
  },
];

export const adminSteps: Step[] = [
  {
    target: '[data-tour-id="logo"]',
    content: "Welcome, Admin! This is your command center for managing the entire audit platform.",
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour-id="dashboard"]',
    content: 'Overview of system health, active users, and global audit metrics.',
    placement: 'right',
  },
  {
    target: '[data-tour-id="projects"]',
    content: 'Access and manage all audit projects across the organization.',
    placement: 'right',
  },
  {
    target: '[data-tour-id="users"]',
    content: 'Manage platform users, assign roles (Auditor, Manager, Customer), and monitor activity.',
    placement: 'right',
  },
  {
    target: '[data-tour-id="evidence"]',
    content: 'Centralized view of all evidence collected from every customer environment.',
    placement: 'right',
  },
  {
    target: '[data-tour-id="learning"]',
    content: 'Manage training modules and track completion rates for all users.',
    placement: 'right',
  },
  {
    target: '[data-tour-id="agents"]',
    content: 'Oversee all deployed agents to ensure continuous evidence collection.',
    placement: 'right',
  },
  {
    target: '[data-tour-id="report-generation"]',
    content: 'Generate and review comprehensive audit reports with AI assistance.',
    placement: 'right',
  },
  {
    target: '[data-tour-id="audit-log"]',
    content: 'View a detailed log of all system activities for security and compliance tracking.',
    placement: 'right',
  },
  {
    target: 'body',
    content: 'You are all set! Explore the admin controls to configure the platform.',
    placement: 'center',
  }
];

export const auditorSteps: Step[] = [
  {
    target: '[data-tour-id="logo"]',
    content: "Welcome, Auditor! Let's get you familiar with your workspace.",
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour-id="dashboard"]',
    content: 'Your Dashboard provides a high-level view of your assigned projects and pending tasks.',
    placement: 'right',
  },
  {
    target: '[data-tour-id="projects"]',
    content: 'This is where you execute your audits. Select a project to view controls and add observations.',
    placement: 'right',
  },
  {
    target: '[data-tour-id="evidence"]',
    content: 'Search, filter, and review evidence files uploaded by customers or collected by agents.',
    placement: 'right',
  },
  {
    target: '[data-tour-id="learning"]',
    content: 'Access AI-recommended training courses to stay updated on compliance standards.',
    placement: 'right',
  },
  {
    target: '[data-tour-id="agents"]',
    content: 'Check the status of data collection agents deployed in customer environments.',
    placement: 'right',
  },
  {
    target: '[data-tour-id="report-generation"]',
    content: 'Draft and finalize your audit reports here. Use the AI features to summarize findings.',
    placement: 'right',
  },
  {
    target: '[data-tour-id="audit-log"]',
    content: 'Review the trail of activities within your assigned projects.',
    placement: 'right',
  },
  {
    target: 'body',
    content: 'Ready to start auditing? Select a project from the sidebar to begin.',
    placement: 'center',
  }
];

export const managerSteps: Step[] = [
  {
    target: '[data-tour-id="logo"]',
    content: "Welcome, Manager! Here is how you can oversee your team and projects.",
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour-id="dashboard"]',
    content: 'Monitor team performance, project timelines, and overall compliance posture.',
    placement: 'right',
  },
  {
    target: '[data-tour-id="projects"]',
    content: 'Oversee all ongoing projects and track progress against deadlines.',
    placement: 'right',
  },
  {
    target: '[data-tour-id="users"]',
    content: 'Manage your audit team members and assign them to specific engagements.',
    placement: 'right',
  },
  {
    target: '[data-tour-id="evidence"]',
    content: 'Review key evidence files escalated for your attention.',
    placement: 'right',
  },
  {
    target: '[data-tour-id="learning"]',
    content: 'Track your team\'s training progress and assign new modules.',
    placement: 'right',
  },
  {
    target: '[data-tour-id="agents"]',
    content: 'Verify that customer environments are correctly instrumented with data collection agents.',
    placement: 'right',
  },
  {
    target: '[data-tour-id="report-generation"]',
    content: 'Review and approve final audit reports before they are sent to customers.',
    placement: 'right',
  },
  {
    target: '[data-tour-id="audit-log"]',
    content: 'Monitor sensitive actions and access logs for governance purposes.',
    placement: 'right',
  },
  {
    target: 'body',
    content: 'Lead your team to success! Check the dashboard for immediate insights.',
    placement: 'center',
  }
];

export const customerSteps: Step[] = [
  {
    target: '[data-tour-id="logo"]',
    content: "Welcome! We are here to simplify your compliance journey.",
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour-id="dashboard"]',
    content: 'Your compliance score and outstanding action items are shown here.',
    placement: 'right',
  },
  {
    target: '[data-tour-id="evidence"]',
    content: 'Upload manual evidence here if automated collection is not possible for certain controls.',
    placement: 'right',
  },
  {
    target: '[data-tour-id="learning"]',
    content: 'Complete your mandatory compliance awareness training.',
    placement: 'right',
  },
  {
    target: '[data-tour-id="agents"]',
    content: 'Download and deploy agents to automatically collect evidence from your systems.',
    placement: 'right',
  },
  {
    target: 'body',
    content: 'Navigate to the Dashboard to see your next tasks. We will guide you every step of the way.',
    placement: 'center',
  }
];
