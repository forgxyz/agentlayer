import { NextResponse } from 'next/server';
import { computeReputationScore } from '@/lib/reputation';
import { deduplicateFeedback, annotateFeedback } from '@/lib/feedback-dedup';
import { lookupServer } from '@/lib/server-lookup';
import { getCachedData } from '@/lib/redis-cache';
import { fetchers } from '@/lib/data-fetchers';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

function parseArrayField(field: unknown): string[] {
  if (Array.isArray(field)) return field;
  if (typeof field === 'string') {
    try { return JSON.parse(field); } catch { return [field]; }
  }
  return [];
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;
  const addr = address.toLowerCase();

  // Fetch all data in parallel with error handling
  let agentsData, participantsData, edgesData, erc8004AgentsData, erc8004FeedbackData;
  try {
    [agentsData, participantsData, edgesData, erc8004AgentsData, erc8004FeedbackData] = await Promise.all([
      getCachedData('agents', fetchers.agents.fetch, fetchers.agents.fallback),
      getCachedData('participants', fetchers.participants.fetch, fetchers.participants.fallback),
      getCachedData('graph_edges', fetchers.graph_edges.fetch, fetchers.graph_edges.fallback),
      getCachedData('erc8004_agents', fetchers.erc8004_agents.fetch, fetchers.erc8004_agents.fallback),
      getCachedData('erc8004_feedback', fetchers.erc8004_feedback.fetch, fetchers.erc8004_feedback.fallback),
    ]);
  } catch (error) {
    console.error('Failed to fetch data for agent detail:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch agent data',
        message: error instanceof Error ? error.message : 'Unknown error',
        address: addr,
      },
      { status: 503 }
    );
  }

  // Try agents.json first (service providers with full data)
  const rawAgents = agentsData as Record<string, unknown>[];
  const agentRaw = rawAgents.find(
    (a) => String(a.address).toLowerCase() === addr
  );

  // Try participants.json as fallback (includes senders/bilateral)
  const rawParticipants = participantsData as Record<string, unknown>[];
  const participantRaw = rawParticipants.find(
    (p) => String(p.address).toLowerCase() === addr
  );

  // Check ERC-8004 registrations for this owner address
  const erc8004Agents = (erc8004AgentsData as Record<string, unknown>[]).filter(
    (a) => String(a.owner_address || '').toLowerCase() === addr
  );

  // If not in any dataset, 404
  if (!agentRaw && !participantRaw && erc8004Agents.length === 0) {
    return NextResponse.json({ error: 'Address not found' }, { status: 404 });
  }

  // Build agent profile from x402 data
  let agent;
  if (agentRaw) {
    agent = {
      address: String(agentRaw.address),
      chains: parseArrayField(agentRaw.chains),
      total_sent_usd: 0,
      total_received_usd: Number(agentRaw.total_received_usd) || 0,
      total_value_usd: Number(agentRaw.total_received_usd) || 0,
      unique_requesters: Number(agentRaw.unique_requesters) || 0,
      unique_receivers: 0,
      tx_count: Number(agentRaw.tx_count) || 0,
      avg_tx_value: Number(agentRaw.avg_tx_value) || 0,
      median_tx_value: Number(agentRaw.median_tx_value) || 0,
      first_seen: String(agentRaw.first_seen || ''),
      last_seen: String(agentRaw.last_seen || ''),
      facilitators: parseArrayField(agentRaw.facilitators),
      role: 'service_provider' as string,
      reputation_score: 0,
      erc8004_registered: false,
      erc8004_name: null as string | null,
      erc8004_agent_count: 0,
      erc8004_chains: [] as string[],
      erc8004_feedback_count: 0,
      erc8004_feedback_raw_count: 0,
      erc8004_avg_score: null as number | null,
      server_name: null as string | null,
      server_url: null as string | null,
      server_description: null as string | null,
      server_x402scan_url: null as string | null,
    };

    if (participantRaw) {
      agent.total_sent_usd = Number(participantRaw.total_sent_usd) || 0;
      agent.total_value_usd = agent.total_sent_usd + agent.total_received_usd;
      agent.unique_receivers = Number(participantRaw.unique_receivers) || 0;
      agent.role = String(participantRaw.role || 'service_provider');
    }
  } else if (participantRaw) {
    const p = participantRaw;
    agent = {
      address: String(p.address),
      chains: parseArrayField(p.chains),
      total_sent_usd: Number(p.total_sent_usd) || 0,
      total_received_usd: Number(p.total_received_usd) || 0,
      total_value_usd: Number(p.total_value_usd) || 0,
      unique_requesters: Number(p.unique_senders) || 0,
      unique_receivers: Number(p.unique_receivers) || 0,
      tx_count: Number(p.tx_count) || 0,
      avg_tx_value: 0,
      median_tx_value: 0,
      first_seen: String(p.first_seen || ''),
      last_seen: String(p.last_seen || ''),
      facilitators: parseArrayField(p.facilitators),
      role: String(p.role || 'unknown'),
      reputation_score: 0,
      erc8004_registered: false,
      erc8004_name: null as string | null,
      erc8004_agent_count: 0,
      erc8004_chains: [] as string[],
      erc8004_feedback_count: 0,
      erc8004_feedback_raw_count: 0,
      erc8004_avg_score: null as number | null,
      server_name: null as string | null,
      server_url: null as string | null,
      server_description: null as string | null,
      server_x402scan_url: null as string | null,
    };
    if (agent.tx_count > 0) {
      agent.avg_tx_value = agent.total_value_usd / agent.tx_count;
    }
  } else {
    // ERC-8004 only - no x402 activity
    const firstReg = erc8004Agents[0];
    const chains = [...new Set(erc8004Agents.map(a => String(a.chain)))];
    const name = erc8004Agents.find(a => a.name)?.name;
    agent = {
      address: addr,
      chains,
      total_sent_usd: 0,
      total_received_usd: 0,
      total_value_usd: 0,
      unique_requesters: 0,
      unique_receivers: 0,
      tx_count: 0,
      avg_tx_value: 0,
      median_tx_value: 0,
      first_seen: '',
      last_seen: '',
      facilitators: [],
      role: 'registered_only',
      reputation_score: 0,
      erc8004_registered: true,
      erc8004_name: name ? String(name) : null,
      erc8004_agent_count: erc8004Agents.length,
      erc8004_chains: chains,
      erc8004_feedback_count: 0,
      erc8004_feedback_raw_count: 0,
      erc8004_avg_score: null as number | null,
      server_name: null as string | null,
      server_url: null as string | null,
      server_description: null as string | null,
      server_x402scan_url: null as string | null,
    };
  }

  // Enrich with ERC-8004 data
  if (erc8004Agents.length > 0) {
    agent.erc8004_registered = true;
    agent.erc8004_agent_count = erc8004Agents.length;
    agent.erc8004_chains = [...new Set(erc8004Agents.map(a => String(a.chain)))];
    const namedAgent = erc8004Agents.find(a => a.name);
    if (namedAgent) agent.erc8004_name = String(namedAgent.name);
  }

  // Get feedback for this owner's agents
  const agentIds = new Set(erc8004Agents.map(a => Number(a.agent_id)));
  const feedback = (erc8004FeedbackData as Record<string, unknown>[])
    .filter(f => agentIds.has(Number(f.agent_id)))
    .map(f => ({
      chain: String(f.chain),
      timestamp: String(f.timestamp),
      transaction_hash: String(f.transaction_hash),
      agent_id: Number(f.agent_id),
      client_address: String(f.client_address),
      score: f.score != null ? Number(f.score) : null,
      tag1: f.tag1 ? String(f.tag1) : null,
      tag2: f.tag2 ? String(f.tag2) : null,
      endpoint: f.endpoint ? String(f.endpoint) : null,
    }))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  if (feedback.length > 0) {
    const dedupResult = deduplicateFeedback(feedback);
    agent.erc8004_feedback_count = dedupResult.deduped_count;
    agent.erc8004_feedback_raw_count = dedupResult.raw_count;
    agent.erc8004_avg_score = dedupResult.avg_score;
  }

  // Build ERC-8004 registrations list for detail page
  const registrations = erc8004Agents.map(a => ({
    chain: String(a.chain),
    agent_id: Number(a.agent_id),
    name: a.name ? String(a.name) : null,
    agent_uri: a.agent_uri ? String(a.agent_uri) : null,
    registered_at: String(a.registered_at || ''),
    transaction_hash: String(a.transaction_hash || ''),
  }));

  // Enrich with x402scan server info
  const server = lookupServer(addr);
  if (server) {
    agent.server_name = server.name;
    agent.server_url = server.url;
    agent.server_description = server.description;
    agent.server_x402scan_url = server.x402scan_url;
  }

  // Compute reputation
  agent.reputation_score = computeReputationScore({
    total_received_usd: agent.total_received_usd,
    unique_requesters: agent.unique_requesters,
    tx_count: agent.tx_count,
    avg_feedback_score: agent.erc8004_avg_score ?? undefined,
  });

  // Find edges involving this address
  const edges = (edgesData as Record<string, unknown>[]).filter(
    (e) =>
      String(e.source).toLowerCase() === addr ||
      String(e.target).toLowerCase() === addr
  ).map((e) => ({
    source: String(e.source),
    target: String(e.target),
    chain: String(e.chain),
    facilitator: String(e.facilitator),
    total_value: Number(e.total_value) || 0,
    tx_count: Number(e.tx_count) || 0,
    first_tx: String(e.first_tx || ''),
    last_tx: String(e.last_tx || ''),
  }));

  // Compute top counterparties from edges
  const counterpartyMap = new Map<string, { address: string; value: number; txCount: number }>();
  for (const edge of edges) {
    const other = edge.source.toLowerCase() === addr ? edge.target : edge.source;
    const existing = counterpartyMap.get(other) || { address: other, value: 0, txCount: 0 };
    existing.value += edge.total_value;
    existing.txCount += edge.tx_count;
    counterpartyMap.set(other, existing);
  }
  const topCounterparties = Array.from(counterpartyMap.values())
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const annotatedFeedback = annotateFeedback(feedback);

  return NextResponse.json({
    agent,
    edges,
    topCounterparties,
    erc8004: {
      registrations,
      feedback: annotatedFeedback,
    },
  });
}
