import React from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { useHostAuth } from '../../context/HostAuthContext';
import type { BrandingSettings } from '../../types';
import { HostLayout } from '../../components/HostLayout';

export const HostDashboardPage: React.FC<{ branding: BrandingSettings }> = ({ branding }) => {
  const {
    role,
    events,
    registrations,
    payments,
    serverOrders,
    selectedEventId,
    dataLoading,
    refreshPortalData,
    syncServerLedgerToFirestore,
  } = useHostAuth();

  const [syncing, setSyncing] = React.useState(false);
  const [syncNotice, setSyncNotice] = React.useState<string | null>(null);

  const filteredRegs = React.useMemo(
    () =>
      selectedEventId === 'ALL'
        ? registrations
        : registrations.filter((r) => r.eventId === selectedEventId),
    [registrations, selectedEventId]
  );

  const filteredEvents = React.useMemo(
    () =>
      selectedEventId === 'ALL'
        ? events
        : events.filter((e) => e.id === selectedEventId),
    [events, selectedEventId]
  );

  const serverOrderMap = React.useMemo(() => {
    const map = new Map(serverOrders.map((o) => [o.registrationId, o]));
    return map;
  }, [serverOrders]);

  const stats = React.useMemo(() => {
    let confirmed = 0;
    let pending = 0;
    let failed = 0;
    let checkedIn = 0;
    let totalRevenue = 0;

    for (const r of filteredRegs) {
      const srv = serverOrderMap.get(r.registrationId);
      const effectiveStatus = srv ? srv.registrationStatus : r.status;
      const effectiveCheckedIn = srv ? srv.checkedIn || r.checkedIn : r.checkedIn;

      if (effectiveStatus === 'CONFIRMED') {
        confirmed += 1;
        totalRevenue += srv ? srv.amountInr : r.amountInr || 0;
      } else if (
        effectiveStatus === 'PENDING PAYMENT' ||
        effectiveStatus === 'PAYMENT PROCESSING'
      ) {
        pending += 1;
      } else if (effectiveStatus === 'PAYMENT FAILED') {
        failed += 1;
      }

      if (effectiveCheckedIn) {
        checkedIn += 1;
      }
    }

    // Also include any verified payment records not yet mirrored in registrations
    if (totalRevenue === 0 && payments.length > 0) {
      const scopedPayments =
        selectedEventId === 'ALL'
          ? payments
          : payments.filter((p) => p.eventId === selectedEventId);
      totalRevenue = scopedPayments
        .filter((p) => p.status === 'VERIFIED' || p.status === 'RECONCILED')
        .reduce((acc, p) => acc + (p.amountInr || 0), 0);
    }

    const totalCapacity = filteredEvents.reduce((acc, e) => acc + (e.capacity || 0), 0);
    const remainingCapacity = Math.max(0, totalCapacity - confirmed);

    return {
      totalRegistrations: filteredRegs.length,
      confirmed,
      pending,
      failed,
      totalRevenue,
      checkedIn,
      totalCapacity,
      remainingCapacity,
    };
  }, [filteredRegs, filteredEvents, serverOrderMap, payments, selectedEventId]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncNotice(null);
    try {
      const { updated } = await syncServerLedgerToFirestore();
      setSyncNotice(
        updated > 0
          ? `Synchronized ${updated} server-verified registration/payment updates into Firestore.`
          : 'All Firestore records are already up to date with the server payment ledger.'
      );
    } finally {
      setSyncing(false);
    }
  };

  const cards = [
    { label: 'TOTAL REGISTRATIONS', value: stats.totalRegistrations, accent: 'text-white' },
    { label: 'CONFIRMED PARTICIPANTS', value: stats.confirmed, accent: 'text-emerald-400' },
    { label: 'PENDING PAYMENTS', value: stats.pending, accent: 'text-amber-400' },
    { label: 'FAILED PAYMENTS', value: stats.failed, accent: 'text-red-400' },
    {
      label: 'TOTAL REVENUE',
      value: `₹${stats.totalRevenue.toLocaleString('en-IN')}`,
      accent: 'text-white',
    },
    { label: 'CHECKED-IN PARTICIPANTS', value: stats.checkedIn, accent: 'text-red-400' },
  ];

  return (
    <HostLayout branding={branding} title="Dashboard Overview">
      <div className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-zinc-400">
            Live figures from Firebase Firestore and server-verified Razorpay payment records.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void refreshPortalData()}
              disabled={dataLoading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#121216] border border-white/15 hover:bg-white/5 text-xs font-medium text-zinc-200 rounded-lg cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${dataLoading ? 'animate-spin' : ''}`} />
              Refresh Data
            </button>
            {role === 'PRIMARY_ADMIN' && (
              <button
                type="button"
                onClick={() => void handleSync()}
                disabled={syncing}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-xs font-semibold uppercase tracking-wider text-white rounded-lg cursor-pointer"
              >
                {syncing ? 'Syncing Ledger...' : 'Sync Verified Payments'}
              </button>
            )}
          </div>
        </div>

        {syncNotice && (
          <div className="p-3.5 bg-[#121216] border border-white/15 rounded-lg text-xs text-zinc-200">
            {syncNotice}
          </div>
        )}

        {/* 6 Required Dynamic KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {cards.map((card) => (
            <div
              key={card.label}
              className="p-6 bg-[#121216] border border-white/10 rounded-xl space-y-2"
            >
              <div className="text-xs font-mono uppercase tracking-widest text-zinc-400">
                {card.label}
              </div>
              <div className={`font-mono text-3xl font-bold tabular-nums ${card.accent}`}>
                {card.value}
              </div>
            </div>
          ))}
        </div>

        {/* Remaining Capacity & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 p-6 bg-[#121216] border border-white/10 rounded-xl space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-display text-xl font-bold uppercase text-white">
                Event Capacity Status
              </h2>
              <span className="font-mono text-xs text-zinc-400 tabular-nums">
                {stats.remainingCapacity} / {stats.totalCapacity} Remaining
              </span>
            </div>
            {filteredEvents.length === 0 ? (
              <div className="py-6 text-sm text-zinc-400 space-y-3">
                <p>No Manhunt events have been created in Firestore yet.</p>
                <Link
                  to="/host/events"
                  className="inline-block px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold uppercase tracking-wider rounded-lg"
                >
                  Create First Event
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredEvents.map((ev) => {
                  const evConfirmed = filteredRegs.filter(
                    (r) =>
                      r.eventId === ev.id &&
                      (serverOrderMap.get(r.registrationId)?.registrationStatus || r.status) ===
                        'CONFIRMED'
                  ).length;
                  const pct = ev.capacity > 0 ? Math.min(100, Math.round((evConfirmed / ev.capacity) * 100)) : 0;
                  return (
                    <div key={ev.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-white">{ev.title}</span>
                        <span className="font-mono text-zinc-400 tabular-nums">
                          {evConfirmed} / {ev.capacity} confirmed ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 bg-zinc-900 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-600 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="lg:col-span-5 p-6 bg-[#121216] border border-white/10 rounded-xl space-y-4">
            <h2 className="font-display text-xl font-bold uppercase text-white">
              Event-Day Operations
            </h2>
            <div className="space-y-2.5">
              <Link
                to="/host/check-in"
                className="block w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold uppercase tracking-wider rounded-lg text-center transition-colors"
              >
                Launch QR Check-In Scanner
              </Link>
              <Link
                to="/host/registrations"
                className="block w-full px-4 py-3 bg-zinc-950 hover:bg-zinc-900 border border-white/10 text-zinc-200 text-xs font-semibold uppercase tracking-wider rounded-lg text-center transition-colors"
              >
                Search & Export Participants
              </Link>
              <Link
                to="/host/events"
                className="block w-full px-4 py-3 bg-zinc-950 hover:bg-zinc-900 border border-white/10 text-zinc-200 text-xs font-semibold uppercase tracking-wider rounded-lg text-center transition-colors"
              >
                Manage Events & Media Highlights
              </Link>
            </div>
          </div>
        </div>
      </div>
    </HostLayout>
  );
};
