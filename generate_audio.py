import wave
import math
import struct

# Constants
SAMPLE_RATE = 44100
DURATION = 30  # seconds
FILENAME = "video/public/audio/soundtrack.wav"

def generate_lofi_synth():
    with wave.open(FILENAME, 'w') as wav_file:
        wav_file.setnchannels(1)  # Mono
        wav_file.setsampwidth(2)  # 16-bit
        wav_file.setframerate(SAMPLE_RATE)
        
        # Chord progression frequencies (Cmaj7, Am7, Fmaj7, G7)
        chords = [
            [261.63, 329.63, 392.00, 493.88], # C, E, G, B
            [220.00, 261.63, 329.63, 392.00], # A, C, E, G
            [174.61, 220.00, 261.63, 329.63], # F, A, C, E
            [196.00, 246.94, 293.66, 349.23]  # G, B, D, F
        ]
        
        frames_per_chord = SAMPLE_RATE * 2 # 2 seconds per chord
        
        for i in range(int(SAMPLE_RATE * DURATION)):
            chord_idx = (i // frames_per_chord) % len(chords)
            current_chord = chords[chord_idx]
            
            t = float(i) / SAMPLE_RATE
            
            # Mix sine waves for the chord
            sample = 0
            for freq in current_chord:
                # Add some "analog" wobble
                wobble = 0.5 * math.sin(2 * math.pi * 2.0 * t)
                sample += math.sin(2 * math.pi * (freq + wobble) * t)
            
            # Simple envelope to avoid clicks
            envelope = 1.0
            if (i % frames_per_chord) < 1000:
                envelope = (i % frames_per_chord) / 1000.0
            elif (i % frames_per_chord) > (frames_per_chord - 1000):
                envelope = (frames_per_chord - (i % frames_per_chord)) / 1000.0
                
            # Normalize and add some bitcrush-like warmth
            sample = (sample / len(current_chord)) * envelope
            
            # Soft clip
            if sample > 0.8: sample = 0.8
            if sample < -0.8: sample = -0.8
            
            # Convert to 16-bit PCM
            val = int(sample * 32767)
            wav_file.writeframesraw(struct.pack('<h', val))

if __name__ == "__main__":
    print(f"Generating synth soundtrack to {FILENAME}...")
    generate_lofi_synth()
    print("Done!")
