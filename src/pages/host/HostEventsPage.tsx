import React from 'react';
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Plus, Trash2, Upload } from 'lucide-react';
import { CLUB_IMAGES } from '../../data/rulebook';
import { useHostAuth } from '../../context/HostAuthContext';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import type {
  BrandingSettings,
  HighlightCategory,
  IntegrationSettings,
  ManhuntEvent,
  RulesSettings,
} from '../../types';
import { HostLayout } from '../../components/HostLayout';
import { ClubLogo } from '../../components/ClubLogo';

function compressImageToDataUrl(file: File, maxDim = 900): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas unavailable'));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        resolve(canvas.toDataURL(mime, 0.84));
      };
      img.onerror = () => reject(new Error('Invalid image file'));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export const HostEventsPage: React.FC<{ branding: BrandingSettings }> = ({ branding }) => {
  const { user, role, events, highlights, refreshPortalData, logAudit } = useHostAuth();

  const [activeTab, setActiveTab] = React.useState<'events' | 'media' | 'branding'>('events');
  const [notice, setNotice] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  // Event Form State
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [evId, setEvId] = React.useState('manhunt-golaghat-s2');
  const [evTitle, setEvTitle] = React.useState('');
  const [evSubtitle, setEvSubtitle] = React.useState('');
  const [evDate, setEvDate] = React.useState('2026-12-20');
  const [evReporting, setEvReporting] = React.useState('03:30 PM');
  const [evStart, setEvStart] = React.useState('04:00 PM');
  const [evMeetingPoint, setEvMeetingPoint] = React.useState('Golaghat Public Ground Gate');
  const [evBoundaries, setEvBoundaries] = React.useState(
    'Approved Golaghat Town Public Zone (exact perimeter map shared at briefing).'
  );
  const [evFee, setEvFee] = React.useState('199');
  const [evPrize, setEvPrize] = React.useState('Winner Trophy + Morning Miles Club Merch');
  const [evCapacity, setEvCapacity] = React.useState('100');
  const [evRegOpen, setEvRegOpen] = React.useState(true);
  const [evPublished, setEvPublished] = React.useState(true);
  const [evOpensAt, setEvOpensAt] = React.useState('');
  const [evClosesAt, setEvClosesAt] = React.useState('');
  const [evSafety, setEvSafety] = React.useState('');
  const [evScram, setEvScram] = React.useState('');
  const [evBanner, setEvBanner] = React.useState('');

  // Media Form State
  const [hlTitle, setHlTitle] = React.useState('');
  const [hlEventLabel, setHlEventLabel] = React.useState('80 Participants – Golaghat');
  const [hlCategory, setHlCategory] = React.useState<HighlightCategory>('Highlight Video');
  const [hlType, setHlType] = React.useState<'image' | 'video_embed' | 'video_link'>('video_embed');
  const [hlUrl, setHlUrl] = React.useState('');
  const [hlThumb, setHlThumb] = React.useState('');
  const [hlCaption, setHlCaption] = React.useState('');
  const [hlPermission, setHlPermission] = React.useState(false);

  // Branding, Rules & Integrations State
  const [logoUrl, setLogoUrl] = React.useState(branding.logoUrl || '');
  const [clubTagline, setClubTagline] = React.useState(branding.clubTagline || '');
  const [instagramUrl, setInstagramUrl] = React.useState(branding.instagramUrl || '');
  const [contactEmail, setContactEmail] = React.useState(branding.contactEmail || '');
  const [contactPhone, setContactPhone] = React.useState(branding.contactPhone || '');
  const [locationText, setLocationText] = React.useState(branding.locationText || '');
  const [customRulesText, setCustomRulesText] = React.useState('');
  const [googleFormEmbedUrl, setGoogleFormEmbedUrl] = React.useState('');
  const [googleSheetUrl, setGoogleSheetUrl] = React.useState('');

  React.useEffect(() => {
    setLogoUrl(branding.logoUrl || '');
    setClubTagline(branding.clubTagline || '');
    setInstagramUrl(branding.instagramUrl || '');
    setContactEmail(branding.contactEmail || '');
    setContactPhone(branding.contactPhone || '');
    setLocationText(branding.locationText || '');
  }, [branding]);

  React.useEffect(() => {
    Promise.all([
      getDoc(doc(db, 'siteSettings', 'rules')),
      getDoc(doc(db, 'siteSettings', 'integrations')),
    ])
      .then(([rSnap, iSnap]) => {
        if (rSnap.exists()) {
          const r = rSnap.data() as RulesSettings;
          setCustomRulesText((r.customRuleOverrides || []).join('\n'));
        }
        if (iSnap.exists()) {
          const i = iSnap.data() as IntegrationSettings;
          setGoogleFormEmbedUrl(i.googleFormEmbedUrl || '');
          setGoogleSheetUrl(i.googleSheetUrl || '');
        }
      })
      .catch(() => undefined);
  }, []);

  const loadEventIntoForm = (ev: ManhuntEvent) => {
    setEditingId(ev.id);
    setEvId(ev.id);
    setEvTitle(ev.title);
    setEvSubtitle(ev.subtitle || '');
    setEvDate(ev.dateISO);
    setEvReporting(ev.reportingTime);
    setEvStart(ev.startingTime);
    setEvMeetingPoint(ev.meetingPoint);
    setEvBoundaries(ev.boundaries);
    setEvFee(String(ev.entryFeeInr));
    setEvPrize(ev.prizeDetails || '');
    setEvCapacity(String(ev.capacity));
    setEvRegOpen(ev.registrationOpen);
    setEvPublished(ev.isPublished);
    setEvOpensAt(ev.registrationOpensAt || '');
    setEvClosesAt(ev.registrationClosesAt || '');
    setEvSafety(ev.safetyNotes || '');
    setEvScram(ev.scramNotes || '');
    setEvBanner(ev.bannerUrl || '');
  };

  const resetEventForm = () => {
    setEditingId(null);
    setEvId(`manhunt-${Date.now().toString().slice(-6)}`);
    setEvTitle('');
    setEvSubtitle('');
    setEvDate('2026-12-20');
    setEvReporting('03:30 PM');
    setEvStart('04:00 PM');
    setEvMeetingPoint('Golaghat Public Ground Gate');
    setEvBoundaries('Approved Golaghat Town Public Zone');
    setEvFee('199');
    setEvPrize('');
    setEvCapacity('100');
    setEvRegOpen(true);
    setEvPublished(true);
    setEvOpensAt('');
    setEvClosesAt('');
    setEvSafety('');
    setEvScram('');
    setEvBanner('');
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);
    const cleanId = evId.trim().replace(/[^a-zA-Z0-9_-]/g, '-');
    if (cleanId.length < 2 || evTitle.trim().length < 3) {
      setNotice('Event ID and Title are required.');
      return;
    }
    setSaving(true);
    try {
      const existing = events.find((x) => x.id === cleanId);
      const payload: Record<string, unknown> = {
        id: cleanId,
        title: evTitle.trim(),
        subtitle: evSubtitle.trim(),
        dateISO: evDate.trim(),
        reportingTime: evReporting.trim(),
        startingTime: evStart.trim(),
        meetingPoint: evMeetingPoint.trim(),
        boundaries: evBoundaries.trim(),
        entryFeeInr: Number(evFee) || 0,
        prizeDetails: evPrize.trim(),
        capacity: Math.max(1, Number(evCapacity) || 50),
        confirmedCount: existing?.confirmedCount || 0,
        registrationOpen: evRegOpen,
        registrationOpensAt: evOpensAt.trim(),
        registrationClosesAt: evClosesAt.trim(),
        isPublished: evPublished,
        safetyNotes: evSafety.trim(),
        scramNotes: evScram.trim(),
        bannerUrl: evBanner.trim(),
        createdBy: existing?.createdBy || user?.email || '',
        createdAt: existing?.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'events', cleanId), payload).catch((err) =>
        handleFirestoreError(err, OperationType.WRITE, `events/${cleanId}`)
      );

      await logAudit(
        editingId ? 'UPDATE_EVENT' : 'CREATE_EVENT',
        'event',
        cleanId,
        `${editingId ? 'Updated' : 'Created'} event "${evTitle.trim()}" (${evDate}).`
      );

      setNotice(`Event "${evTitle.trim()}" saved to Firestore.`);
      setEditingId(cleanId);
      await refreshPortalData();
    } finally {
      setSaving(false);
    }
  };

  const handleSeedInitialGolaghat = async () => {
    if (role !== 'PRIMARY_ADMIN') return;
    setSaving(true);
    setNotice(null);
    try {
      const id = 'manhunt-golaghat-winter';
      await setDoc(doc(db, 'events', id), {
        id,
        title: 'MANHUNT GOLAGHAT: WINTER EDITION',
        subtitle:
          'Morning Miles Club real-world hide-and-seek edition across central Golaghat public zones.',
        dateISO: '2026-12-20',
        reportingTime: '03:30 PM',
        startingTime: '04:00 PM',
        meetingPoint: 'Golaghat District Sports Complex Gate',
        boundaries:
          'Approved Golaghat central public roads & park perimeter only. Strict ban on private residences, shops, hotels, and highways.',
        entryFeeInr: 199,
        prizeDetails: 'Winner Championship Kit + Morning Miles Club Official Jersey & Medals',
        capacity: 100,
        confirmedCount: 0,
        registrationOpen: true,
        isPublished: true,
        safetyNotes:
          'Reflective armbands issued at check-in. Emergency stop whistle overrides all play immediately.',
        scramNotes:
          'Install SCRAM Hide & Seek before arriving. Official session code announced on site.',
        bannerUrl: CLUB_IMAGES.arenaBanner,
        createdBy: user?.email || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }).catch((err) => handleFirestoreError(err, OperationType.CREATE, `events/${id}`));

      await logAudit('SEED_INITIAL_EVENT', 'event', id, 'Created initial Golaghat Manhunt event.');
      setNotice('Published MANHUNT GOLAGHAT: WINTER EDITION to Firestore.');
      await refreshPortalData();
    } finally {
      setSaving(false);
    }
  };

  const handleAddMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);
    if (!hlPermission) {
      setNotice('You must confirm participant permission before publishing any highlight.');
      return;
    }
    if (!hlTitle.trim() || !hlUrl.trim()) {
      setNotice('Title and Media URL are required.');
      return;
    }
    setSaving(true);
    try {
      const id = `hl_${Date.now()}`;
      await setDoc(doc(db, 'mediaHighlights', id), {
        id,
        title: hlTitle.trim(),
        eventLabel: hlEventLabel.trim() || 'Morning Miles Club',
        category: hlCategory,
        mediaType: hlType,
        mediaUrl: hlUrl.trim(),
        thumbnailUrl: hlThumb.trim(),
        caption: hlCaption.trim(),
        permissionConfirmed: true,
        sortOrder: highlights.length + 1,
        createdAt: serverTimestamp(),
      }).catch((err) =>
        handleFirestoreError(err, OperationType.CREATE, `mediaHighlights/${id}`)
      );

      await logAudit('ADD_MEDIA', 'mediaHighlight', id, `Published highlight "${hlTitle.trim()}"`);
      setHlTitle('');
      setHlUrl('');
      setHlThumb('');
      setHlCaption('');
      setHlPermission(false);
      setNotice('Highlight published to public archive.');
      await refreshPortalData();
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMedia = async (id: string) => {
    await deleteDoc(doc(db, 'mediaHighlights', id)).catch((err) =>
      handleFirestoreError(err, OperationType.DELETE, `mediaHighlights/${id}`)
    );
    await logAudit('DELETE_MEDIA', 'mediaHighlight', id, 'Removed media highlight.');
    await refreshPortalData();
  };

  const handleSaveBrandingAndSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role !== 'PRIMARY_ADMIN') return;
    setSaving(true);
    setNotice(null);
    try {
      await setDoc(doc(db, 'siteSettings', 'branding'), {
        id: 'branding',
        logoUrl: logoUrl.trim(),
        clubTagline: clubTagline.trim(),
        instagramUrl: instagramUrl.trim(),
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim(),
        locationText: locationText.trim(),
        updatedBy: user?.email || '',
        updatedAt: serverTimestamp(),
      }).catch((err) =>
        handleFirestoreError(err, OperationType.WRITE, 'siteSettings/branding')
      );

      const ruleLines = customRulesText
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .slice(0, 20);

      await setDoc(doc(db, 'siteSettings', 'rules'), {
        id: 'rules',
        customRuleOverrides: ruleLines,
        updatedBy: user?.email || '',
        updatedAt: serverTimestamp(),
      }).catch((err) => handleFirestoreError(err, OperationType.WRITE, 'siteSettings/rules'));

      await setDoc(doc(db, 'siteSettings', 'integrations'), {
        id: 'integrations',
        googleFormEmbedUrl: googleFormEmbedUrl.trim(),
        googleSheetUrl: googleSheetUrl.trim(),
        updatedBy: user?.email || '',
        updatedAt: serverTimestamp(),
      }).catch((err) =>
        handleFirestoreError(err, OperationType.WRITE, 'siteSettings/integrations')
      );

      await logAudit(
        'UPDATE_SETTINGS',
        'siteSettings',
        'branding',
        'Updated official Morning Miles Club logo, rulebook additions, and integrations.'
      );
      setNotice('Official logo, rulebook additions, and integration links saved.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <HostLayout branding={branding} title="Events, Media & Branding">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="inline-flex items-center gap-1 p-1 bg-[#121216] border border-white/10 rounded-lg">
            {(
              [
                ['events', 'Events'],
                ['media', 'Highlights & Videos'],
                ...(role === 'PRIMARY_ADMIN' ? [['branding', 'Logo, Rules & Sheets']] : []),
              ] as [typeof activeTab, string][]
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setActiveTab(k)}
                className={`px-4 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  activeTab === k ? 'bg-red-600 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {role === 'PRIMARY_ADMIN' && events.length === 0 && (
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSeedInitialGolaghat()}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold uppercase tracking-wider rounded-lg cursor-pointer"
            >
              Initialize First Golaghat Event
            </button>
          )}
        </div>

        {notice && (
          <div className="p-3.5 bg-[#121216] border border-white/15 rounded-lg text-xs text-zinc-200">
            {notice}
          </div>
        )}

        {activeTab === 'events' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Existing Events List */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-bold uppercase text-white">
                  Configured Events
                </h2>
                {role === 'PRIMARY_ADMIN' && (
                  <button
                    type="button"
                    onClick={resetEventForm}
                    className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New Event
                  </button>
                )}
              </div>

              {events.length === 0 ? (
                <div className="p-6 bg-[#121216] border border-white/10 rounded-xl text-xs text-zinc-400">
                  No events in Firestore yet. Use the form to create and publish an event.
                </div>
              ) : (
                events.map((ev) => (
                  <div
                    key={ev.id}
                    onClick={() => loadEventIntoForm(ev)}
                    className={`p-4 bg-[#121216] border rounded-xl cursor-pointer transition-colors ${
                      editingId === ev.id
                        ? 'border-red-500'
                        : 'border-white/10 hover:border-white/25'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs font-mono text-zinc-400">
                      <span>{ev.dateISO}</span>
                      <span>
                        {ev.isPublished ? 'Published' : 'Draft'} ·{' '}
                        {ev.registrationOpen ? 'Open' : 'Closed'}
                      </span>
                    </div>
                    <div className="font-display text-lg font-bold uppercase text-white mt-1">
                      {ev.title}
                    </div>
                    <div className="text-xs text-zinc-400 mt-1 tabular-nums">
                      ₹{ev.entryFeeInr} · {ev.confirmedCount || 0} / {ev.capacity} confirmed
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Event Editor Form */}
            <form
              onSubmit={handleSaveEvent}
              className="lg:col-span-7 p-6 bg-[#121216] border border-white/10 rounded-xl space-y-4"
            >
              <h2 className="font-display text-xl font-bold uppercase text-white">
                {editingId ? `Edit Event (${editingId})` : 'Create New Manhunt Event'}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-zinc-400 mb-1">Event ID (slug)</label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingId)}
                    value={evId}
                    onChange={(e) => setEvId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-white/15 rounded-lg font-mono text-white disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Event Date</label>
                  <input
                    type="date"
                    required
                    value={evDate}
                    onChange={(e) => setEvDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-white/15 rounded-lg font-mono text-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-zinc-400 mb-1">Event Title</label>
                  <input
                    type="text"
                    required
                    value={evTitle}
                    onChange={(e) => setEvTitle(e.target.value)}
                    placeholder="MANHUNT GOLAGHAT: EDITION 3"
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-white/15 rounded-lg text-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-zinc-400 mb-1">Subtitle / Description</label>
                  <input
                    type="text"
                    value={evSubtitle}
                    onChange={(e) => setEvSubtitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-white/15 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Reporting Time</label>
                  <input
                    type="text"
                    required
                    value={evReporting}
                    onChange={(e) => setEvReporting(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-white/15 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Starting Time</label>
                  <input
                    type="text"
                    required
                    value={evStart}
                    onChange={(e) => setEvStart(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-white/15 rounded-lg text-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-zinc-400 mb-1">Meeting Point</label>
                  <input
                    type="text"
                    required
                    value={evMeetingPoint}
                    onChange={(e) => setEvMeetingPoint(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-white/15 rounded-lg text-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-zinc-400 mb-1">Game Boundaries</label>
                  <textarea
                    rows={2}
                    required
                    value={evBoundaries}
                    onChange={(e) => setEvBoundaries(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-white/15 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Entry Fee (INR ₹)</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={evFee}
                    onChange={(e) => setEvFee(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-white/15 rounded-lg font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Registration Capacity</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={evCapacity}
                    onChange={(e) => setEvCapacity(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-white/15 rounded-lg font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Reg Opens (Optional)</label>
                  <input
                    type="datetime-local"
                    value={evOpensAt}
                    onChange={(e) => setEvOpensAt(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-white/15 rounded-lg font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Reg Closes (Optional)</label>
                  <input
                    type="datetime-local"
                    value={evClosesAt}
                    onChange={(e) => setEvClosesAt(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-white/15 rounded-lg font-mono text-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-zinc-400 mb-1">Prize Details</label>
                  <input
                    type="text"
                    value={evPrize}
                    onChange={(e) => setEvPrize(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-white/15 rounded-lg text-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-zinc-400 mb-1">Event Banner Image (Upload or URL)</label>
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="text"
                      value={evBanner}
                      onChange={(e) => setEvBanner(e.target.value)}
                      placeholder="/src/assets/images/..."
                      className="flex-1 px-3.5 py-2.5 bg-zinc-950 border border-white/15 rounded-lg text-white"
                    />
                    <label className="px-4 py-2.5 bg-zinc-900 border border-white/15 rounded-lg text-zinc-200 cursor-pointer inline-flex items-center gap-1.5 hover:bg-zinc-800">
                      <Upload className="w-3.5 h-3.5" />
                      Upload
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const dataUrl = await compressImageToDataUrl(file, 1080);
                          setEvBanner(dataUrl);
                        }}
                      />
                    </label>
                  </div>
                </div>
                <div className="sm:col-span-2 flex flex-wrap gap-6 pt-2">
                  <label className="flex items-center gap-2 text-zinc-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={evPublished}
                      onChange={(e) => setEvPublished(e.target.checked)}
                      className="h-4 w-4 text-red-600 rounded"
                    />
                    <span>Publish on Public Website</span>
                  </label>
                  <label className="flex items-center gap-2 text-zinc-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={evRegOpen}
                      onChange={(e) => setEvRegOpen(e.target.checked)}
                      className="h-4 w-4 text-red-600 rounded"
                    />
                    <span>Registrations Open</span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-xs font-semibold uppercase tracking-wider rounded-lg cursor-pointer"
              >
                {saving ? 'Saving Event...' : 'Save & Publish Event'}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'media' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <form
              onSubmit={handleAddMedia}
              className="lg:col-span-5 p-6 bg-[#121216] border border-white/10 rounded-xl space-y-4 text-xs"
            >
              <h2 className="font-display text-xl font-bold uppercase text-white">
                Add Highlight Photo / Video
              </h2>
              <div>
                <label className="block text-zinc-400 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={hlTitle}
                  onChange={(e) => setHlTitle(e.target.value)}
                  placeholder="Golaghat Dusk Sprint Highlight"
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-white/15 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-zinc-400 mb-1">Event Label</label>
                <input
                  type="text"
                  required
                  value={hlEventLabel}
                  onChange={(e) => setHlEventLabel(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-white/15 rounded-lg text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">Category</label>
                  <select
                    value={hlCategory}
                    onChange={(e) => setHlCategory(e.target.value as HighlightCategory)}
                    className="w-full px-3 py-2.5 bg-zinc-950 border border-white/15 rounded-lg text-white"
                  >
                    {[
                      'Highlight Video',
                      'Hiding',
                      'Searching',
                      'Funny Moments',
                      'Running',
                      'Group Photo',
                    ].map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Media Type</label>
                  <select
                    value={hlType}
                    onChange={(e) =>
                      setHlType(e.target.value as 'image' | 'video_embed' | 'video_link')
                    }
                    className="w-full px-3 py-2.5 bg-zinc-950 border border-white/15 rounded-lg text-white"
                  >
                    <option value="video_embed">Embedded Video (YouTube/Vimeo/MP4)</option>
                    <option value="video_link">External Video Link</option>
                    <option value="image">Photograph</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-zinc-400 mb-1">Media URL / Upload Photo</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={hlUrl}
                    onChange={(e) => setHlUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=... or upload image"
                    className="flex-1 px-3.5 py-2.5 bg-zinc-950 border border-white/15 rounded-lg text-white"
                  />
                  {hlType === 'image' && (
                    <label className="px-3 py-2.5 bg-zinc-900 border border-white/15 rounded-lg text-zinc-200 cursor-pointer">
                      Upload
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setHlUrl(await compressImageToDataUrl(file, 900));
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-zinc-400 mb-1">Caption</label>
                <textarea
                  rows={2}
                  value={hlCaption}
                  onChange={(e) => setHlCaption(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-white/15 rounded-lg text-white"
                />
              </div>
              <label className="flex items-start gap-2.5 text-zinc-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hlPermission}
                  onChange={(e) => setHlPermission(e.target.checked)}
                  className="mt-0.5 h-4 w-4 text-red-600 rounded"
                />
                <span>
                  I confirm that permission has been obtained from all featured participants before
                  publishing this footage.
                </span>
              </label>
              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-semibold uppercase tracking-wider rounded-lg cursor-pointer"
              >
                Publish Highlight
              </button>
            </form>

            <div className="lg:col-span-7 space-y-3">
              <h2 className="font-display text-xl font-bold uppercase text-white">
                Published Firestore Highlights ({highlights.length})
              </h2>
              {highlights.length === 0 ? (
                <div className="p-6 bg-[#121216] border border-white/10 rounded-xl text-xs text-zinc-400">
                  No custom highlights added yet. Curated Golaghat archive photos are displayed on
                  the homepage until you publish additional videos or photos here.
                </div>
              ) : (
                highlights.map((h) => (
                  <div
                    key={h.id}
                    className="p-4 bg-[#121216] border border-white/10 rounded-xl flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-mono text-red-400">
                        {h.category} · {h.mediaType}
                      </div>
                      <div className="font-medium text-white truncate">{h.title}</div>
                      <div className="text-xs text-zinc-500 truncate">{h.mediaUrl}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleDeleteMedia(h.id)}
                      aria-label={`Delete ${h.title}`}
                      className="p-2 text-zinc-400 hover:text-red-400 cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'branding' && role === 'PRIMARY_ADMIN' && (
          <form
            onSubmit={handleSaveBrandingAndSettings}
            className="p-6 bg-[#121216] border border-white/10 rounded-xl space-y-6 text-xs max-w-3xl"
          >
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
              <div>
                <h2 className="font-display text-xl font-bold uppercase text-white">
                  Official Morning Miles Club Logo & Settings
                </h2>
                <p className="text-zinc-400 mt-1">
                  Uploading the official club logo updates the Navbar, Homepage, Footer,
                  Registration Confirmation, and Digital Tickets immediately.
                </p>
              </div>
              <ClubLogo logoUrl={logoUrl} size="lg" showWordmark={false} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-zinc-400 mb-1.5">Official Club Logo File</label>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold uppercase tracking-wider rounded-lg cursor-pointer inline-flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Upload Official Logo
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const dataUrl = await compressImageToDataUrl(file, 512);
                        setLogoUrl(dataUrl);
                      }}
                    />
                  </label>
                  {logoUrl && (
                    <button
                      type="button"
                      onClick={() => setLogoUrl('')}
                      className="px-3 py-2 border border-white/15 rounded-lg text-zinc-300 hover:text-white cursor-pointer"
                    >
                      Clear Logo
                    </button>
                  )}
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-zinc-400 mb-1">Club Tagline</label>
                <input
                  type="text"
                  value={clubTagline}
                  onChange={(e) => setClubTagline(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-white/15 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Instagram URL</label>
                <input
                  type="url"
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-white/15 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-zinc-400 mb-1">Location</label>
                <input
                  type="text"
                  value={locationText}
                  onChange={(e) => setLocationText(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-white/15 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-zinc-400 mb-1">Contact Email</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-white/15 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-zinc-400 mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-white/15 rounded-lg text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-zinc-400 mb-1">
                  Additional Event Rules (one per line)
                </label>
                <textarea
                  rows={3}
                  value={customRulesText}
                  onChange={(e) => setCustomRulesText(e.target.value)}
                  placeholder="Wear reflective bands provided at check-in."
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-white/15 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">
                  Optional Google Form Embed URL
                </label>
                <input
                  type="url"
                  value={googleFormEmbedUrl}
                  onChange={(e) => setGoogleFormEmbedUrl(e.target.value)}
                  placeholder="https://docs.google.com/forms/d/e/.../viewform?embedded=true"
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-white/15 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-zinc-400 mb-1">
                  Connected Google Sheet Reference URL
                </label>
                <input
                  type="url"
                  value={googleSheetUrl}
                  onChange={(e) => setGoogleSheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-white/15 rounded-lg text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold uppercase tracking-wider rounded-lg cursor-pointer"
            >
              {saving ? 'Saving Settings...' : 'Save Branding & Settings'}
            </button>
          </form>
        )}
      </div>
    </HostLayout>
  );
};
