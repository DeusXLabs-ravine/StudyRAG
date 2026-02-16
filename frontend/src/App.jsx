import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Home from './pages/Home';
import Documents from './pages/Documents';
import Learn from './pages/Learn';
import Chat from './pages/Chat';
import Quiz from './pages/Quiz';
import Flashcards from './pages/Flashcards';
import Analytics from './pages/Analytics';
import Exam from './pages/Exam';
import Settings from './pages/Settings';
import { Toaster } from 'sonner';
import { useEffect } from 'react';
import useSettingsStore from './store/settingsStore';

export default function App() {
  const fetchSettings = useSettingsStore(state => state.fetchSettings);
  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/learn" element={<Learn />} />
          <Route path="/learn/:documentId" element={<Learn />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/quiz" element={<Quiz />} />
          <Route path="/flashcards" element={<Flashcards />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/exam" element={<Exam />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
        <Toaster position="bottom-right" richColors />
      </div>
    </Router>
  );
}
