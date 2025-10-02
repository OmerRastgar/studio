import jwt from 'jsonwebtoken';

// Dynamic import for bcrypt to avoid build issues
async function getBcrypt() {
  const bcrypt = await import('bcryptjs');
  return bcrypt.default;
}

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-256-bit-secret-key-here-change-this-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iss: string; // Kong requires 'iss' claim
}

// Generate JWT token
export function generateToken(payload: Omit<JWTPayload, 'iss'>): string {
  const tokenPayload: JWTPayload = {
    ...payload,
    iss: 'audit-app-key' // This must match the key in Kong configuration
  };
  
  // Simple approach without explicit typing
  return jwt.sign(tokenPayload, JWT_SECRET, {
    expiresIn: '24h', // Use hardcoded value to avoid TypeScript issues
  });
}

// Verify JWT token
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
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

// Extract token from Authorization header
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7); // Remove 'Bearer ' prefix
}