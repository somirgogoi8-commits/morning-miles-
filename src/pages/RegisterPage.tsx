import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { doc, getDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { AlertCircle, CheckCircle2, CreditCard, ShieldCheck } from 'lucide-react';
import { OFFICIAL_MANHUNT_RULES, SCRAM_DISCLOSURE } from '../data/rulebook';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import type {
  BrandingSettings,
  IntegrationSettings,
  ManhuntEvent,
  VerifiedTicketData,
} from '../types';
import { ClubLogo } from '../components/ClubLogo';
import { DigitalTicketCard } from '../components/DigitalTicketCard';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (resp: unknown) => void) => void;
    };
  }
}

interface RegisterPageProps {
  events: ManhuntEvent[];
  branding: BrandingSettings;
}

async function computePhoneLockId(eventId: string, phone: string): Promise<string> {
  const digits = phone.replace(/\D/g, '').slice(-10);
  const input = new TextEncoder().encode(`${eventId}:${digits}`);
  const hashBuf = await window.crypto.subtle.digest('SHA-256', input);
  const hashArr = Array.from(new Uint8Array(hashBuf));
  const hex = hashArr.map((b) => b.toString(16).padStart(2, '0')).join('');
  return `lock_${eventId}_${hex.slice(0, 24)}`;
}

function generateRegistrationId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(6);
  window.crypto.getRandomValues(bytes);
  let suffix = '';
  for (let i = 0; i < bytes.length; i += 1) {
    suffix += chars[bytes[i] % chars.length];
  }
  return `MMC-MH-${suffix}`;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ events, branding }) => {
  const [searchParams] = useSearchParams();
  const initialEventId = searchParams.get('event') || '';
  const preAcceptedRules = searchParams.get('rulesAccepted') === '1';

  const openEvents = React.useMemo(
    () => events.filter((e) => e.registrationOpen && e.capacity > (e.confirmedCount || 0)),
    [events]
  );

  const [selectedEventId, setSelectedEventId] = React.useState(initialEventId);
  const [mode, setMode] = React.useState<'native' | 'google_form'>('native');
  const [integrations, setIntegrations] = React.useState<IntegrationSettings | null>(null);

  // Form Fields
  const [fullName, setFullName] = React.useState('');
  const [age, setAge] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [emergencyContact, setEmergencyContact] = React.useState('');
  const [guardianName, setGuardianName] = React.useState('');
  const [guardianPhone, setGuardianPhone] = React.useState('');
  const [guardianPermission, setGuardianPermission] = React.useState(false);
  const [rulesAccepted, setRulesAccepted] = React.useState(preAcceptedRules);
  const [conditionsAccepted, setConditionsAccepted] = React.useState(false);
  const [showRulebookDrawer, setShowRulebookDrawer] = React.useState(false);

  // Flow & Payment State
  const [submitting, setSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [pendingReg, setPendingReg] = React.useState<{
    registrationId: string;
    event: ManhuntEvent;
    fullName: string;
    phone: string;
    email: string;
    status: string;
  } | null>(null);
  const [paymentMessage, setPaymentMessage] = React.useState<string | null>(null);
  const [gatewayConfigured, setGatewayConfigured] = React.useState<boolean | null>(null);
  const [verifiedTicket, setVerifiedTicket] = React.useState<VerifiedTicketData | null>(null);

  React.useEffect(() => {
    if (!selectedEventId && openEvents.length > 0) {
      setSelectedEventId(openEvents[0].id);
    }
  }, [openEvents, selectedEventId]);

  React.useEffect(() => {
    fetch('/api/payments/config-status')
      .then((r) => r.json())
      .then((data: { configured?: boolean }) => setGatewayConfigured(Boolean(data.configured)))
      .catch(() => setGatewayConfigured(false));

    getDoc(doc(db, 'siteSettings', 'integrations'))
      .then((snap) => {
        if (snap.exists()) setIntegrations(snap.data() as IntegrationSettings);
      })
      .catch(() => undefined);
  }, []);

  const selectedEvent = React.useMemo(
    () => openEvents.find((e) => e.id === selectedEventId) || openEvents[0] || null,
    [openEvents, selectedEventId]
  );

  const numericAge = Number(age);
  const isMinor = Number.isFinite(numericAge) && numericAge > 0 && numericAge < 18;

  const initiateGatewayPayment = async (reg: {
    registrationId: string;
    event: ManhuntEvent;
    fullName: string;
    phone: string;
    email: string;
  }) => {
    setErrorMsg(null);
    setPaymentMessage('Creating verified payment order...');
    try {
      const orderRes = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrationId: reg.registrationId,
          eventId: reg.event.id,
          eventTitle: reg.event.title,
          eventDate: reg.event.dateISO,
          meetingPoint: reg.event.meetingPoint,
          participantName: reg.fullName,
          amountInr: reg.event.entryFeeInr,
          phone: reg.phone,
        }),
      });

      const orderData = (await orderRes.json()) as {
        configured?: boolean;
        orderId?: string;
        amountPaise?: number;
        currency?: string;
        keyId?: string;
        receiptAccessToken?: string;
        error?: string;
      };

      if (!orderRes.ok || !orderData.orderId || !orderData.keyId) {
        setPaymentMessage(null);
        setErrorMsg(
          orderData.error ||
            'Payment gateway is not yet configured on the server. Registration remains PENDING PAYMENT.'
        );
        return;
      }

      if (!window.Razorpay) {
        setPaymentMessage(null);
        setErrorMsg(
          'Razorpay checkout script could not load. Please disable ad blockers and retry.'
        );
        return;
      }

      setPaymentMessage('Opening Razorpay UPI / Card checkout...');

      const rzp = new window.Razorpay({
        key: orderData.keyId,
        amount: orderData.amountPaise,
        currency: orderData.currency || 'INR',
        name: 'Morning Miles Club',
        description: `${reg.event.title} (${reg.registrationId})`,
        order_id: orderData.orderId,
        prefill: {
          name: reg.fullName,
          contact: reg.phone,
          email: reg.email || undefined,
        },
        theme: { color: '#DC2626' },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          setPaymentMessage('Verifying payment independently with server...');
          try {
            const verifyRes = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                registrationId: reg.registrationId,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyData = (await verifyRes.json()) as {
              verified?: boolean;
              registrationStatus?: string;
              qrPayload?: string;
              gatewayPaymentId?: string;
              error?: string;
            };

            if (!verifyRes.ok || !verifyData.verified) {
              setPaymentMessage(null);
              setErrorMsg(
                verifyData.error ||
                  'Payment could not be independently verified yet. Check My Ticket shortly or contact organisers.'
              );
              return;
            }

            setPaymentMessage(null);
            setVerifiedTicket({
              registrationId: reg.registrationId,
              eventId: reg.event.id,
              eventTitle: reg.event.title,
              eventDate: reg.event.dateISO,
              meetingPoint: reg.event.meetingPoint,
              participantName: reg.fullName,
              amountInr: reg.event.entryFeeInr,
              paymentStatus: 'VERIFIED',
              registrationStatus: 'CONFIRMED',
              gatewayPaymentId: verifyData.gatewayPaymentId,
              qrPayload: verifyData.qrPayload || null,
              checkedIn: false,
            });
          } catch {
            setPaymentMessage(null);
            setErrorMsg('Network error during server-side payment verification.');
          }
        },
        modal: {
          ondismiss: () => {
            setPaymentMessage(
              'Checkout closed before completion. Your registration stays PENDING PAYMENT.'
            );
          },
        },
      });

      rzp.on('payment.failed', () => {
        setPaymentMessage(null);
        setErrorMsg('Payment failed at gateway. You may retry payment below.');
      });

      rzp.open();
    } catch {
      setPaymentMessage(null);
      setErrorMsg('Unable to connect to payment order service.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!selectedEvent) {
      setErrorMsg('Please select an open Manhunt event.');
      return;
    }

    const cleanName = fullName.trim();
    const cleanPhone = phone.trim();
    const cleanEmergency = emergencyContact.trim();
    const cleanEmail = email.trim();
    const ageNum = Number(age);

    if (cleanName.length < 2 || cleanName.length > 100) {
      setErrorMsg('Please enter your full name (2–100 characters).');
      return;
    }
    if (!Number.isFinite(ageNum) || ageNum < 8 || ageNum > 99) {
      setErrorMsg('Please enter a valid age (8–99).');
      return;
    }
    if (cleanPhone.replace(/\D/g, '').length < 10 || cleanPhone.length > 20) {
      setErrorMsg('Please enter a valid 10-digit phone number.');
      return;
    }
    if (cleanEmergency.replace(/\D/g, '').length < 10 || cleanEmergency.length > 20) {
      setErrorMsg('Please enter a valid emergency contact number.');
      return;
    }
    if (cleanEmergency.replace(/\D/g, '').slice(-10) === cleanPhone.replace(/\D/g, '').slice(-10)) {
      setErrorMsg('Emergency contact number must be different from your own phone number.');
      return;
    }
    if (ageNum < 18 && (!guardianName.trim() || !guardianPhone.trim() || !guardianPermission)) {
      setErrorMsg('Participants under 18 require parent/guardian details and permission.');
      return;
    }
    if (!rulesAccepted || !conditionsAccepted) {
      setErrorMsg('You must accept the 14 Manhunt rules and participation conditions to proceed.');
      return;
    }

    setSubmitting(true);
    try {
      const phoneLockId = await computePhoneLockId(selectedEvent.id, cleanPhone);
      const lockRef = doc(db, 'registrationLocks', phoneLockId);
      const existingLock = await getDoc(lockRef).catch((err) =>
        handleFirestoreError(err, OperationType.GET, `registrationLocks/${phoneLockId}`)
      );

      if (existingLock.exists()) {
        setErrorMsg(
          'A registration with this phone number already exists for this event. Use My Ticket to view your pass.'
        );
        setSubmitting(false);
        return;
      }

      const registrationId = generateRegistrationId();
      const batch = writeBatch(db);

      const regDoc: Record<string, unknown> = {
        registrationId,
        eventId: selectedEvent.id,
        eventTitle: selectedEvent.title,
        fullName: cleanName,
        age: ageNum,
        phone: cleanPhone,
        emergencyContact: cleanEmergency,
        isMinor: ageNum < 18,
        guardianPermission: ageNum < 18 ? guardianPermission : false,
        rulesAccepted: true,
        conditionsAccepted: true,
        status: 'PENDING PAYMENT',
        paymentStatus: 'PENDING',
        amountInr: selectedEvent.entryFeeInr,
        checkedIn: false,
        phoneLockId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (cleanEmail) {
        regDoc.email = cleanEmail;
      }
      if (ageNum < 18) {
        regDoc.guardianName = guardianName.trim();
        regDoc.guardianPhone = guardianPhone.trim();
      }

      batch.set(doc(db, 'registrations', registrationId), regDoc);
      batch.set(lockRef, {
        lockId: phoneLockId,
        eventId: selectedEvent.id,
        registrationId,
        createdAt: serverTimestamp(),
      });

      await batch
        .commit()
        .catch((err) =>
          handleFirestoreError(err, OperationType.WRITE, `registrations/${registrationId}`)
        );

      const regInfo = {
        registrationId,
        event: selectedEvent,
        fullName: cleanName,
        phone: cleanPhone,
        email: cleanEmail,
        status: 'PENDING PAYMENT',
      };
      setPendingReg(regInfo);

      if (selectedEvent.entryFeeInr > 0) {
        await initiateGatewayPayment(regInfo);
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Registration failed. Please check your details.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (verifiedTicket) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-8">
        <div className="p-6 bg-emerald-950/30 border border-emerald-500/30 rounded-xl flex items-start gap-4">
          <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h1 className="font-display text-2xl font-bold uppercase text-white">
              Registration & Payment Confirmed
            </h1>
            <p className="text-sm text-zinc-300">
              Your entry for <strong>{verifiedTicket.eventTitle}</strong> has been verified. Save
              or download your digital ticket below for event-day QR check-in.
            </p>
          </div>
        </div>

        <DigitalTicketCard ticket={verifiedTicket} branding={branding} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-8">
        <div className="space-y-2">
          <p className="text-xs font-mono uppercase tracking-widest text-red-500">
            Official Participant Entry
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-bold uppercase tracking-tight text-white">
            Manhunt Registration
          </h1>
          <p className="text-sm text-zinc-400 max-w-2xl">
            Complete your registration and verify payment in INR to receive your official Morning
            Miles Club digital ticket.
          </p>
        </div>
        <ClubLogo logoUrl={branding.logoUrl} size="md" showWordmark={false} />
      </div>

      {integrations?.googleFormEmbedUrl && (
        <div className="inline-flex items-center gap-1.5 p-1 bg-[#121216] border border-white/10 rounded-lg">
          <button
            type="button"
            onClick={() => setMode('native')}
            className={`px-4 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              mode === 'native' ? 'bg-red-600 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Website Registration & UPI Payment
          </button>
          <button
            type="button"
            onClick={() => setMode('google_form')}
            className={`px-4 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              mode === 'google_form' ? 'bg-red-600 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Google Form Entry
          </button>
        </div>
      )}

      {mode === 'google_form' && integrations?.googleFormEmbedUrl ? (
        <div className="bg-[#121216] border border-white/10 rounded-xl p-6 space-y-4">
          <div className="p-4 bg-amber-950/30 border border-amber-500/30 rounded-lg text-xs text-amber-200 leading-relaxed">
            Important: Submitting a Google Form does not verify or confirm payment. Your registration
            is confirmed only after independent INR payment verification through the official payment
            gateway.
          </div>
          <iframe
            src={integrations.googleFormEmbedUrl}
            title="Morning Miles Club Registration Form"
            className="w-full h-[760px] rounded-lg bg-white"
          />
        </div>
      ) : openEvents.length === 0 ? (
        <div className="bg-[#121216] border border-white/10 rounded-xl p-10 text-center space-y-3">
          <h2 className="font-display text-2xl font-bold uppercase text-white">
            Registrations Currently Closed
          </h2>
          <p className="text-sm text-zinc-400 max-w-md mx-auto">
            There are no open published Manhunt events right now. Please check back or follow{' '}
            <Link to="/events" className="text-red-400 underline">
              Upcoming Events
            </Link>
            .
          </p>
        </div>
      ) : pendingReg ? (
        <div className="bg-[#121216] border border-white/15 rounded-xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-white/10">
            <ClubLogo logoUrl={branding.logoUrl} size="sm" />
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-amber-400">
              Status: {pendingReg.status}
            </span>
          </div>

          <div className="space-y-2">
            <h2 className="font-display text-2xl font-bold uppercase text-white">
              Registration Saved · Complete INR Payment
            </h2>
            <p className="text-sm text-zinc-300">
              Registration ID:{' '}
              <span className="font-mono font-bold text-white">{pendingReg.registrationId}</span> ·
              Participant: <span className="text-white">{pendingReg.fullName}</span>
            </p>
            <p className="text-xs text-zinc-400">
              Entry Fee:{' '}
              <span className="font-mono text-white font-semibold">
                ₹{pendingReg.event.entryFeeInr} INR
              </span>
            </p>
          </div>

          {paymentMessage && (
            <div className="p-4 bg-zinc-950 border border-white/10 rounded-lg text-xs text-zinc-200">
              {paymentMessage}
            </div>
          )}

          {errorMsg && (
            <div className="p-4 bg-red-950/40 border border-red-600/40 rounded-lg flex items-start gap-3 text-xs text-red-200">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p>{errorMsg}</p>
                {gatewayConfigured === false && (
                  <p className="text-zinc-400">
                    Organiser configuration required: set <code>RAZORPAY_KEY_ID</code>,{' '}
                    <code>RAZORPAY_KEY_SECRET</code>, and <code>RAZORPAY_WEBHOOK_SECRET</code> in
                    server environment secrets to process live/test UPI payments.
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => void initiateGatewayPayment(pendingReg)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
            >
              <CreditCard className="w-4 h-4" />
              Pay ₹{pendingReg.event.entryFeeInr} via UPI / Razorpay
            </button>
            <Link
              to={`/ticket?id=${encodeURIComponent(pendingReg.registrationId)}`}
              className="px-5 py-3 border border-white/15 hover:bg-white/5 text-zinc-200 text-xs font-medium rounded-lg"
            >
              Check Ticket Status Later
            </Link>
          </div>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="bg-[#121216] border border-white/10 rounded-xl p-6 sm:p-8 space-y-8"
        >
          {/* Event Selection */}
          <div className="space-y-3">
            <label
              htmlFor="event-select"
              className="block text-xs font-mono uppercase tracking-wider text-zinc-400"
            >
              Select Manhunt Event
            </label>
            <select
              id="event-select"
              value={selectedEvent?.id || ''}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-950 border border-white/15 rounded-lg text-sm text-white focus:outline-none focus:border-red-500"
            >
              {openEvents.map((ev) => {
                const left = Math.max(0, ev.capacity - (ev.confirmedCount || 0));
                return (
                  <option key={ev.id} value={ev.id}>
                    {ev.title} · {ev.dateISO} · ₹{ev.entryFeeInr} ({left} spots left)
                  </option>
                );
              })}
            </select>

            {selectedEvent && (
              <div className="p-4 bg-zinc-950 border border-white/10 rounded-lg text-xs text-zinc-300 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-zinc-500">Meeting Point:</span>{' '}
                  <span className="text-white">{selectedEvent.meetingPoint}</span>
                </div>
                <div className="font-mono text-white font-semibold">
                  Entry Fee: ₹{selectedEvent.entryFeeInr} INR
                </div>
              </div>
            )}
          </div>

          {/* Participant Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <label
                htmlFor="fullName"
                className="block text-xs font-medium text-zinc-300 mb-1.5"
              >
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                id="fullName"
                type="text"
                required
                maxLength={100}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter participant full name"
                className="w-full px-4 py-3 bg-zinc-950 border border-white/15 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label htmlFor="age" className="block text-xs font-medium text-zinc-300 mb-1.5">
                Age <span className="text-red-500">*</span>
              </label>
              <input
                id="age"
                type="number"
                required
                min={8}
                max={99}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="e.g. 22"
                className="w-full px-4 py-3 bg-zinc-950 border border-white/15 rounded-lg text-sm text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-xs font-medium text-zinc-300 mb-1.5">
                Phone Number (WhatsApp / Call) <span className="text-red-500">*</span>
              </label>
              <input
                id="phone"
                type="tel"
                required
                maxLength={20}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-4 py-3 bg-zinc-950 border border-white/15 rounded-lg text-sm text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-medium text-zinc-300 mb-1.5">
                Email Address (Optional)
              </label>
              <input
                id="email"
                type="email"
                maxLength={160}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="participant@example.com"
                className="w-full px-4 py-3 bg-zinc-950 border border-white/15 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label
                htmlFor="emergencyContact"
                className="block text-xs font-medium text-zinc-300 mb-1.5"
              >
                Emergency Contact Number <span className="text-red-500">*</span>
              </label>
              <input
                id="emergencyContact"
                type="tel"
                required
                maxLength={20}
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                placeholder="Parent / Family / Friend number"
                className="w-full px-4 py-3 bg-zinc-950 border border-white/15 rounded-lg text-sm text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-red-500"
              />
              <p className="mt-1 text-[11px] text-zinc-500">
                Kept strictly confidential and visible only to authorised event organisers.
              </p>
            </div>
          </div>

          {/* Under-18 Guardian Section */}
          {isMinor && (
            <div className="p-5 bg-zinc-950 border border-amber-500/30 rounded-xl space-y-4">
              <p className="text-xs font-mono uppercase tracking-wider text-amber-400">
                Rule 10 · Parent / Guardian Permission Required (Under 18)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="guardianName"
                    className="block text-xs font-medium text-zinc-300 mb-1.5"
                  >
                    Parent / Guardian Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="guardianName"
                    type="text"
                    required
                    maxLength={100}
                    value={guardianName}
                    onChange={(e) => setGuardianName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#121216] border border-white/15 rounded-lg text-sm text-white focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="guardianPhone"
                    className="block text-xs font-medium text-zinc-300 mb-1.5"
                  >
                    Parent / Guardian Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="guardianPhone"
                    type="tel"
                    required
                    maxLength={20}
                    value={guardianPhone}
                    onChange={(e) => setGuardianPhone(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#121216] border border-white/15 rounded-lg text-sm text-white font-mono focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>
              <label className="flex items-start gap-3 cursor-pointer text-xs text-zinc-200">
                <input
                  type="checkbox"
                  checked={guardianPermission}
                  onChange={(e) => setGuardianPermission(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-zinc-600 bg-zinc-900 text-red-600 cursor-pointer"
                />
                <span>
                  I confirm that my parent or legal guardian has granted full permission for me to
                  participate in this Morning Miles Club Manhunt event.
                </span>
              </label>
            </div>
          )}

          {/* Mandatory Rulebook & Conditions */}
          <div className="space-y-4 pt-4 border-t border-white/10">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-red-500">
                <ShieldCheck className="w-4 h-4" />
                <span>Mandatory Rulebook & Participation Agreement</span>
              </div>
              <button
                type="button"
                onClick={() => setShowRulebookDrawer((v) => !v)}
                className="text-xs text-zinc-300 hover:text-white underline cursor-pointer"
              >
                {showRulebookDrawer ? 'Hide 14 Official Rules' : 'Preview All 14 Official Rules'}
              </button>
            </div>

            {showRulebookDrawer && (
              <div className="max-h-64 overflow-y-auto p-4 bg-zinc-950 border border-white/10 rounded-lg space-y-2.5 text-xs">
                {OFFICIAL_MANHUNT_RULES.map((r) => (
                  <div key={r.number}>
                    <span className="font-mono font-semibold text-red-400">
                      RULE {r.number} – {r.title}:
                    </span>{' '}
                    <span className="text-zinc-300">{r.description}</span>
                  </div>
                ))}
              </div>
            )}

            <label className="flex items-start gap-3 cursor-pointer text-sm text-zinc-200">
              <input
                type="checkbox"
                checked={rulesAccepted}
                onChange={(e) => setRulesAccepted(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-zinc-600 bg-zinc-900 text-red-600 cursor-pointer"
              />
              <span>
                I have read and accepted all 14 rules in the{' '}
                <Link to="/rules" target="_blank" className="text-red-400 underline">
                  Official Manhunt Rulebook
                </Link>{' '}
                (no entering residences, no shops/hotels, no trespassing, stay in boundaries, no
                physical contact).
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer text-sm text-zinc-200">
              <input
                type="checkbox"
                checked={conditionsAccepted}
                onChange={(e) => setConditionsAccepted(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-zinc-600 bg-zinc-900 text-red-600 cursor-pointer"
              />
              <span>
                I understand that {SCRAM_DISCLOSURE} I agree to follow all organiser safety
                instructions and participate responsibly.
              </span>
            </label>
          </div>

          {errorMsg && (
            <div className="p-4 bg-red-950/40 border border-red-600/40 rounded-lg flex items-start gap-3 text-xs text-red-200">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="pt-2 flex flex-wrap items-center justify-between gap-4">
            <p className="text-xs text-zinc-500">
              Your registration is only marked CONFIRMED after independent payment verification.
            </p>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
            >
              {submitting
                ? 'Saving Registration...'
                : `Submit & Pay ₹${selectedEvent?.entryFeeInr ?? 0}`}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
