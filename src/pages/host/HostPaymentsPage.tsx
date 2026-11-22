import React from 'react';
import { doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { useHostAuth } from '../../context/HostAuthContext';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import type { BrandingSettings } from '../../types';
import { HostLayout } from '../../components/HostLayout';

export const HostPaymentsPage: React.FC<{ branding: BrandingSettings }> = ({ branding }) => {
  const {
    role,
    registrations,
    payments,
    serverOrders,
    selectedEventId,
    getIdToken,
    refreshPortalData,
    logAudit,
  } = useHostAuth();

  const [reconRegId, setReconRegId] = React.useState('');
  const [reconTxnId, setReconTxnId] = React.useState('');
  const [reconNote, setReconNote] = React.useState('');
  const [reconBusy, setReconBusy] = React.useState(false);
  const [reconFeedback, setReconFeedback] = React.useState<string | null>(null);

  const scopedOrders = React.useMemo(() => {
    const serverByReg = new Map(serverOrders.map((o) => [o.registrationId, o]));
    // Combine server ledger orders + Firestore payments
    const list = serverOrders
      .filter((o) => selectedEventId === 'ALL' || o.eventId === selectedEventId)
      .map((o) => ({
        registrationId: o.registrationId,
        orderId: o.orderId,
        gatewayPaymentId: o.gatewayPaymentId || '—',
        participantName: o.participantName,
        eventTitle: o.eventTitle,
        amountInr: o.amountInr,
        status: o.status,
        method: o.method || 'upi',
        verifiedByWebhook: o.verifiedByWebhook,
        reconciliationNote: o.reconciliationNote,
        date: o.updatedAt,
      }));

    for (const p of payments) {
      if (selectedEventId !== 'ALL' && p.eventId !== selectedEventId) continue;
      if (!serverByReg.has(p.registrationId)) {
        list.push({
          registrationId: p.registrationId,
          orderId: p.orderId,
          gatewayPaymentId: p.gatewayPaymentId || '—',
          participantName: p.participantName,
          eventTitle: p.eventId,
          amountInr: p.amountInr,
          status: p.status,
          method: p.method || 'upi',
          verifiedByWebhook: p.verifiedByWebhook,
          reconciliationNote: p.reconciliationNote || '',
          date: '',
        });
      }
    }
    return list;
  }, [serverOrders, payments, selectedEventId]);

  const summary = React.useMemo(() => {
    const successful = scopedOrders.filter(
      (o) => o.status === 'VERIFIED' || o.status === 'RECONCILED'
    );
    const pending = scopedOrders.filter(
      (o) => o.status === 'CREATED' || o.status === 'PROCESSING'
    );
    const failed = scopedOrders.filter((o) => o.status === 'FAILED');
    const revenue = successful.reduce((acc, o) => acc + (o.amountInr || 0), 0);
    return {
      successfulCount: successful.length,
      pendingCount: pending.length,
      failedCount: failed.length,
      revenue,
    };
  }, [scopedOrders]);

  const handleReconcile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role !== 'PRIMARY_ADMIN') return;
    setReconFeedback(null);
    const reg = registrations.find(
      (r) => r.registrationId.toUpperCase() === reconRegId.trim().toUpperCase()
    );
    if (!reg) {
      setReconFeedback('Registration ID not found in Firestore.');
      return;
    }
    if (reconTxnId.trim().length < 4 || reconNote.trim().length < 5) {
      setReconFeedback(
        'Enter the verified Gateway Transaction ID and a detailed reconciliation note.'
      );
      return;
    }

    setReconBusy(true);
    try {
      const token = await getIdToken();
      const res = await fetch('/api/admin/payments/reconcile', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          registrationId: reg.registrationId,
          eventId: reg.eventId,
          eventTitle: reg.eventTitle,
          eventDate: '',
          meetingPoint: '',
          participantName: reg.fullName,
          phoneLast4: reg.phone.replace(/\D/g, '').slice(-4),
          amountInr: reg.amountInr,
          gatewayPaymentId: reconTxnId.trim(),
          reconciliationNote: reconNote.trim(),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setReconFeedback(data.error || 'Reconciliation failed.');
        return;
      }

      await updateDoc(doc(db, 'registrations', reg.registrationId), {
        status: 'CONFIRMED',
        paymentStatus: 'RECONCILED',
        paymentTransactionId: reconTxnId.trim(),
        updatedAt: serverTimestamp(),
      }).catch((err) =>
        handleFirestoreError(err, OperationType.UPDATE, `registrations/${reg.registrationId}`)
      );

      const payId = `pay_${reg.registrationId}`;
      await setDoc(doc(db, 'payments', payId), {
        paymentId: payId,
        orderId: reg.paymentOrderId || `RECON_${reg.registrationId}`,
        registrationId: reg.registrationId,
        eventId: reg.eventId,
        participantName: reg.fullName,
        amountInr: reg.amountInr,
        currency: 'INR',
        status: 'RECONCILED',
        method: 'reconciled',
        gatewayPaymentId: reconTxnId.trim(),
        verifiedByWebhook: false,
        reconciliationNote: reconNote.trim(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }).catch((err) => handleFirestoreError(err, OperationType.WRITE, `payments/${payId}`));

      await logAudit(
        'RECONCILE_PAYMENT',
        'payment',
        reg.registrationId,
        `Reconciled gateway txn ${reconTxnId.trim()}: ${reconNote.trim()}`
      );

      setReconFeedback(
        `Reconciled ${reg.registrationId} with transaction ${reconTxnId.trim()} and issued QR ticket.`
      );
      setReconRegId('');
      setReconTxnId('');
      setReconNote('');
      await refreshPortalData();
    } finally {
      setReconBusy(false);
    }
  };

  return (
    <HostLayout branding={branding} title="Payment Management">
      <div className="space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 bg-[#121216] border border-white/10 rounded-xl">
            <div className="text-xs font-mono uppercase text-zinc-400">Successful Payments</div>
            <div className="mt-2 font-mono text-3xl font-bold text-emerald-400 tabular-nums">
              {summary.successfulCount}
            </div>
          </div>
          <div className="p-5 bg-[#121216] border border-white/10 rounded-xl">
            <div className="text-xs font-mono uppercase text-zinc-400">Pending Payments</div>
            <div className="mt-2 font-mono text-3xl font-bold text-amber-400 tabular-nums">
              {summary.pendingCount}
            </div>
          </div>
          <div className="p-5 bg-[#121216] border border-white/10 rounded-xl">
            <div className="text-xs font-mono uppercase text-zinc-400">Failed Payments</div>
            <div className="mt-2 font-mono text-3xl font-bold text-red-400 tabular-nums">
              {summary.failedCount}
            </div>
          </div>
          <div className="p-5 bg-[#121216] border border-white/10 rounded-xl">
            <div className="text-xs font-mono uppercase text-zinc-400">Collected Revenue</div>
            <div className="mt-2 font-mono text-3xl font-bold text-white tabular-nums">
              ₹{summary.revenue.toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        {/* Transaction Records */}
        <div className="bg-[#121216] border border-white/10 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-xl font-bold uppercase text-white">
              Transaction Ledger
            </h2>
            <span className="text-xs text-zinc-400">
              Updated automatically via verified payment webhooks & server API
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-zinc-950 text-zinc-400 font-mono uppercase">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Transaction ID</th>
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">Reg ID</th>
                  <th className="py-3 px-4">Participant</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {scopedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-sm text-zinc-400">
                      No gateway transactions recorded yet.
                    </td>
                  </tr>
                ) : (
                  scopedOrders.map((o) => (
                    <tr key={`${o.registrationId}-${o.orderId}`} className="hover:bg-white/[0.02]">
                      <td className="py-3 px-4 font-mono text-zinc-400 whitespace-nowrap">
                        {o.date ? new Date(o.date).toLocaleString('en-IN') : '—'}
                      </td>
                      <td className="py-3 px-4 font-mono text-white whitespace-nowrap">
                        {o.gatewayPaymentId}
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-400 whitespace-nowrap">
                        {o.orderId}
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-200 whitespace-nowrap">
                        {o.registrationId}
                      </td>
                      <td className="py-3 px-4 text-white whitespace-nowrap">{o.participantName}</td>
                      <td className="py-3 px-4 font-mono tabular-nums text-right text-white">
                        ₹{o.amountInr}
                      </td>
                      <td
                        className={`py-3 px-4 font-mono font-semibold whitespace-nowrap ${
                          o.status === 'VERIFIED' || o.status === 'RECONCILED'
                            ? 'text-emerald-400'
                            : o.status === 'FAILED'
                              ? 'text-red-400'
                              : 'text-amber-400'
                        }`}
                      >
                        {o.status}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Authorised Primary Admin Reconciliation */}
        {role === 'PRIMARY_ADMIN' && (
          <form
            onSubmit={handleReconcile}
            className="p-6 bg-[#121216] border border-white/10 rounded-xl space-y-4"
          >
            <div>
              <h2 className="font-display text-xl font-bold uppercase text-white">
                Authorised Payment Reconciliation
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Primary Administrators can reconcile a confirmed gateway settlement only with an
                official Gateway Transaction ID and a permanent audit log note.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <input
                type="text"
                required
                value={reconRegId}
                onChange={(e) => setReconRegId(e.target.value)}
                placeholder="Registration ID (MMC-MH-...)"
                className="px-4 py-2.5 bg-zinc-950 border border-white/15 rounded-lg text-sm font-mono text-white focus:outline-none focus:border-red-500"
              />
              <input
                type="text"
                required
                value={reconTxnId}
                onChange={(e) => setReconTxnId(e.target.value)}
                placeholder="Verified Razorpay Payment ID"
                className="px-4 py-2.5 bg-zinc-950 border border-white/15 rounded-lg text-sm font-mono text-white focus:outline-none focus:border-red-500"
              />
              <input
                type="text"
                required
                value={reconNote}
                onChange={(e) => setReconNote(e.target.value)}
                placeholder="Audit reason (e.g. Verified in Razorpay Dashboard)"
                className="px-4 py-2.5 bg-zinc-950 border border-white/15 rounded-lg text-sm text-white focus:outline-none focus:border-red-500"
              />
            </div>
            {reconFeedback && (
              <div className="p-3 bg-zinc-950 border border-white/10 rounded-lg text-xs text-zinc-200">
                {reconFeedback}
              </div>
            )}
            <button
              type="submit"
              disabled={reconBusy}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-xs font-semibold uppercase tracking-wider rounded-lg cursor-pointer"
            >
              {reconBusy ? 'Recording Audit...' : 'Record Reconciled Payment'}
            </button>
          </form>
        )}
      </div>
    </HostLayout>
  );
};
