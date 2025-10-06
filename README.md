# Next.js Audit Application

A comprehensive audit management application built with Next.js, PostgreSQL, and Kong API Gateway.

## Docker Setup (Recommended)

### Prerequisites
- Docker Desktop installed and running
- Git
- Node.js 18+ (for local development)

### Step-by-Step Docker Setup

#### Step 1: Clone the Repository
```bash
git clone <repository-url>
cd studio
```

#### Step 2: Install Dependencies
```bash
npm install
```

#### Step 3: Set Up Environment
```bash
# Copy environment file (already created)
cp .env.example .env
# The .env file is already configured for Docker setup
```

#### Step 4: Start Docker Services
```bash
# Start all services (PostgreSQL, Kong, Grafana, etc.)
docker-compose up -d

# Verify services are running
docker ps
```

You should see these containers running:
- `audit-postgres` - PostgreSQL database
- `nextjs-app` - Next.js application
- `kong-gateway` - API Gateway
- `grafana` - Monitoring dashboard
- `fluent-bit` - Log collection
- `loki` - Log aggregation

#### Step 5: Initialize Database
```bash
# Make scripts executable
chmod +x *.sh

# Run the complete setup (recommended)
./dev-setup.sh

# OR run individual steps:
./setup-database.sh
```

#### Step 6: Verify Setup
```bash
# Check database and users
./verify-database.sh

# Ensure users were created
./ensure-users.sh
```

#### Step 7: Access the Application

**Option A: Through Kong Gateway (Recommended)**
- URL: http://localhost:8000
- This routes through the API gateway with proper logging

**Option B: Direct Access**
- URL: http://localhost:9002 (if running locally)
- Direct connection to Next.js app

**Option C: Monitoring Dashboard**
- Grafana: http://localhost:3001
- Username: admin
- Password: admin123

### Default Login Credentials
- **Email:** admin@auditace.com
- **Password:** admin123

## Alternative: Local Development Setup

If you prefer running without full Docker orchestration:

#### Step 1: Start Only Database
```bash
# Start just PostgreSQL
docker-compose up -d postgres

# Wait for database to be ready
sleep 10
```

#### Step 2: Setup Database
```bash
# Generate Prisma client
npm run db:generate

# Apply schema
npm run db:push

# Seed with data
npm run db:seed
```

#### Step 3: Start Development Server
```bash
npm run dev
```

#### Step 4: Access Application
- URL: http://localhost:9002

## Troubleshooting

### Docker Issues

**Services not starting:**
```bash
# Check Docker is running
docker --version

# Check service status
docker-compose ps

# View logs for specific service
docker-compose logs postgres
docker-compose logs app
```

**Port conflicts:**
```bash
# Check what's using ports
netstat -tulpn | grep :5432  # PostgreSQL
netstat -tulpn | grep :8000  # Kong
netstat -tulpn | grep :3000  # App

# Stop conflicting services or change ports in docker-compose.yml
```

### Database Issues

**"Invalid credentials" or login errors:**
```bash
# Run the comprehensive fix
./fix-database-issues.sh

# Or ensure users exist
./ensure-users.sh

# Verify admin user exists
docker exec -it audit-postgres psql -U audituser -d auditdb -c "SELECT * FROM users WHERE email = 'admin@auditace.com';"
```

**"Table does not exist" errors:**
```bash
# Check if database is running
docker ps | grep postgres

# Restart database setup
docker-compose down
docker-compose up -d postgres
sleep 10
./setup-database.sh
```

**Migration errors:**
```bash
# Reset everything and start fresh
docker-compose down -v  # This removes volumes too
docker-compose up -d postgres
sleep 15
./dev-setup.sh
```

### Application Issues

**App not accessible:**
```bash
# Check if containers are running
docker ps

# Check app logs
docker-compose logs app

# Restart app container
docker-compose restart app
```

**Kong Gateway issues:**
```bash
# Check Kong status
curl http://localhost:8001/status

# View Kong logs
docker-compose logs kong

# Restart Kong
docker-compose restart kong
```

### Quick Fixes

**Complete reset (nuclear option):**
```bash
# Stop all services and remove volumes
docker-compose down -v

# Remove any orphaned containers
docker system prune -f

# Start fresh
docker-compose up -d
sleep 20
./dev-setup.sh
```

**Just fix users:**
```bash
./ensure-users.sh
```

**Test login:**
```bash
# Start app first
npm run dev

# Then test (in another terminal)
node test-login.js
```

## Docker Services Overview

| Service | Container Name | Port | Purpose |
|---------|---------------|------|---------|
| PostgreSQL | audit-postgres | 5432 | Main database |
| Next.js App | nextjs-app | 3000 | Web application |
| Kong Gateway | kong-gateway | 8000, 8001 | API Gateway & Admin |
| Grafana | grafana | 3001 | Monitoring dashboard |
| Fluent Bit | fluent-bit | 24224 | Log collection |
| Loki | loki | 3100 | Log aggregation |

## Architecture

- **Frontend:** Next.js 15 with TypeScript
- **Database:** PostgreSQL with Prisma ORM
- **API Gateway:** Kong (routes all traffic)
- **Authentication:** JWT with bcryptjs
- **Monitoring:** Grafana + Loki
- **Logging:** Fluent Bit → Loki → Grafana

## Available Scripts

### Database Scripts
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:seed` - Seed database with sample data
- `npm run db:reset` - Reset database and re-run migrations
- `npm run db:studio` - Open Prisma Studio

### Development Scripts
- `npm run dev` - Start development server (local)
- `npm run build` - Build for production
- `npm run start` - Start production server

### Setup Scripts (Linux/macOS)
- `./dev-setup.sh` - Complete development setup
- `./setup-database.sh` - Database setup only
- `./verify-database.sh` - Verify database state
- `./ensure-users.sh` - Ensure users are created
- `./fix-database-issues.sh` - Fix common database issues

### Docker Commands
```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs [service-name]

# Restart specific service
docker-compose restart [service-name]

# Complete reset (removes data)
docker-compose down -v
```

## Environment Variables

The `.env` file is pre-configured for Docker setup:

```env
# Database (Docker internal networking)
DATABASE_URL=postgresql://audituser:auditpass@localhost:5432/auditdb

# JWT Configuration
JWT_SECRET=your-256-bit-secret-key-here-change-this-in-production
JWT_EXPIRES_IN=24h

# Application
NODE_ENV=development
PORT=3000

# Gateway URLs
KONG_PROXY_URL=http://localhost:8000
KONG_ADMIN_URL=http://localhost:8001
```

## Production Deployment

For production deployment:

1. **Update environment variables:**
   - Change `JWT_SECRET` to a secure random string
   - Set `NODE_ENV=production`
   - Update database credentials

2. **Build and deploy:**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. **Security considerations:**
   - Use HTTPS in production
   - Secure database with strong passwords
   - Configure Kong with proper rate limiting
   - Set up proper firewall rules
