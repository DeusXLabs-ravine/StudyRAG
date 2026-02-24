import { useState, useEffect, useMemo } from 'react';
import { Volume2, Check, Shapes, User, GraduationCap, Heart, Save, Palette } from 'lucide-react';
import { toast } from 'sonner';
import useSettingsStore from '../store/settingsStore';
import useAuthStore from '../store/authStore';
import { fetchVoices, fetchSpeechAudio } from '../services/ttsService';
import Spinner from '../components/common/Spinner';
import {
  BOARD_TYPES, BOARD_COLORS, CHALK_COLORS, MARKER_COLORS,
  PENCIL_SHADES, HANDWRITING_FONTS,
  DEFAULT_THEME, resolveThemeVars, getBoardType, parseThemeSetting,
} from '../lib/boardThemes';

const TEACHING_LEVELS = [
  { id: 'dummy', label: 'Simple', description: 'Very simple language, lots of analogies' },
  { id: 'beginner', label: 'Beginner', description: 'Clear language with definitions' },
  { id: 'intermediate', label: 'Standard', description: 'Balanced academic depth' },
  { id: 'advanced', label: 'Advanced', description: 'Technical with nuances' },
];

const SUGGESTED_INTERESTS = [
  'Sports', 'Music', 'Gaming', 'Cooking', 'Movies', 'Anime',
  'Cars', 'Technology', 'Art', 'Fashion', 'Nature', 'Science',
  'History', 'Travel', 'Fitness',
];

// ─── Mini Preview Component ────────────────────────────────────────

function BoardPreview({ themeConfig }) {
  const vars = useMemo(() => resolveThemeVars(themeConfig), [themeConfig]);
  const boardType = getBoardType(themeConfig);
  const isNotebook = boardType === 'notebook';

  return (
    <div
      className="relative rounded-lg overflow-hidden border"
      style={{
        ...vars,
        backgroundColor: 'var(--board-bg)',
        backgroundImage: 'var(--board-bg-image)',
        borderColor: 'var(--board-border-color)',
        boxShadow: 'var(--board-shadow)',
        padding: '1.25rem',
        minHeight: '140px',
      }}
    >
      {/* Notebook lines */}
      {isNotebook && (
        <>
          <div
            style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              backgroundImage: `repeating-linear-gradient(transparent, transparent 1.4rem, var(--notebook-line-color, #d1d5db) 1.4rem, var(--notebook-line-color, #d1d5db) calc(1.4rem + 1px))`,
            }}
          />
          <div
            style={{
              position: 'absolute', top: 0, bottom: 0, left: '2rem', width: '1px',
              backgroundColor: 'var(--notebook-margin-color, #f4a0a0)', opacity: 0.5,
            }}
          />
        </>
      )}

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div
          style={{
            fontFamily: 'var(--font-family)',
            color: 'var(--heading-color)',
            fontSize: '0.85rem',
            fontWeight: 700,
            marginBottom: '0.5rem',
            textShadow: 'var(--text-shadow)',
          }}
        >
          Sample Lesson
        </div>
        <div
          style={{
            fontFamily: 'var(--font-family)',
            color: 'var(--text-color)',
            fontSize: '0.7rem',
            lineHeight: 1.6,
            textShadow: 'var(--text-shadow)',
            opacity: 0.85,
          }}
        >
          This is how your learning board will look. Text color, background, and style all update live.
        </div>
        <div
          style={{
            marginTop: '0.5rem',
            display: 'inline-block',
            padding: '0.15rem 0.5rem',
            background: 'var(--code-bg)',
            color: 'var(--code-color)',
            border: 'var(--code-border)',
            borderRadius: '4px',
            fontFamily: 'monospace',
            fontSize: '0.6rem',
          }}
        >
          code example
        </div>
      </div>
    </div>
  );
}

// ─── Color Swatch ──────────────────────────────────────────────────

function ColorSwatch({ color, selected, onClick, size = 'md' }) {
  const dim = size === 'sm' ? 'w-7 h-7' : 'w-9 h-9';
  const isGradient = color.startsWith('linear-gradient');

  return (
    <button
      onClick={onClick}
      className={`${dim} rounded-full border-2 transition-all flex-shrink-0 ${
        selected ? 'border-primary ring-2 ring-primary/30 scale-110' : 'border-gray-300 hover:border-gray-400'
      }`}
      style={{ background: isGradient ? color : color }}
      title={color}
    />
  );
}

// ─── Main Settings Component ───────────────────────────────────────

export default function Settings() {
  const { settings, fetchSettings, setSetting, loaded, voices, setVoices } = useSettingsStore();
  const { profile, updateProfile } = useAuthStore();
  const [previewingId, setPreviewingId] = useState(null);

  // Profile edit state
  const [displayName, setDisplayName] = useState('');
  const [age, setAge] = useState('');
  const [teachingLevel, setTeachingLevel] = useState('intermediate');
  const [interests, setInterests] = useState([]);
  const [customInterest, setCustomInterest] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileDirty, setProfileDirty] = useState(false);

  // Board theme state
  const [boardTheme, setBoardTheme] = useState(DEFAULT_THEME);

  useEffect(() => {
    if (!loaded) fetchSettings();
    fetchVoices().then(setVoices).catch(() => {});
  }, [loaded, fetchSettings, setVoices]);

  // Sync board theme from settings
  useEffect(() => {
    if (settings.board_theme) {
      setBoardTheme(parseThemeSetting(settings.board_theme));
    }
  }, [settings.board_theme]);

  // Sync profile data into local state
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setAge(profile.age ? String(profile.age) : '');
      setTeachingLevel(profile.teachingLevel || 'intermediate');
      setInterests(profile.interests || []);
      setProfileDirty(false);
    }
  }, [profile]);

  const markDirty = () => setProfileDirty(true);

  const selectedVoiceId = settings.tts_voice_id || 'JBFqnCBsd6RMkjVDRZzb';
  const diagramEnabled = settings.diagram_detection_enabled === 'true';

  const updateBoardTheme = (patch) => {
    const next = { ...boardTheme, ...patch };

    // Reset sub-options when switching board type
    if (patch.board && patch.board !== boardTheme.board) {
      if (patch.board === 'chalkboard') {
        next.boardColor = 'green';
        next.inkColor = 'white';
      } else if (patch.board === 'whiteboard') {
        next.boardColor = 'white';
        next.inkColor = 'black';
      } else if (patch.board === 'notebook') {
        next.boardColor = 'yellow';
        next.pencilShade = 'spread';
        next.handwriting = 'normal';
      }
    }

    setBoardTheme(next);
    setSetting('board_theme', JSON.stringify(next));
  };

  const handleSelectVoice = async (voiceId) => {
    await setSetting('tts_voice_id', voiceId);
    const voice = voices.find(v => v.id === voiceId);
    toast.success(`Voice changed to ${voice?.name || 'selected voice'}`);
  };

  const handlePreview = async (voiceId, name) => {
    setPreviewingId(voiceId);
    try {
      const blob = await fetchSpeechAudio(`Hi there! I'm ${name}, and I'll be your study companion.`, voiceId);
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.addEventListener('ended', () => {
        URL.revokeObjectURL(url);
        setPreviewingId(null);
      });
      audio.addEventListener('error', () => {
        setPreviewingId(null);
      });
      await audio.play();
    } catch {
      toast.error('Failed to preview voice. Please try again.');
      setPreviewingId(null);
    }
  };

  const handleAddInterest = (tag) => {
    if (!interests.includes(tag)) {
      setInterests([...interests, tag]);
      markDirty();
    }
  };

  const handleRemoveInterest = (tag) => {
    setInterests(interests.filter(t => t !== tag));
    markDirty();
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await updateProfile({
        displayName: displayName.trim() || null,
        age: age ? parseInt(age) : null,
        teachingLevel,
        interests,
      });
      setProfileDirty(false);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.message || 'Failed to save profile');
    } finally {
      setSavingProfile(false);
    }
  };

  if (!loaded) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  const currentBoardType = getBoardType(boardTheme);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings</h1>
      <p className="text-sm text-gray-500 mb-8">Customize your study experience</p>

      {/* Profile Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary-100 text-primary-600 rounded-xl flex items-center justify-center">
            <User className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Your Profile</h2>
            <p className="text-sm text-gray-500">Manage your name, preferences, and interests</p>
          </div>
        </div>

        {/* Display Name */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => { setDisplayName(e.target.value); markDirty(); }}
            placeholder="Your name"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
          />
        </div>

        {/* Age */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
          <input
            type="number"
            value={age}
            onChange={(e) => { setAge(e.target.value); markDirty(); }}
            placeholder="Your age"
            min="5"
            max="120"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
          />
        </div>

        {/* Teaching Level */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <GraduationCap className="h-4 w-4 text-gray-500" />
            <label className="text-sm font-medium text-gray-700">Teaching Level</label>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {TEACHING_LEVELS.map((level) => {
              const isSelected = teachingLevel === level.id;
              return (
                <button
                  key={level.id}
                  onClick={() => { setTeachingLevel(level.id); markDirty(); }}
                  className={`text-left p-3 rounded-xl border-2 transition-all ${
                    isSelected
                      ? 'border-primary bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-sm font-bold text-gray-900 block">{level.label}</span>
                  <span className="text-[10px] text-gray-500 leading-tight block mt-0.5">{level.description}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Interests */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Heart className="h-4 w-4 text-gray-500" />
            <label className="text-sm font-medium text-gray-700">Interests & Likes</label>
          </div>

          {interests.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {interests.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm font-medium cursor-pointer hover:bg-primary-100 transition-colors"
                  onClick={() => handleRemoveInterest(tag)}
                >
                  {tag} <span className="text-primary-400">&times;</span>
                </span>
              ))}
            </div>
          )}

          <input
            type="text"
            value={customInterest}
            onChange={(e) => setCustomInterest(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && customInterest.trim()) {
                e.preventDefault();
                handleAddInterest(customInterest.trim());
                setCustomInterest('');
              }
            }}
            placeholder="Type an interest and press Enter..."
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all mb-3"
          />

          <div className="flex flex-wrap gap-1.5">
            {SUGGESTED_INTERESTS.filter(s => !interests.includes(s)).map(tag => (
              <button
                key={tag}
                onClick={() => handleAddInterest(tag)}
                className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium hover:bg-gray-200 transition-colors"
              >
                + {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={handleSaveProfile}
          disabled={!profileDirty || savingProfile}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {savingProfile ? <Spinner size="sm" /> : <Save className="h-4 w-4" />}
          {savingProfile ? 'Saving...' : 'Save Profile'}
        </button>
      </div>

      {/* ─── Learning Board Theme ─────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
            <Palette className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Learning Board</h2>
            <p className="text-sm text-gray-500">Choose how your lesson board looks and feels</p>
          </div>
        </div>

        {/* Board Type Picker */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">Board Type</label>
          <div className="grid grid-cols-3 gap-3">
            {BOARD_TYPES.map((bt) => {
              const isSelected = currentBoardType === bt.id;
              return (
                <button
                  key={bt.id}
                  onClick={() => updateBoardTheme({ board: bt.id })}
                  className={`text-center p-4 rounded-xl border-2 transition-all ${
                    isSelected
                      ? 'border-primary bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex justify-center mb-2">
                    {bt.id === 'chalkboard' && (
                      <div className="w-10 h-8 rounded-sm bg-[#1c352d] border-2 border-[#4a3423]" />
                    )}
                    {bt.id === 'whiteboard' && (
                      <div className="w-10 h-8 rounded bg-gray-50 border-2 border-gray-300" />
                    )}
                    {bt.id === 'notebook' && (
                      <div className="w-10 h-8 rounded-sm bg-[#fef9e7] border border-gray-300 relative overflow-hidden">
                        <div className="absolute left-1.5 top-0 bottom-0 w-[1px] bg-red-300" />
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-bold text-gray-900 block">{bt.label}</span>
                  <span className="text-[10px] text-gray-500 block mt-0.5">{bt.description}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── Chalkboard Sub-Options ───────────────────────────── */}
        {currentBoardType === 'chalkboard' && (
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Board Color</label>
              <div className="flex gap-3">
                {BOARD_COLORS.chalkboard.map((c) => (
                  <ColorSwatch
                    key={c.id}
                    color={c.hex}
                    selected={boardTheme.boardColor === c.id}
                    onClick={() => updateBoardTheme({ boardColor: c.id })}
                  />
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Chalk Color</label>
              <div className="flex gap-3">
                {CHALK_COLORS.map((c) => (
                  <ColorSwatch
                    key={c.id}
                    color={c.hex}
                    selected={boardTheme.inkColor === c.id}
                    onClick={() => updateBoardTheme({ inkColor: c.id })}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── Whiteboard Sub-Options ───────────────────────────── */}
        {currentBoardType === 'whiteboard' && (
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Marker Color</label>
            <div className="flex gap-3">
              {MARKER_COLORS.map((c) => (
                <ColorSwatch
                  key={c.id}
                  color={c.hex}
                  selected={boardTheme.inkColor === c.id}
                  onClick={() => updateBoardTheme({ inkColor: c.id })}
                />
              ))}
            </div>
          </div>
        )}

        {/* ─── Notebook Sub-Options ─────────────────────────────── */}
        {currentBoardType === 'notebook' && (
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Paper Color</label>
              <div className="flex gap-3">
                {BOARD_COLORS.notebook.map((c) => (
                  <ColorSwatch
                    key={c.id}
                    color={c.hex}
                    selected={boardTheme.boardColor === c.id}
                    onClick={() => updateBoardTheme({ boardColor: c.id })}
                  />
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Pencil Shade</label>
              <div className="flex gap-3">
                {PENCIL_SHADES.map((ps) => (
                  <button
                    key={ps.id}
                    onClick={() => updateBoardTheme({ pencilShade: ps.id })}
                    className={`px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                      boardTheme.pencilShade === ps.id
                        ? 'border-primary bg-primary-50 text-gray-900'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {ps.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Handwriting Font</label>
              <div className="flex gap-3">
                {HANDWRITING_FONTS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => updateBoardTheme({ handwriting: f.id })}
                    className={`px-4 py-2 rounded-xl border-2 transition-all ${
                      boardTheme.handwriting === f.id
                        ? 'border-primary bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span style={{ fontFamily: f.family }} className="text-sm font-medium text-gray-900">{f.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Live Preview */}
        <div className="mt-6">
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Preview</label>
          <BoardPreview themeConfig={boardTheme} />
        </div>
      </div>

      {/* Text-to-Speech Voice */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-primary-100 text-primary-600 rounded-xl flex items-center justify-center">
            <Volume2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Text-to-Speech Voice</h2>
            <p className="text-sm text-gray-500">Choose a voice for reading lessons and flashcards aloud</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          {voices.map(voice => {
            const isSelected = voice.id === selectedVoiceId;
            const isPreviewing = previewingId === voice.id;
            return (
              <div
                key={voice.id}
                className={`relative flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => handleSelectVoice(voice.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">{voice.name}</span>
                    {isSelected && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-100 text-primary-700 text-[10px] font-bold rounded-full uppercase">
                        <Check className="h-3 w-3" /> Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{voice.description}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePreview(voice.id, voice.name);
                  }}
                  disabled={isPreviewing}
                  className="ml-3 p-2 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-all disabled:opacity-50"
                  title={`Preview ${voice.name}`}
                >
                  {isPreviewing ? <Spinner size="sm" /> : <Volume2 className="h-4 w-4" />}
                </button>
              </div>
            );
          })}
        </div>

        {voices.length === 0 && (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        )}
      </div>

      {/* Diagram Detection */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mt-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
            <Shapes className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">Diagram & Image Detection</h2>
            <p className="text-sm text-gray-500">Automatically detect and analyze diagrams in uploaded documents</p>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
          <div>
            <p className="text-sm font-semibold text-gray-900">Enable diagram detection</p>
            <p className="text-xs text-gray-500 mt-0.5">When enabled, PDFs and PPTX files will be scanned for diagrams during upload. Diagrams are regenerated as Mermaid.js visuals at your teaching level. Uses additional API calls.</p>
          </div>
          <button
            onClick={async () => {
              const newValue = diagramEnabled ? 'false' : 'true';
              await setSetting('diagram_detection_enabled', newValue);
              toast.success(newValue === 'true' ? 'Diagram detection enabled' : 'Diagram detection disabled');
            }}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ml-4 flex-shrink-0 ${
              diagramEnabled ? 'bg-primary' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                diagramEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
