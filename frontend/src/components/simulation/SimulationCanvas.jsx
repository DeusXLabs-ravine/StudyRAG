import { useRef, useEffect, useCallback } from 'react';

export default function SimulationCanvas({ draw, onMouse, className = '' }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const sizeRef = useRef({ w: 0, h: 0 });

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.floor(rect.width);
    const h = Math.floor(rect.height);
    if (sizeRef.current.w === w && sizeRef.current.h === h) return;
    sizeRef.current = { w, h };
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, []);

  // ResizeObserver for responsive sizing
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();
    return () => observer.disconnect();
  }, [resize]);

  // Draw loop — redraws every frame while draw changes
  useEffect(() => {
    let raf;
    const loop = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const { w, h } = sizeRef.current;
      ctx.clearRect(0, 0, w, h);
      draw?.(ctx, w, h);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [draw]);

  const handlePointer = useCallback((e) => {
    if (!onMouse) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    onMouse({
      type: e.type,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, [onMouse]);

  return (
    <div ref={containerRef} className={`w-full h-full min-h-[200px] ${className}`}>
      <canvas
        ref={canvasRef}
        className="rounded-xl bg-white"
        onPointerDown={handlePointer}
        onPointerMove={handlePointer}
        onPointerUp={handlePointer}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
    </div>
  );
}
