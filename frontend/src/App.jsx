import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useParams } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import AuthGuard from './components/auth/AuthGuard';
import ErrorBoundary from './components/common/ErrorBoundary';
import Home from './pages/Home';
import Study from './pages/Study';
import Library from './pages/Library';
import NewDocument from './pages/NewDocument';
import Learn from './pages/Learn';
import Chat from './pages/Chat';
import Quiz from './pages/Quiz';
import Flashcards from './pages/Flashcards';
import Me from './pages/Me';
import Exam from './pages/Exam';
import Settings from './pages/Settings';
import Simulations from './pages/Simulations';
import Buddy from './pages/Buddy';
import About from './pages/About';
import Features from './pages/Features';
import Pricing from './pages/Pricing';
import PaymentVerify from './pages/PaymentVerify';
import AuthCallback from './pages/AuthCallback';
import { Toaster } from 'sonner';
import AccessibilityEffects from './components/accessibility/AccessibilityEffects';
import ReadingRuler from './components/accessibility/ReadingRuler';
import BreakReminder from './components/accessibility/BreakReminder';
import LocationObserver from './components/buddy/LocationObserver';
import useAuthStore from './store/authStore';

function ProtectedLayout() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <LocationObserver />
        <Outlet />
      </div>
    </AuthGuard>
  );
}

export default function App() {
  const initialize = useAuthStore(state => state.initialize);
  useEffect(() => { initialize(); }, [initialize]);

  return (
    <ErrorBoundary>
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/features" element={<Features />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Protected app routes */}
        <Route element={<ProtectedLayout />}>
          {/* Core 4 destinations */}
          <Route path="/study" element={<Study />} />
          <Route path="/library" element={<Library />} />
          <Route path="/library/new" element={<NewDocument />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/me" element={<Me />} />

          {/* Document detail — new canonical route */}
          <Route path="/document/:documentId" element={<Learn />} />

          {/* Quiz / Flashcards as push-routes (launched from document detail) */}
          <Route path="/quiz" element={<Quiz />} />
          <Route path="/quiz/:documentId" element={<Quiz />} />
          <Route path="/flashcards" element={<Flashcards />} />
          <Route path="/flashcards/:documentId" element={<Flashcards />} />

          {/* Advanced study surfaces */}
          <Route path="/exam" element={<Exam />} />
          <Route path="/simulations" element={<Simulations />} />

          {/* Study Buddy — Max-tier voice partner (page handles its own tier gate) */}
          <Route path="/buddy" element={<Buddy />} />

          {/* Settings kept for deep-links from Me */}
          <Route path="/settings" element={<Settings />} />

          {/* Payments */}
          <Route path="/payment/verify" element={<PaymentVerify />} />

          {/* ── Legacy redirects (Phase 1 backwards-compat) ── */}
          <Route path="/documents" element={<Navigate to="/library" replace />} />
          <Route path="/learn" element={<Navigate to="/library" replace />} />
          <Route path="/learn/:documentId" element={<LegacyLearnRedirect />} />
          <Route path="/analytics" element={<Navigate to="/me" replace />} />
        </Route>
      </Routes>

      <Toaster
        position="bottom-right"
        richColors
        closeButton
        toastOptions={{
          className: 'rounded-2xl border border-gray-100 shadow-2xl p-4',
          style: { fontFamily: 'Outfit, sans-serif' },
        }}
      />
      <AccessibilityEffects />
      <ReadingRuler />
      <BreakReminder />
    </Router>
    </ErrorBoundary>
  );
}

// Redirect /learn/:id → /document/:id
function LegacyLearnRedirect() {
  const { documentId } = useParams();
  return <Navigate to={`/document/${documentId}`} replace />;
}

