-- Create manager user
INSERT INTO users (id, name, email, password, role, status, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'Manager User',
    'manager@auditace.com',
    '$2b$10$xyWN8PgvHjYfhsGPGNZ0keHN1J5.N8vfrHKHOq7f/x.sT6Qzz6cXq',
    'manager',
    'Active',
    NOW(),
    NOW()
) ON CONFLICT (email) DO NOTHING;
