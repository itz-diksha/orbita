# ORBITA — Celestial Gravity Simulator & Generative Audio Orrery

> **An interactive N-body gravitational physics sandbox and procedural cosmic sound synthesizer built with Vanilla HTML5, CSS3, and JavaScript (Canvas 2D + Web Audio API).**

---

## 🌌 Overview

**ORBITA** is a browser-based celestial mechanics laboratory and generative ambient sound synthesizer. It simulates real-time orbital dynamics, gravitational attraction, spacetime fabric deformation (general relativistic curvature), and acoustic celestial harmonies—with **zero external libraries or assets**.

Every star, planet, comet, and singularity vibrates with musical frequency, transforming orbital revolutions and Keplerian mechanics into an ethereal, polyrhythmic cosmic symphony (*Musica Universalis*).

---

## ✨ Key Features

### 1. 🪐 Precision N-Body Gravitational Physics
- **Universal Gravitation**: Computes pairwise gravitational forces $F = G \frac{m_1 m_2}{r^2 + \epsilon^2}$ with softening factor $\epsilon$ to eliminate infinite slingshot singularities.
- **Symplectic Integration**: High-precision velocity-Verlet numerical solver for conservation of linear momentum and closed orbit stability.
- **Collision Dynamics**:
  - **Inelastic Merging**: Inelastic coalescence combining masses, conserving momentum ($m_1 v_1 + m_2 v_2 = (m_1 + m_2) v_{new}$), and producing expanding shockwave rings with cosmic debris sparks.
  - **Elastic Bounce**: Rebounds bodies preserving kinetic energy.
  - **Ghost**: Allows ethereal passthrough.
- **Trajectory Forecast**: Projects dotted orbital pathways forward in time before you release a launched object.
- **General Relativistic Spacetime Grid**: Live 2D warped coordinate grid showcasing metric deformation and gravity wells around massive objects.

### 2. 🎵 Generative Web Audio API Synthesizer
- **Musica Universalis (Music of the Spheres)**:
  - **Planetary Bells & Chimes**: Orbiting bodies trigger harmonic crystal chimes (dual-operator FM synthesis) as they complete orbital periods and pass periapsis.
  - **Sub-Bass Stellar Drones**: Massive stars emit a warm, filtered analog pad with gentle LFO breathing.
  - **Singularity Infrasound**: Supermassive black holes emit low rumble sweeps and pitch drops when matter passes the event horizon.
  - **Collision Supernovae**: Low-frequency resonant booms with metallic decay.
- **Tuning Modes**: Pentatonic Major, Celestial Minor, Hirajoshi Japanese, Lydian Space, and Dark Phrygian.
- **Real-Time Visualizer**: Audio FFT frequency spectrum analyzer embedded directly in the telemetry HUD.
- **Spatial Echo & Reverb**: Dual ping-pong delay lines with filtered cross-feedback.

### 3. 🛸 Celestial Tools Palette
- 🌟 **Star / Sun (`1`)**: Massive radiant bodies with solar corona and sub-bass drones.
- 🪐 **Terrestrial Planet (`2`)**: Rocky orbital bodies with bell harmonics.
- 🌕 **Gas Giant (`3`)**: Giant planetary bodies with atmospheric rings.
- 🕳️ **Singularity (`4`)**: Deep gravity wells with relativistic photon sphere halos and devouring mechanics.
- ☄️ **Comet (`5`)**: High-velocity wanderers with streaming ion/dust tails.
- 💥 **Asteroid Swarm (`6`)**: Spray clusters of gravitational particles.
- 🖐️ **Tractor Beam (`W`)**: Drag and sling bodies in real time.
- 🧹 **Vaporize / Eraser (`X`)**: Cleanly disintegrate errant asteroids or rogue stars.

### 4. 🛰️ Curated Preset Scenarios
1. **🪐 Sol System**: Concentric Keplerian orbits for Sun, Mercury, Venus, Earth + Moon, Mars, Jupiter, Saturn with rings, and Halley's Comet.
2. **♾️ Three-Body Figure-8**: The famous stable Moore-Chenciner choreographic solution where 3 identical stars chase each other indefinitely on an 8-shaped loop.
3. **🌀 Galaxy Merger**: Two spiral stellar disks with supermassive black holes colliding into tidal bridges.
4. **🎵 Harmonic Orrery**: 6 concentric circular orbits tuned to musical intervals playing a continuous generative chime song.
5. **🕳️ Black Hole Singularity**: A supermassive singularity surrounded by a relativistic accretion disk.
6. **☀️☀️ Binary Sun Dance**: Two suns orbiting a barycenter with circumbinary and chaotic trojan worlds.
7. **🛰️ Lagrange Resonance**: L4 and L5 Trojan asteroids orbiting 60° ahead and behind a gas giant.
8. **☄️ Cosmic Nebula Swarm**: A chaotic cluster undergoing gravitational collapse.
9. **🌌 Empty Void**: Clean slate for freeform universe crafting.

---

## 🕹️ Controls & Navigation

### Mouse & Touch
- **Left-Click + Drag**: Position body and pull velocity vector arrow. Release to inject into orbit with real-time trajectory prediction dots.
- **Middle-Click / Right-Click / Shift+Drag**: Pan camera infinitely across the cosmos.
- **Scroll Wheel / Pinch**: Zoom in and out centered on the cursor.
- **Click Body**: Select body to inspect live telemetry (velocity, mass, kinetic energy, distance, musical pitch).

### Keyboard Shortcuts
| Key | Action |
|:---:|:---|
| <kbd>Space</kbd> | Play / Pause simulation |
| <kbd>]</kbd> | Step forward single physics frame |
| <kbd>1</kbd> – <kbd>6</kbd> | Select celestial body tool |
| <kbd>W</kbd> | Tractor beam / Gravity wand |
| <kbd>X</kbd> | Eraser / Vaporizer |
| <kbd>G</kbd> | Toggle Spacetime metric grid |
| <kbd>T</kbd> | Toggle historical orbit trails |
| <kbd>V</kbd> | Toggle velocity vector arrows |
| <kbd>M</kbd> | Mute / Unmute cosmic audio engine |
| <kbd>C</kbd> | Clear all bodies |
| <kbd>R</kbd> | Reset camera to origin |
| <kbd>P</kbd> | Capture 4K wallpaper screenshot (`.png`) |
| <kbd>F</kbd> | Toggle Fullscreen mode |
| <kbd>?</kbd> | Open help guide manual |

---

## 🚀 How to Run

No build step or dependencies required!

Simply open `index.html` in any modern web browser (Chrome, Firefox, Safari, Edge, etc.):
```bash
# Using Python's built-in server (optional)
python3 -m http.server 8000
# Open http://localhost:8000 in your browser
```
Or double-click [index.html](file:///home/syper/______________________/po/index.html) directly.

---

## 🔬 Mathematical & Architectural Highlights
- **Layered Canvas Architecture**: 5 dedicated hardware-accelerated `<canvas>` elements (`bg`, `grid`, `trail`, `sim`, `overlay`) ensuring high 60fps performance without unnecessary redraws.
- **Zero Audio Latency**: Synthesized entirely via standard Web Audio API oscillators, gain envelopes, and biquad filters without relying on network audio files or MP3s.
- **Responsive Glassmorphism UI**: Built with pure CSS custom properties, backdrop blur filters, and fluid layouts for screens of any size.
