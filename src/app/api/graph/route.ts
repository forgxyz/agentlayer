import { NextResponse } from 'next/server';
import type { GraphNode, GraphEdge } from '@/lib/types';

// Static data import for instant loading
import nodesData from '../../../../public/data/nodes.json';
import edgesData from '../../../../public/data/edges.json';

export async function GET() {
  try {
    const nodes = nodesData as GraphNode[];
    const edges = edgesData as GraphEdge[];

    return NextResponse.json({ nodes, edges });
  } catch (error) {
    console.error('Graph API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch graph data' },
      { status: 500 }
    );
  }
}
