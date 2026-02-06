import type { GraphNode, GraphEdge, Facilitator } from './types';
import { CHAIN_COLORS, FACILITATOR_COLORS } from './constants';

export interface CytoscapeNode {
  data: {
    id: string;
    label: string;
    chain: string;
    totalValue: number;
    totalSent: number;
    totalReceived: number;
    uniqueCounterparties: number;
    uniqueBuyers: number;
    uniqueSellers: number;
    txCount: number;
    size: number;
    color: string;
    type: 'agent' | 'facilitator';
  };
}

export interface CytoscapeEdge {
  data: {
    id: string;
    source: string;
    target: string;
    totalValue: number;
    txCount: number;
    facilitator: string;
    chain: string;
    width: number;
    color: string;
  };
}

export function nodesToCytoscape(nodes: GraphNode[]): CytoscapeNode[] {
  const maxValue = Math.max(...nodes.map((n) => n.total_value));

  return nodes.map((node) => ({
    data: {
      id: node.address,
      label: truncateAddr(node.address),
      chain: node.chain,
      totalValue: node.total_value,
      totalSent: node.total_sent,
      totalReceived: node.total_received,
      uniqueCounterparties: node.unique_counterparties,
      uniqueBuyers: node.unique_senders,
      uniqueSellers: node.unique_receivers,
      txCount: node.tx_count,
      size: 20 + (Math.log10(node.total_value + 1) / Math.log10(maxValue + 1)) * 60,
      color: CHAIN_COLORS[node.chain] || '#888888',
      type: 'agent' as const,
    },
  }));
}

export function edgesToCytoscape(edges: GraphEdge[], nodeIds?: Set<string>): CytoscapeEdge[] {
  // Filter edges: remove self-loops and ensure both endpoints exist in node set
  const filtered = edges.filter((e) => {
    if (e.source === e.target) return false;
    if (nodeIds && (!nodeIds.has(e.source) || !nodeIds.has(e.target))) return false;
    return true;
  });

  if (filtered.length === 0) return [];
  const maxValue = Math.max(...filtered.map((e) => e.total_value));

  return filtered.map((edge, i) => ({
    data: {
      id: `edge-${i}`,
      source: edge.source,
      target: edge.target,
      totalValue: edge.total_value,
      txCount: edge.tx_count,
      facilitator: edge.facilitator,
      chain: edge.chain,
      width: 1 + (Math.log10(edge.total_value + 1) / Math.log10(maxValue + 1)) * 8,
      color: FACILITATOR_COLORS[edge.facilitator] || '#555555',
    },
  }));
}

export function facilitatorsToCytoscape(facilitators: Facilitator[]): {
  nodes: CytoscapeNode[];
  edges: CytoscapeEdge[];
} {
  const maxValue = Math.max(...facilitators.map((f) => f.total_volume_usd));

  const nodes: CytoscapeNode[] = facilitators.map((f) => ({
    data: {
      id: f.facilitator,
      label: f.facilitator,
      chain: parseChains(f.chains)[0] || 'base',
      totalValue: f.total_volume_usd,
      totalSent: 0,
      totalReceived: f.total_volume_usd,
      uniqueCounterparties: f.unique_addresses,
      uniqueBuyers: f.unique_senders,
      uniqueSellers: f.unique_receivers,
      txCount: f.tx_count,
      size: 30 + (Math.log10(f.total_volume_usd + 1) / Math.log10(maxValue + 1)) * 60,
      color: FACILITATOR_COLORS[f.facilitator] || '#888888',
      type: 'facilitator' as const,
    },
  }));

  // Create edges between facilitators that share chains
  const edges: CytoscapeEdge[] = [];
  for (let i = 0; i < facilitators.length; i++) {
    for (let j = i + 1; j < facilitators.length; j++) {
      const chainsI = parseChains(facilitators[i].chains);
      const chainsJ = parseChains(facilitators[j].chains);
      const shared = chainsI.filter((c) => chainsJ.includes(c));
      if (shared.length > 0) {
        const value = Math.min(facilitators[i].total_volume_usd, facilitators[j].total_volume_usd) * 0.01;
        edges.push({
          data: {
            id: `fac-edge-${i}-${j}`,
            source: facilitators[i].facilitator,
            target: facilitators[j].facilitator,
            totalValue: value,
            txCount: 0,
            facilitator: shared[0],
            chain: shared[0],
            width: 1 + shared.length,
            color: CHAIN_COLORS[shared[0]] || '#555555',
          },
        });
      }
    }
  }

  return { nodes, edges };
}

function parseChains(chains: string[] | string): string[] {
  if (Array.isArray(chains)) return chains;
  try {
    return JSON.parse(chains as string);
  } catch {
    return [String(chains)];
  }
}

function truncateAddr(addr: string): string {
  if (!addr) return '';
  if (addr.length <= 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}
