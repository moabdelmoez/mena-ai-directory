'use client';

import { Suspense, useMemo } from 'react';
import { StackProvider, StackTheme } from '@stackframe/stack';
import { StackClientApp } from '@stackframe/stack';

function AppShell() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-xl backdrop-saturate-150 border-b border-zinc-800/50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16" />
        </div>
      </header>
      <main className="flex-1" />
    </div>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const app = useMemo(() => new StackClientApp({
      tokenStore: 'nextjs-cookie',
      urls: {
        signIn: '/signin',
        signUp: '/signup',
      },
    }), []);

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
