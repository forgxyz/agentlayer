'use client';

import { getScoreColor } from '@/lib/reputation';

interface ReputationBadgeProps {
  score: number;
  size?: 'sm' | 'md';
}

export default function ReputationBadge({ score, size = 'md' }: ReputationBadgeProps) {
  const color = getScoreColor(score);
  const dims = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10';
  const fontSize = size === 'sm' ? 'text-xs' : 'text-sm';
  const strokeWidth = size === 'sm' ? 3 : 4;
  const r = size === 'sm' ? 12 : 16;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;
  const viewBox = size === 'sm' ? '0 0 30 30' : '0 0 40 40';
  const center = size === 'sm' ? 15 : 20;

  return (
    <div className={`relative ${dims} flex items-center justify-center`}>
      <svg className="absolute inset-0" viewBox={viewBox}>
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <span className={`${fontSize} font-bold`} style={{ color }}>
        {score}
      </span>
    </div>
  );
}
