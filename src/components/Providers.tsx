'use client';

import { Suspense, useMemo } from 'react';
import { StackProvider, StackTheme } from '@stackframe/stack';
import { StackClientApp } from '@stackframe/stack';

function AppShell() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="sticky top-0 z-50 bg-zinc-950 h-16 border-b border-zinc-800/50" />
      <main className="flex-1" />
    </div>
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
