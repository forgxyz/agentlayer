'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import Header from '@/components/shared/Header';
import StatCard from '@/components/shared/StatCard';
import ReputationBadge from '@/components/directory/ReputationBadge';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatUSD, formatNumber, truncateAddress, CHAIN_COLORS, FACILITATOR_COLORS } from '@/lib/constants';
import { getScoreLabel } from '@/lib/reputation';

interface ERC8004Registration {
  chain: string;
  agent_id: number;
  name: string | null;
  agent_uri: string | null;
  registered_at: string;
  transaction_hash: string;
}

interface ERC8004FeedbackEntry {
  chain: string;
  timestamp: string;
  transaction_hash: string;
  agent_id: number;
  client_address: string;
  score: number | null;
  tag1: string | null;
  tag2: string | null;
  endpoint: string | null;
  superseded: boolean;
}

interface AgentDetail {
  agent: {
    address: string;
    chains: string[];
    total_sent_usd: number;
    total_received_usd: number;
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
    reputation_score: number;
    erc8004_registered: boolean;
    erc8004_name: string | null;
    erc8004_agent_count: number;
    erc8004_chains: string[];
    erc8004_feedback_count: number;
    erc8004_feedback_raw_count: number;
    erc8004_avg_score: number | null;
    server_name: string | null;
    server_url: string | null;
    server_description: string | null;
    server_x402scan_url: string | null;
  };
  edges: Array<{
    source: string;
    target: string;
    chain: string;
    facilitator: string;
    total_value: number;
    tx_count: number;
    first_tx: string;
    last_tx: string;
  }>;
  topCounterparties: Array<{
    address: string;
    value: number;
    txCount: number;
  }>;
  erc8004: {
    registrations: ERC8004Registration[];
    feedback: ERC8004FeedbackEntry[];
  };
}

const ROLE_DISPLAY: Record<string, { label: string; color: string }> = {
  service_provider: { label: 'Service Provider', color: '#00FF88' },
  requester: { label: 'Requester', color: '#0052FF' },
  bilateral: { label: 'Bilateral', color: '#FFB800' },
  registered_only: { label: 'Registered Agent', color: '#10B981' },
};

const EXPLORER_TX: Record<string, string> = {
  base: 'https://basescan.org/tx/',
  ethereum: 'https://etherscan.io/tx/',
  polygon: 'https://polygonscan.com/tx/',
  bsc: 'https://bscscan.com/tx/',
  scroll: 'https://scrollscan.com/tx/',
  gnosis: 'https://gnosisscan.io/tx/',
  solana: 'https://solscan.io/tx/',
};

const EXPLORER_ADDRESS: Record<string, string> = {
  base: 'https://basescan.org/address/',
  ethereum: 'https://etherscan.io/address/',
  polygon: 'https://polygonscan.com/address/',
  bsc: 'https://bscscan.com/address/',
  scroll: 'https://scrollscan.com/address/',
  gnosis: 'https://gnosisscan.io/address/',
  solana: 'https://solscan.io/account/',
};

function blockExplorerUrl(chain: string, txHash: string): string {
  return `${EXPLORER_TX[chain] || EXPLORER_TX.base}${txHash}`;
}

function addressExplorerUrl(address: string, chains: string[]): string {
  const isSolana = !address.startsWith('0x');
  const chain = isSolana ? 'solana' : (chains[0] || 'base');
  return `${EXPLORER_ADDRESS[chain] || EXPLORER_ADDRESS.base}${address}`;
}

export default function AgentPage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = use(params);
  const [data, setData] = useState<AgentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [notInDataset, setNotInDataset] = useState(false);

  useEffect(() => {
    fetch(`/api/agents/${address}`)
      .then((res) => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then((result) => {
        if (result.not_in_dataset) {
          setNotInDataset(true);
        } else {
          setData(result);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [address]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <Header />
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <Skeleton className="h-8 w-48 bg-zinc-900/50" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array(4).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl bg-zinc-900/50" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-xl bg-zinc-900/50" />
        </main>
      </div>
    );
  }

  if (notInDataset) {
    return (
      <div className="min-h-screen bg-black">
        <Header />
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-900/50 border border-white/10 mb-6">
            <svg className="w-8 h-8 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <p className="text-xl text-zinc-300 mb-2 font-medium">Agent Not in Sample Set</p>
          <p className="text-sm text-zinc-500 mb-6 max-w-md mx-auto">
            This agent isn't included in our current sample dataset. Try searching for active agents from the directory or explore the graph view.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/" className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to dashboard
            </Link>
            <span className="text-zinc-700">|</span>
            <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-300">
              View directory
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-black">
        <Header />
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <p className="text-xl text-zinc-400 mb-4">Error loading agent</p>
          <p className="text-sm text-zinc-600 mb-6">There was a problem fetching data. Please try again.</p>
          <Link href="/" className="text-sm text-blue-400 hover:text-blue-300">
            Back to dashboard
          </Link>
        </main>
      </div>
    );
  }

  const { agent, edges, topCounterparties, erc8004 } = data;
  const hasX402 = agent.tx_count > 0;
  const isRegisteredOnly = agent.role === 'registered_only';

  const daysSinceFirst = hasX402 && agent.first_seen
    ? Math.max(1, Math.floor(
        (new Date(agent.last_seen).getTime() - new Date(agent.first_seen).getTime()) / (1000 * 60 * 60 * 24)
      ))
    : 0;

  const isProvider = agent.role === 'service_provider';
  const isRequester = agent.role === 'requester';
  const primaryValue = isRequester ? agent.total_sent_usd : agent.total_received_usd;
  const dailyAvg = daysSinceFirst > 0 ? primaryValue / daysSinceFirst : 0;
  const roleDisplay = ROLE_DISPLAY[agent.role] || { label: agent.role, color: '#888' };

  // Derive behavioral tags
  const roleTags: Array<{ label: string; color: string }> = [];

  if (agent.erc8004_registered) {
    roleTags.push({ label: 'ERC-8004', color: '#10B981' });
  }

  if (agent.total_value_usd >= 100_000) {
    roleTags.push({ label: 'High Volume', color: '#FFB800' });
  }

  if (isProvider && agent.unique_requesters >= 100) {
    roleTags.push({ label: 'Popular Service', color: '#00FF88' });
  } else if (isProvider && agent.unique_requesters >= 10) {
    roleTags.push({ label: 'Active Service', color: '#4ECDC4' });
  }

  if (isRequester && agent.unique_receivers >= 50) {
    roleTags.push({ label: 'Power User', color: '#FF61D8' });
  } else if (isRequester && agent.unique_receivers >= 10) {
    roleTags.push({ label: 'Active Requester', color: '#45B7D1' });
  }

  if (agent.chains.length > 1) {
    roleTags.push({ label: 'Multi-Chain', color: '#FF61D8' });
  }

  if (agent.tx_count > 100_000) {
    roleTags.push({ label: 'High Frequency', color: '#FF6B35' });
  }

  if (agent.facilitators.length >= 3) {
    roleTags.push({ label: 'Multi-Platform', color: '#6C5CE7' });
  }

  return (
    <div className="min-h-screen bg-black">
      <Header />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm">
          <Link href="/" className="text-zinc-500 hover:text-zinc-300">Dashboard</Link>
          <span className="text-zinc-700">/</span>
          <span className="text-zinc-400">Agent</span>
        </div>

        {/* Agent Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <ReputationBadge score={agent.reputation_score} size="md" />
          <div className="flex-1 min-w-0">
            {(agent.erc8004_name || agent.server_name) && (
              <h1 className="text-xl sm:text-2xl font-semibold text-white mb-1">{agent.erc8004_name || agent.server_name}</h1>
            )}
            <a
              href={addressExplorerUrl(agent.address, agent.chains)}
              target="_blank"
              rel="noopener noreferrer"
              className={`font-mono break-all inline-flex items-center gap-1.5 hover:text-white transition-colors ${(agent.erc8004_name || agent.server_name) ? 'text-sm text-zinc-400' : 'text-lg sm:text-xl text-white'}`}
            >
              {agent.address}
              <svg className="w-3.5 h-3.5 flex-shrink-0 opacity-50" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M6.5 3.5H3.5C2.95 3.5 2.5 3.95 2.5 4.5V12.5C2.5 13.05 2.95 13.5 3.5 13.5H11.5C12.05 13.5 12.5 13.05 12.5 12.5V9.5M9.5 2.5H13.5M13.5 2.5V6.5M13.5 2.5L7 9" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge
                variant="outline"
                className="text-xs"
                style={{ borderColor: `${roleDisplay.color}40`, color: roleDisplay.color }}
              >
                {roleDisplay.label}
              </Badge>
              <Badge variant="outline" className="text-xs border-white/10">
                Score: {agent.reputation_score} ({getScoreLabel(agent.reputation_score)})
              </Badge>
              {agent.chains.map((chain) => (
                <Badge
                  key={chain}
                  variant="outline"
                  className="text-xs"
                  style={{ borderColor: CHAIN_COLORS[chain] || '#555', color: CHAIN_COLORS[chain] || '#888' }}
                >
                  {chain}
                </Badge>
              ))}
              {roleTags.map((tag) => (
                <Badge
                  key={tag.label}
                  variant="outline"
                  className="text-xs"
                  style={{ borderColor: `${tag.color}40`, color: tag.color }}
                >
                  {tag.label}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* x402 Server Card */}
        {agent.server_name && (
          <div className="bg-blue-950/20 border border-blue-500/20 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
              <h2 className="text-sm font-medium text-blue-300">x402 Server</h2>
              {agent.server_x402scan_url && (
                <a
                  href={agent.server_x402scan_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto text-[10px] text-zinc-500 hover:text-zinc-300"
                >
                  View on x402scan
                </a>
              )}
            </div>
            <h3 className="text-base font-semibold text-white mb-1">{agent.server_name}</h3>
            {agent.server_description && (
              <p className="text-sm text-zinc-400 mb-3 leading-relaxed">{agent.server_description}</p>
            )}
            {agent.server_url && (
              <a
                href={agent.server_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                {agent.server_url}
              </a>
            )}
          </div>
        )}

        {/* ERC-8004 Identity Card */}
        {agent.erc8004_registered && erc8004.registrations.length > 0 && (
          <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <h2 className="text-sm font-medium text-emerald-300">ERC-8004 On-Chain Identity</h2>
              <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400 ml-auto">
                {erc8004.registrations.length} agent{erc8004.registrations.length > 1 ? 's' : ''} registered
              </Badge>
            </div>
            <div className="space-y-3">
              {erc8004.registrations.slice(0, 10).map((reg) => (
                <div key={`${reg.chain}-${reg.agent_id}`} className="flex items-start justify-between gap-4 py-2 border-b border-white/[0.03] last:border-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {reg.name && (
                        <span className="text-sm font-medium text-white">{reg.name}</span>
                      )}
                      <span className="text-xs text-zinc-500">ID #{reg.agent_id}</span>
                      <Badge variant="outline" className="text-[10px]" style={{ borderColor: `${CHAIN_COLORS[reg.chain] || '#555'}40`, color: CHAIN_COLORS[reg.chain] || '#888' }}>
                        {reg.chain}
                      </Badge>
                    </div>
                    {reg.agent_uri && reg.agent_uri.startsWith('http') && (
                      <a
                        href={reg.agent_uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-blue-400 hover:text-blue-300 truncate block max-w-md"
                      >
                        {reg.agent_uri}
                      </a>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[10px] text-zinc-500">
                      {new Date(reg.registered_at).toLocaleDateString()}
                    </p>
                    <a
                      href={blockExplorerUrl(reg.chain, reg.transaction_hash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-zinc-600 hover:text-zinc-400"
                    >
                      {truncateAddress(reg.transaction_hash)}
                    </a>
                  </div>
                </div>
              ))}
              {erc8004.registrations.length > 10 && (
                <p className="text-xs text-zinc-600">
                  + {erc8004.registrations.length - 10} more registrations
                </p>
              )}
            </div>
            {agent.erc8004_avg_score != null && (
              <div className="mt-4 pt-3 border-t border-emerald-500/10 flex items-center gap-4">
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase">Avg Feedback Score</p>
                  <p className="text-lg font-semibold text-emerald-400">{agent.erc8004_avg_score.toFixed(1)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase">Feedback Count</p>
                  <p className="text-lg font-semibold text-white">
                    {agent.erc8004_feedback_count}
                    {agent.erc8004_feedback_raw_count > agent.erc8004_feedback_count && (
                      <span className="text-xs text-zinc-500 font-normal ml-1">
                        ({agent.erc8004_feedback_raw_count} raw)
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Key Stats - only show if has x402 activity */}
        {hasX402 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {isRequester ? (
              <>
                <StatCard
                  label="Total Spent"
                  value={formatUSD(agent.total_sent_usd)}
                  subValue={dailyAvg > 0 ? `~${formatUSD(dailyAvg)}/day` : undefined}
                  color="#FF6B35"
                />
                <StatCard
                  label="Services Used"
                  value={formatNumber(agent.unique_receivers)}
                  subValue="Distinct recipients"
                  color="#0052FF"
                />
              </>
            ) : (
              <>
                <StatCard
                  label="Total Income"
                  value={formatUSD(agent.total_received_usd)}
                  subValue={dailyAvg > 0 ? `~${formatUSD(dailyAvg)}/day` : undefined}
                  color="#00FF88"
                />
                <StatCard
                  label="Unique Requesters"
                  value={formatNumber(agent.unique_requesters)}
                  subValue="Distinct payers"
                  color="#0052FF"
                />
              </>
            )}
            <StatCard
              label="Transactions"
              value={formatNumber(agent.tx_count)}
              subValue={agent.avg_tx_value > 0 ? `Avg ${formatUSD(agent.avg_tx_value)}/tx` : undefined}
            />
            <StatCard
              label="Active Days"
              value={String(daysSinceFirst)}
              subValue={agent.first_seen ? `Since ${new Date(agent.first_seen).toLocaleDateString()}` : undefined}
              color="#FFB800"
            />
          </div>
        )}

        {/* Registered-only notice */}
        {isRegisteredOnly && (
          <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-5 text-center">
            <p className="text-sm text-zinc-400 mb-1">
              This agent is registered via ERC-8004 but has no x402 payment activity.
            </p>
            <p className="text-xs text-zinc-600">
              Identity is on-chain but economic flows have not been observed yet.
            </p>
          </div>
        )}

        {/* Bilateral summary if both sent and received */}
        {agent.total_sent_usd > 0 && agent.total_received_usd > 0 && (
          <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-4 flex gap-6">
            <div>
              <p className="text-[10px] text-zinc-500 uppercase">Total Sent</p>
              <p className="text-sm font-semibold text-red-400">{formatUSD(agent.total_sent_usd)}</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 uppercase">Total Received</p>
              <p className="text-sm font-semibold text-green-400">{formatUSD(agent.total_received_usd)}</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 uppercase">Net</p>
              <p className={`text-sm font-semibold ${agent.total_received_usd > agent.total_sent_usd ? 'text-green-400' : 'text-red-400'}`}>
                {agent.total_received_usd > agent.total_sent_usd ? '+' : ''}{formatUSD(agent.total_received_usd - agent.total_sent_usd)}
              </p>
            </div>
          </div>
        )}

        {/* Two-column layout */}
        {hasX402 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Facilitators Used */}
            <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-5">
              <h2 className="text-sm font-medium text-white mb-4">Facilitators Used</h2>
              <div className="space-y-3">
                {agent.facilitators.map((fac) => (
                  <Link
                    key={fac}
                    href={`/facilitator/${encodeURIComponent(fac)}`}
                    className="flex items-center gap-2 py-1 hover:bg-white/[0.03] px-2 rounded-lg transition-colors"
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: FACILITATOR_COLORS[fac] || '#888' }}
                    />
                    <span className="text-sm text-white">{fac}</span>
                  </Link>
                ))}
                {agent.facilitators.length === 0 && (
                  <p className="text-xs text-zinc-600">No facilitator data available</p>
                )}
              </div>
            </div>

            {/* Top Counterparties */}
            <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-5">
              <h2 className="text-sm font-medium text-white mb-4">Top Counterparties</h2>
              <div className="space-y-2">
                {topCounterparties.map((cp, i) => (
                  <Link
                    key={cp.address}
                    href={`/agent/${cp.address}`}
                    className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white/[0.03] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-600 w-4">{i + 1}</span>
                      <span className="text-sm font-mono text-zinc-300">
                        {truncateAddress(cp.address)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-white">{formatUSD(cp.value)}</span>
                      <span className="text-xs text-zinc-600 ml-2">{formatNumber(cp.txCount)} tx</span>
                    </div>
                  </Link>
                ))}
                {topCounterparties.length === 0 && (
                  <p className="text-xs text-zinc-600">
                    No edge data for this address in the top-150 graph.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Payment Flows (edges) */}
        {edges.length > 0 && (
          <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-5">
            <h2 className="text-sm font-medium text-white mb-4">Payment Flows</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left py-2 px-2 text-[10px] text-zinc-500 uppercase">Direction</th>
                    <th className="text-left py-2 px-2 text-[10px] text-zinc-500 uppercase">Counterparty</th>
                    <th className="text-left py-2 px-2 text-[10px] text-zinc-500 uppercase">Facilitator</th>
                    <th className="text-right py-2 px-2 text-[10px] text-zinc-500 uppercase">Value</th>
                    <th className="text-right py-2 px-2 text-[10px] text-zinc-500 uppercase">Txns</th>
                    <th className="text-left py-2 px-2 text-[10px] text-zinc-500 uppercase">Chain</th>
                  </tr>
                </thead>
                <tbody>
                  {edges.slice(0, 20).map((edge, i) => {
                    const isInbound = edge.target.toLowerCase() === agent.address.toLowerCase();
                    const other = isInbound ? edge.source : edge.target;
                    return (
                      <tr key={i} className="border-b border-white/[0.02]">
                        <td className="py-2 px-2">
                          <span className={`text-xs font-medium ${isInbound ? 'text-green-400' : 'text-red-400'}`}>
                            {isInbound ? 'IN' : 'OUT'}
                          </span>
                        </td>
                        <td className="py-2 px-2">
                          <Link
                            href={`/agent/${other}`}
                            className="text-sm font-mono text-zinc-300 hover:text-white"
                          >
                            {truncateAddress(other)}
                          </Link>
                        </td>
                        <td className="py-2 px-2">
                          <Link
                            href={`/facilitator/${encodeURIComponent(edge.facilitator)}`}
                            className="text-xs text-zinc-400 hover:text-white"
                          >
                            {edge.facilitator}
                          </Link>
                        </td>
                        <td className="py-2 px-2 text-right text-sm text-white">
                          {formatUSD(edge.total_value)}
                        </td>
                        <td className="py-2 px-2 text-right text-sm text-zinc-400">
                          {formatNumber(edge.tx_count)}
                        </td>
                        <td className="py-2 px-2">
                          <Badge
                            variant="outline"
                            className="text-[10px]"
                            style={{
                              borderColor: CHAIN_COLORS[edge.chain] || '#555',
                              color: CHAIN_COLORS[edge.chain] || '#888',
                            }}
                          >
                            {edge.chain}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ERC-8004 Feedback Log */}
        {erc8004.feedback.length > 0 && (
          <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-sm font-medium text-white">On-Chain Feedback</h2>
              <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400">
                {erc8004.feedback.length} events
              </Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left py-2 px-2 text-[10px] text-zinc-500 uppercase">Date</th>
                    <th className="text-left py-2 px-2 text-[10px] text-zinc-500 uppercase">From</th>
                    <th className="text-right py-2 px-2 text-[10px] text-zinc-500 uppercase">Score</th>
                    <th className="text-left py-2 px-2 text-[10px] text-zinc-500 uppercase">Tags</th>
                    <th className="text-left py-2 px-2 text-[10px] text-zinc-500 uppercase">Endpoint</th>
                    <th className="text-left py-2 px-2 text-[10px] text-zinc-500 uppercase">Tx</th>
                  </tr>
                </thead>
                <tbody>
                  {erc8004.feedback.slice(0, 30).map((fb, i) => (
                    <tr key={i} className={`border-b border-white/[0.02] ${fb.superseded ? 'opacity-40' : ''}`}>
                      <td className="py-2 px-2 text-xs text-zinc-400">
                        {new Date(fb.timestamp).toLocaleDateString()}
                      </td>
                      <td className="py-2 px-2">
                        <Link
                          href={`/agent/${fb.client_address}`}
                          className="text-xs font-mono text-zinc-400 hover:text-white"
                        >
                          {truncateAddress(fb.client_address)}
                        </Link>
                      </td>
                      <td className="py-2 px-2 text-right">
                        {fb.score != null && (
                          <span className={`text-sm font-semibold ${
                            fb.score >= 80 ? 'text-emerald-400' :
                            fb.score >= 50 ? 'text-yellow-400' :
                            'text-red-400'
                          }`}>
                            {fb.score}
                            {fb.superseded && <span className="text-[10px] text-zinc-500 font-normal ml-1">(old)</span>}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2">
                        <div className="flex gap-1">
                          {fb.tag1 && (
                            <Badge variant="outline" className="text-[10px] border-white/10 text-zinc-400">
                              {fb.tag1}
                            </Badge>
                          )}
                          {fb.tag2 && (
                            <Badge variant="outline" className="text-[10px] border-white/10 text-zinc-400">
                              {fb.tag2}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-2">
                        {fb.endpoint && (
                          <span className="text-[10px] text-zinc-500 truncate block max-w-[180px]">
                            {fb.endpoint}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2">
                        <a
                          href={blockExplorerUrl(fb.chain, fb.transaction_hash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-zinc-600 hover:text-zinc-400"
                        >
                          {truncateAddress(fb.transaction_hash)}
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {erc8004.feedback.length > 30 && (
              <p className="text-xs text-zinc-600 mt-3">
                Showing 30 of {erc8004.feedback.length} feedback events
              </p>
            )}
          </div>
        )}

        {/* Footer link back */}
        <div className="pt-4">
          <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300">
            &larr; Back to dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
