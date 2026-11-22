export type RegistrationStatus =
  | 'PENDING PAYMENT'
  | 'PAYMENT PROCESSING'
  | 'PAYMENT FAILED'
  | 'CONFIRMED'
  | 'CANCELLED';

export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'FAILED' | 'VERIFIED' | 'RECONCILED';

export type AdminRole = 'PRIMARY_ADMIN' | 'EVENT_HOST';

export interface ManhuntEvent {
  id: string;
  title: string;
  subtitle?: string;
  dateISO: string;
  reportingTime: string;
  startingTime: string;
  meetingPoint: string;
  boundaries: string;
  entryFeeInr: number;
  prizeDetails?: string;
  capacity: number;
  confirmedCount: number;
  registrationOpen: boolean;
  registrationOpensAt?: string;
  registrationClosesAt?: string;
  isPublished: boolean;
  safetyNotes?: string;
  scramNotes?: string;
  bannerUrl?: string;
  createdBy?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ParticipantRegistration {
  registrationId: string;
  eventId: string;
  eventTitle: string;
  fullName: string;
  age: number;
  phone: string;
  email?: string;
  emergencyContact: string;
  isMinor: boolean;
  guardianName?: string;
  guardianPhone?: string;
  guardianPermission: boolean;
  rulesAccepted: boolean;
  conditionsAccepted: boolean;
  status: RegistrationStatus;
  paymentStatus: PaymentStatus;
  amountInr: number;
  paymentOrderId?: string;
  paymentTransactionId?: string;
  checkedIn: boolean;
  checkedInAt?: string;
  checkedInBy?: string;
  phoneLockId: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface PaymentRecord {
  paymentId: string;
  orderId: string;
  registrationId: string;
  eventId: string;
  participantName: string;
  amountInr: number;
  currency: 'INR';
  status: 'CREATED' | 'PROCESSING' | 'VERIFIED' | 'FAILED' | 'RECONCILED';
  method?: string;
  gatewayPaymentId?: string;
  verifiedByWebhook: boolean;
  reconciliationNote?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type HighlightCategory =
  | 'Hiding'
  | 'Searching'
  | 'Funny Moments'
  | 'Running'
  | 'Group Photo'
  | 'Highlight Video';

export interface MediaHighlight {
  id: string;
  title: string;
  eventLabel: string;
  category: HighlightCategory;
  mediaType: 'image' | 'video_embed' | 'video_link';
  mediaUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  permissionConfirmed: boolean;
  sortOrder: number;
  createdAt?: unknown;
}

export interface AdminUserRecord {
  email: string;
  displayName: string;
  role: AdminRole;
  active: boolean;
  assignedEventIds: string[];
  createdBy?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface BrandingSettings {
  id: 'branding';
  logoUrl?: string;
  clubTagline?: string;
  instagramUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  locationText?: string;
  updatedBy?: string;
  updatedAt?: unknown;
}

export interface RulesSettings {
  id: 'rules';
  customRuleOverrides?: string[];
  updatedBy?: string;
  updatedAt?: unknown;
}

export interface IntegrationSettings {
  id: 'integrations';
  googleFormEmbedUrl?: string;
  googleSheetUrl?: string;
  updatedBy?: string;
  updatedAt?: unknown;
}

export interface AuditLogEntry {
  id: string;
  actorEmail: string;
  actorRole: AdminRole;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  timestamp?: unknown;
}

export interface ServerOrderLedgerEntry {
  orderId: string;
  registrationId: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  meetingPoint: string;
  participantName: string;
  phoneLast4: string;
  amountInr: number;
  amountPaise: number;
  currency: 'INR';
  status: 'CREATED' | 'PROCESSING' | 'VERIFIED' | 'FAILED' | 'RECONCILED';
  registrationStatus: RegistrationStatus;
  gatewayPaymentId: string;
  method: string;
  verifiedByWebhook: boolean;
  reconciledBy: string;
  reconciliationNote: string;
  qrPayload: string;
  checkedIn: boolean;
  checkedInAt: string;
  checkedInBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface VerifiedTicketData {
  registrationId: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  meetingPoint: string;
  participantName: string;
  amountInr: number;
  paymentStatus: string;
  registrationStatus: RegistrationStatus;
  gatewayPaymentId?: string;
  qrPayload: string | null;
  checkedIn: boolean;
}
