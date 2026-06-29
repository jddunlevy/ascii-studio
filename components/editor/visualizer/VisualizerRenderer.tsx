'use client';
import type { VisualizerElement } from '@/lib/types';
import { SpectrumRenderer } from './SpectrumRenderer';
import { PulseRenderer } from './PulseRenderer';
import { TextVisualRenderer } from './TextVisualRenderer';
import { StrobeLayer } from './StrobeLayer';

interface VisualizerRendererProps {
  element: VisualizerElement;
  signal: number;        // 0-1, current audio signal (from element.audioSignal channel)
  freqData: Uint8Array;  // raw frequency data from analyser
  isPlaying: boolean;
  sampleRate: number;
}

export function VisualizerRenderer({
  element, signal, freqData, isPlaying, sampleRate
}: VisualizerRendererProps) {
  let renderer: React.ReactNode = null;

  switch (element.visualType) {
    case 'spectrum':
      renderer = (
        <SpectrumRenderer
          element={element}
          freqData={freqData}
          isPlaying={isPlaying}
          sampleRate={sampleRate}
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
