import type { TimeWindow, Agent, DailyFlow, Facilitator, GraphEdge, GraphNode } from './types';

function getCutoff(window: TimeWindow): Date | null {
  if (window === 'all') return null;
  const now = new Date();
  switch (window) {
    case '24h': return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case '7d': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
}

export function filterAgents(agents: Agent[], window: TimeWindow): Agent[] {
  const cutoff = getCutoff(window);
  if (!cutoff) return agents;
  return agents.filter(a => {
    if (!a.last_seen) return false;
    return new Date(a.last_seen) >= cutoff;
  });
}

export function filterFlows(flows: DailyFlow[], window: TimeWindow): DailyFlow[] {
  const cutoff = getCutoff(window);
  if (!cutoff) return flows;
  return flows.filter(f => new Date(f.date) >= cutoff);
}

export function filterFacilitators(facs: Facilitator[], window: TimeWindow): Facilitator[] {
  const cutoff = getCutoff(window);
  if (!cutoff) return facs;
  return facs.filter(f => {
    if (!f.last_seen) return false;
    return new Date(f.last_seen) >= cutoff;
  });
}

export function filterEdges(edges: GraphEdge[], window: TimeWindow): GraphEdge[] {
  const cutoff = getCutoff(window);
  if (!cutoff) return edges;
  return edges.filter(e => {
    if (!e.last_tx) return false;
    return new Date(e.last_tx) >= cutoff;
  });
}

export function filterNodes(nodes: GraphNode[], filteredEdges: GraphEdge[]): GraphNode[] {
  const referenced = new Set<string>();
  for (const e of filteredEdges) {
    referenced.add(e.source.toLowerCase());
    referenced.add(e.target.toLowerCase());
  }
  return nodes.filter(n => referenced.has(n.address.toLowerCase()));
}
