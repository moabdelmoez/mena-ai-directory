'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser, useStackApp } from '@stackframe/stack';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { isValidWorkEmail, maskEmail } from '@/lib/auth-utils';

const RESEND_COOLDOWN_SECONDS = 30;

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

type SignInState = 'email_input' | 'otp_input';

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useUser();
  const app = useStackApp();

  const rawReturnTo = searchParams.get('after_auth_return_to') || '/';
  // Sanitize returnTo to prevent open redirects — must be a relative path
  const returnTo = rawReturnTo.startsWith('/') && !rawReturnTo.startsWith('//') ? rawReturnTo : '/';

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push(returnTo);
    }
  }, [user, router, returnTo]);

  const [state, setState] = useState<SignInState>('email_input');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nonce, setNonce] = useState('');

  // OTP state
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const otpInputRef = useRef<HTMLInputElement>(null);

  // Resend cooldown
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Auto-focus OTP input when entering OTP state
  useEffect(() => {
    if (state === 'otp_input') {
      otpInputRef.current?.focus();
    }
  }, [state]);

  const sendOtp = useCallback(async (emailToSend: string) => {
    const result = await app.sendMagicLinkEmail(emailToSend);
    if (result.status === 'error') {
      setEmailError(result.error.message);
      return null;
    }
    return result.data.nonce;
  }, [app]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setEmailError('Please enter your email address');
      return;
    }

    if (!isValidWorkEmail(trimmedEmail)) {
      setEmailError('Please use your company or work email. Personal emails (Gmail, Yahoo, etc.) are not accepted.');
      return;
    }

    setIsSubmitting(true);
    try {
      const newNonce = await sendOtp(trimmedEmail);
      if (newNonce) {
        setNonce(newNonce);
        setEmail(trimmedEmail);
        setState('otp_input');
        setResendCooldown(RESEND_COOLDOWN_SECONDS);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpChange = async (value: string) => {
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setOtp(cleaned);
    setOtpError('');

    if (cleaned.length === 6 && !isVerifying) {
      setIsVerifying(true);
      try {
        const result = await app.signInWithMagicLink(cleaned + nonce);
        if (result.status === 'error') {
          setOtpError('Invalid or expired code. Please try again.');
          setOtp('');
        }
      } finally {
        setIsVerifying(false);
      }
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setOtpError('');
    const newNonce = await sendOtp(email);
    if (newNonce) {
      setNonce(newNonce);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    }
  };

  const handleBack = () => {
    setState('email_input');
    setOtp('');
    setOtpError('');
    setNonce('');
  };

  const handleLinkedIn = async () => {
    try {
      await app.signInWithOAuth('linkedin');
    } catch {
      setEmailError('Unable to start LinkedIn sign-in. Please try again or use email.');
    }
  };

  if (user) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <p className="text-zinc-500">Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-zinc-200 p-8">
          {state === 'email_input' ? (
            <>
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 text-center mb-2">
                Sign in to BayanBase
              </h1>
              <p className="text-sm text-zinc-500 text-center mb-8">
                Use your company email or LinkedIn to continue
              </p>

              <Button
                variant="outline"
                size="lg"
                className="w-full mb-6"
                onClick={handleLinkedIn}
              >
                <LinkedInIcon className="w-5 h-5 mr-2 text-[#0A66C2]" />
                Continue with LinkedIn
              </Button>

              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-3 text-zinc-400 font-medium">or</span>
                </div>
              </div>

              <form onSubmit={handleEmailSubmit}>
                <Input
                  id="email"
                  type="email"
                  label="Work email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError('');
                  }}
                  error={emailError}
                  autoComplete="email"
                  autoFocus
                />
                <Button
                  type="submit"
                  size="lg"
                  className="w-full mt-4"
                  isLoading={isSubmitting}
                >
                  Continue
                </Button>
              </form>

              <p className="text-xs text-zinc-400 text-center mt-6">
                Personal emails (Gmail, Yahoo, etc.) are not accepted.
                <br />
                Use your company email or sign in with LinkedIn.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 text-center mb-2">
                Check your email
              </h1>
              <p className="text-sm text-zinc-500 text-center mb-8">
                We sent a 6-digit code to{' '}
                <span className="font-medium text-zinc-700">{maskEmail(email)}</span>
              </p>

              <div className="flex justify-center mb-4">
                <input
                  ref={otpInputRef}
                  type="text"
                  inputMode="text"
                  value={otp}
                  onChange={(e) => handleOtpChange(e.target.value)}
                  maxLength={6}
                  disabled={isVerifying}
                  placeholder="------"
                  className="text-center text-2xl font-mono tracking-[0.5em] w-56 border border-zinc-300 rounded-xl px-4 py-3 text-zinc-900 placeholder-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/20 focus-visible:border-blue-600 transition-colors disabled:opacity-50"
                  aria-label="Verification code"
                />
              </div>

              {otpError && (
                <p role="alert" className="text-sm text-red-600 text-center mb-4">
                  {otpError}
                </p>
              )}

              {isVerifying && (
                <p className="text-sm text-zinc-500 text-center mb-4">Verifying...</p>
              )}

              <div className="text-center mb-4">
                <p className="text-sm text-zinc-500 mb-1">Didn&apos;t receive the code?</p>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCooldown > 0}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 disabled:text-zinc-400 disabled:cursor-not-allowed transition-colors"
                >
                  {resendCooldown > 0
                    ? `Resend in ${resendCooldown}s`
                    : 'Resend code'}
                </button>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleBack}
                  className="text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
                >
                  &larr; Use a different email
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[80vh] flex items-center justify-center">
          <p className="text-zinc-500">Loading...</p>
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
