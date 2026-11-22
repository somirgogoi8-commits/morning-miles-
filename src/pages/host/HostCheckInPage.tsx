import React from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Camera, CameraOff, CheckCircle2, QrCode, XCircle } from 'lucide-react';
import { useHostAuth } from '../../context/HostAuthContext';
import { db } from '../../lib/firebase';
import type { BrandingSettings } from '../../types';
import { HostLayout } from '../../components/HostLayout';

interface CheckInOutcome {
  approved: boolean;
  registrationId?: string;
  eventTitle?: string;
  participantName?: string;
  checkedInAt?: string;
  reason?: string;
}

export const HostCheckInPage: React.FC<{ branding: BrandingSettings }> = ({ branding }) => {
  const { user, selectedEventId, getIdToken, refreshPortalData, logAudit } = useHostAuth();

  const [cameraActive, setCameraActive] = React.useState(false);
  const [cameraError, setCameraError] = React.useState<string | null>(null);
  const [manualInput, setManualInput] = React.useState('');
  const [verifying, setVerifying] = React.useState(false);
  const [outcome, setOutcome] = React.useState<CheckInOutcome | null>(null);

  const scannerRef = React.useRef<Html5Qrcode | null>(null);
  const lastScannedRef = React.useRef<{ text: string; at: number }>({ text: '', at: 0 });

  const processScanOrId = React.useCallback(
    async (rawInput: string) => {
      const cleaned = rawInput.trim();
      if (!cleaned || verifying) return;

      // Debounce identical camera frames within 3 seconds
      const now = Date.now();
      if (lastScannedRef.current.text === cleaned && now - lastScannedRef.current.at < 3000) {
        return;
      }
      lastScannedRef.current = { text: cleaned, at: now };

      setVerifying(true);
      try {
        const token = await getIdToken();
        const res = await fetch('/api/admin/check-in', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            qrOrRegistrationId: cleaned,
            expectedEventId: selectedEventId === 'ALL' ? undefined : selectedEventId,
          }),
        });

        const data = (await res.json()) as CheckInOutcome;
        setOutcome(data);

        if (data.approved && data.registrationId) {
          await updateDoc(doc(db, 'registrations', data.registrationId), {
            checkedIn: true,
            checkedInAt: data.checkedInAt || new Date().toISOString(),
            checkedInBy: user?.email || '',
            updatedAt: serverTimestamp(),
          }).catch(() => undefined);

          await logAudit(
            'CHECK_IN_APPROVED',
            'registration',
            data.registrationId,
            `Checked in ${data.participantName || data.registrationId}.`
          ).catch(() => undefined);
          await refreshPortalData();
        }
      } catch {
        setOutcome({
          approved: false,
          reason: 'Network error communicating with check-in verification server.',
        });
      } finally {
        setVerifying(false);
      }
    },
    [verifying, getIdToken, selectedEventId, user, logAudit, refreshPortalData]
  );

  const stopCamera = React.useCallback(async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch {
        // ignore stop errors
      }
      scannerRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const startCamera = async () => {
    setCameraError(null);
    setOutcome(null);
    try {
      const qrScanner = new Html5Qrcode('mmc-qr-reader');
      scannerRef.current = qrScanner;
      await qrScanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => {
          void processScanOrId(decodedText);
        },
        () => undefined
      );
      setCameraActive(true);
    } catch (err) {
      setCameraError(
        err instanceof Error
          ? err.message
          : 'Unable to access camera. Check browser camera permissions or enter Registration ID manually.'
      );
      setCameraActive(false);
    }
  };

  React.useEffect(() => {
    return () => {
      void stopCamera();
    };
  }, [stopCamera]);

  return (
    <HostLayout branding={branding} title="Event-Day QR Check-In">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Scanner Panel */}
        <div className="lg:col-span-6 p-6 bg-[#121216] border border-white/10 rounded-xl space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-bold uppercase text-white">
                Ticket QR Scanner
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Verifies cryptographic ticket signature, payment status, event match, and prevents
                duplicate check-ins.
              </p>
            </div>
            {cameraActive ? (
              <button
                type="button"
                onClick={() => void stopCamera()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold uppercase text-white rounded-lg cursor-pointer"
              >
                <CameraOff className="w-4 h-4" />
                Stop Camera
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void startCamera()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-xs font-semibold uppercase text-white rounded-lg cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                Start Camera
              </button>
            )}
          </div>

          <div
            id="mmc-qr-reader"
            className="w-full min-h-[260px] bg-zinc-950 border border-white/10 rounded-xl overflow-hidden flex items-center justify-center"
          >
            {!cameraActive && (
              <div className="text-center p-6 space-y-2">
                <QrCode className="w-10 h-10 text-zinc-600 mx-auto" />
                <p className="text-xs text-zinc-500">
                  Click &ldquo;Start Camera&rdquo; to scan participant digital tickets.
                </p>
              </div>
            )}
          </div>

          {cameraError && (
            <div className="p-3 bg-red-950/40 border border-red-600/40 rounded-lg text-xs text-red-200">
              {cameraError}
            </div>
          )}

          {/* Manual Registration ID / QR Fallback */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void processScanOrId(manualInput);
            }}
            className="pt-4 border-t border-white/10 flex gap-2"
          >
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="Or enter Registration ID (MMC-MH-...) / QR token"
              className="flex-1 px-4 py-2.5 bg-zinc-950 border border-white/15 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-red-500"
            />
            <button
              type="submit"
              disabled={verifying}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-xs font-semibold uppercase tracking-wider rounded-lg cursor-pointer"
            >
              {verifying ? 'Checking...' : 'Verify'}
            </button>
          </form>
        </div>

        {/* Result Panel */}
        <div className="lg:col-span-6 p-6 bg-[#121216] border border-white/10 rounded-xl space-y-4">
          <h2 className="font-display text-xl font-bold uppercase text-white">
            Verification Result
          </h2>

          {!outcome ? (
            <div className="py-16 text-center text-sm text-zinc-500">
              Scan a participant QR code or enter a Registration ID to verify check-in eligibility.
            </div>
          ) : outcome.approved ? (
            <div className="p-6 bg-emerald-950/40 border border-emerald-500/40 rounded-xl space-y-4">
              <div className="flex items-center gap-3 text-emerald-400">
                <CheckCircle2 className="w-8 h-8 shrink-0" />
                <div>
                  <div className="text-xs font-mono uppercase tracking-widest">
                    Check-In Approved
                  </div>
                  <div className="font-display text-2xl font-bold uppercase text-white">
                    {outcome.participantName}
                  </div>
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-xs pt-3 border-t border-emerald-500/20">
                <div>
                  <dt className="text-zinc-400 font-mono uppercase">Registration ID</dt>
                  <dd className="text-white font-mono mt-0.5">{outcome.registrationId}</dd>
                </div>
                <div>
                  <dt className="text-zinc-400 font-mono uppercase">Event</dt>
                  <dd className="text-white mt-0.5">{outcome.eventTitle}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-zinc-400 font-mono uppercase">Checked-In Timestamp</dt>
                  <dd className="text-emerald-300 font-mono mt-0.5">
                    {outcome.checkedInAt
                      ? new Date(outcome.checkedInAt).toLocaleString('en-IN')
                      : 'Now'}
                  </dd>
                </div>
              </dl>
            </div>
          ) : (
            <div className="p-6 bg-red-950/40 border border-red-600/40 rounded-xl space-y-3">
              <div className="flex items-center gap-3 text-red-400">
                <XCircle className="w-8 h-8 shrink-0" />
                <div>
                  <div className="text-xs font-mono uppercase tracking-widest">
                    Check-In Rejected
                  </div>
                  <div className="font-display text-2xl font-bold uppercase text-white">
                    {outcome.participantName || outcome.registrationId || 'Entry Denied'}
                  </div>
                </div>
              </div>
              <p className="text-sm text-red-200 leading-relaxed pt-2 border-t border-red-600/20">
                {outcome.reason}
              </p>
            </div>
          )}
        </div>
      </div>
    </HostLayout>
  );
};
