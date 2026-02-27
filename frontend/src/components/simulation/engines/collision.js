export const PARAMS = [
  { key: 'mass1', label: 'Mass 1', unit: 'kg', min: 0.5, max: 10, step: 0.5, default: 2, type: 'slider' },
  { key: 'mass2', label: 'Mass 2', unit: 'kg', min: 0.5, max: 10, step: 0.5, default: 2, type: 'slider' },
  { key: 'v1', label: 'Velocity 1', unit: 'm/s', min: -10, max: 10, step: 0.5, default: 5, type: 'slider' },
  { key: 'v2', label: 'Velocity 2', unit: 'm/s', min: -10, max: 10, step: 0.5, default: -3, type: 'slider' },
  { key: 'elasticity', label: 'Elasticity (e)', unit: '', min: 0, max: 1, step: 0.1, default: 1, type: 'slider' },
];

export const GRAPH_SERIES = [
  { key: 'p1', label: 'Momentum 1', unit: 'kg\u00B7m/s' },
  { key: 'p2', label: 'Momentum 2', unit: 'kg\u00B7m/s' },
  { key: 'pTotal', label: 'Total Momentum', unit: 'kg\u00B7m/s' },
  { key: 'keTotal', label: 'Total KE', unit: 'J' },
];

export default function createCollision(params) {
  const { mass1, mass2, v1: initV1, v2: initV2, elasticity } = params;

  let x1, x2, vel1, vel2;
  let collided = false;
  let flashTimer = 0;
  let phase = 'approaching';

  const radius1 = 15 + mass1 * 3;
  const radius2 = 15 + mass2 * 3;

  // Physical radii in world units (scaled from pixel radii by screen scale w/16)
  // Objects start 8 units apart; radii ~0.2–0.5 world units is reasonable
  const worldR1 = radius1 / 50;
  const worldR2 = radius2 / 50;
  const contactDist = worldR1 + worldR2;

  // Exact post-collision velocities from conservation of momentum + coefficient of restitution
  // v1f = [m1*v1 + m2*v2 + e*m2*(v2-v1)] / (m1+m2)
  // v2f = [m1*v1 + m2*v2 + e*m1*(v1-v2)] / (m1+m2)
  const totalM = mass1 + mass2;
  const v1f = (mass1 * initV1 + mass2 * initV2 + elasticity * mass2 * (initV2 - initV1)) / totalM;
  const v2f = (mass1 * initV1 + mass2 * initV2 + elasticity * mass1 * (initV1 - initV2)) / totalM;

  return {
    init() {
      x1 = -4;
      x2 = 4;
      vel1 = initV1;
      vel2 = initV2;
      collided = false;
      flashTimer = 0;
      phase = 'approaching';
    },

    step(dt) {
      if (phase === 'colliding') {
        flashTimer -= dt;
        if (flashTimer <= 0) {
          phase = 'separating';
          vel1 = v1f;
          vel2 = v2f;
        }
        return;
      }

      x1 += vel1 * dt;
      x2 += vel2 * dt;

      // Detect collision: objects touch when gap <= contact distance AND they are approaching
      const gap = x2 - x1;
      const relativeApproach = vel1 - vel2; // positive means closing
      if (!collided && gap <= contactDist && relativeApproach > 0) {
        collided = true;
        phase = 'colliding';
        flashTimer = 0.12;
        // Place objects exactly at contact point
        const midpoint = (x1 + x2) / 2;
        x1 = midpoint - contactDist / 2;
        x2 = midpoint + contactDist / 2;
      }
    },

    draw(ctx, w, h) {
      const cy = h / 2;
      const scale = w / 16;
      const centerX = w / 2;
      const toScreenX = (px) => centerX + px * scale;

      // Floor
      ctx.beginPath();
      ctx.moveTo(0, cy + 40);
      ctx.lineTo(w, cy + 40);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Collision flash
      if (phase === 'colliding') {
        const fx = toScreenX((x1 + x2) / 2);
        const gradient = ctx.createRadialGradient(fx, cy, 0, fx, cy, 50);
        gradient.addColorStop(0, 'rgba(250, 204, 21, 0.5)');
        gradient.addColorStop(1, 'rgba(250, 204, 21, 0)');
        ctx.beginPath();
        ctx.arc(fx, cy, 50, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      // Draw object helper
      function drawObj(sx, r, vel, fillColor, strokeColor, label) {
        ctx.beginPath();
        ctx.arc(sx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = fillColor;
        ctx.fill();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.font = 'bold 10px sans-serif';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText(label, sx, cy + 4);

        // Velocity arrow
        if (Math.abs(vel) > 0.1) {
          const arrLen = vel * 6;
          const arrowY = cy - r - 12;
          ctx.beginPath();
          ctx.moveTo(sx, arrowY);
          ctx.lineTo(sx + arrLen, arrowY);
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 2;
          ctx.stroke();
          const dir = vel > 0 ? 1 : -1;
          ctx.beginPath();
          ctx.moveTo(sx + arrLen, arrowY);
          ctx.lineTo(sx + arrLen - dir * 6, arrowY - 4);
          ctx.lineTo(sx + arrLen - dir * 6, arrowY + 4);
          ctx.closePath();
          ctx.fillStyle = strokeColor;
          ctx.fill();

          ctx.font = 'bold 9px sans-serif';
          ctx.fillStyle = '#475569';
          ctx.fillText(`v=${vel.toFixed(1)}`, sx + arrLen / 2, arrowY - 8);
        }
      }

      drawObj(toScreenX(x1), radius1, vel1, '#3b82f6', '#1d4ed8', `${mass1}kg`);
      drawObj(toScreenX(x2), radius2, vel2, '#06b6d4', '#0891b2', `${mass2}kg`);

      // Phase label
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      if (phase === 'approaching') {
        ctx.fillStyle = '#64748b';
        ctx.fillText('Approaching', w / 2, h - 16);
      } else if (phase === 'colliding') {
        ctx.fillStyle = '#f59e0b';
        ctx.fillText('Collision', w / 2, h - 16);
      } else {
        ctx.fillStyle = '#10b981';
        ctx.fillText('Post-collision', w / 2, h - 16);
      }
    },

    getGraphData() {
      return {
        p1: parseFloat((mass1 * vel1).toFixed(3)),
        p2: parseFloat((mass2 * vel2).toFixed(3)),
        pTotal: parseFloat((mass1 * vel1 + mass2 * vel2).toFixed(3)),
        keTotal: parseFloat((0.5 * mass1 * vel1 * vel1 + 0.5 * mass2 * vel2 * vel2).toFixed(3)),
      };
    },

    getFormulas() {
      const keBefore = 0.5 * mass1 * initV1 * initV1 + 0.5 * mass2 * initV2 * initV2;
      const keAfter = 0.5 * mass1 * v1f * v1f + 0.5 * mass2 * v2f * v2f;
      const keCurrent = 0.5 * mass1 * vel1 * vel1 + 0.5 * mass2 * vel2 * vel2;
      const pBefore = mass1 * initV1 + mass2 * initV2;
      const pAfter = mass1 * vel1 + mass2 * vel2;
      const keLossPct = keBefore > 0 ? ((1 - keAfter / keBefore) * 100) : 0;

      return [
        {
          label: 'Momentum Conservation',
          latex: `m_1 v_1 + m_2 v_2 = m_1 v_1' + m_2 v_2'`,
          value: `${pBefore.toFixed(2)} \u2248 ${pAfter.toFixed(2)}`,
          active: true,
        },
        {
          label: 'Coefficient of Restitution',
          latex: `e = \\frac{v_2' - v_1'}{v_1 - v_2}`,
          value: elasticity.toFixed(1),
        },
        {
          label: 'KE Before',
          latex: `KE_i = \\tfrac{1}{2}m_1v_1^2 + \\tfrac{1}{2}m_2v_2^2`,
          value: keBefore.toFixed(2) + ' J',
          active: !collided,
        },
        {
          label: collided ? 'KE After' : 'KE Current',
          latex: `KE_f = \\tfrac{1}{2}m_1v_1'^2 + \\tfrac{1}{2}m_2v_2'^2`,
          value: (collided ? keAfter : keCurrent).toFixed(2) + ' J',
          active: collided,
        },
        {
          label: 'KE Lost',
          latex: `\\Delta KE = KE_i - KE_f`,
          value: collided ? `${(keBefore - keAfter).toFixed(2)} J (${keLossPct.toFixed(1)}%)` : '\u2014',
          active: collided,
        },
      ];
    },
  };
}
