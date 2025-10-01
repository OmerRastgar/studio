import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, extractTokenFromHeader } from '@/lib/jwt';

export async function POST(request: NextRequest) {
  try {
    // Extract token for logging purposes
    const authHeader = request.headers.get('Authorization');
    const token = extractTokenFromHeader(authHeader);
    
    let userName = 'Unknown User';
    
    if (token) {
      const payload = verifyToken(token);
      if (payload) {
        try {
          const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: { name: true, email: true }
          });
          if (user) {
            userName = user.name;
          }
        } catch (error) {
          console.error('Failed to fetch user for logout log:', error);
        }
      }
    }

    // Log the logout
    await prisma.auditLog.create({
      data: {
        id: `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userName,
        userAvatarUrl: null,
        action: 'User Logout',
        details: `User ${userName} logged out`,
        severity: 'Low'
      }
    });

    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });

    // Clear the auth cookie
    response.cookies.set('auth_token', '', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0, // Expire immediately
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}