'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import Header from '@/components/shared/Header';
import StatCard from '@/components/shared/StatCard';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatUSD, formatNumber, truncateAddress, CHAIN_COLORS, FACILITATOR_COLORS } from '@/lib/constants';

interface FacilitatorDetail {
  facilitator: {
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
  topAgents: Array<{
    address: string;
    total_received_usd: number;
    unique_requesters: number;
    tx_count: number;
    chains: string[];
  }>;
}

export default function FacilitatorPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = use(params);
  const decodedName = decodeURIComponent(name);
  const [data, setData] = useState<FacilitatorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/facilitators/${encodeURIComponent(decodedName)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [decodedName]);

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
        </main>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-black">
        <Header />
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <p className="text-xl text-zinc-400 mb-4">Facilitator not found</p>
          <Link href="/" className="text-sm text-blue-400 hover:text-blue-300">
            Back to dashboard
          </Link>
        </main>
      </div>
    );
  }

  const { facilitator: fac, edges, topAgents } = data;
  const color = FACILITATOR_COLORS[fac.facilitator] || '#888';
  const daysSinceFirst = Math.max(1, Math.floor(
    (new Date(fac.last_seen).getTime() - new Date(fac.first_seen).getTime()) / (1000 * 60 * 60 * 24)
  ));
  const dailyVolume = fac.total_volume_usd / daysSinceFirst;

  return (
    <div className="min-h-screen bg-black">
      <Header />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm">
          <Link href="/" className="text-zinc-500 hover:text-zinc-300">Dashboard</Link>
          <span className="text-zinc-700">/</span>
          <span className="text-zinc-400">Facilitator</span>
        </div>

        {/* Header */}
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
            style={{ backgroundColor: color }}
          >
            {fac.facilitator.charAt(0)}
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">{fac.facilitator}</h1>
            <div className="flex items-center gap-2 mt-1">
              {fac.chains.map((chain) => (
                <Badge
                  key={chain}
                  variant="outline"
                  className="text-xs"
                  style={{ borderColor: CHAIN_COLORS[chain] || '#555', color: CHAIN_COLORS[chain] || '#888' }}
                >
                  {chain}
                </Badge>
              ))}
              <span className="text-xs text-zinc-600">
                Active since {new Date(fac.first_seen).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="Volume Facilitated"
            value={formatUSD(fac.total_volume_usd)}
            subValue={`~${formatUSD(dailyVolume)}/day`}
            color={color}
          />
          <StatCard
            label="Transactions"
            value={formatNumber(fac.tx_count)}
            subValue={`Avg ${formatUSD(fac.avg_tx_value)}/tx`}
          />
          <StatCard
            label="Buyers"
            value={formatNumber(fac.unique_senders)}
            subValue="Unique payers"
            color="#00FF88"
          />
          <StatCard
            label="Sellers"
            value={formatNumber(fac.unique_receivers)}
            subValue="Unique recipients"
            color="#0052FF"
          />
        </div>

        {/* Two-column */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Agents */}
          <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-5">
            <h2 className="text-sm font-medium text-white mb-4">
              Top Agents ({topAgents.length})
            </h2>
            <div className="space-y-2">
              {topAgents.map((agent, i) => (
                <Link
                  key={agent.address}
                  href={`/agent/${agent.address}`}
                  className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-white/[0.03] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-600 w-5">{i + 1}</span>
                    <span className="text-sm font-mono text-zinc-300">
                      {truncateAddress(agent.address)}
                    </span>
                    <div className="flex gap-0.5">
                      {agent.chains.map((c) => (
                        <span
                          key={c}
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: CHAIN_COLORS[c] || '#888' }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-white">{formatUSD(agent.total_received_usd)}</span>
                  </div>
                </Link>
              ))}
              {topAgents.length === 0 && (
                <p className="text-xs text-zinc-600">No agents found in cached dataset</p>
              )}
            </div>
          </div>

          {/* Top Payment Flows */}
          <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-5">
            <h2 className="text-sm font-medium text-white mb-4">
              Top Payment Flows ({edges.length})
            </h2>
            <div className="space-y-2">
              {edges.slice(0, 15).map((edge, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 px-2 rounded-lg"
                >
                  <div className="flex items-center gap-1 text-xs font-mono text-zinc-400 min-w-0">
                    <Link href={`/agent/${edge.source}`} className="hover:text-white truncate">
                      {truncateAddress(edge.source)}
                    </Link>
                    <span className="text-zinc-600 flex-shrink-0">&rarr;</span>
                    <Link href={`/agent/${edge.target}`} className="hover:text-white truncate">
                      {truncateAddress(edge.target)}
                    </Link>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <span className="text-sm text-white">{formatUSD(edge.total_value)}</span>
                    <span className="text-xs text-zinc-600 ml-1">{formatNumber(edge.tx_count)} tx</span>
                  </div>
                </div>
              ))}
              {edges.length === 0 && (
                <p className="text-xs text-zinc-600">No edge data in cached dataset</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4">
          <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300">
            &larr; Back to dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
