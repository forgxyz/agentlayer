'use client';

import Link from 'next/link';

export default function Header() {
  return (
    <header className="border-b border-white/10 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">A</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">AgentLayer OS</h1>
            <p className="text-[10px] text-zinc-500 leading-tight">AI Agent Economy Explorer</p>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-600">Powered by</span>
          <span className="text-[10px] font-semibold text-zinc-400">Allium</span>
        </div>
      </div>
    </header>
  );
}
