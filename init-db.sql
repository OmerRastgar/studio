-- Database initialization script for Audit Application
-- This script creates all necessary tables and inserts initial data

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE user_role AS ENUM ('admin', 'auditor', 'customer');
CREATE TYPE user_status AS ENUM ('Active', 'Inactive');
CREATE TYPE agent_platform AS ENUM ('windows', 'macos', 'linux');
CREATE TYPE agent_status AS ENUM ('Active', 'Inactive', 'Pending');
CREATE TYPE evidence_type AS ENUM ('document', 'screenshot', 'log', 'network', 'config');
CREATE TYPE audit_severity AS ENUM ('Low', 'Medium', 'High');
CREATE TYPE course_status AS ENUM ('Not Started', 'In Progress', 'Completed');
CREATE TYPE activity_status AS ENUM ('Accepted', 'Rejected', 'Pending');

-- Projects table
CREATE TABLE projects (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    avatar_url TEXT,
    role user_role NOT NULL,
    status user_status NOT NULL DEFAULT 'Active',
    last_active TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Auditors table (extends users)
CREATE TABLE auditors (
    id VARCHAR(50) PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    experience TEXT,
    certifications TEXT[],
    progress INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agents table
CREATE TABLE agents (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    platform agent_platform NOT NULL,
    status agent_status NOT NULL DEFAULT 'Pending',
    last_sync TIMESTAMP,
    version VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Evidence table
CREATE TABLE evidence (
    id VARCHAR(50) PRIMARY KEY,
    project_id VARCHAR(50) REFERENCES projects(id) ON DELETE CASCADE,
    agent_id VARCHAR(50) REFERENCES agents(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    type evidence_type NOT NULL,
    tags TEXT[],
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    uploaded_by VARCHAR(255),
    preview_url TEXT,
    ai_hint TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit logs table
CREATE TABLE audit_logs (
    id VARCHAR(50) PRIMARY KEY,
    user_name VARCHAR(255) NOT NULL,
    user_avatar_url TEXT,
    action VARCHAR(255) NOT NULL,
    details TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    severity audit_severity NOT NULL DEFAULT 'Low'
);

-- Courses table
CREATE TABLE courses (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    duration VARCHAR(100),
    thumbnail_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User courses (progress tracking)
CREATE TABLE user_courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    course_id VARCHAR(50) REFERENCES courses(id) ON DELETE CASCADE,
    status course_status NOT NULL DEFAULT 'Not Started',
    progress INTEGER DEFAULT 0,
    completion_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, course_id)
);

-- Compliance activities table
CREATE TABLE compliance_activities (
    id VARCHAR(50) PRIMARY KEY,
    evidence_name VARCHAR(255) NOT NULL,
    status activity_status NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert initial data
INSERT INTO projects (id, name, customer_name) VALUES
('proj-001', 'SOC 2 Compliance Audit', 'Innovate Inc.'),
('proj-002', 'ISO 27001 Certification', 'Tech Solutions LLC'),
('proj-003', 'Internal Security Review', 'DataSafe Corp');

INSERT INTO users (name, email, avatar_url, role, status, last_active) VALUES
('Admin Auditor', 'admin@auditace.com', 'https://picsum.photos/seed/admin/100/100', 'admin', 'Active', NOW() - INTERVAL '6 minutes'),
('Jane Doe', 'jane.doe@example.com', 'https://picsum.photos/seed/user1/100/100', 'auditor', 'Active', NOW() - INTERVAL '2 hours'),
('John Smith', 'john.smith@example.com', 'https://picsum.photos/seed/user2/100/100', 'auditor', 'Inactive', NOW() - INTERVAL '30 days'),
('Customer Client', 'client@customer.com', 'https://picsum.photos/seed/user3/100/100', 'customer', 'Active', NOW() - INTERVAL '1 day');

INSERT INTO agents (id, name, platform, status, last_sync, version) VALUES
('AGENT-001', 'Primary DC Server', 'windows', 'Active', NOW() - INTERVAL '30 minutes', '1.2.3'),
('AGENT-002', 'Design Team iMac', 'macos', 'Active', NOW() - INTERVAL '1 hour', '1.2.3'),
('AGENT-003', 'Ubuntu Jenkins Runner', 'linux', 'Inactive', NOW() - INTERVAL '1 day', '1.1.0'),
('AGENT-004', 'Staging Web Server', 'linux', 'Pending', NOW() - INTERVAL '7 days', '1.2.0'),
('AGENT-005', 'Marketing Laptop', 'windows', 'Active', NOW() - INTERVAL '1 minute', '1.2.3');

INSERT INTO evidence (id, project_id, agent_id, name, type, tags, uploaded_at, uploaded_by, preview_url, ai_hint) VALUES
('EV001', 'proj-001', 'AGENT-001', 'Firewall Configuration Review Q2', 'document', ARRAY['networking', 'security', 'q2-review'], '2023-06-15T10:30:00Z', 'AGENT-001', 'https://picsum.photos/seed/doc1/200/150', 'document'),
('EV002', 'proj-001', 'AGENT-002', 'Admin Panel Login Attempt Screenshot', 'screenshot', ARRAY['access-control', 'security-incident'], '2023-06-14T15:05:00Z', 'AGENT-002', 'https://picsum.photos/seed/screen1/200/150', 'screen'),
('EV003', 'proj-002', 'AGENT-003', 'Production Server Auth Logs (June)', 'log', ARRAY['server-logs', 'authentication'], '2023-06-12T09:00:00Z', 'AGENT-003', 'https://picsum.photos/seed/log1/200/150', 'code'),
('EV004', 'proj-002', NULL, 'VPC Network Diagram', 'network', ARRAY['architecture', 'networking'], '2023-06-11T11:45:00Z', 'Jane Doe', 'https://picsum.photos/seed/diagram1/200/150', 'diagram'),
('EV005', 'proj-003', NULL, 'Kubernetes Deployment YAML', 'config', ARRAY['kubernetes', 'deployment', 'iac'], '2023-06-10T18:20:00Z', 'John Smith', 'https://picsum.photos/seed/code1/200/150', 'code');

INSERT INTO audit_logs (id, user_name, user_avatar_url, action, details, timestamp, severity) VALUES
('LOG001', 'Jane Doe', 'https://picsum.photos/seed/user1/100/100', 'Generated Report', 'Generated "Q2 Firewall Compliance" section', NOW() - INTERVAL '1 hour', 'Low'),
('LOG002', 'John Smith', 'https://picsum.photos/seed/user2/100/100', 'Uploaded Evidence', 'Uploaded "Admin Panel Login Attempt Screenshot"', NOW() - INTERVAL '2 hours', 'Medium'),
('LOG003', 'Jane Doe', 'https://picsum.photos/seed/user1/100/100', 'Updated Profile', 'Changed profile email', NOW() - INTERVAL '1 day', 'Medium'),
('LOG004', 'Admin', 'https://picsum.photos/seed/admin/100/100', 'Changed Settings', 'Enabled dark mode globally', NOW() - INTERVAL '2 days', 'Medium'),
('LOG005', 'John Smith', 'https://picsum.photos/seed/user2/100/100', 'Logged In', 'Successfully authenticated', NOW() - INTERVAL '3 days', 'High');

INSERT INTO courses (id, title, description, duration, thumbnail_url) VALUES
('course-1', 'Advanced Compliance Documentation', 'Learn to write clear, concise, and defensible audit observations.', 'Approx. 90 mins', 'https://picsum.photos/seed/course1/300/200'),
('course-2', 'Evidence Management Best Practices', 'Master the art of linking and managing evidence to support your audit findings.', 'Approx. 75 mins', 'https://picsum.photos/seed/course2/300/200'),
('course-3', 'CISSP Certification Prep Course', 'Prepare for the industry-standard CISSP certification.', 'Approx. 120 mins', 'https://picsum.photos/seed/course3/300/200'),
('cust-course-1', 'Data Security & Privacy Basics', 'An essential introduction to data protection principles and how they affect your daily work.', 'Approx. 45 mins', 'https://picsum.photos/seed/custcourse1/300/200'),
('cust-course-2', 'SOC 2 Compliance Awareness', 'Understand the key principles of SOC 2 and your role in maintaining compliance.', 'Approx. 60 mins', 'https://picsum.photos/seed/custcourse2/300/200'),
('cust-course-3', 'Phishing & Social Engineering', 'Learn how to identify and protect yourself and the company from malicious attacks.', 'Approx. 30 mins', 'https://picsum.photos/seed/custcourse3/300/200');

INSERT INTO compliance_activities (id, evidence_name, status, timestamp) VALUES
('act-1', 'Firewall Config Q2', 'Accepted', NOW() - INTERVAL '30 minutes'),
('act-2', 'User Access Review', 'Accepted', NOW() - INTERVAL '1 hour'),
('act-3', 'Penetration Test Report', 'Rejected', NOW() - INTERVAL '4 hours'),
('act-4', 'New Server Setup Log', 'Pending', NOW() - INTERVAL '1 day');

-- Create indexes for better performance
CREATE INDEX idx_evidence_project_id ON evidence(project_id);
CREATE INDEX idx_evidence_agent_id ON evidence(agent_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_user_courses_user_id ON user_courses(user_id);
CREATE INDEX idx_compliance_activities_timestamp ON compliance_activities(timestamp);