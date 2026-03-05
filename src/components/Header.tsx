'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui';
import Image from 'next/image';

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-xl backdrop-saturate-150 border-b border-zinc-800/50">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
              <span className="text-black font-bold text-lg">M</span>
            </div>
            <span className="text-xl font-semibold text-white">MENA AI</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/search"
              className="text-zinc-400 hover:text-white transition-colors"
            >
              Browse
            </Link>
            <Link
              href="/register"
              className="text-zinc-400 hover:text-white transition-colors"
            >
              Register Company
            </Link>

            {status === 'loading' ? (
              <div className="flex items-center gap-4">
                <div className="w-20 h-4 bg-zinc-700 rounded animate-pulse" />
                <div className="w-8 h-8 rounded-full bg-zinc-700 animate-pulse" />
              </div>
            ) : session ? (
              <div className="flex items-center gap-4">
                <Link
                  href="/dashboard"
                  className="text-zinc-400 hover:text-white transition-colors"
                >
                  Dashboard
                </Link>
                <div className="flex items-center gap-2">
                  {session.user.image && (
                    <Image
                      src={session.user.image}
                      alt={session.user.name || 'User'}
                      width={32}
                      height={32}
                      className="rounded-full"
                    />
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => signOut()}
                    className="text-zinc-400 hover:text-white hover:bg-zinc-800"
                  >
                    Sign Out
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => router.push('/auth/signin')}
              >
                Sign In
              </Button>
            )}
          </nav>

          {/* Hamburger button */}
          <button
            className="md:hidden text-zinc-400 hover:text-white p-2"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-expanded={menuOpen}
            aria-label="Main navigation"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {menuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <nav className="md:hidden border-t border-zinc-800 px-6 py-4 flex flex-col gap-4">
          <Link
            href="/search"
            className="text-zinc-400 hover:text-white transition-colors"
            onClick={() => setMenuOpen(false)}
          >
            Browse
          </Link>
          <Link
            href="/register"
            className="text-zinc-400 hover:text-white transition-colors"
            onClick={() => setMenuOpen(false)}
          >
            Register Company
          </Link>

          {status === 'loading' ? (
            <div className="w-20 h-4 bg-zinc-700 rounded animate-pulse" />
          ) : session ? (
            <>
              <Link
                href="/dashboard"
                className="text-zinc-400 hover:text-white transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                Dashboard
              </Link>
              <div className="flex items-center gap-2">
                {session.user.image && (
                  <Image
                    src={session.user.image}
                    alt={session.user.name || 'User'}
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setMenuOpen(false);
                    signOut();
                  }}
                  className="text-zinc-400 hover:text-white hover:bg-zinc-800"
                >
                  Sign Out
                </Button>
              </div>
            </>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setMenuOpen(false);
                router.push('/auth/signin');
              }}
            >
              Sign In
            </Button>
          )}
        </nav>
      )}
    </header>
  );
}
