'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui';
import Image from 'next/image';

export function Header() {
  const router = useRouter();
  const { data: session, status } = useSession();

  return (
    <header className="bg-black">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
              <span className="text-black font-bold text-lg">M</span>
            </div>
            <span className="text-xl font-bold text-white">MENA AI</span>
          </Link>

          <nav className="flex items-center gap-6">
            <Link
              href="/search"
              className="text-gray-300 hover:text-white transition-colors"
            >
              Browse
            </Link>
            <Link
              href="/register"
              className="text-gray-300 hover:text-white transition-colors"
            >
              Register Company
            </Link>

            {status === 'loading' ? (
              <div className="flex items-center gap-4">
                <div className="w-20 h-4 bg-gray-700 rounded animate-pulse" />
                <div className="w-8 h-8 rounded-full bg-gray-700 animate-pulse" />
              </div>
            ) : session ? (
              <div className="flex items-center gap-4">
                <Link
                  href="/dashboard"
                  className="text-gray-300 hover:text-white transition-colors"
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
                    className="text-gray-300 hover:text-white hover:bg-gray-800"
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
        </div>
      </div>
    </header>
  );
}
