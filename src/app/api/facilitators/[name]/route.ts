import { NextResponse } from 'next/server';

import facilitatorsData from '../../../../../public/data/facilitators.json';
import edgesData from '../../../../../public/data/edges.json';
import agentsData from '../../../../../public/data/agents.json';

function parseArrayField(field: unknown): string[] {
  if (Array.isArray(field)) return field;
  if (typeof field === 'string') {
    try { return JSON.parse(field); } catch { return [field]; }
  }
  return [];
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);

  const facs = facilitatorsData as Record<string, unknown>[];
  const raw = facs.find(
    (f) => String(f.facilitator).toLowerCase() === decodedName.toLowerCase()
  );

  if (!raw) {
    return NextResponse.json({ error: 'Facilitator not found' }, { status: 404 });
  }

  const facilitator = {
    facilitator: String(raw.facilitator),
    chains: parseArrayField(raw.chains),
    total_volume_usd: Number(raw.total_volume_usd) || 0,
    tx_count: Number(raw.tx_count) || 0,
    unique_senders: Number(raw.unique_senders) || 0,
    unique_receivers: Number(raw.unique_receivers) || 0,
    unique_addresses: Number(raw.unique_addresses) || 0,
    first_seen: String(raw.first_seen || ''),
    last_seen: String(raw.last_seen || ''),
    avg_tx_value: Number(raw.avg_tx_value) || 0,
  };

  // Find edges that use this facilitator
  const edges = (edgesData as Record<string, unknown>[])
    .filter((e) => String(e.facilitator).toLowerCase() === decodedName.toLowerCase())
    .map((e) => ({
      source: String(e.source),
      target: String(e.target),
      chain: String(e.chain),
      facilitator: String(e.facilitator),
      total_value: Number(e.total_value) || 0,
      tx_count: Number(e.tx_count) || 0,
      first_tx: String(e.first_tx || ''),
      last_tx: String(e.last_tx || ''),
    }))
    .sort((a, b) => b.total_value - a.total_value);

  // Find top agents using this facilitator
  const rawAgents = agentsData as Record<string, unknown>[];
  const topAgents = rawAgents
    .filter((a) => {
      const facs = parseArrayField(a.facilitators);
      return facs.some((f) => f.toLowerCase() === decodedName.toLowerCase());
    })
    .map((a) => ({
      address: String(a.address),
      total_received_usd: Number(a.total_received_usd) || 0,
      unique_requesters: Number(a.unique_requesters) || 0,
      tx_count: Number(a.tx_count) || 0,
      chains: parseArrayField(a.chains),
    }))
    .sort((a, b) => b.total_received_usd - a.total_received_usd)
    .slice(0, 20);

  return NextResponse.json({
    facilitator,
    edges,
    topAgents,
  });
}
