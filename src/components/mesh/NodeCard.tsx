'use client';

import Link from 'next/link';
import { formatUSD, formatNumber, truncateAddress } from '@/lib/constants';

interface NodeCardProps {
  node: {
    id: string;
    label: string;
    chain: string;
    totalValue: number;
    totalSent: number;
    totalReceived: number;
    uniqueCounterparties: number;
    uniqueBuyers?: number;
    uniqueSellers?: number;
    txCount: number;
    type: 'agent' | 'facilitator';
  } | null;
  position?: { x: number; y: number };
  tier?: 'facilitator' | 'agents';
  onClose: () => void;
}

export default function NodeCard({ node, position, tier, onClose }: NodeCardProps) {
  if (!node) return null;

  const isFacilitator = tier === 'facilitator' || node.type === 'facilitator';
  const detailHref = isFacilitator
    ? `/facilitator/${encodeURIComponent(node.id)}`
    : `/agent/${node.id}`;

  return (
    <div
      className="absolute z-50 bg-zinc-900/95 border border-white/10 rounded-xl p-4 min-w-[280px] backdrop-blur-xl shadow-2xl"
      style={{
        left: position?.x ?? 20,
        top: position?.y ?? 20,
        transform: 'translate(-50%, -100%) translateY(-16px)',
      }}
    >
      <button
        onClick={onClose}
        className="absolute top-2 right-2 text-zinc-500 hover:text-white text-xs"
      >
        x
      </button>

      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-3 h-3 rounded-full"
          style={{
            backgroundColor:
              node.chain === 'base' ? '#0052FF' :
              node.chain === 'solana' ? '#9945FF' :
              node.chain === 'polygon' ? '#8247E5' : '#888',
          }}
        />
        <span className="text-xs text-zinc-400 uppercase">{node.chain}</span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-zinc-400">
          {isFacilitator ? 'facilitator' : 'agent'}
        </span>
      </div>

      <p className="text-sm font-mono text-white mb-3">
        {isFacilitator ? node.id : truncateAddress(node.id)}
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <p className="text-[10px] text-zinc-500 uppercase">
            {isFacilitator ? 'Value Facilitated' : 'Total Value'}
          </p>
          <p className="text-lg font-semibold text-white">{formatUSD(node.totalValue)}</p>
        </div>

        <div>
          <p className="text-[10px] text-zinc-500 uppercase">Transactions</p>
          <p className="text-sm font-semibold text-white">{formatNumber(node.txCount)}</p>
        </div>

        {isFacilitator ? (
          <>
            <div>
              <p className="text-[10px] text-zinc-500 uppercase">Total Interactors</p>
              <p className="text-sm font-semibold text-white">{formatNumber(node.uniqueCounterparties)}</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 uppercase">Buyers</p>
              <p className="text-sm font-semibold text-green-400">{formatNumber(node.uniqueBuyers || 0)}</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 uppercase">Sellers</p>
              <p className="text-sm font-semibold text-blue-400">{formatNumber(node.uniqueSellers || 0)}</p>
            </div>
          </>
        ) : (
          <>
            <div>
              <p className="text-[10px] text-zinc-500 uppercase">Counterparties</p>
              <p className="text-sm font-semibold text-white">{formatNumber(node.uniqueCounterparties)}</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 uppercase">Sent</p>
              <p className="text-sm font-semibold text-green-400">{formatUSD(node.totalSent)}</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 uppercase">Received</p>
              <p className="text-sm font-semibold text-blue-400">{formatUSD(node.totalReceived)}</p>
            </div>
          </>
        )}
      </div>

      {/* View Details link */}
      <Link
        href={detailHref}
        className="mt-4 block w-full text-center py-2 px-3 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
      >
        View Details &rarr;
      </Link>
    </div>
  );
}
