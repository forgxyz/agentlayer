import { NextResponse } from 'next/server';
import type { GraphNode, GraphEdge } from '@/lib/types';
import { getCachedData } from '@/lib/redis-cache';
import { fetchers } from '@/lib/data-fetchers';

// Force dynamic rendering (no static pre-render at build time)
export const dynamic = 'force-dynamic';
// ISR: Revalidate every hour at the route cache level
export const revalidate = 3600;

export async function GET() {
  try {
    const [nodes, edges] = await Promise.all([
      getCachedData(
        'graph_nodes',
        fetchers.graph_nodes.fetch,
        fetchers.graph_nodes.fallback
      ) as Promise<GraphNode[]>,
      getCachedData(
        'graph_edges',
        fetchers.graph_edges.fetch,
        fetchers.graph_edges.fallback
      ) as Promise<GraphEdge[]>,
    ]);

    return NextResponse.json({ nodes, edges });
  } catch (error) {
    console.error('Graph API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch graph data' },
      { status: 500 }
    );
  }
}
