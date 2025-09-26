# **App Name**: AuditAce

## Core Features:

- User Authentication: Secure login with JWT tokens managed via Kong API Gateway. Modular design for pluggable backend authentication services.
- Role-Based Access Control: Implement role-based permissions, fully managed by Kong API Gateway.  Designed for modular integration with backend access control services.
- Report Generation (AI-Assisted): Generate report sections using AI based on evidence and observations. Includes a tool to verify and validate the result before persisting. Modular AI service integration.
- Evidence Management: Upload, tag, and manage evidence files. Restricted access based on auditor_id/project_id with preview via signed URLs. Supports multiple backend storage solutions via a modular adapter pattern.
- Audit Log: Track all actions performed within the system, including timestamps, user, and details. Pluggable audit logging backend.
- Settings Management: Manage themes, API keys, and other configurations through a dedicated settings modal. Uses a modular configuration provider for backend independence.
- Profile Management: Allow auditors and customers to manage their profiles. Uses a modular data access layer.

## Style Guidelines:

- Primary color: HSL(210, 70%, 50%) - A vibrant blue (#1982FC) to convey trust and professionalism.
- Background color: HSL(210, 20%, 20%) - A dark, desaturated blue (#333B4A) to create a professional deep blue dark mode.
- Accent color: HSL(180, 60%, 60%) - A contrasting cyan (#40E0D0) for highlights and interactive elements.
- Body font: 'Inter' sans-serif for clear and modern text.
- Headline font: 'Space Grotesk' sans-serif for bold headings and titles.
- Code font: 'Source Code Pro' monospace for displaying code snippets.
- Use a consistent set of professional icons from a library like Material-UI or Font Awesome.
- Mobile-first responsive design with a collapsible sidebar for navigation.
- Smooth transitions and micro-interactions to enhance user experience.