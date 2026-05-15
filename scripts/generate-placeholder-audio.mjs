/**
 * generate-placeholder-audio.mjs
 *
 * Generates three programmatic WAV placeholder files for the film/ prototype.
 * No external npm packages — pure Node.js Buffer + fs.
 *
 * Output: public/audio/placeholder/
 *   ambient_ocean.wav      — ocean surf simulation (sinusoids + band-pass noise)
 *   ambient_underwater.wav — deep sub-bass rumble (~80-120 Hz)
 *   ambient_membrane.wav   — warm harmonic hum (~110-220 Hz)
 *
 * Each file: 44.1 kHz, mono, 16-bit signed PCM, 10 s loop.
 * Total target: well under 2 MB.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// WAV writer helpers
// ---------------------------------------------------------------------------

const SAMPLE_RATE = 44100;
const CHANNELS = 1;
const BIT_DEPTH = 16;
const DURATION_SEC = 7; // 7s × 3 files → ~603 KB each ≈ 1.8 MB total — under 2 MB spec budget
const NUM_SAMPLES = SAMPLE_RATE * DURATION_SEC;

/** Write a standard 44-byte RIFF/PCM WAV header into a Buffer. */
function writeWavHeader(buf, dataBytes) {
  let offset = 0;
  const write = (fn, val, size) => { fn.call(buf, val, offset); offset += size; };

  // ChunkID "RIFF"
  buf.write('RIFF', 0, 'ascii'); offset = 4;
  // ChunkSize
  buf.writeUInt32LE(36 + dataBytes, 4); offset = 8;
  // Format "WAVE"
  buf.write('WAVE', 8, 'ascii'); offset = 12;
  // Subchunk1ID "fmt "
  buf.write('fmt ', 12, 'ascii'); offset = 16;
  // Subchunk1Size = 16 (PCM)
  buf.writeUInt32LE(16, 16); offset = 20;
  // AudioFormat = 1 (PCM)
  buf.writeUInt16LE(1, 20); offset = 22;
  // NumChannels
  buf.writeUInt16LE(CHANNELS, 22); offset = 24;
  // SampleRate
  buf.writeUInt32LE(SAMPLE_RATE, 24); offset = 28;
  // ByteRate = SampleRate * NumChannels * BitsPerSample/8
  buf.writeUInt32LE(SAMPLE_RATE * CHANNELS * (BIT_DEPTH / 8), 28); offset = 32;
  // BlockAlign = NumChannels * BitsPerSample/8
  buf.writeUInt16LE(CHANNELS * (BIT_DEPTH / 8), 32); offset = 34;
  // BitsPerSample
  buf.writeUInt16LE(BIT_DEPTH, 34); offset = 36;
  // Subchunk2ID "data"
  buf.write('data', 36, 'ascii'); offset = 40;
  // Subchunk2Size
  buf.writeUInt32LE(dataBytes, 40);
}

/** Clamp a float to [-1, 1] then scale to 16-bit signed integer. */
function floatTo16bit(f) {
  const clamped = Math.max(-1, Math.min(1, f));
  return Math.round(clamped * 32767);
}

/** Write samples (Float32 array) as 16-bit PCM into buf starting at byteOffset. */
function writeSamples(buf, samples, byteOffset) {
  for (let i = 0; i < samples.length; i++) {
    buf.writeInt16LE(floatTo16bit(samples[i]), byteOffset + i * 2);
  }
}

/** Simple LCG pseudo-random noise, deterministic seed. */
function makeLCG(seed = 0x12345678) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return (s / 0x100000000) * 2 - 1; // [-1, 1]
  };
}

// ---------------------------------------------------------------------------
// Synthesis functions
// ---------------------------------------------------------------------------

/**
 * ambient_ocean.wav
 * Layered sine waves in low-frequency band (0.5-8 Hz wave motion modulation)
 * + white noise high-passed to simulate wind + surf.
 */
function generateOcean() {
  const samples = new Float32Array(NUM_SAMPLES);
  const rand = makeLCG(0xdeadbeef);

  // Wave-motion sine layers: low-freq "breathing" amplitude modulation
  const waveFreqs = [0.12, 0.19, 0.31]; // very slow swells
  const carrierFreqs = [60, 90, 120, 180]; // sub-bass carriers for water rumble

  for (let i = 0; i < NUM_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;

    // Wave envelope (0.4 - 1.0 pulsing slowly)
    let env = 0;
    for (const wf of waveFreqs) {
      env += Math.sin(2 * Math.PI * wf * t);
    }
    env = 0.7 + 0.3 * (env / waveFreqs.length);

    // Carrier tones (ocean rumble)
    let tone = 0;
    for (const cf of carrierFreqs) {
      tone += Math.sin(2 * Math.PI * cf * t) / carrierFreqs.length;
    }

    // Noise component: white noise into a simple first-order high-pass
    // HP: y[n] = x[n] - x[n-1] * 0.95 (approximate, good enough for surf texture)
    const noise = rand() * 0.4;

    samples[i] = (tone * 0.35 * env + noise * 0.15) * 0.6;
  }

  // One-pass simple high-pass on noise band already embedded above.
  // Apply a gentle soft-clip to prevent peaks:
  for (let i = 0; i < NUM_SAMPLES; i++) {
    const x = samples[i];
    samples[i] = x / (1 + Math.abs(x)); // soft clip
  }

  return samples;
}

/**
 * ambient_underwater.wav
 * Deep sub-bass rumble: dense cluster of sine waves in 80-120 Hz with
 * slow AM modulation. Very little noise — claustrophobic muffled quality.
 */
function generateUnderwater() {
  const samples = new Float32Array(NUM_SAMPLES);

  // Dense sine cluster in 80-120 Hz
  const freqs = [82, 89, 97, 105, 113, 118];
  // Slow AM modulation frequency (0.05-0.3 Hz)
  const amFreqs = [0.07, 0.13];

  for (let i = 0; i < NUM_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;

    // AM envelope
    let am = 0;
    for (const amf of amFreqs) {
      am += Math.sin(2 * Math.PI * amf * t);
    }
    am = 0.65 + 0.35 * (am / amFreqs.length);

    // Tones
    let tone = 0;
    for (const f of freqs) {
      tone += Math.sin(2 * Math.PI * f * t) / freqs.length;
    }

    samples[i] = tone * am * 0.7;
  }

  // Soft clip
  for (let i = 0; i < NUM_SAMPLES; i++) {
    const x = samples[i];
    samples[i] = x / (1 + Math.abs(x));
  }

  return samples;
}

/**
 * ambient_membrane.wav
 * Warm harmonic hum: fundamental ~110 Hz + harmonics (220, 330, 440 Hz)
 * with slow vibrato/tremolo — like a singing bowl or cello harmonics.
 */
function generateMembrane() {
  const samples = new Float32Array(NUM_SAMPLES);

  const fundamentals = [110, 165]; // slightly detuned for chorus
  // Harmonic series for each fundamental
  const harmonicRatios = [1, 2, 3, 4]; // fundamental + 2nd + 3rd + 4th
  const harmonicAmps = [1.0, 0.5, 0.25, 0.12]; // falling amplitude

  // Slow tremolo
  const tremoloFreq = 0.08;
  // Slow vibrato (pitch modulation) — small for warmth
  const vibratoFreq = 0.12;
  const vibratoDepth = 0.004; // fraction of frequency

  for (let i = 0; i < NUM_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;

    const tremolo = 0.75 + 0.25 * Math.sin(2 * Math.PI * tremoloFreq * t);
    const vibrato = 1 + vibratoDepth * Math.sin(2 * Math.PI * vibratoFreq * t);

    let sample = 0;
    for (const fund of fundamentals) {
      for (let h = 0; h < harmonicRatios.length; h++) {
        const freq = fund * harmonicRatios[h] * vibrato;
        sample += harmonicAmps[h] * Math.sin(2 * Math.PI * freq * t);
      }
    }
    // Normalize by total possible amplitude
    const maxAmp = fundamentals.length * harmonicAmps.reduce((a, b) => a + b, 0);
    sample = (sample / maxAmp) * tremolo * 0.8;

    samples[i] = sample;
  }

  // Soft clip
  for (let i = 0; i < NUM_SAMPLES; i++) {
    const x = samples[i];
    samples[i] = x / (1 + Math.abs(x));
  }

  return samples;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function writeWav(filePath, samples) {
  const dataBytes = samples.length * 2; // 16-bit = 2 bytes per sample
  const totalBytes = 44 + dataBytes;
  const buf = Buffer.alloc(totalBytes);
  writeWavHeader(buf, dataBytes);
  writeSamples(buf, samples, 44);
  fs.writeFileSync(filePath, buf);
  const kb = (totalBytes / 1024).toFixed(1);
  console.log(`  wrote ${path.basename(filePath)} (${kb} KB)`);
}

const outDir = path.join(__dirname, '..', 'public', 'audio', 'placeholder');
fs.mkdirSync(outDir, { recursive: true });

console.log('Generating placeholder audio files...');

writeWav(path.join(outDir, 'ambient_ocean.wav'), generateOcean());
writeWav(path.join(outDir, 'ambient_underwater.wav'), generateUnderwater());
writeWav(path.join(outDir, 'ambient_membrane.wav'), generateMembrane());

console.log('Done. Files written to public/audio/placeholder/');
