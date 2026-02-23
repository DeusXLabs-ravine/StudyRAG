import { Link, useLocation } from 'react-router-dom';
import { BookOpen, FileText, MessageCircle, ClipboardCheck, Layers, Home, Menu, X, BarChart3, Timer, Settings, LogOut, User } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import Logo from '../common/Logo';
import useAuthStore from '../../store/authStore';

const icons = { Home, FileText, BookOpen, MessageCircle, ClipboardCheck, Layers, BarChart3, Timer, Settings };

const navItems = [
  { path: '/', label: 'Home', icon: 'Home' },
  { path: '/documents', label: 'Documents', icon: 'FileText' },
  { path: '/learn', label: 'Learn', icon: 'BookOpen' },
  { path: '/chat', label: 'Chat', icon: 'MessageCircle' },
  { path: '/quiz', label: 'Quiz', icon: 'ClipboardCheck' },
  { path: '/flashcards', label: 'Flashcards', icon: 'Layers' },
  { path: '/exam', label: 'Exam', icon: 'Timer' },
  { path: '/analytics', label: 'Analytics', icon: 'BarChart3' },
  { path: '/settings', label: 'Settings', icon: 'Settings' },
];

function UserAvatar({ profile, className = 'h-8 w-8' }) {
  if (profile?.avatarUrl) {
    return (
      <img
        src={profile.avatarUrl}
        alt={profile.displayName || 'User'}
        className={`${className} rounded-full object-cover border-2 border-gray-200`}
      />
    );
  }

  const initials = (profile?.displayName || profile?.email || '?')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className={`${className} rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs border-2 border-gray-200`}>
      {initials}
    </div>
  );
}

export default function Navbar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const { profile, user, signOut } = useAuthStore();

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    setMenuOpen(false);
    await signOut();
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/">
              <Logo className="h-9 w-9" />
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
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}

            {/* User menu */}
            <div className="relative ml-2" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <UserAvatar profile={profile || { email: user?.email }} />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {profile?.displayName || 'User'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                  </div>
                  <Link
                    to="/settings"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <User className="h-4 w-4" /> Settings
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="h-4 w-4" /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-2">
            <UserAvatar profile={profile || { email: user?.email }} className="h-7 w-7" />
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
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50'
                    }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
            <div className="border-t border-gray-100 pt-2 mt-2">
              <div className="px-3 py-1">
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
              <button
                onClick={() => { setMobileOpen(false); handleSignOut(); }}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" /> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
