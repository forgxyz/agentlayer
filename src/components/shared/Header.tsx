'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function Header() {
  return (
    <header className="border-b border-cyan-500/20 bg-black/80 backdrop-blur-xl sticky top-0 z-50 shadow-lg shadow-cyan-500/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity group">
          <div className="relative w-10 h-10 rounded-lg overflow-hidden ring-2 ring-cyan-400/30 group-hover:ring-cyan-400/50 transition-all">
            <Image
              src="/logo.png"
              alt="AgentLayer OS"
              width={40}
              height={40}
              className="object-cover"
            />
          </div>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent leading-tight">
              AgentLayer OS
            </h1>
            <p className="text-[10px] text-cyan-500/60 leading-tight">AI Agent Economy Explorer</p>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-600">Powered by</span>
          <span className="text-[10px] font-semibold text-cyan-400">Allium</span>
        </div>
      </div>
    </header>
  );
}
