import React from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import {
  Calendar,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  QrCode,
  Shield,
  Users,
  X,
} from 'lucide-react';
import { useHostAuth } from '../context/HostAuthContext';
import type { BrandingSettings } from '../types';
import { ClubLogo } from './ClubLogo';

interface HostLayoutProps {
  branding: BrandingSettings;
  title: string;
  children: React.ReactNode;
}

export const HostLayout: React.FC<HostLayoutProps> = ({ branding, title, children }) => {
  const {
    user,
    authLoading,
    isAuthorized,
    role,
    events,
    selectedEventId,
    setSelectedEventId,
    logout,
  } = useHostAuth();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const location = useLocation();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#09090B] text-zinc-100 flex items-center justify-center">
        <div className="text-sm font-mono uppercase tracking-widest text-zinc-400">
          Verifying Host Session...
        </div>
      </div>
    );
  }

  if (!user || !isAuthorized) {
    return <Navigate to="/host/login" replace />;
  }

  const navItems = [
    { to: '/host/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/host/registrations', label: 'Participants', icon: Users },
    { to: '/host/payments', label: 'Payments', icon: CreditCard },
    { to: '/host/events', label: 'Events & Media', icon: Calendar },
    { to: '/host/check-in', label: 'QR Check-In', icon: QrCode },
  ];

  if (role === 'PRIMARY_ADMIN') {
    navItems.push({ to: '/host/team', label: 'Hosts & Audit', icon: Shield });
  }

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between bg-[#0C0C0F] border-r border-white/10">
      <div className="p-5 space-y-6">
        <div className="pb-4 border-b border-white/10">
          <Link to="/host/dashboard" className="block">
            <ClubLogo logoUrl={branding.logoUrl} size="sm" />
          </Link>
          <div className="mt-3 text-[11px] font-mono uppercase tracking-widest text-red-500">
            {role === 'PRIMARY_ADMIN' ? 'Primary Administrator' : 'Event Host'}
          </div>
          <div className="text-xs text-zinc-400 truncate mt-0.5">{user.email}</div>
        </div>

        <nav className="space-y-1" aria-label="Host portal navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-red-600 text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-5 border-t border-white/10 space-y-2">
        <Link
          to="/"
          className="block w-full text-center px-4 py-2 text-xs font-medium text-zinc-300 border border-white/10 rounded-lg hover:bg-white/5"
        >
          View Public Website
        </Link>
        <button
          type="button"
          onClick={() => void logout()}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-red-400 hover:text-white hover:bg-red-600/20 border border-red-600/30 rounded-lg transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 sticky top-0 h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-64 h-full">{sidebarContent}</div>
          <button
            type="button"
            aria-label="Close sidebar"
            onClick={() => setSidebarOpen(false)}
            className="flex-1 bg-black/70"
          />
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 px-4 sm:px-6 lg:px-8 border-b border-white/10 bg-[#09090B]/95 backdrop-blur flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen((v) => !v)}
              aria-label="Toggle navigation"
              className="lg:hidden p-2 rounded-lg border border-white/10 text-zinc-300 hover:bg-white/5 cursor-pointer"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="min-w-0">
              <div className="text-[11px] font-mono uppercase tracking-widest text-zinc-500">
                Host Portal
              </div>
              <h1 className="font-display text-xl font-bold uppercase text-white truncate">
                {title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <label htmlFor="host-event-filter" className="sr-only">
              Filter by Event
            </label>
            <select
              id="host-event-filter"
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="max-w-[220px] px-3 py-2 bg-[#121216] border border-white/15 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-red-500"
            >
              <option value="ALL">All Events</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title}
                </option>
              ))}
            </select>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
};
