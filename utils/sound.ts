let sharedAudioCtx: AudioContext | null = null;
let silentOscillator: OscillatorNode | null = null;
let silentGain: GainNode | null = null;

export const initAudio = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;

    if (!sharedAudioCtx) {
      sharedAudioCtx = new AudioContext();
    }

    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch((e) => console.error("Audio resume failed", e));
    }
  } catch (e) {
    console.error("Audio init failed", e);
  }
};

/**
 * Toggles a nearly silent oscillator. 
 * This keeps the AudioContext active on mobile devices when the app is in the background,
 * preventing the browser from throttling the timer or suspending audio playback.
 */
export const toggleSilentAudio = (enable: boolean) => {
    try {
        if (enable) {
            initAudio();
            if (!sharedAudioCtx) return;
            
            // Resume context if suspended (common on mobile)
            if (sharedAudioCtx.state === 'suspended') {
                sharedAudioCtx.resume();
            }

            // If already running, do nothing
            if (silentOscillator) return; 

            silentOscillator = sharedAudioCtx.createOscillator();
            silentGain = sharedAudioCtx.createGain();

            silentOscillator.type = 'sine';
            silentOscillator.frequency.setValueAtTime(440, sharedAudioCtx.currentTime); // Arbitrary freq
            
            // Value must be non-zero to prevent browser optimization, but low enough to be inaudible
            silentGain.gain.setValueAtTime(0.0001, sharedAudioCtx.currentTime); 
            
            silentOscillator.connect(silentGain);
            silentGain.connect(sharedAudioCtx.destination);
            silentOscillator.start();
            
        } else {
            if (silentOscillator) {
                try {
                    silentOscillator.stop();
                    silentOscillator.disconnect();
                } catch (e) { /* ignore cleanup errors */ }
                silentOscillator = null;
            }
            if (silentGain) {
                try {
                    silentGain.disconnect();
                } catch (e) { /* ignore cleanup errors */ }
                silentGain = null;
            }
        }
    } catch (e) {
        console.error("Silent audio toggle failed", e);
    }
};

export const playTimerCompleteSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;

    // Use shared context if initialized (best for mobile), otherwise create new
    if (!sharedAudioCtx) {
        sharedAudioCtx = new AudioContext();
    }
    const ctx = sharedAudioCtx;

    // Ensure it's running
    if (ctx.state === 'suspended') {
        ctx.resume();
    }

    const now = ctx.currentTime;
    const duration = 2.0;

    // Master Gain for overall volume
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.6, now);
    masterGain.gain.setValueAtTime(0.6, now + duration - 0.1);
    masterGain.gain.linearRampToValueAtTime(0, now + duration);
    masterGain.connect(ctx.destination);

    // Carrier (The Bell Dome)
    // 2600Hz is a typical frequency for a small steel bell
    const carrier = ctx.createOscillator();
    carrier.type = 'sine';
    carrier.frequency.setValueAtTime(2600, now);

    // Modulator (The Metal Texture)
    // FM Synthesis: Modulating frequency creates sidebands (harmonics)
    // A non-integer ratio (e.g. 2600 / 320 ≈ 8.125) creates inharmonic metallic sounds
    const modulator = ctx.createOscillator();
    modulator.type = 'sine';
    modulator.frequency.setValueAtTime(320, now);
    
    const modulatorGain = ctx.createGain();
    modulatorGain.gain.value = 800; // Depth of modulation (controls "brightness/metalness")
    
    modulator.connect(modulatorGain);
    modulatorGain.connect(carrier.frequency);

    // Striking Mechanism (The Hammer)
    // Amplitude Modulation to simulate the rapid mechanical striking
    const strikeGain = ctx.createGain();
    carrier.connect(strikeGain);
    strikeGain.connect(masterGain);

    // Schedule the strikes
    const strikeRate = 22; // Hz (strikes per second)
    const strikeInterval = 1 / strikeRate;
    const totalStrikes = Math.floor(duration * strikeRate);

    for (let i = 0; i < totalStrikes; i++) {
        const time = now + (i * strikeInterval);
        
        // Envelope for each strike
        strikeGain.gain.setValueAtTime(0, time);
        strikeGain.gain.linearRampToValueAtTime(1, time + 0.005); // Sharp Attack
        // Exponential decay creates the "ringing" space between strikes
        strikeGain.gain.exponentialRampToValueAtTime(0.15, time + strikeInterval * 0.8);
    }

    carrier.start(now);
    carrier.stop(now + duration);
    modulator.start(now);
    modulator.stop(now + duration);

  } catch (e) {
    console.error("Audio playback failed", e);
  }
};