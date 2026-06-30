'use client';
import { useEffect, useRef } from 'react';
import type { AuraElement, LiveElementOverride } from '@/lib/types';

interface AuraRendererProps {
  element: AuraElement;
  liveOverride?: Partial<LiveElementOverride>;
}

function shiftHue(hexColor: string, hueShift: number): string {
  // Convert hex to RGB
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);

  // Convert RGB to HSL
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const delta = max - min;

  let h = 0;
  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  if (delta !== 0) {
    if (max === rNorm) {
      h = ((gNorm - bNorm) / delta) % 6;
    } else if (max === gNorm) {
      h = (bNorm - rNorm) / delta + 2;
    } else {
      h = (rNorm - gNorm) / delta + 4;
    }
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }

  // Apply hue shift
  h = (h + hueShift) % 360;
  if (h < 0) h += 360;

  // Convert HSL back to RGB
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let rOut = 0, gOut = 0, bOut = 0;

  if (h >= 0 && h < 60) {
    rOut = c; gOut = x; bOut = 0;
  } else if (h >= 60 && h < 120) {
    rOut = x; gOut = c; bOut = 0;
  } else if (h >= 120 && h < 180) {
    rOut = 0; gOut = c; bOut = x;
  } else if (h >= 180 && h < 240) {
    rOut = 0; gOut = x; bOut = c;
  } else if (h >= 240 && h < 300) {
    rOut = x; gOut = 0; bOut = c;
  } else {
    rOut = c; gOut = 0; bOut = x;
  }

  const rFinal = Math.round((rOut + m) * 255);
  const gFinal = Math.round((gOut + m) * 255);
  const bFinal = Math.round((bOut + m) * 255);

  return `#${rFinal.toString(16).padStart(2, '0')}${gFinal.toString(16).padStart(2, '0')}${bFinal.toString(16).padStart(2, '0')}`;
}

export function AuraRenderer({ element, liveOverride }: AuraRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match element size
    const dpr = window.devicePixelRatio || 1;
    canvas.width = element.size.w * dpr;
    canvas.height = element.size.h * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, element.size.w, element.size.h);

    // Set blend mode - map to Canvas API values
    const blendModeMap: Record<string, GlobalCompositeOperation> = {
      normal: 'source-over',
      screen: 'screen',
      overlay: 'overlay',
      multiply: 'multiply',
    };
    ctx.globalCompositeOperation = blendModeMap[element.blendMode || 'normal'] || 'source-over';

    // Create radial gradient from center
    const centerX = element.size.w / 2;
    const centerY = element.size.h / 2;
    const radius = Math.max(element.size.w, element.size.h) / 2;

    const gradient = ctx.createRadialGradient(
      centerX,
      centerY,
      0,
      centerX,
      centerY,
      radius
    );

    // Apply color stops with optional hue overrides
    element.colorStops.forEach((stop, index) => {
      let color = stop.color;

      // Check for hue override for this specific color stop
      let hueOverride: number | undefined;
      if (liveOverride) {
        switch (index) {
          case 0:
            hueOverride = liveOverride.colorStop0Hue;
            break;
          case 1:
            hueOverride = liveOverride.colorStop1Hue;
            break;
          case 2:
            hueOverride = liveOverride.colorStop2Hue;
            break;
          case 3:
            hueOverride = liveOverride.colorStop3Hue;
            break;
          case 4:
            hueOverride = liveOverride.colorStop4Hue;
            break;
        }
      }

      if (hueOverride !== undefined) {
        color = shiftHue(color, hueOverride);
      }

      gradient.addColorStop(stop.position, color);
    });

    // Apply blur if specified
    const blur = liveOverride?.blur ?? element.blur;
    if (blur > 0) {
      ctx.filter = `blur(${blur}px)`;
    }

    // Fill with gradient
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, element.size.w, element.size.h);
  }, [element, liveOverride]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: element.size.w,
        height: element.size.h,
        display: 'block',
      }}
    />
  );
}
