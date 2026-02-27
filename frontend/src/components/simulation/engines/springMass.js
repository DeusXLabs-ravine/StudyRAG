export const PARAMS = [
  { key: 'springK', label: 'Spring Constant', unit: 'N/m', min: 1, max: 100, step: 1, default: 20, type: 'slider' },
  { key: 'mass', label: 'Mass', unit: 'kg', min: 0.1, max: 10, step: 0.1, default: 1, type: 'slider' },
  { key: 'displacement', label: 'Initial Displacement', unit: 'm', min: -3, max: 3, step: 0.1, default: 2, type: 'slider' },
  { key: 'damping', label: 'Damping', unit: '', min: 0, max: 5, step: 0.1, default: 0.2, type: 'slider' },
];

export const GRAPH_SERIES = [
  { key: 'x', label: 'Position', unit: 'm' },
  { key: 'v', label: 'Velocity', unit: 'm/s' },
  { key: 'ke', label: 'Kinetic Energy', unit: 'J' },
  { key: 'pe', label: 'Potential Energy', unit: 'J' },
];

export default function createSpringMass(params) {
  let x, v;
  const { springK, mass, displacement, damping } = params;

  // Derivatives: state = [x, v], returns [v, a]
  function derivs(pos, vel) {
    return [vel, -(springK / mass) * pos - (damping / mass) * vel];
  }

  function rk4(pos, vel, dt) {
    const k1 = derivs(pos, vel);
    const k2 = derivs(pos + k1[0] * dt * 0.5, vel + k1[1] * dt * 0.5);
    const k3 = derivs(pos + k2[0] * dt * 0.5, vel + k2[1] * dt * 0.5);
    const k4 = derivs(pos + k3[0] * dt, vel + k3[1] * dt);
    return [
      pos + (dt / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
      vel + (dt / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]),
    ];
  }

  return {
    init() {
      x = displacement;
      v = 0;
    },

    step(dt) {
      [x, v] = rk4(x, v, dt);
    },

    draw(ctx, w, h) {
      const cy = h / 2;
      const wallX = 40;
      const eqX = w / 2;
      const blockW = 50;
      const blockH = 40;
      const maxDisp = 3.5;
      const scale = (eqX - wallX - 30) / maxDisp;
      const blockCenterX = eqX + x * scale;

      // Wall
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(0, cy - 60, wallX, 120);
      ctx.beginPath();
      ctx.moveTo(wallX, cy - 60);
      ctx.lineTo(wallX, cy + 60);
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2;
      ctx.stroke();

      for (let i = cy - 60; i < cy + 60; i += 10) {
        ctx.beginPath();
        ctx.moveTo(wallX, i);
        ctx.lineTo(wallX - 10, i + 8);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Spring zigzag
      const springStart = wallX;
      const springEnd = blockCenterX - blockW / 2;
      const springLen = springEnd - springStart;
      const coils = 12;
      const coilW = springLen / coils;
      const coilH = 14;

      ctx.beginPath();
      ctx.moveTo(springStart, cy);
      for (let i = 0; i < coils; i++) {
        const cx1 = springStart + i * coilW + coilW * 0.25;
        const cx2 = springStart + i * coilW + coilW * 0.75;
        ctx.lineTo(cx1, cy - coilH);
        ctx.lineTo(cx2, cy + coilH);
      }
      ctx.lineTo(springEnd, cy);
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Block
      const bx = blockCenterX - blockW / 2;
      const by = cy - blockH / 2;
      ctx.fillStyle = '#2563eb';
      ctx.beginPath();
      ctx.roundRect(bx, by, blockW, blockH, 6);
      ctx.fill();
      ctx.strokeStyle = '#1d4ed8';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.fillText(`${mass.toFixed(1)}kg`, blockCenterX, cy + 4);

      // Equilibrium marker
      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.moveTo(eqX, cy - 50);
      ctx.lineTo(eqX, cy + 50);
      ctx.strokeStyle = '#f59e0b80';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.font = 'bold 10px sans-serif';
      ctx.fillStyle = '#f59e0b';
      ctx.textAlign = 'center';
      ctx.fillText('x=0', eqX, cy + 64);

      // Displacement arrow
      if (Math.abs(x) > 0.05) {
        const arrowY = cy + blockH / 2 + 20;
        ctx.beginPath();
        ctx.moveTo(eqX, arrowY);
        ctx.lineTo(blockCenterX, arrowY);
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.stroke();

        const dir = x > 0 ? 1 : -1;
        ctx.beginPath();
        ctx.moveTo(blockCenterX, arrowY);
        ctx.lineTo(blockCenterX - dir * 8, arrowY - 4);
        ctx.lineTo(blockCenterX - dir * 8, arrowY + 4);
        ctx.closePath();
        ctx.fillStyle = '#10b981';
        ctx.fill();

        ctx.font = 'bold 10px sans-serif';
        ctx.fillStyle = '#10b981';
        ctx.textAlign = 'center';
        ctx.fillText(`x = ${x.toFixed(2)} m`, (eqX + blockCenterX) / 2, arrowY - 8);
      }

      // Floor
      ctx.beginPath();
      ctx.moveTo(wallX, cy + blockH / 2 + 2);
      ctx.lineTo(w, cy + blockH / 2 + 2);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.stroke();
    },

    getGraphData() {
      const ke = 0.5 * mass * v * v;
      const pe = 0.5 * springK * x * x;
      return {
        x: parseFloat(x.toFixed(4)),
        v: parseFloat(v.toFixed(4)),
        ke: parseFloat(ke.toFixed(4)),
        pe: parseFloat(pe.toFixed(4)),
      };
    },

    getFormulas() {
      const omega0 = Math.sqrt(springK / mass);
      const period = (2 * Math.PI) / omega0;
      const zeta = damping / (2 * Math.sqrt(springK * mass)); // damping ratio
      const ke = 0.5 * mass * v * v;
      const pe = 0.5 * springK * x * x;

      const formulas = [
        {
          label: 'Natural Frequency',
          latex: `\\omega_0 = \\sqrt{\\frac{k}{m}}`,
          value: omega0.toFixed(3) + ' rad/s',
          active: true,
        },
        {
          label: 'Period',
          latex: `T = \\frac{2\\pi}{\\omega_0}`,
          value: period.toFixed(3) + ' s',
        },
        {
          label: 'Equation of Motion',
          latex: `\\ddot{x} = -\\frac{k}{m}x - \\frac{c}{m}\\dot{x}`,
        },
        {
          label: 'Total Energy',
          latex: `E = \\frac{1}{2}kx^2 + \\frac{1}{2}mv^2`,
          value: (ke + pe).toFixed(3) + ' J',
          active: true,
        },
      ];

      if (damping > 0) {
        formulas.push({
          label: 'Damping Ratio',
          latex: `\\zeta = \\frac{c}{2\\sqrt{km}}`,
          value: zeta.toFixed(3) + (zeta < 1 ? ' (underdamped)' : zeta === 1 ? ' (critical)' : ' (overdamped)'),
          active: true,
        });
      }

      return formulas;
    },
  };
}
