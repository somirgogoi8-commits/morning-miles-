import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, Clock, MapPin, ShieldAlert, Smartphone, Users } from 'lucide-react';
import { CLUB_IMAGES, SCRAM_DISCLOSURE } from '../data/rulebook';
import type { ManhuntEvent } from '../types';
import { CountdownTimer } from '../components/CountdownTimer';

interface EventsPageProps {
  events: ManhuntEvent[];
  loading: boolean;
}

export const EventsPage: React.FC<EventsPageProps> = ({ events, loading }) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-10">
      <div className="space-y-3 border-b border-white/10 pb-8">
        <p className="text-xs font-mono uppercase tracking-widest text-red-500">
          Morning Miles Club Schedule
        </p>
        <h1 className="font-display text-4xl sm:text-5xl font-bold uppercase tracking-tight text-white">
          Upcoming Manhunt Events
        </h1>
        <p className="text-sm sm:text-base text-zinc-400 max-w-2xl">
          Review reporting times, approved game boundaries, prize pools, and remaining capacity
          before registering. All participants must accept the official 14-rule safety handbook.
        </p>
      </div>

      {loading ? (
        <div className="space-y-6">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-64 bg-[#121216] border border-white/10 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="bg-[#121216] border border-white/10 rounded-xl p-12 text-center space-y-4">
          <h2 className="font-display text-2xl font-bold uppercase text-white">
            No Published Events Currently Open
          </h2>
          <p className="text-sm text-zinc-400 max-w-md mx-auto">
            New Manhunt sessions are published here as soon as our Golaghat organising team locks
            in the date and perimeter.
          </p>
          <div className="pt-2">
            <Link
              to="/highlights"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold uppercase tracking-wider rounded-lg"
            >
              View Previous Highlights
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {events.map((ev) => {
            const remaining = Math.max(0, ev.capacity - (ev.confirmedCount || 0));
            const isOpen = ev.registrationOpen && remaining > 0;
            return (
              <article
                key={ev.id}
                className="bg-[#121216] border border-white/10 rounded-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch"
              >
                <div className="lg:col-span-5 relative min-h-[260px]">
                  <img
                    src={ev.bannerUrl || CLUB_IMAGES.arenaBanner}
                    alt={ev.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover lg:absolute lg:inset-0"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                  <div className="absolute bottom-5 left-5 right-5">
                    <CountdownTimer targetDateISO={ev.dateISO} startingTime={ev.startingTime} />
                  </div>
                </div>

                <div className="lg:col-span-7 p-6 sm:p-8 space-y-6 flex flex-col justify-between">
                  <div className="space-y-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="text-xs font-mono uppercase tracking-wider text-red-400">
                          {isOpen ? 'Registration Open' : 'Registration Closed'} · ₹{ev.entryFeeInr}{' '}
                          Entry
                        </div>
                        <h2 className="font-display text-3xl font-bold uppercase text-white mt-1">
                          {ev.title}
                        </h2>
                        {ev.subtitle && (
                          <p className="text-sm text-zinc-400 mt-1">{ev.subtitle}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div className="flex items-start gap-3">
                        <Calendar className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                        <div>
                          <div className="text-xs font-mono uppercase text-zinc-500">Date</div>
                          <div className="text-white">{ev.dateISO}</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Clock className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                        <div>
                          <div className="text-xs font-mono uppercase text-zinc-500">Timings</div>
                          <div className="text-white tabular-nums">
                            Report {ev.reportingTime} · Start {ev.startingTime}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <MapPin className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                        <div>
                          <div className="text-xs font-mono uppercase text-zinc-500">
                            Meeting Point
                          </div>
                          <div className="text-white">{ev.meetingPoint}</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Users className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                        <div>
                          <div className="text-xs font-mono uppercase text-zinc-500">Capacity</div>
                          <div className="text-white font-mono tabular-nums">
                            {remaining} of {ev.capacity} spots available
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-white/10 text-xs text-zinc-300 leading-relaxed">
                      <div>
                        <span className="font-mono uppercase text-zinc-500 block mb-1">
                          Approved Game Boundaries
                        </span>
                        {ev.boundaries}
                      </div>
                      {ev.prizeDetails && (
                        <div>
                          <span className="font-mono uppercase text-zinc-500 block mb-1">
                            Prize Details
                          </span>
                          {ev.prizeDetails}
                        </div>
                      )}
                      {ev.safetyNotes && (
                        <div className="flex items-start gap-2 text-zinc-300">
                          <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                          <span>{ev.safetyNotes}</span>
                        </div>
                      )}
                      <div className="flex items-start gap-2 text-zinc-400">
                        <Smartphone className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        <span>{ev.scramNotes || SCRAM_DISCLOSURE}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-5 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
                    <Link
                      to="/rules"
                      className="text-xs font-medium text-zinc-300 hover:text-white underline underline-offset-4"
                    >
                      Review Mandatory Rulebook
                    </Link>
                    {isOpen ? (
                      <Link
                        to={`/register?event=${encodeURIComponent(ev.id)}`}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors"
                      >
                        Register Now (₹{ev.entryFeeInr})
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    ) : (
                      <span className="text-xs font-mono uppercase text-amber-400">
                        {remaining === 0 ? 'Event Full' : 'Registration Closed'}
                      </span>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
