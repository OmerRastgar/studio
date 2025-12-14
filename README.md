# Studio Project

## Project Overview

Studio is a comprehensive Compliance and Audit Management platform designed to streamline the entire audit lifecycle. It facilitates collaboration between auditors, customers, managers, and compliance officers, automating evidence collection, reporting, and workflow management.

## Key Features

### 🔐 Role-Based Access Control (RBAC)
Secure and granular access management for different user roles:
- **Admin**: Full system control, framework management, and user administration.
- **Auditor**: Conducts audits, reviews evidence, and manages projects.
- **Customer**: Uploads evidence, responds to requests, and tracks compliance progress.
- **Manager**: Oversees multiple projects and auditor performance.
- **Reviewer**: specialized role for validating audit findings before approval.
- **Compliance**: Internal compliance officers monitoring organizational adherence.

### 📋 Compliance Management
- **Frameworks & Controls**: Support for multiple compliance frameworks with customizable controls.
- **Project Scoping**: Create project-specific instances of controls for tailored audits.
- **Progress Tracking**: Real-time status updates on control implementation and evidence collection.

### 📂 Evidence Automation
- **Manual Uploads**: Easy drag-and-drop interface for document submissions.
- **Agent-Based Collection**: Automated evidence gathering from Windows, macOS, and Linux endpoints.
- **Auto-Tagging**: Intelligent tagging of evidence for easy retrieval and organization.

### 💬 Real-time Collaboration
- **Integrated Chat**: Context-aware messaging system linked to specific projects and controls.
- **Notifications**: Instant alerts for audit requests, feedback, and approvals.

### 📊 Reporting & Analytics
- **Dashboards**: Visual overview of compliance posture, project health, and auditor productivity.
- **AI Insights**: Automated analysis of control effectiveness and evidence quality.
- **PDF Reports**: One-click generation of comprehensive audit reports.

### 🔄 Workflows & Integrations
- **n8n Integration**: Powerful workflow automation connecting Studio with external tools.
    - **Project Approvals**: Automatically trigger workflows upon project sign-off.
    - **Hours Logging**: Sync time logs with external tracking systems.
    - **Meeting Management**: Automate calendar invites and meeting follow-ups.
- **External Apps**: Seamless connectivity with **Jira** for issue tracking and **Google Workspace** for calendar and email integration.

### 🎓 Learning Management
- **Integrated Courses**: Onboarding and training modules for users.
- **Progress Tracking**: Monitor course completion and user certification status.

### 🕵️ Observability
- **Metric Tracking**: Detailed performance metrics for system health and usage.
- **Audit Logs**: Immutable logs of all critical system actions for security and accountability.

## Optimized Development Workflow

This project has been configured for a streamlined development experience using Docker Compose and automated scripts.

### Prerequisites
- Docker & Docker Compose
- Node.js (optional, for local script running)

### Quick Start

1.  **Start Development Environment**:
    ```bash
    npm run dev
    ```
    This command runs `docker-compose up --build`. It will:
    - Start PostgreSQL.
    - Start the Backend (with hot-reload).
    - Start the Frontend (with hot-reload).
    - Automatically generate Prisma client, push schema, and seed the database.

2.  **Stop Environment**:
    ```bash
    npm run stop
    ```

3.  **Clean Start (Reset DB)**:
    ```bash
    npm run clean
    npm run dev
    ```

### Database Management

The backend service automatically handles database initialization on startup using `backend/scripts/init-dev.sh`.

- **Schema Updates**: Just edit `backend/prisma/schema.prisma`. The next time you restart the backend (or it hot-reloads if you configured it to watch prisma), changes will be pushed.
- **Seeding**: The `prisma/seed.ts` script runs on every startup to ensure default data exists.

### Troubleshooting

- **Prisma Client Issues**: If you see type errors in your editor, run `cd backend && npm install && npx prisma generate` locally to update your local `node_modules`.
- **Logs**: Run `npm run logs` to see output from all services.
