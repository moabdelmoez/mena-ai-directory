'use client';

import { Suspense, useMemo } from 'react';
import { StackProvider, StackTheme } from '@stackframe/stack';
import { StackClientApp } from '@stackframe/stack';

export function Providers({ children }: { children: React.ReactNode }) {
  const app = useMemo(() => new StackClientApp({ tokenStore: 'nextjs-cookie' }), []);

  return (
    <Suspense fallback={null}>
      <StackProvider app={app}>
        <StackTheme>
          {children}
        </StackTheme>
      </StackProvider>
    </Suspense>
  );
}
