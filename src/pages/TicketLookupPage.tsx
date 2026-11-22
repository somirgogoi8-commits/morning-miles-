import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import type { BrandingSettings, VerifiedTicketData } from '../types';
import { DigitalTicketCard } from '../components/DigitalTicketCard';

interface TicketLookupPageProps {
  branding: BrandingSettings;
}

export const TicketLookupPage: React.FC<TicketLookupPageProps> = ({ branding }) => {
  const [searchParams] = useSearchParams();
  const [registrationId, setRegistrationId] = React.useState(searchParams.get('id') || '');
  const [phoneLast4, setPhoneLast4] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [ticket, setTicket] = React.useState<VerifiedTicketData | null>(null);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setTicket(null);
    if (!registrationId.trim() || !/^\d{4}$/.test(phoneLast4.trim())) {
      setError('Enter your Registration ID and the last 4 digits of your registered phone.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/tickets/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrationId: registrationId.trim().toUpperCase(),
          phoneLast4: phoneLast4.trim(),
        }),
      });
      const data = (await res.json()) as VerifiedTicketData & { error?: string };
      if (!res.ok) {
        setError(data.error || 'Ticket lookup failed.');
        return;
      }
      setTicket(data);
    } catch {
      setError('Network error while checking your ticket.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-10">
      <div className="space-y-3 border-b border-white/10 pb-8">
        <p className="text-xs font-mono uppercase tracking-widest text-red-500">
          Participant Pass Verification
        </p>
        <h1 className="font-display text-4xl sm:text-5xl font-bold uppercase tracking-tight text-white">
          Retrieve Digital Ticket
        </h1>
        <p className="text-sm text-zinc-400 max-w-2xl">
          Enter your Morning Miles Club Registration ID and the last 4 digits of your registered
          phone number to view or download your verified event-day QR pass.
        </p>
      </div>

      <form
        onSubmit={handleLookup}
        className="bg-[#121216] border border-white/10 rounded-xl p-6 grid grid-cols-1 sm:grid-cols-12 gap-4 items-end"
      >
        <div className="sm:col-span-5">
          <label
            htmlFor="lookup-reg-id"
            className="block text-xs font-medium text-zinc-300 mb-1.5"
          >
            Registration ID
          </label>
          <input
            id="lookup-reg-id"
            type="text"
            required
            value={registrationId}
            onChange={(e) => setRegistrationId(e.target.value)}
            placeholder="MMC-MH-XXXXXX"
            className="w-full px-4 py-2.5 bg-zinc-950 border border-white/15 rounded-lg text-sm font-mono uppercase text-white focus:outline-none focus:border-red-500"
          />
        </div>
        <div className="sm:col-span-4">
          <label
            htmlFor="lookup-phone4"
            className="block text-xs font-medium text-zinc-300 mb-1.5"
          >
            Last 4 Digits of Phone
          </label>
          <input
            id="lookup-phone4"
            type="text"
            required
            maxLength={4}
            pattern="\d{4}"
            value={phoneLast4}
            onChange={(e) => setPhoneLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="4321"
            className="w-full px-4 py-2.5 bg-zinc-950 border border-white/15 rounded-lg text-sm font-mono text-white focus:outline-none focus:border-red-500"
          />
        </div>
        <div className="sm:col-span-3">
          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
          >
            <Search className="w-4 h-4" />
            {loading ? 'Checking...' : 'Find Ticket'}
          </button>
        </div>
      </form>

      {error && (
        <div className="p-4 bg-red-950/40 border border-red-600/40 rounded-xl text-sm text-red-200">
          {error}
        </div>
      )}

      {ticket && <DigitalTicketCard ticket={ticket} branding={branding} />}
    </div>
  );
};
