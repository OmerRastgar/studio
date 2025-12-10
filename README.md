# Studio Project

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
