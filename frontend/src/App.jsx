import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import AuthGuard from './components/auth/AuthGuard';
import Home from './pages/Home';
import Documents from './pages/Documents';
import Learn from './pages/Learn';
import Chat from './pages/Chat';
import Quiz from './pages/Quiz';
import Flashcards from './pages/Flashcards';
import Analytics from './pages/Analytics';
import Exam from './pages/Exam';
import Settings from './pages/Settings';
import About from './pages/About';
import Features from './pages/Features';
import Pricing from './pages/Pricing';
import { Toaster } from 'sonner';

function ProtectedLayout() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <Outlet />
      </div>
    </AuthGuard>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/features" element={<Features />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/documents" element={<Documents />} />
          <Route path="/learn" element={<Learn />} />
          <Route path="/learn/:documentId" element={<Learn />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/quiz" element={<Quiz />} />
          <Route path="/flashcards" element={<Flashcards />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/exam" element={<Exam />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
      <Toaster position="bottom-right" richColors />
    </Router>
  );
}
