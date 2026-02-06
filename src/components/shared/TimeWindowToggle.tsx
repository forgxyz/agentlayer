'use client';

import { useTimeWindow } from '@/hooks/useTimeWindow';
import { TIME_WINDOWS } from '@/lib/constants';

export default function TimeWindowToggle() {
  const { window, setWindow } = useTimeWindow();

  return (
    <div className="flex items-center gap-1 bg-zinc-900/50 border border-white/10 rounded-lg p-1">
      {TIME_WINDOWS.map((tw) => (
        <button
          key={tw.value}
          onClick={() => setWindow(tw.value)}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
            window === tw.value
              ? 'bg-white/10 text-white'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          {tw.label}
        </button>
      ))}
    </div>
  );
}
