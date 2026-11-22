import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const PORT = Number(process.env.PORT || 3000);
const NODE_ENV = process.env.NODE_ENV || 'development';
const BOOTSTRAP_PRIMARY_ADMIN = 'somirgogoi8@gmail.com';

interface FirebaseAppletConfig {
  projectId: string;
  firestoreDatabaseId?: string;
}

function loadFirebaseConfig(): FirebaseAppletConfig {
  const configPath = path.resolve('firebase-applet-config.json');
  const raw = fs.readFileSync(configPath, 'utf8');
  return JSON.parse(raw) as FirebaseAppletConfig;
}

const firebaseConfig = loadFirebaseConfig();
const adminApp = getApps().length
  ? getApp()
  : initializeApp({ projectId: firebaseConfig.projectId });
const adminAuth = getAuth(adminApp);

// Keep signing secret in env with safe in-memory fallback (never hardcoded literal)
const TICKET_SIGNING_SECRET =
  process.env.TICKET_SIGNING_SECRET || crypto.randomBytes(32).toString('hex');

interface ServerOrderRecord {
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
  registrationStatus:
    | 'PENDING PAYMENT'
    | 'PAYMENT PROCESSING'
    | 'PAYMENT FAILED'
    | 'CONFIRMED'
    | 'CANCELLED';
  gatewayPaymentId: string;
  method: string;
  verifiedByWebhook: boolean;
  reconciledBy: string;
  reconciliationNote: string;
  receiptAccessTokenHash: string;
  qrPayload: string;
  checkedIn: boolean;
  checkedInAt: string;
  checkedInBy: string;
  createdAt: string;
  updatedAt: string;
}

interface HostRecord {
  email: string;
  role: 'PRIMARY_ADMIN' | 'EVENT_HOST';
  active: boolean;
  assignedEventIds: string[];
}

interface ServerLedgerState {
  orders: Record<string, ServerOrderRecord>;
  processedWebhookEvents: string[];
  hosts: Record<string, HostRecord>;
}

const DATA_DIR = path.resolve('data');
const LEDGER_PATH = path.resolve(DATA_DIR, 'server-ledger.json');

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadLedger(): ServerLedgerState {
  ensureDataDir();
  if (!fs.existsSync(LEDGER_PATH)) {
    return {
      orders: {},
      processedWebhookEvents: [],
      hosts: {
        [BOOTSTRAP_PRIMARY_ADMIN]: {
          email: BOOTSTRAP_PRIMARY_ADMIN,
          role: 'PRIMARY_ADMIN',
          active: true,
          assignedEventIds: [],
        },
      },
    };
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8')) as ServerLedgerState;
    if (!parsed.hosts) parsed.hosts = {};
    parsed.hosts[BOOTSTRAP_PRIMARY_ADMIN] = {
      email: BOOTSTRAP_PRIMARY_ADMIN,
      role: 'PRIMARY_ADMIN',
      active: true,
      assignedEventIds: [],
    };
    return parsed;
  } catch {
    return {
      orders: {},
      processedWebhookEvents: [],
      hosts: {
        [BOOTSTRAP_PRIMARY_ADMIN]: {
          email: BOOTSTRAP_PRIMARY_ADMIN,
          role: 'PRIMARY_ADMIN',
          active: true,
          assignedEventIds: [],
        },
      },
    };
  }
}

let ledgerState: ServerLedgerState = loadLedger();

function saveLedger(): void {
  ensureDataDir();
  const tmpPath = `${LEDGER_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(ledgerState, null, 2), 'utf8');
  fs.renameSync(tmpPath, LEDGER_PATH);
}

function sha256Hex(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function signTicketQrPayload(registrationId: string, eventId: string): string {
  const payloadObj = { rid: registrationId, eid: eventId, v: 1 };
  const payloadB64 = Buffer.from(JSON.stringify(payloadObj), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', TICKET_SIGNING_SECRET)
    .update(payloadB64)
    .digest('base64url')
    .slice(0, 24);
  return `MMC1.${payloadB64}.${sig}`;
}

function verifyTicketQrPayload(token: string): { valid: boolean; rid?: string; eid?: string; reason?: string } {
  const parts = token.trim().split('.');
  if (parts.length !== 3 || parts[0] !== 'MMC1') {
    return { valid: false, reason: 'Unrecognized ticket QR format.' };
  }
  const [, payloadB64, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', TICKET_SIGNING_SECRET)
    .update(payloadB64)
    .digest('base64url')
    .slice(0, 24);
  const sigBuf = Buffer.from(sig, 'utf8');
  const expBuf = Buffer.from(expectedSig, 'utf8');
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return { valid: false, reason: 'Invalid or tampered ticket signature.' };
  }
  try {
    const parsed = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as {
      rid?: string;
      eid?: string;
    };
    if (!parsed.rid || !parsed.eid) {
      return { valid: false, reason: 'Incomplete ticket payload.' };
    }
    return { valid: true, rid: parsed.rid, eid: parsed.eid };
  } catch {
    return { valid: false, reason: 'Corrupted ticket payload.' };
  }
}

function isValidSafeString(val: unknown, min: number, max: number): val is string {
  return typeof val === 'string' && val.trim().length >= min && val.trim().length <= max;
}

function isValidId(val: unknown): val is string {
  return typeof val === 'string' && /^[a-zA-Z0-9_-]{2,128}$/.test(val);
}

function isAllowedGoogleWebhookUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      host.startsWith('169.254.')
    ) {
      return false;
    }
    return host === 'script.google.com' || host === 'script.googleusercontent.com';
  } catch {
    return false;
  }
}

async function notifyGoogleSheetsIfConfigured(order: ServerOrderRecord): Promise<void> {
  const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL?.trim();
  if (!webhookUrl || !isAllowedGoogleWebhookUrl(webhookUrl)) return;
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        registrationId: order.registrationId,
        eventId: order.eventId,
        eventTitle: order.eventTitle,
        participantName: order.participantName,
        amountInr: order.amountInr,
        gatewayPaymentId: order.gatewayPaymentId,
        orderId: order.orderId,
        status: order.registrationStatus,
        verifiedAt: order.updatedAt,
      }),
    });
  } catch {
    // Non-blocking optional Google Sheets sync
  }
}

interface VerifiedAdmin {
  uid: string;
  email: string;
  role: 'PRIMARY_ADMIN' | 'EVENT_HOST';
  assignedEventIds: string[];
}

async function requireVerifiedAdmin(
  req: express.Request,
  res: express.Response
): Promise<VerifiedAdmin | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing Authorization Bearer token.' });
    return null;
  }
  const idToken = authHeader.slice('Bearer '.length).trim();
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    const email = (decoded.email || '').trim().toLowerCase();
    if (!email || decoded.email_verified !== true) {
      res.status(403).json({ error: 'Verified email required for host access.' });
      return null;
    }
    const hostRecord = ledgerState.hosts[email];
    if (email === BOOTSTRAP_PRIMARY_ADMIN) {
      return {
        uid: decoded.uid,
        email,
        role: 'PRIMARY_ADMIN',
        assignedEventIds: [],
      };
    }
    if (!hostRecord || !hostRecord.active) {
      res.status(403).json({ error: 'Account is not authorised as a Morning Miles Club host.' });
      return null;
    }
    return {
      uid: decoded.uid,
      email,
      role: hostRecord.role,
      assignedEventIds: hostRecord.assignedEventIds || [],
    };
  } catch {
    res.status(401).json({ error: 'Invalid or expired Firebase authentication token.' });
    return null;
  }
}

function getRazorpayCredentials(): { keyId: string; keySecret: string } | null {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim() || '';
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim() || '';
  if (!keyId || !keySecret) return null;
  return { keyId, keySecret };
}

async function startServer(): Promise<void> {
  const app = express();
  app.set('trust proxy', 1);

  // Baseline security headers without blocking AI Studio iframe or Razorpay script
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  const publicApiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please wait a moment and try again.' },
  });

  const adminApiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Admin API rate limit reached. Please retry shortly.' },
  });

  // Razorpay Webhook MUST receive raw body for HMAC verification
  app.post(
    '/api/webhooks/razorpay',
    express.raw({ type: 'application/json', limit: '256kb' }),
    async (req, res) => {
      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
      if (!webhookSecret) {
        res.status(503).json({ error: 'Webhook secret not configured.' });
        return;
      }

      const signature = String(req.headers['x-razorpay-signature'] || '');
      const rawBody = req.body instanceof Buffer ? req.body : Buffer.from('');
      if (!signature || rawBody.length === 0) {
        res.status(400).json({ error: 'Missing signature or body.' });
        return;
      }

      const expected = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      const sigBuf = Buffer.from(signature, 'utf8');
      const expBuf = Buffer.from(expected, 'utf8');
      if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
        res.status(401).json({ error: 'Invalid Razorpay webhook signature.' });
        return;
      }

      try {
        const eventIdHeader = String(req.headers['x-razorpay-event-id'] || '');
        const payload = JSON.parse(rawBody.toString('utf8')) as {
          event?: string;
          payload?: {
            payment?: {
              entity?: {
                id?: string;
                order_id?: string;
                amount?: number;
                currency?: string;
                status?: string;
                method?: string;
              };
            };
          };
        };

        const paymentEntity = payload.payload?.payment?.entity;
        const dedupKey = eventIdHeader || `${payload.event || ''}:${paymentEntity?.id || ''}`;
        if (dedupKey && ledgerState.processedWebhookEvents.includes(dedupKey)) {
          res.status(200).json({ status: 'already_processed' });
          return;
        }

        if (paymentEntity?.order_id) {
          const matchingOrder = Object.values(ledgerState.orders).find(
            (o) => o.orderId === paymentEntity.order_id
          );

          if (matchingOrder) {
            const now = new Date().toISOString();
            if (
              (payload.event === 'payment.captured' || payload.event === 'order.paid') &&
              paymentEntity.currency === 'INR' &&
              paymentEntity.amount === matchingOrder.amountPaise &&
              paymentEntity.status === 'captured'
            ) {
              if (matchingOrder.status !== 'VERIFIED') {
                matchingOrder.status = 'VERIFIED';
                matchingOrder.registrationStatus = 'CONFIRMED';
                matchingOrder.gatewayPaymentId = paymentEntity.id || '';
                matchingOrder.method = paymentEntity.method || 'upi';
                matchingOrder.verifiedByWebhook = true;
                matchingOrder.qrPayload = signTicketQrPayload(
                  matchingOrder.registrationId,
                  matchingOrder.eventId
                );
                matchingOrder.updatedAt = now;
                await notifyGoogleSheetsIfConfigured(matchingOrder);
              }
            } else if (payload.event === 'payment.failed') {
              if (matchingOrder.status !== 'VERIFIED') {
                matchingOrder.status = 'FAILED';
                matchingOrder.registrationStatus = 'PAYMENT FAILED';
                matchingOrder.gatewayPaymentId = paymentEntity.id || '';
                matchingOrder.updatedAt = now;
              }
            }
          }
        }

        if (dedupKey) {
          ledgerState.processedWebhookEvents.push(dedupKey);
          if (ledgerState.processedWebhookEvents.length > 5000) {
            ledgerState.processedWebhookEvents = ledgerState.processedWebhookEvents.slice(-2500);
          }
        }
        saveLedger();
        res.status(200).json({ status: 'ok' });
      } catch {
        res.status(400).json({ error: 'Malformed webhook payload.' });
      }
    }
  );

  app.use(express.json({ limit: '512kb' }));

  // Public payment gateway configuration check (never returns secret keys!)
  app.get('/api/payments/config-status', (_req, res) => {
    const creds = getRazorpayCredentials();
    res.json({
      provider: 'Razorpay',
      configured: Boolean(creds),
      webhookConfigured: Boolean(process.env.RAZORPAY_WEBHOOK_SECRET?.trim()),
      currency: 'INR',
      keyId: creds ? creds.keyId : null,
    });
  });

  // Create Razorpay order linked to Registration ID
  app.post('/api/payments/create-order', publicApiLimiter, async (req, res) => {
    const {
      registrationId,
      eventId,
      eventTitle,
      eventDate,
      meetingPoint,
      participantName,
      amountInr,
      phone,
    } = req.body as Record<string, unknown>;

    if (
      !isValidId(registrationId) ||
      !isValidId(eventId) ||
      !isValidSafeString(eventTitle, 2, 140) ||
      !isValidSafeString(eventDate, 4, 40) ||
      !isValidSafeString(meetingPoint, 2, 240) ||
      !isValidSafeString(participantName, 2, 100) ||
      !isValidSafeString(phone, 10, 20) ||
      typeof amountInr !== 'number' ||
      !Number.isFinite(amountInr) ||
      amountInr < 1 ||
      amountInr > 50000
    ) {
      res.status(400).json({ error: 'Invalid registration or amount details.' });
      return;
    }

    const creds = getRazorpayCredentials();
    if (!creds) {
      res.status(503).json({
        configured: false,
        error:
          'Razorpay payment gateway keys (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET) are not configured on the server yet. Your registration is saved as PENDING PAYMENT.',
      });
      return;
    }

    const existingOrder = ledgerState.orders[registrationId];
    if (existingOrder && existingOrder.status === 'VERIFIED') {
      res.status(409).json({ error: 'Payment for this registration is already verified.' });
      return;
    }

    const amountPaise = Math.round(amountInr * 100);
    const digits = phone.replace(/\D/g, '');
    const phoneLast4 = digits.slice(-4);
    const receiptAccessToken = crypto.randomBytes(18).toString('hex');
    const now = new Date().toISOString();

    try {
      const authBasic = Buffer.from(`${creds.keyId}:${creds.keySecret}`).toString('base64');
      const rzpResponse = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authBasic}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amountPaise,
          currency: 'INR',
          receipt: registrationId,
          notes: {
            registrationId,
            eventId,
            club: 'Morning Miles Club',
          },
        }),
      });

      if (!rzpResponse.ok) {
        const errText = await rzpResponse.text();
        res.status(502).json({
          error: `Payment gateway order creation failed (${rzpResponse.status}).`,
          details: errText.slice(0, 200),
        });
        return;
      }

      const rzpOrder = (await rzpResponse.json()) as {
        id: string;
        amount: number;
        currency: string;
      };

      const record: ServerOrderRecord = {
        orderId: rzpOrder.id,
        registrationId,
        eventId,
        eventTitle: eventTitle.trim(),
        eventDate: eventDate.trim(),
        meetingPoint: meetingPoint.trim(),
        participantName: participantName.trim(),
        phoneLast4,
        amountInr,
        amountPaise: rzpOrder.amount,
        currency: 'INR',
        status: 'CREATED',
        registrationStatus: 'PENDING PAYMENT',
        gatewayPaymentId: '',
        method: '',
        verifiedByWebhook: false,
        reconciledBy: '',
        reconciliationNote: '',
        receiptAccessTokenHash: sha256Hex(receiptAccessToken),
        qrPayload: '',
        checkedIn: false,
        checkedInAt: '',
        checkedInBy: '',
        createdAt: now,
        updatedAt: now,
      };

      ledgerState.orders[registrationId] = record;
      saveLedger();

      res.json({
        configured: true,
        orderId: rzpOrder.id,
        amountPaise: rzpOrder.amount,
        currency: 'INR',
        keyId: creds.keyId,
        receiptAccessToken,
      });
    } catch {
      res.status(502).json({ error: 'Unable to reach Razorpay Orders API.' });
    }
  });

  // Independent server-side verification after Razorpay checkout callback
  app.post('/api/payments/verify', publicApiLimiter, async (req, res) => {
    const {
      registrationId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body as Record<string, unknown>;

    if (
      !isValidId(registrationId) ||
      !isValidSafeString(razorpay_order_id, 6, 128) ||
      !isValidSafeString(razorpay_payment_id, 6, 128) ||
      !isValidSafeString(razorpay_signature, 16, 256)
    ) {
      res.status(400).json({ error: 'Missing payment verification parameters.' });
      return;
    }

    const creds = getRazorpayCredentials();
    if (!creds) {
      res.status(503).json({ error: 'Payment gateway not configured on server.' });
      return;
    }

    const order = ledgerState.orders[registrationId];
    if (!order || order.orderId !== razorpay_order_id) {
      res.status(404).json({ error: 'Matching payment order not found.' });
      return;
    }

    if (order.status === 'VERIFIED') {
      res.json({
        verified: true,
        registrationStatus: order.registrationStatus,
        qrPayload: order.qrPayload,
        gatewayPaymentId: order.gatewayPaymentId,
      });
      return;
    }

    // 1. Verify HMAC-SHA256 signature from Razorpay
    const expectedSignature = crypto
      .createHmac('sha256', creds.keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    const sigBuf = Buffer.from(razorpay_signature, 'utf8');
    const expBuf = Buffer.from(expectedSignature, 'utf8');
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      res.status(400).json({ error: 'Payment signature verification failed.' });
      return;
    }

    // 2. Independently query Razorpay Payments API to confirm status & amount
    try {
      const authBasic = Buffer.from(`${creds.keyId}:${creds.keySecret}`).toString('base64');
      const rzpRes = await fetch(
        `https://api.razorpay.com/v1/payments/${encodeURIComponent(razorpay_payment_id)}`,
        {
          headers: { Authorization: `Basic ${authBasic}` },
        }
      );

      if (!rzpRes.ok) {
        res.status(502).json({ error: 'Failed to independently verify payment with Razorpay.' });
        return;
      }

      const paymentData = (await rzpRes.json()) as {
        id: string;
        order_id: string;
        amount: number;
        currency: string;
        status: string;
        method?: string;
      };

      if (
        paymentData.order_id !== order.orderId ||
        paymentData.currency !== 'INR' ||
        paymentData.amount !== order.amountPaise ||
        (paymentData.status !== 'captured' && paymentData.status !== 'authorized')
      ) {
        order.status = 'FAILED';
        order.registrationStatus = 'PAYMENT FAILED';
        order.updatedAt = new Date().toISOString();
        saveLedger();
        res.status(400).json({
          error: 'Transaction amount, order, or capture status did not match expected values.',
        });
        return;
      }

      // Capture if only authorized
      if (paymentData.status === 'authorized') {
        const capRes = await fetch(
          `https://api.razorpay.com/v1/payments/${encodeURIComponent(razorpay_payment_id)}/capture`,
          {
            method: 'POST',
            headers: {
              Authorization: `Basic ${authBasic}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ amount: order.amountPaise, currency: 'INR' }),
          }
        );
        if (!capRes.ok) {
          order.status = 'PROCESSING';
          order.registrationStatus = 'PAYMENT PROCESSING';
          order.updatedAt = new Date().toISOString();
          saveLedger();
          res.status(202).json({
            verified: false,
            registrationStatus: 'PAYMENT PROCESSING',
            message: 'Payment authorized and awaiting capture confirmation.',
          });
          return;
        }
      }

      order.status = 'VERIFIED';
      order.registrationStatus = 'CONFIRMED';
      order.gatewayPaymentId = paymentData.id;
      order.method = paymentData.method || 'upi';
      order.qrPayload = signTicketQrPayload(order.registrationId, order.eventId);
      order.updatedAt = new Date().toISOString();
      saveLedger();
      await notifyGoogleSheetsIfConfigured(order);

      res.json({
        verified: true,
        registrationStatus: order.registrationStatus,
        qrPayload: order.qrPayload,
        gatewayPaymentId: order.gatewayPaymentId,
      });
    } catch {
      res.status(502).json({ error: 'Network error verifying transaction with Razorpay.' });
    }
  });

  // Secure participant ticket lookup (never exposes phone, email, or emergency contacts)
  app.post('/api/tickets/lookup', publicApiLimiter, (req, res) => {
    const { registrationId, phoneLast4, receiptAccessToken } = req.body as Record<string, unknown>;
    if (!isValidId(registrationId)) {
      res.status(400).json({ error: 'Valid Registration ID is required.' });
      return;
    }

    const order = ledgerState.orders[registrationId];
    if (!order) {
      res.status(404).json({
        error:
          'No verified payment ticket found for this Registration ID yet. If you just completed payment, please allow a few moments for verification or contact the organisers.',
      });
      return;
    }

    const tokenMatches =
      typeof receiptAccessToken === 'string' &&
      receiptAccessToken.length > 10 &&
      sha256Hex(receiptAccessToken) === order.receiptAccessTokenHash;

    const phoneMatches =
      typeof phoneLast4 === 'string' &&
      /^\d{4}$/.test(phoneLast4.trim()) &&
      phoneLast4.trim() === order.phoneLast4;

    if (!tokenMatches && !phoneMatches) {
      res.status(403).json({
        error: 'Please enter the last 4 digits of your registered phone number to view this ticket.',
      });
      return;
    }

    res.json({
      registrationId: order.registrationId,
      eventId: order.eventId,
      eventTitle: order.eventTitle,
      eventDate: order.eventDate,
      meetingPoint: order.meetingPoint,
      participantName: order.participantName,
      amountInr: order.amountInr,
      paymentStatus: order.status,
      registrationStatus: order.registrationStatus,
      gatewayPaymentId: order.gatewayPaymentId,
      qrPayload: order.registrationStatus === 'CONFIRMED' ? order.qrPayload : null,
      checkedIn: order.checkedIn,
    });
  });

  // ---------------------------------------------------------------------------
  // Protected Host & Admin Routes (Firebase ID Token + Role Verification)
  // ---------------------------------------------------------------------------

  app.post('/api/admin/session', adminApiLimiter, async (req, res) => {
    const admin = await requireVerifiedAdmin(req, res);
    if (!admin) return;
    res.json({
      authenticated: true,
      email: admin.email,
      role: admin.role,
      assignedEventIds: admin.assignedEventIds,
    });
  });

  app.get('/api/admin/ledger', adminApiLimiter, async (req, res) => {
    const admin = await requireVerifiedAdmin(req, res);
    if (!admin) return;
    const orders = Object.values(ledgerState.orders).filter(
      (o) => admin.role === 'PRIMARY_ADMIN' || admin.assignedEventIds.includes(o.eventId)
    );
    res.json({ orders });
  });

  // Primary Admin syncs host directory from Firestore /host/team to backend verifier
  app.post('/api/admin/hosts/sync', adminApiLimiter, async (req, res) => {
    const admin = await requireVerifiedAdmin(req, res);
    if (!admin) return;
    if (admin.role !== 'PRIMARY_ADMIN') {
      res.status(403).json({ error: 'Only Primary Administrators can manage host permissions.' });
      return;
    }

    const { hosts } = req.body as { hosts?: HostRecord[] };
    if (!Array.isArray(hosts) || hosts.length > 100) {
      res.status(400).json({ error: 'Invalid host list payload.' });
      return;
    }

    const nextHosts: Record<string, HostRecord> = {
      [BOOTSTRAP_PRIMARY_ADMIN]: {
        email: BOOTSTRAP_PRIMARY_ADMIN,
        role: 'PRIMARY_ADMIN',
        active: true,
        assignedEventIds: [],
      },
    };

    for (const h of hosts) {
      if (
        h &&
        typeof h.email === 'string' &&
        h.email.includes('@') &&
        (h.role === 'PRIMARY_ADMIN' || h.role === 'EVENT_HOST') &&
        typeof h.active === 'boolean'
      ) {
        const normEmail = h.email.trim().toLowerCase();
        if (normEmail === BOOTSTRAP_PRIMARY_ADMIN) continue;
        nextHosts[normEmail] = {
          email: normEmail,
          role: h.role,
          active: h.active,
          assignedEventIds: Array.isArray(h.assignedEventIds)
            ? h.assignedEventIds.filter((id): id is string => typeof id === 'string').slice(0, 50)
            : [],
        };
      }
    }

    ledgerState.hosts = nextHosts;
    saveLedger();
    res.json({ synced: Object.keys(nextHosts).length });
  });

  // Primary Admin authorised reconciliation for verified gateway references
  app.post('/api/admin/payments/reconcile', adminApiLimiter, async (req, res) => {
    const admin = await requireVerifiedAdmin(req, res);
    if (!admin) return;
    if (admin.role !== 'PRIMARY_ADMIN') {
      res.status(403).json({ error: 'Only Primary Administrators can reconcile payments.' });
      return;
    }

    const {
      registrationId,
      eventId,
      eventTitle,
      eventDate,
      meetingPoint,
      participantName,
      phoneLast4,
      amountInr,
      gatewayPaymentId,
      reconciliationNote,
    } = req.body as Record<string, unknown>;

    if (
      !isValidId(registrationId) ||
      !isValidId(eventId) ||
      !isValidSafeString(eventTitle, 2, 140) ||
      !isValidSafeString(participantName, 2, 100) ||
      !isValidSafeString(gatewayPaymentId, 4, 128) ||
      !isValidSafeString(reconciliationNote, 5, 500) ||
      typeof amountInr !== 'number' ||
      amountInr < 0
    ) {
      res.status(400).json({
        error: 'Gateway Transaction ID and a reconciliation audit note (min 5 chars) are required.',
      });
      return;
    }

    const now = new Date().toISOString();
    const existing = ledgerState.orders[registrationId];
    const qrPayload = signTicketQrPayload(registrationId, eventId);

    const record: ServerOrderRecord = {
      orderId: existing?.orderId || `RECON_${registrationId}`,
      registrationId,
      eventId,
      eventTitle: eventTitle.trim(),
      eventDate: typeof eventDate === 'string' ? eventDate : existing?.eventDate || '',
      meetingPoint: typeof meetingPoint === 'string' ? meetingPoint : existing?.meetingPoint || '',
      participantName: participantName.trim(),
      phoneLast4: typeof phoneLast4 === 'string' ? phoneLast4.slice(-4) : existing?.phoneLast4 || '0000',
      amountInr,
      amountPaise: Math.round(amountInr * 100),
      currency: 'INR',
      status: 'RECONCILED',
      registrationStatus: 'CONFIRMED',
      gatewayPaymentId: gatewayPaymentId.trim(),
      method: 'reconciled',
      verifiedByWebhook: false,
      reconciledBy: admin.email,
      reconciliationNote: reconciliationNote.trim(),
      receiptAccessTokenHash: existing?.receiptAccessTokenHash || '',
      qrPayload,
      checkedIn: existing?.checkedIn || false,
      checkedInAt: existing?.checkedInAt || '',
      checkedInBy: existing?.checkedInBy || '',
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    ledgerState.orders[registrationId] = record;
    saveLedger();
    await notifyGoogleSheetsIfConfigured(record);

    res.json({
      reconciled: true,
      order: record,
    });
  });

  // Event-Day QR Check-In Verification
  app.post('/api/admin/check-in', adminApiLimiter, async (req, res) => {
    const admin = await requireVerifiedAdmin(req, res);
    if (!admin) return;

    const { qrOrRegistrationId, expectedEventId } = req.body as {
      qrOrRegistrationId?: string;
      expectedEventId?: string;
    };

    if (!isValidSafeString(qrOrRegistrationId, 3, 512)) {
      res.status(400).json({ approved: false, reason: 'Empty or invalid QR code / Registration ID.' });
      return;
    }

    let regId = qrOrRegistrationId.trim();
    let tokenEventId: string | undefined;

    if (regId.startsWith('MMC1.')) {
      const verifiedQr = verifyTicketQrPayload(regId);
      if (!verifiedQr.valid || !verifiedQr.rid || !verifiedQr.eid) {
        res.status(400).json({
          approved: false,
          reason: verifiedQr.reason || 'QR code signature verification failed.',
        });
        return;
      }
      regId = verifiedQr.rid;
      tokenEventId = verifiedQr.eid;
    }

    if (expectedEventId && tokenEventId && tokenEventId !== expectedEventId) {
      res.status(409).json({
        approved: false,
        registrationId: regId,
        reason: `Ticket belongs to another event (${tokenEventId}), not the selected event (${expectedEventId}).`,
      });
      return;
    }

    const order = ledgerState.orders[regId];
    if (!order) {
      res.status(404).json({
        approved: false,
        registrationId: regId,
        reason: 'No verified payment record found for this Registration ID.',
      });
      return;
    }

    if (admin.role === 'EVENT_HOST' && !admin.assignedEventIds.includes(order.eventId)) {
      res.status(403).json({
        approved: false,
        registrationId: regId,
        reason: 'You are not assigned as a host for this event.',
      });
      return;
    }

    if (expectedEventId && order.eventId !== expectedEventId) {
      res.status(409).json({
        approved: false,
        registrationId: regId,
        reason: `Registration ${regId} is for ${order.eventTitle}, not the selected event.`,
      });
      return;
    }

    if (order.registrationStatus !== 'CONFIRMED' || (order.status !== 'VERIFIED' && order.status !== 'RECONCILED')) {
      res.status(409).json({
        approved: false,
        registrationId: regId,
        participantName: order.participantName,
        reason: `Entry denied: Registration status is ${order.registrationStatus} (payment ${order.status}).`,
      });
      return;
    }

    if (order.checkedIn) {
      res.status(409).json({
        approved: false,
        alreadyCheckedIn: true,
        registrationId: regId,
        participantName: order.participantName,
        checkedInAt: order.checkedInAt,
        checkedInBy: order.checkedInBy,
        reason: `Duplicate scan blocked: ${order.participantName} already checked in at ${new Date(
          order.checkedInAt
        ).toLocaleTimeString('en-IN')}.`,
      });
      return;
    }

    const now = new Date().toISOString();
    order.checkedIn = true;
    order.checkedInAt = now;
    order.checkedInBy = admin.email;
    order.updatedAt = now;
    saveLedger();

    res.json({
      approved: true,
      registrationId: order.registrationId,
      eventId: order.eventId,
      eventTitle: order.eventTitle,
      participantName: order.participantName,
      paymentStatus: order.status,
      checkedInAt: now,
      checkedInBy: admin.email,
    });
  });

  // Issue signed QR ticket when an admin inspects a confirmed Firestore record
  app.post('/api/admin/tickets/sign', adminApiLimiter, async (req, res) => {
    const admin = await requireVerifiedAdmin(req, res);
    if (!admin) return;
    const { registrationId, eventId } = req.body as { registrationId?: string; eventId?: string };
    if (!isValidId(registrationId) || !isValidId(eventId)) {
      res.status(400).json({ error: 'Invalid IDs.' });
      return;
    }
    const order = ledgerState.orders[registrationId];
    if (!order || order.registrationStatus !== 'CONFIRMED') {
      res.status(409).json({ error: 'Ticket can only be signed for server-confirmed registrations.' });
      return;
    }
    res.json({ qrPayload: order.qrPayload || signTicketQrPayload(registrationId, eventId) });
  });

  if (NODE_ENV === 'production') {
    const distDir = path.resolve('dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distDir, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Morning Miles Club server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Morning Miles Club server:', err);
  process.exit(1);
});
