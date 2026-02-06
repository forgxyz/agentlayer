'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type cytoscape from 'cytoscape';
import MeshControls from './MeshControls';
import NodeCard from './NodeCard';

interface MeshViewProps {
  graphData: {
    nodes: Array<{ data: Record<string, unknown> }>;
    edges: Array<{ data: Record<string, unknown> }>;
  } | null;
  facilitatorData: {
    nodes: Array<{ data: Record<string, unknown> }>;
    edges: Array<{ data: Record<string, unknown> }>;
  } | null;
  onNodeSelect?: (nodeId: string | null) => void;
}

export default function MeshView({ graphData, facilitatorData, onNodeSelect }: MeshViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const destroyingRef = useRef(false);
  const [tier, setTier] = useState<'facilitator' | 'agents'>('facilitator');
  const [selectedNode, setSelectedNode] = useState<Record<string, unknown> | null>(null);
  const [cardPosition, setCardPosition] = useState({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!containerRef.current) return;

      const cy = (await import('cytoscape')).default;
      const fcose = (await import('cytoscape-fcose')).default;
      cy.use(fcose);

      const data = tier === 'facilitator' ? facilitatorData : graphData;
      if (!data || cancelled) return;

      // Safely destroy previous instance
      if (cyRef.current) {
        try {
          cyRef.current.destroy();
        } catch {
          // ignore destroy errors on stale instances
        }
        cyRef.current = null;
      }

      if (cancelled) return;

      const instance = cy({
        container: containerRef.current,
        elements: [...data.nodes, ...data.edges],
        style: [
          {
            selector: 'node',
            style: {
              width: 'data(size)',
              height: 'data(size)',
              'background-color': 'data(color)',
              'background-opacity': 0.85,
              'border-width': 2,
              'border-color': 'data(color)',
              'border-opacity': 0.3,
              label: 'data(label)',
              'font-size': tier === 'facilitator' ? '11px' : '8px',
              color: '#ffffff',
              'text-opacity': 0.9,
              'text-outline-width': 2,
              'text-outline-color': '#000000',
              'text-valign': 'bottom',
              'text-margin-y': 8,
              'overlay-opacity': 0,
            } as unknown as cytoscape.Css.Node,
          },
          {
            selector: 'edge',
            style: {
              width: 'data(width)',
              'line-color': 'data(color)',
              'line-opacity': 0.3,
              'curve-style': 'bezier',
              'target-arrow-shape': 'triangle',
              'target-arrow-color': 'data(color)',
              'arrow-scale': 0.6,
              'overlay-opacity': 0,
            } as unknown as cytoscape.Css.Edge,
          },
          {
            selector: 'node:selected',
            style: {
              'border-width': 4,
              'border-color': '#ffffff',
              'border-opacity': 1,
              'background-opacity': 1,
            } as unknown as cytoscape.Css.Node,
          },
          {
            selector: 'edge:selected',
            style: {
              'line-opacity': 0.8,
              width: 4,
            } as unknown as cytoscape.Css.Edge,
          },
          {
            selector: '.highlighted',
            style: {
              'border-width': 3,
              'border-color': '#FFB800',
              'border-opacity': 1,
            } as unknown as cytoscape.Css.Node,
          },
          {
            selector: '.dimmed',
            style: {
              opacity: 0.15,
            } as unknown as cytoscape.Css.Node,
          },
        ] as unknown as cytoscape.StylesheetCSS[],
        layout: {
          name: 'fcose',
          animate: true,
          animationDuration: 1000,
          randomize: true,
          nodeRepulsion: () => 8000,
          idealEdgeLength: () => 120,
          edgeElasticity: () => 0.1,
          gravity: 0.25,
          gravityRange: 1.5,
          nodeSeparation: 80,
          quality: 'proof',
          fit: true,
          padding: 50,
        } as unknown as cytoscape.LayoutOptions,
        minZoom: 0.2,
        maxZoom: 4,
        wheelSensitivity: 0.3,
      });

      if (cancelled) {
        try { instance.destroy(); } catch { /* noop */ }
        return;
      }

      // Node tap handler
      instance.on('tap', 'node', (evt) => {
        const node = evt.target;
        const nodeData = node.data();
        const pos = node.renderedPosition();

        setSelectedNode(nodeData);
        setCardPosition({ x: pos.x, y: pos.y });
        onNodeSelect?.(nodeData.id);

        instance.elements().addClass('dimmed');
        node.removeClass('dimmed').addClass('highlighted');
        node.connectedEdges().removeClass('dimmed');
        node.connectedEdges().connectedNodes().removeClass('dimmed');
      });

      // Background tap to deselect
      instance.on('tap', (evt) => {
        if (evt.target === instance) {
          setSelectedNode(null);
          onNodeSelect?.(null);
          instance.elements().removeClass('dimmed highlighted');
        }
      });

      instance.on('mouseover', 'edge', (evt) => {
        evt.target.style('line-opacity', 0.7);
      });

      instance.on('mouseout', 'edge', (evt) => {
        if (!evt.target.selected()) {
          evt.target.style('line-opacity', 0.3);
        }
      });

      cyRef.current = instance;
      setIsLoading(false);
    }

    setIsLoading(true);
    setSelectedNode(null);
    init();

    return () => {
      cancelled = true;
      if (cyRef.current) {
        try {
          cyRef.current.destroy();
        } catch {
          // ignore
        }
        cyRef.current = null;
      }
    };
  }, [tier, graphData, facilitatorData, onNodeSelect]);

  const handleFit = useCallback(() => {
    cyRef.current?.fit(undefined, 50);
  }, []);

  const handleTierChange = useCallback((newTier: 'facilitator' | 'agents') => {
    setTier(newTier);
    setSelectedNode(null);
  }, []);

  return (
    <div className="relative w-full h-[500px] sm:h-[600px] lg:h-[700px] bg-black/30 rounded-xl border border-white/5 overflow-hidden">
      <MeshControls
        tier={tier}
        onTierChange={handleTierChange}
        onFit={handleFit}
      />

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-30">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-zinc-500">Loading graph...</p>
          </div>
        </div>
      )}

      <div ref={containerRef} className="w-full h-full" />

      <NodeCard
        node={selectedNode as Parameters<typeof NodeCard>[0]['node']}
        position={cardPosition}
        tier={tier}
        onClose={() => {
          setSelectedNode(null);
          onNodeSelect?.(null);
          try {
            cyRef.current?.elements().removeClass('dimmed highlighted');
          } catch { /* noop */ }
        }}
      />

      {/* Legend */}
      <div className="absolute bottom-4 right-4 z-40 bg-zinc-900/90 border border-white/10 rounded-lg p-3 backdrop-blur-xl">
        <p className="text-[10px] text-zinc-500 uppercase mb-2">Chains</p>
        <div className="flex flex-col gap-1">
          {[
            { chain: 'Base', color: '#0052FF' },
            { chain: 'Solana', color: '#9945FF' },
            { chain: 'Polygon', color: '#8247E5' },
          ].map((item) => (
            <div key={item.chain} className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-[10px] text-zinc-400">{item.chain}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
