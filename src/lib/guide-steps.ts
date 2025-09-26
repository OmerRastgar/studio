export const steps = [
  {
    element: '[data-tour-id="logo"]',
    intro: "Welcome to Audit Gar! Let's take a quick tour of the platform's key features.",
    position: 'bottom',
    path: '/dashboard',
  },
  {
    element: '[data-tour-id="dashboard"]',
    intro: 'This is the **Dashboard**, your central hub. Here you get a high-level overview of compliance progress, recent activities, and auditor performance.',
    position: 'right',
    path: '/dashboard',
  },
  {
    element: '[data-tour-id="report-generation"]',
    intro: 'The **Report Generation** page is where auditors can leverage AI to create comprehensive audit reports. Link evidence, write observations, and let the AI handle the detailed analysis.',
    position: 'right',
    path: '/reports',
  },
  {
    element: '[data-tour-id="agents"]',
    intro: 'Customers can use the **Agents** page to deploy and monitor agents across their environments (Windows, macOS, Linux) to automatically collect evidence.',
    position: 'right',
    path: '/agents',
  },
  {
    element: '[data-tour-id="learning"]',
    intro: 'The **Learning** tab provides role-based training. Auditors get AI-driven performance insights and course recommendations, while customers see mandatory compliance awareness modules.',
    position: 'right',
    path: '/learning',
  },
  {
    element: '[data-tour-id="evidence"]',
    intro: 'The **Evidence Locker** is where all collected evidence is stored. You can upload, tag, and manage all the files required for your audits.',
    position: 'right',
    path: '/evidence',
  },
  {
    element: '[data-tour-id="users"]',
    intro: 'Consultancies and Admins use the **Users** page to manage auditors and customers, monitor performance, and oversee all audit activities from a central place.',
    position: 'right',
    path: '/users',
  },
  {
    element: '[data-tour-id="main-content"]',
    intro: 'You have completed the tour! Feel free to explore the application. You can restart this guide anytime from the help icon in the header.',
    position: 'top',
    path: '/dashboard',
  },
];
