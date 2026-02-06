'use client';

interface StatCardProps {
  label: string;
  value: string;
  subValue?: string;
  color?: string;
}

export default function StatCard({ label, value, subValue, color }: StatCardProps) {
  return (
    <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-4 flex flex-col gap-1">
      <span className="text-xs text-zinc-500 uppercase tracking-wider">{label}</span>
      <span
        className="text-2xl font-bold"
        style={{ color: color || '#ffffff' }}
      >
        {value}
      </span>
      {subValue && (
        <span className="text-xs text-zinc-600">{subValue}</span>
      )}
    </div>
  );
}
