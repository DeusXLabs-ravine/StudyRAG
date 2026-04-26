import { useRef, useMemo, Suspense, Component } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { MeshDistortMaterial, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import useBuddyStore from '../../store/buddyStore';

// Mood palettes — muted stone/cream so the orb reads as calm and editorial,
// not the loud SaaS amber-gradient that dated the previous build.
const MOOD_PALETTES = {
  neutral:     { a: '#E7E5E4', b: '#A8A29E', emissive: '#57534E', glow: 'rgba(168,162,158,0.15)' },
  warm:        { a: '#F5E6D3', b: '#C8A97E', emissive: '#8B6B43', glow: 'rgba(200,169,126,0.20)' },
  amused:      { a: '#D6E4DB', b: '#8FAD98', emissive: '#4F6E58', glow: 'rgba(143,173,152,0.18)' },
  curious:     { a: '#D6DAE8', b: '#8790A8', emissive: '#4D5470', glow: 'rgba(135,144,168,0.18)' },
  encouraging: { a: '#EFD9C4', b: '#BC8F6E', emissive: '#7C5A3F', glow: 'rgba(188,143,110,0.20)' },
  puzzled:     { a: '#E2E0DD', b: '#9B9A96', emissive: '#5A5955', glow: 'rgba(155,154,150,0.16)' },
  speaking:    { a: '#D1D5E8', b: '#6E7AA0', emissive: '#3D4566', glow: 'rgba(110,122,160,0.28)' },
  listening:   { a: '#D5EBE0', b: '#5FAD80', emissive: '#2F6848', glow: 'rgba(95,173,128,0.30)' },
};

function OrbMesh({ status, mood }) {
  const group = useRef();
  const materialRef = useRef();

  const palette = useMemo(() => {
    if (status === 'speaking') return MOOD_PALETTES.speaking;
    if (status === 'listening') return MOOD_PALETTES.listening;
    return MOOD_PALETTES[mood] || MOOD_PALETTES.neutral;
  }, [status, mood]);

  const colorA = useMemo(() => new THREE.Color(palette.a), [palette.a]);
  const colorB = useMemo(() => new THREE.Color(palette.b), [palette.b]);
  const colorEmissive = useMemo(() => new THREE.Color(palette.emissive), [palette.emissive]);

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;

    // Breathing scale — faster & stronger when speaking, slow when idle
    const isSpeaking = status === 'speaking';
    const isConnecting = status === 'connecting';
    const amp = isSpeaking ? 0.08 : 0.03;
    const freq = isSpeaking ? 3.6 : (isConnecting ? 1.6 : 0.9);
    const scale = 1 + Math.sin(t * freq) * amp;
    group.current.scale.set(scale, scale, scale);

    // Slow rotation — axes vary by mood
    group.current.rotation.x = Math.sin(t * 0.14) * 0.22;
    group.current.rotation.y += 0.0014 + (isSpeaking ? 0.003 : 0);

    // Animate distortion by state
    if (materialRef.current) {
      const target = isSpeaking ? 0.52 : isConnecting ? 0.35 : 0.22;
      materialRef.current.distort += (target - materialRef.current.distort) * 0.08;
      const speedTarget = isSpeaking ? 3.6 : 1.4;
      materialRef.current.speed += (speedTarget - materialRef.current.speed) * 0.1;
    }
  });

  return (
    <group ref={group}>
      {/* Soft outer glow — a larger, more transparent sphere */}
      <mesh>
        <sphereGeometry args={[1.6, 32, 32]} />
        <meshBasicMaterial color={colorA} transparent opacity={0.08} depthWrite={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.32, 32, 32]} />
        <meshBasicMaterial color={colorA} transparent opacity={0.14} depthWrite={false} />
      </mesh>

      {/* The living orb */}
      <Sphere args={[1, 128, 128]}>
        <MeshDistortMaterial
          ref={materialRef}
          color={colorB}
          emissive={colorEmissive}
          emissiveIntensity={status === 'speaking' ? 0.45 : 0.2}
          roughness={0.15}
          metalness={0.1}
          distort={0.18}
          speed={1.2}
          clearcoat={1}
          clearcoatRoughness={0.1}
        />
      </Sphere>

      {/* Subtle inner highlight — offset small sphere adds dimensionality */}
      <mesh position={[0.24, 0.38, 0.44]}>
        <sphereGeometry args={[0.18, 24, 24]} />
        <meshBasicMaterial color={'#FFF6E4'} transparent opacity={0.55} />
      </mesh>
    </group>
  );
}

/**
 * CSS-only fallback orb — used when WebGL/three.js crashes (version mismatch,
 * missing GPU, browsers that block WebGL in iframes, etc.). Visually close
 * enough that a user can't tell at a glance something went wrong, and it still
 * reacts to status + mood.
 */
function CssOrb({ status, mood, size }) {
  const palette = MOOD_PALETTES[status === 'speaking' ? 'speaking' : status === 'listening' ? 'listening' : (mood || 'neutral')] || MOOD_PALETTES.neutral;
  const isSpeaking = status === 'speaking';
  const isConnecting = status === 'connecting';
  const ringScale = isSpeaking ? 1.08 : isConnecting ? 1.04 : 1.02;
  const duration = isSpeaking ? '1.6s' : isConnecting ? '2.4s' : '4s';
  return (
    <div className="absolute inset-0 flex items-center justify-center" style={{ width: size, height: size }}>
      <div
        className="rounded-full"
        style={{
          width: size * 0.78,
          height: size * 0.78,
          background: `radial-gradient(circle at 34% 32%, #FFF6E4 0%, ${palette.a} 28%, ${palette.b} 72%, ${palette.emissive} 100%)`,
          boxShadow: `0 20px 60px ${palette.glow}, inset -12px -16px 40px rgba(0,0,0,0.18), inset 14px 18px 40px rgba(255,255,255,0.25)`,
          animation: `buddy-orb-breathe ${duration} ease-in-out infinite`,
          ['--orb-scale']: ringScale,
        }}
      />
      <style>{`
        @keyframes buddy-orb-breathe {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(var(--orb-scale, 1.04)); }
        }
      `}</style>
    </div>
  );
}

/**
 * Error boundary — swap to the CSS orb if the Canvas/three stack blows up.
 * The default silently renders the fallback; set `verbose` if debugging.
 */
class OrbErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { crashed: false }; }
  static getDerivedStateFromError() { return { crashed: true }; }
  componentDidCatch(err) {
    console.warn('[BuddyOrb] WebGL orb crashed, falling back to CSS orb:', err?.message);
  }
  render() {
    if (this.state.crashed) return this.props.fallback;
    return this.props.children;
  }
}

/**
 * BuddyOrb
 * The central visual for a Buddy session. Reads live status + mood from the
 * buddy store, so any transcript/tool-driven mood change reactively shifts
 * the palette and animation.
 *
 * props:
 *   size?: number — pixel size of the canvas (default 320)
 *   className?: string — wrapper class
 */
export default function BuddyOrb({ size = 320, className = '' }) {
  const status = useBuddyStore(s => s.live.status);
  const mood = useBuddyStore(s => s.live.mood);

  const palette = MOOD_PALETTES[status === 'speaking' ? 'speaking' : status === 'listening' ? 'listening' : (mood || 'neutral')] || MOOD_PALETTES.neutral;

  const isActive = status === 'listening' || status === 'speaking';

  return (
    <div
      className={`relative ${className}`}
      style={{ width: size, height: size }}
      aria-label={`Buddy orb, ${status}${mood ? `, mood ${mood}` : ''}`}
    >
      {/* Floor glow behind the canvas */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 55%, ${palette.glow} 0%, transparent 62%)`,
          filter: 'blur(8px)',
        }}
      />
      {/* Concentric pulse rings — presence metaphor, only while active. */}
      {isActive && (
        <>
          <span className="buddy-ring" style={{ borderColor: palette.b }} />
          <span className="buddy-ring buddy-ring--2" style={{ borderColor: palette.b }} />
          <span className="buddy-ring buddy-ring--3" style={{ borderColor: palette.b }} />
        </>
      )}
      <OrbErrorBoundary fallback={<CssOrb status={status} mood={mood} size={size} />}>
        <Canvas
          dpr={[1, 2]}
          camera={{ position: [0, 0, 3.6], fov: 45 }}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          style={{ borderRadius: '50%', background: 'transparent' }}
          onCreated={({ gl }) => {
            // Three 0.180+ deprecated Clock. Silence the noisy console warning
            // from libraries that still import THREE.Clock; nothing we own uses it.
            // (no-op — fiber handles Timer internally on 0.180+)
            void gl;
          }}
        >
          <ambientLight intensity={0.55} />
          <pointLight position={[3, 3, 4]} intensity={1.0} color={'#FFE8C7'} />
          <pointLight position={[-3, -1, 2]} intensity={0.5} color={'#FFAD7A'} />
          <Suspense fallback={null}>
            <OrbMesh status={status} mood={mood} />
          </Suspense>
        </Canvas>
      </OrbErrorBoundary>
    </div>
  );
}
