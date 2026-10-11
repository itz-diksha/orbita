class OrbitaApp {
  constructor() {
    this.bgCanvas = document.getElementById('bg-canvas');
    this.gridCanvas = document.getElementById('grid-canvas');
    this.trailCanvas = document.getElementById('trail-canvas');
    this.simCanvas = document.getElementById('sim-canvas');
    this.overlayCanvas = document.getElementById('overlay-canvas');
    this.visCanvas = document.getElementById('audio-visualizer-canvas');

    this.bgCtx = this.bgCanvas.getContext('2d');
    this.gridCtx = this.gridCanvas.getContext('2d');
    this.trailCtx = this.trailCanvas.getContext('2d');
    this.simCtx = this.simCanvas.getContext('2d');
    this.overlayCtx = this.overlayCanvas.getContext('2d');
    this.visCtx = this.visCanvas ? this.visCanvas.getContext('2d') : null;

    this.currentTool = 'star';
    this.selectedBody = null;

    this.showGrid = true;
    this.showTrails = true;
    this.showVectors = false;

    this.isDragging = false;
    this.dragStartWorld = { x: 0, y: 0 };
    this.dragStartScreen = { x: 0, y: 0 };
    this.dragCurrentScreen = { x: 0, y: 0 };
    this.dragCurrentWorld = { x: 0, y: 0 };

    this.isPanning = false;
    this.panStart = { x: 0, y: 0 };
    this.cameraPanStart = { x: 0, y: 0 };

    this.tractorBody = null;

    this.stars = [];
    this.nebulaClouds = [];

    this.lastTime = performance.now();
    this.frameCount = 0;
    this.fps = 60;
    this.fpsTimer = performance.now();

    this.init();
  }

  init() {
    this.resizeCanvases();
    window.addEventListener('resize', () => this.resizeCanvases());

    this.generateStarfield();
    this.bindEvents();
    this.bindKeyboardShortcuts();

    CelestialPresets.loadHarmonicOrrery(physicsEngine);

    this.showToast("🌌 Welcome to ORBITA. Click and drag to launch celestial bodies!");

    requestAnimationFrame((t) => this.loop(t));
  }

  resizeCanvases() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const canvases = [this.bgCanvas, this.gridCanvas, this.trailCanvas, this.simCanvas, this.overlayCanvas];
    canvases.forEach(c => {
      c.width = w * dpr;
      c.height = h * dpr;
      c.style.width = `${w}px`;
      c.style.height = `${h}px`;
      const ctx = c.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    });

    physicsEngine.viewportWidth = w;
    physicsEngine.viewportHeight = h;

    this.generateStarfield();
    this.renderStarfield();
  }

  generateStarfield() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.stars = [];

    for (let i = 0; i < 280; i++) {
      this.stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        radius: Math.random() * 1.5 + 0.3,
        alpha: Math.random() * 0.7 + 0.2,
        twinkleSpeed: 0.002 + Math.random() * 0.006,
        phase: Math.random() * Math.PI * 2
      });
    }

    this.nebulaClouds = [
      { x: w * 0.25, y: h * 0.3, r: w * 0.45, color: 'rgba(139, 92, 246, 0.06)' },
      { x: w * 0.75, y: h * 0.65, r: w * 0.5, color: 'rgba(0, 240, 255, 0.05)' },
      { x: w * 0.5, y: h * 0.8, r: w * 0.35, color: 'rgba(236, 72, 153, 0.04)' }
    ];
  }

  renderStarfield() {
    const ctx = this.bgCtx;
    const w = window.innerWidth;
    const h = window.innerHeight;

    ctx.fillStyle = '#06070c';
    ctx.fillRect(0, 0, w, h);

    for (const cloud of this.nebulaClouds) {
      const grad = ctx.createRadialGradient(cloud.x, cloud.y, 0, cloud.x, cloud.y, cloud.r);
      grad.addColorStop(0, cloud.color);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cloud.x, cloud.y, cloud.r, 0, Math.PI * 2);
      ctx.fill();
    }

    const time = performance.now();
    for (const s of this.stars) {
      const currentAlpha = s.alpha + Math.sin(time * s.twinkleSpeed + s.phase) * 0.2;
      ctx.save();
      ctx.globalAlpha = Math.max(0.1, Math.min(1.0, currentAlpha));
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  bindEvents() {
    const canvasCont = document.getElementById('canvas-container');

    canvasCont.addEventListener('pointerdown', (e) => this.handlePointerDown(e));
    window.addEventListener('pointermove', (e) => this.handlePointerMove(e));
    window.addEventListener('pointerup', (e) => this.handlePointerUp(e));

    canvasCont.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });
    canvasCont.addEventListener('contextmenu', (e) => e.preventDefault());

    const presetSelect = document.getElementById('preset-selector');
    presetSelect.addEventListener('change', (e) => {
      this.loadPreset(e.target.value);
    });

    this.setupToggle('btn-grid', () => {
      this.showGrid = !this.showGrid;
      this.showToast(`Spacetime Grid: ${this.showGrid ? 'ON' : 'OFF'}`);
    }, () => this.showGrid);

    this.setupToggle('btn-trails', () => {
      this.showTrails = !this.showTrails;
      if (!this.showTrails) {
        this.trailCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      }
      this.showToast(`Orbit Trails: ${this.showTrails ? 'ON' : 'OFF'}`);
    }, () => this.showTrails);

    this.setupToggle('btn-vectors', () => {
      this.showVectors = !this.showVectors;
      this.showToast(`Velocity Vectors: ${this.showVectors ? 'ON' : 'OFF'}`);
    }, () => this.showVectors);

    const btnAudio = document.getElementById('btn-audio');
    const audioOnIcon = document.getElementById('audio-icon-on');
    const audioOffIcon = document.getElementById('audio-icon-off');
    btnAudio.addEventListener('click', () => {
      cosmicAudio.initContext();
      const isMuted = cosmicAudio.toggleMute();
      btnAudio.classList.toggle('active', !isMuted);
      audioOnIcon.classList.toggle('hidden', isMuted);
      audioOffIcon.classList.toggle('hidden', !isMuted);
      this.showToast(`Audio Synth: ${isMuted ? 'MUTED' : 'UNMUTED'}`);
    });

    document.getElementById('btn-screenshot').addEventListener('click', () => this.captureWallpaper());

    const modalGuide = document.getElementById('modal-guide');
    document.getElementById('btn-guide').addEventListener('click', () => {
      modalGuide.classList.remove('hidden');
    });
    document.getElementById('btn-close-modal').addEventListener('click', () => {
      modalGuide.classList.add('hidden');
    });
    document.getElementById('btn-modal-start').addEventListener('click', () => {
      modalGuide.classList.add('hidden');
      cosmicAudio.initContext();
    });

    const btnFs = document.getElementById('btn-fullscreen');
    const fsEnter = document.getElementById('icon-fs-enter');
    const fsExit = document.getElementById('icon-fs-exit');
    btnFs.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
        fsEnter.classList.add('hidden');
        fsExit.classList.remove('hidden');
      } else {
        document.exitFullscreen().catch(() => {});
        fsEnter.classList.remove('hidden');
        fsExit.classList.add('hidden');
      }
    });

    const btnPlayPause = document.getElementById('btn-play-pause');
    const iconPause = document.getElementById('icon-pause');
    const iconPlay = document.getElementById('icon-play');
    const playPauseLabel = document.getElementById('play-pause-label');

    btnPlayPause.addEventListener('click', () => {
      physicsEngine.isPaused = !physicsEngine.isPaused;
      iconPause.classList.toggle('hidden', physicsEngine.isPaused);
      iconPlay.classList.toggle('hidden', !physicsEngine.isPaused);
      playPauseLabel.textContent = physicsEngine.isPaused ? 'Resume' : 'Pause';
    });

    document.getElementById('btn-step-frame').addEventListener('click', () => {
      physicsEngine.isPaused = true;
      iconPause.classList.add('hidden');
      iconPlay.classList.remove('hidden');
      playPauseLabel.textContent = 'Resume';
      physicsEngine.step(0.03);
    });

    document.getElementById('btn-reverse-time').addEventListener('click', () => {
      physicsEngine.isReversed = !physicsEngine.isReversed;
      this.showToast(`Time Direction: ${physicsEngine.isReversed ? 'REVERSE' : 'FORWARD'}`);
    });

    document.getElementById('btn-clear-sim').addEventListener('click', () => {
      physicsEngine.clear();
      this.selectedBody = null;
      this.updateInspectorUI();
      this.trailCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      this.showToast("Cosmic canvas cleared.");
    });

    this.bindSlider('slider-speed', 'label-speed-val', '×', (v) => { physicsEngine.timeScale = v; });
    this.bindSlider('slider-gravity', 'label-gravity-val', '', (v) => { physicsEngine.G = v; });
    this.bindSlider('slider-trails', 'label-trails-val', ' pts', (v) => {
      physicsEngine.bodies.forEach(b => b.maxTrailLength = v);
    });
    this.bindSlider('slider-grid-warp', 'label-grid-warp-val', '×', (v) => { physicsEngine.gridWarpScale = v; });

    const collisionButtons = document.querySelectorAll('#collision-mode-control .segment-btn');
    collisionButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        collisionButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        physicsEngine.collisionMode = btn.dataset.mode;
        this.showToast(`Collision dynamics: ${btn.dataset.mode.toUpperCase()}`);
      });
    });

    document.getElementById('btn-center-com').addEventListener('click', () => {
      const com = physicsEngine.getCenterOfMass();
      physicsEngine.camera.x = com.x;
      physicsEngine.camera.y = com.y;
      physicsEngine.camera.trackingBodyId = null;
      this.showToast("Camera centered on Center of Mass");
    });

    document.getElementById('btn-reset-view').addEventListener('click', () => {
      physicsEngine.camera.x = 0;
      physicsEngine.camera.y = 0;
      physicsEngine.camera.targetZoom = 1.0;
      physicsEngine.camera.trackingBodyId = null;
      this.updateZoomLabel();
      this.showToast("Camera view reset");
    });

    document.getElementById('btn-zoom-in').addEventListener('click', () => {
      physicsEngine.camera.targetZoom = Math.min(5.0, physicsEngine.camera.targetZoom * 1.3);
      this.updateZoomLabel();
    });
    document.getElementById('btn-zoom-out').addEventListener('click', () => {
      physicsEngine.camera.targetZoom = Math.max(0.15, physicsEngine.camera.targetZoom / 1.3);
      this.updateZoomLabel();
    });

    this.setupPanelMinimize('btn-toggle-left-panel', 'physics-panel', 'left-panel');
    this.setupPanelMinimize('btn-toggle-right-panel', 'inspector-panel', 'right-panel');

    const dockTools = document.querySelectorAll('.dock-tool');
    const hintText = document.getElementById('spawner-hint-text');
    dockTools.forEach(btn => {
      btn.addEventListener('click', () => {
        dockTools.forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
        this.currentTool = btn.dataset.tool;

        switch (this.currentTool) {
          case 'star':
            hintText.textContent = "Click & drag to inject a heavy radiant star into orbit!";
            break;
          case 'planet':
            hintText.textContent = "Click & drag to sling a harmonic terrestrial planet into orbit!";
            break;
          case 'gas-giant':
            hintText.textContent = "Click & drag to launch a massive ringed gas giant!";
            break;
          case 'black-hole':
            hintText.textContent = "Click & drag to spawn an event horizon singularity!";
            break;
          case 'comet':
            hintText.textContent = "Click & drag to slingshot a glowing icy comet!";
            break;
          case 'swarm':
            hintText.textContent = "Click & drag to release a cluster spray of orbiting asteroids!";
            break;
          case 'tractor':
            hintText.textContent = "Click on any planet and drag to fling or perturb its orbit!";
            break;
          case 'eraser':
            hintText.textContent = "Click on any celestial body to vaporize it cleanly!";
            break;
        }
      });
    });

    const tabBtns = document.querySelectorAll('.panel-tabs .tab-btn');
    const tabContents = {
      'telemetry': document.getElementById('tab-telemetry'),
      'soundlab': document.getElementById('tab-soundlab')
    };

    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const target = btn.dataset.tab;
        Object.keys(tabContents).forEach(key => {
          tabContents[key].classList.toggle('active', key === target);
        });
      });
    });

    const scaleSelect = document.getElementById('select-musical-scale');
    scaleSelect.addEventListener('change', (e) => {
      cosmicAudio.setScale(e.target.value);
      this.showToast(`Tuning scale: ${scaleSelect.options[scaleSelect.selectedIndex].text}`);
    });

    this.bindSlider('slider-master-vol', 'label-master-vol', '%', (v) => {
      cosmicAudio.setVolume(v);
    }, 100);

    this.bindSlider('slider-reverb-depth', 'label-reverb-depth', '%', (v) => {
      cosmicAudio.setReverb(v);
    }, 100);

    document.getElementById('chk-drone-synth').addEventListener('change', (e) => {
      cosmicAudio.enableDrone = e.target.checked;
    });
    document.getElementById('chk-orbit-chimes').addEventListener('change', (e) => {
      cosmicAudio.enableChimes = e.target.checked;
    });
    document.getElementById('chk-collision-audio').addEventListener('change', (e) => {
      cosmicAudio.enableCollisions = e.target.checked;
    });
    document.getElementById('chk-singularity-rumble').addEventListener('change', (e) => {
      cosmicAudio.enableSingularity = e.target.checked;
    });

    const inspectorName = document.getElementById('inspector-body-name');
    inspectorName.addEventListener('input', (e) => {
      if (this.selectedBody) {
        this.selectedBody.name = e.target.value;
      }
    });

    document.getElementById('btn-track-body').addEventListener('click', () => {
      if (this.selectedBody) {
        physicsEngine.camera.trackingBodyId = this.selectedBody.id;
        this.showToast(`Tracking camera locked on ${this.selectedBody.name}`);
      }
    });

    const bodyMassSlider = document.getElementById('slider-body-mass');
    bodyMassSlider.addEventListener('input', (e) => {
      if (this.selectedBody) {
        this.selectedBody.mass = parseFloat(e.target.value);
        this.selectedBody.radius = this.selectedBody.calculateRadius(this.selectedBody.type, this.selectedBody.mass);
        document.getElementById('label-body-mass-val').textContent = Math.round(this.selectedBody.mass);
      }
    });

    document.getElementById('btn-reverse-body-orbit').addEventListener('click', () => {
      if (this.selectedBody) {
        this.selectedBody.vx *= -1;
        this.selectedBody.vy *= -1;
        this.showToast(`Reversed orbit velocity for ${this.selectedBody.name}`);
      }
    });

    document.getElementById('btn-vaporize-selected').addEventListener('click', () => {
      if (this.selectedBody) {
        physicsEngine.spawnSupernovaDebris(this.selectedBody.x, this.selectedBody.y, this.selectedBody.color, '#ffffff', this.selectedBody.mass);
        physicsEngine.removeBody(this.selectedBody.id);
        this.selectedBody = null;
        this.updateInspectorUI();
        this.showToast("Celestial body vaporized.");
      }
    });
  }

  bindKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

      const key = e.key.toLowerCase();

      switch (key) {
        case ' ':
          e.preventDefault();
          document.getElementById('btn-play-pause').click();
          break;
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
          const toolIndex = parseInt(key) - 1;
          const tools = ['star', 'planet', 'gas-giant', 'black-hole', 'comet', 'swarm'];
          if (tools[toolIndex]) {
            const btn = document.querySelector(`.dock-tool[data-tool="${tools[toolIndex]}"]`);
            if (btn) btn.click();
          }
          break;
        case 'w':
          document.querySelector('.dock-tool[data-tool="tractor"]').click();
          break;
        case 'x':
          document.querySelector('.dock-tool[data-tool="eraser"]').click();
          break;
        case 'g':
          document.getElementById('btn-grid').click();
          break;
        case 't':
          document.getElementById('btn-trails').click();
          break;
        case 'v':
          document.getElementById('btn-vectors').click();
          break;
        case 'm':
          document.getElementById('btn-audio').click();
          break;
        case 'c':
          document.getElementById('btn-clear-sim').click();
          break;
        case 'r':
          document.getElementById('btn-reset-view').click();
          break;
        case 'p':
          document.getElementById('btn-screenshot').click();
          break;
        case 'f':
          document.getElementById('btn-fullscreen').click();
          break;
        case '?':
          document.getElementById('btn-guide').click();
          break;
        case ']':
          document.getElementById('btn-step-frame').click();
          break;
        case 'escape':
          document.getElementById('modal-guide').classList.add('hidden');
          break;
      }
    });
  }

  bindSlider(sliderId, labelId, suffix, callback, multiplier = 1) {
    const slider = document.getElementById(sliderId);
    const label = document.getElementById(labelId);
    if (!slider || !label) return;

    slider.addEventListener('input', () => {
      const val = parseFloat(slider.value);
      label.textContent = `${Math.round(val * multiplier * 10) / 10}${suffix}`;
      callback(val);
    });
  }

  setupToggle(btnId, callback, stateGetter) {
    const btn = document.getElementById(btnId);
    btn.addEventListener('click', () => {
      callback();
      btn.classList.toggle('active', stateGetter());
    });
  }

  setupPanelMinimize(btnId, panelId, panelClass) {
    const btn = document.getElementById(btnId);
    const panel = document.getElementById(panelId);
    btn.addEventListener('click', () => {
      panel.classList.toggle('minimized');
    });
  }

  loadPreset(presetName) {
    cosmicAudio.initContext();
    switch (presetName) {
      case 'solar-system':
        CelestialPresets.loadSolarSystem(physicsEngine);
        this.showToast("🪐 Loaded: Sol System");
        break;
      case 'figure-eight':
        CelestialPresets.loadFigureEight(physicsEngine);
        this.showToast("♾️ Loaded: Three-Body Figure-8");
        break;
      case 'galaxy-collision':
        CelestialPresets.loadGalaxyCollision(physicsEngine);
        this.showToast("🌀 Loaded: Galaxy Merger");
        break;
      case 'harmonic-orrery':
        CelestialPresets.loadHarmonicOrrery(physicsEngine);
        this.showToast("🎵 Loaded: Harmonic Orrery");
        break;
      case 'black-hole-singularity':
        CelestialPresets.loadBlackHoleSingularity(physicsEngine);
        this.showToast("🕳️ Loaded: Black Hole & Accretion");
        break;
      case 'binary-stars':
        CelestialPresets.loadBinaryStars(physicsEngine);
        this.showToast("☀️☀️ Loaded: Binary Sun Dance");
        break;
      case 'lagrange-points':
        CelestialPresets.loadLagrangePoints(physicsEngine);
        this.showToast("🛰️ Loaded: Lagrange Resonance");
        break;
      case 'chaos-swarm':
        CelestialPresets.loadChaosSwarm(physicsEngine);
        this.showToast("☄️ Loaded: Cosmic Nebula Swarm");
        break;
      case 'empty':
        CelestialPresets.loadEmptyVoid(physicsEngine);
        this.showToast("🌌 Void space created. Ready for custom creation!");
        break;
    }
    this.selectedBody = null;
    this.updateInspectorUI();
    this.trailCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    this.updateZoomLabel();
  }

  handlePointerDown(e) {
    cosmicAudio.initContext();

    const sx = e.clientX;
    const sy = e.clientY;
    const world = physicsEngine.screenToWorld(sx, sy);

    if (e.button === 1 || e.button === 2 || e.shiftKey) {
      this.isPanning = true;
      this.panStart = { x: sx, y: sy };
      this.cameraPanStart = { x: physicsEngine.camera.x, y: physicsEngine.camera.y };
      return;
    }

    const hitBody = physicsEngine.getBodyAtScreen(sx, sy);

    if (this.currentTool === 'eraser') {
      if (hitBody) {
        physicsEngine.spawnSupernovaDebris(hitBody.x, hitBody.y, hitBody.color, '#ffffff', hitBody.mass);
        physicsEngine.removeBody(hitBody.id);
        if (this.selectedBody === hitBody) {
          this.selectedBody = null;
          this.updateInspectorUI();
        }
        this.showToast(`Vaporized ${hitBody.name}`);
      }
      return;
    }

    if (this.currentTool === 'tractor') {
      if (hitBody) {
        this.tractorBody = hitBody;
        this.isDragging = true;
        this.dragStartWorld = { x: world.x, y: world.y };
        this.dragStartScreen = { x: sx, y: sy };
        this.dragCurrentScreen = { x: sx, y: sy };
      }
      return;
    }

    if (hitBody) {
      this.selectedBody = hitBody;
      this.updateInspectorUI();
      return;
    }

    this.isDragging = true;
    this.dragStartWorld = { x: world.x, y: world.y };
    this.dragStartScreen = { x: sx, y: sy };
    this.dragCurrentScreen = { x: sx, y: sy };
    this.dragCurrentWorld = { x: world.x, y: world.y };
  }

  handlePointerMove(e) {
    const sx = e.clientX;
    const sy = e.clientY;

    if (this.isPanning) {
      const dx = (sx - this.panStart.x) / physicsEngine.camera.zoom;
      const dy = (sy - this.panStart.y) / physicsEngine.camera.zoom;
      physicsEngine.camera.x = this.cameraPanStart.x - dx;
      physicsEngine.camera.y = this.cameraPanStart.y - dy;
      physicsEngine.camera.trackingBodyId = null;
      return;
    }

    if (this.isDragging) {
      this.dragCurrentScreen = { x: sx, y: sy };
      this.dragCurrentWorld = physicsEngine.screenToWorld(sx, sy);

      if (this.tractorBody) {
        const dx = this.dragCurrentWorld.x - this.tractorBody.x;
        const dy = this.dragCurrentWorld.y - this.tractorBody.y;
        this.tractorBody.vx += dx * 0.05;
        this.tractorBody.vy += dy * 0.05;
      }
    }
  }

  handlePointerUp(e) {
    if (this.isPanning) {
      this.isPanning = false;
      return;
    }

    if (this.isDragging) {
      this.isDragging = false;

      if (this.tractorBody) {
        this.tractorBody = null;
        return;
      }

      const dragDx = this.dragCurrentScreen.x - this.dragStartScreen.x;
      const dragDy = this.dragCurrentScreen.y - this.dragStartScreen.y;
      const vScale = 0.045 / physicsEngine.camera.zoom;
      const vx = dragDx * vScale;
      const vy = dragDy * vScale;

      this.spawnBodyFromTool(this.dragStartWorld.x, this.dragStartWorld.y, vx, vy);
      this.clearOverlay();
    }
  }

  handleWheel(e) {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const targetZoom = Math.max(0.15, Math.min(5.0, physicsEngine.camera.targetZoom * zoomFactor));

    const mouseWorldBefore = physicsEngine.screenToWorld(e.clientX, e.clientY);
    physicsEngine.camera.targetZoom = targetZoom;

    const mouseWorldAfter = {
      x: (e.clientX - physicsEngine.viewportWidth / 2) / targetZoom + physicsEngine.camera.x,
      y: (e.clientY - physicsEngine.viewportHeight / 2) / targetZoom + physicsEngine.camera.y
    };
    physicsEngine.camera.x += (mouseWorldBefore.x - mouseWorldAfter.x);
    physicsEngine.camera.y += (mouseWorldBefore.y - mouseWorldAfter.y);

    this.updateZoomLabel();
  }

  spawnBodyFromTool(x, y, vx, vy) {
    let newBody = null;

    switch (this.currentTool) {
      case 'star':
        newBody = physicsEngine.addBody(new CelestialBody({
          name: 'Sol ' + (physicsEngine.bodies.length + 1),
          type: 'star',
          x, y, vx, vy,
          mass: 3500,
          color: '#ffd166',
          glowColor: '#f59e0b'
        }));
        this.showToast("☀️ Star injected into orbit");
        break;

      case 'planet':
        newBody = physicsEngine.addBody(new CelestialBody({
          name: 'Planet ' + (physicsEngine.bodies.length + 1),
          type: 'planet',
          x, y, vx, vy,
          mass: 50,
          color: '#38bdf8'
        }));
        this.showToast("🪐 Terrestrial planet launched");
        break;

      case 'gas-giant':
        newBody = physicsEngine.addBody(new CelestialBody({
          name: 'Gas Giant ' + (physicsEngine.bodies.length + 1),
          type: 'gas-giant',
          x, y, vx, vy,
          mass: 320,
          color: '#fbbf24',
          hasRings: true
        }));
        this.showToast("🌕 Gas Giant launched");
        break;

      case 'black-hole':
        newBody = physicsEngine.addBody(new CelestialBody({
          name: 'Singularity ' + (physicsEngine.bodies.length + 1),
          type: 'black-hole',
          x, y, vx, vy,
          mass: 9000,
          color: '#c084fc'
        }));
        this.showToast("🕳️ Gravitational Singularity opened");
        break;

      case 'comet':
        newBody = physicsEngine.addBody(new CelestialBody({
          name: 'Comet ' + (physicsEngine.bodies.length + 1),
          type: 'comet',
          x, y, vx: vx * 1.4, vy: vy * 1.4,
          mass: 5,
          color: '#a7f3d0'
        }));
        this.showToast("☄️ Comet launched");
        break;

      case 'swarm':
        const clusterSize = 14;
        for (let i = 0; i < clusterSize; i++) {
          const offX = (Math.random() - 0.5) * 40;
          const offY = (Math.random() - 0.5) * 40;
          physicsEngine.addBody(new CelestialBody({
            name: `Asteroid ${i + 1}`,
            type: 'asteroid',
            x: x + offX,
            y: y + offY,
            vx: vx + (Math.random() - 0.5) * 0.4,
            vy: vy + (Math.random() - 0.5) * 0.4,
            mass: 2 + Math.random() * 3,
            color: '#ec4899'
          }));
        }
        this.showToast("☄️ Asteroid Swarm released");
        break;
    }

    if (newBody) {
      this.selectedBody = newBody;
      this.updateInspectorUI();
    }
  }

  updateZoomLabel() {
    const label = document.getElementById('label-zoom-level');
    if (label) {
      label.textContent = `${Math.round(physicsEngine.camera.targetZoom * 100)}%`;
    }
  }

  updateInspectorUI() {
    const emptyState = document.getElementById('selected-body-empty');
    const detailsState = document.getElementById('selected-body-details');

    if (!this.selectedBody) {
      emptyState.classList.remove('hidden');
      detailsState.classList.add('hidden');
      return;
    }

    emptyState.classList.add('hidden');
    detailsState.classList.remove('hidden');

    document.getElementById('inspector-color-dot').style.background = this.selectedBody.color;
    document.getElementById('inspector-body-name').value = this.selectedBody.name;
    document.getElementById('ins-type').textContent = this.selectedBody.type.toUpperCase();

    const speed = Math.hypot(this.selectedBody.vx, this.selectedBody.vy);
    document.getElementById('ins-velocity').textContent = `${(speed * 12.4).toFixed(1)} km/s`;

    const ke = 0.5 * this.selectedBody.mass * speed * speed;
    document.getElementById('ins-kinetic').textContent = `${(ke * 1e28).toExponential(2)} J`;

    const com = physicsEngine.getCenterOfMass();
    const distToCom = Math.hypot(this.selectedBody.x - com.x, this.selectedBody.y - com.y);
    document.getElementById('ins-distance').textContent = `${(distToCom / 150).toFixed(2)} AU`;

    const harmonicFreq = cosmicAudio.getHarmonicFrequency(this.selectedBody.mass, speed, distToCom);
    document.getElementById('ins-harmonic').textContent = cosmicAudio.getNoteNameFromFrequency(harmonicFreq);

    const massSlider = document.getElementById('slider-body-mass');
    massSlider.value = this.selectedBody.mass;
    document.getElementById('label-body-mass-val').textContent = Math.round(this.selectedBody.mass);
  }

  updateTelemetryStats() {
    document.getElementById('stat-bodies-count').textContent = physicsEngine.bodies.length;
    document.getElementById('stat-fps').textContent = this.fps;

    let totalMass = 0;
    for (const b of physicsEngine.bodies) totalMass += b.mass;
    document.getElementById('stat-total-mass').textContent = `${Math.round(totalMass / 100) / 10} M☉`;

    document.getElementById('stat-elapsed-time').textContent = `${physicsEngine.cosmicTime.toFixed(1)} yr`;

    if (this.selectedBody) {
      this.updateInspectorUI();
    }
  }

  renderSpacetimeGrid() {
    const ctx = this.gridCtx;
    const w = window.innerWidth;
    const h = window.innerHeight;
    ctx.clearRect(0, 0, w, h);

    if (!this.showGrid) return;

    const zoom = physicsEngine.camera.zoom;
    const spacing = 45 * zoom;
    const numCols = Math.ceil(w / spacing) + 2;
    const numRows = Math.ceil(h / spacing) + 2;

    const startX = (w / 2 - physicsEngine.camera.x * zoom) % spacing - spacing;
    const startY = (h / 2 - physicsEngine.camera.y * zoom) % spacing - spacing;

    const vertices = [];
    const warpMult = 280.0 * physicsEngine.gridWarpScale * physicsEngine.G;

    for (let row = 0; row < numRows; row++) {
      vertices[row] = [];
      const sy = startY + row * spacing;

      for (let col = 0; col < numCols; col++) {
        const sx = startX + col * spacing;
        const world = physicsEngine.screenToWorld(sx, sy);

        let dxWarp = 0;
        let dyWarp = 0;

        for (const b of physicsEngine.bodies) {
          const dx = b.x - world.x;
          const dy = b.y - world.y;
          const distSq = dx * dx + dy * dy + 800;
          const dist = Math.sqrt(distSq);
          const f = (b.mass * warpMult) / (distSq * dist);
          dxWarp += dx * f;
          dyWarp += dy * f;
        }

        const warpedWorldX = world.x + dxWarp;
        const warpedWorldY = world.y + dyWarp;
        const screenPos = physicsEngine.worldToScreen(warpedWorldX, warpedWorldY);

        vertices[row][col] = screenPos;
      }
    }

    ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
    ctx.lineWidth = 1;

    for (let r = 0; r < numRows; r++) {
      ctx.beginPath();
      for (let c = 0; c < numCols; c++) {
        const p = vertices[r][c];
        if (c === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }

    for (let c = 0; c < numCols; c++) {
      ctx.beginPath();
      for (let r = 0; r < numRows; r++) {
        const p = vertices[r][c];
        if (r === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }
  }

  renderTrails() {
    const ctx = this.trailCtx;
    const w = window.innerWidth;
    const h = window.innerHeight;

    if (!this.showTrails) return;

    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    for (const b of physicsEngine.bodies) {
      if (b.trail.length < 2) continue;

      ctx.save();
      ctx.lineWidth = Math.max(1.2, Math.min(3, b.radius * 0.2 * physicsEngine.camera.zoom));
      ctx.strokeStyle = b.glowColor;
      ctx.globalAlpha = 0.5;

      ctx.beginPath();
      for (let i = 0; i < b.trail.length; i++) {
        const sp = physicsEngine.worldToScreen(b.trail[i].x, b.trail[i].y);
        if (i === 0) ctx.moveTo(sp.x, sp.y);
        else ctx.lineTo(sp.x, sp.y);
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  renderSimulation() {
    const ctx = this.simCtx;
    const w = window.innerWidth;
    const h = window.innerHeight;
    ctx.clearRect(0, 0, w, h);

    const zoom = physicsEngine.camera.zoom;

    for (const sw of physicsEngine.shockwaves) {
      const sp = physicsEngine.worldToScreen(sw.x, sw.y);
      ctx.save();
      ctx.translate(sp.x, sp.y);
      ctx.scale(zoom, zoom);
      sw.draw(ctx);
      ctx.restore();
    }

    for (const p of physicsEngine.particles) {
      const sp = physicsEngine.worldToScreen(p.x, p.y);
      ctx.save();
      ctx.translate(sp.x, sp.y);
      ctx.scale(zoom, zoom);
      p.draw(ctx);
      ctx.restore();
    }

    for (const b of physicsEngine.bodies) {
      const sp = physicsEngine.worldToScreen(b.x, b.y);
      const r = Math.max(2, b.radius * zoom);

      ctx.save();
      ctx.translate(sp.x, sp.y);

      if (b.type === 'star') {
        const pulse = 1.0 + Math.sin(b.pulsePhase) * 0.08;
        const grad = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, r * 3.2 * pulse);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.2, b.color);
        grad.addColorStop(0.6, b.glowColor);
        grad.addColorStop(1, 'transparent');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, r * 3.2 * pulse, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.8, 0, Math.PI * 2);
        ctx.fill();

      } else if (b.type === 'black-hole') {
        const grad = ctx.createRadialGradient(0, 0, r * 0.8, 0, 0, r * 2.8);
        grad.addColorStop(0, 'rgba(192, 132, 252, 0.9)');
        grad.addColorStop(0.3, 'rgba(139, 92, 246, 0.6)');
        grad.addColorStop(0.8, 'rgba(59, 130, 246, 0.2)');
        grad.addColorStop(1, 'transparent');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, r * 2.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.rotate(b.rotationAngle);
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = Math.max(1.5, 2.5 * zoom);
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 2.2, r * 0.6, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 1.2;
        ctx.stroke();

      } else if (b.type === 'gas-giant') {
        if (b.hasRings) {
          ctx.save();
          ctx.rotate(-0.35);
          ctx.strokeStyle = 'rgba(253, 224, 71, 0.45)';
          ctx.lineWidth = Math.max(2, 4.5 * zoom);
          ctx.beginPath();
          ctx.ellipse(0, 0, r * 2.3, r * 0.7, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();

      } else if (b.type === 'comet') {
        const speed = Math.hypot(b.vx, b.vy);
        if (speed > 0.1) {
          const tailAngle = Math.atan2(-b.vy, -b.vx);
          const tailLen = Math.min(80, speed * 25 * zoom);

          ctx.save();
          ctx.rotate(tailAngle);
          const tailGrad = ctx.createLinearGradient(0, 0, tailLen, 0);
          tailGrad.addColorStop(0, 'rgba(167, 243, 208, 0.7)');
          tailGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = tailGrad;
          ctx.beginPath();
          ctx.moveTo(0, -r);
          ctx.lineTo(tailLen, 0);
          ctx.lineTo(0, r);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }

        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();

      } else {
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      if (this.showVectors) {
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.75)';
        ctx.lineWidth = 1.5;
        const vLen = Math.hypot(b.vx, b.vy) * 15 * zoom;
        const vAngle = Math.atan2(b.vy, b.vx);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(vAngle) * vLen, Math.sin(vAngle) * vLen);
        ctx.stroke();
      }

      if (b.mass >= 25 && zoom >= 0.7) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.font = '10px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(b.name, 0, r + 13);
      }

      ctx.restore();
    }
  }

  renderInteractiveOverlay() {
    const ctx = this.overlayCtx;
    const w = window.innerWidth;
    const h = window.innerHeight;
    ctx.clearRect(0, 0, w, h);

    if (this.selectedBody) {
      const sp = physicsEngine.worldToScreen(this.selectedBody.x, this.selectedBody.y);
      const r = Math.max(6, this.selectedBody.radius * physicsEngine.camera.zoom) + 6;

      ctx.save();
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.8)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (this.isDragging && !this.tractorBody) {
      const startSp = this.dragStartScreen;
      const curSp = this.dragCurrentScreen;

      ctx.save();
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(startSp.x, startSp.y);
      ctx.lineTo(curSp.x, curSp.y);
      ctx.stroke();

      const angle = Math.atan2(curSp.y - startSp.y, curSp.x - startSp.x);
      const arrowLen = 12;
      ctx.beginPath();
      ctx.moveTo(curSp.x, curSp.y);
      ctx.lineTo(curSp.x - arrowLen * Math.cos(angle - Math.PI / 6), curSp.y - arrowLen * Math.sin(angle - Math.PI / 6));
      ctx.moveTo(curSp.x, curSp.y);
      ctx.lineTo(curSp.x - arrowLen * Math.cos(angle + Math.PI / 6), curSp.y - arrowLen * Math.sin(angle + Math.PI / 6));
      ctx.stroke();
      ctx.restore();

      const dragDx = curSp.x - startSp.x;
      const dragDy = curSp.y - startSp.y;
      const vScale = 0.045 / physicsEngine.camera.zoom;
      const vx = dragDx * vScale;
      const vy = dragDy * vScale;

      const path = physicsEngine.predictTrajectory(this.dragStartWorld.x, this.dragStartWorld.y, vx, vy, 50, 300, 0.04);

      if (path.length > 1) {
        ctx.save();
        ctx.fillStyle = '#00f0ff';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 6;

        for (let i = 0; i < path.length; i++) {
          const pt = path[i];
          const sp = physicsEngine.worldToScreen(pt.x, pt.y);
          const alpha = 1.0 - (i / path.length) * 0.7;
          ctx.globalAlpha = alpha;

          if (pt.hit) {
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(sp.x, sp.y, 5, 0, Math.PI * 2);
            ctx.fill();
            break;
          } else {
            ctx.beginPath();
            ctx.arc(sp.x, sp.y, 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();
      }
    }
  }

  clearOverlay() {
    this.overlayCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  }

  renderAudioVisualizer() {
    if (!this.visCtx) return;

    const ctx = this.visCtx;
    const w = this.visCanvas.width;
    const h = this.visCanvas.height;

    ctx.fillStyle = '#05070e';
    ctx.fillRect(0, 0, w, h);

    const freqData = cosmicAudio.getFrequencyData();
    if (!freqData || cosmicAudio.isMuted) {
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();
      return;
    }

    const barCount = 32;
    const barWidth = (w / barCount) - 2;

    for (let i = 0; i < barCount; i++) {
      const val = freqData[i * 2] || 0;
      const barHeight = (val / 255) * (h - 8);
      const x = i * (barWidth + 2);
      const y = h - barHeight;

      const grad = ctx.createLinearGradient(0, h, 0, 0);
      grad.addColorStop(0, '#00f0ff');
      grad.addColorStop(0.7, '#8b5cf6');
      grad.addColorStop(1, '#ffd166');

      ctx.fillStyle = grad;
      ctx.fillRect(x, y, barWidth, barHeight);
    }
  }

  captureWallpaper() {
    const exportCanvas = document.createElement('canvas');
    const width = 3840;
    const height = 2160;
    exportCanvas.width = width;
    exportCanvas.height = height;
    const expCtx = exportCanvas.getContext('2d');

    expCtx.fillStyle = '#04050a';
    expCtx.fillRect(0, 0, width, height);

    for (let i = 0; i < 900; i++) {
      expCtx.fillStyle = 'rgba(255, 255, 255, ' + (Math.random() * 0.8 + 0.2) + ')';
      expCtx.beginPath();
      expCtx.arc(Math.random() * width, Math.random() * height, Math.random() * 2.2 + 0.4, 0, Math.PI * 2);
      expCtx.fill();
    }

    const scaleX = width / window.innerWidth;
    const scaleY = height / window.innerHeight;
    expCtx.save();
    expCtx.scale(scaleX, scaleY);
    expCtx.drawImage(this.trailCanvas, 0, 0);
    expCtx.drawImage(this.simCanvas, 0, 0);
    expCtx.restore();

    expCtx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    expCtx.font = '32px Outfit, sans-serif';
    expCtx.fillText('ORBITA — Celestial Cosmos', 40, height - 40);

    const link = document.createElement('a');
    link.download = `orbita-cosmos-${Date.now()}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();

    this.showToast("📷 4K Cosmic Wallpaper captured & downloaded!");
  }

  showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 3000);
  }

  loop(time) {
    const dt = (time - this.lastTime) / 1000;
    this.lastTime = time;

    this.frameCount++;
    if (time - this.fpsTimer >= 500) {
      this.fps = Math.round((this.frameCount * 1000) / (time - this.fpsTimer));
      this.frameCount = 0;
      this.fpsTimer = time;
      this.updateTelemetryStats();
    }

    physicsEngine.step(dt);
    this.renderSpacetimeGrid();
    this.renderTrails();
    this.renderSimulation();
    this.renderInteractiveOverlay();
    this.renderAudioVisualizer();

    requestAnimationFrame((t) => this.loop(t));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.orbitaApp = new OrbitaApp();
});
