import React from 'react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Download, Search, X } from 'lucide-react';
import { useHostAuth } from '../../context/HostAuthContext';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import type { BrandingSettings, ParticipantRegistration } from '../../types';
import { HostLayout } from '../../components/HostLayout';

function formatTimestamp(val: unknown): string {
  if (!val) return '—';
  if (typeof val === 'string') return new Date(val).toLocaleString('en-IN');
  if (typeof val === 'object' && val !== null && 'toDate' in val) {
    return (val as { toDate: () => Date }).toDate().toLocaleString('en-IN');
  }
  return '—';
}

function getEpochMs(val: unknown): number {
  if (!val) return 0;
  if (typeof val === 'string') return new Date(val).getTime() || 0;
  if (typeof val === 'object' && val !== null && 'toMillis' in val) {
    return (val as { toMillis: () => number }).toMillis();
  }
  return 0;
}

export const HostRegistrationsPage: React.FC<{ branding: BrandingSettings }> = ({ branding }) => {
  const {
    role,
    registrations,
    serverOrders,
    selectedEventId,
    refreshPortalData,
    logAudit,
  } = useHostAuth();

  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<
    'ALL' | 'CONFIRMED' | 'PENDING' | 'FAILED' | 'CHECKED_IN'
  >('ALL');
  const [sortOrder, setSortOrder] = React.useState<'newest' | 'oldest'>('newest');
  const [selectedReg, setSelectedReg] = React.useState<ParticipantRegistration | null>(null);
  const [actionBusy, setActionBusy] = React.useState(false);
  const [actionMsg, setActionMsg] = React.useState<string | null>(null);

  const serverMap = React.useMemo(
    () => new Map(serverOrders.map((o) => [o.registrationId, o])),
    [serverOrders]
  );

  const mergedRegs = React.useMemo(() => {
    return registrations
      .filter((r) => selectedEventId === 'ALL' || r.eventId === selectedEventId)
      .map((r) => {
        const srv = serverMap.get(r.registrationId);
        return {
          ...r,
          status: srv ? srv.registrationStatus : r.status,
          paymentStatus: srv
            ? srv.status === 'CREATED'
              ? 'PENDING'
              : srv.status
            : r.paymentStatus,
          paymentTransactionId: srv?.gatewayPaymentId || r.paymentTransactionId || '',
          paymentOrderId: srv?.orderId || r.paymentOrderId || '',
          checkedIn: Boolean(srv?.checkedIn || r.checkedIn),
          checkedInAt: srv?.checkedInAt || r.checkedInAt || '',
        } as ParticipantRegistration;
      });
  }, [registrations, serverMap, selectedEventId]);

  const filtered = React.useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return mergedRegs
      .filter((r) => {
        if (statusFilter === 'CONFIRMED' && r.status !== 'CONFIRMED') return false;
        if (
          statusFilter === 'PENDING' &&
          r.status !== 'PENDING PAYMENT' &&
          r.status !== 'PAYMENT PROCESSING'
        )
          return false;
        if (statusFilter === 'FAILED' && r.status !== 'PAYMENT FAILED') return false;
        if (statusFilter === 'CHECKED_IN' && !r.checkedIn) return false;

        if (!q) return true;
        return (
          r.fullName.toLowerCase().includes(q) ||
          r.registrationId.toLowerCase().includes(q) ||
          r.phone.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const ta = getEpochMs(a.createdAt);
        const tb = getEpochMs(b.createdAt);
        return sortOrder === 'newest' ? tb - ta : ta - tb;
      });
  }, [mergedRegs, searchTerm, statusFilter, sortOrder]);

  const handleExportCsv = () => {
    const headers = [
      'Registration ID',
      'Event ID',
      'Event Title',
      'Full Name',
      'Age',
      'Phone',
      'Email',
      'Emergency Contact',
      'Minor',
      'Guardian Name',
      'Guardian Phone',
      'Registration Date',
      'Amount INR',
      'Transaction ID',
      'Payment Status',
      'Registration Status',
      'Checked In',
    ];
    const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = filtered.map((r) =>
      [
        r.registrationId,
        r.eventId,
        r.eventTitle,
        r.fullName,
        r.age,
        r.phone,
        r.email || '',
        r.emergencyContact,
        r.isMinor ? 'Yes' : 'No',
        r.guardianName || '',
        r.guardianPhone || '',
        formatTimestamp(r.createdAt),
        r.amountInr,
        r.paymentTransactionId || '',
        r.paymentStatus,
        r.status,
        r.checkedIn ? 'Yes' : 'No',
      ]
        .map(escape)
        .join(',')
    );
    const csv = [headers.map(escape).join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `morning-miles-registrations-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCancelRegistration = async (reg: ParticipantRegistration) => {
    if (role !== 'PRIMARY_ADMIN') return;
    setActionBusy(true);
    setActionMsg(null);
    try {
      await updateDoc(doc(db, 'registrations', reg.registrationId), {
        status: 'CANCELLED',
        updatedAt: serverTimestamp(),
      }).catch((err) =>
        handleFirestoreError(err, OperationType.UPDATE, `registrations/${reg.registrationId}`)
      );
      await logAudit(
        'CANCEL_REGISTRATION',
        'registration',
        reg.registrationId,
        `Cancelled registration for ${reg.fullName}.`
      );
      setActionMsg(`Registration ${reg.registrationId} marked CANCELLED.`);
      setSelectedReg({ ...reg, status: 'CANCELLED' });
      await refreshPortalData();
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <HostLayout branding={branding} title="Participant Management">
      <div className="space-y-6">
        {/* Search, Filters & Export */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search name, Registration ID, or phone..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#121216] border border-white/15 rounded-lg text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-red-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center gap-1 p-1 bg-[#121216] border border-white/10 rounded-lg">
              {(
                [
                  ['ALL', 'All'],
                  ['CONFIRMED', 'Confirmed'],
                  ['PENDING', 'Pending'],
                  ['FAILED', 'Failed'],
                  ['CHECKED_IN', 'Checked In'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStatusFilter(key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    statusFilter === key
                      ? 'bg-red-600 text-white'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <select
              aria-label="Sort registrations"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
              className="px-3 py-2 bg-[#121216] border border-white/15 rounded-lg text-xs text-zinc-200 focus:outline-none"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>

            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-white/15 text-xs font-semibold uppercase tracking-wider text-white rounded-lg cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>
        </div>

        {/* High-Density Participant Table */}
        <div className="bg-[#121216] border border-white/10 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-zinc-950 text-zinc-400 font-mono uppercase">
                  <th className="py-3 px-4">Reg ID</th>
                  <th className="py-3 px-4">Full Name</th>
                  <th className="py-3 px-4">Age</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Emergency Contact</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Txn ID</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Check-In</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-10 text-center text-sm text-zinc-400">
                      No participant records match your current filter.
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => (
                    <tr
                      key={r.registrationId}
                      onClick={() => {
                        setSelectedReg(r);
                        setActionMsg(null);
                      }}
                      className="hover:bg-white/[0.03] transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4 font-mono text-white whitespace-nowrap">
                        {r.registrationId}
                      </td>
                      <td className="py-3 px-4 font-medium text-white whitespace-nowrap">
                        {r.fullName}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-zinc-300">{r.age}</td>
                      <td className="py-3 px-4 font-mono tabular-nums text-zinc-300 whitespace-nowrap">
                        {r.phone}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-zinc-400 whitespace-nowrap">
                        {r.emergencyContact}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-right text-white">
                        ₹{r.amountInr}
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-400 whitespace-nowrap">
                        {r.paymentTransactionId || '—'}
                      </td>
                      <td className="py-3 px-4 font-mono whitespace-nowrap text-zinc-300">
                        {r.paymentStatus}
                      </td>
                      <td
                        className={`py-3 px-4 font-mono font-semibold whitespace-nowrap ${
                          r.status === 'CONFIRMED'
                            ? 'text-emerald-400'
                            : r.status === 'PAYMENT FAILED' || r.status === 'CANCELLED'
                              ? 'text-red-400'
                              : 'text-amber-400'
                        }`}
                      >
                        {r.status}
                      </td>
                      <td className="py-3 px-4 font-mono whitespace-nowrap">
                        {r.checkedIn ? (
                          <span className="text-emerald-400">Checked In</span>
                        ) : (
                          <span className="text-zinc-500">Not Yet</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Registration Detail Modal */}
      {selectedReg && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-w-lg w-full bg-[#121216] border border-white/15 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <div className="text-xs font-mono text-red-500">{selectedReg.registrationId}</div>
                <h2 className="font-display text-2xl font-bold uppercase text-white">
                  {selectedReg.fullName}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReg(null)}
                className="p-2 text-zinc-400 hover:text-white cursor-pointer"
                aria-label="Close detail"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <dl className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <dt className="text-zinc-500 uppercase font-mono">Event</dt>
                  <dd className="text-white mt-0.5">{selectedReg.eventTitle}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500 uppercase font-mono">Registered</dt>
                  <dd className="text-zinc-300 mt-0.5">{formatTimestamp(selectedReg.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500 uppercase font-mono">Phone</dt>
                  <dd className="text-white font-mono mt-0.5">{selectedReg.phone}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500 uppercase font-mono">Emergency Contact</dt>
                  <dd className="text-white font-mono mt-0.5">{selectedReg.emergencyContact}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500 uppercase font-mono">Email</dt>
                  <dd className="text-zinc-300 mt-0.5">{selectedReg.email || '—'}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500 uppercase font-mono">Age / Minor</dt>
                  <dd className="text-zinc-300 mt-0.5">
                    {selectedReg.age} ({selectedReg.isMinor ? 'Minor · Guardian OK' : 'Adult'})
                  </dd>
                </div>
                {selectedReg.isMinor && (
                  <div className="col-span-2 p-3 bg-zinc-950 border border-white/10 rounded-lg">
                    <div className="text-zinc-500 uppercase font-mono">Guardian Info</div>
                    <div className="text-white mt-0.5">
                      {selectedReg.guardianName} · {selectedReg.guardianPhone}
                    </div>
                  </div>
                )}
                <div>
                  <dt className="text-zinc-500 uppercase font-mono">Registration Status</dt>
                  <dd className="text-white font-mono mt-0.5">{selectedReg.status}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500 uppercase font-mono">Transaction ID</dt>
                  <dd className="text-white font-mono mt-0.5">
                    {selectedReg.paymentTransactionId || '—'}
                  </dd>
                </div>
              </dl>

              {actionMsg && (
                <div className="p-3 bg-zinc-950 border border-white/10 rounded-lg text-xs text-zinc-200">
                  {actionMsg}
                </div>
              )}

              {role === 'PRIMARY_ADMIN' && selectedReg.status !== 'CANCELLED' && (
                <div className="pt-4 border-t border-white/10 flex justify-end gap-3">
                  <button
                    type="button"
                    disabled={actionBusy}
                    onClick={() => void handleCancelRegistration(selectedReg)}
                    className="px-4 py-2 bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-600/40 text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel Registration
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </HostLayout>
  );
};
