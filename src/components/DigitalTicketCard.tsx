import React from 'react';
import QRCode from 'qrcode';
import { Download } from 'lucide-react';
import { SCRAM_DISCLOSURE } from '../data/rulebook';
import type { BrandingSettings, VerifiedTicketData } from '../types';
import { ClubLogo } from './ClubLogo';

interface DigitalTicketCardProps {
  ticket: VerifiedTicketData;
  branding: BrandingSettings;
}

export const DigitalTicketCard: React.FC<DigitalTicketCardProps> = ({ ticket, branding }) => {
  const [qrDataUrl, setQrDataUrl] = React.useState<string>('');
  const [downloading, setDownloading] = React.useState(false);

  const qrContent = ticket.qrPayload || '';

  React.useEffect(() => {
    if (!qrContent) {
      setQrDataUrl('');
      return;
    }
    void QRCode.toDataURL(qrContent, {
      width: 320,
      margin: 2,
      color: {
        dark: '#09090B',
        light: '#FFFFFF',
      },
    }).then(setQrDataUrl);
  }, [qrContent]);

  const handleDownloadTicket = async () => {
    if (!qrDataUrl) return;
    setDownloading(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 960;
      canvas.height = 540;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Dark obsidian ticket surface
      ctx.fillStyle = '#09090B';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Subtle inner frame
      ctx.strokeStyle = '#27272A';
      ctx.lineWidth = 2;
      ctx.strokeRect(24, 24, canvas.width - 48, canvas.height - 48);

      // Top crimson accent bar
      ctx.fillStyle = '#DC2626';
      ctx.fillRect(24, 24, canvas.width - 48, 8);

      // Optional official uploaded logo
      if (branding.logoUrl) {
        try {
          const logoImg = new Image();
          logoImg.crossOrigin = 'anonymous';
          await new Promise<void>((resolve, reject) => {
            logoImg.onload = () => resolve();
            logoImg.onerror = () => reject(new Error('logo load failed'));
            logoImg.src = branding.logoUrl || '';
          });
          ctx.drawImage(logoImg, 56, 56, 56, 56);
        } catch {
          // Proceed without logo image if CORS blocked
        }
      }

      const textStartX = branding.logoUrl ? 128 : 56;
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText('MORNING MILES CLUB', textStartX, 82);

      ctx.fillStyle = '#EF4444';
      ctx.font = 'bold 14px monospace';
      ctx.fillText('OFFICIAL MANHUNT DIGITAL ENTRY TICKET', textStartX, 108);

      // Event Title
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 34px sans-serif';
      ctx.fillText(ticket.eventTitle.toUpperCase().slice(0, 32), 56, 178);

      // Metadata rows
      const rows = [
        ['PARTICIPANT', ticket.participantName],
        ['REGISTRATION ID', ticket.registrationId],
        ['EVENT DATE', ticket.eventDate || 'See Event Schedule'],
        ['MEETING POINT', ticket.meetingPoint || 'Golaghat'],
        ['PAYMENT STATUS', `${ticket.registrationStatus} (INR ${ticket.amountInr})`],
      ];

      let y = 235;
      for (const [label, val] of rows) {
        ctx.fillStyle = '#A1A1AA';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(label, 56, y);
        ctx.fillStyle = '#FAFAFA';
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText(String(val).slice(0, 38), 56, y + 24);
        y += 58;
      }

      // QR Box on right
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(632, 130, 268, 268);
      const qrImg = new Image();
      await new Promise<void>((resolve) => {
        qrImg.onload = () => resolve();
        qrImg.src = qrDataUrl;
      });
      ctx.drawImage(qrImg, 646, 144, 240, 240);

      ctx.fillStyle = '#A1A1AA';
      ctx.font = '12px monospace';
      ctx.fillText('SCAN AT EVENT CHECK-IN', 682, 424);

      ctx.fillStyle = '#71717A';
      ctx.font = '12px sans-serif';
      ctx.fillText('SCRAM game code will be provided by organisers on event day.', 56, 494);

      const link = document.createElement('a');
      link.download = `${ticket.registrationId}-MorningMilesClub-Ticket.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      setDownloading(false);
    }
  };

  const isConfirmed = ticket.registrationStatus === 'CONFIRMED' && Boolean(qrDataUrl);

  return (
    <div className="bg-[#121216] border border-white/15 rounded-xl overflow-hidden">
      <div className="h-1.5 bg-red-600" />
      <div className="p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/10">
          <ClubLogo logoUrl={branding.logoUrl} size="md" />
          <div className="text-right">
            <div className="text-xs font-mono uppercase tracking-widest text-zinc-400">
              Payment Status
            </div>
            <div
              className={`mt-1 text-sm font-mono font-semibold ${
                isConfirmed ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {ticket.registrationStatus} · ₹{ticket.amountInr}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          <div className="md:col-span-7 space-y-5">
            <div>
              <p className="text-xs font-mono uppercase tracking-widest text-red-500">
                Official Event Entry
              </p>
              <h2 className="font-display text-3xl font-bold uppercase tracking-tight text-white mt-1">
                {ticket.eventTitle}
              </h2>
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                  Participant Name
                </dt>
                <dd className="mt-1 font-semibold text-white">{ticket.participantName}</dd>
              </div>
              <div>
                <dt className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                  Registration ID
                </dt>
                <dd className="mt-1 font-mono font-semibold text-white tabular-nums">
                  {ticket.registrationId}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                  Event Date
                </dt>
                <dd className="mt-1 text-zinc-200">{ticket.eventDate}</dd>
              </div>
              <div>
                <dt className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                  Meeting Point
                </dt>
                <dd className="mt-1 text-zinc-200">{ticket.meetingPoint}</dd>
              </div>
              {ticket.gatewayPaymentId && (
                <div className="sm:col-span-2">
                  <dt className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                    Verified Payment Reference
                  </dt>
                  <dd className="mt-1 font-mono text-xs text-zinc-300">{ticket.gatewayPaymentId}</dd>
                </div>
              )}
            </dl>

            <div className="p-4 bg-zinc-950 border border-white/10 rounded-lg text-xs text-zinc-300 leading-relaxed">
              {SCRAM_DISCLOSURE}
            </div>
          </div>

          <div className="md:col-span-5 flex flex-col items-center justify-center p-6 bg-zinc-950 border border-white/10 rounded-xl">
            {isConfirmed ? (
              <>
                <div className="p-3 bg-white rounded-lg">
                  <img
                    src={qrDataUrl}
                    alt={`Check-in QR code for ${ticket.registrationId}`}
                    className="w-48 h-48 block"
                  />
                </div>
                <p className="mt-3 text-xs font-mono uppercase tracking-wider text-zinc-400 text-center">
                  Present at Check-In Desk
                </p>
                <p className="mt-1 text-[11px] text-zinc-500 text-center">
                  Encodes Registration ID only — private contact info is never stored in this QR.
                </p>
                <button
                  type="button"
                  onClick={handleDownloadTicket}
                  disabled={downloading}
                  className="mt-5 w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  {downloading ? 'Generating PNG...' : 'Download Ticket (PNG)'}
                </button>
              </>
            ) : (
              <div className="text-center py-8 space-y-2">
                <p className="text-sm font-semibold text-amber-400">QR Ticket Pending Verification</p>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Digital QR codes are issued automatically once the payment gateway verifies your
                  INR transaction.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
