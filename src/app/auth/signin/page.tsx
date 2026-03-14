'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { useUser } from '@stackframe/stack';

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useUser();
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  useEffect(() => {
    if (user) {
      router.push(callbackUrl);
    } else {
      // Redirect to Stack Auth's sign-in handler
      router.push(`/handler/sign-in?after_auth_return_to=${encodeURIComponent(callbackUrl)}`);
    }
  }, [user, router, callbackUrl]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
          <span className="text-white text-2xl font-bold">M</span>
        </div>
        <p className="text-zinc-600">Redirecting to sign in...</p>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <SignInContent />
    </Suspense>
  );
}
