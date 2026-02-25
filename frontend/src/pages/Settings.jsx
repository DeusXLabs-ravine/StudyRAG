import { useState, useEffect, useMemo } from 'react';
import { Volume2, Check, Shapes, User, GraduationCap, Heart, Save, Palette, Brain, Gauge, ChevronDown, BookOpen, Search, Eye, Headphones, MousePointer2, Turtle, Scale, Zap, Info, Flame, Trophy, Play, X, Type, Eraser } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import useSettingsStore from '../store/settingsStore';
import useAuthStore from '../store/authStore';
import { fetchVoices, fetchSpeechAudio } from '../services/ttsService';
import { MorphingSquare } from '../components/ui/morphing-square';
import {
  BOARD_TYPES, BOARD_COLORS, CHALK_COLORS, MARKER_COLORS, PENCIL_SHADES, HANDWRITING_FONTS,
  DEFAULT_THEME, resolveThemeVars, getBoardType, parseThemeSetting,
} from '../lib/boardThemes';

const TEACHING_LEVELS = [
  { id: 'dummy', label: 'Simple', description: 'Simple analogies' },
  { id: 'beginner', label: 'Beginner', description: 'Clear definitions' },
  { id: 'intermediate', label: 'Standard', description: 'Academic depth' },
  { id: 'advanced', label: 'Advanced', description: 'Technical nuance' },
];

const ACADEMIC_FIELDS = {
  'STEM': [
    'Anatomy', 'Biochemistry', 'Pathology', 'Pharmacology',
    'Microbiology', 'Neuroscience', 'Cardiology', 'Chemistry',
    'Computer Science', 'Mathematics', 'Physics',
  ],
  'Humanities & Arts': [
    'World History', 'Literature', 'Art History', 'Philosophy',
    'Psychology', 'Economics', 'Political Science', 'Sociology',
  ],
  'General': [
    'Public Health', 'Nutrition', 'Medical Ethics', 'NCLEX Prep',
  ]
};

const LEARNING_STYLES = [
  { id: 'auto', label: 'Adaptive DNA', description: 'AI dynamically shifts between modalities based on content complexity.', icon: Search },
  { id: 'visual', label: 'Spatial/Visual', description: 'Prioritizes infographics, mind-maps, and high-fidelity diagrammatic models.', icon: Eye },
  { id: 'auditory', label: 'Phonetic/Aural', description: 'Native focus on rhythmic explanations, voice synthesis, and audio-first analogies.', icon: Headphones },
  { id: 'reading_writing', label: 'Lexical/Text', description: 'Dense focus on structured notes, comparative lists, and comprehensive documentation.', icon: BookOpen },
  { id: 'kinesthetic', label: 'Empirical', description: 'Emphasizes interactive walkthroughs, case-study simulations, and active retrieval.', icon: MousePointer2 },
];

function BoardPreview({ themeConfig, isLarge = false }) {
  const vars = useMemo(() => resolveThemeVars(themeConfig), [themeConfig]);
  return (
    <div
      className={`relative rounded-2xl overflow-hidden border transition-all duration-500 shadow-inner flex flex-col justify-center items-center ${isLarge ? 'h-48' : 'h-24'}`}
      style={{ ...vars, backgroundColor: 'var(--board-bg)', borderColor: 'var(--board-border-color)' }}
    >
      <div className="absolute inset-0 opacity-[var(--dust-opacity)] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/dust.png')]" />
      <div className="relative z-10 text-center px-4">
        <div style={{ fontFamily: 'var(--font-family)', color: 'var(--heading-color)', fontSize: isLarge ? '1.5rem' : '0.8rem', fontWeight: 700 }} className="mb-1">
          {themeConfig.board === 'notebook' ? 'Study Note' : 'Lesson Title'}
        </div>
        <div style={{ fontFamily: 'var(--font-family)', color: 'var(--text-color)', fontSize: isLarge ? '1rem' : '0.6rem', opacity: 0.8 }}>
          Live Intelligence.
        </div>
      </div>
      <div
        className="absolute bottom-0 left-0 right-0 h-1 bg-[var(--ledge-bg)]"
        style={{ display: 'var(--ledge-display)' }}
      />
    </div>
  );
}

export default function Settings() {
  const { settings, fetchSettings, setSetting, loaded, voices, setVoices, learningProfile, learningProfileLoaded, fetchLearningProfile, setLearningStyle } = useSettingsStore();
  const { profile, updateProfile } = useAuthStore();

  const [displayName, setDisplayName] = useState('');
  const [age, setAge] = useState('');
  const [teachingLevel, setTeachingLevel] = useState('intermediate');
  const [interests, setInterests] = useState([]);
  const [customInterest, setCustomInterest] = useState('');
  const [academicFields, setAcademicFields] = useState([]);
  const [fieldsOpen, setFieldsOpen] = useState(false);
  const [previewingId, setPreviewingId] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileDirty, setProfileDirty] = useState(false);
  const [boardTheme, setBoardTheme] = useState(DEFAULT_THEME);

  useEffect(() => {
    if (!loaded) fetchSettings();
    if (!learningProfileLoaded) fetchLearningProfile();
    fetchVoices().then(setVoices).catch(() => { });
  }, []);

  useEffect(() => {
    if (settings.board_theme) setBoardTheme(parseThemeSetting(settings.board_theme));
  }, [settings.board_theme]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setAge(profile.age ? String(profile.age) : '');
      setTeachingLevel(profile.teachingLevel || 'intermediate');
      setInterests(profile.interests || []);
      setAcademicFields(profile.academicFields || []);
      setProfileDirty(false);
    }
  }, [profile]);

  const markDirty = () => setProfileDirty(true);
  const selectedVoiceId = settings.tts_voice_id || 'JBFqnCBsd6RMkjVDRZzb';
  const diagramEnabled = settings.diagram_detection_enabled === 'true';

  const updateBoardTheme = (patch) => {
    const next = { ...boardTheme, ...patch };
    setBoardTheme(next);
    setSetting('board_theme', JSON.stringify(next));
  };

  const handleSelectVoice = async (voiceId) => {
    await setSetting('tts_voice_id', voiceId);
    toast.success('Voice updated');
  };

  const handlePreview = async (voiceId, name) => {
    setPreviewingId(voiceId);
    try {
      const blob = await fetchSpeechAudio(`Sync check: ${name}.`, voiceId);
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => { URL.revokeObjectURL(url); setPreviewingId(null); };
      await audio.play();
    } catch {
      setPreviewingId(null);
    }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await updateProfile({ displayName, age: parseInt(age), teachingLevel, interests, academicFields });
      setProfileDirty(false);
      toast.success('Identity saved');
    } catch (err) {
      toast.error('Save failed');
    } finally {
      setSavingProfile(false);
    }
  };

  if (!loaded) return <div className="flex justify-center items-center py-24"><MorphingSquare message="Retrieving config" /></div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 sm:px-6">
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Preferences</h1>
          <p className="text-sm text-gray-500 mt-1">Sculpt your neural experience.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Controls */}
          <div className="lg:col-span-2 space-y-8">
            <section className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                  <User size={20} />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Identity</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Display Name</label>
                  <input type="text" value={displayName} onChange={(e) => { setDisplayName(e.target.value); markDirty(); }} className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-primary/20 focus:ring-4 focus:ring-primary/5 outline-none transition-all text-sm font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Age</label>
                  <input type="number" value={age} onChange={(e) => { setAge(e.target.value); markDirty(); }} className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-primary/20 focus:ring-4 focus:ring-primary/5 outline-none transition-all text-sm font-bold" />
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Academic Depth</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {TEACHING_LEVELS.map((level) => {
                    const isS = teachingLevel === level.id;
                    return (
                      <button key={level.id} onClick={() => { setTeachingLevel(level.id); markDirty(); }} className={`relative p-5 rounded-2xl border-2 text-left transition-all ${isS ? 'border-primary bg-primary/5' : 'border-gray-50 hover:border-gray-100'}`}>
                        <span className={`text-sm font-bold block ${isS ? 'text-primary' : 'text-gray-900'}`}>{level.label}</span>
                        <span className="text-[10px] text-gray-400 font-medium leading-tight mt-1 block">{level.description}</span>
                        {isS && <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-primary" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button onClick={handleSaveProfile} disabled={!profileDirty || savingProfile} className="mt-8 w-full py-4 bg-gray-900 text-white font-bold text-sm rounded-2xl hover:bg-black transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-lg shadow-gray-200">
                {savingProfile ? <MorphingSquare size="xs" /> : <Save size={18} />}
                {savingProfile ? 'Persisting...' : 'Save Biological Data'}
              </button>
            </section>

            {/* Combined Context Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <section className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
                <div className="flex items-center gap-2 mb-6 text-rose-500">
                  <Heart size={18} />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-900">Hobbies & Interests</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {interests.map(tag => (
                      <span key={tag} className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded-xl text-[10px] font-bold flex items-center gap-2 border border-rose-100">
                        {tag} <X size={14} className="cursor-pointer opacity-50 hover:opacity-100" onClick={() => { setInterests(interests.filter(t => t !== tag)); markDirty(); }} />
                      </span>
                    ))}
                  </div>
                  <input type="text" value={customInterest} onChange={(e) => setCustomInterest(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && customInterest.trim()) { setInterests([...interests, customInterest.trim()]); setCustomInterest(''); markDirty(); } }} placeholder="Add interest..." className="w-full px-4 py-2 bg-gray-50 border-transparent border focus:border-rose-100 rounded-xl text-sm outline-none transition-all placeholder:text-gray-300" />
                </div>
              </section>

              <section className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
                <div className="flex items-center gap-2 mb-6 text-emerald-500">
                  <BookOpen size={18} />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-900">Curricula (Optional)</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {academicFields.map(field => (
                      <span key={field} className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-bold flex items-center gap-2 border border-emerald-100">
                        {field} <X size={14} className="cursor-pointer opacity-50 hover:opacity-100" onClick={() => { setAcademicFields(academicFields.filter(f => f !== field)); markDirty(); }} />
                      </span>
                    ))}
                  </div>
                  <button onClick={() => setFieldsOpen(!fieldsOpen)} className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl text-xs font-bold text-gray-500 flex justify-between items-center group hover:bg-gray-100 transition-all">
                    <span>{fieldsOpen ? 'Minimize' : 'Select Tracks'}</span>
                    <ChevronDown size={16} className={`transition-transform duration-300 ${fieldsOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {fieldsOpen && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl space-y-5 max-h-[250px] overflow-y-auto custom-scrollbar">
                          {Object.entries(ACADEMIC_FIELDS).map(([cat, fds]) => (
                            <div key={cat} className="space-y-3">
                              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{cat}</p>
                              <div className="flex flex-wrap gap-2">
                                {fds.map(f => (
                                  <button key={f} onClick={() => { if (!academicFields.includes(f)) { setAcademicFields([...academicFields, f]); markDirty(); } }} className={`px-2.5 py-1.5 bg-white border rounded-lg text-[10px] font-bold transition-all ${academicFields.includes(f) ? 'border-emerald-500 text-emerald-600 bg-emerald-50' : 'border-gray-100 text-gray-500 hover:border-emerald-200'}`}>
                                    {f}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </section>
            </div>
          </div>

          {/* Compact Sidebar Settings (Voices, DNA) */}
          <div className="space-y-8">
            <section className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100">
                  <Volume2 size={20} />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Neural Voice</h2>
              </div>
              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                {voices.map(v => {
                  const isS = v.id === selectedVoiceId;
                  const isP = previewingId === v.id;
                  return (
                    <div key={v.id} onClick={() => handleSelectVoice(v.id)} className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${isS ? 'bg-indigo-50 border-indigo-200 ring-2 ring-indigo-50' : 'bg-gray-50 border-transparent hover:bg-gray-100'}`}>
                      <div className="min-w-0">
                        <p className={`text-xs font-bold truncate ${isS ? 'text-indigo-700' : 'text-gray-900'}`}>{v.name}</p>
                        <p className="text-[10px] text-gray-400 font-medium">{v.description || 'Global'}</p>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); handlePreview(v.id, v.name); }} disabled={isP} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isP ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-indigo-600'}`}>
                        {isP ? <MorphingSquare size="xs" /> : <Play size={14} />}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="bg-primary rounded-3xl p-8 text-white shadow-xl shadow-primary/20 relative overflow-hidden">
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/20">
                    <Shapes size={20} />
                  </div>
                  <h2 className="text-lg font-bold">DNA Check</h2>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/10 p-3 rounded-2xl border border-white/5 min-w-0">
                    <p className="text-[8px] font-bold uppercase tracking-widest text-primary-200 mb-0.5">Style</p>
                    <p className="text-sm font-bold capitalize truncate">{learningProfile?.learningStyle || 'Read/Write'}</p>
                  </div>
                  <div className="bg-white/10 p-3 rounded-2xl border border-white/5 min-w-0">
                    <p className="text-[8px] font-bold uppercase tracking-widest text-primary-200 mb-0.5">Pace</p>
                    <p className="text-sm font-bold capitalize truncate">{learningProfile?.learningPace || 'Balanced'}</p>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white/5 rounded-full blur-3xl" />
            </section>
          </div>
        </div>

        {/* Board Environment - The "Longer Grid" with Full Customization */}
        <section className="bg-white rounded-[2.5rem] border border-gray-100 p-8 sm:p-12 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-5 space-y-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center border border-amber-100">
                  <Palette size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Atmosphere</h2>
                  <p className="text-xs text-gray-500">Customize your sensory learning backdrop.</p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Board Type Selector */}
                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Environment Type</label>
                  <div className="grid grid-cols-3 gap-3">
                    {BOARD_TYPES.map(bt => {
                      const isS = boardTheme.board === bt.id;
                      return (
                        <button key={bt.id} onClick={() => updateBoardTheme({ board: bt.id, boardColor: bt.id === 'whiteboard' ? 'white' : bt.id === 'chalkboard' ? 'green' : 'yellow' })} className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${isS ? 'border-amber-500 bg-amber-50 shadow-sm' : 'border-gray-50 hover:bg-gray-50'}`}>
                          <div className={`w-10 h-6 rounded-md shadow-inner ${bt.id === 'chalkboard' ? 'bg-[#1c352d]' : bt.id === 'whiteboard' ? 'bg-white' : 'bg-[#fef9e7]'}`} />
                          <span className={`text-[10px] font-bold uppercase ${isS ? 'text-amber-700' : 'text-gray-400'}`}>{bt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Conditional Sub-controls */}
                <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100/50 space-y-8">
                  {/* Board Color (Conditional) */}
                  {(boardTheme.board === 'chalkboard' || boardTheme.board === 'notebook') && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Eraser size={14} className="text-gray-400" />
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Base Color</label>
                      </div>
                      <div className="flex gap-4">
                        {BOARD_COLORS[boardTheme.board].map(col => (
                          <button key={col.id} onClick={() => updateBoardTheme({ boardColor: col.id })} className={`w-10 h-10 rounded-full border-4 transition-all ${boardTheme.boardColor === col.id ? 'border-amber-500 scale-110' : 'border-white'}`} style={{ backgroundColor: col.hex }} title={col.label} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Ink / Chalk Color */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Palette size={14} className="text-gray-400" />
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        {boardTheme.board === 'chalkboard' ? 'Chalk Selection' : boardTheme.board === 'whiteboard' ? 'Marker Ink' : 'Pencil Shade'}
                      </label>
                    </div>
                    {boardTheme.board === 'notebook' ? (
                      <div className="grid grid-cols-2 gap-3">
                        {PENCIL_SHADES.map(s => (
                          <button key={s.id} onClick={() => updateBoardTheme({ pencilShade: s.id })} className={`px-4 py-2 rounded-xl border-2 text-[10px] font-bold uppercase transition-all ${boardTheme.pencilShade === s.id ? 'border-amber-500 bg-white' : 'border-gray-200 text-gray-400'}`}>
                            {s.label}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-3">
                        {(boardTheme.board === 'chalkboard' ? CHALK_COLORS : MARKER_COLORS).map(ink => (
                          <button key={ink.id} onClick={() => updateBoardTheme({ inkColor: ink.id })} className={`w-8 h-8 rounded-lg border-2 transition-all ${boardTheme.inkColor === ink.id ? 'border-amber-500 scale-110' : 'border-transparent'}`} style={{ background: ink.hex }} title={ink.label} />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Font Selection */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Type size={14} className="text-gray-400" />
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Biological Script</label>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {HANDWRITING_FONTS.map(f => (
                        <button key={f.id} onClick={() => updateBoardTheme({ handwriting: f.id })} className={`px-2 py-2 rounded-lg border-2 text-[10px] font-bold transition-all ${boardTheme.handwriting === f.id ? 'border-amber-500 bg-white' : 'border-gray-200 text-gray-400'}`} style={{ fontFamily: f.family }}>
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 flex flex-col justify-center gap-8">
              <BoardPreview themeConfig={boardTheme} isLarge={true} />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="p-8 bg-gray-50 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden group">
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                        <Shapes size={16} />
                      </div>
                      <h3 className="text-sm font-bold text-gray-900">Visual Reconstruction</h3>
                    </div>
                    <p className="text-[11px] text-gray-500 font-medium leading-relaxed mb-6">Convert camera scans or PDF diagrams into editable vector neural maps.</p>
                    <div className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-gray-100">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Vision Online</span>
                      <button onClick={async () => { const nV = diagramEnabled ? 'false' : 'true'; await setSetting('diagram_detection_enabled', nV); toast.success(nV === 'true' ? 'Vision Enabled' : 'Vision Offline'); }} className={`relative w-12 h-6 rounded-full transition-all duration-300 ${diagramEnabled ? 'bg-blue-600' : 'bg-gray-200'}`}>
                        <motion.div
                          animate={{ x: diagramEnabled ? 26 : 2 }}
                          initial={false}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          className="absolute top-0.5 left-0 w-5 h-5 rounded-full bg-white shadow-sm"
                        />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-8 bg-indigo-900/5 rounded-[2rem] border border-indigo-100 shadow-sm flex flex-col justify-center items-center text-center">
                  <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-indigo-600 mb-4">
                    <Brain size={24} />
                  </div>
                  <h4 className="text-sm font-bold text-gray-900 mb-1">Neural Integration</h4>
                  <p className="text-[10px] text-gray-500 font-medium italic">Environmental variables are live sync'd across all study modules.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Learning DNA (Bottom Compact Grid) */}
        <section className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm mb-12">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-10 h-10 bg-gray-100 text-gray-600 rounded-xl flex items-center justify-center">
              <Zap size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Learning Style</h2>
              <p className="text-xs text-gray-400">Configure cortical processing preferences.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {LEARNING_STYLES.map(st => {
              const Icon = st.icon;
              const isS = (settings.learning_style || 'auto') === st.id;
              return (
                <button key={st.id} onClick={() => { setLearningStyle(st.id); toast.success(`Style: ${st.label}`); }} className={`p-6 rounded-[2.5rem] border-2 transition-all flex flex-col items-center text-center gap-4 ${isS ? 'border-primary bg-primary/5' : 'border-gray-50 hover:bg-gray-50'}`}>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isS ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'}`}><Icon size={20} /></div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{st.label}</p>
                    <p className="text-[10px] font-medium text-gray-400 mt-0.5">{st.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
