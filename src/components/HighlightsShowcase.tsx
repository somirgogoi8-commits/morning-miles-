import React from 'react';
import { ExternalLink, Play } from 'lucide-react';
import { CLUB_IMAGES } from '../data/rulebook';
import type { HighlightCategory, MediaHighlight } from '../types';

interface HighlightsShowcaseProps {
  highlights: MediaHighlight[];
  compact?: boolean;
}

const CATEGORIES: ('All' | HighlightCategory)[] = [
  'All',
  'Group Photo',
  'Hiding',
  'Searching',
  'Running',
  'Funny Moments',
  'Highlight Video',
];

const CURATED_ARCHIVE: MediaHighlight[] = [
  {
    id: 'archive-group-80',
    title: '80 Participants – Golaghat Gathering',
    eventLabel: 'Manhunt Golaghat Edition',
    category: 'Group Photo',
    mediaType: 'image',
    mediaUrl: CLUB_IMAGES.groupGolaghat,
    caption: 'Eighty community runners and seekers gathered in Golaghat after the full-town hide-and-seek session.',
    permissionConfirmed: true,
    sortOrder: 1,
  },
  {
    id: 'archive-hiding-alley',
    title: 'Twilight Alley Concealment',
    eventLabel: 'Manhunt Golaghat Edition',
    category: 'Hiding',
    mediaType: 'image',
    mediaUrl: CLUB_IMAGES.hidingAlley,
    caption: 'Participants holding low behind concrete steps just before seekers swept the outer lane.',
    permissionConfirmed: true,
    sortOrder: 2,
  },
  {
    id: 'archive-searching-dusk',
    title: 'Dusk Perimeter Sweep',
    eventLabel: 'Manhunt Golaghat Edition',
    category: 'Searching',
    mediaType: 'image',
    mediaUrl: CLUB_IMAGES.searchingDusk,
    caption: 'Seekers scanning the public courtyard perimeter as final countdown alerts chimed on SCRAM.',
    permissionConfirmed: true,
    sortOrder: 3,
  },
  {
    id: 'archive-arena-run',
    title: 'Evening Sprint & Boundary Dash',
    eventLabel: 'Manhunt Golaghat Edition',
    category: 'Running',
    mediaType: 'image',
    mediaUrl: CLUB_IMAGES.arenaBanner,
    caption: 'High-tempo repositioning along the floodlit stadium colonnade inside the approved play perimeter.',
    permissionConfirmed: true,
    sortOrder: 4,
  },
];

function getEmbedUrl(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.hostname.includes('youtube.com')) {
      const v = parsed.searchParams.get('v');
      if (v) return `https://www.youtube.com/embed/${encodeURIComponent(v)}`;
      if (parsed.pathname.startsWith('/shorts/')) {
        const id = parsed.pathname.split('/')[2];
        if (id) return `https://www.youtube.com/embed/${encodeURIComponent(id)}`;
      }
      if (parsed.pathname.startsWith('/embed/')) return rawUrl;
    }
    if (parsed.hostname === 'youtu.be') {
      const id = parsed.pathname.replace('/', '');
      if (id) return `https://www.youtube.com/embed/${encodeURIComponent(id)}`;
    }
    if (parsed.hostname.includes('vimeo.com')) {
      const id = parsed.pathname.replace('/', '');
      if (/^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`;
    }
  } catch {
    return null;
  }
  return null;
}

export const HighlightsShowcase: React.FC<HighlightsShowcaseProps> = ({
  highlights,
  compact = false,
}) => {
  const [selectedCategory, setSelectedCategory] = React.useState<'All' | HighlightCategory>('All');
  const [activeVideo, setActiveVideo] = React.useState<MediaHighlight | null>(null);

  const combinedItems = React.useMemo(() => {
    const approvedDynamic = highlights.filter((h) => h.permissionConfirmed);
    const items = approvedDynamic.length > 0 ? [...approvedDynamic, ...CURATED_ARCHIVE] : CURATED_ARCHIVE;
    if (selectedCategory === 'All') {
      return compact ? items.slice(0, 4) : items;
    }
    return items.filter((item) => item.category === selectedCategory);
  }, [highlights, selectedCategory, compact]);

  return (
    <div className="space-y-8">
      {/* Milestone Feature Banner */}
      <div className="bg-[#121216] border border-white/10 rounded-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch">
        <div className="lg:col-span-7 relative min-h-[260px] lg:min-h-[340px]">
          <img
            src={CLUB_IMAGES.groupGolaghat}
            alt="80 Participants in Golaghat Manhunt Community Event"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover lg:absolute lg:inset-0"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
        </div>
        <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between gap-6">
          <div className="space-y-3">
            <p className="text-xs font-mono uppercase tracking-widest text-red-500">
              Previous Event Milestone
            </p>
            <h3 className="font-display text-3xl sm:text-4xl font-bold uppercase tracking-tight text-white">
              80 PARTICIPANTS – GOLAGHAT
            </h3>
            <p className="text-sm text-zinc-300 leading-relaxed">
              Our previous Golaghat Manhunt edition brought together 80 runners, strategists, and
              friends for an unforgettable evening of stealth, sprints, and community camaraderie.
            </p>
          </div>
          <div className="pt-4 border-t border-white/10 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-400">
            <span className="font-mono tabular-nums text-white font-semibold">80 Runners</span>
            <span aria-hidden="true">·</span>
            <span>Golaghat, Assam</span>
            <span aria-hidden="true">·</span>
            <span>Published with participant permission</span>
          </div>
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap items-center gap-1.5 bg-[#121216] border border-white/10 p-1.5 rounded-xl w-fit max-w-full overflow-x-auto">
        {CATEGORIES.map((cat) => {
          const active = selectedCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                active
                  ? 'bg-red-600 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Media Grid */}
      {combinedItems.length === 0 ? (
        <div className="bg-[#121216] border border-white/10 rounded-xl p-10 text-center">
          <p className="text-sm text-zinc-300">
            No highlights found under <span className="text-white font-medium">{selectedCategory}</span> yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {combinedItems.map((item) => {
            const isVideo = item.mediaType === 'video_embed' || item.mediaType === 'video_link';
            const displayThumb = item.thumbnailUrl || (item.mediaType === 'image' ? item.mediaUrl : CLUB_IMAGES.arenaBanner);
            return (
              <article
                key={item.id}
                className="bg-[#121216] border border-white/10 rounded-xl overflow-hidden flex flex-col"
              >
                <div className="relative aspect-[4/3] bg-zinc-950 overflow-hidden">
                  <img
                    src={displayThumb}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-[1.02]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
                  {isVideo && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      {item.mediaType === 'video_embed' ? (
                        <button
                          type="button"
                          onClick={() => setActiveVideo(item)}
                          className="inline-flex items-center gap-2 px-5 py-3 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                        >
                          <Play className="w-4 h-4 fill-current" />
                          Watch Highlight
                        </button>
                      ) : (
                        <a
                          href={item.mediaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-5 py-3 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Open Video Link
                        </a>
                      )}
                    </div>
                  )}
                </div>

                <div className="p-6 flex-1 flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-zinc-400 mb-2">
                      <span className="text-red-400 font-medium">{item.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>{item.eventLabel}</span>
                    </div>
                    <h4 className="font-display text-xl font-bold uppercase tracking-wide text-white">
                      {item.title}
                    </h4>
                    {item.caption && (
                      <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{item.caption}</p>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Embedded Video Modal */}
      {activeVideo && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={activeVideo.title}
        >
          <div className="max-w-3xl w-full bg-[#121216] border border-white/15 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between gap-4">
              <div>
                <h4 className="font-display text-lg font-bold uppercase text-white">
                  {activeVideo.title}
                </h4>
                <p className="text-xs text-zinc-400">{activeVideo.eventLabel}</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveVideo(null)}
                className="px-3.5 py-2 text-xs font-medium text-zinc-300 bg-white/5 hover:bg-white/10 rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
            <div className="aspect-video bg-black">
              {getEmbedUrl(activeVideo.mediaUrl) ? (
                <iframe
                  src={getEmbedUrl(activeVideo.mediaUrl) || ''}
                  title={activeVideo.title}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video
                  src={activeVideo.mediaUrl}
                  controls
                  autoPlay
                  className="w-full h-full"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
