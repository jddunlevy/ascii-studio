// lib/audio/audioEngine.ts
import { extractSignals } from './signals';
import type { Signals } from '@/lib/types';

const ZERO_SIGNALS: Signals = {
  volume: 0,
  bass: 0,
  mid: 0,
  treble: 0,
};

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private startedAt = 0;
  private pausedAt = 0;
  private isPlaying = false;
  private freqData: Uint8Array<ArrayBuffer> = new Uint8Array(0) as Uint8Array<ArrayBuffer>;
  private timeData: Uint8Array<ArrayBuffer> = new Uint8Array(0) as Uint8Array<ArrayBuffer>;

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    return this.ctx;
  }

  async loadFile(file: File): Promise<number> {
    const ctx = this.ensureContext();
    if (ctx.state === 'suspended') await ctx.resume();
    const arrayBuffer = await file.arrayBuffer();
    this.audioBuffer = await ctx.decodeAudioData(arrayBuffer);

    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.8;
    this.analyser.connect(ctx.destination);

    const bufferSize = this.analyser.frequencyBinCount;
    this.freqData = new Uint8Array(bufferSize) as Uint8Array<ArrayBuffer>;
    this.timeData = new Uint8Array(bufferSize) as Uint8Array<ArrayBuffer>;

    this.pausedAt = 0;
    this.isPlaying = false;

    return this.audioBuffer.duration;
  }

  play(offset?: number): void {
    if (!this.audioBuffer || !this.analyser || !this.ctx) return;
    this.stop();

    const startOffset = offset !== undefined ? offset : this.pausedAt;
    this.sourceNode = this.ctx.createBufferSource();
    this.sourceNode.buffer = this.audioBuffer;
    this.sourceNode.connect(this.analyser);
    this.sourceNode.start(0, startOffset);
    this.startedAt = this.ctx.currentTime - startOffset;
    this.isPlaying = true;
  }

  pause(): void {
    if (!this.isPlaying) return;
    this.pausedAt = this.getCurrentTime();
    this.sourceNode?.stop();
    this.sourceNode = null;
    this.isPlaying = false;
  }

  stop(): void {
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
      } catch {
        // already stopped
      }
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    this.isPlaying = false;
    this.pausedAt = 0;
  }

  seek(seconds: number): void {
    const wasPlaying = this.isPlaying;
    this.pause();
    this.pausedAt = seconds;
    if (wasPlaying) this.play(seconds);
  }

  getCurrentTime(): number {
    if (!this.ctx) return 0;
    if (!this.isPlaying) return this.pausedAt;
    return this.ctx.currentTime - this.startedAt;
  }

  getSignals(): Signals {
    if (!this.isPlaying || !this.analyser || !this.ctx) return { ...ZERO_SIGNALS };
    this.analyser.getByteFrequencyData(this.freqData);
    this.analyser.getByteTimeDomainData(this.timeData);
    return extractSignals(this.freqData, this.timeData, this.ctx.sampleRate);
  }

  setLoop(loop: boolean): void {
    if (this.sourceNode) {
      this.sourceNode.loop = loop;
    }
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  getDuration(): number {
    return this.audioBuffer?.duration ?? 0;
  }

  destroy(): void {
    this.stop();
    this.analyser?.disconnect();
    this.ctx?.close();
    this.ctx = null;
    this.analyser = null;
    this.audioBuffer = null;
  }
}

export const audioEngine = new AudioEngine();
