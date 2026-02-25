import { useRef } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import useTTS from '../../hooks/useTTS';
import { MorphingSquare } from '../ui/morphing-square';

// Show the settings hint only once per session
let hintShown = false;

export default function TTSButton({ text, className = '' }) {
  const { isPlaying, isLoading, toggle } = useTTS();
  const navigate = useNavigate();
  const hasPlayed = useRef(false);

  if (!text) return null;

  const handleClick = () => {
    toggle(text);

    // Show a one-time toast on first TTS use in this session
    if (!hintShown && !hasPlayed.current && !isPlaying) {
      hintShown = true;
      hasPlayed.current = true;
      toast('You can change the reading voice in Settings', {
        action: {
          label: 'Go to Settings',
          onClick: () => navigate('/settings'),
        },
        duration: 5000,
      });
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      title={isPlaying ? 'Stop reading' : 'Listen to this content'}
      className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 ${isPlaying
          ? 'bg-primary-100 text-primary-700 hover:bg-primary-200'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        } ${className}`}
    >
      {isLoading ? (
        <MorphingSquare size="sm" />
      ) : isPlaying ? (
        <VolumeX className="h-4 w-4" />
      ) : (
        <Volume2 className="h-4 w-4" />
      )}
      {isPlaying ? 'Stop' : 'Listen'}
    </button>
  );
}
