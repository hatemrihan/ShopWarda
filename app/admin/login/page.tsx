'use client';

import { signIn, useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import CircularText from '@/components/CircularText';
import TextType from '@/components/TextType';

function LoginForm() {
  const searchParams = useSearchParams();
  const { status } = useSession();
  const error = searchParams.get('error');
  const callbackUrl = '/admin';

  // Redirect if already authenticated
  useEffect(() => {
    if (status === 'authenticated') {
      window.location.href = '/admin';
    }
  }, [status]);

  return (
    <div className="relative min-h-screen w-full bg-[#faf9f6] flex flex-col items-center justify-center p-4 md:p-8">
      {/* Subtle Background Glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(99,102,241,0.05) 0%, transparent 70%)',
        }}
      />

      {/* Error Banner */}
      {error && (
        <div className="relative z-10 mb-6 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-xs sm:text-sm text-red-700 max-w-sm w-full text-center">
          {error === 'AccessDenied'
            ? 'Your email is not authorized for admin access.'
            : 'An error occurred. Please try again.'}
        </div>
      )}

      {/* ── Main Two-Column Centered Layout ── */}
      <div className="relative z-10 w-full max-w-4xl flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12 px-4 py-8">
        {/* Left Component: Circular Text Component */}
        <div className="w-full md:w-1/2 flex items-center justify-center p-4">
          <CircularText
            text="WELCOME! YA WARDA. "
            spinDuration={14}
            onHover="speedUp"
            className="!w-[160px] !h-[160px] sm:!w-[200px] sm:!h-[200px] md:!w-[240px] md:!h-[240px] !text-indigo-600 !text-xs sm:!text-sm md:!text-base font-bold tracking-widest"
          />
        </div>

        {/* Center Vertical Separator Line */}
        <div className="w-48 h-[1px] md:w-[1px] md:h-64 bg-neutral-300/80 flex-shrink-0" />

        {/* Right Component: Developer Message */}
        <div className="w-full md:w-1/2 flex items-center justify-center p-4 text-center md:text-left">
          <TextType
            text={['HI, its your developer! hatum, This is only for you, yoyo!']}
            typingSpeed={60}
            deletingSpeed={30}
            pauseDuration={4000}
            loop
            showCursor
            cursorCharacter="▌"
            className="text-base sm:text-lg md:text-xl font-medium tracking-wide text-neutral-800 leading-relaxed font-sans"
            cursorClassName="text-indigo-500 font-bold"
          />
        </div>
      </div>

      {/* Google Sign-in Button (Placed beneath the main components) */}
      <div className="relative z-10 mt-8 md:mt-12">
        <button
          className="inline-flex items-center text-xs sm:text-sm font-semibold tracking-wider text-neutral-800 underline underline-offset-4 decoration-neutral-300 hover:decoration-neutral-900 transition-all duration-200 cursor-pointer bg-transparent border-none p-0 uppercase"
          onClick={() => signIn('google', { callbackUrl })}
        >
          <svg className="mr-2 h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Sign in with Google
        </button>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
