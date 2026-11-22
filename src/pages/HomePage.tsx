import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, Clock, MapPin, ShieldCheck, Smartphone, Users } from 'lucide-react';
import { CLUB_IMAGES, HOW_TO_PLAY_STEPS, SCRAM_DISCLOSURE } from '../data/rulebook';
import type { BrandingSettings, ManhuntEvent, MediaHighlight } from '../types';
import { ClubLogo } from '../components/ClubLogo';
import { CountdownTimer } from '../components/CountdownTimer';
import { HighlightsShowcase } from '../components/HighlightsShowcase';

interface HomePageProps {
  events: ManhuntEvent[];
  highlights: MediaHighlight[];
  branding: BrandingSettings;
  loading: boolean;
}

export const HomePage: React.FC<HomePageProps> = ({ events, highlights, branding, loading }) => {
  const nextEvent = React.useMemo(() => {
    const open = events.find((e) => e.registrationOpen);
    return open || events[0] || null;
  }, [events]);

  const remainingCapacity = nextEvent
    ? Math.max(0, nextEvent.capacity - (nextEvent.confirmedCount || 0))
    : 0;

  return (
    <div>
      {/* 1. Cinematic Hero Section */}
      <section className="relative min-h-[82vh] flex items-center overflow-hidden border-b border-white/10">
        <img
          src={CLUB_IMAGES.heroUrban}
          alt="Morning Miles Club Manhunt real-world hide-and-seek in Golaghat at twilight"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#09090B] via-[#09090B]/85 to-[#09090B]/45" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090B] via-transparent to-black/40" />

        <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="max-w-3xl space-y-7">
            <div className="flex flex-wrap items-center gap-4">
              <ClubLogo logoUrl={branding.logoUrl} size="md" showWordmark={false} />
              <div className="text-xs font-mono uppercase tracking-widest text-zinc-300 flex items-center gap-2">
                <span className="text-white font-semibold">Morning Miles Club</span>
                <span aria-hidden="true">·</span>
                <span>Golaghat, Assam</span>
              </div>
            </div>

            <div className="space-y-4">
              <h1
                className="font-display font-bold uppercase tracking-tight text-white leading-[0.95]"
                style={{ fontSize: 'clamp(3.25rem, 8vw, 6.25rem)', textWrap: 'balance' }}
              >
                MANHUNT
              </h1>
              <p className="font-display text-xl sm:text-2xl font-semibold uppercase tracking-wider text-red-500">
                THINK FAST. HIDE SMART. PLAY FAIR.
              </p>
              <p className="text-base sm:text-lg text-zinc-200 leading-relaxed max-w-2xl">
                A real-world urban hide-and-seek challenge across Golaghat organised by Morning
                Miles Club. Register online, verify your pass, and join the live session on the
                SCRAM Hide & Seek mobile app on event day.
              </p>
            </div>

            {/* Countdown to Next Event */}
            {nextEvent ? (
              <div className="space-y-2.5">
                <p className="text-xs font-mono uppercase tracking-widest text-zinc-400">
                  Next Event Countdown · {nextEvent.title}
                </p>
                <CountdownTimer
                  targetDateISO={nextEvent.dateISO}
                  startingTime={nextEvent.startingTime}
                />
              </div>
            ) : (
              <div className="inline-block px-4 py-3 bg-[#121216]/90 border border-white/10 rounded-lg text-xs text-zinc-300">
                {loading
                  ? 'Loading upcoming Golaghat schedule...'
                  : 'Next Golaghat Manhunt edition will be announced shortly.'}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                to={nextEvent ? `/register?event=${encodeURIComponent(nextEvent.id)}` : '/register'}
                className="inline-flex items-center justify-center gap-2.5 px-7 py-4 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold uppercase tracking-wider rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                Register Now
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/rules"
                className="inline-flex items-center justify-center px-6 py-4 bg-[#121216]/90 hover:bg-zinc-900 border border-white/15 text-zinc-100 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                Read Official Rulebook
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Upcoming Manhunt Event Information */}
      <section className="py-16 sm:py-24 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div className="space-y-2">
              <p className="text-xs font-mono uppercase tracking-widest text-red-500">
                Upcoming Event
              </p>
              <h2 className="font-display text-3xl sm:text-4xl font-bold uppercase tracking-tight text-white">
                {nextEvent ? nextEvent.title : 'Upcoming Golaghat Schedule'}
              </h2>
            </div>
            <Link
              to="/events"
              className="text-sm font-medium text-zinc-300 hover:text-white inline-flex items-center gap-1.5"
            >
              View all event details
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {nextEvent ? (
            <div className="bg-[#121216] border border-white/10 rounded-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch">
              <div className="lg:col-span-5 relative min-h-[260px]">
                <img
                  src={nextEvent.bannerUrl || CLUB_IMAGES.arenaBanner}
                  alt={nextEvent.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover lg:absolute lg:inset-0"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
              </div>

              <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between gap-8">
                <div className="space-y-6">
                  {nextEvent.subtitle && (
                    <p className="text-sm text-zinc-300 leading-relaxed">{nextEvent.subtitle}</p>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm">
                    <div className="flex items-start gap-3">
                      <Calendar className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-xs font-mono uppercase text-zinc-500">Event Date</div>
                        <div className="text-white font-medium mt-0.5">{nextEvent.dateISO}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Clock className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-xs font-mono uppercase text-zinc-500">
                          Reporting / Start
                        </div>
                        <div className="text-white font-medium mt-0.5 tabular-nums">
                          {nextEvent.reportingTime} · Game starts {nextEvent.startingTime}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-xs font-mono uppercase text-zinc-500">Meeting Point</div>
                        <div className="text-white font-medium mt-0.5">{nextEvent.meetingPoint}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Users className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-xs font-mono uppercase text-zinc-500">
                          Capacity Remaining
                        </div>
                        <div className="text-white font-mono font-medium mt-0.5 tabular-nums">
                          {remainingCapacity} / {nextEvent.capacity} spots left
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-zinc-300">
                    <div>
                      <span className="font-mono uppercase text-zinc-500 block mb-1">
                        Game Boundaries
                      </span>
                      {nextEvent.boundaries}
                    </div>
                    {nextEvent.prizeDetails && (
                      <div>
                        <span className="font-mono uppercase text-zinc-500 block mb-1">
                          Prize Details
                        </span>
                        {nextEvent.prizeDetails}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-5 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-mono uppercase text-zinc-500">Entry Fee</div>
                    <div className="font-mono text-2xl font-bold text-white tabular-nums">
                      ₹{nextEvent.entryFeeInr}
                    </div>
                  </div>
                  {nextEvent.registrationOpen && remainingCapacity > 0 ? (
                    <Link
                      to={`/register?event=${encodeURIComponent(nextEvent.id)}`}
                      className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors"
                    >
                      Register for Event
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  ) : (
                    <span className="text-xs font-mono uppercase text-amber-400">
                      Registrations Closed
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#121216] border border-white/10 rounded-xl p-10 text-center space-y-3">
              <p className="text-base font-medium text-white">
                No upcoming Manhunt event is published yet.
              </p>
              <p className="text-sm text-zinc-400 max-w-xl mx-auto">
                Organisers publish upcoming Golaghat Manhunt schedules directly through the private
                Host Portal. Follow{' '}
                <a
                  href={branding.instagramUrl || 'https://instagram.com/morningmilesclub'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-red-400 hover:underline"
                >
                  @morningmilesclub
                </a>{' '}
                for announcements.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* 3. How to Play & SCRAM Hide & Seek Integration Notice */}
      <section className="py-16 sm:py-24 border-b border-white/10 bg-[#0C0C0F]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-5 space-y-4">
              <p className="text-xs font-mono uppercase tracking-widest text-red-500">
                Gameplay Format
              </p>
              <h2 className="font-display text-3xl sm:text-4xl font-bold uppercase tracking-tight text-white">
                How Manhunt Works
              </h2>
              <p className="text-sm text-zinc-300 leading-relaxed">
                Manhunt is a live outdoor hide-and-seek game across approved public zones in
                Golaghat. While Morning Miles Club handles entry verification and safety check-in
                here, the active game session runs inside the official{' '}
                <strong className="text-white">SCRAM Hide & Seek</strong> mobile app.
              </p>

              <div className="p-5 bg-[#121216] border border-white/10 rounded-xl space-y-3">
                <div className="flex items-center gap-2.5 text-sm font-semibold text-white">
                  <Smartphone className="w-4 h-4 text-red-500 shrink-0" />
                  <span>SCRAM Hide & Seek App Requirement</span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">{SCRAM_DISCLOSURE}</p>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <Link
                  to="/how-to-play"
                  className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold uppercase tracking-wider text-white rounded-lg transition-colors"
                >
                  Full SCRAM Instructions
                </Link>
                <Link
                  to="/rules"
                  className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold uppercase tracking-wider text-zinc-300 rounded-lg transition-colors inline-flex items-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4 text-red-500" />
                  14 Safety Rules
                </Link>
              </div>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {HOW_TO_PLAY_STEPS.slice(0, 6).map((item) => (
                <div
                  key={item.step}
                  className="p-5 bg-[#121216] border border-white/10 rounded-xl space-y-2"
                >
                  <div className="font-mono text-xs font-bold text-red-500">{item.step}</div>
                  <h3 className="font-display text-lg font-semibold uppercase text-white">
                    {item.title}
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 4. Previous Manhunt Highlights */}
      <section className="py-16 sm:py-24 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div className="space-y-2">
              <p className="text-xs font-mono uppercase tracking-widest text-red-500">
                Archive & Media
              </p>
              <h2 className="font-display text-3xl sm:text-4xl font-bold uppercase tracking-tight text-white">
                Previous Manhunt Highlights
              </h2>
            </div>
            <Link
              to="/highlights"
              className="text-sm font-medium text-zinc-300 hover:text-white inline-flex items-center gap-1.5"
            >
              Explore full gallery & videos
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <HighlightsShowcase highlights={highlights} compact />
        </div>
      </section>

      {/* 5. About Morning Miles Club */}
      <section className="py-16 sm:py-24 bg-[#0C0C0F]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-5">
            <p className="text-xs font-mono uppercase tracking-widest text-red-500">
              Golaghat Sports & Community
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold uppercase tracking-tight text-white">
              About Morning Miles Club
            </h2>
            <p className="text-base text-zinc-300 leading-relaxed">
              Born in Golaghat, Assam, Morning Miles Club brings people outdoors through morning
              runs, community endurance meetups, and large-scale urban games like Manhunt. We build
              safe, energetic events that turn familiar town streets into shared memories.
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                to="/register"
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors"
              >
                Join Next Event
              </Link>
              <a
                href={branding.instagramUrl || 'https://instagram.com/morningmilesclub'}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 border border-white/15 hover:bg-white/5 text-zinc-200 text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors"
              >
                Follow on Instagram
              </a>
            </div>
          </div>

          <div className="lg:col-span-5 bg-[#121216] border border-white/10 rounded-xl p-6 sm:p-8 space-y-5">
            <ClubLogo logoUrl={branding.logoUrl} size="lg" />
            <p className="text-sm text-zinc-400 leading-relaxed">
              {branding.clubTagline ||
                'A community built around fitness, adventure and unforgettable experiences.'}
            </p>
            <div className="pt-4 border-t border-white/10 space-y-2 text-xs text-zinc-400">
              <div>Location: {branding.locationText || 'Golaghat, Assam, India'}</div>
              <div>Email: {branding.contactEmail || 'morningmilesclub@gmail.com'}</div>
              <div>Organiser Desk: {branding.contactPhone || '+91 98765 00000'}</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
