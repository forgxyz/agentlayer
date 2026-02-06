import { NextResponse } from 'next/server';
import { getCachedData } from '@/lib/redis-cache';
import { fetchers } from '@/lib/data-fetchers';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

export async function GET() {
  try {
    const erc8004AgentsData = await getCachedData(
      'erc8004_agents',
      fetchers.erc8004_agents.fetch,
      fetchers.erc8004_agents.fallback
    );

    return NextResponse.json(erc8004AgentsData);
  } catch (error) {
    console.error('ERC-8004 API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ERC-8004 data' },
      { status: 500 }
    );
  }
}
