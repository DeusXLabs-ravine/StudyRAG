export const PARAMS = [
  { key: 'length', label: 'Length', unit: 'm', min: 0.5, max: 5, step: 0.1, default: 2, type: 'slider' },
  { key: 'mass', label: 'Mass', unit: 'kg', min: 0.1, max: 10, step: 0.1, default: 1, type: 'slider' },
  { key: 'gravity', label: 'Gravity', unit: 'm/s\u00B2', min: 1, max: 20, step: 0.1, default: 9.81, type: 'slider' },
  { key: 'damping', label: 'Damping', unit: '', min: 0, max: 2, step: 0.01, default: 0.1, type: 'slider' },
  { key: 'initialAngle', label: 'Initial Angle', unit: 'deg', min: 5, max: 170, step: 1, default: 45, type: 'slider' },
];

export const GRAPH_SERIES = [
  { key: 'theta', label: 'Angle', unit: 'rad' },
  { key: 'omega', label: 'Angular Vel', unit: 'rad/s' },
  { key: 'energy', label: 'Total Energy', unit: 'J' },
];

export default function createPendulum(params) {
  let theta, omega;
  const { length, mass, gravity, damping, initialAngle } = params;
  const initRad = (initialAngle * Math.PI) / 180;

  // State: [theta, omega]
  // Derivatives: [omega, -(g/L)*sin(theta) - c*omega]
  function derivs(th, om) {
    return [om, -(gravity / length) * Math.sin(th) - damping * om];
  }

  // RK4 — handles velocity-dependent damping correctly
  function rk4(th, om, dt) {
    const k1 = derivs(th, om);
    const k2 = derivs(th + k1[0] * dt * 0.5, om + k1[1] * dt * 0.5);
    const k3 = derivs(th + k2[0] * dt * 0.5, om + k2[1] * dt * 0.5);
    const k4 = derivs(th + k3[0] * dt, om + k3[1] * dt);
    return [
      th + (dt / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
      om + (dt / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]),
    ];
  }

  return {
    init() {
      theta = initRad;
      omega = 0;
    },

    step(dt) {
      [theta, omega] = rk4(theta, omega, dt);
    },

    draw(ctx, w, h) {
      const pivotX = w / 2;
      const pivotY = h * 0.15;
      const rodLen = Math.min(h * 0.55, w * 0.4);
      const bobRadius = 12 + mass * 2;

      const bobX = pivotX + rodLen * Math.sin(theta);
      const bobY = pivotY + rodLen * Math.cos(theta);

      // Pivot support
      ctx.beginPath();
      ctx.moveTo(pivotX - 30, pivotY);
      ctx.lineTo(pivotX + 30, pivotY);
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 3;
      ctx.stroke();

      for (let i = pivotX - 30; i <= pivotX + 30; i += 8) {
        ctx.beginPath();
        ctx.moveTo(i, pivotY);
        ctx.lineTo(i - 5, pivotY - 8);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Rod
      ctx.beginPath();
      ctx.moveTo(pivotX, pivotY);
      ctx.lineTo(bobX, bobY);
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Angle arc
      if (Math.abs(theta) > 0.02) {
        const arcR = 40;
        const startAngle = Math.PI / 2;
        const endAngle = Math.PI / 2 - theta;
        ctx.beginPath();
        ctx.arc(pivotX, pivotY, arcR, Math.min(startAngle, endAngle), Math.max(startAngle, endAngle));
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.stroke();

        const labelAngle = (startAngle + endAngle) / 2;
        ctx.font = 'bold 11px sans-serif';
        ctx.fillStyle = '#f59e0b';
        ctx.textAlign = 'center';
        ctx.fillText(
          `${(Math.abs(theta) * 180 / Math.PI).toFixed(1)}\u00B0`,
          pivotX + (arcR + 16) * Math.cos(labelAngle),
          pivotY + (arcR + 16) * Math.sin(labelAngle)
        );
      }

      // Bob
      ctx.beginPath();
      ctx.arc(bobX, bobY, bobRadius, 0, Math.PI * 2);
      const gradient = ctx.createRadialGradient(bobX - 3, bobY - 3, 2, bobX, bobY, bobRadius);
      gradient.addColorStop(0, '#60a5fa');
      gradient.addColorStop(1, '#2563eb');
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.strokeStyle = '#1d4ed8';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Equilibrium line
      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.moveTo(pivotX, pivotY);
      ctx.lineTo(pivotX, pivotY + rodLen + bobRadius + 10);
      ctx.strokeStyle = '#cbd5e180';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);

      // Info
      const period = 2 * Math.PI * Math.sqrt(length / gravity);
      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'left';
      ctx.fillText(`L = ${length.toFixed(1)} m`, 12, h - 30);
      ctx.fillText(`T \u2248 ${period.toFixed(2)} s`, 12, h - 14);
    },

    getGraphData() {
      const ht = length * (1 - Math.cos(theta));
      const ke = 0.5 * mass * length * length * omega * omega;
      const pe = mass * gravity * ht;
      return {
        theta: parseFloat(theta.toFixed(4)),
        omega: parseFloat(omega.toFixed(4)),
        energy: parseFloat((ke + pe).toFixed(4)),
      };
    },

    getFormulas() {
      const T0 = 2 * Math.PI * Math.sqrt(length / gravity);
      // Borda series approximation for exact period at large angles:
      // T = T0 * [1 + (1/4)sin²(θ0/2) + (9/64)sin⁴(θ0/2) + ...]
      const s = Math.sin(initRad / 2);
      const s2 = s * s;
      const s4 = s2 * s2;
      const periodExact = T0 * (1 + 0.25 * s2 + (9 / 64) * s4);
      const ht = length * (1 - Math.cos(theta));
      const ke = 0.5 * mass * length * length * omega * omega;
      const pe = mass * gravity * ht;

      return [
        {
          label: 'Period (small angle)',
          latex: `T_0 = 2\\pi\\sqrt{\\frac{L}{g}}`,
          value: T0.toFixed(3) + ' s',
        },
        {
          label: 'Period (corrected)',
          latex: `T \\approx T_0\\left[1 + \\tfrac{1}{4}\\sin^2\\!\\tfrac{\\theta_0}{2} + \\cdots\\right]`,
          value: periodExact.toFixed(3) + ' s',
          active: true,
        },
        {
          label: 'Equation of Motion',
          latex: `\\ddot{\\theta} = -\\frac{g}{L}\\sin\\theta - c\\dot{\\theta}`,
        },
        {
          label: 'Kinetic Energy',
          latex: `KE = \\frac{1}{2}mL^2\\dot{\\theta}^2`,
          value: ke.toFixed(3) + ' J',
          active: Math.abs(omega) > 0.1,
        },
        {
          label: 'Potential Energy',
          latex: `PE = mgL(1-\\cos\\theta)`,
          value: pe.toFixed(3) + ' J',
          active: ht > 0.1,
        },
      ];
    },
  };
}
