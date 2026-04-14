import { useState, useEffect, useRef, useCallback, Suspense, Component } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import { AnimatePresence, motion } from 'framer-motion'; // eslint-disable-line no-unused-vars
import { X, Mic, MicOff, Send, Loader2, MessageSquare, AlertCircle } from 'lucide-react';
import * as THREE from 'three';
import mermaid from 'mermaid';
import useGeminiLive from '../../hooks/useGeminiLive';
import useAuthStore from '../../store/authStore';
import { getGeneratedDiagramImageUrl } from '../../services/diagramService';

mermaid.initialize({ startOnLoad: false, theme: 'dark' });
let _mid = 0;

// ── Canvas dimensions for the board texture ───────────────────────────────────
const BW = 2048; // board texture pixel width
const BH = 768;  // board texture pixel height
const PAD = 64;
const PAD_B = 48; // bottom padding
const MAX_W = BW - PAD * 2;

// Font sizes — calibrated so ~5-6 lines of transcript fit comfortably
const FS = {
  label:     18,  // "SAGE" / "YOU ASKED"
  heading:   22,  // module title small cap
  topic:     40,  // topic title
  transcript:52,  // main speech text  ← was 96, now fits ~5 lines
  question:  44,  // user question
  empty:     44,  // idle placeholder
  lqLabel:   22,  // lightning label
  lq:        38,  // lightning question
  hint:      28,  // lightning hint
  research:  30,  // research query / summary
};

// ── chalk helpers ─────────────────────────────────────────────────────────────
const CHALK_FONT = (size, w = '900') =>
  `${w} ${size}px "Segoe Script","Comic Sans MS","Chalkboard SE",cursive`;

function wrapLines(ctx, text, maxW, size) {
  ctx.font = CHALK_FONT(size);
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  for (const word of words) {
    const test = cur ? cur + ' ' + word : word;
    if (ctx.measureText(test).width <= maxW || !cur) { cur = test; }
    else { lines.push(cur); cur = word; }
  }
  if (cur) lines.push(cur);
  return lines;
}

function drawChalk(ctx, text, x, y, size, { color = '#FFFFFF', alpha = 1, align = 'left', maxW = 0 } = {}) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = CHALK_FONT(size);
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = color + '55';
  ctx.shadowBlur = Math.max(4, size * 0.08);
  if (maxW > 0) {
    const lines = wrapLines(ctx, text, maxW, size);
    lines.forEach((ln, i) => ctx.fillText(ln, x, y + i * size * 1.45));
    ctx.restore();
    return lines.length;
  }
  ctx.fillText(text, x, y);
  ctx.restore();
  return 1;
}

function drawRule(ctx, y) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PAD, y);
  ctx.lineTo(BW - PAD, y);
  ctx.stroke();
  ctx.restore();
}

// Measure total content height without drawing anything
function measureHeight(ctx, { transcript, userTranscript, toolData,
  lightningQuestions, moduleTitle, moduleTopic, isSpeaking, cursorOn }) {
  let y = PAD;
  if (moduleTitle || moduleTopic) {
    y += FS.heading + 8;
    const tl = wrapLines(ctx, moduleTopic || 'Current Topic', MAX_W, FS.topic);
    y += tl.length * FS.topic * 1.45 + 12 + 20 + 24;
  }
  if (transcript) {
    y += FS.label + 10;
    const cursor = isSpeaking && cursorOn ? ' |' : '';
    const tl = wrapLines(ctx, transcript + cursor, MAX_W, FS.transcript);
    y += tl.length * FS.transcript * 1.45 + 20;
  }
  if (userTranscript) {
    y += FS.label + 10;
    const ql = wrapLines(ctx, `\u201C${userTranscript}\u201D`, MAX_W, FS.question);
    y += ql.length * FS.question * 1.45 + 16;
  }
  if (toolData?.type === 'diagram' || toolData?.type === 'illustration' ||
      toolData?.type === 'research') {
    y += 260; // rough block height
  }
  if (lightningQuestions?.length) {
    y += FS.lqLabel + 20;
    for (const q of lightningQuestions) {
      const ql = wrapLines(ctx, `${q.question}`, MAX_W - 20, FS.lq);
      y += ql.length * FS.lq * 1.45 + 10;
      if (q.hint) y += FS.hint * 1.45 + 10;
    }
  }
  return y + PAD_B;
}

// ── Board canvas texture hook ─────────────────────────────────────────────────
function useBoardTexture({ transcript, userTranscript, toolData, isSpeaking,
  lightningQuestions, moduleTitle, moduleTopic }) {

  const stateRef = useRef(null);
  const cursorRef = useRef(true);

  if (!stateRef.current) {
    const canvas = document.createElement('canvas');
    canvas.width = BW;
    canvas.height = BH;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    stateRef.current = { canvas, texture };
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, BW, BH);
    texture.needsUpdate = true;
  }

  const paint = useCallback(() => {
    const { canvas, texture } = stateRef.current;
    const ctx = canvas.getContext('2d');

    // Measure first to compute scroll offset (always show latest/bottom content)
    const totalH = measureHeight(ctx, {
      transcript, userTranscript, toolData, lightningQuestions,
      moduleTitle, moduleTopic, isSpeaking, cursorOn: cursorRef.current,
    });
    const scrollY = Math.max(0, totalH - BH);

    ctx.clearRect(0, 0, BW, BH);
    ctx.save();
    // Clip to canvas bounds so nothing bleeds outside the board
    ctx.beginPath(); ctx.rect(0, 0, BW, BH); ctx.clip();
    ctx.translate(0, -scrollY);

    const isEmpty = !transcript && !userTranscript && !toolData && !lightningQuestions?.length;
    let y = PAD;

    // ── Header ───────────────────────────────────────────────────────────
    if (moduleTitle || moduleTopic) {
      drawChalk(ctx, (moduleTitle || 'Lesson').toUpperCase(), PAD, y, FS.heading, { alpha: 0.55 });
      y += FS.heading + 8;
      const tl = drawChalk(ctx, moduleTopic || 'Current Topic', PAD, y, FS.topic, { maxW: MAX_W });
      y += tl * FS.topic * 1.45 + 12;
      drawRule(ctx, y);
      y += 24;
    }

    // ── Empty state ───────────────────────────────────────────────────────
    if (isEmpty) {
      const cx = BW / 2, cy = scrollY + BH / 2;
      ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(cx - 70, cy - 24); ctx.lineTo(cx + 70, cy - 24); ctx.stroke();
      ctx.restore();
      drawChalk(ctx, 'Sage is preparing your lesson...', cx, cy + 42, FS.empty,
        { alpha: 0.35, align: 'center' });
      ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(cx - 70, cy + 84); ctx.lineTo(cx + 70, cy + 84); ctx.stroke();
      ctx.restore();
    }

    // ── Transcript ────────────────────────────────────────────────────────
    if (transcript) {
      drawChalk(ctx, 'SAGE', PAD, y, FS.label, { alpha: 0.48 });
      y += FS.label + 10;
      const cursor = isSpeaking && cursorRef.current ? ' |' : '';
      const tl = drawChalk(ctx, transcript + cursor, PAD, y, FS.transcript, { maxW: MAX_W });
      y += tl * FS.transcript * 1.45 + 20;
    }

    // ── User transcript ───────────────────────────────────────────────────
    if (userTranscript) {
      drawChalk(ctx, 'YOU ASKED', PAD, y, FS.label, { alpha: 0.48, color: '#a8d8a8' });
      y += FS.label + 10;
      const ql = drawChalk(ctx, `\u201C${userTranscript}\u201D`, PAD, y, FS.question,
        { color: '#a8d8a8', alpha: 0.82, maxW: MAX_W });
      y += ql * FS.question * 1.45 + 16;
    }

    // ── Diagram ───────────────────────────────────────────────────────────
    if (toolData?.type === 'diagram') {
      if (toolData.loading) {
        drawChalk(ctx, '\u23F3  Drawing diagram...', PAD, y, 36, { alpha: 0.5 });
      } else if (toolData._img) {
        if (toolData.title) {
          drawChalk(ctx, `\u2500\u2500 ${toolData.title} \u2500\u2500`, BW / 2, y, 26, { alpha: 0.6, align: 'center' });
          y += 38;
        }
        const img = toolData._img;
        const maxH = BH * 0.6;
        const ratio = Math.min(MAX_W / img.width, maxH / img.height);
        ctx.drawImage(img, PAD, y, img.width * ratio, img.height * ratio);
      }
    }

    // ── Illustration ──────────────────────────────────────────────────────
    if (toolData?.type === 'illustration') {
      if (toolData.loading) {
        drawChalk(ctx, '\u23F3  Illustrating...', PAD, y, 36, { alpha: 0.5 });
      } else if (toolData._img) {
        const img = toolData._img;
        const maxH = BH * 0.6;
        const ratio = Math.min(MAX_W / img.width, maxH / img.height);
        const dw = img.width * ratio, dh = img.height * ratio;
        const ix = PAD + (MAX_W - dw) / 2;
        ctx.save(); ctx.fillStyle = 'rgba(255,255,200,0.72)';
        ctx.save(); ctx.translate(ix + 32, y - 8); ctx.rotate(-0.1); ctx.fillRect(-16, -6, 32, 11); ctx.restore();
        ctx.save(); ctx.translate(ix + dw - 32, y - 8); ctx.rotate(0.1); ctx.fillRect(-16, -6, 32, 11); ctx.restore();
        ctx.restore();
        ctx.drawImage(img, ix, y, dw, dh);
        if (toolData.prompt)
          drawChalk(ctx, `\u201C${toolData.prompt}\u201D`, BW / 2, y + dh + 24, 24, { alpha: 0.42, align: 'center' });
      }
    }

    // ── Research ──────────────────────────────────────────────────────────
    if (toolData?.type === 'research') {
      ctx.save(); ctx.strokeStyle = 'rgba(168,216,168,0.3)'; ctx.lineWidth = 2;
      ctx.strokeRect(PAD - 6, y - 24, MAX_W + 12, 240);
      ctx.restore();
      drawChalk(ctx, `\uD83D\uDD0D  RESEARCH${toolData.loading ? ' ...' : ''}`, PAD, y, FS.label,
        { color: '#a8d8a8', alpha: 0.75 });
      y += FS.label + 16;
      const ql = drawChalk(ctx, `\u201C${toolData.query}\u201D`, PAD, y, FS.research, { maxW: MAX_W });
      y += ql * FS.research * 1.45 + 10;
      if (toolData.summary)
        drawChalk(ctx, toolData.summary, PAD, y, FS.research - 4, { alpha: 0.8, maxW: MAX_W });
    }

    // ── Lightning round ───────────────────────────────────────────────────
    if (lightningQuestions?.length > 0) {
      drawChalk(ctx, '\u26A1  LIGHTNING ROUND', PAD, y, FS.lqLabel, { color: '#FCD34D', alpha: 0.95 });
      y += FS.lqLabel + 16;
      for (const [i, q] of lightningQuestions.entries()) {
        const ql = drawChalk(ctx, `${i + 1}.  ${q.question}`, PAD + 16, y, FS.lq, { maxW: MAX_W - 16 });
        y += ql * FS.lq * 1.45 + 8;
        if (q.hint) {
          drawChalk(ctx, `Hint: ${q.hint}`, PAD + 32, y, FS.hint, { alpha: 0.4, maxW: MAX_W - 32 });
          y += FS.hint * 1.45 + 8;
        }
      }
    }

    ctx.restore();
    texture.needsUpdate = true;
  }, [transcript, userTranscript, toolData, isSpeaking, lightningQuestions, moduleTitle, moduleTopic]);

  // Re-paint whenever content changes
  useEffect(() => { paint(); }, [paint]);

  // Blinking cursor when speaking
  useEffect(() => {
    if (!isSpeaking) return;
    const id = setInterval(() => { cursorRef.current = !cursorRef.current; paint(); }, 550);
    return () => clearInterval(id);
  }, [isSpeaking, paint]);

  // Load diagram SVG → Image when code becomes available
  useEffect(() => {
    if (toolData?.type !== 'diagram' || toolData.loading || !toolData.code || toolData._img) return;
    const id = `bd-${++_mid}`;
    mermaid.render(id, toolData.code).then(({ svg }) => {
      const img = new Image();
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      img.onload = () => {
        toolData._img = img; // mutate in-place; paint picks it up
        paint();
      };
    }).catch(() => { });
  }, [toolData, paint]);

  // Load illustration URL → Image
  useEffect(() => {
    if (toolData?.type !== 'illustration' || toolData.loading || !toolData.url || toolData._img) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = toolData.url;
    img.onload = () => { toolData._img = img; paint(); };
  }, [toolData, paint]);

  // Cleanup on unmount
  useEffect(() => () => { stateRef.current?.texture.dispose(); }, []);

  return stateRef.current.texture;
}

// ── Chalkboard mesh with canvas texture ───────────────────────────────────────
function Chalkboard(props) {
  const texture = useBoardTexture(props);
  return (
    <group position={[0, 1.8, -6.7]}>
      {/* Wood frame */}
      <mesh castShadow>
        <boxGeometry args={[22, 8.5, 0.18]} />
        <meshStandardMaterial color="#7B5A2A" roughness={0.6} metalness={0.1} />
      </mesh>
      {/* Green board surface */}
      <mesh position={[0, 0, 0.1]}>
        <boxGeometry args={[21.5, 8, 0.05]} />
        <meshStandardMaterial color="#2D5A24" roughness={0.95} />
      </mesh>
      {/* Canvas texture plane — exactly covers green surface */}
      <mesh position={[0, 0, 0.14]}>
        <planeGeometry args={[21.5, 8]} />
        <meshBasicMaterial map={texture} transparent />
      </mesh>
      {/* Chalk tray */}
      <mesh position={[0, -4.1, 0.2]}>
        <boxGeometry args={[21.5, 0.25, 0.3]} />
        <meshStandardMaterial color="#8B6914" roughness={0.5} />
      </mesh>
    </group>
  );
}

// ── 3-D Classroom room ────────────────────────────────────────────────────────
function ClassroomRoom() {
  return (
    <group>
      <mesh receiveShadow position={[0, -3.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[28, 18]} />
        <meshStandardMaterial color="#6B4C2A" roughness={0.85} metalness={0.05} />
      </mesh>
      <mesh receiveShadow position={[0, 2.5, -7]}>
        <boxGeometry args={[28, 14, 0.2]} />
        <meshStandardMaterial color="#C8B89A" roughness={0.9} />
      </mesh>
      <mesh receiveShadow position={[-14, 2.5, 0]}>
        <boxGeometry args={[0.2, 14, 18]} />
        <meshStandardMaterial color="#BFB090" roughness={0.9} />
      </mesh>
      <mesh receiveShadow position={[14, 2.5, 0]}>
        <boxGeometry args={[0.2, 14, 18]} />
        <meshStandardMaterial color="#BFB090" roughness={0.9} />
      </mesh>
      <mesh position={[0, 9.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[28, 18]} />
        <meshStandardMaterial color="#E8DCC8" roughness={1} />
      </mesh>
      <mesh position={[0, -2.2, -6.9]}>
        <boxGeometry args={[28, 2.6, 0.15]} />
        <meshStandardMaterial color="#8B6914" roughness={0.7} metalness={0.1} />
      </mesh>
    </group>
  );
}

// ── Windows ───────────────────────────────────────────────────────────────────
function ClassroomWindows() {
  return (
    <group>
      {[-1.5, 1.5].map((z, i) => (
        <group key={i} position={[13.9, 2.5, z * 2]}>
          <mesh>
            <boxGeometry args={[0.12, 3.5, 2.8]} />
            <meshStandardMaterial color="#87CEEB" emissive="#87CEEB" emissiveIntensity={0.4} />
          </mesh>
          <mesh>
            <boxGeometry args={[0.2, 4, 3.2]} />
            <meshStandardMaterial color="#F5F0E8" roughness={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ── Ceiling lights ────────────────────────────────────────────────────────────
function CeilingLights() {
  return (
    <>
      {[-4, 0, 4].map((x, i) => (
        <group key={i} position={[x, 9.2, -3]}>
          <mesh>
            <boxGeometry args={[2.2, 0.12, 0.4]} />
            <meshStandardMaterial color="#f5f0e8" emissive="#fff8e8" emissiveIntensity={0.6} />
          </mesh>
          <pointLight color="#FFF5E0" intensity={18} distance={14} decay={2} castShadow />
        </group>
      ))}
    </>
  );
}

// ── Scene lighting ────────────────────────────────────────────────────────────
function SceneLighting() {
  return (
    <>
      <ambientLight color="#FFF8F0" intensity={0.55} />
      <directionalLight
        color="#FFF5DC" intensity={1.6} position={[4, 10, 2]} castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={40} shadow-camera-left={-15} shadow-camera-right={15}
        shadow-camera-top={12} shadow-camera-bottom={-8}
      />
      <pointLight color="#87CEEB" intensity={6} position={[13, 3, 0]} distance={20} decay={2} />
      <spotLight color="#FFFBE8" intensity={12} position={[0, 6, -2]} angle={0.8}
        penumbra={0.4} target-position={[0, 1.8, -6.7]} />
    </>
  );
}

// ── Procedural lecturer ───────────────────────────────────────────────────────
function ProceduralLecturer({ isSpeaking }) {
  const bodyRef  = useRef(null);
  const headRef  = useRef(null);
  const armRRef  = useRef(null);
  const armLRef  = useRef(null);
  const chalkRef = useRef(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (bodyRef.current)  bodyRef.current.rotation.z  = Math.sin(t * 0.55) * 0.018;
    if (headRef.current) {
      headRef.current.rotation.x = isSpeaking ? Math.sin(t * 2.2) * 0.09 : Math.sin(t * 0.4) * 0.025;
      headRef.current.rotation.y = Math.sin(t * 0.3) * 0.06 - 0.1;
    }
    if (armRRef.current) {
      armRRef.current.rotation.z = -(Math.PI * 0.4) + Math.sin(t * 1.1) * 0.18;
      armRRef.current.rotation.x = Math.sin(t * 0.9) * 0.08;
    }
    if (armLRef.current) armLRef.current.rotation.z = 0.18 + Math.sin(t * 0.7) * 0.06;
    if (chalkRef.current) chalkRef.current.rotation.z = Math.sin(t * 1.1) * 0.15;
  });

  const skin = '#C68642', suit = '#2C3A52', shirt = '#F5F5F0';
  const tie = '#8B1A1A', hair = '#1C110A', shoe = '#111111';

  return (
    <group position={[9.5, -3.5, -5.0]} rotation={[0, Math.PI * 1.2, 0]}>
      <group ref={bodyRef}>
        {/* Legs */}
        {[-0.18, 0.18].map((x) => (
          <mesh key={x} position={[x, 0.55, 0]} castShadow>
            <capsuleGeometry args={[0.155, 1.05, 6, 14]} />
            <meshStandardMaterial color={suit} roughness={0.8} />
          </mesh>
        ))}
        {/* Shoes */}
        {[-0.18, 0.18].map((x) => (
          <mesh key={x} position={[x, 0.02, 0.14]} castShadow>
            <boxGeometry args={[0.21, 0.1, 0.42]} />
            <meshStandardMaterial color={shoe} roughness={0.45} metalness={0.25} />
          </mesh>
        ))}
        {/* Torso */}
        <mesh position={[0, 1.35, 0]} castShadow>
          <capsuleGeometry args={[0.31, 0.95, 8, 16]} />
          <meshStandardMaterial color={suit} roughness={0.72} />
        </mesh>
        {/* Shirt */}
        <mesh position={[0, 1.38, 0.27]}>
          <boxGeometry args={[0.2, 0.65, 0.04]} />
          <meshStandardMaterial color={shirt} roughness={0.9} />
        </mesh>
        {/* Tie */}
        <mesh position={[0, 1.25, 0.3]}>
          <boxGeometry args={[0.065, 0.42, 0.035]} />
          <meshStandardMaterial color={tie} roughness={0.85} />
        </mesh>
        <mesh position={[0, 1.5, 0.3]}>
          <boxGeometry args={[0.08, 0.07, 0.04]} />
          <meshStandardMaterial color={tie} roughness={0.85} />
        </mesh>
        {/* Lapels */}
        {[[-0.14, 0.45], [0.14, -0.45]].map(([x, rz]) => (
          <mesh key={x} position={[x, 1.55, 0.24]} rotation={[0, 0, rz]} castShadow>
            <boxGeometry args={[0.08, 0.28, 0.04]} />
            <meshStandardMaterial color={suit} roughness={0.7} />
          </mesh>
        ))}
        {/* Pocket square */}
        <mesh position={[-0.24, 1.65, 0.28]} rotation={[0, 0, 0.3]}>
          <boxGeometry args={[0.07, 0.05, 0.02]} />
          <meshStandardMaterial color="#FAFAFA" roughness={0.9} />
        </mesh>
        {/* Neck */}
        <mesh position={[0, 1.9, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.13, 0.22, 14]} />
          <meshStandardMaterial color={skin} roughness={0.7} />
        </mesh>
        {/* Head group */}
        <group ref={headRef} position={[0, 2.22, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.26, 22, 18]} />
            <meshStandardMaterial color={skin} roughness={0.72} />
          </mesh>
          {/* Hair */}
          <mesh position={[0, 0.17, -0.04]}>
            <sphereGeometry args={[0.24, 14, 10]} />
            <meshStandardMaterial color={hair} roughness={0.88} />
          </mesh>
          {[-0.22, 0.22].map((x) => (
            <mesh key={x} position={[x, 0.06, 0]}>
              <sphereGeometry args={[0.1, 10, 8]} />
              <meshStandardMaterial color={hair} roughness={0.88} />
            </mesh>
          ))}
          {/* Eye whites */}
          {[-0.09, 0.09].map((x) => (
            <mesh key={x} position={[x, 0.03, 0.222]}>
              <sphereGeometry args={[0.04, 10, 10]} />
              <meshStandardMaterial color="#FFFDF8" />
            </mesh>
          ))}
          {/* Pupils */}
          {[-0.09, 0.09].map((x) => (
            <mesh key={x} position={[x, 0.03, 0.237]}>
              <sphereGeometry args={[0.024, 10, 10]} />
              <meshStandardMaterial color="#1A0F00" />
            </mesh>
          ))}
          {/* Glasses */}
          {[-0.09, 0.09].map((x) => (
            <mesh key={x} position={[x, 0.03, 0.258]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.052, 0.007, 6, 18]} />
              <meshStandardMaterial color="#5C3D1A" metalness={0.75} roughness={0.25} />
            </mesh>
          ))}
          <mesh position={[0, 0.03, 0.261]}>
            <boxGeometry args={[0.055, 0.007, 0.006]} />
            <meshStandardMaterial color="#5C3D1A" metalness={0.75} roughness={0.25} />
          </mesh>
          {/* Nose */}
          <mesh position={[0, -0.04, 0.255]} rotation={[0.3, 0, 0]}>
            <boxGeometry args={[0.04, 0.055, 0.045]} />
            <meshStandardMaterial color={skin} roughness={0.8} />
          </mesh>
          {/* Mouth */}
          <mesh position={[0, -0.1, 0.245]}>
            <boxGeometry args={[0.1, 0.018, 0.02]} />
            <meshStandardMaterial color="#8B4513" roughness={0.9} />
          </mesh>
          {/* Ears */}
          {[-0.26, 0.26].map((x) => (
            <mesh key={x} position={[x, 0, 0]} rotation={[0, 0, x < 0 ? 0.1 : -0.1]}>
              <capsuleGeometry args={[0.04, 0.1, 4, 8]} />
              <meshStandardMaterial color={skin} roughness={0.75} />
            </mesh>
          ))}
        </group>

        {/* Right arm — points toward board */}
        <group ref={armRRef} position={[-0.38, 1.68, 0]}>
          <mesh position={[0, -0.26, 0]} castShadow>
            <capsuleGeometry args={[0.1, 0.45, 6, 12]} />
            <meshStandardMaterial color={suit} roughness={0.72} />
          </mesh>
          <mesh position={[0, -0.72, 0.08]} rotation={[-0.3, 0, 0]} castShadow>
            <capsuleGeometry args={[0.08, 0.42, 6, 12]} />
            <meshStandardMaterial color={shirt} roughness={0.85} />
          </mesh>
          <mesh position={[0, -1.06, 0.14]} castShadow>
            <sphereGeometry args={[0.085, 12, 10]} />
            <meshStandardMaterial color={skin} roughness={0.75} />
          </mesh>
          <group ref={chalkRef} position={[0, -1.18, 0.17]} rotation={[0.4, 0, 0.15]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.022, 0.022, 0.28, 10]} />
              <meshStandardMaterial color="#ECECEC" roughness={0.95} />
            </mesh>
            <mesh position={[0, 0.15, 0]}>
              <cylinderGeometry args={[0.015, 0.022, 0.04, 8]} />
              <meshStandardMaterial color="#FFE082" roughness={0.9} />
            </mesh>
          </group>
        </group>

        {/* Left arm — relaxed */}
        <group ref={armLRef} position={[0.38, 1.68, 0]}>
          <mesh position={[0, -0.26, 0]} castShadow>
            <capsuleGeometry args={[0.1, 0.45, 6, 12]} />
            <meshStandardMaterial color={suit} roughness={0.72} />
          </mesh>
          <mesh position={[0.04, -0.72, 0]} castShadow>
            <capsuleGeometry args={[0.08, 0.42, 6, 12]} />
            <meshStandardMaterial color={shirt} roughness={0.85} />
          </mesh>
          <mesh position={[0.06, -1.06, 0]} castShadow>
            <sphereGeometry args={[0.085, 12, 10]} />
            <meshStandardMaterial color={skin} roughness={0.75} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

// ── Audio waveform ────────────────────────────────────────────────────────────
function WaveBar({ active, color }) {
  return (
    <div className="flex items-end justify-center gap-[2px]" style={{ height: 28 }}>
      {Array.from({ length: 18 }).map((_, i) => (
        <motion.div
          key={i}
          style={{ width: 3, borderRadius: 3, background: color, originY: 1 }}
          animate={active
            ? { scaleY: [0.15, 0.5 + (i % 5) * 0.18, 0.15], opacity: [0.5, 1, 0.5] }
            : { scaleY: 0.12, opacity: 0.2 }}
          transition={active
            ? { duration: 0.38 + (i % 5) * 0.08, repeat: Infinity, repeatType: 'mirror', delay: i * 0.025, ease: 'easeInOut' }
            : { duration: 0.3 }}
        />
      ))}
    </div>
  );
}

const STATE_LABELS = {
  connecting: { text: 'Connecting to Sage...', color: '#FCD34D' },
  ready:      { text: 'Initialising...',        color: '#93C5FD' },
  teaching:   { text: 'Sage is explaining',     color: '#6EE7B7' },
  listening:  { text: 'Listening to you',       color: '#C4B5FD' },
  thinking:   { text: 'Sage is thinking...',    color: '#93C5FD' },
  error:      { text: 'Connection lost',        color: '#FCA5A5' },
};

// ── WebGL error boundary ──────────────────────────────────────────────────────
class WebGLErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { crashed: false }; }
  static getDerivedStateFromError() { return { crashed: true }; }
  componentDidCatch(err) { console.warn('[3D Classroom] WebGL error:', err?.message); }
  render() {
    if (this.state.crashed) {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-[#2A1E0E]">
          <p className="text-amber-100/40 text-sm">3D scene unavailable — reload to try again</p>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Main component ────────────────────────────────────────────────────────────
export default function GeminiLiveTeacher({
  isOpen, onClose,
  moduleTitle = '', moduleTopic = '', content = '',
  teachingLevel = 'intermediate', userName = '',
  contextLabel = '', documentId = null, moduleId = null,
}) {
  // Resolve user's actual name from profile — never fall back to "friend"
  const { profile } = useAuthStore();
  const resolvedUserName = userName || profile?.displayName || profile?.full_name || profile?.email?.split('@')[0] || '';

  const [interruptInput, setInterruptInput] = useState('');
  const [showInterrupt, setShowInterrupt] = useState(false);
  const [toolData, setToolData] = useState(null);
  const [lightningQuestions, setLightningQuestions] = useState([]);
  const [isLightningRound, setIsLightningRound] = useState(false);
  const inputRef = useRef(null);

  // ── Tool cache (localStorage) ────────────────────────────────────────────
  const TOOL_CACHE_KEY = 'sage_tool_result_cache';
  const getToolCache = () => {
    try { return JSON.parse(localStorage.getItem(TOOL_CACHE_KEY) || '{}'); } catch { return {}; }
  };
  const setToolCache = (key, data) => {
    try {
      const c = getToolCache(); c[key] = { ...data, ts: Date.now() };
      localStorage.setItem(TOOL_CACHE_KEY, JSON.stringify(c));
    } catch { /* quota */ }
  };

  const onToolCall = useCallback((call) => {
    const fc = call?.functionCalls?.[0];
    if (!fc) return;
    const args = fc.args || {};
    const cache = getToolCache();
    const cacheKey = fc.name === 'render_diagram' ? args.title
      : fc.name === 'generate_illustration' ? (args.prompt || args.description) : null;
    if (cacheKey && cache[cacheKey] && Date.now() - cache[cacheKey].ts < 86_400_000) {
      setToolData(cache[cacheKey].data); return;
    }
    if (fc.name === 'render_diagram')
      setToolData({ type: 'diagram', loading: true, title: args.title || '' });
    else if (fc.name === 'generate_illustration')
      setToolData({ type: 'illustration', loading: true, prompt: args.prompt || args.description || '' });
    else if (fc.name === 'search_external_knowledge')
      setToolData({ type: 'research', loading: true, query: args.query || '' });
    else if (fc.name === 'start_lightning_round') {
      setIsLightningRound(true); setLightningQuestions([]); setToolData({ type: 'lightning', loading: true });
    }
  }, []);

  const onToolResult = useCallback(async ({ name, result }) => {
    if (!result || result.error) { setToolData(null); return; }
    let newData = null;
    if (name === 'render_diagram') {
      newData = { type: 'diagram', loading: false, code: result.mermaidCode || '', title: result.title || '' };
      setToolData(newData);
      if (result.title) setToolCache(result.title, { data: newData });
    } else if (name === 'generate_illustration') {
      const prompt = result.prompt || '';
      if (!result.diagramId) {
        setToolData({ type: 'illustration', loading: false, prompt, url: null });
        return;
      }
      try {
        const url = await getGeneratedDiagramImageUrl(result.diagramId);
        newData = { type: 'illustration', loading: false, prompt, url };
        setToolData(newData);
        if (prompt) setToolCache(prompt, { data: newData });
      } catch {
        setToolData({ type: 'illustration', loading: false, prompt, url: null });
      }
    } else if (name === 'search_external_knowledge') {
      setToolData({ type: 'research', loading: false, query: result.query || '', summary: result.summary || '' });
    } else if (name === 'start_lightning_round') {
      setLightningQuestions(Array.isArray(result.questions) ? result.questions : []);
      setToolData(null);
      setTimeout(() => { setIsLightningRound(false); setLightningQuestions([]); }, 90_000);
    }
  }, []);

  const {
    state, isActive, isConnecting, isSpeaking, isListening,
    transcript, userTranscript, error, start, stop, sendTextInterruption,
  } = useGeminiLive({
    moduleTitle, moduleTopic, content, teachingLevel, userName: resolvedUserName,
    moduleId, documentId, onToolCall, onToolResult,
  });

  useEffect(() => {
    if (isOpen && state === 'idle') start();
    if (!isOpen && isActive) stop();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (showInterrupt) setTimeout(() => inputRef.current?.focus(), 100);
  }, [showInterrupt]);

  const handleClose = () => { stop(); onClose(); };
  const handleSend = () => {
    const t = interruptInput.trim(); if (!t) return;
    sendTextInterruption(t); setInterruptInput(''); setShowInterrupt(false);
  };

  const stateLabel = STATE_LABELS[state] || STATE_LABELS.connecting;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[200] flex flex-col"
          style={{ fontFamily: "'Outfit', sans-serif" }}
        >
          {/* ── 3D Canvas ──────────────────────────────────────────────── */}
          <WebGLErrorBoundary>
            <div className="absolute inset-0">
              <Canvas
                shadows={{ type: THREE.PCFShadowMap }}
                gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.9, powerPreference: 'high-performance' }}
                dpr={Math.min(window.devicePixelRatio, 1.5)}
              >
                <PerspectiveCamera makeDefault fov={54} position={[0, 2.2, 9.0]} />
                <Suspense fallback={null}>
                  <SceneLighting />
                  <ClassroomRoom />
                  <ClassroomWindows />
                  <CeilingLights />
                  <Chalkboard
                    transcript={transcript}
                    userTranscript={userTranscript}
                    toolData={toolData}
                    isSpeaking={isSpeaking}
                    isListening={isListening}
                    lightningQuestions={lightningQuestions}
                    isLightningRound={isLightningRound}
                    moduleTitle={moduleTitle}
                    moduleTopic={moduleTopic}
                  />
                  <ProceduralLecturer isSpeaking={isSpeaking} />
                </Suspense>
              </Canvas>
            </div>
          </WebGLErrorBoundary>

          {/* ── Top bar ────────────────────────────────────────────────── */}
          <div className="relative z-10 flex items-center justify-between px-5 py-3 flex-shrink-0">
            <div className="flex items-center gap-3">
              {(contextLabel || moduleTitle) && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 backdrop-blur-sm">
                  <span className="text-xs font-bold truncate max-w-[180px] text-amber-100/70">
                    {contextLabel || moduleTitle}
                  </span>
                </div>
              )}
              <motion.div
                key={state} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 border border-white/10 backdrop-blur-sm"
              >
                <motion.span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: stateLabel.color }}
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <span className="text-[10px] font-black uppercase tracking-[0.15em]" style={{ color: stateLabel.color }}>
                  {stateLabel.text}
                </span>
              </motion.div>
            </div>
            <button
              onClick={handleClose}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-black/40 border border-white/10 backdrop-blur-sm hover:bg-red-900/50 hover:border-red-500/30 text-white/60 hover:text-red-300 transition-all"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 pointer-events-none" />

          {/* ── Bottom control bar ─────────────────────────────────────── */}
          <div className="relative z-10 mx-4 mb-4 rounded-2xl overflow-hidden flex-shrink-0"
            style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(14px)' }}
          >
            {state === 'error' && error && (
              <div className="px-5 py-3 flex items-center gap-3 border-b border-red-500/20 bg-red-900/20">
                <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                <p className="text-red-300 text-xs font-medium">{error}</p>
              </div>
            )}

            <AnimatePresence>
              {showInterrupt && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-b border-white/10"
                >
                  <div className="flex items-center gap-3 px-5 py-3">
                    <MessageSquare className="h-4 w-4 text-white/30 flex-shrink-0" />
                    <input
                      ref={inputRef}
                      value={interruptInput}
                      onChange={e => setInterruptInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSend()}
                      placeholder="Ask Sage a question..."
                      className="flex-1 bg-transparent text-white/80 placeholder:text-white/20 text-sm outline-none"
                    />
                    <button
                      onClick={handleSend} disabled={!interruptInput.trim()}
                      className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/80 text-white disabled:opacity-30 active:scale-95 transition-all"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center gap-3 px-5 py-4">
              <div className="relative flex-shrink-0">
                <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${isListening ? 'bg-primary shadow-lg shadow-primary/40' : 'bg-white/10'}`}>
                  {isListening ? <Mic className="h-5 w-5 text-white" /> : <MicOff className="h-5 w-5 text-white/40" />}
                </div>
                {isListening && (
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-primary"
                    animate={{ scale: [1, 1.7], opacity: [0.6, 0] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
                  />
                )}
              </div>

              <div className="flex-1">
                <WaveBar active={isSpeaking} color={isSpeaking ? (isLightningRound ? '#FCD34D' : '#6EE7B7') : '#FFFFFF'} />
              </div>

              <p className="hidden sm:block text-xs text-white/30 font-medium w-44 text-center">
                {isConnecting ? 'Connecting...'
                  : isSpeaking ? 'Speak to interrupt'
                    : isListening ? 'Mic active — ask anything'
                      : 'Calibrating...'}
              </p>

              <button
                onClick={() => setShowInterrupt(v => !v)}
                disabled={!isActive || isConnecting}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-30 ${showInterrupt
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'bg-white/10 text-white/60 hover:bg-white/15 border border-white/10'
                }`}
              >
                {isConnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageSquare className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">{showInterrupt ? 'Hide' : 'Ask'}</span>
              </button>

              <button
                onClick={handleClose}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-red-900/40 text-red-400 border border-red-500/20 hover:bg-red-900/60 transition-all"
              >
                <X className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Leave</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
