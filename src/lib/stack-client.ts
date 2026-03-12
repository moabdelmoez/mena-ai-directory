'use client';

import { StackClientApp } from '@stackframe/stack';

let _app: StackClientApp | null = null;

function getApp(): StackClientApp {
  if (!_app) {
    _app = new StackClientApp({
      tokenStore: 'nextjs-cookie',
    });
  }
  return _app;
}

/**
 * Lazy proxy for the Stack Auth client app.
 * Defers initialization to avoid build-time errors when env vars are not set.
 */
export const stackClientApp: StackClientApp = new Proxy({} as StackClientApp, {
  get(_target, prop) {
    const app = getApp();
    const value = Reflect.get(app, prop, app);
    if (typeof value === 'function') {
      return value.bind(app);
    }
    return value;
  },
});
