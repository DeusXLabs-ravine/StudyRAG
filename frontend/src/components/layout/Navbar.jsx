import { Link, useLocation } from 'react-router-dom';
import { BookOpen, Library, MessageCircle, User, Menu, X, LogOut, ChevronRight, Sparkles } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from '../common/Logo';
import useAuthStore from '../../store/authStore';
import { useSubscription } from '../../hooks/useSubscription';

const navItems = [
  { path: '/study',    label: 'Study',   icon: BookOpen },
  { path: '/library',  label: 'Library', icon: Library },
  { path: '/chat',     label: 'Chat',    icon: MessageCircle },
  { path: '/me',       label: 'Me',      icon: User },
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
    <div className={`${className} rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs border-2 border-gray-200`}>
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
  const { canUseBuddy } = useSubscription();
  const isBuddyActive = location.pathname.startsWith('/buddy');

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const handleSignOut = async () => {
    setMenuOpen(false);
    await signOut();
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/study">
              <Logo className="h-12 w-12" textClassName="text-xl font-black text-gray-900" />
            </Link>
          </div>

          {/* Desktop nav — 4 items */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map(({ path, label, icon: Icon }) => {
              const isActive = location.pathname.startsWith(path);
              return (
                <Link
                  key={path}
                  to={path}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-sky-50 text-sky-700'
                      : 'text-gray-600 hover:text-sky-600 hover:bg-sky-50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}

            {/* Study Buddy — Max-tier entry, styled like other nav items with a subtle amber accent */}
            {canUseBuddy && (
              <Link
                to="/buddy"
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                  isBuddyActive
                    ? 'bg-amber-50 text-amber-700'
                    : 'text-gray-600 hover:text-amber-700 hover:bg-amber-50'
                }`}
                aria-label="Study Buddy"
              >
                <Sparkles className="h-4 w-4" />
                Buddy
              </Link>
            )}

            {/* Avatar dropdown */}
            <div className="relative ml-3" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
                aria-label="User menu"
              >
                <UserAvatar profile={profile || { email: user?.email }} />
              </button>

              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-200 py-2 z-50"
                  >
                    <div className="px-4 py-2.5 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {profile?.displayName || 'User'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                    </div>
                    <Link
                      to="/me"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <User className="h-4 w-4" /> Profile & Settings
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <LogOut className="h-4 w-4" /> Sign Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Mobile header right */}
          <div className="md:hidden flex items-center gap-3">
            <UserAvatar profile={profile || { email: user?.email }} className="h-8 w-8" />
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2.5 rounded-xl text-gray-600 hover:bg-gray-100 transition-all active:scale-95 border border-gray-100 cursor-pointer"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile slide-down */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-gray-100 bg-white overflow-hidden"
          >
            <div className="px-4 py-5 space-y-4">
              {/* 4-item grid */}
              <div className="grid grid-cols-2 gap-2.5">
                {navItems.map(({ path, label, icon: Icon }) => {
                  const isActive = location.pathname.startsWith(path);
                  return (
                    <Link
                      key={path}
                      to={path}
                      className={`flex flex-col items-center gap-2 py-4 rounded-2xl text-xs font-bold transition-all border cursor-pointer ${
                        isActive
                          ? 'bg-sky-600 text-white border-sky-600 shadow-lg shadow-sky-200'
                          : 'text-gray-600 bg-gray-50 border-gray-100 hover:bg-sky-50 hover:text-sky-700'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      {label}
                    </Link>
                  );
                })}
              </div>

              {/* Study Buddy — Max tier */}
              {canUseBuddy && (
                <Link
                  to="/buddy"
                  className={`flex items-center justify-center gap-2 py-3.5 rounded-2xl text-xs font-bold transition-colors border cursor-pointer ${
                    isBuddyActive
                      ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                      : 'bg-amber-50 text-amber-800 border-amber-100 hover:bg-amber-100'
                  }`}
                >
                  <Sparkles className="h-4 w-4" />
                  Study Buddy
                  <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[9px] uppercase tracking-wider ${
                    isBuddyActive ? 'bg-white/20' : 'bg-white text-amber-700 border border-amber-200'
                  }`}>
                    Max
                  </span>
                </Link>
              )}

              {/* Profile card */}
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <div className="flex items-center gap-3 mb-3">
                  <UserAvatar profile={profile || { email: user?.email }} className="h-10 w-10" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{profile?.displayName || 'User'}</p>
                    <p className="text-[10px] text-gray-400 font-semibold truncate uppercase tracking-wider">{user?.email}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Link
                    to="/me"
                    className="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold text-gray-700 bg-white border border-gray-100 shadow-sm cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" /> Profile & Settings
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-300" />
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2 w-full px-4 py-3 rounded-xl text-sm font-semibold text-red-600 bg-red-50/60 hover:bg-red-50 transition-all cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" /> Sign Out
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
