'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Header from '@/components/shared/Header';
import StatCard from '@/components/shared/StatCard';
import AgentDirectory from '@/components/directory/AgentDirectory';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { formatUSD, formatNumber, TIME_WINDOWS } from '@/lib/constants';
import { nodesToCytoscape, edgesToCytoscape, facilitatorsToCytoscape } from '@/lib/graph-utils';
import { filterAgents, filterFlows, filterFacilitators, filterEdges, filterNodes } from '@/lib/time-filter';
import type { GraphNode, GraphEdge, Agent, DailyFlow, Facilitator, TimeWindow } from '@/lib/types';

const MeshView = dynamic(() => import('@/components/mesh/MeshView'), { ssr: false });
const ValueFlows = dynamic(() => import('@/components/flows/ValueFlows'), { ssr: false });

export default function Home() {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [flows, setFlows] = useState<DailyFlow[]>([]);
  const [facilitators, setFacilitators] = useState<Facilitator[]>([]);
  const [erc8004Agents, setErc8004Agents] = useState<Array<{ owner_address: string }>>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('24h');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [graphRes, agentsRes, flowsRes, facRes, erc8004Res] = await Promise.all([
          fetch('/api/graph'),
          fetch('/api/agents'),
          fetch('/api/flows'),
          fetch('/api/facilitators'),
          fetch('/api/erc8004'),
        ]);

        const graphData = await graphRes.json();
        const agentsData = await agentsRes.json();
        const flowsData = await flowsRes.json();
        const facData = await facRes.json();
        const erc8004Data = await erc8004Res.json();

        setNodes(graphData.nodes || []);
        setEdges(graphData.edges || []);
        setAgents(agentsData || []);
        setFlows(flowsData || []);
        setFacilitators(facData || []);
        setErc8004Agents(erc8004Data || []);
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Filtered data based on time window
  const filteredEdges = useMemo(() => filterEdges(edges, timeWindow), [edges, timeWindow]);
  const filteredNodes = useMemo(() => filterNodes(nodes, filteredEdges), [nodes, filteredEdges]);
  const filteredAgents = useMemo(() => filterAgents(agents, timeWindow), [agents, timeWindow]);
  const filteredFlows = useMemo(() => filterFlows(flows, timeWindow), [flows, timeWindow]);
  const filteredFacilitators = useMemo(() => filterFacilitators(facilitators, timeWindow), [facilitators, timeWindow]);

  const graphElements = useMemo(() => {
    if (!filteredNodes.length || !filteredEdges.length) return null;
    const cyNodes = nodesToCytoscape(filteredNodes);
    const nodeIds = new Set(cyNodes.map((n) => n.data.id));
    return {
      nodes: cyNodes,
      edges: edgesToCytoscape(filteredEdges, nodeIds),
    };
  }, [filteredNodes, filteredEdges]);

  const facilitatorElements = useMemo(() => {
    if (!filteredFacilitators.length) return null;
    return facilitatorsToCytoscape(filteredFacilitators);
  }, [filteredFacilitators]);

  const heroStats = useMemo(() => {
    // Calculate volume from filtered flows (daily granularity)
    const totalVolume = filteredFlows.reduce((s, f) => s + (f.daily_volume_usd || 0), 0);

    // Calculate tx count from filtered flows
    const totalTx = filteredFlows.reduce((s, f) => s + (f.tx_count || 0), 0);

    // Count x402 agents with activity
    const x402Agents = filteredAgents.filter(a => a.total_value_usd > 0).length;

    // Count unique ERC-8004 owners from raw data
    const uniqueOwners = new Set(
      erc8004Agents.map((a: any) => String(a.owner_address || '').toLowerCase())
    );
    const erc8004Count = uniqueOwners.size;

    return {
      totalVolume,
      totalTx,
      x402Agents,
      erc8004Agents: erc8004Count,
      facilitatorCount: filteredFacilitators.length,
      chainCount: 3,
    };
  }, [filteredFacilitators, filteredAgents, filteredFlows, erc8004Agents]);

  const handleNodeSelect = useCallback((nodeId: string | null) => {
    setSelectedAgent(nodeId);
  }, []);

  const handleAgentSelect = useCallback((address: string) => {
    setSelectedAgent(address);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-8">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {Array(5).fill(0).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl bg-zinc-900/50" />
              ))}
            </div>
            <Skeleton className="h-[600px] rounded-xl bg-zinc-900/50" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Hero Stats */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          <StatCard
            label="Total Volume"
            value={formatUSD(heroStats.totalVolume)}
            subValue="x402 payments"
            color="#00FF88"
          />
          <StatCard
            label="Transactions"
            value={formatNumber(heroStats.totalTx)}
            subValue="Agent payments"
          />
          <StatCard
            label="x402 Agents"
            value={formatNumber(heroStats.x402Agents)}
            subValue="Active transactors"
            color="#0052FF"
          />
          <StatCard
            label="ERC-8004"
            value={formatNumber(heroStats.erc8004Agents)}
            subValue="Registered agents"
            color="#10B981"
          />
          <StatCard
            label="Facilitators"
            value={String(heroStats.facilitatorCount)}
            subValue="Payment rails"
            color="#9945FF"
          />
          <StatCard
            label="Chains"
            value={String(heroStats.chainCount)}
            subValue="Base, Solana, Polygon"
            color="#FFB800"
          />
        </div>

        {/* Time Window Toggle */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 mr-1">Period:</span>
          {TIME_WINDOWS.map((tw) => (
            <button
              key={tw.value}
              onClick={() => setTimeWindow(tw.value)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                timeWindow === tw.value
                  ? 'bg-white/10 text-white font-medium'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
              }`}
            >
              {tw.label}
            </button>
          ))}
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="mesh" className="space-y-4">
          <TabsList className="bg-zinc-900/50 border border-white/5">
            <TabsTrigger value="mesh" className="data-[state=active]:bg-white/10">
              Mesh View
            </TabsTrigger>
            <TabsTrigger value="directory" className="data-[state=active]:bg-white/10">
              Agent Directory
            </TabsTrigger>
            <TabsTrigger value="flows" className="data-[state=active]:bg-white/10">
              Value Flows
            </TabsTrigger>
          </TabsList>

          <TabsContent value="mesh" className="mt-4">
            <MeshView
              graphData={graphElements}
              facilitatorData={facilitatorElements}
              onNodeSelect={handleNodeSelect}
            />
          </TabsContent>

          <TabsContent value="directory" className="mt-4">
            <AgentDirectory
              agents={filteredAgents}
              onAgentSelect={handleAgentSelect}
              selectedAgent={selectedAgent}
            />
          </TabsContent>

          <TabsContent value="flows" className="mt-4">
            <ValueFlows flows={filteredFlows} />
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <footer className="border-t border-white/5 pt-6 pb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-600">Powered by</span>
            <span className="text-xs font-semibold text-zinc-400">Allium</span>
            <span className="text-xs text-zinc-700">|</span>
            <span className="text-xs text-zinc-600">x402 + ERC-8004 data</span>
          </div>
          <div className="text-xs text-zinc-700">
            Built for VibeHacks 2026
          </div>
        </footer>
      </main>
    </div>
  );
}
