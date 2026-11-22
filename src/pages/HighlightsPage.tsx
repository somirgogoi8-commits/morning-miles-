import React from 'react';
import { HighlightsShowcase } from '../components/HighlightsShowcase';
import type { MediaHighlight } from '../types';

interface HighlightsPageProps {
  highlights: MediaHighlight[];
}

export const HighlightsPage: React.FC<HighlightsPageProps> = ({ highlights }) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-10">
      <div className="space-y-3 border-b border-white/10 pb-8">
        <p className="text-xs font-mono uppercase tracking-widest text-red-500">
          Community Media Archive
        </p>
        <h1 className="font-display text-4xl sm:text-5xl font-bold uppercase tracking-tight text-white">
          Previous Manhunt Highlights
        </h1>
        <p className="text-sm sm:text-base text-zinc-400 max-w-2xl">
          Action shots, stealth spots, sprint footage, and group memories from Golaghat. All
          participant photographs and videos are published only with participant permission.
        </p>
      </div>

      <HighlightsShowcase highlights={highlights} />
    </div>
  );
};
