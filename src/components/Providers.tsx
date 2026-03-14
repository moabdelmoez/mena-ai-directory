'use client';

import { Suspense, useMemo } from 'react';
import { StackProvider, StackTheme } from '@stackframe/stack';
import { StackClientApp } from '@stackframe/stack';

function AppShell() {
  return (
    <>
      <header className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-xl backdrop-saturate-150 border-b border-zinc-800/50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
                <span className="text-black font-bold text-lg">M</span>
              </div>
              <span className="text-xl font-semibold text-white">MENA AI</span>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <div className="w-16 h-4 bg-zinc-700 rounded animate-pulse" />
              <div className="w-28 h-4 bg-zinc-700 rounded animate-pulse" />
              <div className="w-16 h-8 bg-zinc-700 rounded-xl animate-pulse" />
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1" />
    </>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const app = useMemo(() => new StackClientApp({ tokenStore: 'nextjs-cookie' }), []);

  return (
    <Suspense fallback={<AppShell />}>
      <StackProvider app={app}>
        <StackTheme>
          {children}
        </StackTheme>
      </StackProvider>
    </Suspense>
  );
}
