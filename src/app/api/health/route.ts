import { NextResponse } from 'next/server';

export async function GET() {
  try {
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
  } catch (error) {
    return NextResponse.json({ 
      status: 'unhealthy', 
      error: 'Database connection failed',
      timestamp: new Date().toISOString()
    }, { status: 503 });
  }
}