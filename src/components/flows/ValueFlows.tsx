'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { DailyFlow } from '@/lib/types';
import { CHAIN_COLORS, CHAIN_LABELS, formatUSD } from '@/lib/constants';

interface ValueFlowsProps {
  flows: DailyFlow[];
}

export default function ValueFlows({ flows }: ValueFlowsProps) {
  const chartData = useMemo(() => {
    // Group by date, pivot chains
    const byDate = new Map<string, Record<string, unknown>>();
    flows.forEach((f) => {
      const existing = byDate.get(f.date) || { date: f.date };
      existing[f.chain] = ((existing[f.chain] as number) || 0) + f.daily_volume_usd;
      byDate.set(f.date, existing);
    });

    return Array.from(byDate.values())
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }, [flows]);

  const chains = useMemo(() => {
    const set = new Set<string>();
    flows.forEach((f) => set.add(f.chain));
    return Array.from(set);
  }, [flows]);

  // Summary stats
  const totalVolume = flows.reduce((s, f) => s + f.daily_volume_usd, 0);
  const totalTx = flows.reduce((s, f) => s + f.tx_count, 0);
  const chainVolumes = chains.map((chain) => ({
    chain,
    volume: flows.filter((f) => f.chain === chain).reduce((s, f) => s + f.daily_volume_usd, 0),
    txCount: flows.filter((f) => f.chain === chain).reduce((s, f) => s + f.tx_count, 0),
  })).sort((a, b) => b.volume - a.volume);

  return (
    <div className="space-y-6">
      {/* Chain stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {chainVolumes.map((cv) => (
          <div
            key={cv.chain}
            className="bg-zinc-900/50 border border-white/5 rounded-xl p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: CHAIN_COLORS[cv.chain] || '#888' }}
              />
              <span className="text-sm font-medium text-white">
                {CHAIN_LABELS[cv.chain] || cv.chain}
              </span>
            </div>
            <p className="text-xl font-bold text-white">{formatUSD(cv.volume)}</p>
            <p className="text-xs text-zinc-500">
              {cv.txCount.toLocaleString()} transactions
            </p>
            <p className="text-xs text-zinc-600">
              {((cv.volume / totalVolume) * 100).toFixed(1)}% of total
            </p>
          </div>
        ))}
      </div>

      {/* Stacked bar chart */}
      <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-4">
        <h3 className="text-sm font-medium text-white mb-4">Daily Volume by Chain</h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: '#71717a' }}
              tickFormatter={(v) => {
                const d = new Date(v);
                return `${d.getMonth() + 1}/${d.getDate()}`;
              }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#71717a' }}
              tickFormatter={(v) => formatUSD(v)}
              width={60}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#18181b',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              labelStyle={{ color: '#ffffff' }}
              formatter={(value?: number | string, name?: string) => [
                formatUSD(Number(value) || 0),
                CHAIN_LABELS[name || ''] || name || '',
              ]}
            />
            <Legend
              wrapperStyle={{ fontSize: '11px' }}
              formatter={(value: string) => CHAIN_LABELS[value] || value}
            />
            {chains.map((chain) => (
              <Bar
                key={chain}
                dataKey={chain}
                stackId="a"
                fill={CHAIN_COLORS[chain] || '#888888'}
                radius={[0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
