import jwt from 'jsonwebtoken';

// Dynamic import for bcrypt to avoid build issues
async function getBcrypt() {
  const bcrypt = await import('bcryptjs');
  return bcrypt.default;
}

// JWT configuration - must match Kong configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-256-bit-secret-key-here-change-this-in-production';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  name: string;
  iss: string; // Kong requires 'iss' claim - must match Kong consumer key
  iat?: number; // Issued at
  exp?: number; // Expires at
}

// Generate JWT token compatible with Kong JWT plugin
export function generateToken(payload: Omit<JWTPayload, 'iss' | 'iat' | 'exp'>): string {
  const now = Math.floor(Date.now() / 1000);
  const tokenPayload: JWTPayload = {
    ...payload,
    iss: 'audit-app-key', // This must match the key in Kong consumer configuration
    iat: now,
    exp: now + (24 * 60 * 60) // 24 hours from now
  };
  
  // Generate token with HS256 algorithm (Kong default)
  return jwt.sign(tokenPayload, JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: '24h',
  });
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  const bcrypt = await getBcrypt();
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

// Verify password
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  const bcrypt = await getBcrypt();
  return bcrypt.compare(password, hashedPassword);
}