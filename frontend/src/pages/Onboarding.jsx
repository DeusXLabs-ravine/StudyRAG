import { useState } from 'react';
import { User, Calendar, GraduationCap, Heart, ChevronRight, ChevronLeft, Check, BookOpen, Search, X, Eye } from 'lucide-react';
import { toast } from 'sonner';
import useAuthStore from '../store/authStore';
import useSettingsStore from '../store/settingsStore';
import Logo from '../components/common/Logo';
import { MorphingSquare } from '../components/ui/morphing-square';

const TEACHING_LEVELS = [
  {
    id: 'dummy',
    label: 'Simple',
    description: 'Like explaining to a friend over coffee',
    example: 'Plants eat sunlight like we eat food: they turn it into energy using their green leaves, kind of like a solar panel!',
  },
  {
    id: 'beginner',
    label: 'Beginner',
    description: 'Clear language with definitions',
    example: 'Photosynthesis is the process by which plants convert sunlight into food. The chlorophyll in leaves absorbs light energy to turn carbon dioxide and water into glucose.',
  },
  {
    id: 'intermediate',
    label: 'Standard',
    description: 'Balanced academic depth',
    example: 'Photosynthesis occurs in two stages: light-dependent reactions in thylakoids produce ATP and NADPH, which then drive the Calvin cycle in the stroma to fix CO₂ into G3P.',
  },
  {
    id: 'advanced',
    label: 'Advanced',
    description: 'Technical with nuances',
    example: 'Photosynthesis converts CO₂ and H₂O into glucose via light-dependent reactions in thylakoid membranes (photosystems I & II, cytochrome b6f) and carbon fixation via RuBisCO in the Calvin cycle.',
  },
];

const SUGGESTED_INTERESTS = [
  'Reading', 'Writing', 'Cooking', 'Photography', 'Music', 'Gaming',
  'Hiking', 'Technology', 'Art', 'Travel', 'Gardening', 'History',
];

const SUGGESTED_CURRICULA = [
  'Medicine', 'Chemistry', 'Computer Science', 'Biology', 'Physics',
  'Mathematics', 'History', 'Literature', 'Art History', 'Philosophy',
  'Psychology', 'Economics',
];

const A11Y_OPTIONS = [
  { id: 'dyslexia', label: 'Dyslexia', description: 'Difficulty reading standard fonts or dense text', enables: ['OpenDyslexic font', 'Bionic reading', 'Reading ruler'] },
  { id: 'adhd', label: 'ADHD', description: 'Difficulty maintaining focus during study sessions', enables: ['Focus mode', 'Break reminders', 'Reduced motion'] },
  { id: 'visual', label: 'Visual Impairment', description: 'Need for higher contrast or larger text', enables: ['High contrast', 'Large text'] },
  { id: 'motor', label: 'Motor Disability', description: 'Difficulty using keyboard or mouse precisely', enables: ['Voice input'] },
];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState('');
  const [age, setAge] = useState('');
  const [teachingLevel, setTeachingLevel] = useState('intermediate');
  const [interests, setInterests] = useState([]);
  const [customInterest, setCustomInterest] = useState('');
  const [academicFields, setAcademicFields] = useState([]);
  const [customField, setCustomField] = useState('');
  const [accessibilityNeeds, setAccessibilityNeeds] = useState([]);
  const [loading, setLoading] = useState(false);
  const { createProfile, user } = useAuthStore();

  const totalSteps = 6;

  const handleAddTag = (tag, list, setter) => {
    if (!list.includes(tag)) {
      setter([...list, tag]);
    }
  };

  const handleRemoveTag = (tag, list, setter) => {
    setter(list.filter(t => t !== tag));
  };

  const handleCustomKey = (e, val, setVal, list, setter) => {
    if (e.key === 'Enter' && val.trim()) {
      e.preventDefault();
      handleAddTag(val.trim(), list, setter);
      setVal('');
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await createProfile({
        displayName: displayName.trim() || null,
        age: age ? parseInt(age) : null,
        teachingLevel,
        interests,
        academicFields,
      });

      // Apply accessibility presets
      const { setSetting } = useSettingsStore.getState();
      const presets = {
        dyslexia: ['a11y_dyslexia_mode', 'a11y_bionic_reading', 'a11y_reading_ruler'],
        adhd: ['a11y_adhd_focus_mode', 'a11y_reduced_motion'],
        visual: ['a11y_high_contrast', 'a11y_large_text'],
        motor: ['a11y_voice_input'],
      };
      for (const need of accessibilityNeeds) {
        for (const key of (presets[need] || [])) {
          setSetting(key, 'true');
        }
      }

      toast.success('Your Profile is Ready!', {
        description: 'Explore StudyRAG with your custom settings.',
        icon: <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center"><svg className="w-3.5 h-3.5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
      });
    } catch (err) {
      toast.error('Onboarding incomplete', {
        description: err.message || 'Failed to save profile'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (step < totalSteps - 1) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-10 animate-in fade-in duration-700">
          <div className="flex justify-center mb-6">
            <Logo className="h-24 w-24" textClassName="text-3xl font-black text-gray-900" />
          </div>
          <p className="text-sm font-bold text-blue-500 uppercase tracking-[0.2em] mb-1">Welcome to StudyRAG</p>
          <p className="text-xs text-gray-400 font-medium">{user?.email}</p>
        </div>

        <div className="flex gap-2 mb-8">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i <= step ? 'bg-primary' : 'bg-gray-200'}`} />
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 animate-in fade-in duration-300" key={step}>
          {step === 0 && (
            <div className="animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-primary-100 text-primary-600 rounded-xl flex items-center justify-center"><User className="h-5 w-5" /></div>
                <div><h2 className="text-lg font-semibold text-gray-900">What should we call you?</h2><p className="text-sm text-gray-500">Your display name (optional)</p></div>
              </div>
              <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Enter your name" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all" autoFocus />
            </div>
          )}

          {step === 1 && (
            <div className="animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center"><Calendar className="h-5 w-5" /></div>
                <div><h2 className="text-lg font-semibold text-gray-900">How old are you?</h2><p className="text-sm text-gray-500">This helps us calibrate content appropriateness</p></div>
              </div>
              <input type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="Enter your age" min="5" max="120" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all" autoFocus />
            </div>
          )}

          {step === 2 && (
            <div className="animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center"><GraduationCap className="h-5 w-5" /></div>
                <div><h2 className="text-lg font-semibold text-gray-900">Choose your teaching style</h2><p className="text-sm text-gray-500">Scale neural complexity to your current depth</p></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {TEACHING_LEVELS.map((level) => {
                  const isSelected = teachingLevel === level.id;
                  return (
                    <button key={level.id} onClick={() => setTeachingLevel(level.id)} className={`text-left p-4 rounded-xl border-2 transition-all ${isSelected ? 'border-primary bg-primary-50 shadow-md' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-gray-900">{level.label}</span>
                        {isSelected && <span className="w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center"><Check className="h-3 w-3" /></span>}
                      </div>
                      <p className="text-xs text-gray-500 mb-2">{level.description}</p>
                      <p className="text-xs text-gray-600 bg-gray-50 rounded-lg p-2 italic leading-relaxed text-[10px]">"{level.example}"</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-violet-100 text-violet-600 rounded-xl flex items-center justify-center"><Eye className="h-5 w-5" /></div>
                <div><h2 className="text-lg font-semibold text-gray-900">Accessibility <span className="text-xs font-normal text-gray-400">(Optional)</span></h2><p className="text-sm text-gray-500">Select any that apply and we'll optimize your experience</p></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {A11Y_OPTIONS.map((option) => {
                  const isSelected = accessibilityNeeds.includes(option.id);
                  return (
                    <button key={option.id} onClick={() => setAccessibilityNeeds(prev => prev.includes(option.id) ? prev.filter(id => id !== option.id) : [...prev, option.id])} className={`text-left p-5 rounded-2xl border-2 transition-all ${isSelected ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-gray-900">{option.label}</span>
                        {isSelected && <span className="w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center"><Check className="h-3 w-3" /></span>}
                      </div>
                      <p className="text-xs text-gray-500 mb-3">{option.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {option.enables.map(tag => (
                          <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px] font-medium">{tag}</span>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-gray-400 font-medium text-center mt-4">You can always change these later in Settings.</p>
            </div>
          )}

          {step === 4 && (
            <div className="animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center"><Heart className="h-5 w-5" /></div>
                <div><h2 className="text-lg font-semibold text-gray-900">Hobbies & Interests</h2><p className="text-sm text-gray-500">Help the AI use relatable analogies from your life</p></div>
              </div>
              {interests.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {interests.map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 text-rose-700 rounded-full text-xs font-bold cursor-pointer hover:bg-rose-100 transition-colors" onClick={() => handleRemoveTag(tag, interests, setInterests)}>{tag}<X className="h-3 w-3 ml-1 opacity-50" /></span>
                  ))}
                </div>
              )}
              <input type="text" value={customInterest} onChange={(e) => setCustomInterest(e.target.value)} onKeyDown={(e) => handleCustomKey(e, customInterest, setCustomInterest, interests, setInterests)} placeholder="Type a hobby and press Enter..." className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all mb-4" autoFocus />
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_INTERESTS.filter(s => !interests.includes(s)).map(tag => (
                  <button key={tag} onClick={() => handleAddTag(tag, interests, setInterests)} className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold hover:bg-gray-200 transition-colors">+ {tag}</button>
                ))}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center"><BookOpen className="h-5 w-5" /></div>
                <div><h2 className="text-lg font-semibold text-gray-900">Academic Curricula <span className="text-xs font-normal text-gray-400 capitalize">(Optional)</span></h2><p className="text-sm text-gray-500">Specific subjects you're currently mastering</p></div>
              </div>
              {academicFields.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {academicFields.map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold cursor-pointer hover:bg-indigo-100 transition-colors" onClick={() => handleRemoveTag(tag, academicFields, setAcademicFields)}>{tag}<X className="h-3 w-3 ml-1 opacity-50" /></span>
                  ))}
                </div>
              )}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="text" value={customField} onChange={(e) => setCustomField(e.target.value)} onKeyDown={(e) => handleCustomKey(e, customField, setCustomField, academicFields, setAcademicFields)} placeholder="Enter a subject (e.g. Physics) and press Enter..." className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all" autoFocus />
              </div>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_CURRICULA.filter(s => !academicFields.includes(s)).map(tag => (
                  <button key={tag} onClick={() => handleAddTag(tag, academicFields, setAcademicFields)} className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold hover:bg-gray-200 transition-colors">+ {tag}</button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between mt-6">
          <button onClick={() => setStep(step - 1)} disabled={step === 0} className="flex items-center gap-1 px-4 py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors disabled:opacity-0 disabled:pointer-events-none"><ChevronLeft className="h-4 w-4" /> Back</button>
          <button onClick={handleNext} disabled={loading} className="flex items-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px] justify-center">
            {loading ? <><MorphingSquare className="w-4 h-4 bg-white" /><span className="ml-3">Syncing...</span></> : step < totalSteps - 1 ? <>Next <ChevronRight className="h-4 w-4" /></> : <>Empower AI <ChevronRight className="h-4 w-4" /></>}
          </button>
        </div>
      </div>
    </div>
  );
}
