#!/bin/bash

echo "🚀 Starting database initialization..."

# Function to execute SQL
execute_sql() {
    psql -U audituser -d auditdb -c "$1"
}

# Clear everything first
echo "🧹 Clearing existing schema..."
execute_sql "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"

# Create enums
echo "📋 Creating enums..."
execute_sql "
CREATE TYPE \"UserRole\" AS ENUM ('admin', 'auditor', 'customer');
CREATE TYPE \"UserStatus\" AS ENUM ('Active', 'Inactive');
CREATE TYPE \"AgentPlatform\" AS ENUM ('windows', 'macos', 'linux');
CREATE TYPE \"AgentStatus\" AS ENUM ('Active', 'Inactive', 'Pending');
CREATE TYPE \"EvidenceType\" AS ENUM ('document', 'screenshot', 'log', 'network', 'config');
CREATE TYPE \"AuditSeverity\" AS ENUM ('Low', 'Medium', 'High');
CREATE TYPE \"CourseStatus\" AS ENUM ('Not Started', 'In Progress', 'Completed');
CREATE TYPE \"ActivityStatus\" AS ENUM ('Accepted', 'Rejected', 'Pending');
"

# Create tables
echo "🏗️  Creating tables..."
execute_sql "
CREATE TABLE \"projects\" (
    \"id\" TEXT NOT NULL,
    \"name\" TEXT NOT NULL,
    \"customer_name\" TEXT NOT NULL,
    \"created_at\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \"updated_at\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT \"projects_pkey\" PRIMARY KEY (\"id\")
);

CREATE TABLE \"users\" (
    \"id\" TEXT NOT NULL,
    \"name\" TEXT NOT NULL,
    \"email\" TEXT NOT NULL UNIQUE,
    \"password\" TEXT NOT NULL,
    \"avatar_url\" TEXT,
    \"role\" \"UserRole\" NOT NULL,
    \"status\" \"UserStatus\" NOT NULL DEFAULT 'Active',
    \"last_active\" TIMESTAMP(3),
    \"created_at\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \"updated_at\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT \"users_pkey\" PRIMARY KEY (\"id\")
);

CREATE TABLE \"auditors\" (
    \"id\" TEXT NOT NULL,
    \"user_id\" TEXT NOT NULL UNIQUE,
    \"experience\" TEXT,
    \"certifications\" TEXT[],
    \"progress\" INTEGER NOT NULL DEFAULT 0,
    \"created_at\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \"updated_at\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT \"auditors_pkey\" PRIMARY KEY (\"id\"),
    CONSTRAINT \"auditors_user_id_fkey\" FOREIGN KEY (\"user_id\") REFERENCES \"users\"(\"id\") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE \"agents\" (
    \"id\" TEXT NOT NULL,
    \"name\" TEXT NOT NULL,
    \"platform\" \"AgentPlatform\" NOT NULL,
    \"status\" \"AgentStatus\" NOT NULL DEFAULT 'Pending',
    \"last_sync\" TIMESTAMP(3),
    \"version\" TEXT,
    \"created_at\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \"updated_at\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT \"agents_pkey\" PRIMARY KEY (\"id\")
);

CREATE TABLE \"evidence\" (
    \"id\" TEXT NOT NULL,
    \"project_id\" TEXT NOT NULL,
    \"agent_id\" TEXT,
    \"name\" TEXT NOT NULL,
    \"type\" \"EvidenceType\" NOT NULL,
    \"tags\" TEXT[],
    \"uploaded_at\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \"uploaded_by\" TEXT NOT NULL,
    \"preview_url\" TEXT,
    \"ai_hint\" TEXT,
    \"created_at\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \"updated_at\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT \"evidence_pkey\" PRIMARY KEY (\"id\"),
    CONSTRAINT \"evidence_project_id_fkey\" FOREIGN KEY (\"project_id\") REFERENCES \"projects\"(\"id\") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT \"evidence_agent_id_fkey\" FOREIGN KEY (\"agent_id\") REFERENCES \"agents\"(\"id\") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE \"audit_logs\" (
    \"id\" TEXT NOT NULL,
    \"user_name\" TEXT NOT NULL,
    \"user_avatar_url\" TEXT,
    \"action\" TEXT NOT NULL,
    \"details\" TEXT,
    \"timestamp\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \"severity\" \"AuditSeverity\" NOT NULL DEFAULT 'Low',
    CONSTRAINT \"audit_logs_pkey\" PRIMARY KEY (\"id\")
);

CREATE TABLE \"courses\" (
    \"id\" TEXT NOT NULL,
    \"title\" TEXT NOT NULL,
    \"description\" TEXT,
    \"duration\" TEXT,
    \"thumbnail_url\" TEXT,
    \"created_at\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \"updated_at\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT \"courses_pkey\" PRIMARY KEY (\"id\")
);

CREATE TABLE \"user_courses\" (
    \"id\" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    \"user_id\" TEXT NOT NULL,
    \"course_id\" TEXT NOT NULL,
    \"status\" \"CourseStatus\" NOT NULL DEFAULT 'Not Started',
    \"progress\" INTEGER NOT NULL DEFAULT 0,
    \"completion_date\" TIMESTAMP(3),
    \"created_at\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \"updated_at\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT \"user_courses_pkey\" PRIMARY KEY (\"id\"),
    CONSTRAINT \"user_courses_user_id_fkey\" FOREIGN KEY (\"user_id\") REFERENCES \"users\"(\"id\") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT \"user_courses_course_id_fkey\" FOREIGN KEY (\"course_id\") REFERENCES \"courses\"(\"id\") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT \"user_courses_user_id_course_id_key\" UNIQUE (\"user_id\", \"course_id\")
);

CREATE TABLE \"compliance_activities\" (
    \"id\" TEXT NOT NULL,
    \"evidence_name\" TEXT NOT NULL,
    \"status\" \"ActivityStatus\" NOT NULL,
    \"timestamp\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT \"compliance_activities_pkey\" PRIMARY KEY (\"id\")
);
"

# Insert test data
echo "📊 Inserting test data..."

# Projects
execute_sql "
INSERT INTO projects (id, name, customer_name) VALUES
('proj-001', 'SOC 2 Compliance Audit', 'Innovate Inc.'),
('proj-002', 'ISO 27001 Certification', 'Tech Solutions LLC'),
('proj-003', 'Internal Security Review', 'DataSafe Corp');
"

# Users
execute_sql "
INSERT INTO users (id, name, email, password, avatar_url, role, status, last_active) VALUES
('user-admin', 'Admin Auditor', 'admin@auditace.com', 'dev_hash_admin123', 'https://picsum.photos/seed/admin/100/100', 'admin', 'Active', NOW() - INTERVAL '6 minutes'),
('user-jane', 'Jane Doe', 'jane.doe@example.com', 'dev_hash_jane123', 'https://picsum.photos/seed/user1/100/100', 'auditor', 'Active', NOW() - INTERVAL '2 hours'),
('user-john', 'John Smith', 'john.smith@example.com', 'dev_hash_john123', 'https://picsum.photos/seed/user2/100/100', 'auditor', 'Active', NOW() - INTERVAL '30 days'),
('user-client', 'Customer Client', 'client@customer.com', 'dev_hash_client123', 'https://picsum.photos/seed/user3/100/100', 'customer', 'Active', NOW() - INTERVAL '1 day');
"

# Auditors
execute_sql "
INSERT INTO auditors (id, user_id, experience, certifications, progress) VALUES
('AUD001', 'user-jane', '5 years in cloud security auditing.', ARRAY['CISA', 'CISSP'], 75),
('AUD002', 'user-john', '8 years in financial and tech audits.', ARRAY['CISM', 'CRISC'], 40);
"

# Agents
execute_sql "
INSERT INTO agents (id, name, platform, status, last_sync, version) VALUES
('AGENT-001', 'Primary DC Server', 'windows', 'Active', NOW() - INTERVAL '30 minutes', '1.2.3'),
('AGENT-002', 'Design Team iMac', 'macos', 'Active', NOW() - INTERVAL '1 hour', '1.2.3'),
('AGENT-003', 'Ubuntu Jenkins Runner', 'linux', 'Inactive', NOW() - INTERVAL '1 day', '1.1.0'),
('AGENT-004', 'Staging Web Server', 'linux', 'Pending', NOW() - INTERVAL '7 days', '1.2.0'),
('AGENT-005', 'Marketing Laptop', 'windows', 'Active', NOW() - INTERVAL '1 minute', '1.2.3');
"

# Evidence
execute_sql "
INSERT INTO evidence (id, project_id, agent_id, name, type, tags, uploaded_at, uploaded_by, preview_url, ai_hint) VALUES
('EV001', 'proj-001', 'AGENT-001', 'Firewall Configuration Review Q2', 'document', ARRAY['networking', 'security', 'q2-review'], '2023-06-15T10:30:00Z', 'AGENT-001', 'https://picsum.photos/seed/doc1/200/150', 'document'),
('EV002', 'proj-001', 'AGENT-002', 'Admin Panel Login Attempt Screenshot', 'screenshot', ARRAY['access-control', 'security-incident'], '2023-06-14T15:05:00Z', 'AGENT-002', 'https://picsum.photos/seed/screen1/200/150', 'screen'),
('EV003', 'proj-002', 'AGENT-003', 'Production Server Auth Logs (June)', 'log', ARRAY['server-logs', 'authentication'], '2023-06-12T09:00:00Z', 'AGENT-003', 'https://picsum.photos/seed/log1/200/150', 'code'),
('EV004', 'proj-002', NULL, 'VPC Network Diagram', 'network', ARRAY['architecture', 'networking'], '2023-06-11T11:45:00Z', 'Jane Doe', 'https://picsum.photos/seed/diagram1/200/150', 'diagram'),
('EV005', 'proj-003', NULL, 'Kubernetes Deployment YAML', 'config', ARRAY['kubernetes', 'deployment', 'iac'], '2023-06-10T18:20:00Z', 'John Smith', 'https://picsum.photos/seed/code1/200/150', 'code');
"

# Audit Logs
execute_sql "
INSERT INTO audit_logs (id, user_name, user_avatar_url, action, details, timestamp, severity) VALUES
('LOG001', 'Jane Doe', 'https://picsum.photos/seed/user1/100/100', 'Generated Report', 'Generated \"Q2 Firewall Compliance\" section', NOW() - INTERVAL '1 hour', 'Low'),
('LOG002', 'John Smith', 'https://picsum.photos/seed/user2/100/100', 'Uploaded Evidence', 'Uploaded \"Admin Panel Login Attempt Screenshot\"', NOW() - INTERVAL '2 hours', 'Medium'),
('LOG003', 'Jane Doe', 'https://picsum.photos/seed/user1/100/100', 'Updated Profile', 'Changed profile email', NOW() - INTERVAL '1 day', 'Medium'),
('LOG004', 'Admin', 'https://picsum.photos/seed/admin/100/100', 'Changed Settings', 'Enabled dark mode globally', NOW() - INTERVAL '2 days', 'Medium'),
('LOG005', 'John Smith', 'https://picsum.photos/seed/user2/100/100', 'Logged In', 'Successfully authenticated', NOW() - INTERVAL '3 days', 'High');
"

# Courses
execute_sql "
INSERT INTO courses (id, title, description, duration, thumbnail_url) VALUES
('course-1', 'Advanced Compliance Documentation', 'Learn to write clear, concise, and defensible audit observations.', 'Approx. 90 mins', 'https://picsum.photos/seed/course1/300/200'),
('course-2', 'Evidence Management Best Practices', 'Master the art of linking and managing evidence to support your audit findings.', 'Approx. 75 mins', 'https://picsum.photos/seed/course2/300/200'),
('course-3', 'CISSP Certification Prep Course', 'Prepare for the industry-standard CISSP certification.', 'Approx. 120 mins', 'https://picsum.photos/seed/course3/300/200'),
('cust-course-1', 'Data Security & Privacy Basics', 'An essential introduction to data protection principles and how they affect your daily work.', 'Approx. 45 mins', 'https://picsum.photos/seed/custcourse1/300/200'),
('cust-course-2', 'SOC 2 Compliance Awareness', 'Understand the key principles of SOC 2 and your role in maintaining compliance.', 'Approx. 60 mins', 'https://picsum.photos/seed/custcourse2/300/200'),
('cust-course-3', 'Phishing & Social Engineering', 'Learn how to identify and protect yourself and the company from malicious attacks.', 'Approx. 30 mins', 'https://picsum.photos/seed/custcourse3/300/200');
"

# Compliance Activities
execute_sql "
INSERT INTO compliance_activities (id, evidence_name, status, timestamp) VALUES
('act-1', 'Firewall Config Q2', 'Accepted', NOW() - INTERVAL '30 minutes'),
('act-2', 'User Access Review', 'Accepted', NOW() - INTERVAL '1 hour'),
('act-3', 'Penetration Test Report', 'Rejected', NOW() - INTERVAL '4 hours'),
('act-4', 'New Server Setup Log', 'Pending', NOW() - INTERVAL '1 day');
"

# Create indexes
echo "🔍 Creating performance indexes..."
execute_sql "
CREATE INDEX \"idx_evidence_project_id\" ON \"evidence\"(\"project_id\");
CREATE INDEX \"idx_evidence_agent_id\" ON \"evidence\"(\"agent_id\");
CREATE INDEX \"idx_audit_logs_timestamp\" ON \"audit_logs\"(\"timestamp\");
CREATE INDEX \"idx_users_email\" ON \"users\"(\"email\");
CREATE INDEX \"idx_user_courses_user_id\" ON \"user_courses\"(\"user_id\");
CREATE INDEX \"idx_compliance_activities_timestamp\" ON \"compliance_activities\"(\"timestamp\");
"

# Show summary
echo "📈 Database initialization summary:"
execute_sql "
SELECT 'Projects' as table_name, COUNT(*) as count FROM projects
UNION ALL
SELECT 'Users', COUNT(*) FROM users
UNION ALL
SELECT 'Auditors', COUNT(*) FROM auditors
UNION ALL
SELECT 'Agents', COUNT(*) FROM agents
UNION ALL
SELECT 'Evidence', COUNT(*) FROM evidence
UNION ALL
SELECT 'Audit Logs', COUNT(*) FROM audit_logs
UNION ALL
SELECT 'Courses', COUNT(*) FROM courses
UNION ALL
SELECT 'Compliance Activities', COUNT(*) FROM compliance_activities;
"

echo "✅ Database initialization completed successfully!"
echo ""
echo "🔐 Test Login Credentials:"
echo "  Admin: admin@auditace.com / admin123"
echo "  Auditor: jane.doe@example.com / jane123"
echo "  Customer: client@customer.com / client123"