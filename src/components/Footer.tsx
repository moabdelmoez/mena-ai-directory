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
              width={280}
              height={56}
              className="h-20 w-auto"
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
        </div>

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
