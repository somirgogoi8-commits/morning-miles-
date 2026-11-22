import React from 'react';
import { collection, doc, getDoc, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import type { BrandingSettings, ManhuntEvent, MediaHighlight, RulesSettings } from '../types';

interface PublicSiteData {
  events: ManhuntEvent[];
  highlights: MediaHighlight[];
  branding: BrandingSettings;
  customRules: string[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const DEFAULT_BRANDING: BrandingSettings = {
  id: 'branding',
  logoUrl: '',
  clubTagline: 'A community built around fitness, adventure and unforgettable experiences.',
  instagramUrl: 'https://instagram.com/morningmilesclub',
  contactEmail: 'morningmilesclub@gmail.com',
  contactPhone: '+91 98765 00000',
  locationText: 'Golaghat, Assam, India',
};

export function usePublicSiteData(): PublicSiteData {
  const [events, setEvents] = React.useState<ManhuntEvent[]>([]);
  const [highlights, setHighlights] = React.useState<MediaHighlight[]>([]);
  const [branding, setBranding] = React.useState<BrandingSettings>(DEFAULT_BRANDING);
  const [customRules, setCustomRules] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadSettings = React.useCallback(async () => {
    try {
      const [brandSnap, rulesSnap] = await Promise.all([
        getDoc(doc(db, 'siteSettings', 'branding')),
        getDoc(doc(db, 'siteSettings', 'rules')),
      ]);
      if (brandSnap.exists()) {
        setBranding({ ...DEFAULT_BRANDING, ...(brandSnap.data() as BrandingSettings) });
      }
      if (rulesSnap.exists()) {
        const rData = rulesSnap.data() as RulesSettings;
        if (Array.isArray(rData.customRuleOverrides)) {
          setCustomRules(rData.customRuleOverrides);
        }
      }
    } catch {
      // Optional siteSettings doc may not exist until admin saves it; fallback cleanly
    }
  }, []);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const eventsQuery = query(collection(db, 'events'), where('isPublished', '==', true));
      const highlightsQuery = query(
        collection(db, 'mediaHighlights'),
        where('permissionConfirmed', '==', true)
      );

      const [evSnap, hlSnap] = await Promise.all([
        getDocs(eventsQuery).catch((err) => handleFirestoreError(err, OperationType.LIST, 'events')),
        getDocs(highlightsQuery).catch((err) =>
          handleFirestoreError(err, OperationType.LIST, 'mediaHighlights')
        ),
      ]);

      const evList = evSnap.docs
        .map((d) => d.data() as ManhuntEvent)
        .sort((a, b) => a.dateISO.localeCompare(b.dateISO));
      const hlList = hlSnap.docs
        .map((d) => d.data() as MediaHighlight)
        .sort((a, b) => a.sortOrder - b.sortOrder);

      setEvents(evList);
      setHighlights(hlList);
      await loadSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events.');
    } finally {
      setLoading(false);
    }
  }, [loadSettings]);

  React.useEffect(() => {
    void refresh();

    const eventsQuery = query(collection(db, 'events'), where('isPublished', '==', true));
    const unsubEvents = onSnapshot(
      eventsQuery,
      (snap) => {
        const evList = snap.docs
          .map((d) => d.data() as ManhuntEvent)
          .sort((a, b) => a.dateISO.localeCompare(b.dateISO));
        setEvents(evList);
        setLoading(false);
      },
      (err) => {
        console.warn('Events snapshot error:', err.message);
      }
    );

    const unsubBranding = onSnapshot(
      doc(db, 'siteSettings', 'branding'),
      (snap) => {
        if (snap.exists()) {
          setBranding({ ...DEFAULT_BRANDING, ...(snap.data() as BrandingSettings) });
        }
      },
      () => undefined
    );

    return () => {
      unsubEvents();
      unsubBranding();
    };
  }, [refresh]);

  return { events, highlights, branding, customRules, loading, error, refresh };
}
