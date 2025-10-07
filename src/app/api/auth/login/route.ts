import { NextRequest, NextResponse } from 'next/server';
import { generateToken, verifyPassword } from '@/lib/jwt';

// Dynamic import to avoid build issues
async function getPrisma() {
  const { prisma } = await import('@/lib/prisma');
  return prisma;
}

export async function POST(request: NextRequest) {
  try {
    console.log('Login API called');
    
    const { email, password } = await request.json();
    console.log('Login attempt for email:', email);

    // Validate input
    if (!email || !password) {
      console.log('Missing email or password');
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Get Prisma instance
    const prisma = await getPrisma();
    console.log('Prisma instance obtained');

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });
    console.log('User found:', user ? 'Yes' : 'No');

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password (handle both hashed and dev passwords)
    let isValidPassword = false;
    
    if (user.password.startsWith('dev_hash_')) {
      // Development mode - simple password check
      const expectedHash = `dev_hash_${password}`;
      isValidPassword = user.password === expectedHash;
      console.log('Using dev password verification');
    } else {
      // Production mode - bcrypt verification
      isValidPassword = await verifyPassword(password, user.password);
      console.log('Using bcrypt password verification');
    }
    
    if (!isValidPassword) {
      console.log('Password verification failed');
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    console.log('Password verification successful');

    // Check if user is active
    if (user.status !== 'Active') {
      return NextResponse.json(
        { error: 'Account is not active' },
        { status: 403 }
      );
    }

    // Generate JWT token compatible with Kong
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    // Update last active timestamp
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { lastActive: new Date() }
      });
      console.log('User last active updated');
    } catch (updateError) {
      console.error('Failed to update last active:', updateError);
    }

    // Log the login
    try {
      await prisma.auditLog.create({
        data: {
          id: `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          userName: user.name,
          userAvatarUrl: user.avatarUrl,
          action: 'User Login',
          details: `User ${user.email} logged in successfully`,
          severity: 'Low'
        }
      });
      console.log('Audit log created');
    } catch (logError) {
      console.error('Failed to create audit log:', logError);
    }

    const response = NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
      }
    });

    // Set JWT token in cookie for Kong to read
    response.cookies.set('auth_token', token, {
      httpOnly: false, // Allow JavaScript access for client-side usage
      secure: false, // Set to false for development/HTTP
      sameSite: 'lax', // More permissive for development
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('Login error details:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : String(error) : undefined
      },
      { status: 500 }
    );
  }
}