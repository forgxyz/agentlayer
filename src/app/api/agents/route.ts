import { NextResponse } from 'next/server';
import { computeReputationScore } from '@/lib/reputation';
import { deduplicateFeedback } from '@/lib/feedback-dedup';
import { lookupServer } from '@/lib/server-lookup';
import type { Agent } from '@/lib/types';

import agentsData from '../../../../public/data/agents.json';
import participantsData from '../../../../public/data/participants.json';
import erc8004AgentsData from '../../../../public/data/erc8004_agents.json';
import erc8004FeedbackData from '../../../../public/data/erc8004_feedback.json';

function parseArrayField(field: unknown): string[] {
  if (Array.isArray(field)) return field;
  if (typeof field === 'string') {
    try {
      return JSON.parse(field);
    } catch {
      return [field];
    }
  }
  return [];
}

// Build 8004 lookup: owner_address -> aggregated registration info
function buildErc8004Lookup() {
  const erc8004Agents = erc8004AgentsData as Record<string, unknown>[];
  const erc8004Feedback = erc8004FeedbackData as Record<string, unknown>[];

  // Group registrations by owner
  const ownerMap = new Map<string, {
    name: string | null;
    agent_count: number;
    chains: Set<string>;
    agent_ids: number[];
  }>();

  for (const a of erc8004Agents) {
    const owner = String(a.owner_address || '').toLowerCase();
    if (!owner) continue;
    const existing = ownerMap.get(owner) || {
      name: null,
      agent_count: 0,
      chains: new Set<string>(),
      agent_ids: [],
    };
    existing.agent_count++;
    if (a.chain) existing.chains.add(String(a.chain));
    if (a.name && !existing.name) existing.name = String(a.name);
    existing.agent_ids.push(Number(a.agent_id) || 0);
    ownerMap.set(owner, existing);
  }

  // Group feedback by agent_id, then map to owners
  const agentIdToOwner = new Map<number, string>();
  for (const a of erc8004Agents) {
    const id = Number(a.agent_id) || 0;
    const owner = String(a.owner_address || '').toLowerCase();
    if (id && owner) agentIdToOwner.set(id, owner);
  }

  // Group raw feedback entries by owner for dedup
  const ownerFeedbackEntries = new Map<string, Array<{
    agent_id: number;
    client_address: string;
    score: number | null;
    tag1: string | null;
    timestamp: string;
  }>>();
  for (const f of erc8004Feedback) {
    const agentId = Number(f.agent_id) || 0;
    const owner = agentIdToOwner.get(agentId);
    if (!owner) continue;
    const arr = ownerFeedbackEntries.get(owner) || [];
    arr.push({
      agent_id: agentId,
      client_address: String(f.client_address || ''),
      score: f.score != null ? Number(f.score) : null,
      tag1: f.tag1 ? String(f.tag1) : null,
      timestamp: String(f.timestamp || ''),
    });
    ownerFeedbackEntries.set(owner, arr);
  }

  // Deduplicate feedback per owner
  const ownerFeedback = new Map<string, { avg_score: number | null; deduped_count: number; raw_count: number }>();
  for (const [owner, entries] of ownerFeedbackEntries) {
    ownerFeedback.set(owner, deduplicateFeedback(entries));
  }

  return { ownerMap, ownerFeedback };
}

export async function GET() {
  try {
    const { ownerMap, ownerFeedback } = buildErc8004Lookup();
    const rawAgents = agentsData as Record<string, unknown>[];
    const rawParticipants = participantsData as Record<string, unknown>[];

    // Build unified agent map keyed by address
    const agentMap = new Map<string, Agent>();

    // 1. Add x402 service providers (agents.json - most detailed data)
    for (const a of rawAgents) {
      const addr = String(a.address || '').toLowerCase();
      if (!addr) continue;
      agentMap.set(addr, {
        address: addr,
        chains: parseArrayField(a.chains),
        total_received_usd: Number(a.total_received_usd) || 0,
        total_sent_usd: 0,
        total_value_usd: Number(a.total_received_usd) || 0,
        unique_requesters: Number(a.unique_requesters) || 0,
        unique_receivers: 0,
        tx_count: Number(a.tx_count) || 0,
        avg_tx_value: Number(a.avg_tx_value) || 0,
        median_tx_value: Number(a.median_tx_value) || 0,
        first_seen: String(a.first_seen || ''),
        last_seen: String(a.last_seen || ''),
        facilitators: parseArrayField(a.facilitators),
        role: 'service_provider',
        reputation_score: 0,
        erc8004_registered: false,
      });
    }

    // 2. Merge participants data (adds senders, bilateral, enriches providers)
    for (const p of rawParticipants) {
      const addr = String(p.address || '').toLowerCase();
      if (!addr) continue;
      const existing = agentMap.get(addr);
      if (existing) {
        // Enrich existing service provider with participant data
        existing.total_sent_usd = Number(p.total_sent_usd) || 0;
        existing.total_value_usd = existing.total_sent_usd + existing.total_received_usd;
        existing.unique_receivers = Number(p.unique_receivers) || 0;
        existing.role = String(p.role || existing.role);
      } else {
        // New participant (requester or bilateral not in service provider list)
        agentMap.set(addr, {
          address: addr,
          chains: parseArrayField(p.chains),
          total_received_usd: Number(p.total_received_usd) || 0,
          total_sent_usd: Number(p.total_sent_usd) || 0,
          total_value_usd: Number(p.total_value_usd) || 0,
          unique_requesters: Number(p.unique_senders) || 0,
          unique_receivers: Number(p.unique_receivers) || 0,
          tx_count: Number(p.tx_count) || 0,
          avg_tx_value: Number(p.total_value_usd) && Number(p.tx_count)
            ? Number(p.total_value_usd) / Number(p.tx_count) : 0,
          median_tx_value: 0,
          first_seen: String(p.first_seen || ''),
          last_seen: String(p.last_seen || ''),
          facilitators: parseArrayField(p.facilitators),
          role: String(p.role || 'unknown'),
          reputation_score: 0,
          erc8004_registered: false,
        });
      }
    }

    // 3. Add ERC-8004 registered agents not already in x402 data
    for (const [owner, info] of ownerMap) {
      if (!agentMap.has(owner)) {
        const feedback = ownerFeedback.get(owner);
        agentMap.set(owner, {
          address: owner,
          chains: Array.from(info.chains),
          total_received_usd: 0,
          total_sent_usd: 0,
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
          erc8004_name: info.name,
          erc8004_agent_count: info.agent_count,
          erc8004_chains: Array.from(info.chains),
          erc8004_feedback_count: feedback?.deduped_count || 0,
          erc8004_feedback_raw_count: feedback?.raw_count || 0,
          erc8004_avg_score: feedback?.avg_score ?? null,
        });
      }
    }

    // 4. Enrich ALL agents with ERC-8004 data where owner matches
    for (const [addr, agent] of agentMap) {
      const erc = ownerMap.get(addr);
      if (erc) {
        agent.erc8004_registered = true;
        agent.erc8004_name = erc.name;
        agent.erc8004_agent_count = erc.agent_count;
        agent.erc8004_chains = Array.from(erc.chains);
        const feedback = ownerFeedback.get(addr);
        agent.erc8004_feedback_count = feedback?.deduped_count || 0;
        agent.erc8004_feedback_raw_count = feedback?.raw_count || 0;
        agent.erc8004_avg_score = feedback?.avg_score ?? null;
      }

      // Enrich with x402scan server info
      const server = lookupServer(addr);
      if (server) {
        agent.server_name = server.name;
        agent.server_url = server.url;
        agent.server_description = server.description;
        agent.server_x402scan_url = server.x402scan_url;
      }

      // Compute reputation score
      agent.reputation_score = computeReputationScore({
        total_received_usd: agent.total_received_usd,
        unique_requesters: agent.unique_requesters,
        tx_count: agent.tx_count,
        avg_feedback_score: agent.erc8004_avg_score ?? undefined,
      });
    }

    // Convert to array, sort by reputation + volume
    const agents = Array.from(agentMap.values()).sort((a, b) => {
      // Prioritize agents with both x402 activity AND 8004 registration
      const aHasBoth = a.erc8004_registered && a.total_value_usd > 0 ? 1 : 0;
      const bHasBoth = b.erc8004_registered && b.total_value_usd > 0 ? 1 : 0;
      if (aHasBoth !== bHasBoth) return bHasBoth - aHasBoth;
      return (b.reputation_score || 0) - (a.reputation_score || 0);
    });

    return NextResponse.json(agents);
  } catch (error) {
    console.error('Agents API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agents' },
      { status: 500 }
    );
  }
}
