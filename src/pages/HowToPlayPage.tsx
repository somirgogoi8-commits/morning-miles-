import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Smartphone } from 'lucide-react';
import { HOW_TO_PLAY_STEPS, SCRAM_DISCLOSURE } from '../data/rulebook';

export const HowToPlayPage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-14">
      <div className="max-w-3xl space-y-4">
        <p className="text-xs font-mono uppercase tracking-widest text-red-500">
          Player Guide & SCRAM Instructions
        </p>
        <h1 className="font-display text-4xl sm:text-5xl font-bold uppercase tracking-tight text-white">
          How to Play Manhunt
        </h1>
        <p className="text-base text-zinc-300 leading-relaxed">
          MANHUNT is a real-world hide-and-seek game hosted across safe public areas in Golaghat.
          Website registration secures your verified entry pass, while all live hide-and-seek
          gameplay runs through the <strong className="text-white">SCRAM Hide & Seek</strong>{' '}
          mobile application.
        </p>
      </div>

      {/* Prominent SCRAM App Instructions Block */}
      <section className="bg-[#121216] border border-white/15 rounded-xl p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-7 space-y-4">
          <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-red-500">
            <Smartphone className="w-4 h-4" />
            <span>Official SCRAM App Instructions</span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold uppercase text-white">
            Prepare SCRAM Hide & Seek Before Arriving
          </h2>
          <p className="text-sm text-zinc-200 leading-relaxed bg-zinc-950 border border-white/10 rounded-lg p-4">
            {SCRAM_DISCLOSURE}
          </p>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Note: This website does not link to or verify external SCRAM accounts automatically.
            Please make sure the SCRAM app is installed, updated, and logged in on your phone with
            sufficient battery before reporting time.
          </p>
        </div>

        <div className="lg:col-span-5 bg-zinc-950 border border-white/10 rounded-xl p-6 space-y-3">
          <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-400">
            Event-Day Readiness Checklist
          </h3>
          <ul className="space-y-3 text-sm text-zinc-200">
            {[
              'Install the official SCRAM Hide & Seek application on your smartphone.',
              'Create an account or log in to SCRAM before heading to the meeting point.',
              'Keep your verified Morning Miles Club QR ticket ready for host check-in.',
              'Enter the session game code provided in person by the organisers on event day.',
              'Attend the pre-game briefing and play strictly inside the assigned event session.',
            ].map((line) => (
              <li key={line} className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 10-Step Player Flow */}
      <section className="space-y-6">
        <h2 className="font-display text-2xl sm:text-3xl font-bold uppercase text-white">
          Step-by-Step Event Flow
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {HOW_TO_PLAY_STEPS.map((item) => (
            <div
              key={item.step}
              className="p-6 bg-[#121216] border border-white/10 rounded-xl flex items-start gap-5"
            >
              <span className="font-mono text-2xl font-bold text-red-500 tabular-nums shrink-0">
                {item.step}
              </span>
              <div className="space-y-1.5">
                <h3 className="font-display text-xl font-semibold uppercase text-white">
                  {item.title}
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="pt-4 flex flex-wrap items-center gap-4">
        <Link
          to="/rules"
          className="inline-flex items-center gap-2 px-6 py-3.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors"
        >
          Read Official Manhunt Rulebook
          <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          to="/register"
          className="px-6 py-3.5 border border-white/15 hover:bg-white/5 text-zinc-200 text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors"
        >
          Proceed to Registration
        </Link>
      </div>
    </div>
  );
};
