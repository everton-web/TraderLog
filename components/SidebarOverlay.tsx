'use client';

export default function SidebarOverlay() {
  function close() {
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebar-overlay')?.classList.remove('open');
  }
  return <div id="sidebar-overlay" className="sidebar-overlay" onClick={close} />;
}
