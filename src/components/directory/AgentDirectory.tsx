'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { Agent } from '@/lib/types';
import { truncateAddress, formatUSD, formatNumber, CHAIN_COLORS } from '@/lib/constants';
import ReputationBadge from './ReputationBadge';
import { Badge } from '@/components/ui/badge';

interface AgentDirectoryProps {
  agents: Agent[];
  onAgentSelect?: (address: string) => void;
  selectedAgent?: string | null;
}

type SortKey = 'reputation_score' | 'total_received_usd' | 'unique_requesters' | 'tx_count';
type FilterMode = 'all' | 'x402' | 'erc8004' | 'both';

export default function AgentDirectory({ agents, onAgentSelect, selectedAgent }: AgentDirectoryProps) {
  const router = useRouter();
  const [sortBy, setSortBy] = useState<SortKey>('reputation_score');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');

  const sorted = useMemo(() => {
    let filtered = agents;

    // Apply filter
    if (filter === 'x402') {
      filtered = filtered.filter(a => a.total_value_usd > 0);
    } else if (filter === 'erc8004') {
      filtered = filtered.filter(a => a.erc8004_registered);
    } else if (filter === 'both') {
      filtered = filtered.filter(a => a.erc8004_registered && a.total_value_usd > 0);
    }

    // Apply search (match address or name)
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter((a) =>
        a.address.toLowerCase().includes(q) ||
        (a.erc8004_name && a.erc8004_name.toLowerCase().includes(q))
      );
    }

    return [...filtered].sort((a, b) => {
      const aVal = (a[sortBy] as number) || 0;
      const bVal = (b[sortBy] as number) || 0;
      return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
    });
  }, [agents, sortBy, sortDir, search, filter]);

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortBy(key);
      setSortDir('desc');
    }
  };

  // Stats
  const stats = useMemo(() => ({
    total: agents.length,
    x402: agents.filter(a => a.total_value_usd > 0).length,
    erc8004: agents.filter(a => a.erc8004_registered).length,
    both: agents.filter(a => a.erc8004_registered && a.total_value_usd > 0).length,
  }), [agents]);

  const SortHeader = ({ label, sortKey }: { label: string; sortKey: SortKey }) => (
    <button
      onClick={() => toggleSort(sortKey)}
      className={`text-[10px] uppercase tracking-wider flex items-center gap-1 ${
        sortBy === sortKey ? 'text-white' : 'text-zinc-500'
      }`}
    >
      {label}
      {sortBy === sortKey && (
        <span>{sortDir === 'desc' ? '\u2193' : '\u2191'}</span>
      )}
    </button>
  );

  const displayName = (agent: Agent) => {
    if (agent.erc8004_name) return agent.erc8004_name;
    return truncateAddress(agent.address);
  };

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder="Search address or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-zinc-900/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 flex-1 max-w-xs focus:outline-none focus:border-white/20"
        />
        <div className="flex gap-1">
          {([
            ['all', `All (${stats.total})`],
            ['x402', `x402 (${stats.x402})`],
            ['erc8004', `8004 (${stats.erc8004})`],
            ['both', `Both (${stats.both})`],
          ] as [FilterMode, string][]).map(([mode, label]) => (
            <button
              key={mode}
              onClick={() => setFilter(mode)}
              className={`px-2.5 py-1.5 text-[10px] uppercase tracking-wider rounded-lg border transition-colors ${
                filter === mode
                  ? 'border-white/20 bg-white/[0.05] text-white'
                  : 'border-white/5 text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="text-xs text-zinc-600">{sorted.length} shown</span>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left py-3 px-2 w-10">
                <span className="text-[10px] text-zinc-500 uppercase">#</span>
              </th>
              <th className="text-left py-3 px-2">
                <span className="text-[10px] text-zinc-500 uppercase">Agent</span>
              </th>
              <th className="text-center py-3 px-2">
                <SortHeader label="Score" sortKey="reputation_score" />
              </th>
              <th className="text-right py-3 px-2">
                <SortHeader label="Volume" sortKey="total_received_usd" />
              </th>
              <th className="text-right py-3 px-2">
                <SortHeader label="Counterparties" sortKey="unique_requesters" />
              </th>
              <th className="text-right py-3 px-2">
                <SortHeader label="Txns" sortKey="tx_count" />
              </th>
              <th className="text-left py-3 px-2">
                <span className="text-[10px] text-zinc-500 uppercase">Source</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.slice(0, 100).map((agent, i) => (
              <tr
                key={agent.address}
                onClick={() => router.push(`/agent/${agent.address}`)}
                className={`border-b border-white/[0.02] cursor-pointer transition-colors hover:bg-white/[0.02] ${
                  selectedAgent === agent.address ? 'bg-white/[0.05]' : ''
                }`}
              >
                <td className="py-2.5 px-2 text-xs text-zinc-600">{i + 1}</td>
                <td className="py-2.5 px-2">
                  <div className="flex items-center gap-2">
                    {agent.erc8004_registered && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" title="ERC-8004 Registered" />
                    )}
                    <div className="min-w-0">
                      {agent.erc8004_name ? (
                        <>
                          <span className="text-sm text-white block truncate max-w-[200px]">
                            {agent.erc8004_name}
                          </span>
                          <span className="text-[10px] font-mono text-zinc-600">
                            {truncateAddress(agent.address)}
                          </span>
                        </>
                      ) : (
                        <span className="text-sm font-mono text-white">
                          {truncateAddress(agent.address)}
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-2.5 px-2">
                  <div className="flex justify-center">
                    <ReputationBadge score={agent.reputation_score || 0} size="sm" />
                  </div>
                </td>
                <td className="py-2.5 px-2 text-right text-sm text-white">
                  {agent.total_value_usd > 0 ? formatUSD(agent.total_value_usd) : (
                    <span className="text-zinc-600">--</span>
                  )}
                </td>
                <td className="py-2.5 px-2 text-right text-sm text-zinc-400">
                  {(agent.unique_requesters || agent.unique_receivers)
                    ? formatNumber(Math.max(agent.unique_requesters, agent.unique_receivers))
                    : <span className="text-zinc-600">--</span>
                  }
                </td>
                <td className="py-2.5 px-2 text-right text-sm text-zinc-400">
                  {agent.tx_count > 0 ? formatNumber(agent.tx_count) : (
                    <span className="text-zinc-600">--</span>
                  )}
                </td>
                <td className="py-2.5 px-2">
                  <div className="flex gap-1">
                    {agent.total_value_usd > 0 && (
                      <Badge variant="outline" className="text-[10px] border-blue-500/30 text-blue-400">
                        x402
                      </Badge>
                    )}
                    {agent.erc8004_registered && (
                      <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400">
                        8004
                      </Badge>
                    )}
                    {agent.chains.slice(0, 2).map((chain) => (
                      <Badge
                        key={chain}
                        variant="outline"
                        className="text-[10px]"
                        style={{ borderColor: `${CHAIN_COLORS[chain] || '#555'}40`, color: CHAIN_COLORS[chain] || '#888' }}
                      >
                        {chain}
                      </Badge>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {sorted.slice(0, 50).map((agent, i) => (
          <div
            key={agent.address}
            onClick={() => router.push(`/agent/${agent.address}`)}
            className={`bg-zinc-900/30 border border-white/5 rounded-lg p-3 cursor-pointer transition-colors ${
              selectedAgent === agent.address ? 'border-white/20 bg-white/[0.03]' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-xs text-zinc-600 flex-shrink-0">#{i + 1}</span>
                {agent.erc8004_registered && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                )}
                <span className="text-sm font-mono text-white truncate">
                  {displayName(agent)}
                </span>
              </div>
              <ReputationBadge score={agent.reputation_score || 0} size="sm" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <p className="text-[10px] text-zinc-500">Volume</p>
                <p className="text-xs font-medium text-white">
                  {agent.total_value_usd > 0 ? formatUSD(agent.total_value_usd) : '--'}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-500">Source</p>
                <div className="flex gap-1">
                  {agent.total_value_usd > 0 && (
                    <span className="text-[10px] text-blue-400">x402</span>
                  )}
                  {agent.erc8004_registered && (
                    <span className="text-[10px] text-emerald-400">8004</span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-[10px] text-zinc-500">Chains</p>
                <div className="flex gap-1">
                  {agent.chains.map((chain) => (
                    <span
                      key={chain}
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: CHAIN_COLORS[chain] || '#888' }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
