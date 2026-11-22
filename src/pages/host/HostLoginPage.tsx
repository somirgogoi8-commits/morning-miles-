import React from 'react';
import { Navigate } from 'react-router-dom';
import {
  GoogleAuthProvider,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { AlertCircle, Eye, EyeOff, Lock } from 'lucide-react';
import { useHostAuth } from '../../context/HostAuthContext';
import { auth } from '../../lib/firebase';
import type { BrandingSettings } from '../../types';
import { ClubLogo } from '../../components/ClubLogo';

interface HostLoginPageProps {
  branding: BrandingSettings;
}

export const HostLoginPage: React.FC<HostLoginPageProps> = ({ branding }) => {
  const { user, isAuthorized, authLoading, authError } = useHostAuth();

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [forgotMode, setForgotMode] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  if (!authLoading && user && isAuthorized) {
    return <Navigate to="/host/dashboard" replace />;
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setFeedback(null);
    setSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      const code = (err as { code?: string }).code || '';
      if (code === 'auth/operation-not-allowed') {
        setErrorMsg(
          'Email/Password sign-in is not enabled in Firebase Console Authentication > Sign-in method yet. Use Google Sign-In below or enable Email/Password in Firebase Console.'
        );
      } else if (
        code === 'auth/invalid-credential' ||
        code === 'auth/wrong-password' ||
        code === 'auth/user-not-found'
      ) {
        setErrorMsg('Invalid host email or password.');
      } else {
        setErrorMsg(err instanceof Error ? err.message : 'Sign-in failed.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setFeedback(null);
    setSubmitting(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Google authentication failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setFeedback(null);
    if (!email.trim()) {
      setErrorMsg('Enter your registered host email address.');
      return;
    }
    setSubmitting(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setFeedback(
        'If this email is registered as an authorised host, a password reset link has been sent.'
      );
      setForgotMode(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to send reset email.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    if (!auth.currentUser) return;
    setErrorMsg(null);
    try {
      await sendEmailVerification(auth.currentUser);
      setFeedback('Verification email sent. Verify your inbox, then sign in again.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not send verification email.');
    }
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 flex flex-col justify-center items-center px-4 py-12">
      <div className="max-w-md w-full bg-[#121216] border border-white/15 rounded-xl overflow-hidden">
        <div className="h-1.5 bg-red-600" />
        <div className="p-6 sm:p-8 space-y-6">
          <div className="space-y-3 border-b border-white/10 pb-5">
            <ClubLogo logoUrl={branding.logoUrl} size="md" />
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-red-500 pt-2">
              <Lock className="w-3.5 h-3.5" />
              <span>Private Organiser Portal</span>
            </div>
            <h1 className="font-display text-3xl font-bold uppercase text-white">Host Login</h1>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Restricted to authorised Morning Miles Club administrators and event hosts. Public
              registration is disabled.
            </p>
          </div>

          {(errorMsg || authError) && (
            <div className="p-3.5 bg-red-950/40 border border-red-600/40 rounded-lg space-y-2 text-xs text-red-200">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{errorMsg || authError}</span>
              </div>
              {user && !user.emailVerified && (
                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => void handleResendVerification()}
                    className="text-white underline cursor-pointer"
                  >
                    Send verification email
                  </button>
                  <button
                    type="button"
                    onClick={() => void signOut(auth)}
                    className="text-zinc-300 underline cursor-pointer"
                  >
                    Switch account
                  </button>
                </div>
              )}
              {user && user.emailVerified && !isAuthorized && (
                <button
                  type="button"
                  onClick={() => void signOut(auth)}
                  className="text-white underline cursor-pointer"
                >
                  Sign out & try an authorised account
                </button>
              )}
            </div>
          )}

          {feedback && (
            <div className="p-3.5 bg-emerald-950/40 border border-emerald-500/30 rounded-lg text-xs text-emerald-200">
              {feedback}
            </div>
          )}

          {forgotMode ? (
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div>
                <label
                  htmlFor="reset-email"
                  className="block text-xs font-medium text-zinc-300 mb-1.5"
                >
                  Authorised Host Email
                </label>
                <input
                  id="reset-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="host@morningmilesclub.in"
                  className="w-full px-4 py-2.5 bg-zinc-950 border border-white/15 rounded-lg text-sm text-white focus:outline-none focus:border-red-500"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                >
                  {submitting ? 'Sending...' : 'Send Reset Link'}
                </button>
                <button
                  type="button"
                  onClick={() => setForgotMode(false)}
                  className="px-4 py-3 border border-white/15 text-xs text-zinc-300 rounded-lg hover:bg-white/5 cursor-pointer"
                >
                  Back
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label
                  htmlFor="host-email"
                  className="block text-xs font-medium text-zinc-300 mb-1.5"
                >
                  Email Address
                </label>
                <input
                  id="host-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="organiser@morningmilesclub.in"
                  className="w-full px-4 py-2.5 bg-zinc-950 border border-white/15 rounded-lg text-sm text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="host-password"
                    className="block text-xs font-medium text-zinc-300"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setForgotMode(true)}
                    className="text-xs text-red-400 hover:text-red-300 cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="host-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full px-4 py-2.5 pr-11 bg-zinc-950 border border-white/15 rounded-lg text-sm text-white focus:outline-none focus:border-red-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-zinc-400 hover:text-white cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
              >
                {submitting ? 'Signing In...' : 'Login to Host Portal'}
              </button>
            </form>
          )}

          <div className="pt-4 border-t border-white/10 space-y-3">
            <button
              type="button"
              disabled={submitting}
              onClick={() => void handleGoogleLogin()}
              className="w-full py-3 bg-zinc-950 hover:bg-zinc-900 border border-white/15 text-zinc-100 text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
            >
              Sign In with Authorised Google Account
            </button>
            <p className="text-[11px] text-zinc-500 text-center">
              Access is verified server-side against Morning Miles Club administrator roles.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
