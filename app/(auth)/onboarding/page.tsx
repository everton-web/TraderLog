'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ThemeProvider from '@/components/ThemeProvider';

export default function OnboardingPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return (
    <>
      <ThemeProvider />
      <div className="auth-wrapper" />
    </>
  );
}
