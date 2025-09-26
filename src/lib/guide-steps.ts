
import { Step } from 'react-joyride';

export const mainTourSteps: Step[] = [
  {
    target: '[data-tour-id="logo"]',
    content: "Welcome to CyberGaar Audit Platform! Let's take a quick tour of the platform's key features.",
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour-id="dashboard"]',
    content: 'This is the Dashboard, your central hub. Here you get a high-level overview of compliance progress, recent activities, and auditor performance.',
    placement: 'right',
  },
  {
    target: '[data-tour-id="report-generation"]',
    content: 'The Report Generation page is where auditors can leverage AI to create comprehensive audit reports. Link evidence, write observations, and let the AI handle the detailed analysis.',
    placement: 'right',
  },
  {
    target: '[data-tour-id="agents"]',
    content: 'Customers can use the Agents page to deploy and monitor agents across their environments (Windows, macOS, Linux) to automatically collect evidence.',
    placement: 'right',
  },
  {
    target: '[data-tour-id="learning"]',
    content: 'The Learning tab provides role-based training. Auditors get AI-driven performance insights and course recommendations, while customers see mandatory compliance awareness modules.',
    placement: 'right',
  },
  {
    target: '[data-tour-id="evidence"]',
    content: 'The Evidence Locker is where all collected evidence is stored. You can upload, tag, and manage all the files required for your audits.',
    placement: 'right',
  },
  {
    target: '[data-tour-id="users"]',
    content: 'Consultancies and Admins use the Users page to manage auditors and customers, monitor performance, and oversee all audit activities from a central place.',
    placement: 'right',
  },
  {
    target: 'body',
    placement: 'center',
    content: 'You have completed the tour! Feel free to explore the application. You can restart this guide anytime from the help icon in the header.',
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


// Helper to get the path for a given step target
export const getPathForStep = (target: string | HTMLElement) => {
    const selector = typeof target === 'string' ? target : (target.dataset.tourId ? `[data-tour-id="${target.dataset.tourId}"]` : '');

    if (!selector) return null;

    if (document.querySelector(selector)) {
        return null; // Target is on the current page
    }

    if (selector.includes('report-generation') || selector.includes('report-')) return '/reports';
    if (selector.includes('agents')) return '/agents';
    if (selector.includes('learning')) return '/learning';
    if (selector.includes('evidence')) return '/evidence';
    if (selector.includes('users')) return '/users';
    if (selector.includes('dashboard') || selector.includes('compliance-progress') || selector.includes('stat-cards')) return '/dashboard';
    
    // Default to null if the step isn't found in the mapping.
    return null;
}
