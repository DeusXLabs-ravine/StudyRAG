export const PARAMS = [
  { key: 'velocity', label: 'Launch Velocity', unit: 'm/s', min: 5, max: 80, step: 1, default: 30, type: 'slider' },
  { key: 'angle', label: 'Launch Angle', unit: 'deg', min: 5, max: 85, step: 1, default: 45, type: 'slider' },
  { key: 'gravity', label: 'Gravity', unit: 'm/s\u00B2', min: 1, max: 20, step: 0.1, default: 9.81, type: 'slider' },
  { key: 'airResistance', label: 'Air Resistance', unit: '', min: 0, max: 0.5, step: 0.01, default: 0, type: 'slider' },
  { key: 'mass', label: 'Mass', unit: 'kg', min: 0.1, max: 10, step: 0.1, default: 1, type: 'slider' },
];

export const GRAPH_SERIES = [
  { key: 'y', label: 'Height', unit: 'm' },
  { key: 'speed', label: 'Speed', unit: 'm/s' },
  { key: 'ke', label: 'Kinetic Energy', unit: 'J' },
  { key: 'pe', label: 'Potential Energy', unit: 'J' },
];

// Fixed world view: max range at v=80, angle=45 ≈ 652m. Use 700m x 350m.
const WORLD_W = 700;
const WORLD_H = 350;

// Pick a "nice" step for axis ticks so we get ≤15 grid lines
function niceStep(worldRange) {
  const candidates = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500];
  for (const c of candidates) {
    if (worldRange / c <= 15) return c;
  }
  return Math.ceil(worldRange / 10);
}

export default function createProjectileMotion(params) {
  let x, y, vx, vy;
  let trail = [];
  let landed = false;
  let maxHeight = 0;
  let range = 0;
  let flightTime = 0;
  const { velocity, angle, gravity, airResistance, mass } = params;
  const rad = (angle * Math.PI) / 180;

  // Derivatives for state [x, y, vx, vy]
  // Quadratic drag model: F_drag = -k|v|*v  =>  a_drag = -(k/m)|v|*v
  // airResistance is the lumped drag coefficient k
  function derivs(state) {
    const [, , svx, svy] = state;
    const spd = Math.sqrt(svx * svx + svy * svy);
    if (spd < 1e-12) return [svx, svy, 0, -gravity];
    const dragAccel = (airResistance / mass) * spd; // magnitude factor: (k/m)*|v|
    return [svx, svy, -dragAccel * svx, -gravity - dragAccel * svy];
  }

  // Classical RK4 integrator for 4-element state vector
  function rk4(state, dt) {
    const k1 = derivs(state);
    const s2 = state.map((s, i) => s + k1[i] * dt * 0.5);
    const k2 = derivs(s2);
    const s3 = state.map((s, i) => s + k2[i] * dt * 0.5);
    const k3 = derivs(s3);
    const s4 = state.map((s, i) => s + k3[i] * dt);
    const k4 = derivs(s4);
    return state.map((s, i) => s + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
  }

  return {
    init() {
      x = 0;
      y = 0;
      vx = velocity * Math.cos(rad);
      vy = velocity * Math.sin(rad);
      trail = [{ x: 0, y: 0 }];
      landed = false;
      maxHeight = 0;
      range = 0;
      flightTime = 0;
    },

    step(dt) {
      if (landed) return;

      const prevX = x;
      const prevY = y;

      const [nx, ny, nvx, nvy] = rk4([x, y, vx, vy], dt);
      x = nx;
      y = ny;
      vx = nvx;
      vy = nvy;
      flightTime += dt;

      if (y > maxHeight) maxHeight = y;

      // Ground impact detection with linear interpolation for sub-step accuracy
      if (prevY >= 0 && y < 0) {
        const frac = prevY / (prevY - y); // fraction of dt where y=0
        const impactX = prevX + frac * (x - prevX);
        x = impactX;
        y = 0;
        vx = 0;
        vy = 0;
        range = impactX;
        flightTime -= dt * (1 - frac); // correct for overshoot
        landed = true;
        trail.push({ x: impactX, y: 0 });
      } else {
        trail.push({ x, y: Math.max(0, y) });
      }

      if (trail.length > 2000) trail.shift();
    },

    draw(ctx, w, h) {
      const padL = 50;
      const padR = 20;
      const padT = 20;
      const padB = 36;
      const plotW = w - padL - padR;
      const plotH = h - padT - padB;
      const groundY = padT + plotH;

      const scaleX = plotW / WORLD_W;
      const scaleY = plotH / WORLD_H;

      const toScreen = (px, py) => [padL + px * scaleX, groundY - py * scaleY];

      // Background grid
      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 1;
      const xStep = niceStep(WORLD_W);
      const yStep = niceStep(WORLD_H);

      // Vertical grid + X axis labels
      ctx.font = 'bold 9px sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'center';
      for (let wx = 0; wx <= WORLD_W; wx += xStep) {
        const sx = padL + wx * scaleX;
        ctx.beginPath();
        ctx.moveTo(sx, padT);
        ctx.lineTo(sx, groundY);
        ctx.stroke();
        if (wx > 0) ctx.fillText(`${wx}`, sx, groundY + 14);
      }
      ctx.fillText('m', padL + plotW + 8, groundY + 14);

      // Horizontal grid + Y axis labels
      ctx.textAlign = 'right';
      for (let wy = 0; wy <= WORLD_H; wy += yStep) {
        const sy = groundY - wy * scaleY;
        ctx.beginPath();
        ctx.moveTo(padL, sy);
        ctx.lineTo(padL + plotW, sy);
        ctx.stroke();
        if (wy > 0) ctx.fillText(`${wy}`, padL - 6, sy + 3);
      }

      // Ground line
      ctx.beginPath();
      ctx.moveTo(padL, groundY);
      ctx.lineTo(padL + plotW, groundY);
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Y axis
      ctx.beginPath();
      ctx.moveTo(padL, padT);
      ctx.lineTo(padL, groundY);
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Trail
      if (trail.length > 1) {
        ctx.beginPath();
        const [sx, sy] = toScreen(trail[0].x, trail[0].y);
        ctx.moveTo(sx, sy);
        for (let i = 1; i < trail.length; i++) {
          const [tx, ty] = toScreen(trail[i].x, trail[i].y);
          ctx.lineTo(tx, ty);
        }
        ctx.strokeStyle = '#93c5fd';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Ball
      const [bx, by] = toScreen(x, y);
      ctx.beginPath();
      ctx.arc(bx, by, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#3b82f6';
      ctx.fill();
      ctx.strokeStyle = '#1d4ed8';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Velocity vector
      const vLen = Math.sqrt(vx * vx + vy * vy);
      if (vLen > 0.5 && !landed) {
        const arrowScale = 25 / Math.max(vLen, 1);
        const avx = vx * arrowScale;
        const avy = vy * arrowScale;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + avx, by - avy);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.stroke();
        // arrowhead
        const vAngle = Math.atan2(-avy, avx);
        ctx.beginPath();
        ctx.moveTo(bx + avx, by - avy);
        ctx.lineTo(bx + avx - 7 * Math.cos(vAngle - 0.4), by - avy - 7 * Math.sin(vAngle - 0.4));
        ctx.lineTo(bx + avx - 7 * Math.cos(vAngle + 0.4), by - avy - 7 * Math.sin(vAngle + 0.4));
        ctx.closePath();
        ctx.fillStyle = '#ef4444';
        ctx.fill();
      }

      // Range marker
      if (landed && range > 0) {
        const [rx, ry] = toScreen(range, 0);
        ctx.beginPath();
        ctx.moveTo(rx, ry - 8);
        ctx.lineTo(rx, ry + 8);
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.font = 'bold 11px sans-serif';
        ctx.fillStyle = '#10b981';
        ctx.textAlign = 'center';
        ctx.fillText(`R = ${range.toFixed(1)} m`, rx, ry + 24);
      }

      // Max height dashed line
      if (maxHeight > 1) {
        const [, mhy] = toScreen(0, maxHeight);
        ctx.beginPath();
        ctx.setLineDash([3, 3]);
        ctx.moveTo(padL, mhy);
        ctx.lineTo(padL + plotW, mhy);
        ctx.strokeStyle = '#fbbf2440';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.font = 'bold 10px sans-serif';
        ctx.fillStyle = '#f59e0b';
        ctx.textAlign = 'left';
        ctx.fillText(`H = ${maxHeight.toFixed(1)} m`, padL + 4, mhy - 4);
      }
    },

    getGraphData() {
      const speed = Math.sqrt(vx * vx + vy * vy);
      return {
        y: parseFloat(Math.max(0, y).toFixed(2)),
        speed: parseFloat(speed.toFixed(2)),
        ke: parseFloat((0.5 * mass * speed * speed).toFixed(2)),
        pe: parseFloat((mass * gravity * Math.max(0, y)).toFixed(2)),
      };
    },

    getFormulas() {
      const speed = Math.sqrt(vx * vx + vy * vy);
      const sinA = Math.sin(rad);
      const theoreticalRange = (velocity * velocity * Math.sin(2 * rad)) / gravity;
      const theoreticalHeight = (velocity * velocity * sinA * sinA) / (2 * gravity);
      const tFlight = (2 * velocity * sinA) / gravity;

      const formulas = [
        {
          label: 'Range (no drag)',
          latex: `R = \\frac{v_0^2 \\sin 2\\theta}{g}`,
          value: theoreticalRange.toFixed(1) + ' m',
          active: landed,
        },
        {
          label: 'Max Height (no drag)',
          latex: `H = \\frac{v_0^2 \\sin^2\\theta}{2g}`,
          value: theoreticalHeight.toFixed(1) + ' m',
          active: y >= maxHeight * 0.95 && !landed,
        },
        {
          label: 'Time of Flight (no drag)',
          latex: `T = \\frac{2v_0 \\sin\\theta}{g}`,
          value: tFlight.toFixed(2) + ' s',
        },
        {
          label: 'Current Speed',
          latex: `v = \\sqrt{v_x^2 + v_y^2}`,
          value: speed.toFixed(1) + ' m/s',
          active: !landed,
        },
      ];

      // Show actual simulated values when drag is active
      if (airResistance > 0 && landed) {
        formulas.push(
          {
            label: 'Actual Range (with drag)',
            latex: `R_{\\text{sim}}`,
            value: range.toFixed(1) + ' m',
            active: true,
          },
          {
            label: 'Actual Max Height',
            latex: `H_{\\text{sim}}`,
            value: maxHeight.toFixed(1) + ' m',
            active: true,
          },
          {
            label: 'Actual Flight Time',
            latex: `T_{\\text{sim}}`,
            value: flightTime.toFixed(2) + ' s',
            active: true,
          }
        );
      }

      return formulas;
    },
  };
}
