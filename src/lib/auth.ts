import { StackServerApp } from '@stackframe/stack';

let _app: StackServerApp | null = null;

export function getStackServerApp(): StackServerApp {
  if (!_app) {
    _app = new StackServerApp({
      tokenStore: 'nextjs-cookie',
    });
  }
  return _app;
}

/**
 * Lazy proxy for the Stack Auth server app.
 * Defers initialization to avoid build-time errors when env vars are not set.
 */
export const stackServerApp: StackServerApp = new Proxy({} as StackServerApp, {
  get(_target, prop) {
    const app = getStackServerApp();
    const value = Reflect.get(app, prop, app);
    if (typeof value === 'function') {
      return value.bind(app);
    }
    return value;
  },
});
