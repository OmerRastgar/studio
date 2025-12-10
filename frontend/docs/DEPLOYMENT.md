# Deployment Guide

This guide covers deploying the Next.js Audit Application on a server or different machine with Docker.

## Prerequisites on Target Machine

- Docker and Docker Compose installed
- Git (optional, for cloning)
- At least 4GB RAM available for Docker
- Ports 5432, 8000, 8001, 3001, 3100, 24224 available

## Deployment Steps

### Option 1: Clone Repository on Target Machine

```bash
# Clone the repository
git clone <repository-url>
cd studio

# Make scripts executable
chmod +x *.sh

# Start the application (Docker-only approach)
./docker-setup.sh
```

### Option 2: Transfer Files to Target Machine

If you can't use git on the target machine:

1. **Zip the project files** (exclude node_modules):
   ```bash
   # On your local machine
   zip -r audit-app.zip . -x "node_modules/*" ".git/*" ".next/*"
   ```

2. **Transfer to target machine** via SCP, FTP, or other method

3. **Extract and setup on target machine**:
   ```bash
   unzip audit-app.zip
   cd studio
   chmod +x *.sh
   ./docker-setup.sh
   ```

### Option 3: Docker Image Transfer

Build the image locally and transfer it:

```bash
# On your local machine (if Docker is available)
./docker-build-simple.sh
docker save nextjs-app > nextjs-app.tar

# Transfer nextjs-app.tar to target machine

# On target machine
docker load < nextjs-app.tar
docker-compose up -d
```

## Configuration

### Environment Variables

The `.env` file is pre-configured but you may want to update:

```env
# Change this for production
JWT_SECRET=your-secure-256-bit-secret-key-here

# Database credentials (can be changed)
DATABASE_URL=postgresql://audituser:auditpass@localhost:5432/auditdb
```

### Port Configuration

If you need to change ports, edit `docker-compose.yml`:

```yaml
services:
  postgres:
    ports:
      - "5433:5432"  # Change 5432 to avoid conflicts
  
  kong:
    ports:
      - "8080:8000"  # Change 8000 to avoid conflicts
      - "8081:8001"  # Change 8001 to avoid conflicts
```

## Verification

After deployment, verify everything is working:

```bash
# Check all containers are running
docker ps

# Check database has users
./verify-database.sh

# Test the application
curl http://localhost:8000/api/health
```

## Access Points

- **Main Application**: http://your-server:8000
- **Admin Panel**: http://your-server:8001 (Kong Admin)
- **Monitoring**: http://your-server:3001 (Grafana)
- **Database**: your-server:5432 (PostgreSQL)

## Default Credentials

- **Application Login**: admin@auditace.com / admin123
- **Grafana**: admin / admin123
- **Database**: audituser / auditpass

## Troubleshooting

### Services Won't Start
```bash
# Check Docker daemon
sudo systemctl status docker

# Check available memory
free -h

# Check port conflicts
netstat -tulpn | grep :8000
```

### Database Issues
```bash
# Reset database
docker-compose down -v
docker-compose up -d postgres
sleep 15
./ensure-users.sh
```

### Build Issues
```bash
# Use simple build
./docker-build-simple.sh

# Or build without cache
docker-compose build --no-cache
```

## Production Considerations

1. **Security**:
   - Change default passwords
   - Use HTTPS (add reverse proxy like Nginx)
   - Configure firewall rules

2. **Performance**:
   - Increase Docker memory limits
   - Use production database settings
   - Enable logging rotation

3. **Backup**:
   - Backup PostgreSQL data regularly
   - Backup configuration files

4. **Monitoring**:
   - Set up log aggregation
   - Configure health checks
   - Monitor resource usage

## File Transfer Checklist

When transferring to another machine, ensure these files are included:

### Required Files
- [ ] `docker-compose.yml`
- [ ] `Dockerfile.simple`
- [ ] `.env`
- [ ] `package.json`
- [ ] `next.config.js`
- [ ] `prisma/` directory (complete)
- [ ] `src/` directory (complete)
- [ ] All `.sh` scripts

### Optional Files
- [ ] `README.md`
- [ ] `DEPLOYMENT.md`
- [ ] `.dockerignore`
- [ ] Configuration files (`kong.yml`, `fluent-bit.conf`, etc.)

### Exclude These
- [ ] `node_modules/`
- [ ] `.next/`
- [ ] `.git/`
- [ ] `*.log` files