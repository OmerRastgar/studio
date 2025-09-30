import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Only test database connection in production runtime
    if (process.env.NODE_ENV === 'production' && process.env.DATABASE_URL) {
      // Dynamic import to avoid bundling pg on client side
      const { testConnection } = await import('@/lib/db');
      const dbConnected = await testConnection();
      
      if (dbConnected) {
        return NextResponse.json({ 
          status: 'healthy', 
          database: 'connected',
          timestamp: new Date().toISOString()
        });
      } else {
        return NextResponse.json({ 
          status: 'unhealthy', 
          database: 'disconnected',
          timestamp: new Date().toISOString()
        }, { status: 503 });
      }
    } else {
      // Development or build mode - just return healthy
      return NextResponse.json({ 
        status: 'healthy', 
        database: 'mock',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    return NextResponse.json({ 
      status: 'unhealthy', 
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    }, { status: 503 });
  }
}