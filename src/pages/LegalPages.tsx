import React from 'react';
import { Link } from 'react-router-dom';
import type { BrandingSettings } from '../types';

export const PrivacyPolicyPage: React.FC<{ branding: BrandingSettings }> = ({ branding }) => (
  <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-8">
    <div className="space-y-2 border-b border-white/10 pb-6">
      <p className="text-xs font-mono uppercase tracking-widest text-red-500">
        Morning Miles Club
      </p>
      <h1 className="font-display text-4xl font-bold uppercase text-white">Privacy Policy</h1>
    </div>

    <div className="space-y-6 text-sm text-zinc-300 leading-relaxed">
      <section className="space-y-2">
        <h2 className="font-display text-xl font-bold uppercase text-white">
          1. Minimal Data Collection
        </h2>
        <p>
          Morning Miles Club collects only the details required to organise safe real-world Manhunt
          events in Golaghat: participant full name, age, contact phone number, optional email,
          emergency contact number, and parent/guardian consent for participants under 18.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-xl font-bold uppercase text-white">
          2. Protection of Contact & Emergency Information
        </h2>
        <p>
          Participant phone numbers, emails, and emergency contact details are strictly isolated in
          Firebase Firestore and are never displayed publicly or encoded inside event-day QR codes.
          Only authenticated, authorised Morning Miles Club organisers can access participant lists
          for event operations and safety emergencies.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-xl font-bold uppercase text-white">
          3. Media & Footage Consent
        </h2>
        <p>
          Event photos and videos showcasing participants are published in the Highlights archive
          only after obtaining participant permission.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-xl font-bold uppercase text-white">
          4. Retention & Deletion Requests
        </h2>
        <p>
          Registration and emergency contact records are retained only for event operations,
          accounting reconciliation, and safety audits. Participants may request deletion or
          correction by contacting{' '}
          <span className="text-white">{branding.contactEmail || 'morningmilesclub@gmail.com'}</span>.
        </p>
      </section>
    </div>
  </div>
);

export const TermsPage: React.FC = () => (
  <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-8">
    <div className="space-y-2 border-b border-white/10 pb-6">
      <p className="text-xs font-mono uppercase tracking-widest text-red-500">
        Morning Miles Club
      </p>
      <h1 className="font-display text-4xl font-bold uppercase text-white">
        Terms & Conditions
      </h1>
    </div>

    <div className="space-y-6 text-sm text-zinc-300 leading-relaxed">
      <section className="space-y-2">
        <h2 className="font-display text-xl font-bold uppercase text-white">
          1. Event Entry & Payment Verification
        </h2>
        <p>
          Submitting a registration form reserves a pending entry only. Participation is confirmed
          exclusively after independent server-side verification of the INR entry fee through our
          payment gateway provider.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-xl font-bold uppercase text-white">
          2. Mandatory Rulebook Compliance
        </h2>
        <p>
          All participants must strictly abide by the 14 rules in the{' '}
          <Link to="/rules" className="text-red-400 underline">
            Manhunt Rulebook
          </Link>
          . Organisers reserve the right to remove any participant who enters private residences,
          businesses, restricted areas, or acts unsafely.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-xl font-bold uppercase text-white">
          3. External Gameplay Platform (SCRAM)
        </h2>
        <p>
          Actual hide-and-seek gameplay is hosted through the SCRAM Hide & Seek mobile application.
          Morning Miles Club provides the session game code in person on event day and is not
          responsible for third-party app store availability or personal mobile device battery/data
          connectivity.
        </p>
      </section>
    </div>
  </div>
);
