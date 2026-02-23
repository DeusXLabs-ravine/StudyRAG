import { useState } from 'react';
import { User, Calendar, GraduationCap, Heart, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { toast } from 'sonner';
import useAuthStore from '../store/authStore';
import Logo from '../components/common/Logo';
import Spinner from '../components/common/Spinner';

const TEACHING_LEVELS = [
  {
    id: 'dummy',
    label: 'Simple',
    description: 'Like explaining to a friend over coffee',
    example: 'Plants eat sunlight like we eat food — they turn it into energy using their green leaves, kind of like a solar panel!',
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
  'Sports', 'Music', 'Gaming', 'Cooking', 'Movies', 'Anime',
  'Cars', 'Technology', 'Art', 'Fashion', 'Nature', 'Science',
  'History', 'Travel', 'Fitness',
];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState('');
  const [age, setAge] = useState('');
  const [teachingLevel, setTeachingLevel] = useState('intermediate');
  const [interests, setInterests] = useState([]);
  const [customInterest, setCustomInterest] = useState('');
  const [loading, setLoading] = useState(false);
  const { createProfile, user } = useAuthStore();

  const totalSteps = 4;

  const handleAddInterest = (tag) => {
    if (!interests.includes(tag)) {
      setInterests([...interests, tag]);
    }
  };

  const handleRemoveInterest = (tag) => {
    setInterests(interests.filter(t => t !== tag));
  };

  const handleCustomInterest = (e) => {
    if (e.key === 'Enter' && customInterest.trim()) {
      e.preventDefault();
      const tag = customInterest.trim();
      if (!interests.includes(tag)) {
        setInterests([...interests, tag]);
      }
      setCustomInterest('');
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
      });
      toast.success('Welcome aboard!');
    } catch (err) {
      toast.error(err.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  const canAdvance = () => {
    if (step === 0) return true; // Name is optional
    if (step === 1) return true; // Age is optional
    if (step === 2) return true; // Level has default
    if (step === 3) return true; // Interests optional
    return true;
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
        {/* Header */}
        <div className="text-center mb-8 animate-in fade-in duration-500">
          <Logo className="h-10 w-10 mx-auto mb-4" />
          <h1 className="text-2xl font-black text-gray-900">Set Up Your Profile</h1>
          <p className="text-sm text-gray-500 mt-1">
            {user?.email}
          </p>
        </div>

        {/* Progress bar */}
        <div className="flex gap-2 mb-8">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                i <= step ? 'bg-primary' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 animate-in fade-in duration-300" key={step}>
          {step === 0 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-primary-100 text-primary-600 rounded-xl flex items-center justify-center">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">What should we call you?</h2>
                  <p className="text-sm text-gray-500">Your display name (optional)</p>
                </div>
              </div>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                autoFocus
              />
            </div>
          )}

          {step === 1 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">How old are you?</h2>
                  <p className="text-sm text-gray-500">This helps us calibrate content appropriateness</p>
                </div>
              </div>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="Enter your age"
                min="5"
                max="120"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                autoFocus
              />
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Choose your teaching style</h2>
                  <p className="text-sm text-gray-500">See how a lesson about "photosynthesis" looks at each level</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {TEACHING_LEVELS.map((level) => {
                  const isSelected = teachingLevel === level.id;
                  return (
                    <button
                      key={level.id}
                      onClick={() => setTeachingLevel(level.id)}
                      className={`text-left p-4 rounded-xl border-2 transition-all ${
                        isSelected
                          ? 'border-primary bg-primary-50 shadow-md'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-gray-900">{level.label}</span>
                        {isSelected && (
                          <span className="w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center">
                            <Check className="h-3 w-3" />
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mb-2">{level.description}</p>
                      <p className="text-xs text-gray-600 bg-gray-50 rounded-lg p-2 italic leading-relaxed">
                        "{level.example}"
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center">
                  <Heart className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">What are you into?</h2>
                  <p className="text-sm text-gray-500">We'll use these to make your learning more relatable</p>
                </div>
              </div>

              {/* Selected tags */}
              {interests.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {interests.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-50 text-primary-700 rounded-full text-sm font-medium cursor-pointer hover:bg-primary-100 transition-colors"
                      onClick={() => handleRemoveInterest(tag)}
                    >
                      {tag}
                      <span className="text-primary-400 hover:text-primary-600">&times;</span>
                    </span>
                  ))}
                </div>
              )}

              {/* Custom input */}
              <input
                type="text"
                value={customInterest}
                onChange={(e) => setCustomInterest(e.target.value)}
                onKeyDown={handleCustomInterest}
                placeholder="Type an interest and press Enter..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all mb-4"
                autoFocus
              />

              {/* Suggestions */}
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_INTERESTS.filter(s => !interests.includes(s)).map(tag => (
                  <button
                    key={tag}
                    onClick={() => handleAddInterest(tag)}
                    className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <button
            onClick={() => setStep(step - 1)}
            disabled={step === 0}
            className="flex items-center gap-1 px-4 py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors disabled:opacity-0 disabled:pointer-events-none"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
          <button
            onClick={handleNext}
            disabled={!canAdvance() || loading}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Spinner size="sm" /> Saving...
              </>
            ) : step < totalSteps - 1 ? (
              <>
                Next <ChevronRight className="h-4 w-4" />
              </>
            ) : (
              <>
                Get Started <ChevronRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
