import React from 'react';
import {
  onAuthStateChanged,
  signOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  auth,
  BOOTSTRAP_PRIMARY_ADMIN_EMAIL,
  db,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import type {
  AdminRole,
  AdminUserRecord,
  AuditLogEntry,
  ManhuntEvent,
  MediaHighlight,
  ParticipantRegistration,
  PaymentRecord,
  ServerOrderLedgerEntry,
} from '../types';

interface HostAuthContextValue {
  user: User | null;
  authLoading: boolean;
  isAuthorized: boolean;
  role: AdminRole | null;
  assignedEventIds: string[];
  authError: string | null;
  selectedEventId: string;
  setSelectedEventId: (id: string) => void;
  events: ManhuntEvent[];
  registrations: ParticipantRegistration[];
  payments: PaymentRecord[];
  serverOrders: ServerOrderLedgerEntry[];
  highlights: MediaHighlight[];
  admins: AdminUserRecord[];
  auditLogs: AuditLogEntry[];
  dataLoading: boolean;
  refreshPortalData: () => Promise<void>;
  syncServerLedgerToFirestore: () => Promise<{ updated: number }>;
  logAudit: (action: string, targetType: string, targetId: string, details: string) => Promise<void>;
  getIdToken: () => Promise<string | null>;
  logout: () => Promise<void>;
}

const HostAuthContext = React.createContext<HostAuthContextValue | null>(null);

export const HostAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = React.useState<User | null>(null);
  const [authLoading, setAuthLoading] = React.useState(true);
  const [isAuthorized, setIsAuthorized] = React.useState(false);
  const [role, setRole] = React.useState<AdminRole | null>(null);
  const [assignedEventIds, setAssignedEventIds] = React.useState<string[]>([]);
  const [authError, setAuthError] = React.useState<string | null>(null);

  const [selectedEventId, setSelectedEventId] = React.useState<string>('ALL');
  const [events, setEvents] = React.useState<ManhuntEvent[]>([]);
  const [registrations, setRegistrations] = React.useState<ParticipantRegistration[]>([]);
  const [payments, setPayments] = React.useState<PaymentRecord[]>([]);
  const [serverOrders, setServerOrders] = React.useState<ServerOrderLedgerEntry[]>([]);
  const [highlights, setHighlights] = React.useState<MediaHighlight[]>([]);
  const [admins, setAdmins] = React.useState<AdminUserRecord[]>([]);
  const [auditLogs, setAuditLogs] = React.useState<AuditLogEntry[]>([]);
  const [dataLoading, setDataLoading] = React.useState(false);

  const verifyUserRole = React.useCallback(async (firebaseUser: User | null) => {
    if (!firebaseUser) {
      setIsAuthorized(false);
      setRole(null);
      setAssignedEventIds([]);
      setAuthError(null);
      setAuthLoading(false);
      return;
    }

    const email = (firebaseUser.email || '').trim().toLowerCase();
    if (!email || !firebaseUser.emailVerified) {
      setIsAuthorized(false);
      setRole(null);
      setAssignedEventIds([]);
      setAuthError('Email verification is required before accessing the host portal.');
      setAuthLoading(false);
      return;
    }

    try {
      let resolvedRole: AdminRole | null = null;
      let resolvedAssigned: string[] = [];

      if (email === BOOTSTRAP_PRIMARY_ADMIN_EMAIL) {
        resolvedRole = 'PRIMARY_ADMIN';
        resolvedAssigned = [];
      } else {
        const adminSnap = await getDoc(doc(db, 'admins', email));
        if (adminSnap.exists()) {
          const data = adminSnap.data() as AdminUserRecord;
          if (data.active) {
            resolvedRole = data.role;
            resolvedAssigned = Array.isArray(data.assignedEventIds) ? data.assignedEventIds : [];
          }
        }
      }

      if (!resolvedRole) {
        setIsAuthorized(false);
        setRole(null);
        setAssignedEventIds([]);
        setAuthError('This account is not authorised as a Morning Miles Club organiser.');
        setAuthLoading(false);
        return;
      }

      // Verify backend session token acceptance
      const idToken = await firebaseUser.getIdToken();
      const sessionRes = await fetch('/api/admin/session', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!sessionRes.ok) {
        const errBody = (await sessionRes.json().catch(() => ({}))) as { error?: string };
        setIsAuthorized(false);
        setRole(null);
        setAuthError(errBody.error || 'Server role verification failed.');
        setAuthLoading(false);
        return;
      }

      setIsAuthorized(true);
      setRole(resolvedRole);
      setAssignedEventIds(resolvedAssigned);
      setAuthError(null);
    } catch (err) {
      setIsAuthorized(false);
      setRole(null);
      setAuthError(err instanceof Error ? err.message : 'Unable to verify host permissions.');
    } finally {
      setAuthLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(true);
      void verifyUserRole(u);
    });
    return () => unsub();
  }, [verifyUserRole]);

  const getIdToken = React.useCallback(async () => {
    if (!auth.currentUser) return null;
    return auth.currentUser.getIdToken();
  }, []);

  const refreshPortalData = React.useCallback(async () => {
    if (!user || !isAuthorized || !role) return;
    setDataLoading(true);
    try {
      const evSnap = await getDocs(collection(db, 'events')).catch((err) =>
        handleFirestoreError(err, OperationType.LIST, 'events')
      );
      const allEvents = evSnap.docs
        .map((d) => d.data() as ManhuntEvent)
        .sort((a, b) => a.dateISO.localeCompare(b.dateISO));

      const visibleEvents =
        role === 'PRIMARY_ADMIN'
          ? allEvents
          : allEvents.filter((e) => assignedEventIds.includes(e.id));
      setEvents(visibleEvents);

      // Registrations & payments scoped for Event Host
      if (role === 'PRIMARY_ADMIN') {
        const [regSnap, paySnap, hlSnap, admSnap, logSnap] = await Promise.all([
          getDocs(collection(db, 'registrations')).catch((err) =>
            handleFirestoreError(err, OperationType.LIST, 'registrations')
          ),
          getDocs(collection(db, 'payments')).catch((err) =>
            handleFirestoreError(err, OperationType.LIST, 'payments')
          ),
          getDocs(collection(db, 'mediaHighlights')).catch((err) =>
            handleFirestoreError(err, OperationType.LIST, 'mediaHighlights')
          ),
          getDocs(collection(db, 'admins')).catch((err) =>
            handleFirestoreError(err, OperationType.LIST, 'admins')
          ),
          getDocs(collection(db, 'auditLogs')).catch((err) =>
            handleFirestoreError(err, OperationType.LIST, 'auditLogs')
          ),
        ]);
        setRegistrations(regSnap.docs.map((d) => d.data() as ParticipantRegistration));
        setPayments(paySnap.docs.map((d) => d.data() as PaymentRecord));
        setHighlights(
          hlSnap.docs
            .map((d) => d.data() as MediaHighlight)
            .sort((a, b) => a.sortOrder - b.sortOrder)
        );
        setAdmins(admSnap.docs.map((d) => d.data() as AdminUserRecord));
        setAuditLogs(
          logSnap.docs
            .map((d) => d.data() as AuditLogEntry)
            .sort((a, b) => String(b.id).localeCompare(String(a.id)))
        );
      } else {
        if (assignedEventIds.length > 0) {
          const chunk = assignedEventIds.slice(0, 10);
          const [regSnap, paySnap, hlSnap] = await Promise.all([
            getDocs(
              query(collection(db, 'registrations'), where('eventId', 'in', chunk))
            ).catch((err) => handleFirestoreError(err, OperationType.LIST, 'registrations')),
            getDocs(query(collection(db, 'payments'), where('eventId', 'in', chunk))).catch(
              (err) => handleFirestoreError(err, OperationType.LIST, 'payments')
            ),
            getDocs(collection(db, 'mediaHighlights')).catch((err) =>
              handleFirestoreError(err, OperationType.LIST, 'mediaHighlights')
            ),
          ]);
          setRegistrations(regSnap.docs.map((d) => d.data() as ParticipantRegistration));
          setPayments(paySnap.docs.map((d) => d.data() as PaymentRecord));
          setHighlights(
            hlSnap.docs
              .map((d) => d.data() as MediaHighlight)
              .sort((a, b) => a.sortOrder - b.sortOrder)
          );
        } else {
          setRegistrations([]);
          setPayments([]);
        }
        setAdmins([]);
        setAuditLogs([]);
      }

      // Fetch authoritative server payment ledger
      const token = await user.getIdToken();
      const ledgerRes = await fetch('/api/admin/ledger', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (ledgerRes.ok) {
        const ledgerData = (await ledgerRes.json()) as { orders?: ServerOrderLedgerEntry[] };
        setServerOrders(ledgerData.orders || []);
      }
    } finally {
      setDataLoading(false);
    }
  }, [user, isAuthorized, role, assignedEventIds]);

  React.useEffect(() => {
    if (isAuthorized) {
      void refreshPortalData();
    }
  }, [isAuthorized, refreshPortalData]);

  const logAudit = React.useCallback(
    async (action: string, targetType: string, targetId: string, details: string) => {
      if (!user?.email || !role) return;
      const logId = `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      await setDoc(doc(db, 'auditLogs', logId), {
        id: logId,
        actorEmail: user.email.toLowerCase(),
        actorRole: role,
        action,
        targetType,
        targetId,
        details: details.slice(0, 950),
        timestamp: serverTimestamp(),
      }).catch((err) => handleFirestoreError(err, OperationType.CREATE, `auditLogs/${logId}`));
    },
    [user, role]
  );

  const syncServerLedgerToFirestore = React.useCallback(async () => {
    if (!user || role !== 'PRIMARY_ADMIN') return { updated: 0 };
    const token = await user.getIdToken();
    const res = await fetch('/api/admin/ledger', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return { updated: 0 };
    const { orders = [] } = (await res.json()) as { orders?: ServerOrderLedgerEntry[] };
    let updated = 0;

    for (const order of orders) {
      const regRef = doc(db, 'registrations', order.registrationId);
      const regSnap = await getDoc(regRef);
      if (regSnap.exists()) {
        const current = regSnap.data() as ParticipantRegistration;
        if (
          current.status !== order.registrationStatus ||
          current.paymentStatus !== order.status ||
          current.checkedIn !== order.checkedIn ||
          current.paymentTransactionId !== order.gatewayPaymentId
        ) {
          await updateDoc(regRef, {
            status: order.registrationStatus,
            paymentStatus:
              order.status === 'CREATED'
                ? 'PENDING'
                : order.status === 'VERIFIED' || order.status === 'RECONCILED'
                  ? order.status
                  : order.status,
            paymentOrderId: order.orderId,
            paymentTransactionId: order.gatewayPaymentId || '',
            checkedIn: order.checkedIn,
            checkedInAt: order.checkedInAt || '',
            checkedInBy: order.checkedInBy || '',
            updatedAt: serverTimestamp(),
          });
          updated += 1;
        }
      }

      if (order.status === 'VERIFIED' || order.status === 'RECONCILED' || order.status === 'FAILED') {
        const payId = `pay_${order.registrationId}`;
        const payRef = doc(db, 'payments', payId);
        const paySnap = await getDoc(payRef);
        if (!paySnap.exists()) {
          await setDoc(payRef, {
            paymentId: payId,
            orderId: order.orderId,
            registrationId: order.registrationId,
            eventId: order.eventId,
            participantName: order.participantName,
            amountInr: order.amountInr,
            currency: 'INR',
            status: order.status,
            method: order.method || 'upi',
            gatewayPaymentId: order.gatewayPaymentId || '',
            verifiedByWebhook: order.verifiedByWebhook,
            reconciliationNote: order.reconciliationNote || '',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      }
    }

    // Recompute confirmedCount per event
    const allRegsSnap = await getDocs(collection(db, 'registrations'));
    const countsByEvent: Record<string, number> = {};
    for (const d of allRegsSnap.docs) {
      const r = d.data() as ParticipantRegistration;
      if (r.status === 'CONFIRMED') {
        countsByEvent[r.eventId] = (countsByEvent[r.eventId] || 0) + 1;
      }
    }
    for (const ev of events) {
      const nextCount = countsByEvent[ev.id] || 0;
      if (ev.confirmedCount !== nextCount) {
        await updateDoc(doc(db, 'events', ev.id), {
          confirmedCount: nextCount,
          updatedAt: serverTimestamp(),
        });
      }
    }

    if (updated > 0) {
      await logAudit('SYNC_LEDGER', 'system', 'payments', `Synced ${updated} verified ledger items.`);
    }
    await refreshPortalData();
    return { updated };
  }, [user, role, events, logAudit, refreshPortalData]);

  const logout = React.useCallback(async () => {
    await signOut(auth);
  }, []);

  return (
    <HostAuthContext.Provider
      value={{
        user,
        authLoading,
        isAuthorized,
        role,
        assignedEventIds,
        authError,
        selectedEventId,
        setSelectedEventId,
        events,
        registrations,
        payments,
        serverOrders,
        highlights,
        admins,
        auditLogs,
        dataLoading,
        refreshPortalData,
        syncServerLedgerToFirestore,
        logAudit,
        getIdToken,
        logout,
      }}
    >
      {children}
    </HostAuthContext.Provider>
  );
};

export function useHostAuth(): HostAuthContextValue {
  const ctx = React.useContext(HostAuthContext);
  if (!ctx) throw new Error('useHostAuth must be used inside HostAuthProvider');
  return ctx;
}
