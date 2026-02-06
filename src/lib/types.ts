export interface GraphNode {
  address: string;
  chain: string;
  total_sent: number;
  total_received: number;
  total_value: number;
  unique_receivers: number;
  unique_senders: number;
  unique_counterparties: number;
  tx_count: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  chain: string;
  facilitator: string;
  total_value: number;
  tx_count: number;
  first_tx: string;
  last_tx: string;
}

export interface Agent {
  address: string;
  chains: string[];
  total_received_usd: number;
  total_sent_usd: number;
  total_value_usd: number;
  unique_requesters: number;
  unique_receivers: number;
  tx_count: number;
  avg_tx_value: number;
  median_tx_value: number;
  first_seen: string;
  last_seen: string;
  facilitators: string[];
  role: string;
  reputation_score?: number;
  // ERC-8004 fields
  erc8004_registered: boolean;
  erc8004_name?: string | null;
  erc8004_agent_count?: number;
  erc8004_chains?: string[];
  erc8004_feedback_count?: number;
  erc8004_feedback_raw_count?: number;
  erc8004_avg_score?: number | null;
  // x402scan server fields
  server_name?: string | null;
  server_url?: string | null;
  server_description?: string | null;
  server_x402scan_url?: string | null;
}

export interface DailyFlow {
  date: string;
  chain: string;
  daily_volume_usd: number;
  tx_count: number;
  unique_senders: number;
  unique_receivers: number;
}

export interface Facilitator {
  facilitator: string;
  chains: string[];
  total_volume_usd: number;
  tx_count: number;
  unique_senders: number;
  unique_receivers: number;
  unique_addresses: number;
  first_seen: string;
  last_seen: string;
  avg_tx_value: number;
}

export interface ERC8004Agent {
  chain: string;
  agent_id: number;
  agent_id_hex: string;
  owner_address: string;
  registered_at: string;
  transaction_hash: string;
  name: string | null;
  agent_uri: string | null;
}

export interface ERC8004Feedback {
  chain: string;
  timestamp: string;
  transaction_hash: string;
  agent_id: number;
  client_address: string;
  score: number | null;
  tag1: string | null;
  tag2: string | null;
  endpoint: string | null;
}

export type TimeWindow = '24h' | '7d' | '30d' | 'all';

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface HeroStats {
  totalVolume: number;
  totalTransactions: number;
  uniqueAgents: number;
  activeFacilitators: number;
  activeChains: number;
}
