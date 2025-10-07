import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Kong JWT plugin adds JWT claims to headers after validation
    // If we reach this endpoint, JWT is already validated by Kong
    const userId = request.headers.get('X-JWT-Claim-userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'No user ID in JWT claims' },
        { status: 401 }
      );
    }

    // Get user from database to ensure they still exist and are active
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        avatarUrl: true,
        lastActive: true,
        createdAt: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (user.status !== 'Active') {
      return NextResponse.json(
        { error: 'Account is not active' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        avatarUrl: user.avatarUrl,
        lastActive: user.lastActive?.toISOString(),
        createdAt: user.createdAt.toISOString()
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}