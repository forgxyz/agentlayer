import { NextResponse } from 'next/server';
import type { DailyFlow } from '@/lib/types';
import { getCachedData } from '@/lib/redis-cache';
import { fetchers } from '@/lib/data-fetchers';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

export async function GET() {
  try {
    const flows = await getCachedData(
      'flows',
      fetchers.flows.fetch,
      fetchers.flows.fallback
    ) as DailyFlow[];
    return NextResponse.json(flows);
  } catch (error) {
    console.error('Flows API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch flows' },
      { status: 500 }
    );
  }
}
