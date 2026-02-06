'use client';

interface StatCardProps {
  label: string;
  value: string;
  subValue?: string;
  color?: string;
}

export default function StatCard({ label, value, subValue, color }: StatCardProps) {
  const glowColor = color || '#00F5FF';
  return (
    <div
      className="bg-zinc-900/50 border border-cyan-500/10 rounded-xl p-4 flex flex-col gap-1 hover:border-cyan-400/30 transition-all hover:shadow-lg"
      style={{
        boxShadow: `0 0 20px ${glowColor}10`
      }}
    >
      <span className="text-xs text-cyan-400/70 uppercase tracking-wider font-medium">{label}</span>
      <span
        className="text-2xl font-bold"
        style={{
          color: color || '#00F5FF',
          textShadow: `0 0 20px ${glowColor}40`
        }}
      >
        {value}
      </span>
      {subValue && (
        <span className="text-xs text-zinc-500">{subValue}</span>
      )}
    </div>
  );
}
