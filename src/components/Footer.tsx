import Link from 'next/link';
import Image from 'next/image';

export function Footer() {
  return (
    <footer className="bg-zinc-950 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/images/bayanbase-logo.png"
              alt="BayanBase"
              width={350}
              height={70}
              className="h-10 w-auto"
            />
          </Link>

          <nav className="flex items-center gap-6">
            <Link href="/search" className="text-xs text-zinc-400 hover:text-white transition-colors">
              Browse
            </Link>
            <Link href="/register" className="text-xs text-zinc-400 hover:text-white transition-colors">
              Register
            </Link>
            <Link href="/about" className="text-xs text-zinc-400 hover:text-white transition-colors">
              About
            </Link>
          </nav>

          <p className="text-xs text-zinc-500 md:hidden mt-2">
            Questions or feedback? Reach us at{' '}
            <a href="mailto:support@bayanbase.com" className="text-zinc-400 hover:text-white transition-colors">support@bayanbase.com</a>
          </p>
        </div>

        <p className="hidden md:block text-center text-xs text-zinc-500 mt-4">
          Questions or feedback? Reach us at{' '}
          <span className="text-zinc-400">support@bayanbase.com</span>
        </p>

        <div className="border-t border-zinc-800 mt-6 pt-6 flex flex-col items-center gap-2">
          <p className="text-xs tracking-wide text-zinc-400">
            Built by AI, Reviewed by Human
          </p>
          <p className="text-xs text-zinc-500">
            &copy; {new Date().getFullYear()} BayanBase. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
