const CelestialPresets = {
  getOrbitalVelocity(centerMass, r, G = 1.0) {
    const gConst = G * 1000.0;
    return Math.sqrt((gConst * centerMass) / (r + 12.0));
  },

  loadSolarSystem(engine) {
    engine.clear();
    engine.camera.x = 0;
    engine.camera.y = 0;
    engine.camera.targetZoom = 0.85;

    const sun = engine.addBody(new CelestialBody({
      name: 'Sun',
      type: 'star',
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      mass: 8000,
      color: '#ffd166',
      glowColor: '#f59e0b',
      fixed: false
    }));

    const G = engine.G;

    const planets = [
      { name: 'Mercury', type: 'planet', dist: 75,  mass: 15,  color: '#94a3b8' },
      { name: 'Venus',   type: 'planet', dist: 120, mass: 35,  color: '#e2e8f0' },
      { name: 'Earth',   type: 'planet', dist: 180, mass: 45,  color: '#38bdf8' },
      { name: 'Mars',    type: 'planet', dist: 250, mass: 25,  color: '#f87171' },
      { name: 'Jupiter', type: 'gas-giant', dist: 380, mass: 280, color: '#fbbf24' },
      { name: 'Saturn',  type: 'gas-giant', dist: 530, mass: 190, color: '#fde047', hasRings: true }
    ];

    let earthBody = null;

    planets.forEach(p => {
      const v = this.getOrbitalVelocity(sun.mass, p.dist, G);
      const body = engine.addBody(new CelestialBody({
        name: p.name,
        type: p.type,
        x: p.dist,
        y: 0,
        vx: 0,
        vy: v,
        mass: p.mass,
        color: p.color,
        hasRings: p.hasRings || false
      }));

      if (p.name === 'Earth') {
        earthBody = body;
      }
    });

    if (earthBody) {
      const moonDist = 20;
      const moonV = Math.sqrt((engine.G * 1000 * earthBody.mass) / moonDist);
      engine.addBody(new CelestialBody({
        name: 'Luna',
        type: 'asteroid',
        x: earthBody.x + moonDist,
        y: earthBody.y,
        vx: earthBody.vx,
        vy: earthBody.vy + moonV,
        mass: 3,
        color: '#cbd5e1'
      }));
    }

    const cometDist = 450;
    engine.addBody(new CelestialBody({
      name: "Halley's Comet",
      type: 'comet',
      x: -cometDist,
      y: 120,
      vx: 1.5,
      vy: -2.8,
      mass: 4,
      color: '#a7f3d0'
    }));
  },

  loadFigureEight(engine) {
    engine.clear();
    engine.camera.x = 0;
    engine.camera.y = 0;
    engine.camera.targetZoom = 1.35;

    const scale = 220;
    const vScale = 3.65;
    const mass = 1200;

    const x1 = -0.97000436 * scale;
    const y1 = 0.24308753 * scale;
    const vx1 = 0.46620531 * vScale;
    const vy1 = 0.43236573 * vScale;

    engine.addBody(new CelestialBody({
      name: 'Alpha Centauri A',
      type: 'star',
      x: x1,
      y: y1,
      vx: vx1,
      vy: vy1,
      mass: mass,
      color: '#00f0ff',
      glowColor: '#00f0ff'
    }));

    engine.addBody(new CelestialBody({
      name: 'Alpha Centauri B',
      type: 'star',
      x: -x1,
      y: -y1,
      vx: vx1,
      vy: vy1,
      mass: mass,
      color: '#c084fc',
      glowColor: '#a855f7'
    }));

    engine.addBody(new CelestialBody({
      name: 'Proxima Centauri',
      type: 'star',
      x: 0,
      y: 0,
      vx: -2 * vx1,
      vy: -2 * vy1,
      mass: mass,
      color: '#ffd166',
      glowColor: '#f59e0b'
    }));
  },

  loadHarmonicOrrery(engine) {
    engine.clear();
    engine.camera.x = 0;
    engine.camera.y = 0;
    engine.camera.targetZoom = 0.95;

    const sun = engine.addBody(new CelestialBody({
      name: 'Harmonia Prime',
      type: 'star',
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      mass: 6500,
      color: '#ffd166',
      glowColor: '#f59e0b'
    }));

    const harmonicNotes = [
      { name: 'C4 Resonance', dist: 90,  color: '#38bdf8', mass: 35 },
      { name: 'D4 Resonance', dist: 135, color: '#818cf8', mass: 40 },
      { name: 'E4 Resonance', dist: 190, color: '#a78bfa', mass: 45 },
      { name: 'G4 Resonance', dist: 260, color: '#f472b6', mass: 50 },
      { name: 'A4 Resonance', dist: 340, color: '#fb7185', mass: 60 },
      { name: 'C5 Resonance', dist: 430, color: '#34d399', mass: 70 }
    ];

    harmonicNotes.forEach((note, idx) => {
      const v = this.getOrbitalVelocity(sun.mass, note.dist, engine.G);
      const angle = (idx * (Math.PI / 3));
      const px = Math.cos(angle) * note.dist;
      const py = Math.sin(angle) * note.dist;
      const vx = -Math.sin(angle) * v;
      const vy = Math.cos(angle) * v;

      engine.addBody(new CelestialBody({
        name: note.name,
        type: 'planet',
        x: px,
        y: py,
        vx: vx,
        vy: vy,
        mass: note.mass,
        color: note.color,
        glowColor: note.color
      }));
    });
  },

  loadGalaxyCollision(engine) {
    engine.clear();
    engine.camera.x = 0;
    engine.camera.y = 0;
    engine.camera.targetZoom = 0.65;

    const createSpiralGalaxy = (centerX, centerY, vBaseX, vBaseY, coreMass, starCount, coreColor, diskColor, dir = 1) => {
      engine.addBody(new CelestialBody({
        name: 'Galactic Nucleus',
        type: 'black-hole',
        x: centerX,
        y: centerY,
        vx: vBaseX,
        vy: vBaseY,
        mass: coreMass,
        color: coreColor
      }));

      for (let i = 0; i < starCount; i++) {
        const radius = 30 + Math.random() * 220;
        const theta = Math.random() * Math.PI * 2;
        const px = centerX + Math.cos(theta) * radius;
        const py = centerY + Math.sin(theta) * radius;

        const vOrbital = Math.sqrt((engine.G * 1000 * coreMass) / (radius + 20));
        const vx = vBaseX + (-Math.sin(theta) * vOrbital * dir);
        const vy = vBaseY + (Math.cos(theta) * vOrbital * dir);

        engine.addBody(new CelestialBody({
          name: `Star ${i + 1}`,
          type: 'asteroid',
          x: px,
          y: py,
          vx: vx,
          vy: vy,
          mass: 2 + Math.random() * 4,
          color: diskColor
        }));
      }
    };

    createSpiralGalaxy(-260, -90, 1.2, 0.4, 3800, 45, '#00f0ff', '#38bdf8', 1);
    createSpiralGalaxy(260, 90, -1.2, -0.4, 3800, 45, '#c084fc', '#e879f9', -1);
  },

  loadBlackHoleSingularity(engine) {
    engine.clear();
    engine.camera.x = 0;
    engine.camera.y = 0;
    engine.camera.targetZoom = 0.9;

    const bh = engine.addBody(new CelestialBody({
      name: 'Gargantua Singularity',
      type: 'black-hole',
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      mass: 14000,
      color: '#8b5cf6',
      glowColor: '#c084fc'
    }));

    const particleCount = 50;
    for (let i = 0; i < particleCount; i++) {
      const dist = 55 + Math.random() * 320;
      const angle = (i / particleCount) * Math.PI * 2 + (Math.random() * 0.2);
      const v = Math.sqrt((engine.G * 1000 * bh.mass) / dist) * (0.95 + Math.random() * 0.1);

      const px = Math.cos(angle) * dist;
      const py = Math.sin(angle) * dist;
      const vx = -Math.sin(angle) * v;
      const vy = Math.cos(angle) * v;

      const colors = ['#f43f5e', '#fb923c', '#fbbf24', '#facc15', '#67e8f9'];
      const col = colors[Math.floor(Math.random() * colors.length)];

      engine.addBody(new CelestialBody({
        name: `Accretion Particle #${i + 1}`,
        type: (i % 7 === 0) ? 'planet' : 'asteroid',
        x: px,
        y: py,
        vx: vx,
        vy: vy,
        mass: (i % 7 === 0) ? 25 : 3,
        color: col
      }));
    }

    engine.addBody(new CelestialBody({
      name: 'Rogue Wanderer',
      type: 'star',
      x: -480,
      y: 220,
      vx: 8.5,
      vy: -3.2,
      mass: 800,
      color: '#38bdf8'
    }));
  },

  loadBinaryStars(engine) {
    engine.clear();
    engine.camera.x = 0;
    engine.camera.y = 0;
    engine.camera.targetZoom = 1.0;

    const separation = 150;
    const mass = 4500;
    const vOrbit = Math.sqrt((engine.G * 1000 * mass) / (separation * 2));

    engine.addBody(new CelestialBody({
      name: 'Helios Alpha',
      type: 'star',
      x: -separation / 2,
      y: 0,
      vx: 0,
      vy: -vOrbit * 0.8,
      mass: mass,
      color: '#ffd166',
      glowColor: '#f59e0b'
    }));

    engine.addBody(new CelestialBody({
      name: 'Helios Beta',
      type: 'star',
      x: separation / 2,
      y: 0,
      vx: 0,
      vy: vOrbit * 0.8,
      mass: mass,
      color: '#06b6d4',
      glowColor: '#3b82f6'
    }));

    const planetDist = 340;
    const vPlanet = Math.sqrt((engine.G * 1000 * (mass * 2)) / planetDist);
    engine.addBody(new CelestialBody({
      name: 'Tatooine Prime',
      type: 'planet',
      x: 0,
      y: planetDist,
      vx: -vPlanet,
      vy: 0,
      mass: 55,
      color: '#f97316'
    }));

    engine.addBody(new CelestialBody({
      name: 'Chaotic Wanderer',
      type: 'planet',
      x: 0,
      y: -210,
      vx: vPlanet * 1.1,
      vy: 0,
      mass: 25,
      color: '#ec4899'
    }));
  },

  loadLagrangePoints(engine) {
    engine.clear();
    engine.camera.x = 0;
    engine.camera.y = 0;
    engine.camera.targetZoom = 1.0;

    const sun = engine.addBody(new CelestialBody({
      name: 'Sol',
      type: 'star',
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      mass: 7500,
      color: '#ffd166'
    }));

    const jupDist = 260;
    const jupV = this.getOrbitalVelocity(sun.mass, jupDist, engine.G);
    engine.addBody(new CelestialBody({
      name: 'Jupiter',
      type: 'gas-giant',
      x: jupDist,
      y: 0,
      vx: 0,
      vy: jupV,
      mass: 500,
      color: '#fbbf24',
      hasRings: true
    }));

    const angles = [Math.PI / 3, -Math.PI / 3];
    angles.forEach((ang, i) => {
      const lx = Math.cos(ang) * jupDist;
      const ly = Math.sin(ang) * jupDist;
      const lvx = -Math.sin(ang) * jupV;
      const lvy = Math.cos(ang) * jupV;

      engine.addBody(new CelestialBody({
        name: i === 0 ? 'Trojan Camp (L4)' : 'Greek Camp (L5)',
        type: 'asteroid',
        x: lx,
        y: ly,
        vx: lvx,
        vy: lvy,
        mass: 12,
        color: '#67e8f9'
      }));
    });
  },

  loadChaosSwarm(engine) {
    engine.clear();
    engine.camera.x = 0;
    engine.camera.y = 0;
    engine.camera.targetZoom = 0.9;

    const count = 35;
    for (let i = 0; i < count; i++) {
      const r = 50 + Math.random() * 260;
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 2.2;
      const tanAngle = angle + Math.PI / 2 + (Math.random() - 0.5) * 0.4;

      engine.addBody(new CelestialBody({
        name: `Cluster Core ${i + 1}`,
        type: i < 3 ? 'star' : (i < 12 ? 'planet' : 'comet'),
        x: Math.cos(angle) * r,
        y: Math.sin(angle) * r,
        vx: Math.cos(tanAngle) * speed,
        vy: Math.sin(tanAngle) * speed,
        mass: i < 3 ? 1200 : (i < 12 ? 80 : 10),
        color: ['#00f0ff', '#8b5cf6', '#ffd166', '#f43f5e', '#34d399'][i % 5]
      }));
    }
  },

  loadEmptyVoid(engine) {
    engine.clear();
    engine.camera.x = 0;
    engine.camera.y = 0;
    engine.camera.targetZoom = 1.0;
  }
};

window.CelestialPresets = CelestialPresets;
