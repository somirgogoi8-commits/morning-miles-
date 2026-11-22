import React from 'react';
import { Navigate } from 'react-router-dom';
import { doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { Shield } from 'lucide-react';
import { useHostAuth } from '../../context/HostAuthContext';
import {
  BOOTSTRAP_PRIMARY_ADMIN_EMAIL,
  createHostAuthAccount,
  db,
  handleFirestoreError,
  OperationType,
} from '../../lib/firebase';
import type { AdminRole, AdminUserRecord, BrandingSettings } from '../../types';
import { HostLayout } from '../../components/HostLayout';

export const HostTeamPage: React.FC<{ branding: BrandingSettings }> = ({ branding }) => {
  const {
    user,
    role,
    events,
    admins,
    auditLogs,
    getIdToken,
    refreshPortalData,
    logAudit,
  } = useHostAuth();

  const [email, setEmail] = React.useState('');
  const [displayName, setDisplayName] = React.useState('');
  const [newRole, setNewRole] = React.useState<AdminRole>('EVENT_HOST');
  const [tempPassword, setTempPassword] = React.useState('');
  const [selectedEvents, setSelectedEvents] = React.useState<string[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [feedback, setFeedback] = React.useState<string | null>(null);

  if (role !== 'PRIMARY_ADMIN') {
    return <Navigate to="/host/dashboard" replace />;
  }

  const syncHostsToBackend = async (nextAdmins: AdminUserRecord[]) => {
    const token = await getIdToken();
    await fetch('/api/admin/hosts/sync', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        hosts: nextAdmins.map((a) => ({
          email: a.email,
          role: a.role,
          active: a.active,
          assignedEventIds: a.assignedEventIds,
        })),
      }),
    });
  };

  const handleAddHost = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const normEmail = email.trim().toLowerCase();
    if (!normEmail.includes('@') || displayName.trim().length < 2) {
      setFeedback('Valid email and display name are required.');
      return;
    }

    setSaving(true);
    try {
      const record: AdminUserRecord = {
        email: normEmail,
        displayName: displayName.trim(),
        role: newRole,
        active: true,
        assignedEventIds: newRole === 'PRIMARY_ADMIN' ? [] : selectedEvents,
        createdBy: user?.email || '',
      };

      await setDoc(doc(db, 'admins', normEmail), {
        ...record,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }).catch((err) => handleFirestoreError(err, OperationType.WRITE, `admins/${normEmail}`));

      let authMsg = 'Host can sign in via Authorised Google Sign-In.';
      if (tempPassword.trim().length >= 6) {
        const res = await createHostAuthAccount(normEmail, tempPassword.trim());
        authMsg = res.message;
      }

      const nextList = [...admins.filter((a) => a.email !== normEmail), record];
      await syncHostsToBackend(nextList);
      await logAudit(
        'CREATE_HOST',
        'admin',
        normEmail,
        `Granted ${newRole} access to ${normEmail}.`
      );

      setFeedback(`Added ${normEmail} (${newRole}). ${authMsg}`);
      setEmail('');
      setDisplayName('');
      setTempPassword('');
      setSelectedEvents([]);
      await refreshPortalData();
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (target: AdminUserRecord) => {
    if (target.email === BOOTSTRAP_PRIMARY_ADMIN_EMAIL) return;
    const nextActive = !target.active;
    await updateDoc(doc(db, 'admins', target.email), {
      active: nextActive,
      updatedAt: serverTimestamp(),
    }).catch((err) => handleFirestoreError(err, OperationType.UPDATE, `admins/${target.email}`));

    const nextList = admins.map((a) =>
      a.email === target.email ? { ...a, active: nextActive } : a
    );
    await syncHostsToBackend(nextList);
    await logAudit(
      nextActive ? 'ENABLE_HOST' : 'DISABLE_HOST',
      'admin',
      target.email,
      `${nextActive ? 'Activated' : 'Disabled'} host ${target.email}.`
    );
    await refreshPortalData();
  };

  const toggleEventAssignment = (evId: string) => {
    setSelectedEvents((prev) =>
      prev.includes(evId) ? prev.filter((id) => id !== evId) : [...prev, evId]
    );
  };

  return (
    <HostLayout branding={branding} title="Host Accounts & Audit Logs">
      <div className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Create / Invite Host Form */}
          <form
            onSubmit={handleAddHost}
            className="lg:col-span-5 p-6 bg-[#121216] border border-white/10 rounded-xl space-y-4 text-xs"
          >
            <div className="flex items-center gap-2 text-red-500 font-mono uppercase tracking-wider">
              <Shield className="w-4 h-4" />
              <span>Primary Admin Only</span>
            </div>
            <h2 className="font-display text-xl font-bold uppercase text-white">
              Authorise Host Account
            </h2>

            <div>
              <label className="block text-zinc-400 mb-1">Host Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="host@morningmilesclub.in"
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-white/15 rounded-lg text-white"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Organiser Name"
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-white/15 rounded-lg text-white"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1">Administrator Role</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as AdminRole)}
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-white/15 rounded-lg text-white"
              >
                <option value="EVENT_HOST">EVENT HOST (Assigned events & check-in only)</option>
                <option value="PRIMARY_ADMIN">PRIMARY ADMIN (Full access)</option>
              </select>
            </div>

            {newRole === 'EVENT_HOST' && (
              <div>
                <span className="block text-zinc-400 mb-1.5">Assigned Events</span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto p-3 bg-zinc-950 border border-white/10 rounded-lg">
                  {events.length === 0 ? (
                    <span className="text-zinc-500">Create an event first to assign it.</span>
                  ) : (
                    events.map((ev) => (
                      <label key={ev.id} className="flex items-center gap-2 text-zinc-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedEvents.includes(ev.id)}
                          onChange={() => toggleEventAssignment(ev.id)}
                          className="h-3.5 w-3.5 text-red-600 rounded"
                        />
                        <span className="truncate">{ev.title}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}

            <div>
              <label className="block text-zinc-400 mb-1">
                Initial Password (Optional, min 6 chars if Email/Password enabled)
              </label>
              <input
                type="password"
                minLength={6}
                value={tempPassword}
                onChange={(e) => setTempPassword(e.target.value)}
                placeholder="Leave blank for Google Sign-In"
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-white/15 rounded-lg text-white"
              />
            </div>

            {feedback && (
              <div className="p-3 bg-zinc-950 border border-white/15 rounded-lg text-zinc-200">
                {feedback}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold uppercase tracking-wider rounded-lg cursor-pointer"
            >
              {saving ? 'Authorising...' : 'Save Host Account'}
            </button>
          </form>

          {/* Authorised Hosts Table */}
          <div className="lg:col-span-7 p-6 bg-[#121216] border border-white/10 rounded-xl space-y-4">
            <h2 className="font-display text-xl font-bold uppercase text-white">
              Authorised Administrators
            </h2>
            <div className="space-y-3 text-xs">
              <div className="p-4 bg-zinc-950 border border-white/10 rounded-lg flex items-center justify-between gap-4">
                <div>
                  <div className="font-semibold text-white">{BOOTSTRAP_PRIMARY_ADMIN_EMAIL}</div>
                  <div className="text-zinc-400 font-mono mt-0.5">
                    PRIMARY_ADMIN · Bootstrap Owner · Active
                  </div>
                </div>
              </div>

              {admins
                .filter((a) => a.email !== BOOTSTRAP_PRIMARY_ADMIN_EMAIL)
                .map((a) => (
                  <div
                    key={a.email}
                    className="p-4 bg-zinc-950 border border-white/10 rounded-lg flex flex-wrap items-center justify-between gap-4"
                  >
                    <div>
                      <div className="font-semibold text-white">
                        {a.displayName} ({a.email})
                      </div>
                      <div className="text-zinc-400 font-mono mt-0.5">
                        {a.role} · {a.active ? 'Active' : 'Disabled'} ·{' '}
                        {a.role === 'PRIMARY_ADMIN'
                          ? 'All Events'
                          : `${a.assignedEventIds.length} assigned`}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleToggleActive(a)}
                      className={`px-3 py-1.5 rounded-lg font-medium border cursor-pointer ${
                        a.active
                          ? 'border-red-600/40 text-red-400 hover:bg-red-600/20'
                          : 'border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20'
                      }`}
                    >
                      {a.active ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Immutable Audit Logs */}
        <div className="bg-[#121216] border border-white/10 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="font-display text-xl font-bold uppercase text-white">
              Security & Administrative Audit Logs
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-zinc-950 text-zinc-400 font-mono uppercase">
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target</th>
                  <th className="py-3 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-zinc-400">
                      No administrative audit entries recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.slice(0, 50).map((log) => (
                    <tr key={log.id}>
                      <td className="py-2.5 px-4 font-mono text-white whitespace-nowrap">
                        {log.actorEmail}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-red-400 whitespace-nowrap">
                        {log.actorRole}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-zinc-200 whitespace-nowrap">
                        {log.action}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-zinc-400 whitespace-nowrap">
                        {log.targetType}:{log.targetId}
                      </td>
                      <td className="py-2.5 px-4 text-zinc-300">{log.details}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </HostLayout>
  );
};
