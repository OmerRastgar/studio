import { NextResponse } from 'next/server';

export async function GET() {
  // Simple health check that doesn't depend on database during build
  return NextResponse.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
}