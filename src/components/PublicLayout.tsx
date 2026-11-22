import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import type { BrandingSettings } from '../types';
import { ClubLogo } from './ClubLogo';

interface PublicLayoutProps {
  branding: BrandingSettings;
  children: React.ReactNode;
}

const NAV_LINKS = [
  { to: '/events', label: 'Events' },
  { to: '/how-to-play', label: 'How to Play' },
  { to: '/rules', label: 'Rulebook' },
  { to: '/highlights', label: 'Highlights' },
  { to: '/ticket', label: 'My Ticket' },
];

export const PublicLayout: React.FC<PublicLayoutProps> = ({ branding, children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const location = useLocation();

  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-[#09090B] text-zinc-100">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 h-16 bg-[#09090B]/90 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-8">
          {/* Zone 1: Single Brand Wordmark + Official Logo */}
          <Link to="/" className="shrink-0 focus-visible:outline-2 focus-visible:outline-red-500 rounded">
            <ClubLogo logoUrl={branding.logoUrl} size="sm" />
          </Link>

          {/* Zone 2: 5 Single-Line Navigation Links */}
          <nav
            aria-label="Primary navigation"
            className="hidden lg:flex items-center gap-7 text-sm font-medium text-zinc-300"
          >
            {NAV_LINKS.map((item) => {
              const active = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                    active
                      ? 'text-white border-red-600'
                      : 'border-transparent hover:text-white hover:border-white/30'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Zone 3: 1 Primary CTA + Mobile Toggle */}
          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/register"
              className="hidden sm:inline-flex items-center justify-center px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              Register Now
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
              className="lg:hidden p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-white/10 text-zinc-200 hover:bg-white/5 cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-x-0 top-16 bottom-0 z-30 bg-[#09090B]/98 backdrop-blur-lg border-t border-white/10 p-6 flex flex-col justify-between overflow-y-auto">
          <nav className="flex flex-col gap-2" aria-label="Mobile navigation">
            <Link
              to="/"
              className="px-4 py-3.5 text-base font-medium text-zinc-100 rounded-lg hover:bg-white/5"
            >
              Home
            </Link>
            {NAV_LINKS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="px-4 py-3.5 text-base font-medium text-zinc-100 rounded-lg hover:bg-white/5"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="pt-6 border-t border-white/10 space-y-3">
            <Link
              to="/register"
              className="w-full flex items-center justify-center px-5 py-3.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold uppercase tracking-wider rounded-lg transition-colors"
            >
              Register Now
            </Link>
            <Link
              to="/host/login"
              className="w-full flex items-center justify-center px-5 py-3 border border-white/15 text-zinc-300 text-xs font-medium uppercase tracking-wider rounded-lg hover:bg-white/5"
            >
              Organiser Host Login
            </Link>
          </div>
        </div>
      )}

      <main className="flex-1">{children}</main>

      {/* Official Morning Miles Club Footer */}
      <footer className="bg-[#060608] border-t border-white/10 pt-14 pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-white/10">
            <div className="md:col-span-5 space-y-4">
              <ClubLogo logoUrl={branding.logoUrl} size="md" />
              <p className="text-sm text-zinc-300 leading-relaxed max-w-md">
                {branding.clubTagline ||
                  'A community built around fitness, adventure and unforgettable experiences.'}
              </p>
              <p className="font-display text-sm font-semibold tracking-widest uppercase text-red-500">
                STAY ACTIVE. STAY CONNECTED. KEEP EXPLORING.
              </p>
              <p className="text-xs text-zinc-500">
                {branding.locationText || 'Golaghat, Assam, India'}
              </p>
            </div>

            <div className="md:col-span-3 space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                Manhunt Platform
              </h2>
              <ul className="space-y-2.5 text-sm text-zinc-300">
                <li>
                  <Link to="/events" className="hover:text-white transition-colors">
                    Upcoming Events
                  </Link>
                </li>
                <li>
                  <Link to="/how-to-play" className="hover:text-white transition-colors">
                    How to Play & SCRAM Guide
                  </Link>
                </li>
                <li>
                  <Link to="/rules" className="hover:text-white transition-colors">
                    Event Safety Rules
                  </Link>
                </li>
                <li>
                  <Link to="/highlights" className="hover:text-white transition-colors">
                    Previous Highlights
                  </Link>
                </li>
                <li>
                  <Link to="/register" className="hover:text-white transition-colors">
                    Participant Registration
                  </Link>
                </li>
                <li>
                  <Link to="/ticket" className="hover:text-white transition-colors">
                    Retrieve Digital Ticket
                  </Link>
                </li>
              </ul>
            </div>

            <div className="md:col-span-4 space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                Connect & Policies
              </h2>
              <ul className="space-y-2.5 text-sm text-zinc-300">
                <li>
                  <a
                    href={branding.instagramUrl || 'https://instagram.com/morningmilesclub'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    Instagram — @morningmilesclub
                  </a>
                </li>
                <li className="text-zinc-400">
                  Email: <span className="text-zinc-200">{branding.contactEmail || 'morningmilesclub@gmail.com'}</span>
                </li>
                <li className="text-zinc-400">
                  Contact: <span className="text-zinc-200">{branding.contactPhone || '+91 98765 00000'}</span>
                </li>
                <li>
                  <Link to="/privacy" className="hover:text-white transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="hover:text-white transition-colors">
                    Terms & Conditions
                  </Link>
                </li>
                <li className="pt-2">
                  <Link
                    to="/host/login"
                    className="text-xs font-medium text-zinc-400 hover:text-red-400 transition-colors"
                  >
                    Organiser Host Portal
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-zinc-500">
            <p>© {new Date().getFullYear()} Morning Miles Club, Golaghat. All rights reserved.</p>
            <p>Gameplay powered externally via SCRAM Hide & Seek mobile application.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
