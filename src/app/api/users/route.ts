import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/jwt';

// GET /api/users - Get all users
export async function GET(request: NextRequest) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        avatarUrl: true,
        lastActive: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      users: users.map(user => ({
        ...user,
        lastActive: user.lastActive?.toISOString(),
        createdAt: user.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST /api/users - Create new user
export async function POST(request: NextRequest) {
  try {
    const { name, email, role } = await request.json();

    if (!name || !email || !role) {
      return NextResponse.json(
        { error: 'Name, email, and role are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Generate default password (should be changed on first login)
    const defaultPassword = await hashPassword('password123');

    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        role,
        password: defaultPassword,
        avatarUrl: `https://picsum.photos/seed/${name.replace(/\s+/g, '')}/100/100`,
        status: 'Active',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        avatarUrl: true,
        lastActive: true,
        createdAt: true,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        id: `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userName: 'System Admin',
        action: 'User Created',
        details: `New user ${name} (${email}) created with role ${role}`,
        severity: 'Medium',
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        ...user,
        lastActive: user.lastActive?.toISOString(),
        createdAt: user.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}