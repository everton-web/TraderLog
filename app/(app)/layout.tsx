import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import Sidebar from '@/components/Sidebar';
import SidebarOverlay from '@/components/SidebarOverlay';
import TopBar from '@/components/TopBar';
import ThemeProvider from '@/components/ThemeProvider';
import { ToastProvider } from '@/components/Toast';
import type { Profile } from '@/lib/types';
import { getAmbiente } from '@/lib/ambiente';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: profile }, ambiente] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    getAmbiente(),
  ]);

  return (
    <>
      <ThemeProvider />
      <ToastProvider>
        <div className="app-wrapper">
          <Sidebar profile={profile as Profile} email={user.email} ambiente={ambiente} />
          <SidebarOverlay />
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
