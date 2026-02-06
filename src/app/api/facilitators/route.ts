import { NextResponse } from 'next/server';
import type { Facilitator } from '@/lib/types';
import { getCachedData } from '@/lib/redis-cache';
import { fetchers } from '@/lib/data-fetchers';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

export async function GET() {
  try {
    const facilitators = await getCachedData(
      'facilitators',
      fetchers.facilitators.fetch,
      fetchers.facilitators.fallback
    ) as Facilitator[];
    return NextResponse.json(facilitators);
  } catch (error) {
    console.error('Facilitators API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch facilitators' },
      { status: 500 }
    );
  }
}
