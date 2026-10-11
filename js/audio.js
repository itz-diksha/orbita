class CosmicAudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.compressor = null;
    this.reverbSend = null;
    this.analyser = null;
    this.isMuted = false;
    this.masterVolume = 0.7;
    this.reverbDepth = 0.65;

    this.enableDrone = true;
    this.enableChimes = true;
    this.enableCollisions = true;
    this.enableSingularity = true;

    this.currentScale = 'pentatonic';

    this.scales = {
      'pentatonic': [130.81, 146.83, 164.81, 196.00, 220.00, 261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00, 1046.50],
      'celestial-minor': [130.81, 146.83, 155.56, 174.61, 196.00, 207.65, 233.08, 261.63, 311.13, 392.00, 466.16, 523.25, 622.25, 783.99, 932.33, 1046.50],
      'hirajoshi': [130.81, 138.59, 174.61, 185.00, 233.08, 261.63, 277.18, 349.23, 369.99, 466.16, 523.25, 554.37, 698.46, 739.99, 932.33, 1046.50],
      'lydian': [130.81, 146.83, 164.81, 185.00, 196.00, 220.00, 246.94, 261.63, 293.66, 329.63, 369.99, 392.00, 440.00, 493.88, 523.25, 587.33],
      'phrygian': [98.00, 103.83, 116.54, 130.81, 146.83, 155.56, 174.61, 196.00, 207.65, 233.08, 261.63, 311.13, 392.00, 466.16, 523.25, 622.25]
    };

    this.noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

    this.droneNodes = null;
    this.droneTargetGain = 0;

    this.lastChimeTimes = new Map();
  }

  initContext() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    try {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtxClass();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);

      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-18, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(30, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(12, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.25, this.ctx.currentTime);

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 128;
      this.analyser.smoothingTimeConstant = 0.85;

      this.setupSpatialReverb();

      this.masterGain.connect(this.compressor);
      this.compressor.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);

      this.initStellarDrone();

    } catch (e) {
      console.warn("Web Audio API not supported or blocked:", e);
    }
  }

  setupSpatialReverb() {
    if (!this.ctx) return;

    this.reverbSend = this.ctx.createGain();
    this.reverbSend.gain.setValueAtTime(this.reverbDepth * 0.5, this.ctx.currentTime);

    const delayL = this.ctx.createDelay(2.0);
    const delayR = this.ctx.createDelay(2.0);
    delayL.delayTime.setValueAtTime(0.38, this.ctx.currentTime);
    delayR.delayTime.setValueAtTime(0.57, this.ctx.currentTime);

    const feedbackL = this.ctx.createGain();
    const feedbackR = this.ctx.createGain();
    feedbackL.gain.setValueAtTime(0.42, this.ctx.currentTime);
    feedbackR.gain.setValueAtTime(0.38, this.ctx.currentTime);

    const filterL = this.ctx.createBiquadFilter();
    filterL.type = "lowpass";
    filterL.frequency.setValueAtTime(2200, this.ctx.currentTime);

    const filterR = this.ctx.createBiquadFilter();
    filterR.type = "lowpass";
    filterR.frequency.setValueAtTime(1900, this.ctx.currentTime);

    this.reverbSend.connect(delayL);
    this.reverbSend.connect(delayR);

    delayL.connect(filterL);
    filterL.connect(feedbackL);
    feedbackL.connect(delayR);
    filterL.connect(this.masterGain);

    delayR.connect(filterR);
    filterR.connect(feedbackR);
    feedbackR.connect(delayL);
    filterR.connect(this.masterGain);
  }

  initStellarDrone() {
    if (!this.ctx) return;

    const droneGain = this.ctx.createGain();
    droneGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(55, this.ctx.currentTime);

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(82.4, this.ctx.currentTime);

    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.12, this.ctx.currentTime);

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(180, this.ctx.currentTime);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(260, this.ctx.currentTime);
    filter.Q.setValueAtTime(3.5, this.ctx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(droneGain);

    droneGain.connect(this.masterGain);
    if (this.reverbSend) droneGain.connect(this.reverbSend);

    osc1.start();
    osc2.start();
    lfo.start();

    this.droneNodes = { droneGain, osc1, osc2, filter };
  }

  updateStellarDrone(totalStarMass) {
    if (!this.ctx || !this.droneNodes || !this.enableDrone || this.isMuted) return;

    const target = totalStarMass > 0 ? Math.min(0.25, Math.log10(totalStarMass + 1) * 0.08) : 0;
    this.droneNodes.droneGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.5);

    const cutoff = Math.min(800, 160 + totalStarMass * 0.1);
    this.droneNodes.filter.frequency.setTargetAtTime(cutoff, this.ctx.currentTime, 1.0);
  }

  getNoteNameFromFrequency(freq) {
    if (!freq || freq <= 0) return "--";
    const noteNum = 12 * (Math.log(freq / 440) / Math.log(2));
    const midi = Math.round(noteNum) + 69;
    const noteIndex = (midi % 12 + 12) % 12;
    const octave = Math.floor(midi / 12) - 1;
    return `${this.noteNames[noteIndex]}${octave} (${freq.toFixed(1)} Hz)`;
  }

  getHarmonicFrequency(mass, velocity, distance) {
    const scale = this.scales[this.currentScale] || this.scales['pentatonic'];
    const hash = Math.floor(Math.abs(Math.sin(mass * 12.9898 + distance * 78.233) * scale.length)) % scale.length;
    return scale[hash];
  }

  playOrbitalChime(freq, intensity = 0.5, panX = 0) {
    if (!this.ctx || !this.enableChimes || this.isMuted) return;

    const now = this.ctx.currentTime;
    const voiceGain = this.ctx.createGain();
    const finalGain = Math.min(0.35, intensity * 0.28);

    const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    if (panner) {
      panner.pan.setValueAtTime(Math.max(-0.9, Math.min(0.9, panX)), now);
    }

    const carrier = this.ctx.createOscillator();
    const modulator = this.ctx.createOscillator();
    const modIndex = this.ctx.createGain();

    carrier.type = 'sine';
    carrier.frequency.setValueAtTime(freq, now);

    modulator.type = 'sine';
    modulator.frequency.setValueAtTime(freq * 2.005, now);

    modIndex.gain.setValueAtTime(freq * 1.5, now);
    modIndex.gain.exponentialRampToValueAtTime(0.01, now + 0.8);

    modulator.connect(modIndex);
    modIndex.connect(carrier.frequency);

    voiceGain.gain.setValueAtTime(0.0001, now);
    voiceGain.gain.linearRampToValueAtTime(finalGain, now + 0.012);
    voiceGain.gain.exponentialRampToValueAtTime(finalGain * 0.3, now + 0.3);
    voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

    if (panner) {
      carrier.connect(voiceGain);
      voiceGain.connect(panner);
      panner.connect(this.masterGain);
      if (this.reverbSend) panner.connect(this.reverbSend);
    } else {
      carrier.connect(voiceGain);
      voiceGain.connect(this.masterGain);
      if (this.reverbSend) voiceGain.connect(this.reverbSend);
    }

    carrier.start(now);
    modulator.start(now);
    carrier.stop(now + 1.9);
    modulator.stop(now + 1.9);
  }

  playCollisionImpact(energyRatio = 0.5) {
    if (!this.ctx || !this.enableCollisions || this.isMuted) return;

    const now = this.ctx.currentTime;
    const impactGain = this.ctx.createGain();
    const dur = 1.2 + energyRatio * 1.5;

    const boomOsc = this.ctx.createOscillator();
    boomOsc.type = 'sine';
    boomOsc.frequency.setValueAtTime(140, now);
    boomOsc.frequency.exponentialRampToValueAtTime(32, now + 0.6);

    const bufferSize = this.ctx.sampleRate * 0.4;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(1200, now);
    noiseFilter.Q.setValueAtTime(3.0, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.2, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(impactGain);

    impactGain.gain.setValueAtTime(Math.min(0.6, 0.15 + energyRatio * 0.35), now);
    impactGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    boomOsc.connect(impactGain);
    impactGain.connect(this.masterGain);
    if (this.reverbSend) impactGain.connect(this.reverbSend);

    boomOsc.start(now);
    noiseSource.start(now);
    boomOsc.stop(now + dur);
    noiseSource.stop(now + 0.4);
  }

  playBlackHoleSwallow() {
    if (!this.ctx || !this.enableSingularity || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(28, now + 0.9);

    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.95);

    osc.connect(gain);
    gain.connect(this.masterGain);
    if (this.reverbSend) gain.connect(this.reverbSend);

    osc.start(now);
    osc.stop(now + 1.0);
  }

  setVolume(val) {
    this.masterVolume = Math.max(0, Math.min(1, val));
    if (this.masterGain && !this.isMuted) {
      this.masterGain.gain.setTargetAtTime(this.masterVolume, this.ctx.currentTime, 0.05);
    }
  }

  setReverb(val) {
    this.reverbDepth = Math.max(0, Math.min(1, val));
    if (this.reverbSend && this.ctx) {
      this.reverbSend.gain.setTargetAtTime(this.reverbDepth * 0.6, this.ctx.currentTime, 0.1);
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime, 0.05);
    }
    return this.isMuted;
  }

  setScale(scaleName) {
    if (this.scales[scaleName]) {
      this.currentScale = scaleName;
    }
  }

  getFrequencyData() {
    if (!this.analyser) return null;
    const array = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(array);
    return array;
  }
}

const cosmicAudio = new CosmicAudioEngine();
window.cosmicAudio = cosmicAudio;
window.CosmicAudioEngine = CosmicAudioEngine;
