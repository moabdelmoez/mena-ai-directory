import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Page Not Found',
};

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 mb-4">
        Page not found
      </h1>
      <p className="text-zinc-500 mb-8 max-w-md">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <div className="flex gap-4">
        <Link
          href="/"
          className="rounded-xl bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 active:scale-[0.98] transition-all"
        >
          Go home
        </Link>
        <Link
          href="/ai-companies"
          className="rounded-xl border border-zinc-200 px-6 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 active:scale-[0.98] transition-all"
        >
          Browse companies
        </Link>
      </div>
    </div>
  );
}
