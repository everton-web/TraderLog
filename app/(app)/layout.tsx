import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import ThemeProvider from '@/components/ThemeProvider';
import { ToastProvider } from '@/components/Toast';
import type { Profile } from '@/lib/types';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return (
    <>
      <ThemeProvider />
      <ToastProvider>
        <div className="app-wrapper">
          <Sidebar profile={profile as Profile} />
          <div className="main-content">
            <TopBar profile={profile as Profile} />
            <div className="page-content">
              {children}
            </div>
          </div>
        </div>
      </ToastProvider>
    </>
  );
}
