import { Link, useLocation } from 'react-router-dom';
import { BookOpen, FileText, MessageCircle, ClipboardCheck, Layers, Home, Menu, X, BarChart3, Timer } from 'lucide-react';
import { useState } from 'react';

const icons = { Home, FileText, BookOpen, MessageCircle, ClipboardCheck, Layers, BarChart3, Timer };

const navItems = [
  { path: '/', label: 'Home', icon: 'Home' },
  { path: '/documents', label: 'Documents', icon: 'FileText' },
  { path: '/learn', label: 'Learn', icon: 'BookOpen' },
  { path: '/chat', label: 'Chat', icon: 'MessageCircle' },
  { path: '/quiz', label: 'Quiz', icon: 'ClipboardCheck' },
  { path: '/flashcards', label: 'Flashcards', icon: 'Layers' },
  { path: '/exam', label: 'Exam', icon: 'Timer' },
  { path: '/analytics', label: 'Analytics', icon: 'BarChart3' },
];

export default function Navbar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2">
              <BookOpen className="h-8 w-8 text-primary-600" />
              <span className="text-xl font-bold text-gray-900">StudyRAG</span>
            </Link>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map(item => {
              const Icon = icons[item.icon];
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
            >
              {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <div className="px-4 py-2 space-y-1">
            {navItems.map(item => {
              const Icon = icons[item.icon];
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
}
