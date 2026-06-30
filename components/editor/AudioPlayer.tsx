// components/editor/AudioPlayer.tsx
'use client';
import { useRef, useEffect, useCallback } from 'react';
import useStudioStore from '@/lib/store/studioStore';
import { audioEngine } from '@/lib/audio/audioEngine';
import { startAnimationLoop } from '@/lib/animation/animationLoop';
import { DEFAULT_GLOBAL_AUDIO } from '@/lib/composition/defaults';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function AudioPlayer() {
  const isPlaying = useStudioStore((s) => s.isPlaying);
  const currentTime = useStudioStore((s) => s.currentTime);
  const duration = useStudioStore((s) => s.duration);
  const loop = useStudioStore((s) => s.loop);
  const setPlayback = useStudioStore((s) => s.setPlayback);
  const setLiveValues = useStudioStore((s) => s.setLiveValues);
  const composition = useStudioStore((s) => s.composition);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const filenameRef = useRef<string>('');
  const cleanupLoopRef = useRef<(() => void) | null>(null);

  const stopAnimationLoop = useCallback(() => {
    if (cleanupLoopRef.current) {
      cleanupLoopRef.current();
      cleanupLoopRef.current = null;
    }
  }, []);

  const startLoop = useCallback(() => {
    stopAnimationLoop();
    cleanupLoopRef.current = startAnimationLoop(
      () => audioEngine.getSignals(),
      () => useStudioStore.getState().composition?.bindings ?? [],
      () => useStudioStore.getState().composition?.globalAudioConfig ?? DEFAULT_GLOBAL_AUDIO,
      () => ({}), // elementSensitivities - empty for now, will be added to store in future task
      (liveValues) => {
        setLiveValues(liveValues);
        // Update current time
        const t = audioEngine.getCurrentTime();
        const dur = audioEngine.getDuration();
        setPlayback({ currentTime: t });

        // Handle track end
        if (dur > 0 && t >= dur - 0.05) {
          if (useStudioStore.getState().loop) {
            audioEngine.play(0);
          } else {
            audioEngine.pause();
            setPlayback({ isPlaying: false, currentTime: 0 });
            stopAnimationLoop();
          }
        }
      }
    );
  }, [setLiveValues, setPlayback, stopAnimationLoop]);

  useEffect(() => {
    if (isPlaying) {
      startLoop();
    } else {
      stopAnimationLoop();
    }
    return stopAnimationLoop;
  }, [isPlaying, startLoop, stopAnimationLoop]);

  // Sync loop state to engine
  useEffect(() => {
    audioEngine.setLoop(loop);
  }, [loop]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    filenameRef.current = file.name;
    const dur = await audioEngine.loadFile(file);
    setPlayback({ duration: dur, currentTime: 0, isPlaying: false });
  }

  function handlePlayPause() {
    if (isPlaying) {
      audioEngine.pause();
      setPlayback({ isPlaying: false });
    } else {
      audioEngine.play();
      setPlayback({ isPlaying: true });
    }
  }

  function handleScrub(e: React.ChangeEvent<HTMLInputElement>) {
    const t = parseFloat(e.target.value);
    audioEngine.seek(t);
    setPlayback({ currentTime: t });
  }

  function handleLoopToggle() {
    setPlayback({ loop: !loop });
  }

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '0 12px',
        background: 'var(--surface)',
        borderTop: '1px solid var(--muted)',
        fontFamily: 'monospace',
        fontSize: 11,
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <button onClick={() => fileInputRef.current?.click()}>LOAD AUDIO</button>

      {filenameRef.current && (
        <span style={{ color: 'var(--muted)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {filenameRef.current}
        </span>
      )}

      <button
        onClick={handlePlayPause}
        style={{ minWidth: 28, textAlign: 'center' }}
        disabled={duration === 0}
      >
        {isPlaying ? '▌▌' : '▶'}
      </button>

      <input
        type="range"
        min={0}
        max={duration || 1}
        step={0.1}
        value={currentTime}
        onChange={handleScrub}
        style={{ flex: 1, maxWidth: 320, cursor: 'pointer' }}
        disabled={duration === 0}
      />

      <span style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}>
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>

      <button
        onClick={handleLoopToggle}
        style={{ color: loop ? 'var(--accent)' : 'var(--muted)', borderColor: loop ? 'var(--accent)' : 'var(--muted)' }}
      >
        ↻
      </button>
    </div>
  );
}
