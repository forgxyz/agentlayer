'use client';

interface MeshControlsProps {
  tier: 'facilitator' | 'agents';
  onTierChange: (tier: 'facilitator' | 'agents') => void;
  onFit: () => void;
}

export default function MeshControls({ tier, onTierChange }: MeshControlsProps) {
  return (
    <div className="absolute top-4 left-4 z-40">
      <div className="flex items-center gap-1 bg-zinc-900/90 border border-white/10 rounded-lg p-1 backdrop-blur-xl">
        <button
          onClick={() => onTierChange('facilitator')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
            tier === 'facilitator'
              ? 'bg-white/10 text-white'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Facilitators
        </button>
        <button
          onClick={() => onTierChange('agents')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
            tier === 'agents'
              ? 'bg-white/10 text-white'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Top Agents
        </button>
      </div>
    </div>
  );
}
