import { useState, useRef, useCallback, useEffect } from 'react';

const MAX_GRAPH_POINTS = 500;
const GRAPH_INTERVAL = 1 / 30;
const FIXED_DT = 1 / 240; // Fixed physics substep: 240 Hz for stability

export default function useSimulationEngine(engineFn, params) {
  const [isRunning, setIsRunning] = useState(false);
  const [time, setTime] = useState(0);
  const [graphData, setGraphData] = useState([]);
  const [formulas, setFormulas] = useState([]);
  const [speed, setSpeed] = useState(1);

  const engineRef = useRef(null);
  const rafRef = useRef(null);
  const lastFrameRef = useRef(null);
  const timeRef = useRef(0);
  const accumRef = useRef(0); // accumulator for fixed timestep
  const graphBufferRef = useRef([]);
  const lastGraphTimeRef = useRef(0);

  // Initialize / reinitialize engine when params change
  useEffect(() => {
    if (!engineFn) return;
    const engine = engineFn(params);
    engine.init(params);
    engineRef.current = engine;
    timeRef.current = 0;
    accumRef.current = 0;
    graphBufferRef.current = [];
    lastGraphTimeRef.current = 0;
    setTime(0);
    setGraphData([]);
    setFormulas(engine.getFormulas?.(params, 0) || []);
    setIsRunning(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    lastFrameRef.current = null;
  }, [engineFn, params]);

  const recordGraph = useCallback(() => {
    const engine = engineRef.current;
    if (!engine?.getGraphData) return;
    const point = engine.getGraphData();
    if (!point) return;
    const buf = graphBufferRef.current;
    buf.push({ t: parseFloat(timeRef.current.toFixed(3)), ...point });
    if (buf.length > MAX_GRAPH_POINTS) buf.shift();
    setGraphData([...buf]);
  }, []);

  const tick = useCallback((timestamp) => {
    if (!engineRef.current) return;
    if (lastFrameRef.current === null) lastFrameRef.current = timestamp;

    const rawDt = (timestamp - lastFrameRef.current) / 1000;
    lastFrameRef.current = timestamp;

    // Cap wall-clock dt to prevent spiral of death after tab switch
    const wallDt = Math.min(rawDt, 0.1) * speed;
    accumRef.current += wallDt;

    // Fixed-step integration: run physics in small fixed steps for stability
    const maxSubsteps = 20; // safety cap
    let steps = 0;
    while (accumRef.current >= FIXED_DT && steps < maxSubsteps) {
      engineRef.current.step(FIXED_DT);
      timeRef.current += FIXED_DT;
      accumRef.current -= FIXED_DT;
      steps++;
    }
    // Drain excess accumulator if we hit the cap (prevents growing lag)
    if (steps >= maxSubsteps) accumRef.current = 0;

    setTime(timeRef.current);

    // Record graph data at intervals
    if (timeRef.current - lastGraphTimeRef.current >= GRAPH_INTERVAL) {
      lastGraphTimeRef.current = timeRef.current;
      recordGraph();
    }

    setFormulas(engineRef.current.getFormulas?.() || []);
    rafRef.current = requestAnimationFrame(tick);
  }, [speed, recordGraph]);

  const play = useCallback(() => {
    if (isRunning) return;
    setIsRunning(true);
    lastFrameRef.current = null;
    accumRef.current = 0;
    rafRef.current = requestAnimationFrame(tick);
  }, [isRunning, tick]);

  const pause = useCallback(() => {
    setIsRunning(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);

  const reset = useCallback(() => {
    pause();
    const engine = engineRef.current;
    if (engine) {
      engine.init(params);
      timeRef.current = 0;
      accumRef.current = 0;
      graphBufferRef.current = [];
      lastGraphTimeRef.current = 0;
      setTime(0);
      setGraphData([]);
      setFormulas(engine.getFormulas?.(params, 0) || []);
    }
  }, [pause, params]);

  const stepOnce = useCallback(() => {
    if (isRunning) return;
    engineRef.current?.step(FIXED_DT);
    timeRef.current += FIXED_DT;
    setTime(timeRef.current);
    recordGraph();
    setFormulas(engineRef.current?.getFormulas?.() || []);
  }, [isRunning, recordGraph]);

  const draw = useCallback((ctx, width, height) => {
    engineRef.current?.draw?.(ctx, width, height);
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return {
    isRunning,
    time,
    graphData,
    formulas,
    speed,
    setSpeed,
    play,
    pause,
    reset,
    stepOnce,
    draw,
  };
}
