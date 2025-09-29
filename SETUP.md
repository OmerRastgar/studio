# Audit Application Setup with PostgreSQL and Kong

This guide will help you set up the audit application with PostgreSQL database and Kong API Gateway.

## Prerequisites

- Docker and Docker Compose installed
- Node.js 20+ (for local development)

## Quick Start

1. **Clone and setup the project:**
   ```bash
   git clone <your-repo>
   cd <project-directory>
   ```

2. **Create environment file:**
   ```bash
   cp .env.example .env
   ```

3. **Start all services with Docker Compose:**
   ```bash
   docker-compose up --build
   ```

   This will start:
   - PostgreSQL database on port 5432
   - Next.js application (internal)
   - Kong API Gateway on port 8000

4. **Access the application:**
   - Application: http://localhost:8000 (through Kong)
   - Kong Admin API: http://localhost:8001

## Architecture

```
Internet → Kong Gateway (8000) → Next.js App (3000) → PostgreSQL (5432)
```

### Security Features

- **Kong API Gateway**: All traffic goes through Kong, providing:
  - Rate limiting (100 requests/minute, 1000/hour)
  - Request size limiting (10MB max)
  - CORS handling
  - Security headers
  - No direct access to the application

- **Database**: PostgreSQL with:
  - Dedicated user and database
  - Health checks
  - Data persistence with Docker volumes
  - Automatic initialization with sample data

## Database Schema

The application uses the following main tables:
- `projects` - Audit projects
- `users` - User profiles and authentication
- `auditors` - Auditor-specific information
- `agents` - Monitoring agents
- `evidence` - Audit evidence files
- `audit_logs` - System activity logs
- `courses` - Training courses
- `compliance_activities` - Compliance tracking

## Development

### Local Development (without Docker)

1. **Start PostgreSQL:**
   ```bash
   docker-compose up postgres -d
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set environment variables:**
   ```bash
   export DATABASE_URL=postgresql://audituser:auditpass@localhost:5432/auditdb
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

### Database Management

**Connect to PostgreSQL:**
```bash
docker exec -it audit-postgres psql -U audituser -d auditdb
```

**View logs:**
```bash
docker-compose logs postgres
docker-compose logs app
docker-compose logs kong
```

**Reset database:**
```bash
docker-compose down -v
docker-compose up --build
```

## Kong Configuration

Kong is configured via `kong.yml` with the following plugins:
- Rate limiting
- Request size limiting
- CORS
- Security headers

### Kong Admin API Examples

**Check service status:**
```bash
curl http://localhost:8001/services
```

**Check routes:**
```bash
curl http://localhost:8001/routes
```

**View plugins:**
```bash
curl http://localhost:8001/plugins
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://audituser:auditpass@localhost:5432/auditdb` |
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Application port | `3000` |

## Troubleshooting

### Database Connection Issues
1. Ensure PostgreSQL container is running: `docker-compose ps`
2. Check database logs: `docker-compose logs postgres`
3. Verify connection string in `.env`

### Kong Gateway Issues
1. Check Kong logs: `docker-compose logs kong`
2. Verify `kong.yml` configuration
3. Test Kong admin API: `curl http://localhost:8001`

### Application Issues
1. Check app logs: `docker-compose logs app`
2. Verify database connection in app logs
3. Ensure all environment variables are set

## Production Deployment

For production deployment:

1. **Update environment variables:**
   - Use secure database credentials
   - Set `NODE_ENV=production`
   - Configure proper SSL certificates

2. **Database security:**
   - Use managed PostgreSQL service
   - Enable SSL connections
   - Set up proper backup strategy

3. **Kong security:**
   - Add authentication plugins (JWT, OAuth2)
   - Configure rate limiting per user
   - Set up proper SSL termination
   - Use Kong's database mode for clustering

4. **Application security:**
   - Remove direct database access
   - Use secrets management
   - Enable audit logging
   - Set up monitoring and alerting