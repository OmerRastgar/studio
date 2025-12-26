import { NextRequest, NextResponse } from 'next/server';
import { register, collectDefaultMetrics } from 'prom-client';

// Initialize default metrics collection
// Ensure this only runs once in dev mode
if (global.process) {
    collectDefaultMetrics({ prefix: 'frontend_' });
}

export async function GET(req: NextRequest) {
    try {
        const metrics = await register.metrics();
        return new NextResponse(metrics, {
            status: 200,
            headers: {
                'Content-Type': register.contentType,
            },
        });
    } catch (err) {
        return new NextResponse(String(err), { status: 500 });
    }
}

// Prevent Next.js from caching this route
export const dynamic = 'force-dynamic';
