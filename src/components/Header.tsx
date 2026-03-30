'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useUser } from '@stackframe/stack';
import { Button } from '@/components/ui';
import { UserMenu } from '@/components/UserMenu';
import Image from 'next/image';

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const user = useUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const handleSignOut = async () => {
    await user?.signOut();
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-xl backdrop-saturate-150 border-b border-zinc-800/50">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/images/bayanbase-logo.png"
              alt="BayanBase"
              width={350}
              height={70}
              className="h-10 w-auto"
              priority
            />
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
            <Link
              href="/about"
              className="text-zinc-400 hover:text-white transition-colors"
            >
              About
            </Link>

            <div className={`transition-opacity duration-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
              {user ? (
                <UserMenu user={user} />
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => router.push('/handler/sign-in')}
                >
                  Sign In
                </Button>
              )}
            </div>
          </nav>

          {/* Hamburger button */}
          <button
            type="button"
            className="md:hidden text-zinc-400 hover:text-white p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50 rounded-lg"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
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
          <Link
            href="/about"
            className="text-zinc-400 hover:text-white transition-colors"
            onClick={() => setMenuOpen(false)}
          >
            About
          </Link>

          {user ? (
            <>
              <div className="flex items-center gap-3 py-1">
                {user.profileImageUrl ? (
                  <Image
                    src={user.profileImageUrl}
                    alt={user.displayName || 'User'}
                    width={32}
                    height={32}
                    sizes="32px"
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center">
                    <span className="text-sm font-medium text-zinc-300">
                      {(user.displayName || 'U').charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <span className="text-sm font-medium text-white truncate">
                  {user.displayName || 'User'}
                </span>
              </div>
              <Link
                href="/dashboard"
                className="text-zinc-400 hover:text-white transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                Dashboard
              </Link>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  handleSignOut().catch(console.error);
                }}
                className="text-red-400 hover:text-red-300 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50 rounded"
              >
                Sign Out
              </button>
            </>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setMenuOpen(false);
                router.push('/handler/sign-in');
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
