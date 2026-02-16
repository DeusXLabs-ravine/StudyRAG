import { useState, useEffect } from 'react';
import { Volume2, Check } from 'lucide-react';
import { toast } from 'sonner';
import useSettingsStore from '../store/settingsStore';
import { fetchVoices, fetchSpeechAudio } from '../services/ttsService';
import Spinner from '../components/common/Spinner';

export default function Settings() {
  const { settings, fetchSettings, setSetting, loaded, voices, setVoices } = useSettingsStore();
  const [previewingId, setPreviewingId] = useState(null);

  useEffect(() => {
    if (!loaded) fetchSettings();
    fetchVoices().then(setVoices).catch(() => {});
  }, [loaded, fetchSettings, setVoices]);

  const selectedVoiceId = settings.tts_voice_id || 'JBFqnCBsd6RMkjVDRZzb';

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

  if (!loaded) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings</h1>
      <p className="text-sm text-gray-500 mb-8">Customize your study experience</p>

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
    </div>
  );
}
