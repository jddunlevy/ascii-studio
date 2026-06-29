'use client';
import { useState, useEffect, useRef } from 'react';
import type { VisualizerElement, Signals } from '@/lib/types';
import { audioEngine } from '@/lib/audio/audioEngine';
import { SpectrumRenderer } from './SpectrumRenderer';
import { PulseRenderer } from './PulseRenderer';
import { TextVisualRenderer } from './TextVisualRenderer';
import { StrobeLayer } from './StrobeLayer';

interface VisualizerRendererProps {
  element: VisualizerElement;
  // Remove the audio props — we read from audioEngine directly
}

export function VisualizerRenderer({ element }: VisualizerRendererProps) {
  const [signals, setSignals] = useState<Signals>({ volume: 0, bass: 0, mid: 0, treble: 0 });
  const [freqData, setFreqData] = useState<Uint8Array>(new Uint8Array(0));
  const [isPlaying, setIsPlaying] = useState(false);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    function tick() {
      const sigs = audioEngine.getSignals();
      const freq = audioEngine.getFrequencyData();
      const playing = audioEngine.getIsPlaying();
      setSignals(sigs);
      setFreqData(freq.slice()); // copy to avoid stale reference
      setIsPlaying(playing);
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const signal = signals[element.audioSignal] ?? 0;

  let renderer: React.ReactNode;
  switch (element.visualType) {
    case 'spectrum':
      renderer = (
        <SpectrumRenderer
          element={element}
          freqData={freqData}
          isPlaying={isPlaying}
          sampleRate={44100}
        />
      );
      break;
    case 'pulse':
      renderer = <PulseRenderer element={element} signal={signal} />;
      break;
    case 'text':
      renderer = <TextVisualRenderer element={element} signal={signal} />;
      break;
    default:
      return null;
  }

  return (
    <StrobeLayer signal={signal} config={element.strobe}>
      {renderer}
    </StrobeLayer>
  );
}
