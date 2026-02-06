'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import type { TimeWindow } from '@/lib/types';

interface TimeWindowContextType {
  window: TimeWindow;
  setWindow: (w: TimeWindow) => void;
}

export const TimeWindowContext = createContext<TimeWindowContextType>({
  window: '24h',
  setWindow: () => {},
});

export function useTimeWindow() {
  return useContext(TimeWindowContext);
}

export function useTimeWindowState() {
  const [window, setWindow] = useState<TimeWindow>('24h');
  return { window, setWindow: useCallback((w: TimeWindow) => setWindow(w), []) };
}
