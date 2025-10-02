import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('Debug endpoint called');
    
    // Test database connection
    const { prisma } = await import('@/lib/prisma');
    console.log('Prisma imported successfully');
    
    // Test database query
    const userCount = await prisma.user.count();
    console.log('User count:', userCount);
    
    // Test a specific user
    const testUser = await prisma.user.findFirst({
      where: { email: 'admin@auditace.com' },
      select: { id: true, name: true, email: true, role: true }
    });
    console.log('Test user:', testUser);
    
    return NextResponse.json({
      success: true,
      database: 'connected',
      userCount,
      testUser,
      environment: process.env.NODE_ENV,
      databaseUrl: process.env.DATABASE_URL ? 'configured' : 'missing'
    });
    
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}