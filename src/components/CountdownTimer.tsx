import React from 'react';

interface CountdownTimerProps {
  targetDateISO: string;
  startingTime?: string;
}

function parseTargetDate(dateISO: string, startingTime?: string): number {
  if (!dateISO) return Date.now();
  // Try combining YYYY-MM-DD with time like "06:30 AM" or "17:00"
  const datePart = dateISO.slice(0, 10);
  if (startingTime) {
    const combined = new Date(`${datePart} ${startingTime}`);
    if (!Number.isNaN(combined.getTime())) {
      return combined.getTime();
    }
  }
  const direct = new Date(dateISO);
  return Number.isNaN(direct.getTime()) ? Date.now() : direct.getTime();
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  targetDateISO,
  startingTime,
}) => {
  const targetMs = React.useMemo(
    () => parseTargetDate(targetDateISO, startingTime),
    [targetDateISO, startingTime]
  );

  const [nowMs, setNowMs] = React.useState(() => Date.now());

  React.useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const diff = Math.max(0, targetMs - nowMs);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  if (diff === 0) {
    return (
      <div className="inline-flex items-center gap-3 px-4 py-2.5 bg-[#121216] border border-white/10 rounded-lg">
        <span className="text-xs font-mono uppercase tracking-wider text-red-400">
          Event Day Active
        </span>
      </div>
    );
  }

  const units = [
    { label: 'Days', value: String(days).padStart(2, '0') },
    { label: 'Hours', value: String(hours).padStart(2, '0') },
    { label: 'Mins', value: String(minutes).padStart(2, '0') },
    { label: 'Secs', value: String(seconds).padStart(2, '0') },
  ];

  return (
    <div className="grid grid-cols-4 gap-2.5 sm:gap-3 max-w-md" aria-label="Countdown to event">
      {units.map((u) => (
        <div
          key={u.label}
          className="bg-[#121216]/95 border border-white/10 rounded-lg px-3 py-2.5 text-center"
        >
          <div className="font-mono text-2xl sm:text-3xl font-bold text-white tabular-nums leading-none">
            {u.value}
          </div>
          <div className="mt-1.5 text-[11px] font-medium uppercase tracking-widest text-zinc-400">
            {u.label}
          </div>
        </div>
      ))}
    </div>
  );
};
