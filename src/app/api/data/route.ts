import { NextResponse } from 'next/server';
import { getServerData } from '@/lib/data';

export async function GET() {
  try {
    const data = await getServerData();
    return NextResponse.json(data);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}