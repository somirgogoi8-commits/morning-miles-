import React from 'react';

interface ClubLogoProps {
  logoUrl?: string;
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
  className?: string;
}

export const ClubLogo: React.FC<ClubLogoProps> = ({
  logoUrl,
  size = 'md',
  showWordmark = true,
  className = '',
}) => {
  const [imgFailed, setImgFailed] = React.useState(false);

  React.useEffect(() => {
    setImgFailed(false);
  }, [logoUrl]);

  const boxSizes = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-14 w-14',
  }[size];

  const textSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl',
  }[size];

  return (
    <span className={`inline-flex items-center gap-3 shrink-0 ${className}`}>
      {logoUrl && !imgFailed ? (
        <img
          src={logoUrl}
          alt="Morning Miles Club Official Logo"
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className={`${boxSizes} object-contain rounded-md bg-zinc-950 border border-white/10 shrink-0`}
        />
      ) : (
        <span
          aria-hidden="true"
          className={`${boxSizes} rounded-md bg-zinc-900 border border-white/15 flex items-center justify-center shrink-0`}
        >
          <svg
            viewBox="0 0 36 36"
            className="w-2/3 h-2/3"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M4 28V8L12.5 20L18 11L23.5 20L32 8V28"
              stroke="#FFFFFF"
              strokeWidth="2.8"
              strokeLinecap="square"
              strokeLinejoin="miter"
            />
            <path d="M18 23L21.5 28H14.5L18 23Z" fill="#DC2626" />
          </svg>
        </span>
      )}
      {showWordmark && (
        <span
          className={`font-display font-bold tracking-wider uppercase text-white whitespace-nowrap shrink-0 ${textSizes}`}
        >
          MORNING MILES CLUB
        </span>
      )}
    </span>
  );
};
