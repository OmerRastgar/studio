# Implementation Plan - Microservices Refactor

Refactor the `studio` application into three distinct workers (services): Frontend, Backend, and Gateway. Each will have its own container and observability configuration.

## User Review Required
> [!IMPORTANT]
> **Architecture Change**: This refactor splits the existing Next.js monolith into:
> 1.  **Frontend Worker**: Next.js (UI only).
> 2.  **Backend Worker**: Node.js API (Prisma + Business Logic).
> 3.  **Kong Worker**: API Gateway.
>
> **Database Access**: Only the Backend Worker will access the database. The Frontend will communicate via the Backend API.

## Proposed Structure
```text
studio/
├── frontend/           # Next.js Application (UI)
│   ├── src/
│   ├── Dockerfile
│   └── ...
├── backend/            # Node.js API Service (Database + Logic)
│   ├── src/
│   ├── prisma/
│   ├── Dockerfile
│   └── ...
├── gateway/            # Kong Configuration
│   ├── kong.yml
│   └── Dockerfile (optional)
└── docker-compose.yml  # Orchestration
```

## Proposed Changes

### 1. Directory Restructuring
-   [ ] Create `frontend/`, `backend/`, and `gateway/` directories.
-   [ ] Move Next.js UI code to `frontend/`.
-   [ ] Move Prisma and API logic to `backend/`.
-   [ ] Move Kong configuration to `gateway/`.

### 2. Backend Worker (New Service)
-   [ ] Initialize a new Node.js project in `backend/`.
-   [ ] **Move Core Logic**:
    -   `src/lib/prisma.ts` -> `backend/src/lib/prisma.ts`
    -   `src/lib/prisma-services.ts` -> `backend/src/lib/prisma-services.ts`
    -   `src/lib/jwt.ts` -> `backend/src/lib/jwt.ts`
    -   `src/lib/audit-logger.ts` -> `backend/src/lib/audit-logger.ts`
    -   `src/lib/seed.ts` -> `backend/src/lib/seed.ts`
    -   `prisma/` directory -> `backend/prisma/`
-   [ ] **Convert API Routes**:
    -   `src/app/api/*` -> Express/Hono routes in `backend/src/routes/`
-   [ ] Implement OpenTelemetry instrumentation for Backend.
-   [ ] Create `Dockerfile` for Backend.

### 3. Frontend Worker (Cleanup)
-   [ ] **Retain UI Logic**:
    -   `src/lib/data-build.ts` (Mock data/UI helpers)
    -   `src/lib/permissions.ts` (Navigation logic)
    -   `src/lib/firebase.ts` (Client SDK)
-   [ ] **Remove Backend Dependencies**:
    -   Uninstall `prisma`, `@prisma/client`, `jsonwebtoken`, `bcryptjs` from Frontend.
    -   Remove `src/lib/prisma.ts`, `src/lib/jwt.ts`, etc.
-   [ ] **Update API Clients**:
    -   Ensure `auth-provider.tsx` and other components call the Gateway URL.
-   [ ] Ensure OpenTelemetry instrumentation is configured for Frontend (Client/Server).
-   [ ] Update `Dockerfile` for Frontend.

### 4. Kong Worker (Gateway)
-   [ ] Update `kong.yml` to route:
    -   `/api/*` -> Backend Service
    -   `/*` -> Frontend Service
-   [ ] Configure Kong observability plugins.

### 5. Orchestration
-   [ ] Update `docker-compose.yml` to define the three services (`frontend`, `backend`, `kong`) and the database.
-   [ ] Ensure all services are connected to the `core_network`.

## Verification Plan
### Automated Tests
-   [ ] Verify Frontend builds and starts.
-   [ ] Verify Backend builds and connects to DB.
-   [ ] Verify Kong routes traffic correctly.
-   [ ] Check observability data (logs, metrics, traces) for all three services in the Core stack.

### Manual Verification
-   [ ] Login flow (Frontend -> Kong -> Backend -> DB).
-   [ ] Data fetching (Frontend -> Kong -> Backend -> DB).
