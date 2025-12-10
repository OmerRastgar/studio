-- Create tables for Fluent Bit logs

-- Kong access logs from Fluent Bit
CREATE TABLE IF NOT EXISTS fluent_audit_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    request_method TEXT,
    request_uri TEXT,
    request_size INTEGER,
    response_status INTEGER,
    response_size INTEGER,
    latency_request INTEGER,
    latency_upstream INTEGER,
    latency_proxy INTEGER,
    client_ip INET,
    user_agent TEXT,
    jwt_token TEXT,
    user_authenticated BOOLEAN DEFAULT FALSE,
    audit_type TEXT DEFAULT 'api_access',
    source TEXT DEFAULT 'kong_gateway',
    environment TEXT DEFAULT 'production',
    service TEXT DEFAULT 'audit-app',
    raw_log JSONB
);

-- Application logs from Fluent Bit
CREATE TABLE IF NOT EXISTS fluent_app_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    level TEXT,
    message TEXT,
    component TEXT,
    user_id TEXT,
    session_id TEXT,
    request_id TEXT,
    environment TEXT DEFAULT 'production',
    service TEXT DEFAULT 'audit-app',
    raw_log JSONB
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_fluent_audit_logs_timestamp ON fluent_audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_fluent_audit_logs_client_ip ON fluent_audit_logs(client_ip);
CREATE INDEX IF NOT EXISTS idx_fluent_audit_logs_user_auth ON fluent_audit_logs(user_authenticated);
CREATE INDEX IF NOT EXISTS idx_fluent_audit_logs_status ON fluent_audit_logs(response_status);

CREATE INDEX IF NOT EXISTS idx_fluent_app_logs_timestamp ON fluent_app_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_fluent_app_logs_level ON fluent_app_logs(level);
CREATE INDEX IF NOT EXISTS idx_fluent_app_logs_user_id ON fluent_app_logs(user_id);

-- View to combine audit logs from both sources
CREATE OR REPLACE VIEW comprehensive_audit_logs AS
SELECT 
    'kong' as source_type,
    timestamp,
    client_ip::text as client_ip,
    request_method as action,
    request_uri as details,
    response_status as status_code,
    user_authenticated,
    jwt_token,
    NULL as user_id,
    NULL as session_id
FROM fluent_audit_logs
UNION ALL
SELECT 
    'application' as source_type,
    timestamp,
    NULL as client_ip,
    component as action,
    message as details,
    NULL as status_code,
    CASE WHEN user_id IS NOT NULL THEN true ELSE false END as user_authenticated,
    NULL as jwt_token,
    user_id,
    session_id
FROM fluent_app_logs
ORDER BY timestamp DESC;