export const NAV_ITEMS = [
  { path: '/', label: 'Home', icon: 'Home' },
  { path: '/documents', label: 'Documents', icon: 'FileText' },
  { path: '/learn', label: 'Learn', icon: 'BookOpen' },
  { path: '/chat', label: 'Chat', icon: 'MessageCircle' },
  { path: '/quiz', label: 'Quiz', icon: 'ClipboardCheck' },
  { path: '/flashcards', label: 'Flashcards', icon: 'Layers' },
];

export const FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/plain': ['.txt'],
  'text/markdown': ['.md'],
};

export const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB

export const DIFFICULTY_LEVELS = ['easy', 'medium', 'hard'];
