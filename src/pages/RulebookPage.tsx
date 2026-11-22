import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { OFFICIAL_MANHUNT_RULES } from '../data/rulebook';

interface RulebookPageProps {
  customRules: string[];
}

export const RulebookPage: React.FC<RulebookPageProps> = ({ customRules }) => {
  const [acknowledged, setAcknowledged] = React.useState(false);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-10">
      <div className="space-y-4 border-b border-white/10 pb-8">
        <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-red-500">
          <ShieldCheck className="w-4 h-4" />
          <span>Mandatory Safety & Fair Play Code</span>
        </div>
        <h1 className="font-display text-4xl sm:text-5xl font-bold uppercase tracking-tight text-white">
          MANHUNT RULEBOOK
        </h1>
        <p className="text-base text-zinc-300 leading-relaxed max-w-3xl">
          Every Morning Miles Club participant must read and accept all 14 official rules before
          registering. Violations result in immediate disqualification by event organisers.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {OFFICIAL_MANHUNT_RULES.map((rule) => (
          <article
            key={rule.number}
            className="p-6 bg-[#121216] border border-white/10 rounded-xl space-y-2"
          >
            <div className="text-xs font-mono uppercase tracking-widest text-red-500">
              RULE {rule.number}
            </div>
            <h2 className="font-display text-xl font-bold uppercase tracking-wide text-white">
              {rule.title}
            </h2>
            <p className="text-sm text-zinc-300 leading-relaxed">{rule.description}</p>
          </article>
        ))}
      </div>

      {customRules.length > 0 && (
        <section className="p-6 bg-[#121216] border border-white/10 rounded-xl space-y-3">
          <h2 className="font-display text-xl font-bold uppercase text-white">
            Additional Event Organiser Rules
          </h2>
          <ul className="space-y-2 text-sm text-zinc-300 list-disc pl-5">
            {customRules.map((text, idx) => (
              <li key={idx}>{text}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="p-6 sm:p-8 bg-[#121216] border border-white/15 rounded-xl space-y-5">
        <label className="flex items-start gap-3.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            className="mt-1 h-5 w-5 rounded border-zinc-600 bg-zinc-900 text-red-600 focus:ring-red-600 cursor-pointer"
          />
          <span className="text-sm text-zinc-200 leading-relaxed">
            I have read and understood all 14 rules in the Morning Miles Club Manhunt Rulebook and
            agree to follow all organiser safety instructions.
          </span>
        </label>

        <div className="flex flex-wrap items-center gap-4">
          <Link
            to={acknowledged ? '/register?rulesAccepted=1' : '/register'}
            className={`inline-flex items-center gap-2 px-6 py-3.5 text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors ${
              acknowledged
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
            }`}
          >
            Continue to Registration
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
};
