const SIMULATIONS = {
  projectile_motion: {
    id: 'projectile_motion',
    title: 'Ballistic Projectile Lab',
    description: 'Precision ballistics analysis exploring gravitational trajectories, air resistance dynamics, and terminal velocity.',
    category: 'mechanics',
    image: '/src/assets/simulations/projectile_motion.png',
    tags: ['kinematics', 'gravity', 'ballistics'],
    difficulty: 'beginner',
    loadEngine: () => import('./projectileMotion'),
  },
  pendulum: {
    id: 'pendulum',
    title: 'Precision Pendulum Clock',
    description: 'Analytical study of periodic motion, oscillatory damping, and energy conservation in harmonic systems.',
    category: 'mechanics',
    image: '/src/assets/simulations/pendulum.png',
    tags: ['oscillation', 'period', 'mechanics'],
    difficulty: 'beginner',
    loadEngine: () => import('./pendulum'),
  },
  spring_mass: {
    id: 'spring_mass',
    title: 'Harmonic Oscillator Stand',
    description: 'In-depth visualization of simple harmonic motion, Hooke\'s Law compliance, and vibrational damping.',
    category: 'mechanics',
    image: '/src/assets/simulations/spring_mass.png',
    tags: ['SHM', 'spring', 'dynamics'],
    difficulty: 'intermediate',
    loadEngine: () => import('./springMass'),
  },
  collision: {
    id: 'collision',
    title: 'Linear Momentum Track',
    description: 'Experimental verification of conservation laws through elastic and inelastic linear collisions.',
    category: 'mechanics',
    image: '/src/assets/simulations/collision.png',
    tags: ['momentum', 'energy', 'kinetics'],
    difficulty: 'intermediate',
    loadEngine: () => import('./collision'),
  },
};

export const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'mechanics', label: 'Mechanics' },
  { key: 'waves', label: 'Waves' },
  { key: 'electromagnetism', label: 'Electromagnetism' },
  { key: 'thermodynamics', label: 'Thermodynamics' },
];

export function getSimulation(id) {
  return SIMULATIONS[id] || null;
}

export function getAllSimulations() {
  return Object.values(SIMULATIONS);
}

export function getSimulationsByCategory(category) {
  if (!category || category === 'all') return getAllSimulations();
  return getAllSimulations().filter(s => s.category === category);
}

export default SIMULATIONS;
