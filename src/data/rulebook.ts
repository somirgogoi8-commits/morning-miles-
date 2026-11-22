export interface RuleItem {
  number: number;
  title: string;
  description: string;
}

export const OFFICIAL_MANHUNT_RULES: RuleItem[] = [
  {
    number: 1,
    title: 'NO ENTERING RESIDENCES',
    description:
      'Participants must never enter houses, residential buildings, apartments or private residential premises.',
  },
  {
    number: 2,
    title: 'NO HIDING IN SHOPS OR HOTELS',
    description:
      'Hotels, restaurants, shops, offices and other business premises are strictly prohibited hiding locations.',
  },
  {
    number: 3,
    title: 'NO TRESPASSING',
    description:
      'Construction sites, restricted locations and private properties are completely off-limits.',
  },
  {
    number: 4,
    title: 'STAY WITHIN THE GAME AREA',
    description:
      'All participants must remain within the organiser-approved game boundaries. Do not enter busy roads, highways, dangerous areas or restricted zones.',
  },
  {
    number: 5,
    title: 'NO PHYSICAL CONTACT',
    description:
      'Pushing, grabbing, fighting, threatening or deliberately obstructing another participant is prohibited.',
  },
  {
    number: 6,
    title: 'RESPECT THE PUBLIC',
    description:
      'Do not disturb residents, pedestrians, workers, customers or other members of the public.',
  },
  {
    number: 7,
    title: 'FOLLOW ORGANISERS',
    description: "All participants must follow the organising team's instructions.",
  },
  {
    number: 8,
    title: 'EMERGENCY STOP',
    description:
      'If an organiser announces an emergency stop, everyone must immediately stop playing and follow instructions.',
  },
  {
    number: 9,
    title: 'REPORT EMERGENCIES',
    description:
      'Immediately inform organisers about injuries, unsafe conditions or emergencies.',
  },
  {
    number: 10,
    title: 'PARTICIPANT PERMISSION',
    description:
      'Participants under 18 must have appropriate parent or guardian permission.',
  },
  {
    number: 11,
    title: 'NO FALSE EMERGENCY REPORTS',
    description:
      'Never create panic, impersonate authorities or make false emergency announcements.',
  },
  {
    number: 12,
    title: 'FAIR PLAY',
    description:
      "Do not cheat, interfere with another participant's phone or tamper with the SCRAM application.",
  },
  {
    number: 13,
    title: 'SAFE MOVEMENT',
    description:
      'No sprinting into roads, dangerous areas or crowds. Participants must remain aware of their surroundings.',
  },
  {
    number: 14,
    title: 'ORGANISER AUTHORITY',
    description:
      'Organisers may remove participants who violate the rules or create unsafe conditions.',
  },
];

export const HOW_TO_PLAY_STEPS: { step: string; title: string; detail: string }[] = [
  {
    step: '01',
    title: 'Register on the Website',
    detail: 'Participants register on the official Morning Miles Club website and accept the safety rulebook.',
  },
  {
    step: '02',
    title: 'Complete Entry Payment',
    detail: 'Participants complete the required entry fee in INR through the verified payment gateway.',
  },
  {
    step: '03',
    title: 'Automated Verification',
    detail: 'Registration and payment are independently verified via secure server-side payment checks.',
  },
  {
    step: '04',
    title: 'Receive Digital Ticket',
    detail: 'Confirmed participants receive their verified digital ticket with unique event-day QR code.',
  },
  {
    step: '05',
    title: 'Prepare SCRAM App',
    detail: 'Participants install the official SCRAM Hide & Seek mobile application and create an account or log in.',
  },
  {
    step: '06',
    title: 'Event-Day Game Code',
    detail: 'Organisers check participants in at the meeting point and provide the official SCRAM game code on site.',
  },
  {
    step: '07',
    title: 'Join Assigned Session',
    detail: 'Participants enter the game code inside SCRAM to join the designated Morning Miles Club session.',
  },
  {
    step: '08',
    title: 'Safety & Boundary Briefing',
    detail: 'Organisers walk everyone through the active gameplay format, safe zones, and strict boundaries.',
  },
  {
    step: '09',
    title: 'Hide-and-Seek Begins',
    detail: 'The real-world Manhunt game begins across the approved Golaghat game zone.',
  },
  {
    step: '10',
    title: 'Follow Organiser Calls',
    detail: 'Participants follow live game instructions, timer calls, and any organiser safety announcements.',
  },
];

export const SCRAM_DISCLOSURE =
  'Your website registration confirms your event entry. Actual gameplay takes place through the SCRAM Hide & Seek application. The game code will be provided by the organisers on the event day.';

export const CLUB_IMAGES = {
  heroUrban: '/src/assets/images/hero_manhunt_urban_1795368062653.jpg',
  hidingAlley: '/src/assets/images/highlight_hiding_alley_1795368062046.jpg',
  searchingDusk: '/src/assets/images/highlight_searching_dusk_1795368062384.jpg',
  groupGolaghat: '/src/assets/images/highlight_group_golaghat_1795368061716.jpg',
  arenaBanner: '/src/assets/images/event_banner_manhunt_1795368062023.jpg',
};
