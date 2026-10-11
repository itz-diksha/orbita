class CelestialBody {
  constructor(options = {}) {
    this.id = options.id || ('body_' + Math.random().toString(36).substr(2, 9));
    this.name = options.name || 'Celestial Body';
    this.type = options.type || 'planet';
    
    this.x = options.x || 0;
    this.y = options.y || 0;
    this.vx = options.vx || 0;
    this.vy = options.vy || 0;
    this.ax = 0;
    this.ay = 0;
    
    this.mass = options.mass || 100;
    this.radius = options.radius || this.calculateRadius(this.type, this.mass);
    this.fixed = options.fixed || false;
    
    this.color = options.color || this.getDefaultColor(this.type);
    this.glowColor = options.glowColor || this.color;
    this.hasRings = options.hasRings || (this.type === 'gas-giant');
    this.ringRadius = this.radius * (options.ringScale || 2.2);
    
    this.trail = [];
    this.maxTrailLength = options.maxTrailLength || 400;
    
    this.prevAngle = 0;
    this.orbitAngleAccum = 0;
    this.lastDistToPrimary = 0;
    this.prevDistDiff = 0;
    this.primaryBodyId = null;
    this.lastChimeTime = 0;
    
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.rotationAngle = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.03;
  }

  calculateRadius(type, mass) {
    switch (type) {
      case 'black-hole':
        return Math.max(7, Math.pow(mass, 0.28) * 1.8);
      case 'star':
        return Math.max(16, Math.pow(mass, 0.35) * 2.8);
      case 'gas-giant':
        return Math.max(9, Math.pow(mass, 0.33) * 2.2);
      case 'planet':
        return Math.max(4.5, Math.pow(mass, 0.32) * 1.8);
      case 'comet':
        return Math.max(3, Math.pow(mass, 0.25) * 1.2);
      case 'asteroid':
      default:
        return Math.max(2, Math.pow(mass, 0.22) * 1.0);
    }
  }

  getDefaultColor(type) {
    switch (type) {
      case 'star': return '#ffd166';
      case 'gas-giant': return '#f59e0b';
      case 'planet': return '#38bdf8';
      case 'black-hole': return '#c084fc';
      case 'comet': return '#a7f3d0';
      case 'asteroid': default: return '#cbd5e1';
    }
  }

  recordTrailPoint() {
    const last = this.trail[this.trail.length - 1];
    if (!last || (Math.hypot(this.x - last.x, this.y - last.y) > 3.0)) {
      this.trail.push({ x: this.x, y: this.y });
      if (this.trail.length > this.maxTrailLength) {
        this.trail.shift();
      }
    }
  }
}

class CosmicParticle {
  constructor(x, y, vx, vy, color, size, maxLife) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.size = size;
    this.life = maxLife;
    this.maxLife = maxLife;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.98;
    this.vy *= 0.98;
    this.life--;
  }

  draw(ctx) {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * alpha, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class ShockwaveRing {
  constructor(x, y, maxRadius, color) {
    this.x = x;
    this.y = y;
    this.radius = 2;
    this.maxRadius = maxRadius;
    this.color = color;
    this.life = 1.0;
  }

  update() {
    this.radius += (this.maxRadius - this.radius) * 0.12 + 1.2;
    this.life = Math.max(0, 1.0 - (this.radius / this.maxRadius));
  }

  draw(ctx) {
    if (this.life <= 0) return;
    ctx.save();
    ctx.globalAlpha = this.life * 0.8;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = Math.max(1, 4 * this.life);
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

class PhysicsEngine {
  constructor() {
    this.bodies = [];
    this.particles = [];
    this.shockwaves = [];

    this.G = 1.0;
    this.softening = 12.0;
    this.collisionMode = 'merge';
    this.timeScale = 1.0;
    this.isPaused = false;
    this.isReversed = false;

    this.camera = {
      x: 0,
      y: 0,
      zoom: 1.0,
      targetZoom: 1.0,
      trackingBodyId: null
    };

    this.viewportWidth = window.innerWidth;
    this.viewportHeight = window.innerHeight;

    this.gridSpacing = 50;
    this.gridWarpScale = 1.0;

    this.cosmicTime = 0;
    this.totalCollisions = 0;
  }

  clear() {
    this.bodies = [];
    this.particles = [];
    this.shockwaves = [];
    this.camera.trackingBodyId = null;
    this.cosmicTime = 0;
  }

  addBody(body) {
    this.bodies.push(body);
    return body;
  }

  removeBody(bodyOrId) {
    const id = typeof bodyOrId === 'string' ? bodyOrId : bodyOrId.id;
    const index = this.bodies.findIndex(b => b.id === id);
    if (index !== -1) {
      if (this.camera.trackingBodyId === id) {
        this.camera.trackingBodyId = null;
      }
      return this.bodies.splice(index, 1)[0];
    }
    return null;
  }

  getCenterOfMass() {
    let totalMass = 0;
    let cx = 0;
    let cy = 0;
    for (const b of this.bodies) {
      totalMass += b.mass;
      cx += b.x * b.mass;
      cy += b.y * b.mass;
    }
    if (totalMass === 0) return { x: 0, y: 0, totalMass: 0 };
    return { x: cx / totalMass, y: cy / totalMass, totalMass };
  }

  screenToWorld(sx, sy) {
    return {
      x: (sx - this.viewportWidth / 2) / this.camera.zoom + this.camera.x,
      y: (sy - this.viewportHeight / 2) / this.camera.zoom + this.camera.y
    };
  }

  worldToScreen(wx, wy) {
    return {
      x: (wx - this.camera.x) * this.camera.zoom + this.viewportWidth / 2,
      y: (wy - this.camera.y) * this.camera.zoom + this.viewportHeight / 2
    };
  }

  getBodyAtScreen(sx, sy, hitPadding = 12) {
    const world = this.screenToWorld(sx, sy);
    for (let i = this.bodies.length - 1; i >= 0; i--) {
      const b = this.bodies[i];
      const dist = Math.hypot(b.x - world.x, b.y - world.y);
      const effectiveRadius = Math.max(b.radius, hitPadding / this.camera.zoom);
      if (dist <= effectiveRadius) {
        return b;
      }
    }
    return null;
  }

  step(rawDt) {
    if (this.isPaused) return;

    const dt = (this.isReversed ? -1 : 1) * Math.min(rawDt, 0.05) * this.timeScale;
    this.cosmicTime += Math.abs(dt);

    const n = this.bodies.length;
    if (n === 0) return;

    const ax = new Float64Array(n);
    const ay = new Float64Array(n);
    const gConst = this.G * 1000.0;
    const eps2 = this.softening * this.softening;

    for (let i = 0; i < n; i++) {
      const b1 = this.bodies[i];
      for (let j = i + 1; j < n; j++) {
        const b2 = this.bodies[j];
        const dx = b2.x - b1.x;
        const dy = b2.y - b1.y;
        const distSq = dx * dx + dy * dy + eps2;
        const dist = Math.sqrt(distSq);
        const invDist3 = 1.0 / (distSq * dist);

        const forceMagnitude = gConst * invDist3;
        const fx = forceMagnitude * dx;
        const fy = forceMagnitude * dy;

        ax[i] += fx * b2.mass;
        ay[i] += fy * b2.mass;
        ax[j] -= fx * b1.mass;
        ay[j] -= fy * b1.mass;
      }
    }

    for (let i = 0; i < n; i++) {
      const b = this.bodies[i];
      if (!b.fixed) {
        b.vx += ax[i] * dt;
        b.vy += ay[i] * dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
      }
      b.ax = ax[i];
      b.ay = ay[i];
      b.recordTrailPoint();
      b.pulsePhase += 0.05;
      b.rotationAngle += b.rotationSpeed;
    }

    this.resolveCollisions();
    this.updateParticles();
    this.updateCameraTracking();
    this.processAudioHarmonics();
  }

  resolveCollisions() {
    if (this.collisionMode === 'ignore') return;

    const toRemove = new Set();
    const len = this.bodies.length;

    for (let i = 0; i < len; i++) {
      if (toRemove.has(i)) continue;
      const b1 = this.bodies[i];

      for (let j = i + 1; j < len; j++) {
        if (toRemove.has(j)) continue;
        const b2 = this.bodies[j];

        const dx = b2.x - b1.x;
        const dy = b2.y - b1.y;
        const dist = Math.hypot(dx, dy);
        const minDist = b1.radius + b2.radius;

        if (dist < minDist) {
          if (this.collisionMode === 'merge') {
            const survivor = b1.mass >= b2.mass ? b1 : b2;
            const consumed = survivor === b1 ? b2 : b1;
            const survivorIdx = survivor === b1 ? i : j;
            const consumedIdx = survivor === b1 ? j : i;

            const totalMass = survivor.mass + consumed.mass;
            if (!survivor.fixed) {
              survivor.vx = (survivor.mass * survivor.vx + consumed.mass * consumed.vx) / totalMass;
              survivor.vy = (survivor.mass * survivor.vy + consumed.mass * consumed.vy) / totalMass;
            }
            survivor.mass = totalMass;
            survivor.radius = survivor.calculateRadius(survivor.type, survivor.mass);

            this.spawnSupernovaDebris(consumed.x, consumed.y, survivor.color, consumed.color, Math.min(survivor.mass, 500));
            this.shockwaves.push(new ShockwaveRing(consumed.x, consumed.y, Math.min(220, survivor.radius * 3.5), survivor.glowColor));

            if (window.cosmicAudio) {
              if (survivor.type === 'black-hole') {
                window.cosmicAudio.playBlackHoleSwallow();
              } else {
                window.cosmicAudio.playCollisionImpact(Math.min(1.0, consumed.mass / 1000));
              }
            }

            toRemove.add(consumedIdx);
            this.totalCollisions++;

          } else if (this.collisionMode === 'bounce') {
            const nx = dx / (dist || 0.001);
            const ny = dy / (dist || 0.001);

            const kx = b1.vx - b2.vx;
            const ky = b1.vy - b2.vy;
            const p = 2 * (nx * kx + ny * ky) / (b1.mass + b2.mass);

            if (!b1.fixed) {
              b1.vx -= p * b2.mass * nx;
              b1.vy -= p * b2.mass * ny;
              b1.x -= nx * (minDist - dist) * 0.5;
              b1.y -= ny * (minDist - dist) * 0.5;
            }
            if (!b2.fixed) {
              b2.vx += p * b1.mass * nx;
              b2.vy += p * b1.mass * ny;
              b2.x += nx * (minDist - dist) * 0.5;
              b2.y += ny * (minDist - dist) * 0.5;
            }

            this.spawnSparks(b1.x + nx * b1.radius, b1.y + ny * b1.radius, 12, '#ffffff');
            if (window.cosmicAudio) {
              window.cosmicAudio.playCollisionImpact(0.2);
            }
          }
        }
      }
    }

    if (toRemove.size > 0) {
      this.bodies = this.bodies.filter((_, idx) => !toRemove.has(idx));
    }
  }

  spawnSupernovaDebris(x, y, color1, color2, mass) {
    const count = Math.min(60, Math.floor(15 + mass * 0.1));
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 4.5;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const color = Math.random() > 0.5 ? color1 : color2;
      const size = 1.5 + Math.random() * 3.5;
      const life = 30 + Math.floor(Math.random() * 45);
      this.particles.push(new CosmicParticle(x, y, vx, vy, color, size, life));
    }
  }

  spawnSparks(x, y, count, color) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.0 + Math.random() * 3.0;
      this.particles.push(new CosmicParticle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, color, 2, 25));
    }
  }

  updateParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.update();
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.update();
      if (sw.life <= 0) {
        this.shockwaves.splice(i, 1);
      }
    }
  }

  updateCameraTracking() {
    this.camera.zoom += (this.camera.targetZoom - this.camera.zoom) * 0.15;

    if (this.camera.trackingBodyId) {
      const target = this.bodies.find(b => b.id === this.camera.trackingBodyId);
      if (target) {
        this.camera.x += (target.x - this.camera.x) * 0.1;
        this.camera.y += (target.y - this.camera.y) * 0.1;
      } else {
        this.camera.trackingBodyId = null;
      }
    }
  }

  processAudioHarmonics() {
    if (!window.cosmicAudio || window.cosmicAudio.isMuted) return;

    let primary = null;
    let maxMass = 0;
    let totalStarMass = 0;

    for (const b of this.bodies) {
      if (b.type === 'star' || b.type === 'black-hole') {
        totalStarMass += b.mass;
      }
      if (b.mass > maxMass) {
        maxMass = b.mass;
        primary = b;
      }
    }

    window.cosmicAudio.updateStellarDrone(totalStarMass);

    if (!primary || this.bodies.length <= 1) return;

    const now = performance.now();

    for (const b of this.bodies) {
      if (b === primary) continue;

      const dx = b.x - primary.x;
      const dy = b.y - primary.y;
      const dist = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);

      let angleDiff = angle - b.prevAngle;
      if (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      b.orbitAngleAccum += Math.abs(angleDiff);
      b.prevAngle = angle;

      if (b.orbitAngleAccum >= Math.PI * 2) {
        b.orbitAngleAccum -= Math.PI * 2;

        if (now - b.lastChimeTime > 250) {
          b.lastChimeTime = now;
          const freq = window.cosmicAudio.getHarmonicFrequency(b.mass, Math.hypot(b.vx, b.vy), dist);
          const screenPos = this.worldToScreen(b.x, b.y);
          const panX = (screenPos.x / this.viewportWidth) * 2 - 1;
          const intensity = Math.min(1.0, 0.4 + (b.mass / 500));
          window.cosmicAudio.playOrbitalChime(freq, intensity, panX);
        }
      }
    }
  }

  predictTrajectory(startX, startY, startVx, startVy, testMass = 50, steps = 240, dt = 0.04) {
    const trajectory = [];
    let x = startX;
    let y = startY;
    let vx = startVx;
    let vy = startVy;
    const gConst = this.G * 1000.0;
    const eps2 = this.softening * this.softening;

    for (let s = 0; s < steps; s++) {
      let ax = 0;
      let ay = 0;

      for (let i = 0; i < this.bodies.length; i++) {
        const b = this.bodies[i];
        const dx = b.x - x;
        const dy = b.y - y;
        const distSq = dx * dx + dy * dy + eps2;
        const dist = Math.sqrt(distSq);
        const invDist3 = 1.0 / (distSq * dist);
        const f = gConst * invDist3 * b.mass;

        ax += f * dx;
        ay += f * dy;

        if (dist <= b.radius) {
          trajectory.push({ x, y, hit: true });
          return trajectory;
        }
      }

      vx += ax * dt;
      vy += ay * dt;
      x += vx * dt;
      y += vy * dt;

      if (s % 2 === 0) {
        trajectory.push({ x, y, hit: false });
      }
    }

    return trajectory;
  }
}

const physicsEngine = new PhysicsEngine();
window.physicsEngine = physicsEngine;
window.PhysicsEngine = PhysicsEngine;
window.CelestialBody = CelestialBody;
