import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check if we're in a runtime environment with database support
    const hasDatabase = process.env.DATABASE_URL && typeof window === 'undefined';
    
    if (hasDatabase) {
      try {
        // Dynamic import to avoid bundling pg during build
        const { testConnection } = await import('@/lib/db');
        const dbConnected = await testConnection();
        
        return NextResponse.json({ 
          status: dbConnected ? 'healthy' : 'unhealthy', 
          database: dbConnected ? 'connected' : 'disconnected',
          timestamp: new Date().toISOString()
        }, { status: dbConnected ? 200 : 503 });
      } catch (dbError) {
        // Database module not available or connection failed
        return NextResponse.json({ 
          status: 'unhealthy', 
          database: 'unavailable',
          error: 'Database connection failed',
          timestamp: new Date().toISOString()
        }, { status: 503 });
      }
    } else {
      // No database configured
      return NextResponse.json({ 
        status: 'healthy', 
        database: 'not-configured',
        message: 'Database not configured for this environment',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    return NextResponse.json({ 
      status: 'unhealthy', 
      database: 'error',
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    }, { status: 503 });
  }
}