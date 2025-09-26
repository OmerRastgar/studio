import { Step } from 'react-joyride';

export const steps: Step[] = [
  {
    target: '[data-tour-id="logo"]',
    content: "Welcome to Audit Gar! Let's take a quick tour of the platform's key features.",
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
    target: '[data-tour-id="main-content"]',
    content: 'You have completed the tour! Feel free to explore the application. You can restart this guide anytime from the help icon in the header.',
    placement: 'top',
  },
];

// Helper to get the path for a given step target
export const getPathForStep = (target: string | HTMLElement) => {
    const selector = typeof target === 'string' ? target : target.getAttribute('data-tour-id');
    if (!selector) return '/dashboard';

    if (selector.includes('report-generation')) return '/reports';
    if (selector.includes('agents')) return '/agents';
    if (selector.includes('learning')) return '/learning';
    if (selector.includes('evidence')) return '/evidence';
    if (selector.includes('users')) return '/users';
    
    return '/dashboard';
}
