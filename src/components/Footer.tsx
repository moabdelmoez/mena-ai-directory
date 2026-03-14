import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-zinc-950 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-white rounded flex items-center justify-center">
              <span className="text-black font-semibold text-sm">M</span>
            </div>
            <span className="text-sm font-semibold text-white">MENA AI Directory</span>
          </div>

          <nav className="flex items-center gap-6">
            <Link href="/search" className="text-xs text-zinc-400 hover:text-white transition-colors">
              Browse
            </Link>
            <Link href="/register" className="text-xs text-zinc-400 hover:text-white transition-colors">
              Register
            </Link>
          </nav>
        </div>

        <div className="border-t border-zinc-800 mt-6 pt-6 flex flex-col items-center gap-2">
          <p className="text-xs tracking-wide text-zinc-400">
            Built with AI, Reviewed by Humans
          </p>
          <p className="text-xs text-zinc-500">
            &copy; {new Date().getFullYear()} MENA AI Directory. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
