import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PublicLayout } from './components/PublicLayout';
import { HostAuthProvider } from './context/HostAuthContext';
import { usePublicSiteData } from './hooks/useSiteData';
import { EventsPage } from './pages/EventsPage';
import { HighlightsPage } from './pages/HighlightsPage';
import { HomePage } from './pages/HomePage';
import { HowToPlayPage } from './pages/HowToPlayPage';
import { PrivacyPolicyPage, TermsPage } from './pages/LegalPages';
import { RegisterPage } from './pages/RegisterPage';
import { RulebookPage } from './pages/RulebookPage';
import { TicketLookupPage } from './pages/TicketLookupPage';
import { HostCheckInPage } from './pages/host/HostCheckInPage';
import { HostDashboardPage } from './pages/host/HostDashboardPage';
import { HostEventsPage } from './pages/host/HostEventsPage';
import { HostLoginPage } from './pages/host/HostLoginPage';
import { HostPaymentsPage } from './pages/host/HostPaymentsPage';
import { HostRegistrationsPage } from './pages/host/HostRegistrationsPage';
import { HostTeamPage } from './pages/host/HostTeamPage';

function AppRoutes() {
  const { events, highlights, branding, customRules, loading } = usePublicSiteData();

  return (
    <Routes>
      {/* Public Website Routes */}
      <Route
        path="/"
        element={
          <PublicLayout branding={branding}>
            <HomePage
              events={events}
              highlights={highlights}
              branding={branding}
              loading={loading}
            />
          </PublicLayout>
        }
      />
      <Route
        path="/events"
        element={
          <PublicLayout branding={branding}>
            <EventsPage events={events} loading={loading} />
          </PublicLayout>
        }
      />
      <Route
        path="/how-to-play"
        element={
          <PublicLayout branding={branding}>
            <HowToPlayPage />
          </PublicLayout>
        }
      />
      <Route
        path="/rules"
        element={
          <PublicLayout branding={branding}>
            <RulebookPage customRules={customRules} />
          </PublicLayout>
        }
      />
      <Route
        path="/highlights"
        element={
          <PublicLayout branding={branding}>
            <HighlightsPage highlights={highlights} />
          </PublicLayout>
        }
      />
      <Route
        path="/register"
        element={
          <PublicLayout branding={branding}>
            <RegisterPage events={events} branding={branding} />
          </PublicLayout>
        }
      />
      <Route
        path="/ticket"
        element={
          <PublicLayout branding={branding}>
            <TicketLookupPage branding={branding} />
          </PublicLayout>
        }
      />
      <Route
        path="/privacy"
        element={
          <PublicLayout branding={branding}>
            <PrivacyPolicyPage branding={branding} />
          </PublicLayout>
        }
      />
      <Route
        path="/terms"
        element={
          <PublicLayout branding={branding}>
            <TermsPage />
          </PublicLayout>
        }
      />

      {/* Separate Private Host Login & Admin Portal */}
      <Route path="/host" element={<Navigate to="/host/login" replace />} />
      <Route path="/host/login" element={<HostLoginPage branding={branding} />} />
      <Route path="/host/dashboard" element={<HostDashboardPage branding={branding} />} />
      <Route
        path="/host/registrations"
        element={<HostRegistrationsPage branding={branding} />}
      />
      <Route path="/host/payments" element={<HostPaymentsPage branding={branding} />} />
      <Route path="/host/events" element={<HostEventsPage branding={branding} />} />
      <Route path="/host/check-in" element={<HostCheckInPage branding={branding} />} />
      <Route path="/host/team" element={<HostTeamPage branding={branding} />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <HostAuthProvider>
          <AppRoutes />
        </HostAuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
